import {
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  getProjectsRef,
  getProjectRef,
  getSubMenusRef,
  getMessagesRef,
  getPinnedRef,
  getSubMenuRef,
} from './firestore-paths';
import type { Project } from '../types/project';

/** 프로젝트 목록 조회 (createdAt 기준 정렬). general-notice 제외 optional */
export async function fetchProjects(excludeGeneralNotice = true): Promise<Project[]> {
  const q = query(getProjectsRef(), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  const list: Project[] = [];
  snapshot.forEach((d) => {
    if (excludeGeneralNotice && d.id === 'general-notice') return;
    const data = d.data();
    list.push({
      id: d.id,
      name: typeof data.name === 'string' ? data.name : d.id,
    });
  });
  return list;
}

/** 프로젝트 생성. 반환된 id로 기존 subMenus 구조와 호환 */
export async function createProject(
  name: string,
  createdBy?: string
): Promise<{ id: string; name: string }> {
  const ref = await addDoc(getProjectsRef(), {
    name: name.trim(),
    createdAt: serverTimestamp(),
    ...(createdBy && { createdBy }),
  });
  return { id: ref.id, name: name.trim() };
}

/** 프로젝트 이름 수정 */
export async function updateProjectName(projectId: string, name: string): Promise<void> {
  const ref = getProjectRef(projectId);
  await updateDoc(ref, { name: name.trim() });
}

/** 프로젝트 문서 및 하위 서브컬렉션 전부 삭제 (subMenus → messages, channelMeta/pinned) */
export async function deleteProject(projectId: string): Promise<void> {
  const subMenusSnap = await getDocs(getSubMenusRef(projectId));
  for (const subDoc of subMenusSnap.docs) {
    const subMenuId = subDoc.id;
    const messagesSnap = await getDocs(getMessagesRef(projectId, subMenuId));
    for (const msgDoc of messagesSnap.docs) {
      await deleteDoc(msgDoc.ref);
    }
    try {
      await deleteDoc(getPinnedRef(projectId, subMenuId));
    } catch {
      // pinned 문서 없을 수 있음
    }
    await deleteDoc(getSubMenuRef(projectId, subMenuId));
  }
  await deleteDoc(getProjectRef(projectId));
}
