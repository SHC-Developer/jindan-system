import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePendingWorkLogs, useAllWorkLogs } from '../../hooks/useWorkLog';
import { useUserList } from '../../hooks/useUserList';
import { approveWorkLog, deleteWorkLog } from '../../lib/worklog';
import { getLeaveDaysForUser } from '../../lib/leaveDays';
import {
  toDateKeySeoul,
  isTardySeoul,
  getTardinessMinutesSeoul,
  formatTardinessNote,
} from '../../lib/datetime-seoul';
import type { AppUser } from '../../types/user';
import type { WorkLogEntry } from '../../types/worklog';
import { Loader2, Clock, CheckCircle, Database, Filter, Download, RotateCcw } from 'lucide-react';
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

function getAttendanceStatus(log: WorkLogEntry): string {
  if (log.status === 'pending') return '승인 대기';
  if (log.status === 'rejected') return '승인 거부';
  if (log.status === 'approved' && isTardySeoul(log.clockInAt)) return '지각';
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
  totalMs: number | null;
  note: string;
  tardinessReason: string | null;
  logId?: string;
}

interface WorkLogAdminViewProps {
  currentUser: AppUser;
}

type TabId = 'pending' | 'database';

export function WorkLogAdminView({ currentUser }: WorkLogAdminViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [databaseAssigneeFilter, setDatabaseAssigneeFilter] = useState<Set<string> | null>(null);
  const [databaseFilterOpen, setDatabaseFilterOpen] = useState(false);
  const [databaseFilterPosition, setDatabaseFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [leaveDaysByUser, setLeaveDaysByUser] = useState<Map<string, Set<string>>>(new Map());
  const databaseFilterRef = React.useRef<HTMLDivElement>(null);
  const databaseFilterDropdownRef = React.useRef<HTMLDivElement>(null);

  const { workLogs: pendingLogs, loading: pendingLoading, error: pendingError } = usePendingWorkLogs();
  const { workLogs: allLogs, loading: allLoading, error: allError } = useAllWorkLogs();
  const { users, loading: usersLoading } = useUserList();

  const userIdsToFetchLeave = useMemo(() => {
    if (databaseAssigneeFilter === null) return users.map((u) => u.uid);
    return [...databaseAssigneeFilter];
  }, [databaseAssigneeFilter, users]);

  useEffect(() => {
    if (userIdsToFetchLeave.length === 0) {
      setLeaveDaysByUser(new Map());
      return;
    }
    let cancelled = false;
    const map = new Map<string, Set<string>>();
    Promise.all(
      userIdsToFetchLeave.map(async (uid) => {
        const keys = await getLeaveDaysForUser(uid);
        return { uid, keys };
      })
    ).then((results) => {
      if (cancelled) return;
      results.forEach(({ uid, keys }) => map.set(uid, new Set(keys)));
      setLeaveDaysByUser(new Map(map));
    });
    return () => {
      cancelled = true;
    };
  }, [userIdsToFetchLeave.join(',')]);

  const handleApprove = async (logId: string) => {
    if (approvingId) return;
    setApprovingId(logId);
    try {
      await approveWorkLog(logId, currentUser.uid);
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingId(null);
    }
  };

  const todayKey = toDateKeySeoul(Date.now());

  const dbRows = useMemo((): DbRow[] => {
    const start = startDate.replace(/-/g, '');
    const end = endDate.replace(/-/g, '');
    const filteredLogs = allLogs.filter((log) => {
      const key = toDateKeySeoul(log.clockInAt);
      if (key < start || key > end) return false;
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
      const status = getAttendanceStatus(log);
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
        totalMs,
        note,
        tardinessReason: log.tardinessReason,
        logId: log.id,
      };
    });
    userIdsToFetchLeave.forEach((uid) => {
      const leaveKeys = leaveDaysByUser.get(uid) ?? new Set<string>();
      const existingKeys = logKeysByUser.get(uid) ?? new Set<string>();
      const userDisplayName = users.find((u) => u.uid === uid)?.displayName ?? null;
      leaveKeys.forEach((dateKey) => {
        if (dateKey < start || dateKey > end) return;
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
          totalMs: null,
          note: '',
          tardinessReason: null,
        });
      });
    });
    rows.sort((a, b) => (b.dateKey > a.dateKey ? 1 : -1));
    return rows;
  }, [allLogs, startDate, endDate, databaseAssigneeFilter, userIdsToFetchLeave, leaveDaysByUser, users]);

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

  const handleResetToday = async () => {
    if (!selectedUserId || resetting) return;
    const todayLog = allLogs.find(
      (log) => log.userId === selectedUserId && toDateKeySeoul(log.clockInAt) === todayKey
    );
    if (!todayLog) {
      alert('해당 직원의 오늘 출근 기록이 없습니다.');
      return;
    }
    setResetting(true);
    try {
      await deleteWorkLog(todayLog.id);
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
      총근무시간: r.totalMs != null ? formatDurationMs(r.totalMs) : '',
      비고: r.note,
      지각사유: r.tardinessReason ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출퇴근기록');
    XLSX.writeFile(wb, `출퇴근기록_${todayKey}.xlsx`);
  };

  const loading = activeTab === 'pending' ? pendingLoading : allLoading || usersLoading;
  const error = activeTab === 'pending' ? pendingError : allError;

  if (loading && activeTab === 'pending') {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-gray-500 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> 승인 대기 목록 불러오는 중…
        </p>
      </div>
    );
  }

  if (error && activeTab === 'pending') {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Clock size={24} className="text-brand-main" />
          <h1 className="text-xl font-semibold text-brand-dark">출퇴근 기록부</h1>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'pending' ? 'bg-white border border-b-0 border-gray-200 text-brand-main' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            출근 승인 대기
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
        </div>

        {activeTab === 'pending' && (
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <h2 className="text-lg font-semibold text-brand-dark px-5 py-4 border-b border-gray-200">
              출근 승인 대기
            </h2>
            <p className="text-sm text-gray-500 px-5 pb-3">
              직원이 출근하기를 누르면 여기에 표시됩니다. 승인하면 해당 직원 화면에 정상 출근으로 반영됩니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">직원</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">날짜</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">출근 시각</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 w-24">승인</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        승인 대기 중인 출근 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    pendingLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-medium text-gray-800">
                          {log.userDisplayName ?? log.userId.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 text-gray-700">{formatDateLabelSeoul(log.clockInAt)}</td>
                        <td className="py-3 px-4 text-gray-700">{formatTime(log.clockInAt)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleApprove(log.id)}
                            disabled={approvingId === log.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-main text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                          >
                            {approvingId === log.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            승인
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                    <span className="text-sm text-gray-700">담당자</span>
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">직원 선택 (리셋용)</span>
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
                      onClick={handleResetToday}
                      disabled={!selectedUserId || resetting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      출근 상태 리셋
                    </button>
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

                <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-sm border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">날짜</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">직원</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">출근 상태</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">출근 시간</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">퇴근 시간</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">총 근무 시간</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">비고</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">지각 사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-500">
                            조건에 맞는 기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        dbRows.map((r) => (
                          <tr key={r.type === 'worklog' ? r.logId! : `leave-${r.userId}-${r.dateKey}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                            <td className="py-3 px-4 text-gray-800">{r.dateLabel}</td>
                            <td className="py-3 px-4 text-gray-800">{r.userDisplayName ?? r.userId.slice(0, 8)}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  r.attendanceStatus === '정상출근'
                                    ? 'bg-brand-sub/20 text-brand-dark'
                                    : r.attendanceStatus === '지각'
                                      ? 'bg-amber-100 text-amber-800'
                                      : r.attendanceStatus === '연차'
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {r.attendanceStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {r.clockInAt != null ? formatTime(r.clockInAt) : '-'}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {r.clockOutAt != null ? formatTime(r.clockOutAt) : '-'}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {r.totalMs != null ? formatDurationMs(r.totalMs) : '-'}
                            </td>
                            <td className="py-3 px-4 text-gray-700">{r.note || '-'}</td>
                            <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate" title={r.tardinessReason ?? ''}>
                              {r.tardinessReason ?? '-'}
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
      </div>
    </div>
  );
}
