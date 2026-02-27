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
}
