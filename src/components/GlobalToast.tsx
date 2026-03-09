import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';
import type { ToastVariant } from '../types/toast';

const VARIANT_STYLES: Record<ToastVariant, { bg: string; icon: typeof AlertCircle; iconColor: string }> = {
  error: { bg: 'bg-red-50 border-red-300', icon: AlertCircle, iconColor: 'text-red-500' },
  success: { bg: 'bg-green-50 border-green-300', icon: CheckCircle2, iconColor: 'text-green-500' },
  info: { bg: 'bg-blue-50 border-blue-300', icon: Info, iconColor: 'text-blue-500' },
};

const AUTO_DISMISS_MS = 5000;

export function GlobalToastContainer() {
  const { toasts, removeToast } = useToastContext();

  const globalToasts = toasts.filter((t) => t.variant && t.variant !== 'info');

  return (
    <div className="fixed top-4 right-2 left-2 sm:right-4 sm:left-auto z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      {globalToasts.map((toast) => {
        const variant = toast.variant ?? 'info';
        const style = VARIANT_STYLES[variant];
        const Icon = style.icon;
        return (
          <GlobalToastItem
            key={toast.id}
            id={toast.id}
            title={toast.title}
            message={toast.message}
            variant={variant}
            Icon={Icon}
            iconColor={style.iconColor}
            bg={style.bg}
            onDismiss={removeToast}
          />
        );
      })}
    </div>
  );
}

interface GlobalToastItemProps {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  Icon: typeof AlertCircle;
  iconColor: string;
  bg: string;
  onDismiss: (id: string) => void;
}

function GlobalToastItem({ id, title, message, Icon, iconColor, bg, onDismiss }: GlobalToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={`pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg ${bg} animate-in slide-in-from-right`}>
      <Icon size={18} className={`${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {message && <p className="text-xs text-gray-600 mt-0.5">{message}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="p-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
        aria-label="닫기"
      >
        <X size={14} />
      </button>
    </div>
  );
}
