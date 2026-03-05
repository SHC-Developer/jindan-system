import { addDoc, updateDoc, getDoc, deleteDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getWorkLogsRef, getWorkLogRef } from './firestore-paths';
import { toDateKeySeoul } from './datetime-seoul';
import type { WorkLogStatus } from '../types/worklog';

/** 출근하기: 승인 없이 status 'approved'로 즉시 기록 생성. 당일 중복 출근 방지. */
export async function createWorkLog(
  userId: string,
  userDisplayName: string | null,
  tardinessReason?: string | null
): Promise<string> {
  const ref = getWorkLogsRef();
  const now = Date.now();
  const todayKey = toDateKeySeoul(now);
  const todayStart = new Date(todayKey + 'T00:00:00+09:00').getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  const existing = await getDocs(
    query(ref, where('userId', '==', userId), where('clockInAt', '>=', todayStart), where('clockInAt', '<', todayEnd), limit(1))
  );
  if (!existing.empty) {
    const existingStatus = existing.docs[0].data().status;
    if (existingStatus !== 'absent') {
      throw new Error('오늘은 이미 출근 기록이 있습니다.');
    }
  }

  const docRef = await addDoc(ref, {
    userId,
    userDisplayName: userDisplayName ?? null,
    clockInAt: now,
    clockOutAt: null,
    status: 'approved',
    approvedBy: null,
    approvedAt: null,
    tardinessReason: tardinessReason ?? null,
    overtimeStartAt: null,
    overtimeEndAt: null,
    overtimeReason: null,
  });
  return docRef.id;
}

/** 결근 기록을 출근으로 갱신 (00:00에 생성된 당일 결근 문서를 정상/지각으로 업데이트). */
export async function updateWorkLogToClockIn(
  logId: string,
  clockInAtMs: number,
  tardinessReason?: string | null,
  /** 호출자 userId: 문서가 본인 것인지 검증 후에만 수정 */
  expectedUserId?: string
): Promise<void> {
  const ref = getWorkLogRef(logId);
  if (expectedUserId != null) {
    const doc = await getDoc(ref);
    if (!doc.exists()) throw new Error('해당 출퇴근 기록을 찾을 수 없습니다.');
    const data = doc.data();
    if (data?.userId !== expectedUserId) {
      throw new Error('본인의 출퇴근 기록만 수정할 수 있습니다.');
    }
  }
  await updateDoc(ref, {
    clockInAt: clockInAtMs,
    status: 'approved',
    approvedBy: null,
    approvedAt: null,
    tardinessReason: tardinessReason ?? null,
  });
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

/** 퇴근하기: clockOutAt 업데이트. clockOutAtMs 없으면 현재 시각, 있으면 해당 시각(자동 퇴근 18:10 등) 사용. */
export async function clockOutWorkLog(logId: string, clockOutAtMs?: number): Promise<void> {
  const ref = getWorkLogRef(logId);
  await updateDoc(ref, {
    clockOutAt: clockOutAtMs ?? Date.now(),
  });
}

/** 야근 시작: 퇴근된 기록에 overtimeStartAt 및 야근 사유 설정. */
export async function startOvertime(logId: string, overtimeReason?: string | null): Promise<void> {
  const ref = getWorkLogRef(logId);
  await updateDoc(ref, {
    overtimeStartAt: Date.now(),
    overtimeReason: overtimeReason ?? null,
  });
}

/** 야근 종료: overtimeEndAt 설정. endAtMs 없으면 현재 시각, 있으면 해당 시각(다음날 06:00 자동 종료 등) 사용. */
export async function endOvertime(logId: string, endAtMs?: number): Promise<void> {
  const ref = getWorkLogRef(logId);
  await updateDoc(ref, {
    overtimeEndAt: endAtMs ?? Date.now(),
  });
}

/** 결근 기록 생성: 해당 날짜(서울 기준)에 대한 결근 1건 생성. 평일 누적 보충용. */
export async function createAbsentWorkLog(
  userId: string,
  userDisplayName: string | null,
  dateKey: string
): Promise<string> {
  const ref = getWorkLogsRef();
  const clockInAt = new Date(dateKey + 'T00:00:00+09:00').getTime();
  const docRef = await addDoc(ref, {
    userId,
    userDisplayName: userDisplayName ?? null,
    clockInAt,
    clockOutAt: null,
    status: 'absent',
    approvedBy: null,
    approvedAt: null,
    tardinessReason: null,
    overtimeStartAt: null,
    overtimeEndAt: null,
    overtimeReason: null,
  });
  return docRef.id;
}

/** 18:00 이후 미출근자 야근 전용: clockIn=clockOut=now(정규 근무 0), overtimeStartAt=now. */
export async function createOvertimeOnlyWorkLog(
  userId: string,
  userDisplayName: string | null,
  overtimeReason: string
): Promise<string> {
  const ref = getWorkLogsRef();
  const now = Date.now();
  const docRef = await addDoc(ref, {
    userId,
    userDisplayName: userDisplayName ?? null,
    clockInAt: now,
    clockOutAt: now,
    status: 'approved',
    approvedBy: null,
    approvedAt: null,
    tardinessReason: null,
    overtimeStartAt: now,
    overtimeEndAt: null,
    overtimeReason: overtimeReason ?? null,
  });
  return docRef.id;
}

/** 결근 레코드를 야근 전용으로 전환: clockIn=clockOut=now, overtimeStartAt=now. */
export async function updateAbsentToOvertime(
  logId: string,
  overtimeReason: string,
  expectedUserId?: string
): Promise<void> {
  const ref = getWorkLogRef(logId);
  if (expectedUserId != null) {
    const doc = await getDoc(ref);
    if (!doc.exists()) throw new Error('해당 출퇴근 기록을 찾을 수 없습니다.');
    if (doc.data()?.userId !== expectedUserId) {
      throw new Error('본인의 출퇴근 기록만 수정할 수 있습니다.');
    }
  }
  const now = Date.now();
  await updateDoc(ref, {
    clockInAt: now,
    clockOutAt: now,
    status: 'approved',
    approvedBy: null,
    approvedAt: null,
    tardinessReason: null,
    overtimeStartAt: now,
    overtimeEndAt: null,
    overtimeReason: overtimeReason ?? null,
  });
}

/** 관리자 전용: 출근 기록 삭제(출근 상태 리셋). */
export async function deleteWorkLog(logId: string): Promise<void> {
  const ref = getWorkLogRef(logId);
  await deleteDoc(ref);
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
  tardinessReason: string | null;
  overtimeStartAt: number | null;
  overtimeEndAt: number | null;
  overtimeReason: string | null;
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
    tardinessReason: (d.tardinessReason as string | null) ?? null,
    overtimeStartAt: (d.overtimeStartAt as number | null) ?? null,
    overtimeEndAt: (d.overtimeEndAt as number | null) ?? null,
    overtimeReason: (d.overtimeReason as string | null) ?? null,
  };
}
