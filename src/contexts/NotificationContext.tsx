import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useToastContext } from './ToastContext';

export interface NotificationContextValue {
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  isAdmin: boolean;
  /** 출퇴근/연차 알림 클릭 시 호출 (URL + activeSection 동기 이동) */
  onNavigateToWorkLog?: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  onNavigateToWorkLog?: () => void;
}

export function NotificationProvider({ children, onNavigateToWorkLog }: NotificationProviderProps) {
  const { user } = useAuth();
  const { addToast } = useToastContext();
  const uid = user?.uid ?? null;

  const { deleteNotification, deleteAllNotifications } = useNotifications({
    uid,
    onNew: (n) => {
      let message: string;
      if (n.type === 'task_completed') {
        message = `${n.completedByDisplayName ?? '직원'}이(가) 업무를 완료했습니다.`;
      } else if (n.type === 'worklog_clockin') {
        message = `${n.clockInByDisplayName ?? '직원'}이(가) 출근했습니다.`;
      } else if (n.type === 'leave_approval_request') {
        message = `${n.leaveUserDisplayName ?? '직원'}이(가) 연차 승인을 요청했습니다.`;
      } else {
        message = '새 업무가 할당되었습니다.';
      }
      addToast({
        title: n.title,
        message,
        taskId: n.taskId,
        notificationId: n.id,
        notificationType: n.type,
      });
    },
  });

  const value: NotificationContextValue = {
    deleteNotification,
    deleteAllNotifications,
    isAdmin: user?.role === 'admin',
    onNavigateToWorkLog,
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
