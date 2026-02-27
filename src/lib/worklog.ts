import { addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { getWorkLogsRef, getWorkLogRef } from './firestore-paths';
import type { WorkLogStatus } from '../types/worklog';

/** 출근하기: status 'pending'으로 기록 생성. 관리자 승인 전까지 "승인 대기중" 표시됨. */
export async function createWorkLog(
  userId: string,
  userDisplayName: string | null
): Promise<string> {
  const ref = getWorkLogsRef();
  const now = Date.now();
  const docRef = await addDoc(ref, {
    userId,
    userDisplayName: userDisplayName ?? null,
    clockInAt: now,
    clockOutAt: null,
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
  });
  return docRef.id;
}

/** 관리자 승인: status → approved, approvedBy, approvedAt 설정. */
export async function approveWorkLog(logId: string, approvedByUid: string): Promise<void> {
  const ref = getWorkLogRef(logId);
  await updateDoc(ref, {
    status: 'approved',
    approvedBy: approvedByUid,
    approvedAt: Date.now(),
  });
}

/** 퇴근하기: clockOutAt만 업데이트. (승인된 기록에만 호출) */
export async function clockOutWorkLog(logId: string): Promise<void> {
  const ref = getWorkLogRef(logId);
  await updateDoc(ref, {
    clockOutAt: Date.now(),
  });
}

/** 단일 출퇴근 기록 조회 (퇴근 등 업데이트 전 확인용). */
export async function getWorkLog(logId: string): Promise<{
  userId: string;
  userDisplayName: string | null;
  clockInAt: number;
  clockOutAt: number | null;
  status: WorkLogStatus;
  approvedBy: string | null;
  approvedAt: number | null;
} | null> {
  const ref = getWorkLogRef(logId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    userId: d.userId as string,
    userDisplayName: (d.userDisplayName as string | null) ?? null,
    clockInAt: d.clockInAt as number,
    clockOutAt: (d.clockOutAt as number | null) ?? null,
    status: (d.status as WorkLogStatus) ?? 'pending',
    approvedBy: (d.approvedBy as string | null) ?? null,
    approvedAt: (d.approvedAt as number | null) ?? null,
  };
}
