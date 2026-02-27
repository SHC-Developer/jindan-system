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
}
