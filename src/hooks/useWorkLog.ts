import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { getWorkLogsRef } from '../lib/firestore-paths';
import { toDateKeySeoul } from '../lib/datetime-seoul';
import type { WorkLogEntry, WorkLogStatus } from '../types/worklog';

function dataToWorkLogEntry(id: string, data: Record<string, unknown>): WorkLogEntry {
  const status = (data.status as WorkLogStatus) ?? 'pending';
  return {
    id,
    userId: (data.userId as string) ?? '',
    userDisplayName: (data.userDisplayName as string | null) ?? null,
    clockInAt: (data.clockInAt as number) ?? 0,
    clockOutAt: (data.clockOutAt as number | null) ?? null,
    status,
    approvedBy: (data.approvedBy as string | null) ?? null,
    approvedAt: (data.approvedAt as number | null) ?? null,
    tardinessReason: (data.tardinessReason as string | null) ?? null,
    overtimeStartAt: (data.overtimeStartAt as number | null) ?? null,
    overtimeEndAt: (data.overtimeEndAt as number | null) ?? null,
    overtimeReason: (data.overtimeReason as string | null) ?? null,
    note: (data.note as string | null) ?? null,
    leaveType: (data.leaveType === 'annual' || data.leaveType === 'half' ? data.leaveType : null) ?? null,
  };
}

/** 본인 출퇴근 목록 (최근순, 실시간). */
export function useMyWorkLogs(userId: string | null): {
  workLogs: WorkLogEntry[];
  loading: boolean;
  error: string | null;
} {
  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setWorkLogs([]);
      setLoading(false);
      return;
    }

    const ref = getWorkLogsRef();
    const q = query(
      ref,
      where('userId', '==', userId),
      orderBy('clockInAt', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setWorkLogs(
          snapshot.docs.map((d) => dataToWorkLogEntry(d.id, d.data()))
        );
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '출퇴근 기록을 불러오지 못했습니다.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  return { workLogs, loading, error };
}

/** 오늘 날짜(서울 기준)의 출근 기록 1건. useMyWorkLogs 기반. nowMs를 넘기면 자정 경계에서 오늘 로그를 정확히 계산. */
export function useTodayWorkLog(userId: string | null, nowMs?: number): {
  todayLog: WorkLogEntry | null;
  loading: boolean;
  error: string | null;
} {
  const { workLogs, loading, error } = useMyWorkLogs(userId);
  const todayKey = nowMs != null ? toDateKeySeoul(nowMs) : toDateKeySeoul(Date.now());
  const todayLog = useMemo(() => {
    return workLogs.find((log) => toDateKeySeoul(log.clockInAt) === todayKey) ?? null;
  }, [workLogs, todayKey]);

  return { todayLog, loading, error };
}

/** 관리자용: 전체 출퇴근 기록 (최근순). 담당자/기간 필터는 클라이언트에서 적용. */
export function useAllWorkLogs(): {
  workLogs: WorkLogEntry[];
  loading: boolean;
  error: string | null;
} {
  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = getWorkLogsRef();
    const q = query(ref, orderBy('clockInAt', 'desc'), limit(1000));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setWorkLogs(snapshot.docs.map((d) => dataToWorkLogEntry(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '출퇴근 기록을 불러오지 못했습니다.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { workLogs, loading, error };
}
