import React, { useState, useEffect, useCallback } from 'react';
import { useTodayWorkLog, useMyWorkLogs } from '../../hooks/useWorkLog';
import { createWorkLog, clockOutWorkLog } from '../../lib/worklog';
import type { AppUser } from '../../types/user';
import type { WorkLogStatus } from '../../types/worklog';
import { Loader2, MapPin, Clock } from 'lucide-react';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(ms: number): string {
  const d = new Date(ms);
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const day = WEEKDAY_NAMES[d.getDay()];
  return `${month}월 ${date}일 (${day})`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDurationMs(ms: number): string {
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

function getStatusLabel(status: WorkLogStatus): string {
  switch (status) {
    case 'pending':
      return '승인 대기';
    case 'approved':
      return '정상 출근';
    case 'rejected':
      return '승인 거부';
    default:
      return status;
  }
}

function getWeekRange(): { start: number; end: number } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const start = monday.getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

interface WorkLogDashboardViewProps {
  currentUser: AppUser;
}

export function WorkLogDashboardView({ currentUser }: WorkLogDashboardViewProps) {
  const [now, setNow] = useState(() => new Date());
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState<string | null>(null);

  const { todayLog, loading: todayLoading, error: todayError } = useTodayWorkLog(currentUser.uid);
  const { workLogs, loading: listLoading, error: listError } = useMyWorkLogs(currentUser.uid);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleClockIn = useCallback(async () => {
    if (todayLog || clockInLoading) return;
    setClockInLoading(true);
    try {
      await createWorkLog(currentUser.uid, currentUser.displayName);
    } catch (err) {
      console.error(err);
    } finally {
      setClockInLoading(false);
    }
  }, [currentUser.uid, currentUser.displayName, todayLog, clockInLoading]);

  const handleClockOut = useCallback(
    async (logId: string) => {
      if (clockOutLoading) return;
      setClockOutLoading(logId);
      try {
        await clockOutWorkLog(logId);
      } catch (err) {
        console.error(err);
      } finally {
        setClockOutLoading(null);
      }
    },
    [clockOutLoading]
  );

  const statusText =
    !todayLog ? null
    : todayLog.status === 'pending' ? '승인 대기중'
    : '정상 근무';

  const canClockIn = !todayLog && !clockInLoading;
  const canClockOut = todayLog?.status === 'approved' && todayLog.clockOutAt == null;

  const todayWorkMs =
    todayLog?.clockInAt != null && todayLog.clockOutAt != null
      ? todayLog.clockOutAt - todayLog.clockInAt
      : todayLog?.clockInAt != null && todayLog.status === 'approved'
        ? now.getTime() - todayLog.clockInAt
        : 0;

  const { start: weekStart, end: weekEnd } = getWeekRange();
  const weekTotalMs = workLogs
    .filter(
      (log) =>
        log.status === 'approved' &&
        log.clockOutAt != null &&
        log.clockInAt >= weekStart &&
        log.clockInAt <= weekEnd
    )
    .reduce((sum, log) => sum + (log.clockOutAt! - log.clockInAt), 0);
  const weekTargetMs = 40 * 60 * 60 * 1000;

  const recentLogs = workLogs.slice(0, 10);

  const loading = todayLoading || listLoading;
  const error = todayError ?? listError;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-gray-500 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> 출퇴근 기록 불러오는 중…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* 상단: 날짜, 환영 메시지, 온라인 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-gray-500">
              {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일 ({WEEKDAY_NAMES[now.getDay()]})
            </p>
            <h1 className="text-xl font-semibold text-brand-dark mt-0.5">
              안녕하세요, {currentUser.displayName ?? '사용자'}님! 👋
            </h1>
            <p className="text-sm text-gray-600">오늘도 활기차게 시작해볼까요?</p>
          </div>
          <div className="flex items-center gap-1.5 text-brand-sub text-sm">
            <span className="w-2 h-2 rounded-full bg-brand-sub" aria-hidden />
            <span>온라인</span>
          </div>
        </div>

        {/* 근무 위치 */}
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <MapPin size={16} className="text-brand-sub" />
          <span>서울 오피스</span>
        </div>

        {/* 중앙: 현재 시간, 상태, 출근/퇴근 버튼, 오늘 근무 시간 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-6 items-start">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            {statusText && (
              <p
                className={`text-sm font-medium mb-2 ${
                  statusText === '승인 대기중' ? 'text-amber-600' : 'text-brand-sub'
                }`}
              >
                {statusText}
              </p>
            )}
            <p className="text-2xl font-mono font-semibold text-brand-dark tabular-nums">
              {now.getHours().toString().padStart(2, '0')}시 {now.getMinutes().toString().padStart(2, '0')}분{' '}
              {now.getSeconds().toString().padStart(2, '0')}초
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {canClockIn && (
                <button
                  type="button"
                  onClick={handleClockIn}
                  disabled={clockInLoading}
                  className="w-full py-3 px-4 rounded-lg bg-brand-main text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {clockInLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Clock size={18} />
                      출근하기
                    </>
                  )}
                </button>
              )}
              {todayLog && todayLog.status === 'pending' && (
                <p className="text-sm text-amber-600">출근 버튼을 눌렀습니다. 관리자 승인을 기다려 주세요.</p>
              )}
              {canClockOut && (
                <button
                  type="button"
                  onClick={() => handleClockOut(todayLog!.id)}
                  disabled={clockOutLoading === todayLog!.id}
                  className="w-full py-3 px-4 rounded-lg bg-brand-main text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {clockOutLoading === todayLog!.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Clock size={18} />
                      퇴근하기
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {canClockIn && '출근 버튼을 눌러 업무를 시작하세요.'}
              {todayLog?.status === 'pending' && '승인 후 퇴근할 수 있습니다.'}
              {canClockOut && '퇴근 버튼을 눌러 업무를 마무리하세요.'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm min-w-[200px]">
            <h3 className="text-sm font-medium text-gray-700 mb-2">오늘 근무 시간</h3>
            {!todayLog && <p className="text-lg font-mono text-brand-dark">0h 0m</p>}
            {todayLog && todayLog.status === 'pending' && (
              <>
                <p className="text-lg font-mono text-brand-dark">0h 0m</p>
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  승인 대기중
                </p>
              </>
            )}
            {todayLog && todayLog.status === 'approved' && (
              <>
                <p className="text-lg font-mono text-brand-dark">
                  {todayLog.clockOutAt
                    ? formatDurationMs(todayLog.clockOutAt - todayLog.clockInAt)
                    : formatDurationMs(now.getTime() - todayLog.clockInAt)}
                </p>
                {!todayLog.clockOutAt && (
                  <p className="text-xs text-brand-sub mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-sub" />
                    근무 중
                  </p>
                )}
              </>
            )}
            {todayLog?.status === 'approved' && todayLog.clockOutAt && (
              <p className="text-xs text-gray-500 mt-1">퇴근 완료</p>
            )}
            {!todayLog && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-sub" />
                아직 출근 전입니다
              </p>
            )}
          </div>
        </div>

        {/* 이번 주 요약 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-dark mb-4">이번 주 요약</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">총 근무 시간</span>
                <span className="font-medium text-brand-dark">
                  {formatDurationMs(weekTotalMs)} / 40h
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-main rounded-full transition-all"
                  style={{ width: `${Math.min(100, (weekTotalMs / weekTargetMs) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">잔여 연차</span>
              <span className="font-medium text-brand-dark">12일</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">지각</span>
              <span className="font-medium text-brand-dark">0회</span>
            </div>
          </div>
        </div>

        {/* 최근 활동 기록 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-brand-dark">최근 활동 기록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">날짜</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">상태</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">출근 시간</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">퇴근 시간</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">총 근무 시간</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">비고</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      최근 출퇴근 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-800">{formatDateLabel(log.clockInAt)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            log.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : log.status === 'approved'
                                ? 'bg-brand-sub/20 text-brand-dark'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {getStatusLabel(log.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {log.clockInAt ? formatTime(log.clockInAt) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {log.clockOutAt ? formatTime(log.clockOutAt) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {log.clockOutAt
                          ? formatDurationMs(log.clockOutAt - log.clockInAt)
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-500">-</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
