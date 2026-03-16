import { app, BrowserWindow, Menu, ipcMain, nativeImage, Notification, session, Tray } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import http from 'http';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// 로컬 알림 상단에 표시될 앱 이름 (Windows 등)
app.setName('KDVO 안전진단팀');

if (isDev) {
  app.setPath('userData', path.join(os.tmpdir(), 'jindan-system-electron-dev'));
}

// 단일 인스턴스: 이미 실행 중이면 새 프로세스는 종료하고, 두 번째 실행 시 기존 창을 앞으로
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.show();
    splashWindow.focus();
  }
});

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let prodServer: http.Server | null = null;
let prodUrl: string | null = null;
let hasShownTrayNotice = false;
let startupFlowFinished = false;
let splashShownAt = 0;
const MIN_SPLASH_DURATION_MS = 2000;
type UpdateStatus =
  | { status: 'checking'; message: string }
  | { status: 'available'; message: string; version?: string }
  | { status: 'not-available'; message: string; version?: string }
  | { status: 'downloading'; message: string; progress: number }
  | { status: 'downloaded'; message: string; version?: string }
  | { status: 'error'; message: string };
let latestUpdateStatus: UpdateStatus | null = null;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js');
}

function getSplashHtml(): string {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>KDVO 안전진단팀</title>
    <style>
      :root {
        color-scheme: dark;
        --bg-1: #07111f;
        --bg-2: #10243a;
        --bg-3: #1b4b73;
        --line: rgba(255, 255, 255, 0.08);
        --text-main: #f8fbff;
        --text-sub: rgba(232, 240, 248, 0.76);
        --accent: #2f80ff;
        --accent-soft: rgba(47, 128, 255, 0.18);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", Arial, sans-serif;
        color: var(--text-main);
        background:
          linear-gradient(180deg, rgba(4, 10, 20, 0.24), rgba(4, 10, 20, 0.72)),
          radial-gradient(circle at 50% 20%, rgba(47, 128, 255, 0.22), transparent 26%),
          linear-gradient(160deg, var(--bg-3), var(--bg-2) 48%, var(--bg-1));
        overflow: hidden;
      }
      .scene {
        position: relative;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 28px;
      }
      .scene::before,
      .scene::after {
        content: "";
        position: absolute;
        inset: auto;
        border-radius: 999px;
        filter: blur(50px);
        opacity: 0.6;
      }
      .scene::before {
        width: 280px;
        height: 280px;
        top: 8%;
        left: 10%;
        background: rgba(47, 128, 255, 0.18);
      }
      .scene::after {
        width: 360px;
        height: 360px;
        right: -60px;
        bottom: -80px;
        background: rgba(25, 100, 126, 0.22);
      }
      .panel {
        position: relative;
        width: min(460px, calc(100vw - 32px));
        border: 1px solid var(--line);
        border-radius: 28px;
        padding: 42px 32px 30px;
        background: rgba(7, 17, 31, 0.56);
        backdrop-filter: blur(18px);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.36);
      }
      .product {
        margin: 0 0 10px;
        font-size: 14px;
        letter-spacing: 0.08em;
        color: rgba(255, 255, 255, 0.74);
      }
      .title {
        margin: 0;
        font-size: clamp(28px, 4vw, 38px);
        line-height: 1.25;
        font-weight: 800;
        word-break: keep-all;
        overflow-wrap: break-word;
      }
      .subtitle {
        margin: 10px 0 0;
        color: var(--text-sub);
        font-size: 16px;
        line-height: 1.6;
        word-break: keep-all;
        overflow-wrap: break-word;
      }
      .status {
        margin-top: 34px;
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
      }
      .status > div:first-child {
        min-width: 200px;
        flex: 1;
      }
      .status-label {
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.68);
      }
      .status-text {
        margin-top: 8px;
        font-size: 23px;
        font-weight: 700;
        line-height: 1.35;
        word-break: keep-all;
        overflow-wrap: break-word;
      }
      .status-progress {
        flex-shrink: 0;
        font-size: 36px;
        font-weight: 800;
        color: #2f80ff;
      }
      .track {
        margin-top: 18px;
        width: 100%;
        height: 8px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .bar {
        width: 14%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #2f80ff, #5cbcff);
        box-shadow: 0 0 18px rgba(47, 128, 255, 0.35);
        transition: width 0.25s ease;
      }
      .footer {
        margin-top: 34px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: rgba(255, 255, 255, 0.52);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .footer-line {
        flex: 1;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
      }
    </style>
  </head>
  <body>
    <div class="scene">
      <div class="panel">
        <p class="product" id="version">KDVO 안전진단팀</p>
        <h1 class="title" id="title">최신 버전을 확인중입니다.</h1>
        <p class="subtitle" id="subtitle">안정적인 업무를 위해 시스템을 준비하고 있습니다.</p>

        <div class="status">
          <div>
            <div class="status-label">Status</div>
            <div class="status-text" id="statusText">Checking for updates...</div>
          </div>
          <div class="status-progress" id="progressText">0%</div>
        </div>

        <div class="track">
          <div class="bar" id="progressBar"></div>
        </div>

        <div class="footer">
          <div class="footer-line"></div>
          <span>Professional Reliability</span>
          <div class="footer-line"></div>
        </div>
      </div>
    </div>
    <script>
      const defaultState = {
        status: 'checking',
        message: '업데이트 확인 중...',
        progress: 12,
      };

      const titleEl = document.getElementById('title');
      const subtitleEl = document.getElementById('subtitle');
      const statusTextEl = document.getElementById('statusText');
      const progressTextEl = document.getElementById('progressText');
      const progressBarEl = document.getElementById('progressBar');
      const versionEl = document.getElementById('version');

      function applyStatus(payload) {
        const state = payload || defaultState;
        const progress =
          typeof state.progress === 'number'
            ? Math.max(0, Math.min(100, state.progress))
            : state.status === 'downloaded'
              ? 100
              : state.status === 'not-available'
                ? 100
                : 18;

        if (state.status === 'checking') {
          titleEl.textContent = '최신 버전을 확인중입니다.';
          subtitleEl.textContent = '안정적인 업무를 위해 시스템을 점검하고 있습니다.';
        } else if (state.status === 'available' || state.status === 'downloading') {
          titleEl.textContent = '업데이트를 적용하고 있습니다.';
          subtitleEl.textContent = '새 버전을 안전하게 다운로드하는 동안 잠시만 기다려 주세요.';
        } else if (state.status === 'downloaded') {
          titleEl.textContent = '업데이트 준비가 완료되었습니다.';
          subtitleEl.textContent = '잠시 후 자동으로 재시작하여 최신 버전을 설치합니다.';
        } else if (state.status === 'error') {
          titleEl.textContent = '앱을 준비하는 중입니다.';
          subtitleEl.textContent = '업데이트 확인 중 문제가 있었지만 곧 앱을 실행합니다.';
        } else {
          titleEl.textContent = '앱을 준비했습니다.';
          subtitleEl.textContent = '최신 상태가 확인되어 곧 메인 화면이 열립니다.';
        }

        statusTextEl.textContent = state.message || defaultState.message;
        progressTextEl.textContent = progress + '%';
        progressBarEl.style.width = progress + '%';
      }

      window.addEventListener('DOMContentLoaded', async () => {
        try {
          const version = await window.electronAPI?.getVersion?.();
          if (version) {
            versionEl.textContent = 'KDVO 안전진단팀 ' + version;
          }
        } catch {}

        applyStatus(defaultState);

        try {
          const current = await window.electronAPI?.getUpdateStatus?.();
          if (current) applyStatus(current);
        } catch {}

        window.electronAPI?.onUpdateStatus?.((status) => {
          applyStatus(status);
        });
      });
    </script>
  </body>
</html>`;
}

function createSplashWindow(): void {
  if (splashWindow) return;
  splashShownAt = Date.now();
  splashWindow = new BrowserWindow({
    width: 500,
    height: 760,
    minWidth: 420,
    minHeight: 680,
    resizable: false,
    maximizable: false,
    minimizable: false,
    closable: false,
    movable: false,
    frame: false,
    autoHideMenuBar: true,
    show: true,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#07111f',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splashWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(getSplashHtml())}`);
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function closeSplashWindow(): void {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.destroy();
  splashWindow = null;
}

function focusStartupWindow(): void {
  if (!startupFlowFinished && splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.show();
    splashWindow.focus();
    return;
  }
  mainWindow?.show();
  mainWindow?.focus();
}

function showMainWindow(): void {
  startupFlowFinished = true;
  latestUpdateStatus = null;
  closeSplashWindow();
  mainWindow?.webContents.send('update-status', null); // 메인 화면 배너에 "확인 중" 등 안 보이게 함
  mainWindow?.show();
  mainWindow?.focus();
}

function showMainWindowAfterMinimumSplash(extraDelayMs = 0): void {
  const elapsedMs = splashShownAt > 0 ? Date.now() - splashShownAt : MIN_SPLASH_DURATION_MS;
  const remainingMs = Math.max(0, MIN_SPLASH_DURATION_MS - elapsedMs);
  setTimeout(() => {
    showMainWindow();
  }, remainingMs + extraDelayMs);
}

function sendUpdateStatus(status: UpdateStatus): void {
  latestUpdateStatus = status;
  splashWindow?.webContents.send('update-status', status);
  if (startupFlowFinished) {
    mainWindow?.webContents.send('update-status', status);
  }
}

function showLocalNotification(title: string, body: string): void {
  try {
    if (!Notification.isSupported()) return;
    const notification = new Notification({ title, body });
    notification.on('click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
    notification.show();
  } catch (err) {
    console.error('Local notification failed:', err);
  }
}

function getUpdateErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (
    /Unable to find latest version on GitHub/i.test(raw) ||
    /Cannot parse releases feed/i.test(raw) ||
    /please ensure a production release exists/i.test(raw)
  ) {
    return '최신 GitHub Release 또는 latest.yml을 찾지 못했습니다. 배포가 완료되었는지 확인해 주세요.';
  }
  return raw || '업데이트 확인에 실패했습니다.';
}

async function checkForAppUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.error('Auto update failed:', err);
    sendUpdateStatus({ status: 'error', message: getUpdateErrorMessage(err) });
  }
}

