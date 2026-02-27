import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useToastContext } from './ToastContext';

export interface NotificationContextValue {
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  isAdmin: boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { addToast } = useToastContext();
  const uid = user?.uid ?? null;

  const { deleteNotification, deleteAllNotifications } = useNotifications({
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

  const value: NotificationContextValue = {
    deleteNotification,
    deleteAllNotifications,
    isAdmin: user?.role === 'admin',
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
}
