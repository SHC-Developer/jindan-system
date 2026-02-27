/**
 * Asia/Seoul 기준 날짜·시각 유틸. 모든 사용자가 동일한 웹 시계 기준으로 사용.
 */

const TIMEZONE = 'Asia/Seoul';

/** ms → 서울 기준 "YYYY-MM-DD" */
export function toDateKeySeoul(ms: number): string {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/** 현재 시각을 서울 기준 Date 객체처럼 다루기 위한 "서울 기준 오늘" 시작/끝 ms (UTC 기준) */
export function getStartOfDaySeoul(ms: number): number {
  const s = new Date(ms).toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const d = new Date(s + 'T00:00:00+09:00');
  return d.getTime();
}

export function getEndOfDaySeoul(ms: number): number {
  const s = new Date(ms).toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const d = new Date(s + 'T23:59:59.999+09:00');
  return d.getTime();
}

/** 현재 서울 시각의 ms (클라이언트에서 "지금 서울" 표시용). 실제로는 로컬+오프셋으로 근사 */
export function nowInSeoulMs(): number {
  const now = new Date();
  const str = now.toLocaleString('en-CA', { timeZone: TIMEZONE });
  return new Date(str).getTime();
}

/** 서울 기준 해당 ms의 요일 (0=일, 1=월, ..., 6=토) */
export function getDayOfWeekSeoul(ms: number): number {
  const s = new Date(ms).toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const d = new Date(s + 'T12:00:00+09:00');
  return d.getDay();
}

/** 서울 기준 해당 날짜 09:10 (오전) 의 ms (당일 00:00 서울 + 9h 10m) */
export function getNineTenSeoul(ms: number): number {
  const s = new Date(ms).toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const d = new Date(s + 'T09:10:00+09:00');
  return d.getTime();
}

/** 서울 기준 월~금(평일) 여부 */
export function isWeekdaySeoul(ms: number): boolean {
  const day = getDayOfWeekSeoul(ms);
  return day >= 1 && day <= 5;
}

/** 서울 기준 오전 09:10 초과 출근(지각) 여부. clockInAt(ms)가 당일 09:10 이후면 true */
export function isTardySeoul(clockInAt: number): boolean {
  if (!isWeekdaySeoul(clockInAt)) return false;
  const deadline = getNineTenSeoul(clockInAt);
  return clockInAt > deadline;
}

/** 지각 시 지연 분 수 (출근 시각 - 당일 09:10) */
export function getTardinessMinutesSeoul(clockInAt: number): number {
  const deadline = getNineTenSeoul(clockInAt);
  if (clockInAt <= deadline) return 0;
  return Math.floor((clockInAt - deadline) / (60 * 1000));
}

/** 지연 분 → "N시간 N분 지각" 문자열 */
export function formatTardinessNote(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분 지각`;
  if (h > 0) return `${h}시간 지각`;
  return `${m}분 지각`;
}

/** 서울 기준 이번 주(월~일) 시작/끝 ms */
export function getWeekRangeSeoul(nowMs: number): { start: number; end: number } {
  const day = getDayOfWeekSeoul(nowMs);
  const startOfToday = getStartOfDaySeoul(nowMs);
  const daysToMonday = day === 0 ? 6 : day - 1;
  const start = startOfToday - daysToMonday * 24 * 60 * 60 * 1000;
  const end = start + 7 * 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}