function createWindow(loadUrl?: string): void {
  const iconPath = path.join(__dirname, isDev ? '../public' : '../dist', 'app-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  const windowTitle = `KDVO 안전진단팀 ${app.getVersion()}`;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 375,
    minHeight: 500,
    title: windowTitle,
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // 웹 페이지가 document.title을 바꿔도 창 제목은 앱 이름+버전 유지
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow?.setTitle(windowTitle);
  });
  mainWindow.on('show', () => {
    closeSplashWindow();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000/jindan-system/');
    mainWindow.webContents.openDevTools();
  } else if (loadUrl) {
    mainWindow.loadURL(loadUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      if (!hasShownTrayNotice) {
        hasShownTrayNotice = true;
        showLocalNotification(
          'KDVO 안전진단팀',
          '앱이 백그라운드에서 계속 실행 중입니다. 완전 종료는 트레이 아이콘의 "종료"를 사용하세요.'
        );
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, isDev ? '../public' : '../dist', 'tray-icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  tray.setToolTip(`KDVO 안전진단팀 ${app.getVersion()}`);
  tray.on('click', () => {
    focusStartupWindow();
  });
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '열기', click: () => { focusStartupWindow(); } },
      { label: '업데이트 확인', click: () => { void checkForAppUpdates(); focusStartupWindow(); } },
      { type: 'separator' },
      { label: '종료', click: () => { isQuitting = true; app.quit(); } },
    ])
  );
}

