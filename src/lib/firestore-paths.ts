import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import type { ChatMessagePayload } from '../types/chat';
import { getDbInstance } from './firebase';

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
