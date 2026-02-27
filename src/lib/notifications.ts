import { getDocs, deleteDoc } from 'firebase/firestore';
import { getUsersRef, getUserNotificationsRef } from './firestore-paths';

/** 모든 사용자의 notifications 서브컬렉션 문서를 일괄 삭제 (관리자 전용) */
export async function deleteAllUsersNotifications(): Promise<void> {
  const usersRef = getUsersRef();
  const usersSnap = await getDocs(usersRef);

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const notificationsRef = getUserNotificationsRef(uid);
    const notifSnap = await getDocs(notificationsRef);
    await Promise.all(notifSnap.docs.map((d) => deleteDoc(d.ref)));
  }
}
