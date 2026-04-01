import { getDayOfWeekSeoul } from './datetime-seoul';
import type {
  SharedCalendarRepeatFrequency,
  SharedCalendarMonthlyPattern,
  SharedCalendarYearlyPattern,
} from '../types/shared-calendar';

export interface RecurrenceExpansionInput {
  startDateKey: string;
  endDateKey: string;
  repeatFrequency: SharedCalendarRepeatFrequency;
  monthlyPattern?: SharedCalendarMonthlyPattern;
  yearlyPattern?: SharedCalendarYearlyPattern;
}

export interface OccurrenceRange {
  startDateKey: string;
  endDateKey: string;
}

const TIMEZONE = 'Asia/Seoul';
const DEFAULT_HORIZON_MONTHS = 24;
const MAX_OCCURRENCES = 400;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateKey.split('-').map(Number);
  return { y, m, d };
}

export function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function dateKeyFromYmd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** 앵커 날짜 기준으로 horizonMonths 뒤까지의 dateKey(서울) */
export function addMonthsToDateKeyHorizon(dateKey: string, months: number): string {
  const { y, m, d } = parseDateKey(dateKey);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const dim = daysInMonth(ny, nm);
  const nd = Math.min(d, dim);
  return dateKeyFromYmd(ny, nm, nd);
}

/** 서울 달력 기준 일 수 더하기 */
export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const ms = new Date(dateKey + 'T12:00:00+09:00').getTime() + deltaDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/** 해당 연·월의 첫 번째 금요일(5) dateKey */
export function firstFridayOfMonthSeoul(y: number, m: number): string {
  const dim = daysInMonth(y, m);
  for (let d = 1; d <= dim; d++) {
    const key = dateKeyFromYmd(y, m, d);
    const dow = getDayOfWeekSeoul(new Date(key + 'T12:00:00+09:00').getTime());
    if (dow === 5) return key;
  }
  return dateKeyFromYmd(y, m, 1);
}

function clampDayInMonth(y: number, m: number, day: number): number {
  return Math.min(day, daysInMonth(y, m));
}

/**
 * 반복 규칙에 따라 최대 about 2년(기본)치 occurrence 시작·종료일 쌍 생성.
 * 종료일은 시작일로부터 (초기 기간 일수 - 1)일 더한 날과 동일 규칙.
 */
export function expandRecurrenceOccurrences(
  input: RecurrenceExpansionInput,
  horizonMonths: number = DEFAULT_HORIZON_MONTHS
): OccurrenceRange[] {
  const { startDateKey, endDateKey, repeatFrequency } = input;
  const startMs = new Date(startDateKey + 'T12:00:00+09:00').getTime();
  const endMs = new Date(endDateKey + 'T12:00:00+09:00').getTime();
  const spanDays = Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
  if (spanDays < 1) return [];

  const anchor = parseDateKey(startDateKey);
  const endHorizonKey = addMonthsToDateKeyHorizon(startDateKey, horizonMonths);

  const ranges: OccurrenceRange[] = [];

  const pushOccurrence = (occStart: string): boolean => {
    if (ranges.length >= MAX_OCCURRENCES) return false;
    if (compareDateKeys(occStart, endHorizonKey) > 0) return false;
    const occEnd = addDaysToDateKey(occStart, spanDays - 1);
    ranges.push({ startDateKey: occStart, endDateKey: occEnd });
    return true;
  };

  if (repeatFrequency === 'none') {
    return [{ startDateKey, endDateKey }];
  }

  if (repeatFrequency === 'daily') {
    let cur = startDateKey;
    while (compareDateKeys(cur, endHorizonKey) <= 0 && ranges.length < MAX_OCCURRENCES) {
      ranges.push({
        startDateKey: cur,
        endDateKey: addDaysToDateKey(cur, spanDays - 1),
      });
      cur = addDaysToDateKey(cur, 1);
    }
    return ranges;
  }

  if (repeatFrequency === 'weekly') {
    let cur = startDateKey;
    while (compareDateKeys(cur, endHorizonKey) <= 0 && ranges.length < MAX_OCCURRENCES) {
      ranges.push({
        startDateKey: cur,
        endDateKey: addDaysToDateKey(cur, spanDays - 1),
      });
      cur = addDaysToDateKey(cur, 7);
    }
    return ranges;
  }

  if (repeatFrequency === 'monthly') {
    const mode = input.monthlyPattern ?? 'day_of_month';
    let y = anchor.y;
    let mo = anchor.m;
    let guard = 0;
    while (guard++ < 600 && ranges.length < MAX_OCCURRENCES) {
      let occStart: string;
      if (mode === 'day_of_month') {
        const d = clampDayInMonth(y, mo, anchor.d);
        occStart = dateKeyFromYmd(y, mo, d);
      } else {
        occStart = firstFridayOfMonthSeoul(y, mo);
      }
      if (compareDateKeys(occStart, startDateKey) >= 0) {
        if (!pushOccurrence(occStart)) break;
      }
      mo += 1;
      if (mo > 12) {
        mo = 1;
        y += 1;
      }
      const probe = dateKeyFromYmd(y, mo, 1);
      if (compareDateKeys(probe, endHorizonKey) > 0) break;
    }
    return ranges;
  }

  if (repeatFrequency === 'yearly') {
    const mode = input.yearlyPattern ?? 'same_date';
    let y = anchor.y;
    let guard = 0;
    while (guard++ < 80 && ranges.length < MAX_OCCURRENCES) {
      let occStart: string;
      if (mode === 'same_date') {
        const d = clampDayInMonth(y, anchor.m, anchor.d);
        occStart = dateKeyFromYmd(y, anchor.m, d);
      } else {
        occStart = firstFridayOfMonthSeoul(y, anchor.m);
      }
      if (compareDateKeys(occStart, startDateKey) >= 0) {
        if (!pushOccurrence(occStart)) break;
      }
      y += 1;
      const probe = dateKeyFromYmd(y, 1, 1);
      if (compareDateKeys(probe, endHorizonKey) > 0) break;
    }
    return ranges;
  }

  return [{ startDateKey, endDateKey }];
}

interface RecurrenceSummaryInput {
  repeatFrequency?: SharedCalendarRepeatFrequency | null;
  monthlyPattern?: SharedCalendarMonthlyPattern | null;
  yearlyPattern?: SharedCalendarYearlyPattern | null;
  startDateKey?: string;
  dateKey?: string;
}

/** 상세 모달 등에 표시할 반복 설명 (단일 일정이면 null) */
export function formatRecurrenceSummary(ev: RecurrenceSummaryInput): string | null {
  const f = ev.repeatFrequency;
  if (!f || f === 'none') return null;
  if (f === 'daily') return '1일마다 반복';
  if (f === 'weekly') return '1주마다 반복';
  if (f === 'monthly') {
    return ev.monthlyPattern === 'first_friday'
      ? '1개월마다 반복 (매월 첫 번째 금요일)'
      : '1개월마다 반복 (매월 같은 날짜)';
  }
  if (f === 'yearly') {
    const sk = ev.startDateKey ?? ev.dateKey ?? '';
    const parts = sk.split('-');
    const monthNum = parts.length >= 2 ? Number(parts[1]) : NaN;
    const monthLabel = Number.isFinite(monthNum) ? `${monthNum}월` : '해당 월';
    return ev.yearlyPattern === 'first_friday_of_month'
      ? `1년마다 반복 (${monthLabel} 첫 번째 금요일)`
      : '1년마다 반복 (같은 월·일)';
  }
  return null;
}
