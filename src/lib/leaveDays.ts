import { setDoc, deleteDoc, onSnapshot, getDocs, collection } from 'firebase/firestore';
import { getUserLeaveDaysRef, getUserLeaveDayRef } from './firestore-paths';

/** 연차로 날짜 등록. dateKey = 서울 기준 YYYY-MM-DD */
export async function addLeaveDay(userId: string, dateKey: string): Promise<void> {
  const ref = getUserLeaveDayRef(userId, dateKey);
  await setDoc(ref, { dateKey, createdAt: Date.now() });
}

/** 연차 해제 */
export async function removeLeaveDay(userId: string, dateKey: string): Promise<void> {
  const ref = getUserLeaveDayRef(userId, dateKey);
  await deleteDoc(ref);
}

/** 특정 사용자의 연차 dateKey 목록 실시간 구독. 반환: dateKey 배열 (문서 ID가 dateKey) */
export function subscribeLeaveDays(
  userId: string,
  onUpdate: (dateKeys: string[]) => void,
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
      const dateKeys = snapshot.docs.map((d) => d.id);
      onUpdate(dateKeys);
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
  return () => unsub();
}

/** 관리자용: 특정 사용자의 연차 dateKey 목록 1회 조회 */
export async function getLeaveDaysForUser(userId: string): Promise<string[]> {
  const ref = getUserLeaveDaysRef(userId);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => d.id);
}
