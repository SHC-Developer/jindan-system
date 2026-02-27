import { useState, useEffect, useRef } from 'react';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { getUserNotificationsRef } from '../lib/firestore-paths';
import type { TaskNotification } from '../types/task';

/** 리마운트/재구독 후에도 같은 알림을 다시 토스트하지 않도록 모듈 레벨에서 유지 */
const notifiedIdsGlobal = new Set<string>();

interface UseNotificationsOptions {
  uid: string | null;
  onNew?: (notification: TaskNotification) => void;
}

function docToNotification(docId: string, data: Record<string, unknown>): TaskNotification {
  const createdAt = data.createdAt;
  return {
    id: docId,
    type: (data.type as TaskNotification['type']) ?? 'task_assigned',
    taskId: (data.taskId as string) ?? '',
    title: (data.title as string) ?? '',
    read: Boolean(data.read),
    createdAt: typeof createdAt === 'number' ? createdAt : Date.now(),
    completedByDisplayName: data.completedByDisplayName as string | undefined,
  };
}

export function useNotifications({ uid, onNew }: UseNotificationsOptions): {
  notifications: TaskNotification[];
  loading: boolean;
} {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const notificationsRef = getUserNotificationsRef(uid);
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    let unsub: (() => void) | null = null;
    unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: TaskNotification[] = snapshot.docs.map((d) =>
          docToNotification(d.id, d.data())
        );
        setNotifications(list);
        setLoading(false);

        for (const d of snapshot.docs) {
          const data = d.data();
          const notificationId = d.id;
          if (notifiedIdsGlobal.has(notificationId)) continue;

          notifiedIdsGlobal.add(notificationId);
          const notification = docToNotification(notificationId, data);
          onNewRef.current?.(notification);
        }
      },
      (err) => {
        console.error('useNotifications error', err);
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
  }, [uid]);

  return { notifications, loading };
}
