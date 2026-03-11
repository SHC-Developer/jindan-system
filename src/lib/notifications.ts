import { getDocs, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { getUsersRef, getUserNotificationsRef } from './firestore-paths';

/** 전체 직원에게 알림 생성 (공유일정 등록 등). excludeUid에 해당하는 사용자는 제외 */
export async function notifyAllUsers(
  payload: {
    type: 'shared_calendar_event';
    title: string;
    sharedCalendarEventTitle?: string;
    sharedCalendarEventUserDisplayName?: string;
  },
  excludeUid?: string
): Promise<void> {
  const usersRef = getUsersRef();
  const usersSnap = await getDocs(usersRef);
  const doc: Record<string, unknown> = {
    type: payload.type,
    taskId: '',
    title: payload.title,
    read: false,
    createdAt: Date.now(),
    ...(payload.sharedCalendarEventTitle != null && { sharedCalendarEventTitle: payload.sharedCalendarEventTitle }),
    ...(payload.sharedCalendarEventUserDisplayName != null && {
      sharedCalendarEventUserDisplayName: payload.sharedCalendarEventUserDisplayName,
    }),
  };
  const uids = usersSnap.docs.map((d) => d.id).filter((uid) => uid !== excludeUid);
  await Promise.all(uids.map((uid) => addDoc(getUserNotificationsRef(uid), doc)));
}

/** 관리자·특수 계정 전원에게 알림 생성 (출근 요청, 연차 승인 요청 등) */
export async function notifyAdmins(payload: {
  type: 'worklog_clockin' | 'leave_approval_request';
  title: string;
  clockInByDisplayName?: string;
  leaveUserDisplayName?: string;
  leaveDateKey?: string;
}): Promise<void> {
  const usersRef = getUsersRef();
  const [adminSnap, specialistSnap] = await Promise.all([
    getDocs(query(usersRef, where('role', '==', 'admin'))),
    getDocs(query(usersRef, where('specialist', '==', true))),
  ]);
  const adminUids = new Set([
    ...adminSnap.docs.map((d) => d.id),
    ...specialistSnap.docs.map((d) => d.id),
  ]);
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
  await Promise.all([...adminUids].map((uid) => addDoc(getUserNotificationsRef(uid), doc)));
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
