export type WorkLogStatus = 'pending' | 'approved' | 'rejected';

export interface WorkLogEntry {
  id: string;
  userId: string;
  userDisplayName: string | null;
  clockInAt: number;
  clockOutAt: number | null;
  status: WorkLogStatus;
  approvedBy: string | null;
  approvedAt: number | null;
  /** 지각 시 사용자가 입력한 사유 */
  tardinessReason: string | null;
  /** 야근 시작 시각 (ms). 퇴근 후 야근 시작 시 설정 */
  overtimeStartAt: number | null;
  /** 야근 종료 시각 (ms). 야근 종료 버튼 또는 다음날 06:00 자동 종료 시 설정 */
  overtimeEndAt: number | null;
}
