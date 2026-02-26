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
}

export type NotificationType = 'task_assigned' | 'task_completed' | 'task_revision';

export interface TaskNotification {
  id: string;
  type: NotificationType;
  taskId: string;
  title: string;
  read: boolean;
  createdAt: number;
  completedByDisplayName?: string;
}
