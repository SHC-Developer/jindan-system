import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { getWorkLogsRef } from '../lib/firestore-paths';
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
  };
}

function getStartOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getEndOfTodayMs(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
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

/** 오늘 날짜의 출근 기록 1건 (승인 대기/정상 출근/퇴근 버튼 표시용). useMyWorkLogs 기반. */
export function useTodayWorkLog(userId: string | null): {
  todayLog: WorkLogEntry | null;
  loading: boolean;
  error: string | null;
} {
  const { workLogs, loading, error } = useMyWorkLogs(userId);
  const todayLog = useMemo(() => {
    const start = getStartOfTodayMs();
    const end = getEndOfTodayMs();
    return workLogs.find((log) => log.clockInAt >= start && log.clockInAt <= end) ?? null;
  }, [workLogs]);

  return { todayLog, loading, error };
}

/** 관리자용: 승인 대기(status === 'pending') 목록 실시간. */
export function usePendingWorkLogs(): {
  workLogs: WorkLogEntry[];
  loading: boolean;
  error: string | null;
} {
  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = getWorkLogsRef();
    const q = query(
      ref,
      where('status', '==', 'pending'),
      orderBy('clockInAt', 'desc'),
      limit(50)
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
        setError(err instanceof Error ? err.message : '승인 대기 목록을 불러오지 못했습니다.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { workLogs, loading, error };
}
