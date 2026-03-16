import { useEffect, useRef, useState } from 'react';

type UpdateBannerStatus = {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  message: string;
  version?: string;
  progress?: number;
};

export function ElectronUpdateBanner() {
  const [status, setStatus] = useState<UpdateBannerStatus | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const scheduleHide = (nextStatus: UpdateBannerStatus) => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (nextStatus.status === 'not-available') {
        hideTimerRef.current = window.setTimeout(() => {
          setStatus((current) => (current?.status === 'not-available' ? null : current));
          hideTimerRef.current = null;
        }, 4000);
      }
    };

    api.getUpdateStatus?.().then((currentStatus) => {
      if (!currentStatus) return;
      setStatus(currentStatus);
      scheduleHide(currentStatus);
    }).catch(() => {});

    const unsubscribe = api.onUpdateStatus?.((nextStatus) => {
      setStatus(nextStatus);
      scheduleHide(nextStatus);
    });

    return () => {
      unsubscribe?.();
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  const handleRestart = () => {
    window.electronAPI?.restartAndInstall?.();
  };

  if (!window.electronAPI || !status) return null;

  const isDownloaded = status.status === 'downloaded';
  const isError = status.status === 'error';
  const bannerClass = isDownloaded
    ? 'bg-[#19647E] text-white'
    : isError
      ? 'bg-red-600 text-white'
      : 'bg-[#EEE5E5] text-[#37392E]';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-2 text-sm shadow md:px-6 ${bannerClass}`}
      role="banner"
    >
      <span>{status.message}</span>
      {isDownloaded && (
        <button
          type="button"
          onClick={handleRestart}
          className="shrink-0 rounded px-3 py-1.5 font-medium bg-white text-[#19647E] hover:bg-[#EEE5E5] min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
        >
          재시작
        </button>
      )}
    </div>
  );
}
