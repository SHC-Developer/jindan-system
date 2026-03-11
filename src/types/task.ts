export type TaskStatus = 'pending' | 'submitted' | 'revision' | 'approved';

export type TaskCategory = '현장' | '사무';

export type TaskPriority = '1순위' | '2순위' | '3순위';

export interface TaskAttachment {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface Task {
  id: string;
  assigneeId: string;
  assigneeDisplayName: string | null;
  createdBy: string;
  createdByDisplayName: string | null;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: number | null;
  createdAt: number;
  completedAt: number | null;
  approvedAt: number | null;
  attachments: TaskAttachment[];
  /** 직원이 완료 제출 시 작성한 업무 처리 설명 */
  submissionNote: string | null;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_revision'
  | 'worklog_clockin'
  | 'leave_approval_request'
  | 'shared_calendar_event';

export interface TaskNotification {
  id: string;
  type: NotificationType;
  taskId: string;
  title: string;
  read: boolean;
  createdAt: number;
  completedByDisplayName?: string;
  /** 출근 알림 시 출근한 직원 이름 */
  clockInByDisplayName?: string;
  /** 연차 승인 요청 시 요청한 직원 이름 */
  leaveUserDisplayName?: string;
  leaveDateKey?: string;
  /** 공유일정 등록 시 일정 제목 */
  sharedCalendarEventTitle?: string;
  /** 공유일정 등록 시 등록한 직원 이름 */
  sharedCalendarEventUserDisplayName?: string;
}
