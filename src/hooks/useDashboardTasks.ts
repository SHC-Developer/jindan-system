import { useState, useEffect } from 'react';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { getTasksRef } from '../lib/firestore-paths';
import { dataToTask } from '../lib/task-mapper';
import type { Task } from '../types/task';

/** 관리자 대시보드: status가 pending, submitted, revision인 업무만 (approved 제외) */
export function useDashboardTasks(): {
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
      where('status', 'in', ['pending', 'submitted', 'revision']),
      orderBy('createdAt', 'desc')
    );

    let unsub: (() => void) | null = null;
    unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => dataToTask(d.id, d.data()));
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
  }, []);

  return { tasks, loading, error };
}
