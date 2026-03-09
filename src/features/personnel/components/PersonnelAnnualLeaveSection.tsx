import React from 'react';
import {
  calcGrantedAnnualLeave,
  getAnnualLeavePeriodStart,
  getAnnualLeavePeriodEnd,
  calcUsedLeaveDays,
} from '../../../lib/annual-leave-calc';
import type { LeaveDayItem } from '../../../lib/leaveDays';

interface PersonnelAnnualLeaveSectionProps {
  hireDate: string;
  leaveItems: LeaveDayItem[];
}

/** 7. 연차일수 (읽기 전용). 입사일 + 승인된 연차로 자동 산정. */
export function PersonnelAnnualLeaveSection({ hireDate, leaveItems }: PersonnelAnnualLeaveSectionProps) {
  const now = new Date();
  const periodStart = getAnnualLeavePeriodStart(hireDate, now);
  const periodEnd = periodStart ? getAnnualLeavePeriodEnd(periodStart) : null;
  const granted = hireDate ? calcGrantedAnnualLeave(hireDate, now) : 0;
  const used = periodStart && periodEnd ? calcUsedLeaveDays(leaveItems, periodStart, periodEnd) : 0;
  const remaining = Math.max(0, granted - used);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-brand-dark mb-4">7. 연차일수</h3>
      <p className="text-xs text-gray-500 mb-4">
        근로기준법 제60조(연차 유급휴가)에 따라 입사일을 기준으로 부여 연차일수가 자동 산정됩니다. 직원이 연차 캘린더에서 승인받은 사용일수만큼 반영됩니다.
      </p>
      {!hireDate || hireDate.length < 10 ? (
        <p className="text-sm text-amber-700">채용 정보에서 입사일을 입력하면 부여 연차일수가 자동 산정됩니다.</p>
      ) : (
        <div className="grid gap-3 md:gap-4 sm:grid-cols-3">
          <div className="bg-brand-light/30 rounded-lg p-3 md:p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">부여 연차일수</p>
            <p className="text-2xl font-semibold text-brand-dark">{granted}일</p>
          </div>
          <div className="bg-brand-light/30 rounded-lg p-3 md:p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">사용일수</p>
            <p className="text-2xl font-semibold text-brand-dark">{used}일</p>
          </div>
          <div className="bg-brand-light/30 rounded-lg p-3 md:p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">잔여일수</p>
            <p className="text-2xl font-semibold text-brand-main">{remaining}일</p>
          </div>
        </div>
      )}
      {periodStart && periodEnd && (
        <p className="text-xs text-gray-500 mt-3">
          현재 연차 기간: {periodStart} ~ {periodEnd}
        </p>
      )}
    </section>
  );
}
