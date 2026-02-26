import {
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { getTasksRef, getTaskRef, getUserNotificationsRef, getUsersRef } from './firestore-paths';
import { deleteTaskFileByUrl, deleteTaskStorageFilesExcept } from './storage';
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

/** 직원이 완료 제출 시: status → submitted, submissionNote 저장, 관리자에게 알림 */
export async function submitTask(
  taskId: string,
  completedByDisplayName: string | null,
  submissionNote?: string | null
): Promise<void> {
  const taskRef = getTaskRef(taskId);
  await updateDoc(taskRef, {
    status: 'submitted',
    completedAt: Date.now(),
    ...(submissionNote !== undefined && { submissionNote: submissionNote == null ? null : (typeof submissionNote === 'string' ? submissionNote.trim() || null : null) }),
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

/** 관리자 최종 승인: status → approved, 대시보드에서 제외. 승인 시점의 첨부만 Storage에 남기고 나머지 삭제 */
export async function approveTask(taskId: string): Promise<void> {
  const taskRef = getTaskRef(taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const attachments = (data.attachments as Task['attachments']) ?? [];
  const approvedUrls = attachments.map((a) => a.downloadUrl).filter(Boolean);
  try {
    await deleteTaskStorageFilesExcept(taskId, approvedUrls);
  } catch {
    // Storage 정리 실패해도 승인은 진행(승인 시점 첨부는 Firestore에 있음)
  }
  await updateDoc(taskRef, {
    status: 'approved',
    approvedAt: Date.now(),
  });
}

/** 관리자 재검토: task 내용 수정 후 status → pending, 해당 assignee에게만 알림 */
export async function requestRevision(
  taskId: string,
  updates: { title?: string; description?: string; category?: TaskCategory; priority?: TaskPriority }
): Promise<void> {
  const taskRef = getTaskRef(taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const assigneeId = data.assigneeId as string;
  const taskTitle = (updates.title !== undefined && updates.title.trim() !== '' ? updates.title.trim() : (data.title as string)) ?? '업무';

  await updateDoc(taskRef, {
    status: 'pending',
    ...(updates.title !== undefined && updates.title.trim() !== '' && { title: updates.title.trim() }),
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

/** 업무 삭제 (관리자·지시자만). 삭제 시 일반 사용자 목록에서도 제거됨 */
export async function deleteTask(taskId: string): Promise<void> {
  const taskRef = getTaskRef(taskId);
  await deleteDoc(taskRef);
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

/** 업무 첨부파일 1건 제거 (인덱스 기준). Firestore 참조 삭제 + Firebase Storage에서 파일 삭제 */
export async function removeTaskAttachment(taskId: string, index: number): Promise<void> {
  const taskRef = getTaskRef(taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const attachments = (data.attachments as Task['attachments']) ?? [];
  if (index < 0 || index >= attachments.length) return;
  const removed = attachments[index];
  const next = attachments.filter((_, i) => i !== index);
  if (removed?.downloadUrl) {
    try {
      await deleteTaskFileByUrl(removed.downloadUrl);
    } catch {
      // Storage 삭제 실패(권한/파일 없음/URL 형식 등) 시에도 Firestore에서는 제거해 UI 일관성 유지
    }
  }
  await updateDoc(taskRef, { attachments: next });
}
