import { useState, useEffect } from 'react';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { getTasksRef } from '../lib/firestore-paths';
import { dataToTask } from '../lib/task-mapper';
import type { Task } from '../types/task';

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

    let unsub: (() => void) | null = null;
    unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => dataToTask(d.id, d.data()))
          .filter((t) => t.status !== 'approved');
        setTasks(list);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '업무 목록을 불러오지 못했습니다.');
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
  }, [assigneeId]);

  return { tasks, loading, error };
}
