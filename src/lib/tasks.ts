import {
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getTasksRef, getTaskRef, getUserNotificationsRef, getUsersRef } from './firestore-paths';
import type { Task, TaskNotification, NotificationType } from '../types/task';

export interface CreateTaskPayload {
  assigneeId: string;
  assigneeDisplayName: string | null;
  createdBy: string;
  createdByDisplayName: string | null;
  title: string;
  description: string;
  priority: string;
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
    priority: payload.priority,
    status: 'pending',
    createdAt: now,
    completedAt: null,
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

export async function completeTask(
  taskId: string,
  completedByDisplayName: string | null
): Promise<void> {
  const taskRef = getTaskRef(taskId);
  await updateDoc(taskRef, {
    status: 'completed',
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
