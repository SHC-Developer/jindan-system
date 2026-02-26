import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { getTaskRef } from '../lib/firestore-paths';
import type { Task } from '../types/task';

function dataToTask(id: string, data: Record<string, unknown>): Task {
  const attachments = (data.attachments as Task['attachments']) ?? [];
  return {
    id,
    assigneeId: (data.assigneeId as string) ?? '',
    assigneeDisplayName: (data.assigneeDisplayName as string) ?? null,
    createdBy: (data.createdBy as string) ?? '',
    createdByDisplayName: (data.createdByDisplayName as string) ?? null,
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    priority: (data.priority as string) ?? '',
    status: (data.status as Task['status']) ?? 'pending',
    createdAt: (data.createdAt as number) ?? 0,
    completedAt: (data.completedAt as number | null) ?? null,
    attachments,
  };
}

export function useTaskDetail(taskId: string | null): {
  task: Task | null;
  loading: boolean;
  error: string | null;
} {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setLoading(false);
      return;
    }

    const taskRef = getTaskRef(taskId);
    let unsub: (() => void) | null = null;
    unsub = onSnapshot(
      taskRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setTask(dataToTask(snapshot.id, snapshot.data()));
        } else {
          setTask(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '업무를 불러오지 못했습니다.');
        setLoading(false);
        if (unsub) {
          unsub();
          unsub = null;
        }
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [taskId]);

  return { task, loading, error };
}
