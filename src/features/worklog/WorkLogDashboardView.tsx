import React, { useState, useEffect, useCallback } from 'react';
import { useTodayWorkLog, useMyWorkLogs } from '../../hooks/useWorkLog';
import { useLeaveDays } from '../../hooks/useLeaveDays';
import { createWorkLog, clockOutWorkLog } from '../../lib/worklog';
import { addLeaveDay, removeLeaveDay } from '../../lib/leaveDays';
import {
  toDateKeySeoul,
  getDayOfWeekSeoul,
  getNineTenSeoul,
  isWeekdaySeoul,
  isTardySeoul,
  getWeekRangeSeoul,
} from '../../lib/datetime-seoul';
import type { AppUser } from '../../types/user';
import { Loader2, Clock, X } from 'lucide-react';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatTimeSeoulWithSec(ms: number): string {
  const str = new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour12: false });
  const [h, m, s] = str.split(':');
  return `${h}시 ${m}분 ${s}초`;
}

function formatDurationMs(ms: number): string {
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

interface WorkLogDashboardViewProps {
  currentUser: AppUser;
}

export function WorkLogDashboardView({ currentUser }: WorkLogDashboardViewProps) {
  const [now, setNow] = useState(() => Date.now());
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState<string | null>(null);
  const [tardinessModalOpen, setTardinessModalOpen] = useState(false);
  const [tardinessReason, setTardinessReason] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => toDateKeySeoul(Date.now()).slice(0, 7)); // YYYY-MM

  const { todayLog, loading: todayLoading, error: todayError } = useTodayWorkLog(currentUser.uid);
  const { workLogs, loading: listLoading, error: listError } = useMyWorkLogs(currentUser.uid);
  const { leaveDateKeys, loading: leaveLoading } = useLeaveDays(currentUser.uid);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayKey = toDateKeySeoul(now);
  const isWeekday = isWeekdaySeoul(now);
  const isLeaveToday = leaveDateKeys.has(todayKey);
  const isTardyNow = isWeekday && now > getNineTenSeoul(now);

  const handleClockInClick = useCallback(() => {
    if (todayLog || clockInLoading) return;
    if (isTardyNow) {
      setTardinessModalOpen(true);
      setTardinessReason('');
      return;
    }
    setClockInLoading(true);
    createWorkLog(currentUser.uid, currentUser.displayName, null)
      .catch(console.error)
      .finally(() => setClockInLoading(false));
  }, [todayLog, clockInLoading, isTardyNow, currentUser.uid, currentUser.displayName]);

  const handleTardinessSubmit = useCallback(() => {
    const reason = tardinessReason.trim();
    if (!reason || clockInLoading) return;
    setClockInLoading(true);
    createWorkLog(currentUser.uid, currentUser.displayName, reason)
      .then(() => {
        setTardinessModalOpen(false);
        setTardinessReason('');
      })
      .catch(console.error)
      .finally(() => setClockInLoading(false));
  }, [tardinessReason, clockInLoading, currentUser.uid, currentUser.displayName]);

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

  const showClockInButton = isWeekday && !isLeaveToday && !todayLog && !clockInLoading;
  const canClockOut = todayLog?.status === 'approved' && todayLog.clockOutAt == null;

  const todayWorkMs =
    todayLog?.clockInAt != null && todayLog.clockOutAt != null
      ? todayLog.clockOutAt - todayLog.clockInAt
      : todayLog?.clockInAt != null && todayLog.status === 'approved'
        ? now - todayLog.clockInAt
        : 0;

  const { start: weekStart, end: weekEnd } = getWeekRangeSeoul(now);
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
  const tardyCount = workLogs.filter(
    (log) =>
      log.status === 'approved' &&
      isTardySeoul(log.clockInAt) &&
      log.clockInAt >= weekStart &&
      log.clockInAt <= weekEnd
  ).length;

  const loading = todayLoading || listLoading || leaveLoading;
  const error = todayError ?? listError;

  const toggleLeaveDay = useCallback(
    (dateKey: string) => {
      if (leaveDateKeys.has(dateKey)) {
        removeLeaveDay(currentUser.uid, dateKey).catch(console.error);
      } else {
        addLeaveDay(currentUser.uid, dateKey).catch(console.error);
      }
    },
    [currentUser.uid, leaveDateKeys]
  );

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

  const [year, month] = calendarMonth.split('-').map(Number);
  const firstDayMs = new Date(`${year}-${String(month).padStart(2, '0')}-01T12:00:00+09:00`).getTime();
  const startPad = getDayOfWeekSeoul(firstDayMs);
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
  const calendarDays: { dateKey: string; day: number; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < startPad; i++) {
    const d = daysInPrevMonth - startPad + i + 1;
    const dateKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dateKey, day: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dateKey, day: d, isCurrentMonth: true });
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 0; i < remaining; i++) {
    const d = i + 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const dateKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dateKey, day: d, isCurrentMonth: false });
  }

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* 상단: 날짜(서울), 환영 메시지, 온라인 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-gray-500">
              {new Date(now).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
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

        {/* 중앙: 현재 시간(서울), 상태, 출근/퇴근 버튼, 오늘 근무 시간 카드 */}
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
              {formatTimeSeoulWithSec(now)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">(서울 기준)</p>
            <div className="mt-4 flex flex-col gap-2">
              {showClockInButton && (
                <button
                  type="button"
                  onClick={handleClockInClick}
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
              {!isWeekday && !todayLog && (
                <p className="text-sm text-gray-500">주말에는 출근 버튼이 표시되지 않습니다.</p>
              )}
              {isLeaveToday && !todayLog && (
                <p className="text-sm text-brand-sub">오늘은 연차로 등록된 날입니다.</p>
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
              {showClockInButton && '출근 버튼을 눌러 업무를 시작하세요.'}
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
                    : formatDurationMs(now - todayLog.clockInAt)}
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
            {!todayLog && !isLeaveToday && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-sub" />
                아직 출근 전입니다
              </p>
            )}
          </div>
        </div>

        {/* 이번 주 요약: 잔여 연차 삭제, 지각 횟수 */}
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
              <span className="text-gray-700">지각</span>
              <span className="font-medium text-brand-dark">{tardyCount}회</span>
            </div>
          </div>
        </div>

        {/* 캘린더: 연차 지정/해제 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-brand-dark">연차 캘린더</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const [y, m] = calendarMonth.split('-').map(Number);
                  if (m <= 1) setCalendarMonth(`${y - 1}-12`);
                  else setCalendarMonth(`${y}-${String(m - 1).padStart(2, '0')}`);
                }}
                className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                이전
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                {year}년 {month}월
              </span>
              <button
                type="button"
                onClick={() => {
                  const [y, m] = calendarMonth.split('-').map(Number);
                  if (m >= 12) setCalendarMonth(`${y + 1}-01`);
                  else setCalendarMonth(`${y}-${String(m + 1).padStart(2, '0')}`);
                }}
                className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                다음
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {WEEKDAY_NAMES.map((w) => (
                <div key={w} className="py-1 font-medium text-gray-600">
                  {w}
                </div>
              ))}
              {calendarDays.map(({ dateKey, day, isCurrentMonth }) => {
                const isLeave = leaveDateKeys.has(dateKey);
                const isToday = dateKey === todayKey;
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => toggleLeaveDay(dateKey)}
                    className={`py-2 rounded border transition-colors ${
                      !isCurrentMonth ? 'text-gray-300' : 'text-gray-800'
                    } ${isLeave ? 'bg-brand-sub/30 border-brand-sub' : 'border-transparent hover:bg-gray-100'} ${
                      isToday ? 'ring-2 ring-brand-main' : ''
                    }`}
                  >
                    {day}
                    {isLeave && <span className="block text-xs text-brand-dark mt-0.5">연차</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">날짜를 클릭하면 연차로 지정/해제됩니다.</p>
          </div>
        </div>
      </div>

      {/* 지각 사유 모달 */}
      {tardinessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-brand-dark mb-2">지각 사유를 작성해주세요</h3>
            <p className="text-sm text-gray-600 mb-4">오전 09:10 이후 출근 시 사유를 입력한 뒤 출근하기를 눌러 주세요.</p>
            <textarea
              value={tardinessReason}
              onChange={(e) => setTardinessReason(e.target.value)}
              placeholder="지각 사유 입력"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px] resize-y"
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setTardinessModalOpen(false);
                  setTardinessReason('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <X size={16} /> 취소
              </button>
              <button
                type="button"
                onClick={handleTardinessSubmit}
                disabled={!tardinessReason.trim() || clockInLoading}
                className="flex-1 py-2 px-4 rounded-lg bg-brand-main text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {clockInLoading ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                출근하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
