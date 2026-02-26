import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useToastContext } from '../contexts/ToastContext';
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, x: 0 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -12, x: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
      className="rounded-xl shadow-lg border border-gray-200 bg-brand-light p-4 min-w-[280px] max-w-[360px] cursor-pointer hover:bg-gray-50 transition-colors border-l-4 border-l-brand-main"
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
    </motion.div>
  );
}

export function NotificationToastContainer() {
  const { toasts, removeToast } = useToastContext();
  const navigate = useNavigate();

  const handleClick = (item: ToastItem) => {
    if (item.taskId) {
      navigate(`/task/${item.taskId}`);
    }
    removeToast(item.id);
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 items-end pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <ToastItemView
              key={item.id}
              item={item}
              onDismiss={() => removeToast(item.id)}
              onClick={() => handleClick(item)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
