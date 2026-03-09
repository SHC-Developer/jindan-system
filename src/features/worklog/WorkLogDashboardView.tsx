import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTodayWorkLog, useMyWorkLogs } from '../../hooks/useWorkLog';
import { useLeaveDays } from '../../hooks/useLeaveDays';
import {
  createWorkLog,
  updateWorkLogToClockIn,
  clockOutWorkLog,
  startOvertime,
  endOvertime,
  createOvertimeOnlyWorkLog,
  updateAbsentToOvertime,
} from '../../lib/worklog';
import { addLeaveRequest, removeLeaveDay, type LeaveDayType } from '../../lib/leaveDays';
import { notifyAdmins } from '../../lib/notifications';
import {
  toDateKeySeoul,
  getDayOfWeekSeoul,
  getFiveAmSeoul,
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
import { useErrorToast } from '../../hooks/useErrorToast';
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
  const [overtimeModalOpen, setOvertimeModalOpen] = useState(false);
  const [overtimeReason, setOvertimeReason] = useState('');
  const [overtimeTargetLogId, setOvertimeTargetLogId] = useState<string | null>(null);
  const [isDirectOvertime, setIsDirectOvertime] = useState(false);

  const autoClockOutProcessed = useRef(new Set<string>());
  const autoOvertimeEndProcessed = useRef(new Set<string>());

  const { addToast } = useToastContext();
  const { showError } = useErrorToast();
  const { todayLog: rawTodayLog, loading: todayLoading, error: todayError } = useTodayWorkLog(currentUser.uid, now);
  /** 본인 로그만 사용 (다른 사용자 문서가 섞여 표시되는 경우 방지) */
  const todayLog =
    rawTodayLog != null && rawTodayLog.userId === currentUser.uid ? rawTodayLog : null;
  const { workLogs, loading: listLoading, error: listError } = useMyWorkLogs(currentUser.uid);
  const { items: leaveItems, leaveDateKeys, approvedDateKeys, loading: leaveLoading } = useLeaveDays(currentUser.uid);
  const leaveItemByDateKey = useMemo(() => {
    const m = new Map<string, (typeof leaveItems)[0]>();
    leaveItems.forEach((item) => m.set(item.dateKey, item));
    return m;
  }, [leaveItems]);

  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [leaveRequestModalOpen, setLeaveRequestModalOpen] = useState(false);
  const [leaveRequestType, setLeaveRequestType] = useState<LeaveDayType>('annual');
  const [leaveRequestReason, setLeaveRequestReason] = useState('');
  const [leaveRequestSending, setLeaveRequestSending] = useState(false);
  const [pendingCancelDateKey, setPendingCancelDateKey] = useState<string | null>(null);

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
  const fiveAm = getFiveAmSeoul(now);
  const sixPm = getTodaySixSeoul(now);
  const isBetweenFiveAndSix = now >= fiveAm && now < sixPm;
  const isAfterSixPm = now >= sixPm;

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
        .catch((e) => showError('출근 처리 실패', e))
        .finally(() => setClockInLoading(false));
    } else {
      createWorkLog(currentUser.uid, currentUser.displayName, null)
        .then(onSuccess)
        .catch((e) => showError('출근 처리 실패', e))
        .finally(() => setClockInLoading(false));
    }
  }, [todayLog, clockInLoading, isTardyNow, currentUser.uid, currentUser.displayName, addToast, showError]);

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
        .catch((e) => showError('출근 처리 실패', e))
        .finally(() => setClockInLoading(false));
    } else {
      createWorkLog(currentUser.uid, currentUser.displayName, reason)
        .then(onSuccess)
        .catch((e) => showError('출근 처리 실패', e))
        .finally(() => setClockInLoading(false));
    }
  }, [tardinessReason, clockInLoading, todayLog, currentUser.uid, currentUser.displayName, addToast, showError]);

  const handleClockOut = useCallback(
    async (logId: string) => {
      if (clockOutLoading) return;
      setClockOutLoading(logId);
      try {
        await clockOutWorkLog(logId);
      } catch (err) {
        showError('퇴근 처리 실패', err);
      } finally {
        setClockOutLoading(null);
      }
    },
    [clockOutLoading, showError]
  );

  const statusText = todayLog && todayLog.status !== 'absent' ? '정상 근무' : null;

  const showClockInButton =
    !isLeaveToday && (!todayLog || todayLog.status === 'absent') && !clockInLoading && isBetweenFiveAndSix;
  const showDirectOvertimeButton =
    !isLeaveToday &&
    isAfterSixPm &&
    (!todayLog || todayLog.status === 'absent') &&
    !overtimeLoading;
  const canClockOut =
    todayLog != null &&
    todayLog.status !== 'absent' &&
    todayLog.clockOutAt == null;

  const regularMs =
    todayLog?.status === 'absent' || todayLog == null
      ? 0
      : todayLog.clockInAt != null && todayLog.clockOutAt != null
        ? Math.max(0, todayLog.clockOutAt - todayLog.clockInAt)
        : todayLog.clockInAt != null
          ? Math.max(0, now - todayLog.clockInAt)
          : 0;
  const overtimeMs =
    todayLog?.overtimeStartAt != null
      ? todayLog.overtimeEndAt != null
        ? todayLog.overtimeEndAt - todayLog.overtimeStartAt
        : now - todayLog.overtimeStartAt
      : 0;
  const todayWorkMs = regularMs + overtimeMs;

  // 실시간: 오늘 로그(출근 처리된 것만)에 대해 18:10 지나면 자동 퇴근 (18:10 이후 출근 건은 제외)
  useEffect(() => {
    if (!todayLog || todayLog.status !== 'approved' || todayLog.clockOutAt != null) return;
    const sixTen = getTodaySixTenSeoul(now);
    if (todayLog.clockInAt >= sixTen) return;
    if (now >= sixTen) {
      clockOutWorkLog(todayLog.id, sixTen).catch(console.error);
    }
  }, [todayLog?.id, todayLog?.status, todayLog?.clockOutAt, todayLog?.clockInAt, now]);

  // 보정: 퇴근 미처리 건 중 출근일 기준 18:10이 이미 지난 건 모두 18:10으로 자동 퇴근 (18:10 이후 출근 건은 제외)
  useEffect(() => {
    const toFix = workLogs.filter(
      (log) =>
        log.clockOutAt == null &&
        log.status === 'approved' &&
        log.clockInAt < getTodaySixTenSeoul(log.clockInAt) &&
        now >= getTodaySixTenSeoul(log.clockInAt) &&
        !autoClockOutProcessed.current.has(log.id)
    );
    toFix.forEach((log) => {
      autoClockOutProcessed.current.add(log.id);
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
        now >= getTodayElevenPmSeoul(log.clockInAt) &&
        !autoOvertimeEndProcessed.current.has(log.id)
    );
    toFix.forEach((log) => {
      autoOvertimeEndProcessed.current.add(log.id);
      endOvertime(log.id, getTodayElevenPmSeoul(log.clockInAt)).catch(console.error);
    });
  }, [workLogs, now]);

  const handleOvertimeSubmit = useCallback(async () => {
    const reason = overtimeReason.trim();
    if (!reason || overtimeLoading) return;

    if (isDirectOvertime) {
      setOvertimeLoading('direct');
      try {
        if (todayLog?.status === 'absent') {
          await updateAbsentToOvertime(todayLog.id, reason, currentUser.uid);
        } else {
          await createOvertimeOnlyWorkLog(currentUser.uid, currentUser.displayName, reason);
        }
        setOvertimeModalOpen(false);
        setOvertimeReason('');
        setOvertimeTargetLogId(null);
        setIsDirectOvertime(false);
        addToast({
          title: '야근 시작',
          message: '야근이 시작되었습니다. 야근 종료 시 버튼을 눌러 주세요.',
        });
      } catch (err) {
        showError('야근 시작 실패', err);
      } finally {
        setOvertimeLoading(null);
      }
      return;
    }

    if (!overtimeTargetLogId) return;
    setOvertimeLoading(overtimeTargetLogId);
    try {
      await startOvertime(overtimeTargetLogId, reason);
      setOvertimeModalOpen(false);
      setOvertimeReason('');
      setOvertimeTargetLogId(null);
      addToast({
        title: '야근 시작',
        message: '야근이 시작되었습니다. 야근 종료 시 버튼을 눌러 주세요.',
      });
    } catch (err) {
      showError('야근 시작 실패', err);
    } finally {
      setOvertimeLoading(null);
    }
  }, [overtimeTargetLogId, overtimeReason, overtimeLoading, isDirectOvertime, todayLog, currentUser.uid, currentUser.displayName, addToast, showError]);

  const handleOpenOvertimeModal = useCallback((logId: string) => {
    setOvertimeTargetLogId(logId);
    setOvertimeReason('');
    setIsDirectOvertime(false);
    setOvertimeModalOpen(true);
  }, []);

  const handleOpenDirectOvertimeModal = useCallback(() => {
    setOvertimeTargetLogId(null);
    setOvertimeReason('');
    setIsDirectOvertime(true);
    setOvertimeModalOpen(true);
  }, []);

  const handleEndOvertime = useCallback(
    async (logId: string) => {
      if (overtimeLoading) return;
      setOvertimeLoading(logId);
      try {
        await endOvertime(logId);
      } catch (err) {
        showError('야근 종료 실패', err);
      } finally {
        setOvertimeLoading(null);
      }
    },
    [overtimeLoading, showError]
  );

  const weekTotalMs = workLogs
    .filter(
      (log) =>
        log.status === 'approved' &&
        log.clockOutAt != null &&
        log.clockInAt >= weekStart &&
        log.clockInAt <= weekEnd
    )
    .reduce((sum, log) => {
      const reg = Math.max(0, log.clockOutAt! - log.clockInAt);
      const ot =
        log.overtimeStartAt != null && log.overtimeEndAt != null
          ? log.overtimeEndAt - log.overtimeStartAt
          : 0;
      return sum + reg + ot;
    }, 0);
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

  const handleCalendarDateClick = useCallback(
    (dateKey: string) => {
      if (approvedDateKeys.has(dateKey)) return;
      if (leaveDateKeys.has(dateKey)) {
        setPendingCancelDateKey(dateKey);
        return;
      }
      setSelectedDates((prev) => {
        const next = new Set(prev);
        if (next.has(dateKey)) next.delete(dateKey);
        else next.add(dateKey);
        return next;
      });
    },
    [leaveDateKeys, approvedDateKeys]
  );

  const handleLeaveRequestSubmit = useCallback(async () => {
    const reason = leaveRequestReason.trim();
    if (selectedDates.size === 0 || !reason || leaveRequestSending) return;
    setLeaveRequestSending(true);
    try {
      const dateKeys = [...selectedDates].sort();
      for (const dateKey of dateKeys) {
        await addLeaveRequest(currentUser.uid, dateKey, leaveRequestType, reason);
      }
      const dateLabel =
        dateKeys.length <= 3
          ? dateKeys.map((k) => k.slice(5).replace('-', '/')).join(', ')
          : `${dateKeys[0].slice(5).replace('-', '/')} 외 ${dateKeys.length - 1}건`;
      await notifyAdmins({
        type: 'leave_approval_request',
        title: `연차 승인 요청 (${dateLabel})`,
        leaveUserDisplayName: currentUser.displayName ?? undefined,
        leaveDateKey: dateKeys.join(','),
      });
      setSelectedDates(new Set());
      setLeaveRequestModalOpen(false);
      setLeaveRequestReason('');
      addToast({ title: '연차 신청 완료', message: '관리자 승인 후 반영됩니다.' });
    } catch (err) {
      showError('연차 신청 실패', err);
    } finally {
      setLeaveRequestSending(false);
    }
  }, [selectedDates, leaveRequestType, leaveRequestReason, leaveRequestSending, currentUser.uid, currentUser.displayName, addToast, showError]);

  const handleConfirmCancelLeave = useCallback(() => {
    if (!pendingCancelDateKey) return;
    removeLeaveDay(currentUser.uid, pendingCancelDateKey).catch((e) => showError('연차 신청 취소 실패', e));
    setPendingCancelDateKey(null);
  }, [pendingCancelDateKey, currentUser.uid, showError]);

  const showLeaveRequestButton = selectedDates.size >= 1;

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
      <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 md:gap-6 items-start">
          <div className="bg-white border border-gray-200 rounded-xl p-3 md:p-6 shadow-sm">
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
              {showDirectOvertimeButton && (
                <button
                  type="button"
                  onClick={handleOpenDirectOvertimeModal}
                  disabled={!!overtimeLoading}
                  className="w-full py-3 px-4 rounded-lg border border-brand-main text-brand-main font-medium hover:bg-brand-main/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {overtimeLoading === 'direct' ? <Loader2 size={18} className="animate-spin" /> : <Clock size={18} />}
                  야근 시작
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
                      onClick={() => handleOpenOvertimeModal(todayLog.id)}
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
              {showDirectOvertimeButton && '18시 이후입니다. 야근 시작 버튼을 눌러 업무를 시작하세요.'}
              {canClockOut && '퇴근 버튼을 눌러 업무를 마무리하세요.'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3 md:p-5 shadow-sm min-w-0 md:min-w-[200px]">
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
                  {formatDurationMs(todayWorkMs)}
                </p>
                {!todayLog.clockOutAt && (
                  <p className="text-xs text-brand-sub mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-sub" />
                    근무 중
                  </p>
                )}
                {todayLog.clockOutAt && todayLog.overtimeStartAt != null && todayLog.overtimeEndAt == null && (
                  <p className="text-xs text-brand-sub mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-sub" />
                    야근 중
                  </p>
                )}
                {todayLog.clockOutAt && todayLog.overtimeEndAt != null && (
                  <p className="text-xs text-gray-500 mt-1">야근 종료</p>
                )}
                {todayLog.clockOutAt && todayLog.overtimeStartAt == null && (
                  <p className="text-xs text-gray-500 mt-1">퇴근 완료</p>
                )}
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
                const item = leaveItemByDateKey.get(dateKey);
                const isLeave = leaveDateKeys.has(dateKey);
                const isApproved = approvedDateKeys.has(dateKey);
                const isSelected = selectedDates.has(dateKey);
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
                const typeLabel =
                  item?.type === 'morning_half'
                    ? '오전반차'
                    : item?.type === 'afternoon_half'
                      ? '오후반차'
                      : '연차';
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => handleCalendarDateClick(dateKey)}
                    className={`py-2 rounded border transition-colors ${dayColor} ${
                      isLeave ? 'bg-brand-sub/30 border-brand-sub' : 'border-transparent hover:bg-gray-100'
                    } ${isSelected ? 'ring-2 ring-dashed ring-brand-main' : ''} ${isToday ? 'ring-2 ring-brand-main' : ''} ${isApproved ? 'cursor-default' : ''}`}
                  >
                    {day}
                    {isLeave && (
                      <span className="block text-xs text-brand-dark mt-0.5">
                        {typeLabel}{isApproved ? '(승인)' : '(대기)'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              날짜를 선택한 뒤 연차/반차 신청 버튼을 눌러 유형과 사유를 입력해 제출하세요. 대기 중인 연차는 다시 클릭하면 취소할 수 있습니다.
            </p>
            {showLeaveRequestButton && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setLeaveRequestModalOpen(true)}
                  className="w-full py-2 px-4 rounded-lg bg-brand-main text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  연차/반차 신청 ({selectedDates.size}일)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 지각 사유 모달 */}
      {tardinessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
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

      {/* 야근 사유 모달 */}
      {overtimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-brand-dark mb-2">야근 사유를 상세히 기술해주세요</h3>
            <p className="text-sm text-gray-600 mb-4">18시 이후 야근을 시작할 때 사유를 입력한 뒤 제출해 주세요.</p>
            <textarea
              value={overtimeReason}
              onChange={(e) => setOvertimeReason(e.target.value)}
              placeholder="야근 사유 입력"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px] resize-y"
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setOvertimeModalOpen(false);
                  setOvertimeReason('');
                  setOvertimeTargetLogId(null);
                  setIsDirectOvertime(false);
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <X size={16} /> 취소
              </button>
              <button
                type="button"
                onClick={handleOvertimeSubmit}
                disabled={!overtimeReason.trim() || !!overtimeLoading}
                className="flex-1 py-2 px-4 rounded-lg bg-brand-main text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {overtimeLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Clock size={16} />
                )}
                제출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 연차/반차 신청 모달 */}
      {leaveRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-brand-dark mb-2">연차/반차 신청</h3>
            <p className="text-sm text-gray-600 mb-2">
              선택한 날짜: {[...selectedDates].sort().map((k) => k.slice(5).replace('-', '/')).join(', ')}
            </p>
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-2">유형</p>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="leaveType"
                    checked={leaveRequestType === 'annual'}
                    onChange={() => setLeaveRequestType('annual')}
                    className="text-brand-main"
                  />
                  <span className="text-sm">연차 (1일)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="leaveType"
                    checked={leaveRequestType === 'morning_half'}
                    onChange={() => setLeaveRequestType('morning_half')}
                    className="text-brand-main"
                  />
                  <span className="text-sm">오전반차 (0.5일)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="leaveType"
                    checked={leaveRequestType === 'afternoon_half'}
                    onChange={() => setLeaveRequestType('afternoon_half')}
                    className="text-brand-main"
                  />
                  <span className="text-sm">오후반차 (0.5일)</span>
                </label>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">사유 (필수)</p>
              <textarea
                value={leaveRequestReason}
                onChange={(e) => setLeaveRequestReason(e.target.value)}
                placeholder="연차/반차 사유를 간단히 작성해주세요."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px] resize-y"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLeaveRequestModalOpen(false);
                  setLeaveRequestReason('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <X size={16} /> 취소
              </button>
              <button
                type="button"
                onClick={handleLeaveRequestSubmit}
                disabled={!leaveRequestReason.trim() || leaveRequestSending}
                className="flex-1 py-2 px-4 rounded-lg bg-brand-main text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {leaveRequestSending ? <Loader2 size={16} className="animate-spin" /> : null}
                제출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 연차 신청 취소 확인 모달 */}
      {pendingCancelDateKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-brand-dark mb-2">연차 신청 취소</h3>
            <p className="text-sm text-gray-600 mb-4">
              {pendingCancelDateKey.slice(5).replace('-', '/')} 연차 신청을 취소하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingCancelDateKey(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                아니오
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelLeave}
                className="flex-1 py-2 px-4 rounded-lg bg-brand-main text-white font-medium hover:opacity-90"
              >
                예, 취소합니다
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
