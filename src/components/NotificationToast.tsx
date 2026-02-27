import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '../contexts/ToastContext';
import { useNotificationContext } from '../contexts/NotificationContext';
import type { ToastItem } from '../types/toast';

function ToastItemView({
  item,
  onDismiss,
  onClick,
}: {
  item: ToastItem;
  onDismiss: () => void;
  onClick: () => void;
  key?: string;
}) {
  return (
    <div
      className="rounded-xl shadow-lg border border-gray-200 bg-white p-4 min-w-[280px] max-w-[360px] cursor-pointer hover:bg-gray-50 border-l-4 border-l-brand-main"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-brand-dark truncate">{item.title}</p>
          {item.message && (
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-brand-dark rounded"
          aria-label="닫기"
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
      </div>
    </div>
  );
}

export function NotificationToastContainer() {
  const { toasts, removeToast, clearAllToasts } = useToastContext();
  const { deleteNotification, deleteAllNotifications, isAdmin } = useNotificationContext();
  const navigate = useNavigate();
  const [clearingAll, setClearingAll] = useState(false);

  const handleDismiss = (item: ToastItem) => {
    if (item.notificationId) {
      deleteNotification(item.notificationId).catch(() => {});
    }
    removeToast(item.id);
  };

  const handleClick = (item: ToastItem) => {
    if (item.taskId) {
      navigate(`/task/${item.taskId}`);
    }
    handleDismiss(item);
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      await deleteAllNotifications();
      clearAllToasts();
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 items-end pointer-events-none"
      aria-live="polite"
    >
      <div className="flex flex-col-reverse gap-3 items-end pointer-events-auto">
        {isAdmin && toasts.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearingAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-main text-white hover:bg-brand-main/90 disabled:opacity-50"
          >
            {clearingAll ? '삭제 중…' : '모두 지우기'}
          </button>
        )}
        {toasts.map((item) => (
          <ToastItemView
            key={item.id}
            item={item}
            onDismiss={() => handleDismiss(item)}
            onClick={() => handleClick(item)}
          />
        ))}
      </div>
    </div>
  );
}
