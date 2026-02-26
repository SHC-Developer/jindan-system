import { useState, useEffect } from 'react';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { getTasksRef } from '../lib/firestore-paths';
import type { Task } from '../types/task';

function docToTask(id: string, data: Record<string, unknown>): Task {
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
    status: 'completed',
    createdAt: (data.createdAt as number) ?? 0,
    completedAt: (data.completedAt as number | null) ?? null,
    attachments,
  };
}

export function useCompletedTasks(): {
  tasks: Task[];
  loading: boolean;
  error: string | null;
} {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tasksRef = getTasksRef();
    const q = query(
      tasksRef,
      where('status', '==', 'completed'),
      orderBy('completedAt', 'desc')
    );

    let unsub: (() => void) | null = null;
    unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => docToTask(d.id, d.data()));
        setTasks(list);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '완료 현황을 불러오지 못했습니다.');
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
  }, []);

  return { tasks, loading, error };
}
