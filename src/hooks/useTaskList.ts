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
    status: (data.status as Task['status']) ?? 'pending',
    createdAt: (data.createdAt as number) ?? 0,
    completedAt: (data.completedAt as number | null) ?? null,
    attachments,
  };
}

export function useTaskList(assigneeId: string | null): {
  tasks: Task[];
  loading: boolean;
  error: string | null;
} {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assigneeId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const tasksRef = getTasksRef();
    const q = query(
      tasksRef,
      where('assigneeId', '==', assigneeId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => docToTask(d.id, d.data()));
        setTasks(list);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '업무 목록을 불러오지 못했습니다.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [assigneeId]);

  return { tasks, loading, error };
}
