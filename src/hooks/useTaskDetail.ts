import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { getTaskRef } from '../lib/firestore-paths';
import { dataToTask } from '../lib/task-mapper';
import type { Task } from '../types/task';

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
          setTask(dataToTask(snapshot.id, snapshot.data() as Record<string, unknown>));
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
