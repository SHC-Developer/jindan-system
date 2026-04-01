/** 일정 카테고리 (색상 매핑용) */
export type SharedCalendarCategory =
  | 'meeting'      // 회의 - 파랑
  | 'field'        // 현장 - 초록
  | 'education'    // 교육 - 보라
  | 'personal_leave'; // 개인 연차/반차 - 노랑

/** 반복 규칙 (none 이면 단일 일정) */
export type SharedCalendarRepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

/** 매월 반복 세부: 같은 일(앵커 일자) / 매월 첫 금요일 */
export type SharedCalendarMonthlyPattern = 'day_of_month' | 'first_friday';

/** 매년 반복: 같은 월·일 / 해당 월 첫 금요일 */
export type SharedCalendarYearlyPattern = 'same_date' | 'first_friday_of_month';

/** 공유일정 캘린더 일정 문서 (Firestore sharedCalendarEvents) */
export interface SharedCalendarEvent {
  id: string;
  title: string;
  /** @deprecated startDateKey 사용. 하위 호환용 */
  dateKey: string;
  /** 기간 일정 시작일 (YYYY-MM-DD). 없으면 dateKey 사용 */
  startDateKey?: string;
  /** 기간 일정 종료일 (YYYY-MM-DD). 없으면 dateKey 사용 */
  endDateKey?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
  category?: SharedCalendarCategory;
  createdBy: string;
  createdByName?: string;
  createdAt: number;
  updatedAt?: number;
  /** 연차 승인으로 자동 등록된 경우: users/{userId}/leaveDays/{dateKey} 참조용 */
  sourceLeaveUserId?: string;
  sourceLeaveDateKey?: string;
  /** 동일 반복 시리즈 묶음 ID (클라이언트 생성 UUID) */
  recurrenceSeriesId?: string;
  repeatFrequency?: SharedCalendarRepeatFrequency;
  monthlyPattern?: SharedCalendarMonthlyPattern;
  yearlyPattern?: SharedCalendarYearlyPattern;
}

/** 일정 등록/수정 시 서버에 보낼 페이로드 (id 제외, createdBy 등 서버/클라이언트에서 채움) */
export interface SharedCalendarEventInput {
  title: string;
  dateKey: string;
  startDateKey?: string;
  endDateKey?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
  category?: SharedCalendarCategory;
}

/** 카테고리별 배지 배경색 (Tailwind) */
export const CATEGORY_COLORS: Record<SharedCalendarCategory, string> = {
  meeting: 'bg-blue-500/30 text-blue-900',
  field: 'bg-green-500/30 text-green-900',
  education: 'bg-purple-500/30 text-purple-900',
  personal_leave: 'bg-yellow-500/30 text-yellow-900',
};
