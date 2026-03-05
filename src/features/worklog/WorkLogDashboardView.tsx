import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTodayWorkLog, useMyWorkLogs } from '../../hooks/useWorkLog';
import { useLeaveDays } from '../../hooks/useLeaveDays';
import {
  createWorkLog,
  updateWorkLogToClockIn,
  clockOutWorkLog,
  startOvertime,
  endOvertime,
} from '../../lib/worklog';
import { addLeaveDay, removeLeaveDay } from '../../lib/leaveDays';
import { notifyAdmins } from '../../lib/notifications';
import {
  toDateKeySeoul,
  getDayOfWeekSeoul,
  getNineTenSeoul,
  getTodaySixSeoul,
  getTodaySixTenSeoul,
  getTodayElevenPmSeoul,
  isWeekdaySeoul,
  isTardySeoul,
  getWeekRangeSeoul,
} from '../../lib/datetime-seoul';
import { getHolidayDateKeys } from '../../lib/kr-holidays';
import { useToastContext } from '../../contexts/ToastContext';
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
  const [holidayDateKeys, setHolidayDateKeys] = useState<Set<string>>(new Set());
  const [weekHolidayDateKeys, setWeekHolidayDateKeys] = useState<Set<string>>(new Set());
  const [weekHolidayLoaded, setWeekHolidayLoaded] = useState(false);
  const [overtimeLoading, setOvertimeLoading] = useState<string | null>(null);

  const { addToast } = useToastContext();
  const { todayLog: rawTodayLog, loading: todayLoading, error: todayError } = useTodayWorkLog(currentUser.uid, now);
  /** 본인 로그만 사용 (다른 사용자 문서가 섞여 표시되는 경우 방지) */
  const todayLog =
    rawTodayLog != null && rawTodayLog.userId === currentUser.uid ? rawTodayLog : null;
  const { workLogs, loading: listLoading, error: listError } = useMyWorkLogs(currentUser.uid);
  const { leaveDateKeys, approvedDateKeys, loading: leaveLoading } = useLeaveDays(currentUser.uid);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const year = parseInt(calendarMonth.slice(0, 4), 10);
    getHolidayDateKeys(year).then(setHolidayDateKeys);
  }, [calendarMonth]);

  const { start: weekStart, end: weekEnd } = getWeekRangeSeoul(now);
  useEffect(() => {
    const startYear = parseInt(toDateKeySeoul(weekStart).slice(0, 4), 10);
    const endYear = parseInt(toDateKeySeoul(weekEnd).slice(0, 4), 10);
    const years = startYear === endYear ? [startYear] : [startYear, endYear];
    let cancelled = false;
    Promise.all(years.map((y) => getHolidayDateKeys(y)))
      .then((sets) => {
        if (cancelled) return;
        const merged = new Set<string>();
        sets.forEach((s) => s.forEach((k) => merged.add(k)));
        setWeekHolidayDateKeys(merged);
        setWeekHolidayLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart, weekEnd]);

  const todayKey = toDateKeySeoul(now);
  const isWeekday = isWeekdaySeoul(now);
  const isLeaveToday = leaveDateKeys.has(todayKey);
  const isHolidayToday = holidayDateKeys.has(todayKey);
  const isTardyNow = isWeekday && !isHolidayToday && now > getNineTenSeoul(now);

  const handleClockInClick = useCallback(() => {
    if ((todayLog && todayLog.status !== 'absent') || clockInLoading) return;
    if (isTardyNow) {
      setTardinessModalOpen(true);
      setTardinessReason('');
      return;
    }
    setClockInLoading(true);
    const onSuccess = () => {
      const name = currentUser.displayName ?? '직원';
      addToast({
        title: '출근 완료',
        message: `${name}님, 출근이 완료되었습니다. 오늘도 좋은 하루 되세요!`,
      });
    };
    if (todayLog?.status === 'absent') {
      updateWorkLogToClockIn(todayLog.id, Date.now(), null, currentUser.uid)
        .then(onSuccess)
        .catch(console.error)
        .finally(() => setClockInLoading(false));
    } else {
      createWorkLog(currentUser.uid, currentUser.displayName, null)
        .then(onSuccess)
        .catch(console.error)
        .finally(() => setClockInLoading(false));
    }
  }, [todayLog, clockInLoading, isTardyNow, currentUser.uid, currentUser.displayName, addToast]);

  const handleTardinessSubmit = useCallback(() => {
    const reason = tardinessReason.trim();
    if (!reason || clockInLoading) return;
    setClockInLoading(true);
    const onSuccess = () => {
      setTardinessModalOpen(false);
      setTardinessReason('');
      const name = currentUser.displayName ?? '직원';
      addToast({
        title: '출근 완료',
        message: `${name}님, 출근이 완료되었습니다. 오늘도 좋은 하루 되세요!`,
      });
    };
    if (todayLog?.status === 'absent') {
      updateWorkLogToClockIn(todayLog.id, Date.now(), reason, currentUser.uid)
        .then(onSuccess)
        .catch(console.error)
        .finally(() => setClockInLoading(false));
    } else {
      createWorkLog(currentUser.uid, currentUser.displayName, reason)
        .then(onSuccess)
        .catch(console.error)
        .finally(() => setClockInLoading(false));
    }
  }, [tardinessReason, clockInLoading, todayLog, currentUser.uid, currentUser.displayName, addToast]);

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

  const statusText = todayLog && todayLog.status !== 'absent' ? '정상 근무' : null;

  const showClockInButton =
    !isLeaveToday && (!todayLog || todayLog.status === 'absent') && !clockInLoading;
  const canClockOut =
    todayLog != null &&
    todayLog.status !== 'absent' &&
    todayLog.clockOutAt == null;

  const todayWorkMs =
    todayLog?.status === 'absent'
      ? 0
      : todayLog?.clockInAt != null && todayLog.clockOutAt != null
        ? todayLog.clockOutAt - todayLog.clockInAt
        : todayLog?.clockInAt != null
          ? now - todayLog.clockInAt
          : 0;

  // 실시간: 오늘 로그(출근 처리된 것만)에 대해 18:10 지나면 자동 퇴근
  useEffect(() => {
    if (!todayLog || todayLog.status !== 'approved' || todayLog.clockOutAt != null) return;
    const sixTen = getTodaySixTenSeoul(now);
    if (now >= sixTen) {
      clockOutWorkLog(todayLog.id, sixTen).catch(console.error);
    }
  }, [todayLog?.id, todayLog?.status, todayLog?.clockOutAt, now]);

  // 보정: 퇴근 미처리 건 중 출근일 기준 18:10이 이미 지난 건 모두 18:10으로 자동 퇴근 (페이지 나중에 열어도 적용)
  useEffect(() => {
    const toFix = workLogs.filter(
      (log) =>
        log.clockOutAt == null &&
        log.status === 'approved' &&
        now >= getTodaySixTenSeoul(log.clockInAt)
    );
    toFix.forEach((log) => {
      clockOutWorkLog(log.id, getTodaySixTenSeoul(log.clockInAt)).catch(console.error);
    });
  }, [workLogs, now]);

  // 실시간: 오늘 로그(출근 처리된 것만)에 대해 야근 중이면 당일 23:00 지나면 자동 종료
  useEffect(() => {
    if (
      !todayLog ||
      todayLog.status !== 'approved' ||
      !todayLog.clockOutAt ||
      !todayLog.overtimeStartAt ||
      todayLog.overtimeEndAt != null
    )
      return;
    const elevenPm = getTodayElevenPmSeoul(todayLog.clockInAt);
    if (now >= elevenPm) {
      endOvertime(todayLog.id, elevenPm).catch(console.error);
    }
  }, [todayLog?.id, todayLog?.status, todayLog?.clockInAt, todayLog?.clockOutAt, todayLog?.overtimeStartAt, todayLog?.overtimeEndAt, now]);

  // 보정: 야근 시작 후 미종료 건 중 출근일 기준 당일 23:00이 이미 지난 건 모두 23:00으로 자동 종료
  useEffect(() => {
    const toFix = workLogs.filter(
      (log) =>
        log.clockOutAt != null &&
        log.overtimeStartAt != null &&
        log.overtimeEndAt == null &&
        now >= getTodayElevenPmSeoul(log.clockInAt)
    );
    toFix.forEach((log) => {
      endOvertime(log.id, getTodayElevenPmSeoul(log.clockInAt)).catch(console.error);
    });
  }, [workLogs, now]);

  const handleStartOvertime = useCallback(
    async (logId: string) => {
      if (overtimeLoading) return;
      setOvertimeLoading(logId);
      try {
        await startOvertime(logId);
      } catch (err) {
        console.error(err);
      } finally {
        setOvertimeLoading(null);
      }
    },
    [overtimeLoading]
  );

  const handleEndOvertime = useCallback(
    async (logId: string) => {
      if (overtimeLoading) return;
      setOvertimeLoading(logId);
      try {
        await endOvertime(logId);
      } catch (err) {
        console.error(err);
      } finally {
        setOvertimeLoading(null);
      }
    },
    [overtimeLoading]
  );

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
  const tardyCount = weekHolidayLoaded
    ? workLogs.filter(
        (log) =>
          log.status === 'approved' &&
          isTardySeoul(log.clockInAt) &&
          !weekHolidayDateKeys.has(toDateKeySeoul(log.clockInAt)) &&
          log.clockInAt >= weekStart &&
          log.clockInAt <= weekEnd
      ).length
    : 0;

  const loading = todayLoading || listLoading || leaveLoading;
  const error = todayError ?? listError;

  const toggleLeaveDay = useCallback(
    (dateKey: string) => {
      if (approvedDateKeys.has(dateKey)) return;
      if (leaveDateKeys.has(dateKey)) {
        removeLeaveDay(currentUser.uid, dateKey).catch(console.error);
      } else {
        addLeaveDay(currentUser.uid, dateKey).catch(console.error);
      }
    },
    [currentUser.uid, leaveDateKeys, approvedDateKeys]
  );

  const pendingLeaveKeys = useMemo(
    () => new Set([...leaveDateKeys].filter((k) => !approvedDateKeys.has(k))),
    [leaveDateKeys, approvedDateKeys]
  );
  const [lastRequestedPendingKeys, setLastRequestedPendingKeys] = useState<Set<string>>(new Set());
  const pendingNotYetRequested = useMemo(
    () => [...pendingLeaveKeys].filter((k) => !lastRequestedPendingKeys.has(k)),
    [pendingLeaveKeys, lastRequestedPendingKeys]
  );
  const showLeaveRequestButton = pendingNotYetRequested.length > 0;
  const showLeaveRequestDone = lastRequestedPendingKeys.size > 0 && pendingNotYetRequested.length === 0;

  const [leaveRequestSending, setLeaveRequestSending] = useState(false);
  const handleLeaveRequest = useCallback(async () => {
    if (pendingLeaveKeys.size === 0 || leaveRequestSending) return;
    setLeaveRequestSending(true);
    try {
      await notifyAdmins({
        type: 'leave_approval_request',
        title: '연차 승인 요청',
        leaveUserDisplayName: currentUser.displayName ?? undefined,
      });
      setLastRequestedPendingKeys(new Set(pendingLeaveKeys));
    } catch (err) {
      console.error(err);
    } finally {
      setLeaveRequestSending(false);
    }
  }, [pendingLeaveKeys, leaveRequestSending, currentUser.displayName]);

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
              <p className="text-sm font-medium mb-2 text-brand-sub">
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
              {isLeaveToday && !todayLog && (
                <p className="text-sm text-brand-sub">오늘은 연차로 등록된 날입니다.</p>
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
              {todayLog &&
                todayLog.clockOutAt != null &&
                todayLog.clockOutAt >= getTodaySixSeoul(todayLog.clockInAt) &&
                todayLog.overtimeEndAt == null && (
                <div className="flex flex-col gap-2 mt-2">
                  {todayLog.overtimeStartAt == null ? (
                    <button
                      type="button"
                      onClick={() => handleStartOvertime(todayLog.id)}
                      disabled={overtimeLoading === todayLog.id}
                      className="w-full py-2 px-4 rounded-lg border border-brand-main text-brand-main font-medium hover:bg-brand-main/10 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {overtimeLoading === todayLog.id ? <Loader2 size={16} className="animate-spin" /> : null}
                      야근 시작
                    </button>
                  ) : (
                    <>
                      <p className="text-xs text-brand-sub">야근 중</p>
                      <button
                        type="button"
                        onClick={() => handleEndOvertime(todayLog.id)}
                        disabled={overtimeLoading === todayLog.id}
                        className="w-full py-2 px-4 rounded-lg bg-brand-main text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {overtimeLoading === todayLog.id ? <Loader2 size={16} className="animate-spin" /> : null}
                        야근 종료
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {showClockInButton && '출근 버튼을 눌러 업무를 시작하세요.'}
              {canClockOut && '퇴근 버튼을 눌러 업무를 마무리하세요.'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm min-w-[200px]">
            <h3 className="text-sm font-medium text-gray-700 mb-2">오늘 근무 시간</h3>
            {(!todayLog || todayLog.status === 'absent') && (
              <>
                <p className="text-lg font-mono text-brand-dark">0h 0m</p>
                {!isLeaveToday && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-sub" />
                    아직 출근 전입니다
                  </p>
                )}
              </>
            )}
            {todayLog && todayLog.status !== 'absent' && (
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
                {todayLog.clockOutAt && <p className="text-xs text-gray-500 mt-1">퇴근 완료</p>}
              </>
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
              {WEEKDAY_NAMES.map((w, i) => (
                <div
                  key={w}
                  className={`py-1 font-medium ${
                    i === 0 ? 'text-[var(--color-calendar-sun)]' : i === 6 ? 'text-[var(--color-calendar-sat)]' : 'text-gray-600'
                  }`}
                >
                  {w}
                </div>
              ))}
              {calendarDays.map(({ dateKey, day, isCurrentMonth }) => {
                const isLeave = leaveDateKeys.has(dateKey);
                const isApproved = approvedDateKeys.has(dateKey);
                const isToday = dateKey === todayKey;
                const dayMs = new Date(dateKey + 'T12:00:00+09:00').getTime();
                const dayOfWeek = getDayOfWeekSeoul(dayMs);
                const isSun = dayOfWeek === 0;
                const isSat = dayOfWeek === 6;
                const isHoliday = holidayDateKeys.has(dateKey);
                const isRed = isSun || isHoliday;
                const isBlue = isSat && !isHoliday;
                const dayColor = !isCurrentMonth
                  ? 'text-gray-300'
                  : isRed
                    ? 'text-[var(--color-calendar-sun)]'
                    : isBlue
                      ? 'text-[var(--color-calendar-sat)]'
                      : 'text-gray-800';
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => toggleLeaveDay(dateKey)}
                    className={`py-2 rounded border transition-colors ${dayColor} ${
                      isLeave ? 'bg-brand-sub/30 border-brand-sub' : 'border-transparent hover:bg-gray-100'
                    } ${isToday ? 'ring-2 ring-brand-main' : ''} ${isApproved ? 'cursor-default' : ''}`}
                  >
                    {day}
                    {isLeave && (
                      <span className="block text-xs text-brand-dark mt-0.5">
                        연차{isApproved ? '(승인)' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">날짜를 클릭하면 연차로 지정/해제됩니다. 선택 후 아래 버튼으로 관리자에게 승인 요청을 보내세요.</p>
            {showLeaveRequestButton && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleLeaveRequest}
                  disabled={leaveRequestSending}
                  className="w-full py-2 px-4 rounded-lg bg-brand-main text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {leaveRequestSending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  연차 요청 ({pendingNotYetRequested.length}일)
                </button>
              </div>
            )}
            {showLeaveRequestDone && (
              <p className="mt-3 pt-3 border-t border-gray-200 text-sm text-brand-main font-medium text-center">
                연차 요청이 완료되었습니다.
              </p>
            )}
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
