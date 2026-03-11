/** 일정 카테고리 (색상 매핑용) */
export type SharedCalendarCategory =
  | 'meeting'      // 회의 - 파랑
  | 'field'        // 현장 - 초록
  | 'education'    // 교육 - 보라
  | 'personal_leave'; // 개인 연차/반차 - 노랑

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
