/// <reference types="vite/client" />

interface ElectronAPI {
  showNotification: (title: string, body: string) => void;
  getVersion: () => Promise<string>;
  onUpdateDownloaded?: (callback: () => void) => () => void;
  restartAndInstall?: () => Promise<void>;
  /** 로그아웃 후 다른 계정 선택을 위해 Google/Firebase 쿠키 삭제 */
  clearAuthCookies?: (authDomain?: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
