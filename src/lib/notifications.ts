import { getDocs, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { getUsersRef, getUserNotificationsRef } from './firestore-paths';

/** 관리자 전원에게 알림 생성 (출근 요청, 연차 승인 요청 등) */
export async function notifyAdmins(payload: {
  type: 'worklog_clockin' | 'leave_approval_request';
  title: string;
  clockInByDisplayName?: string;
  leaveUserDisplayName?: string;
  leaveDateKey?: string;
}): Promise<void> {
  const usersRef = getUsersRef();
  const adminQuery = query(usersRef, where('role', '==', 'admin'));
  const snapshot = await getDocs(adminQuery);
  const doc: Record<string, unknown> = {
    type: payload.type,
    taskId: '',
    title: payload.title,
    read: false,
    createdAt: Date.now(),
    ...(payload.clockInByDisplayName != null && { clockInByDisplayName: payload.clockInByDisplayName }),
    ...(payload.leaveUserDisplayName != null && { leaveUserDisplayName: payload.leaveUserDisplayName }),
    ...(payload.leaveDateKey != null && { leaveDateKey: payload.leaveDateKey }),
  };
  await Promise.all(snapshot.docs.map((d) => addDoc(getUserNotificationsRef(d.id), doc)));
}

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
