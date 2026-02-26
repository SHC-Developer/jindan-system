export type TaskStatus = 'pending' | 'completed';

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
  priority: string;
  status: TaskStatus;
  createdAt: number;
  completedAt: number | null;
  attachments: TaskAttachment[];
}

export type NotificationType = 'task_assigned' | 'task_completed';

export interface TaskNotification {
  id: string;
  type: NotificationType;
  taskId: string;
  title: string;
  read: boolean;
  createdAt: number;
  completedByDisplayName?: string;
}
