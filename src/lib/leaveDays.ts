import { setDoc, deleteDoc, updateDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { getUserLeaveDaysRef, getUserLeaveDayRef } from './firestore-paths';

export type LeaveDayStatus = 'pending' | 'approved';

export interface LeaveDayItem {
  dateKey: string;
  status: LeaveDayStatus;
}

/** 연차로 날짜 등록 (대기 상태). dateKey = 서울 기준 YYYY-MM-DD. 알림은 직원이 "연차 요청" 버튼을 눌렀을 때만 전송. */
export async function addLeaveDay(userId: string, dateKey: string): Promise<void> {
  const ref = getUserLeaveDayRef(userId, dateKey);
  await setDoc(ref, { dateKey, createdAt: Date.now(), status: 'pending' });
}

/** 연차 해제 (pending만 삭제 가능, approved는 규칙으로 차단) */
export async function removeLeaveDay(userId: string, dateKey: string): Promise<void> {
  const ref = getUserLeaveDayRef(userId, dateKey);
  await deleteDoc(ref);
}

/** 관리자: 연차 승인 → 고정 (이후 직원이 해제 불가) */
export async function approveLeaveDay(
  userId: string,
  dateKey: string,
  approvedBy: string
): Promise<void> {
  const ref = getUserLeaveDayRef(userId, dateKey);
  await updateDoc(ref, {
    status: 'approved',
    approvedBy,
    approvedAt: Date.now(),
  });
}

/** 관리자: 연차 승인 취소 → pending으로 되돌림 (직원이 다시 수정 가능) */
export async function unapproveLeaveDay(userId: string, dateKey: string): Promise<void> {
  const ref = getUserLeaveDayRef(userId, dateKey);
  await updateDoc(ref, {
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
  });
}

function docToItem(docId: string, data: Record<string, unknown>): LeaveDayItem {
  const status = (data.status === 'approved' ? 'approved' : 'pending') as LeaveDayStatus;
  return { dateKey: docId, status };
}

/** 특정 사용자의 연차 목록 실시간 구독 (dateKey + status) */
export function subscribeLeaveDays(
  userId: string,
  onUpdate: (items: LeaveDayItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }
  const ref = getUserLeaveDaysRef(userId);
  const unsub = onSnapshot(
    ref,
    (snapshot) => {
      const items = snapshot.docs.map((d) => docToItem(d.id, d.data()));
      onUpdate(items);
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
  return () => unsub();
}

/** 관리자용: 특정 사용자의 연차 dateKey 목록 1회 조회 (기존 호환) */
export async function getLeaveDaysForUser(userId: string): Promise<string[]> {
  const ref = getUserLeaveDaysRef(userId);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => d.id);
}

/** 관리자용: 특정 사용자의 연차 목록(status 포함) 1회 조회 */
export async function getLeaveDaysWithStatusForUser(
  userId: string
): Promise<LeaveDayItem[]> {
  const ref = getUserLeaveDaysRef(userId);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => docToItem(d.id, d.data()));
}
