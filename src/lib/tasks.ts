import {
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getTasksRef, getTaskRef, getUserNotificationsRef, getUsersRef } from './firestore-paths';
import type { Task, TaskCategory, TaskPriority } from '../types/task';
import type { TaskNotification, NotificationType } from '../types/task';

export interface CreateTaskPayload {
  assigneeId: string;
  assigneeDisplayName: string | null;
  createdBy: string;
  createdByDisplayName: string | null;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate?: number | null;
}

export async function createTask(payload: CreateTaskPayload): Promise<string> {
  const tasksRef = getTasksRef();
  const now = Date.now();
  const docRef = await addDoc(tasksRef, {
    assigneeId: payload.assigneeId,
    assigneeDisplayName: payload.assigneeDisplayName,
    createdBy: payload.createdBy,
    createdByDisplayName: payload.createdByDisplayName,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    priority: payload.priority,
    status: 'pending',
    dueDate: payload.dueDate ?? null,
    createdAt: now,
    completedAt: null,
    approvedAt: null,
    attachments: [],
  });
  return docRef.id;
}

export async function createNotification(
  userId: string,
  payload: {
    type: NotificationType;
    taskId: string;
    title: string;
    completedByDisplayName?: string;
  }
): Promise<void> {
  const ref = getUserNotificationsRef(userId);
  await addDoc(ref, {
    type: payload.type,
    taskId: payload.taskId,
    title: payload.title,
    read: false,
    createdAt: Date.now(),
    ...(payload.completedByDisplayName && {
      completedByDisplayName: payload.completedByDisplayName,
    }),
  });
}

/** 직원이 완료 제출 시: status → submitted, 관리자에게 알림 */
export async function submitTask(
  taskId: string,
  completedByDisplayName: string | null
): Promise<void> {
  const taskRef = getTaskRef(taskId);
  await updateDoc(taskRef, {
    status: 'submitted',
    completedAt: Date.now(),
  });

  const taskSnap = await getDoc(getTaskRef(taskId));
  const taskData = taskSnap.data();
  const taskTitle = (taskData?.title as string) ?? '업무';

  const usersRef = getUsersRef();
  const adminQuery = query(usersRef, where('role', '==', 'admin'));
  const snapshot = await getDocs(adminQuery);

  for (const d of snapshot.docs) {
    await createNotification(d.id, {
      type: 'task_completed',
      taskId,
      title: taskTitle,
      completedByDisplayName: completedByDisplayName ?? undefined,
    });
  }
}

/** 관리자 최종 승인: status → approved, 대시보드에서 제외 */
export async function approveTask(taskId: string): Promise<void> {
  const taskRef = getTaskRef(taskId);
  await updateDoc(taskRef, {
    status: 'approved',
    approvedAt: Date.now(),
  });
}

/** 관리자 재검토: task 내용 수정 후 status → pending, 해당 assignee에게만 알림 */
export async function requestRevision(
  taskId: string,
  updates: { description?: string; category?: TaskCategory; priority?: TaskPriority }
): Promise<void> {
  const taskRef = getTaskRef(taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const assigneeId = data.assigneeId as string;
  const taskTitle = (data.title as string) ?? '업무';

  await updateDoc(taskRef, {
    status: 'pending',
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.category !== undefined && { category: updates.category }),
    ...(updates.priority !== undefined && { priority: updates.priority }),
  });

  await createNotification(assigneeId, {
    type: 'task_revision',
    taskId,
    title: taskTitle,
  });
}

/** 관리자: task 필드 수정 (마감일, 카테고리, 업무내용, 우선순위) */
export async function updateTask(
  taskId: string,
  updates: {
    dueDate?: number | null;
    category?: TaskCategory;
    priority?: TaskPriority;
    title?: string;
    description?: string;
  }
): Promise<void> {
  const taskRef = getTaskRef(taskId);
  await updateDoc(taskRef, updates as Record<string, unknown>);
}

export async function addTaskAttachment(
  taskId: string,
  attachment: { downloadUrl: string; fileName: string; fileSize: number; fileType: string }
): Promise<void> {
  const taskRef = getTaskRef(taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const attachments = (data.attachments as Task['attachments']) ?? [];
  await updateDoc(taskRef, {
    attachments: [...attachments, attachment],
  });
}