function initAutoUpdater(): void {
  if (isDev) {
    sendUpdateStatus({ status: 'not-available', message: '개발 모드로 실행 중입니다. 메인 화면을 엽니다.' });
    showMainWindowAfterMinimumSplash();
    return;
  }
  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ status: 'checking', message: '업데이트를 확인하는 중입니다…' });
  });
  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      status: 'available',
      version: info.version,
      message: `새 버전 ${info.version}을(를) 다운로드하는 중입니다…`,
    });
  });
  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({
      status: 'not-available',
      version: info.version,
      message: `현재 최신 버전(${info.version ?? app.getVersion()})을 사용 중입니다.`,
    });
    if (!startupFlowFinished) {
      showMainWindowAfterMinimumSplash();
    }
  });
  autoUpdater.on('download-progress', (progress) => {
    const progressPercent = Math.max(0, Math.min(100, Math.round(progress.percent)));
    sendUpdateStatus({
      status: 'downloading',
      progress: progressPercent,
      message: `업데이트 다운로드 중… ${progressPercent}%`,
    });
  });
  autoUpdater.on('update-downloaded', () => {
    sendUpdateStatus({
      status: 'downloaded',
      message: startupFlowFinished
        ? '새 버전이 준비되었습니다. 재시작하면 설치됩니다.'
        : '새 버전 준비가 완료되었습니다. 자동으로 재시작합니다…',
    });
    if (!startupFlowFinished) {
      setTimeout(() => {
        closeSplashWindow(); // 재시작 직전 스플래시 즉시 제거
        isQuitting = true;
        autoUpdater.quitAndInstall(false, true);
      }, 1200);
      return;
    }
    mainWindow?.webContents.send('update-downloaded');
  });
  autoUpdater.on('error', (err) => {
    console.error('Auto updater error:', err);
    sendUpdateStatus({ status: 'error', message: getUpdateErrorMessage(err) });
    if (!startupFlowFinished) {
      showMainWindowAfterMinimumSplash();
    }
  });
  void checkForAppUpdates();
  setInterval(() => {
    void checkForAppUpdates();
  }, 60 * 60 * 1000);
}

function startProdServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const distPath = path.join(__dirname, '../dist');
    prodServer = http.createServer((req, res) => {
      const urlPath = req.url === '/' || !req.url ? '/index.html' : req.url.split('?')[0];
      const safePath = path.normalize(urlPath.replace(/^\//, '')).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = path.join(distPath, safePath);
      if (!filePath.startsWith(distPath)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          if (urlPath.endsWith('/')) {
            const idxPath = path.join(filePath, 'index.html');
            fs.readFile(idxPath, (e2, d2) => {
              if (e2) {
                res.writeHead(404);
                res.end();
              } else {
                res.writeHead(200, { 'Content-Type': MIME['.html'] ?? 'text/html' });
                res.end(d2);
              }
            });
          } else {
            res.writeHead(404);
            res.end();
          }
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
        res.end(data);
      });
    });
    prodServer.listen(0, '127.0.0.1', () => {
      const addr = prodServer!.address();
      const port = typeof addr === 'object' && addr ? addr.port : 32123;
      resolve(`http://localhost:${port}/`);
    });
    prodServer.on('error', reject);
  });
}

app.whenReady().then(async () => {
  createSplashWindow();
  if (isDev) {
    createWindow();
    createTray();
    initAutoUpdater();
  } else {
    try {
      prodUrl = await startProdServer();
      createWindow(prodUrl);
      createTray();
      initAutoUpdater();
    } catch (err) {
      console.error('Prod server failed:', err);
      createWindow();
      createTray();
      initAutoUpdater();
    }
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (prodServer) {
    prodServer.close();
    prodServer = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 트레이로 최소화했으므로 앱은 유지
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow(prodUrl ?? undefined);
  focusStartupWindow();
});

ipcMain.handle('notification:show', (_event, title: string, body: string) => {
  showLocalNotification(title, body);
});

ipcMain.handle('getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('get-update-status', () => {
  return latestUpdateStatus;
});

/** 로그아웃 후 다른 계정으로 로그인할 수 있도록 Google/Firebase 인증 관련 쿠키·스토리지 삭제 */
ipcMain.handle('clearAuthCookies', (_event, authDomain?: string) => {
  const ses = session.defaultSession;
  const origins = ['https://accounts.google.com', 'https://www.google.com'];
  if (authDomain && typeof authDomain === 'string') {
    const origin = authDomain.startsWith('http') ? authDomain : `https://${authDomain}`;
    origins.push(origin);
  }
  const storages: Array<'cookies' | 'localstorage'> = ['cookies', 'localstorage'];
  return Promise.all(
    origins.map((origin) => ses.clearStorageData({ origin, storages }))
  );
});

ipcMain.handle('restart-and-install', () => {
  isQuitting = true;
  autoUpdater.quitAndInstall(false, true);
});
