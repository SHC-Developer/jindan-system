import { useState, useEffect, useRef } from 'react';
import { onSnapshot, orderBy, query, deleteDoc } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { getUserNotificationsRef } from '../lib/firestore-paths';
import type { TaskNotification } from '../types/task';

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
  const notifiedIdsRef = useRef<Set<string>>(new Set());
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
          if (notifiedIdsRef.current.has(notificationId)) continue;

          notifiedIdsRef.current.add(notificationId);
          const notification = docToNotification(notificationId, data);

          deleteDoc(d.ref)
            .then(() => {
              onNewRef.current?.(notification);
            })
            .catch(() => {
              notifiedIdsRef.current.delete(notificationId);
            });
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
