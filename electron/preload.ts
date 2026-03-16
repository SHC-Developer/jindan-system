import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', title, body),
  getVersion: () => ipcRenderer.invoke('getVersion'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  onUpdateStatus: (
    callback: (status: {
      status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
      message: string;
      version?: string;
      progress?: number;
    } | null) => void
  ) => {
    const handler = (_event: unknown, status: {
      status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
      message: string;
      version?: string;
      progress?: number;
    } | null) => callback(status);
    ipcRenderer.on('update-status', handler);
    return () => {
      ipcRenderer.removeListener('update-status', handler);
    };
  },
  onUpdateDownloaded: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('update-downloaded', handler);
    return () => {
      ipcRenderer.removeListener('update-downloaded', handler);
    };
  },
  restartAndInstall: () => ipcRenderer.invoke('restart-and-install'),
  /** 로그아웃 후 다른 계정 선택을 위해 Google/Firebase 쿠키 삭제 (Electron 전용) */
  clearAuthCookies: (authDomain?: string) => ipcRenderer.invoke('clearAuthCookies', authDomain),
});
