import { useCallback } from 'react';
import { useToastContext } from '../contexts/ToastContext';

/**
 * 에러 발생 시 토스트로 사용자에게 알림을 표시하는 편의 훅.
 */
export function useErrorToast() {
  const { addToast } = useToastContext();

  const showError = useCallback(
    (title: string, error?: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : undefined;
      addToast({ title, message, variant: 'error' });
    },
    [addToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      addToast({ title, message, variant: 'success' });
    },
    [addToast]
  );

  return { showError, showSuccess };
}
