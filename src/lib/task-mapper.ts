import type { Task, TaskCategory, TaskPriority, TaskStatus } from '../types/task';

const CATEGORIES: TaskCategory[] = ['현장', '사무'];
const PRIORITIES: TaskPriority[] = ['1순위', '2순위', '3순위'];

function toCategory(v: unknown): TaskCategory {
  return CATEGORIES.includes(v as TaskCategory) ? (v as TaskCategory) : '사무';
}

function toPriority(v: unknown): TaskPriority {
  return PRIORITIES.includes(v as TaskPriority) ? (v as TaskPriority) : '2순위';
}

function toStatus(v: unknown): TaskStatus {
  if (v === 'completed') return 'submitted';
  const statuses: TaskStatus[] = ['pending', 'submitted', 'revision', 'approved'];
  return statuses.includes(v as TaskStatus) ? (v as TaskStatus) : 'pending';
}

export function dataToTask(id: string, data: Record<string, unknown>): Task {
  const attachments = (data.attachments as Task['attachments']) ?? [];
  return {
    id,
    assigneeId: (data.assigneeId as string) ?? '',
    assigneeDisplayName: (data.assigneeDisplayName as string) ?? null,
    createdBy: (data.createdBy as string) ?? '',
    createdByDisplayName: (data.createdByDisplayName as string) ?? null,
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    category: toCategory(data.category),
    priority: toPriority(data.priority),
    status: toStatus(data.status),
    dueDate: typeof data.dueDate === 'number' ? data.dueDate : null,
    createdAt: (data.createdAt as number) ?? 0,
    completedAt: (data.completedAt as number | null) ?? null,
    approvedAt: (data.approvedAt as number | null) ?? null,
    attachments,
    submissionNote: (data.submissionNote as string) ?? null,
  };
}
