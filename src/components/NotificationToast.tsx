import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '../contexts/ToastContext';
import type { ToastItem } from '../types/toast';

const TOAST_DURATION_MS = 5000;
const FADE_OUT_MS = 400;

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
  const [fading, setFading] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const startFade = setTimeout(() => setFading(true), TOAST_DURATION_MS);
    const remove = setTimeout(() => onDismissRef.current(), TOAST_DURATION_MS + FADE_OUT_MS);
    return () => {
      clearTimeout(startFade);
      clearTimeout(remove);
    };
  }, [item.id]);

  return (
    <div
      className={`rounded-xl shadow-lg border border-gray-200 bg-white p-4 min-w-[280px] max-w-[360px] cursor-pointer hover:bg-gray-50 border-l-4 border-l-brand-main transition-opacity duration-300 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
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
      className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 items-end pointer-events-none"
      aria-live="polite"
    >
      <div className="flex flex-col-reverse gap-3 items-end pointer-events-auto">
        {toasts.map((item) => (
          <ToastItemView
            key={item.id}
            item={item}
            onDismiss={() => removeToast(item.id)}
            onClick={() => handleClick(item)}
          />
        ))}
      </div>
    </div>
  );
}
