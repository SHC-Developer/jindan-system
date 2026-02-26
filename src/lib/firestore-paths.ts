import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import type { ChatMessagePayload } from '../types/chat';
import { getDbInstance, USERS_COLLECTION } from './firebase';

const PROJECTS = 'projects';
const SUBMENUS = 'subMenus';
const MESSAGES = 'messages';

/** projects 컬렉션 참조 */
export function getProjectsRef(): CollectionReference {
  return collection(getDbInstance(), PROJECTS);
}

/** projects/{projectId} 문서 참조 */
export function getProjectRef(projectId: string): DocumentReference {
  return doc(getDbInstance(), PROJECTS, projectId);
}

/** projects/{projectId}/subMenus 서브컬렉션 참조 */
export function getSubMenusRef(projectId: string): CollectionReference {
  return collection(getDbInstance(), PROJECTS, projectId, SUBMENUS);
}

/** projects/{projectId}/subMenus/{subMenuId} 문서 참조 */
export function getSubMenuRef(projectId: string, subMenuId: string): DocumentReference {
  return doc(getDbInstance(), PROJECTS, projectId, SUBMENUS, subMenuId);
}

/** projects/{projectId}/subMenus/{subMenuId}/messages 서브컬렉션 참조 */
export function getMessagesRef(
  projectId: string,
  subMenuId: string
): CollectionReference<ChatMessagePayload> {
  return collection(
    getDbInstance(),
    PROJECTS,
    projectId,
    SUBMENUS,
    subMenuId,
    MESSAGES
  ) as CollectionReference<ChatMessagePayload>;
}

export const FIRESTORE_CHAT = {
  PROJECTS,
  SUBMENUS,
  MESSAGES,
} as const;

// --- 업무 지시 (전역) ---
const TASKS = 'tasks';
const NOTIFICATIONS = 'notifications';

/** 전역 tasks 컬렉션 참조 */
export function getTasksRef(): CollectionReference {
  return collection(getDbInstance(), TASKS);
}

/** tasks/{taskId} 문서 참조 */
export function getTaskRef(taskId: string): DocumentReference {
  return doc(getDbInstance(), TASKS, taskId);
}

/** users/{uid}/notifications 서브컬렉션 참조 */
export function getUserNotificationsRef(uid: string): CollectionReference {
  return collection(getDbInstance(), USERS_COLLECTION, uid, NOTIFICATIONS);
}

/** users 컬렉션 참조 (직원 목록 등) */
export function getUsersRef(): CollectionReference {
  return collection(getDbInstance(), USERS_COLLECTION);
}
