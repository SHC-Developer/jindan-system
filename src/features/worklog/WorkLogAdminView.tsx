import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAllWorkLogs } from '../../hooks/useWorkLog';
import { useUserList } from '../../hooks/useUserList';
import { updateWorkLogByAdmin, type UpdateWorkLogByAdminPayload } from '../../lib/worklog';
import { subscribeLeaveDays, approveLeaveDay, unapproveLeaveDay, type LeaveDayItem } from '../../lib/leaveDays';
import { getHolidayDateKeys } from '../../lib/kr-holidays';
import {
  toDateKeySeoul,
  isTardySeoul,
  getTardinessMinutesSeoul,
  formatTardinessNote,
  getDayOfWeekSeoul,
  getWeeksInMonthByKoreanRule,
} from '../../lib/datetime-seoul';
import type { AppUser } from '../../types/user';
import type { WorkLogEntry, WorkLogStatus } from '../../types/worklog';
import { useErrorToast } from '../../hooks/useErrorToast';
import { Loader2, Clock, CheckCircle, Database, Filter, Download, CalendarCheck, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabelSeoul(ms: number): string {
  const key = toDateKeySeoul(ms);
  return formatDateKeyDisplay(key);
}

function formatDateKeyDisplay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const d2 = new Date(y, m - 1, d);
  return `${m}월 ${d}일 (${WEEKDAY_NAMES[d2.getDay()]})`;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDurationMs(ms: number): string {
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

/** 출근 상태 라벨 → DB status (worklog 행 편집용) */
const ATTENDANCE_STATUS_OPTIONS = ['정상출근', '지각', '결근', '연차', '반차'] as const;
function attendanceStatusToDbStatus(s: string): WorkLogStatus {
  if (s === '결근' || s === '연차' || s === '반차') return 'absent';
  return 'approved'; // 정상출근, 지각
}
function attendanceStatusToLeaveType(s: string): 'annual' | 'half' | null {
  if (s === '연차') return 'annual';
  if (s === '반차') return 'half';
  return null;
}

function msToTimeInputValue(ms: number | null): string {
  if (ms == null) return '';
  const str = new Date(ms).toLocaleTimeString('sv-SE', { timeZone: 'Asia/Seoul' });
  return str.slice(0, 5);
}
function timeInputValueToMs(dateKey: string, timeStr: string): number | null {
  if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr.trim())) return null;
  return new Date(dateKey + 'T' + timeStr.trim() + ':00+09:00').getTime();
}

/** 점심 휴게 11:00~12:00(서울) 제외한 정규 근무 시간(ms). 출근일 기준 동일일 11~12시 구간만 제외. */
function getRegularMsWithLunchDeduction(clockInAt: number, clockOutAt: number): number {
  const raw = Math.max(0, clockOutAt - clockInAt);
  const dateKey = toDateKeySeoul(clockInAt);
  const lunchStart = new Date(dateKey + 'T11:00:00+09:00').getTime();
  const lunchEnd = new Date(dateKey + 'T12:00:00+09:00').getTime();
  const overlapStart = Math.max(clockInAt, lunchStart);
  const overlapEnd = Math.min(clockOutAt, lunchEnd);
  const deduction = Math.max(0, overlapEnd - overlapStart);
  return Math.max(0, raw - deduction);
}

/** 주말·공휴일은 출근 시각과 관계없이 정상출근. holidayDateKeys는 선택(관리자 DB용). */
function getAttendanceStatus(
  log: WorkLogEntry,
  holidayDateKeys?: Set<string>
): string {
  if (log.status === 'absent') {
    if (log.leaveType === 'annual') return '연차';
    if (log.leaveType === 'half') return '반차';
    return '결근';
  }
  if (log.status === 'pending') return '승인 대기';
  if (log.status === 'rejected') return '승인 거부';
  if (log.status === 'approved') {
    const dateKey = toDateKeySeoul(log.clockInAt);
    const day = getDayOfWeekSeoul(log.clockInAt);
    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidayDateKeys?.has(dateKey) ?? false;
    if (isWeekend || isHoliday) return '정상출근';
    if (isTardySeoul(log.clockInAt)) return '지각';
  }
  return '정상출근';
}

interface DbRow {
  type: 'worklog' | 'leave';
  userId: string;
  userDisplayName: string | null;
  dateKey: string;
  dateLabel: string;
  attendanceStatus: string;
  clockInAt: number | null;
  clockOutAt: number | null;
  overtimeStartAt: number | null;
  overtimeEndAt: number | null;
  totalMs: number | null;
  note: string;
  tardinessReason: string | null;
  overtimeReason: string | null;
  logId?: string;
}

