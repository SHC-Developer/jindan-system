/**
 * 직원 출퇴근 액션. Callable.
 */
export declare const workLogAction: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    id: string;
} | {
    id?: undefined;
}>, unknown>;
/**
 * 매일 00:00(서울)에 실행. 당일이 평일·비공휴일이면,
 * 모든 일반 사용자(role=general)에 대해 당일을 일단 결근으로 1건 생성.
 * (연차인 사람은 제외. 이후 09:10 전 출근 → 정상/이후 출근 → 지각/연차 → 연차/미출근 → 결근으로 클라이언트에서 갱신)
 */
export declare const ensureTodayAbsentWorkLogs: import("firebase-functions/v2/scheduler").ScheduleFunction;
/**
 * 매일 18:00(서울)에 실행. 퇴근 미처리 건(approved, clockOutAt==null) 중
 * 출근일 18:00이 이미 지난 건만 해당일 18:00으로 자동 퇴근. 수동 퇴근된 건은 트랜잭션으로 덮어쓰지 않음.
 */
export declare const autoClockOutAtSix: import("firebase-functions/v2/scheduler").ScheduleFunction;
/**
 * 매일 23:00(서울)에 실행. 야근 미종료 건(overtimeStartAt 있음, overtimeEndAt==null) 중
 * 출근일 23:00이 이미 지난 건만 해당일 23:00으로 자동 종료. 수동 종료된 건은 트랜잭션으로 덮어쓰지 않음.
 */
export declare const autoEndOvertimeAtEleven: import("firebase-functions/v2/scheduler").ScheduleFunction;
