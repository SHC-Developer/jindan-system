import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useToastContext } from './ToastContext';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { addToast } = useToastContext();
  const uid = user?.uid ?? null;

  useNotifications({
    uid,
    onNew: (n) => {
      const message =
        n.type === 'task_completed'
          ? `${n.completedByDisplayName ?? '직원'}이(가) 업무를 완료했습니다.`
          : '새 업무가 할당되었습니다.';
      addToast({
        title: n.title,
        message,
        taskId: n.taskId,
        notificationId: n.id,
      });
    },
  });

  return <>{children}</>;
}