interface WorkLogAdminViewProps {
  currentUser: AppUser;
}

type TabId = 'today' | 'database' | 'leaveApproval';
type DatabaseViewMode = 'view' | 'edit';

export function WorkLogAdminView({ currentUser }: WorkLogAdminViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [databaseViewMode, setDatabaseViewMode] = useState<DatabaseViewMode>('view');
  const [databaseAssigneeFilter, setDatabaseAssigneeFilter] = useState<Set<string> | null>(null);
  const [databaseFilterOpen, setDatabaseFilterOpen] = useState(false);
  const [databaseFilterPosition, setDatabaseFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [startDate, setStartDate] = useState(() =>
    toDateKeySeoul(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState(() => toDateKeySeoul(Date.now()));
  const [databaseSelectedYear, setDatabaseSelectedYear] = useState(() => new Date().getFullYear());
  const [databaseSelectedMonth, setDatabaseSelectedMonth] = useState<number | null>(null);
  const [databaseSelectedWeek, setDatabaseSelectedWeek] = useState<{
    year: number;
    month: number;
    weekIndex: number;
  } | null>(null);
  const [leaveByUser, setLeaveByUser] = useState<Map<string, LeaveDayItem[]>>(new Map());
  const [leaveApprovalLoading, setLeaveApprovalLoading] = useState<string | null>(null);
  const [holidayDateKeys, setHolidayDateKeys] = useState<Set<string>>(new Set());
  const databaseFilterRef = React.useRef<HTMLDivElement>(null);
  const databaseFilterDropdownRef = React.useRef<HTMLDivElement>(null);
  const [editedRows, setEditedRows] = useState<Record<string, Partial<Pick<DbRow, 'attendanceStatus' | 'clockInAt' | 'clockOutAt' | 'overtimeStartAt' | 'overtimeEndAt' | 'note'>>>>({});
  const [dbSaveLoading, setDbSaveLoading] = useState(false);

  const { workLogs: allLogs, loading: allLoading, error: allError } = useAllWorkLogs();
  const { users, loading: usersLoading } = useUserList();
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    if (users.length === 0) {
      setLeaveByUser(new Map());
      return;
    }
    const unsubs: (() => void)[] = [];
    users.forEach((u) => {
      const unsub = subscribeLeaveDays(
        u.uid,
        (items) => {
          setLeaveByUser((prev) => {
            const next = new Map(prev);
            if (items.length === 0) next.delete(u.uid);
            else next.set(u.uid, items);
            return next;
          });
        },
        (err) => console.error('leaveDays subscription', u.uid, err)
      );
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [users.map((u) => u.uid).join(',')]);

  const leaveDaysByUser = useMemo(() => {
    const map = new Map<string, Set<string>>();
    leaveByUser.forEach((items, uid) => {
      map.set(uid, new Set(items.map((i) => i.dateKey)));
    });
    return map;
  }, [leaveByUser]);

  const userIdsToFetchLeave = useMemo(() => {
    if (databaseAssigneeFilter === null) return users.map((u) => u.uid);
    return [...databaseAssigneeFilter];
  }, [databaseAssigneeFilter, users]);

  useEffect(() => {
    const startYear = parseInt(startDate.slice(0, 4), 10);
    const endYear = parseInt(endDate.slice(0, 4), 10);
    const years = new Set<number>();
    for (let y = startYear; y <= endYear; y++) years.add(y);
    const thisYear = new Date().getFullYear();
    years.add(thisYear);
    let cancelled = false;
    const all = new Set<string>();
    Promise.all([...years].map((y) => getHolidayDateKeys(y)))
      .then((sets) => {
        if (cancelled) return;
        sets.forEach((s) => s.forEach((k) => all.add(k)));
        setHolidayDateKeys(all);
      });
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const handleApproveLeave = async (userId: string, item: LeaveDayItem) => {
    const key = `${userId}:${item.dateKey}`;
    if (leaveApprovalLoading) return;
    setLeaveApprovalLoading(key);
    try {
      await approveLeaveDay(userId, item.dateKey, currentUser.uid);
      setLeaveByUser((prev) => {
        const next = new Map(prev);
        const list = next.get(userId)?.map((i) => (i.dateKey === item.dateKey ? { ...i, status: 'approved' as const } : i)) ?? [];
        next.set(userId, list);
        return next;
      });
    } catch (err) {
      showError('연차 승인 실패', err);
    } finally {
      setLeaveApprovalLoading(null);
    }
  };

  const handleUnapproveLeave = async (userId: string, dateKey: string) => {
    const key = `${userId}:${dateKey}`;
    if (leaveApprovalLoading) return;
    setLeaveApprovalLoading(key);
    try {
      await unapproveLeaveDay(userId, dateKey);
      setLeaveByUser((prev) => {
        const next = new Map(prev);
        const list = (next.get(userId) ?? []).filter((i) => i.dateKey !== dateKey);
        if (list.length === 0) next.delete(userId);
        else next.set(userId, list);
        return next;
      });
    } catch (err) {
      showError('연차 승인 취소 실패', err);
    } finally {
      setLeaveApprovalLoading(null);
    }
  };

  const todayKey = toDateKeySeoul(Date.now());

  const todayRows = useMemo((): { userId: string; displayName: string | null; status: string; clockInAt: number | null; note: string }[] => {
    return users.map((u) => {
      const todayLog = allLogs.find(
        (log) => log.userId === u.uid && toDateKeySeoul(log.clockInAt) === todayKey
      );
      const leaveKeys = leaveDaysByUser.get(u.uid);
      const isLeaveToday = leaveKeys?.has(todayKey) ?? false;
      if (todayLog) {
        const status = getAttendanceStatus(todayLog, holidayDateKeys);
        const note = status === '지각' ? formatTardinessNote(getTardinessMinutesSeoul(todayLog.clockInAt)) : '';
        return {
          userId: u.uid,
          displayName: u.displayName ?? null,
          status,
          clockInAt: todayLog.clockInAt,
          note,
        };
      }
      if (isLeaveToday) {
        return {
          userId: u.uid,
          displayName: u.displayName ?? null,
          status: '연차',
          clockInAt: null,
          note: '',
        };
      }
      return {
        userId: u.uid,
        displayName: u.displayName ?? null,
        status: '결근',
        clockInAt: null,
        note: '',
      };
    });
  }, [users, allLogs, todayKey, leaveDaysByUser, holidayDateKeys]);

  const dbRows = useMemo((): DbRow[] => {
    const filteredLogs = allLogs.filter((log) => {
      const key = toDateKeySeoul(log.clockInAt);
      if (key < startDate || key > endDate) return false;
      if (databaseAssigneeFilter !== null && !databaseAssigneeFilter.has(log.userId)) return false;
      return true;
    });
    const logKeysByUser = new Map<string, Set<string>>();
    filteredLogs.forEach((log) => {
      const key = toDateKeySeoul(log.clockInAt);
      if (!logKeysByUser.has(log.userId)) logKeysByUser.set(log.userId, new Set());
      logKeysByUser.get(log.userId)!.add(key);
    });
    const rows: DbRow[] = filteredLogs.map((log) => {
      const key = toDateKeySeoul(log.clockInAt);
      const status = getAttendanceStatus(log, holidayDateKeys);
      const note = log.note ?? '';
      const regularMs =
        log.clockOutAt != null ? getRegularMsWithLunchDeduction(log.clockInAt, log.clockOutAt) : null;
      const otMs =
        log.overtimeStartAt != null && log.overtimeEndAt != null
          ? log.overtimeEndAt - log.overtimeStartAt
          : null;
      const totalMs =
        regularMs != null ? regularMs + (otMs ?? 0) : null;
      return {
        type: 'worklog',
        userId: log.userId,
        userDisplayName: log.userDisplayName,
        dateKey: key,
        dateLabel: formatDateLabelSeoul(log.clockInAt),
        attendanceStatus: status,
        clockInAt: log.clockInAt,
        clockOutAt: log.clockOutAt,
        overtimeStartAt: log.overtimeStartAt ?? null,
        overtimeEndAt: log.overtimeEndAt ?? null,
        totalMs,
        note,
        tardinessReason: log.tardinessReason,
        overtimeReason: log.overtimeReason ?? null,
        logId: log.id,
      };
    });
    userIdsToFetchLeave.forEach((uid) => {
      const leaveKeys = leaveDaysByUser.get(uid) ?? new Set<string>();
      const existingKeys = logKeysByUser.get(uid) ?? new Set<string>();
      const userDisplayName = users.find((u) => u.uid === uid)?.displayName ?? null;
      leaveKeys.forEach((dateKey) => {
        if (dateKey < startDate || dateKey > endDate) return;
        if (existingKeys.has(dateKey)) return;
        if (databaseAssigneeFilter !== null && !databaseAssigneeFilter.has(uid)) return;
        rows.push({
          type: 'leave',
          userId: uid,
          userDisplayName,
          dateKey,
          dateLabel: formatDateKeyDisplay(dateKey),
          attendanceStatus: '연차',
          clockInAt: null,
          clockOutAt: null,
          overtimeStartAt: null,
          overtimeEndAt: null,
          totalMs: null,
          note: '',
          tardinessReason: null,
          overtimeReason: null,
        });
      });
    });
    rows.sort((a, b) => (b.dateKey > a.dateKey ? 1 : -1));
    return rows;
  }, [allLogs, startDate, endDate, databaseAssigneeFilter, userIdsToFetchLeave, leaveDaysByUser, users, holidayDateKeys]);

  const handleDatabaseFilterToggle = (uid: string) => {
    const allIds = users.map((u) => u.uid);
    let next: Set<string>;
    if (databaseAssigneeFilter === null) {
      next = new Set(allIds);
      next.delete(uid);
    } else {
      next = new Set(databaseAssigneeFilter);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
    }
    setDatabaseAssigneeFilter(next.size === allIds.length ? null : next);
  };

  /** 전체 보기: 전체 선택 ↔ 전체 해제 토글 (드롭다운은 유지) */
  const handleToggleFilterAll = () => {
    if (databaseAssigneeFilter === null) {
      setDatabaseAssigneeFilter(new Set());
    } else {
      setDatabaseAssigneeFilter(null);
    }
  };

  /** 월 클릭: 해당 월 전체 기간으로 설정 */
  const handleSelectMonth = (month: number) => {
    const y = databaseSelectedYear;
    const pad = (n: number) => String(n).padStart(2, '0');
    const lastDay = new Date(y, month, 0).getDate();
    setDatabaseSelectedMonth(month);
    setDatabaseSelectedWeek(null);
    setStartDate(`${y}-${pad(month)}-01`);
    setEndDate(`${y}-${pad(month)}-${pad(lastDay)}`);
  };

  /** N주차 클릭: 해당 주(월~일) 기간으로 설정 */
  const handleSelectWeek = (year: number, month: number, weekIndex: number) => {
    const weeks = getWeeksInMonthByKoreanRule(year, month);
    const w = weeks.find((x) => x.weekIndex === weekIndex);
    if (!w) return;
    setDatabaseSelectedWeek({ year, month, weekIndex });
    setStartDate(w.startDateKey);
    setEndDate(w.endDateKey);
  };

  /** 기간 입력 직접 변경 시 월/주차 선택 해제 */
  const handleStartDateChange = (value: string) => {
    setDatabaseSelectedMonth(null);
    setDatabaseSelectedWeek(null);
    setStartDate(value);
  };
  const handleEndDateChange = (value: string) => {
    setDatabaseSelectedMonth(null);
    setDatabaseSelectedWeek(null);
    setEndDate(value);
  };

  function getEffectiveValue<K extends keyof DbRow>(
    r: DbRow,
    field: K
  ): DbRow[K] {
    if (r.type !== 'worklog' || !r.logId) return r[field];
    const ed = editedRows[r.logId];
    return (ed && field in ed ? (ed as Partial<DbRow>)[field] : r[field]) as DbRow[K];
  }
  function setEditedValue(
    logId: string,
    field: keyof Pick<DbRow, 'attendanceStatus' | 'clockInAt' | 'clockOutAt' | 'overtimeStartAt' | 'overtimeEndAt' | 'note'>,
    value: string | number | null
  ) {
    setEditedRows((prev) => ({
      ...prev,
      [logId]: { ...prev[logId], [field]: value },
    }));
  }

  const handleSaveDbEdits = async () => {
    const worklogRows = dbRows.filter((r): r is DbRow & { type: 'worklog'; logId: string } => r.type === 'worklog' && !!r.logId);
    if (worklogRows.length === 0) return;
    setDbSaveLoading(true);
    try {
      for (const r of worklogRows) {
        const status = getEffectiveValue(r, 'attendanceStatus');
        const clockInAt = getEffectiveValue(r, 'clockInAt');
        const clockOutAt = getEffectiveValue(r, 'clockOutAt');
        const overtimeStartAt = getEffectiveValue(r, 'overtimeStartAt');
        const overtimeEndAt = getEffectiveValue(r, 'overtimeEndAt');
        const note = getEffectiveValue(r, 'note');
        const payload: UpdateWorkLogByAdminPayload = {
          status: attendanceStatusToDbStatus(status),
          clockInAt: clockInAt ?? undefined,
          clockOutAt: clockOutAt ?? undefined,
          overtimeStartAt: overtimeStartAt ?? undefined,
          overtimeEndAt: overtimeEndAt ?? undefined,
          note: note ?? null,
          leaveType: attendanceStatusToLeaveType(status),
        };
        await updateWorkLogByAdmin(r.logId, payload);
      }
      showSuccess('DB 수정 완료', '수정한 출퇴근 기록이 저장되었습니다.');
    } catch (err) {
      showError('DB 수정 실패', err);
    } finally {
      setDbSaveLoading(false);
      setEditedRows({});
    }
  };

  const handleExportExcel = () => {
    const data = dbRows.map((r) => {
      const status = getEffectiveValue(r, 'attendanceStatus');
      const clockInAt = getEffectiveValue(r, 'clockInAt');
      const clockOutAt = getEffectiveValue(r, 'clockOutAt');
      const overtimeStartAt = getEffectiveValue(r, 'overtimeStartAt');
      const overtimeEndAt = getEffectiveValue(r, 'overtimeEndAt');
      const note = getEffectiveValue(r, 'note');
      const regularMs =
        clockOutAt != null && clockInAt != null ? getRegularMsWithLunchDeduction(clockInAt, clockOutAt) : null;
      const otMs =
        overtimeStartAt != null && overtimeEndAt != null ? overtimeEndAt - overtimeStartAt : null;
      const totalMs = regularMs != null ? regularMs + (otMs ?? 0) : null;
      return {
        날짜: r.dateLabel,
        출근상태: status,
        출근시간: clockInAt != null ? formatTime(clockInAt) : '',
        퇴근시간: clockOutAt != null ? formatTime(clockOutAt) : '',
        야근시작: overtimeStartAt != null ? formatTime(overtimeStartAt) : '',
        야근종료: overtimeEndAt != null ? formatTime(overtimeEndAt) : '',
        총근무시간: totalMs != null ? formatDurationMs(totalMs) : '',
        비고: note,
        지각사유: r.tardinessReason ?? '',
        야근사유: r.overtimeReason ?? '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출퇴근기록');
    XLSX.writeFile(wb, `출퇴근기록_${todayKey}.xlsx`);
  };

  const loading = allLoading || usersLoading;
  const error = allError;

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center gap-2">
          <Clock size={24} className="text-brand-main" />
          <h1 className="text-xl font-semibold text-brand-dark">출퇴근 기록부</h1>
        </div>

        <div className="flex flex-wrap gap-1 sm:gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`px-3 py-2 md:px-4 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'today' ? 'bg-white border border-b-0 border-gray-200 text-brand-main' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={16} />
            오늘 출근 현황
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3 py-2 md:px-4 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'database' ? 'bg-white border border-b-0 border-gray-200 text-brand-main' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Database size={16} />
            출퇴근 기록 데이터베이스
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaveApproval')}
            className={`px-3 py-2 md:px-4 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'leaveApproval' ? 'bg-white border border-b-0 border-gray-200 text-brand-main' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CalendarCheck size={16} />
            연차 승인
          </button>
        </div>

        {activeTab === 'today' && (
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <h2 className="text-lg font-semibold text-brand-dark px-3 md:px-5 py-4 border-b border-gray-200">
              오늘 출근 현황 ({todayKey})
            </h2>
            <p className="text-sm text-gray-500 px-3 md:px-5 pb-3">
              직원별 오늘 출근·연차·결근 상태를 한눈에 확인할 수 있습니다.
            </p>
            {allLoading || usersLoading ? (
              <p className="px-3 md:px-5 pb-4 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> 불러오는 중…
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[320px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">직원</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">오늘 상태</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">출근 시각</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRows.map((row) => (
                      <tr key={row.userId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-medium text-gray-800 whitespace-nowrap">
                          {row.displayName ?? row.userId.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              row.status === '정상출근'
                                ? 'bg-green-100 text-green-800'
                                : row.status === '지각'
                                  ? 'bg-amber-100 text-amber-800'
                                  : row.status === '승인 대기'
                                    ? 'bg-gray-100 text-gray-700'
                                    : row.status === '연차'
                                      ? 'bg-brand-sub/20 text-brand-dark'
                                      : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                          {row.clockInAt != null ? formatTime(row.clockInAt) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{row.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'database' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-sm text-gray-600 mr-2">데이터베이스:</span>
              <button
                type="button"
                onClick={() => setDatabaseViewMode('view')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  databaseViewMode === 'view'
                    ? 'bg-brand-main text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => setDatabaseViewMode('edit')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  databaseViewMode === 'edit'
                    ? 'bg-brand-main text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                수정
              </button>
            </div>
            {allLoading || usersLoading ? (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> 불러오는 중…
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <div
                    ref={databaseFilterRef}
                    className={`relative inline-flex items-center gap-2 rounded-md border-2 px-2 py-1 ${
                      databaseAssigneeFilter !== null ? 'border-brand-main bg-brand-main/5' : 'border-gray-400 bg-white'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-700">담당자 (필터)</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!databaseFilterOpen) {
                          const r = databaseFilterRef.current?.getBoundingClientRect();
                          setDatabaseFilterPosition(r ? { top: r.bottom + 4, left: r.left } : null);
                        }
                        setDatabaseFilterOpen((o) => !o);
                      }}
                      className={`p-1.5 rounded border-2 ${databaseAssigneeFilter !== null ? 'border-brand-main text-brand-main' : 'border-gray-400 text-gray-600'}`}
                      title="담당자 필터"
                    >
                      <Filter size={16} />
                    </button>
                    {databaseFilterOpen &&
                      databaseFilterPosition &&
                      createPortal(
                        <div
                          ref={databaseFilterDropdownRef}
                          className="fixed z-[9999] min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 max-h-60 overflow-y-auto"
                          style={{ top: databaseFilterPosition.top, left: databaseFilterPosition.left }}
                        >
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            onClick={handleToggleFilterAll}
                          >
                            {databaseAssigneeFilter === null ? '전체 해제' : '전체 선택'}
                          </button>
                          {users.map((u) => (
                            <label
                              key={u.uid}
                              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={databaseAssigneeFilter === null ? true : databaseAssigneeFilter.has(u.uid)}
                                onChange={() => handleDatabaseFilterToggle(u.uid)}
                              />
                              <span className="truncate">{u.displayName ?? u.uid.slice(0, 8)}</span>
                            </label>
                          ))}
                        </div>,
                        document.body
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">기간</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-gray-500">~</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-main text-white text-sm font-medium hover:opacity-90"
                  >
                    <Download size={14} />
                    엑셀 추출
                  </button>
                  {databaseViewMode === 'edit' && (
                    <button
                      type="button"
                      onClick={handleSaveDbEdits}
                      disabled={dbSaveLoading || dbRows.filter((r) => r.type === 'worklog' && r.logId).length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {dbSaveLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      DB수정
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
                  <span className="text-sm font-medium text-gray-700">{databaseSelectedYear}년</span>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMonth(m)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 ${
                        databaseSelectedMonth === m
                          ? 'border-brand-main bg-brand-main/10 text-brand-main'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {m}월
                    </button>
                  ))}
                </div>

                {databaseSelectedMonth !== null && (
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                    {getWeeksInMonthByKoreanRule(databaseSelectedYear, databaseSelectedMonth).map((w) => {
                      const isSelected =
                        databaseSelectedWeek?.year === databaseSelectedYear &&
                        databaseSelectedWeek?.month === databaseSelectedMonth &&
                        databaseSelectedWeek?.weekIndex === w.weekIndex;
                      return (
                        <button
                          key={w.weekIndex}
                          type="button"
                          onClick={() => handleSelectWeek(databaseSelectedYear, databaseSelectedMonth, w.weekIndex)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 ${
                            isSelected
                              ? 'border-brand-sub bg-brand-sub/10 text-brand-sub'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {w.weekIndex}주차
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm mt-4">
                  <table className="w-full text-sm border-collapse min-w-[860px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">날짜</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">직원</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">출근 상태</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">출근 시간</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">퇴근 시간</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">야근 시작</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">야근 종료</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">총 근무 시간</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">비고</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">지각 사유</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">야근 사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-gray-500">
                            조건에 맞는 기록이 없습니다.
                          </td>
                        </tr>
                      ) : databaseViewMode === 'view' ? (
                        dbRows.map((r) => (
                          <tr
                            key={r.type === 'worklog' ? r.logId! : `leave-${r.userId}-${r.dateKey}`}
                            className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                          >
                            <td className="py-2 px-2 text-gray-800 whitespace-nowrap">{r.dateLabel}</td>
                            <td className="py-2 px-2 text-gray-800 whitespace-nowrap">{r.userDisplayName ?? r.userId.slice(0, 8)}</td>
                            <td className="py-2 px-2 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  r.attendanceStatus === '정상출근'
                                    ? 'bg-brand-sub/20 text-brand-dark'
                                    : r.attendanceStatus === '지각'
                                      ? 'bg-amber-100 text-amber-800'
                                      : r.attendanceStatus === '연차' || r.attendanceStatus === '반차'
                                        ? 'bg-gray-100 text-gray-700'
                                        : r.attendanceStatus === '결근'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {r.attendanceStatus}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                              {r.clockInAt != null ? formatTime(r.clockInAt) : '-'}
                            </td>
                            <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                              {r.clockOutAt != null ? formatTime(r.clockOutAt) : '-'}
                            </td>
                            <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                              {r.overtimeStartAt != null ? formatTime(r.overtimeStartAt) : '-'}
                            </td>
                            <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                              {r.overtimeEndAt != null ? formatTime(r.overtimeEndAt) : '-'}
                            </td>
                            <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                              {r.totalMs != null ? formatDurationMs(r.totalMs) : '-'}
                            </td>
                            <td className="py-2 px-2 text-gray-700 whitespace-nowrap">{r.note || '-'}</td>
                            <td className="py-2 px-2 text-gray-600 min-w-[140px] max-w-[280px] whitespace-normal break-words align-top">
                              {r.tardinessReason ?? '-'}
                            </td>
                            <td className="py-2 px-2 text-gray-600 min-w-[140px] max-w-[280px] whitespace-normal break-words align-top">
                              {r.overtimeReason ?? '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        dbRows.map((r) => {
                          const isWorklog = r.type === 'worklog' && r.logId;
                          const status = getEffectiveValue(r, 'attendanceStatus');
                          const clockInAt = getEffectiveValue(r, 'clockInAt');
                          const clockOutAt = getEffectiveValue(r, 'clockOutAt');
                          const overtimeStartAt = getEffectiveValue(r, 'overtimeStartAt');
                          const overtimeEndAt = getEffectiveValue(r, 'overtimeEndAt');
                          const note = getEffectiveValue(r, 'note');
                          const regularMs =
                            clockOutAt != null && clockInAt != null
                              ? getRegularMsWithLunchDeduction(clockInAt, clockOutAt)
                              : null;
                          const otMs =
                            overtimeStartAt != null && overtimeEndAt != null
                              ? overtimeEndAt - overtimeStartAt
                              : null;
                          const totalMs = regularMs != null ? regularMs + (otMs ?? 0) : null;
                          return (
                            <tr
                              key={isWorklog ? r.logId! : `leave-${r.userId}-${r.dateKey}`}
                              className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                            >
                              <td className="py-2 px-2 text-gray-800 whitespace-nowrap">{r.dateLabel}</td>
                              <td className="py-2 px-2 text-gray-800 whitespace-nowrap">{r.userDisplayName ?? r.userId.slice(0, 8)}</td>
                              <td className="py-2 px-2 whitespace-nowrap">
                                {isWorklog ? (
                                  <select
                                    value={status}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === '정상출근') {
                                        const nine = timeInputValueToMs(r.dateKey, '09:00');
                                        const six = timeInputValueToMs(r.dateKey, '18:00');
                                        setEditedRows((prev) => ({
                                          ...prev,
                                          [r.logId!]: {
                                            ...prev[r.logId!],
                                            attendanceStatus: v,
                                            clockInAt: nine ?? getEffectiveValue(r, 'clockInAt'),
                                            clockOutAt: six ?? getEffectiveValue(r, 'clockOutAt'),
                                          },
                                        }));
                                      } else {
                                        setEditedValue(r.logId!, 'attendanceStatus', v);
                                      }
                                    }}
                                    className="w-full min-w-[6rem] border border-gray-300 rounded px-1.5 py-1 text-sm"
                                  >
                                    {ATTENDANCE_STATUS_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                      r.attendanceStatus === '연차' || r.attendanceStatus === '반차' ? 'bg-gray-100 text-gray-700' : ''
                                    }`}
                                  >
                                    {r.attendanceStatus}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                                {isWorklog ? (
                                  <input
                                    type="time"
                                    value={msToTimeInputValue(clockInAt)}
                                    onChange={(e) => {
                                      const ms = timeInputValueToMs(r.dateKey, e.target.value);
                                      setEditedValue(r.logId!, 'clockInAt', ms ?? clockInAt);
                                    }}
                                    className="w-full min-w-[5rem] border border-gray-300 rounded px-1.5 py-1 text-sm"
                                  />
                                ) : (
                                  r.clockInAt != null ? formatTime(r.clockInAt) : '-'
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                                {isWorklog ? (
                                  <input
                                    type="time"
                                    value={msToTimeInputValue(clockOutAt)}
                                    onChange={(e) => {
                                      const ms = timeInputValueToMs(r.dateKey, e.target.value);
                                      setEditedValue(r.logId!, 'clockOutAt', ms ?? clockOutAt);
                                    }}
                                    className="w-full min-w-[5rem] border border-gray-300 rounded px-1.5 py-1 text-sm"
                                  />
                                ) : (
                                  r.clockOutAt != null ? formatTime(r.clockOutAt) : '-'
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                                {isWorklog ? (
                                  <input
                                    type="time"
                                    value={msToTimeInputValue(overtimeStartAt)}
                                    onChange={(e) => {
                                      const ms = timeInputValueToMs(r.dateKey, e.target.value);
                                      setEditedValue(r.logId!, 'overtimeStartAt', ms ?? overtimeStartAt);
                                    }}
                                    className="w-full min-w-[5rem] border border-gray-300 rounded px-1.5 py-1 text-sm"
                                  />
                                ) : (
                                  r.overtimeStartAt != null ? formatTime(r.overtimeStartAt) : '-'
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                                {isWorklog ? (
                                  <input
                                    type="time"
                                    value={msToTimeInputValue(overtimeEndAt)}
                                    onChange={(e) => {
                                      const ms = timeInputValueToMs(r.dateKey, e.target.value);
                                      setEditedValue(r.logId!, 'overtimeEndAt', ms ?? overtimeEndAt);
                                    }}
                                    className="w-full min-w-[5rem] border border-gray-300 rounded px-1.5 py-1 text-sm"
                                  />
                                ) : (
                                  r.overtimeEndAt != null ? formatTime(r.overtimeEndAt) : '-'
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                                {totalMs != null ? formatDurationMs(totalMs) : '-'}
                              </td>
                              <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                                {isWorklog ? (
                                  <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setEditedValue(r.logId!, 'note', e.target.value)}
                                    placeholder="관리자 수정 사유"
                                    className="w-full min-w-[8rem] max-w-[200px] border border-gray-300 rounded px-1.5 py-1 text-sm"
                                  />
                                ) : (
                                  r.note || '-'
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-600 min-w-[140px] max-w-[280px] whitespace-normal break-words align-top">
                                {r.tardinessReason ?? '-'}
                              </td>
                              <td className="py-2 px-2 text-gray-600 min-w-[140px] max-w-[280px] whitespace-normal break-words align-top">
                                {r.overtimeReason ?? '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'leaveApproval' && (
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <h2 className="text-lg font-semibold text-brand-dark px-3 md:px-5 py-4 border-b border-gray-200">
              연차 사용 승인
            </h2>
            <p className="text-sm text-gray-500 px-3 md:px-5 pb-3">
              직원이 지정한 연차(대기)를 승인하면 캘린더에 고정되며, 직원이 해제할 수 없습니다.
            </p>
            {usersLoading ? (
              <p className="px-3 md:px-5 pb-4 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> 불러오는 중…
              </p>
            ) : Array.from(leaveByUser.entries()).flatMap(([, items]) => items).length === 0 ? (
              <p className="px-3 md:px-5 py-8 text-center text-gray-500">등록된 연차가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[560px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">직원</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">연차 일자</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">유형</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">사유</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 whitespace-nowrap">차감일수</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 whitespace-nowrap">상태</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 min-w-[5.5rem] whitespace-nowrap">연차승인 / 승인취소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(leaveByUser.entries()).flatMap(([uid, items]) =>
                      items.map((item) => {
                        const key = `${uid}:${item.dateKey}`;
                        const displayName = users.find((u) => u.uid === uid)?.displayName ?? uid.slice(0, 8);
                        const isApproved = item.status === 'approved';
                        const typeLabel =
                          item.type === 'morning_half' ? '오전반차' : item.type === 'afternoon_half' ? '오후반차' : '연차';
                        return (
                          <tr key={key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                            <td className="py-3 px-4 font-medium text-gray-800 whitespace-nowrap">{displayName}</td>
                            <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{formatDateKeyDisplay(item.dateKey)}</td>
                            <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{typeLabel}</td>
                            <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate whitespace-nowrap" title={item.reason || undefined}>
                              {item.reason || '-'}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700 whitespace-nowrap">{item.deductDays}일</td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  isApproved ? 'bg-brand-sub/20 text-brand-dark' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isApproved ? '승인됨' : '대기'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isApproved ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnapproveLeave(uid, item.dateKey)}
                                  disabled={leaveApprovalLoading === key}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50 whitespace-nowrap"
                                >
                                  {leaveApprovalLoading === key ? (
                                    <Loader2 size={14} className="animate-spin flex-shrink-0" />
                                  ) : null}
                                  <span>승인취소</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleApproveLeave(uid, item)}
                                  disabled={leaveApprovalLoading === key}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-main text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                                >
                                  {leaveApprovalLoading === key ? (
                                    <Loader2 size={14} className="animate-spin flex-shrink-0" />
                                  ) : (
                                    <CheckCircle size={14} className="flex-shrink-0" />
                                  )}
                                  <span>연차승인</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
