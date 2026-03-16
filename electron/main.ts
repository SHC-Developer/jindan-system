import { app, BrowserWindow, Menu, ipcMain, nativeImage, session, Tray } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import http from 'http';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

if (isDev) {
  app.setPath('userData', path.join(os.tmpdir(), 'jindan-system-electron-dev'));
}
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let prodServer: http.Server | null = null;
let prodUrl: string | null = null;

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

function createWindow(loadUrl?: string): void {
  const iconPath = path.join(__dirname, isDev ? '../public' : '../dist', 'app-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 375,
    minHeight: 500,
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
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
  tray.setToolTip('KDVO 안전진단팀');
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '열기', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { type: 'separator' },
      { label: '종료', click: () => { isQuitting = true; app.quit(); } },
    ])
  );
}

function initAutoUpdater(): void {
  if (isDev) return;
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded');
  });
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
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
  else mainWindow.show();
});

ipcMain.handle('notification:show', (_event, title: string, body: string) => {
  try {
    new Notification(title, { body });
  } catch {
    // 알림 미지원 환경 무시
  }
});

ipcMain.handle('getVersion', () => {
  return app.getVersion();
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
  autoUpdater.quitAndInstall(false, true);
});
