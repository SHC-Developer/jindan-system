/**
 * 근로기준법 제60조(연차 유급휴가) 기반 부여 연차일수 산정.
 * hireDate: YYYY-MM-DD, referenceDate: 기준일 (보통 오늘).
 */

export function calcGrantedAnnualLeave(hireDate: string, referenceDate: Date): number {
  if (!hireDate || hireDate.length < 10) return 0;
  const hire = new Date(hireDate + 'T12:00:00+09:00');
  const ref = new Date(referenceDate);
  if (Number.isNaN(hire.getTime()) || hire > ref) return 0;

  const refYear = ref.getFullYear();
  const refMonth = ref.getMonth();
  const refDay = ref.getDate();
  const hireYear = hire.getFullYear();
  const hireMonth = hire.getMonth();
  const hireDay = hire.getDate();

  const fullYears = refYear - hireYear;
  const monthDiff = refMonth - hireMonth;
  const dayDiff = refDay - hireDay;
  const reachedOneYear = fullYears > 0 || (fullYears === 0 && (monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0)));

  if (!reachedOneYear) {
    const monthsWorked = refYear * 12 + refMonth - (hireYear * 12 + hireMonth);
    if (dayDiff < 0 && monthsWorked > 0) return Math.min(11, monthsWorked);
    const totalMonths = monthsWorked + (dayDiff >= 0 ? 1 : 0);
    return Math.min(11, Math.max(0, totalMonths));
  }

  const tenureYears = refYear - hireYear;
  const additionalDays = Math.floor((tenureYears - 1) / 2);
  return Math.min(25, 15 + additionalDays);
}

/**
 * 연차 기간: 입사일 기준 1년 단위. 예: 2020-03-02 입사 → 2020.03.02~2021.03.01, 2021.03.02~2022.03.01 ...
 * referenceDate가 속한 연차 기간의 시작일(YYYY-MM-DD) 반환.
 */
export function getAnnualLeavePeriodStart(hireDate: string, referenceDate: Date): string | null {
  if (!hireDate || hireDate.length < 10) return null;
  const hire = new Date(hireDate + 'T12:00:00+09:00');
  const ref = new Date(referenceDate);
  if (Number.isNaN(hire.getTime()) || hire > ref) return null;

  const refTime = ref.getTime();
  let periodStart = new Date(hire);
  while (periodStart.getTime() <= refTime) {
    const next = new Date(periodStart);
    next.setFullYear(next.getFullYear() + 1);
    if (next.getTime() > refTime) break;
    periodStart = next;
  }
  const y = periodStart.getFullYear();
  const m = String(periodStart.getMonth() + 1).padStart(2, '0');
  const d = String(periodStart.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 연차 기간 종료일 (시작일 + 1년 - 1일).
 */
export function getAnnualLeavePeriodEnd(periodStart: string): string {
  const start = new Date(periodStart + 'T12:00:00+09:00');
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** approved 연차 항목 중 dateKey가 periodStart ~ periodEnd 사이인 건의 deductDays 합계. */
export function calcUsedLeaveDays(
  leaveItems: { dateKey: string; status: string; deductDays: number }[],
  periodStart: string,
  periodEnd: string
): number {
  return leaveItems
    .filter((item) => item.status === 'approved' && item.dateKey >= periodStart && item.dateKey <= periodEnd)
    .reduce((sum, item) => sum + item.deductDays, 0);
}
