import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAllWorkLogs } from '../../hooks/useWorkLog';
import { useUserList } from '../../hooks/useUserList';
import { deleteWorkLog, clockOutWorkLog, endOvertime } from '../../lib/worklog';
import { subscribeLeaveDays, approveLeaveDay, unapproveLeaveDay } from '../../lib/leaveDays';
import { getHolidayDateKeys } from '../../lib/kr-holidays';
import {
  toDateKeySeoul,
  isTardySeoul,
  getTardinessMinutesSeoul,
  formatTardinessNote,
  getDayOfWeekSeoul,
  getTodaySixTenSeoul,
  getTodayElevenPmSeoul,
} from '../../lib/datetime-seoul';
import type { AppUser } from '../../types/user';
import type { WorkLogEntry } from '../../types/worklog';
import { Loader2, Clock, CheckCircle, Database, Filter, Download, RotateCcw, CalendarCheck, Users } from 'lucide-react';
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

/** 주말·공휴일은 출근 시각과 관계없이 정상출근. holidayDateKeys는 선택(관리자 DB용). */
function getAttendanceStatus(
  log: WorkLogEntry,
  holidayDateKeys?: Set<string>
): string {
  if (log.status === 'absent') return '결근';
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

export function WorkLogAdminView({ currentUser }: WorkLogAdminViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [databaseAssigneeFilter, setDatabaseAssigneeFilter] = useState<Set<string> | null>(null);
  const [databaseFilterOpen, setDatabaseFilterOpen] = useState(false);
  const [databaseFilterPosition, setDatabaseFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [startDate, setStartDate] = useState(() =>
    toDateKeySeoul(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState(() => toDateKeySeoul(Date.now()));
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [leaveByUser, setLeaveByUser] = useState<Map<string, { dateKey: string; status: string }[]>>(new Map());
  const [leaveApprovalLoading, setLeaveApprovalLoading] = useState<string | null>(null);
  const [holidayDateKeys, setHolidayDateKeys] = useState<Set<string>>(new Set());
  const databaseFilterRef = React.useRef<HTMLDivElement>(null);
  const databaseFilterDropdownRef = React.useRef<HTMLDivElement>(null);

  const { workLogs: allLogs, loading: allLoading, error: allError } = useAllWorkLogs();
  const { users, loading: usersLoading } = useUserList();

  // 관리자 페이지에서도 18:10 자동 퇴근·야근 06:00 자동 종료 보정 (전체 로그 대상, 새로고침 시 적용)
  useEffect(() => {
    if (allLogs.length === 0) return;
    const now = Date.now();
    const toFixClockOut = allLogs.filter(
      (log) =>
        log.clockOutAt == null &&
        log.status === 'approved' &&
        now >= getTodaySixTenSeoul(log.clockInAt)
    );
    toFixClockOut.forEach((log) => {
      clockOutWorkLog(log.id, getTodaySixTenSeoul(log.clockInAt)).catch(console.error);
    });
    const toFixOvertime = allLogs.filter(
      (log) =>
        log.clockOutAt != null &&
        log.overtimeStartAt != null &&
        log.overtimeEndAt == null &&
        now >= getTodayElevenPmSeoul(log.clockInAt)
    );
    toFixOvertime.forEach((log) => {
      endOvertime(log.id, getTodayElevenPmSeoul(log.clockInAt)).catch(console.error);
    });
  }, [allLogs]);

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

  const handleApproveLeave = async (userId: string, dateKey: string) => {
    const key = `${userId}:${dateKey}`;
    if (leaveApprovalLoading) return;
    setLeaveApprovalLoading(key);
    try {
      await approveLeaveDay(userId, dateKey, currentUser.uid);
      setLeaveByUser((prev) => {
        const next = new Map(prev);
        const list = next.get(userId)?.map((i) => (i.dateKey === dateKey ? { ...i, status: 'approved' } : i)) ?? [];
        next.set(userId, list);
        return next;
      });
    } catch (err) {
      console.error(err);
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
      console.error(err);
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
      const note = status === '지각' ? formatTardinessNote(getTardinessMinutesSeoul(log.clockInAt)) : '';
      const totalMs =
        log.clockOutAt != null ? log.clockOutAt - log.clockInAt : null;
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

  const handleResetInRange = async () => {
    if (!selectedUserId || resetting) return;
    const toDelete = allLogs.filter(
      (log) =>
        log.userId === selectedUserId &&
        toDateKeySeoul(log.clockInAt) >= startDate &&
        toDateKeySeoul(log.clockInAt) <= endDate
    );
    if (toDelete.length === 0) {
      alert('선택한 기간에 해당 직원의 출퇴근 기록이 없습니다.');
      return;
    }
    if (!confirm(`선택한 기간(${startDate} ~ ${endDate}) 내 해당 직원의 출퇴근 기록 ${toDelete.length}건을 모두 삭제합니다. 계속할까요?`)) return;
    setResetting(true);
    try {
      await Promise.all(toDelete.map((log) => deleteWorkLog(log.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  const handleExportExcel = () => {
    const data = dbRows.map((r) => ({
      날짜: r.dateLabel,
      출근상태: r.attendanceStatus,
      출근시간: r.clockInAt != null ? formatTime(r.clockInAt) : '',
      퇴근시간: r.clockOutAt != null ? formatTime(r.clockOutAt) : '',
      야근시작: r.overtimeStartAt != null ? formatTime(r.overtimeStartAt) : '',
      야근종료: r.overtimeEndAt != null ? formatTime(r.overtimeEndAt) : '',
      총근무시간: r.totalMs != null ? formatDurationMs(r.totalMs) : '',
      비고: r.note,
      지각사유: r.tardinessReason ?? '',
      야근사유: r.overtimeReason ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출퇴근기록');
    XLSX.writeFile(wb, `출퇴근기록_${todayKey}.xlsx`);
  };

  const loading = allLoading || usersLoading;
  const error = allError;

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Clock size={24} className="text-brand-main" />
          <h1 className="text-xl font-semibold text-brand-dark">출퇴근 기록부</h1>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'today' ? 'bg-white border border-b-0 border-gray-200 text-brand-main' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={16} />
            오늘 출근 현황
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'database' ? 'bg-white border border-b-0 border-gray-200 text-brand-main' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Database size={16} />
            출퇴근 기록 데이터베이스
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaveApproval')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'leaveApproval' ? 'bg-white border border-b-0 border-gray-200 text-brand-main' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CalendarCheck size={16} />
            연차 승인
          </button>
        </div>

        {activeTab === 'today' && (
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <h2 className="text-lg font-semibold text-brand-dark px-5 py-4 border-b border-gray-200">
              오늘 출근 현황 ({todayKey})
            </h2>
            <p className="text-sm text-gray-500 px-5 pb-3">
              직원별 오늘 출근·연차·결근 상태를 한눈에 확인할 수 있습니다.
            </p>
            {allLoading || usersLoading ? (
              <p className="px-5 pb-4 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> 불러오는 중…
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">직원</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">오늘 상태</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">출근 시각</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRows.map((row) => (
                      <tr key={row.userId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-medium text-gray-800">
                          {row.displayName ?? row.userId.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 text-gray-700">
                          {row.clockInAt != null ? formatTime(row.clockInAt) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{row.note || '-'}</td>
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
            {allLoading || usersLoading ? (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> 불러오는 중…
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-4">
                  <div ref={databaseFilterRef} className="relative inline-flex items-center gap-2">
                    <span className="text-sm text-gray-700">담당자 (필터)</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!databaseFilterOpen) {
                          const r = databaseFilterRef.current?.getBoundingClientRect();
                          setDatabaseFilterPosition(r ? { top: r.bottom + 4, left: r.left } : null);
                        }
                        setDatabaseFilterOpen((o) => !o);
                      }}
                      className={`p-1.5 rounded border ${databaseAssigneeFilter !== null ? 'border-brand-main text-brand-main' : 'border-gray-300 text-gray-500'}`}
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
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              setDatabaseAssigneeFilter(null);
                              setDatabaseFilterOpen(false);
                            }}
                          >
                            전체 보기
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
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-gray-500">~</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
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
                </div>
                <div className="flex flex-wrap items-center gap-4 py-3 border-y border-gray-200">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">리셋 (기간 내 해당 직원 기록 삭제)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">직원 선택</span>
                    <select
                      value={selectedUserId ?? ''}
                      onChange={(e) => setSelectedUserId(e.target.value || null)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[120px]"
                    >
                      <option value="">선택</option>
                      {users.map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.displayName ?? u.uid.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleResetInRange}
                      disabled={!selectedUserId || resetting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      출근 상태 리셋
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
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
                      ) : (
                        dbRows.map((r) => (
                          <tr key={r.type === 'worklog' ? r.logId! : `leave-${r.userId}-${r.dateKey}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                            <td className="py-2 px-2 text-gray-800 whitespace-nowrap">{r.dateLabel}</td>
                            <td className="py-2 px-2 text-gray-800 whitespace-nowrap">{r.userDisplayName ?? r.userId.slice(0, 8)}</td>
                            <td className="py-2 px-2 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  r.attendanceStatus === '정상출근'
                                    ? 'bg-brand-sub/20 text-brand-dark'
                                    : r.attendanceStatus === '지각'
                                      ? 'bg-amber-100 text-amber-800'
                                      : r.attendanceStatus === '연차'
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
            <h2 className="text-lg font-semibold text-brand-dark px-5 py-4 border-b border-gray-200">
              연차 사용 승인
            </h2>
            <p className="text-sm text-gray-500 px-5 pb-3">
              직원이 지정한 연차(대기)를 승인하면 캘린더에 고정되며, 직원이 해제할 수 없습니다.
            </p>
            {usersLoading ? (
              <p className="px-5 pb-4 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> 불러오는 중…
              </p>
            ) : Array.from(leaveByUser.entries()).flatMap(([, items]) => items).length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-500">등록된 연차가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">직원</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">연차 일자</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">상태</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 min-w-[5.5rem]">연차승인 / 승인취소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(leaveByUser.entries()).flatMap(([uid, items]) =>
                      items.map((item) => {
                        const key = `${uid}:${item.dateKey}`;
                        const displayName = users.find((u) => u.uid === uid)?.displayName ?? uid.slice(0, 8);
                        const isApproved = item.status === 'approved';
                        return (
                          <tr key={key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                            <td className="py-3 px-4 font-medium text-gray-800">{displayName}</td>
                            <td className="py-3 px-4 text-gray-700">{formatDateKeyDisplay(item.dateKey)}</td>
                            <td className="py-3 px-4 text-center">
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
                                  onClick={() => handleApproveLeave(uid, item.dateKey)}
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
