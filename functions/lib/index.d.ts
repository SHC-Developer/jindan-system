/**
 * 매일 00:00(서울)에 실행. 당일이 평일·비공휴일이면,
 * 모든 일반 사용자(role=general)에 대해 당일을 일단 결근으로 1건 생성.
 * (연차인 사람은 제외. 이후 09:10 전 출근 → 정상/이후 출근 → 지각/연차 → 연차/미출근 → 결근으로 클라이언트에서 갱신)
 */
export declare const ensureTodayAbsentWorkLogs: import("firebase-functions/v2/scheduler").ScheduleFunction;
