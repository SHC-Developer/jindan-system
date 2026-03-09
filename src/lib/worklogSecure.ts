import { httpsCallable } from 'firebase/functions';
import { getFunctionsInstance } from './firebase';

const workLogAction = () => httpsCallable(getFunctionsInstance(), 'workLogAction');

function wrapCall<T>(p: Promise<{ data: T }>): Promise<T> {
  return p.then(
    (res) => res.data,
    (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : '출퇴근 처리에 실패했습니다.';
      throw new Error(msg);
    }
  );
}

export async function createWorkLog(
  userId: string,
  userDisplayName: string | null,
  tardinessReason?: string | null
): Promise<string> {
  const data = await wrapCall<{ id?: string }>(
    workLogAction()({
      action: 'createWorkLog',
      userId,
      userDisplayName,
      tardinessReason: tardinessReason ?? null,
    })
  );
  if (data?.id) return data.id;
  throw new Error('출퇴근 처리에 실패했습니다.');
}

export async function updateWorkLogToClockIn(
  logId: string,
  clockInAtMs: number,
  tardinessReason?: string | null,
  expectedUserId?: string
): Promise<void> {
  await wrapCall(
    workLogAction()({
      action: 'updateWorkLogToClockIn',
      logId,
      clockInAtMs,
      tardinessReason: tardinessReason ?? null,
      expectedUserId: expectedUserId ?? undefined,
    })
  );
}

export async function clockOutWorkLog(logId: string, clockOutAtMs?: number): Promise<void> {
  await wrapCall(
    workLogAction()({
      action: 'clockOutWorkLog',
      logId,
      clockOutAtMs: clockOutAtMs ?? undefined,
    })
  );
}

export async function startOvertime(logId: string, overtimeReason?: string | null): Promise<void> {
  await wrapCall(
    workLogAction()({
      action: 'startOvertime',
      logId,
      overtimeReason: overtimeReason ?? null,
    })
  );
}

export async function endOvertime(logId: string, endAtMs?: number): Promise<void> {
  await wrapCall(
    workLogAction()({
      action: 'endOvertime',
      logId,
      endAtMs: endAtMs ?? undefined,
    })
  );
}

export async function createOvertimeOnlyWorkLog(
  userId: string,
  userDisplayName: string | null,
  overtimeReason: string
): Promise<string> {
  const data = await wrapCall<{ id?: string }>(
    workLogAction()({
      action: 'createOvertimeOnlyWorkLog',
      userId,
      userDisplayName,
      overtimeReason,
    })
  );
  if (data?.id) return data.id;
  throw new Error('출퇴근 처리에 실패했습니다.');
}

export async function updateAbsentToOvertime(
  logId: string,
  overtimeReason: string,
  expectedUserId?: string
): Promise<void> {
  await wrapCall(
    workLogAction()({
      action: 'updateAbsentToOvertime',
      logId,
      overtimeReason,
      expectedUserId: expectedUserId ?? undefined,
    })
  );
}
