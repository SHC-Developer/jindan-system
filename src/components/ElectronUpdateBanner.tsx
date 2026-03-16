import { useState, useEffect } from 'react';

export function ElectronUpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onUpdateDownloaded) return;
    const unsubscribe = api.onUpdateDownloaded(() => setUpdateReady(true));
    return unsubscribe;
  }, []);

  const handleRestart = () => {
    window.electronAPI?.restartAndInstall?.();
  };

  if (!window.electronAPI || !updateReady) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-2 bg-[#19647E] text-white text-sm shadow md:px-6"
      role="banner"
    >
      <span>새 버전이 준비되었습니다. 재시작하면 설치됩니다.</span>
      <button
        type="button"
        onClick={handleRestart}
        className="shrink-0 rounded px-3 py-1.5 font-medium bg-white text-[#19647E] hover:bg-[#EEE5E5] min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
      >
        재시작
      </button>
    </div>
  );
}
