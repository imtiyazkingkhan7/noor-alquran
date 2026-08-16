const { app, BrowserWindow, session } = require('electron');
const http = require('http');
const path = require('path');

const DEV_URL = 'http://127.0.0.1:4200/';
const JAR_URL = 'http://127.0.0.1:8080/';
const MUSHAF_PATH = 'read?para=1';

if (process.platform === 'win32') {
  app.setAppUserModelId('com.nur.alquran');
}

app.setPath('userData', path.join(app.getPath('appData'), 'NoorAlQuranDesktop'));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

function allowPermission(permission) {
  return permission === 'media' || permission === 'microphone';
}

function reachable(base) {
  return new Promise((resolve) => {
    const req = http.get(base, { timeout: 2000 }, (res) => {
      res.resume();
      resolve(!!res.statusCode && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function appUrl() {
  if (await reachable(DEV_URL)) {
    return DEV_URL + MUSHAF_PATH;
  }
  if (await reachable(JAR_URL)) {
    return JAR_URL + MUSHAF_PATH;
  }
  return DEV_URL + MUSHAF_PATH;
}

async function createWindow() {
  const ses = session.defaultSession;
  await ses.clearCache();
  await ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });

  const win = new BrowserWindow({
    width: 1680,
    height: 1080,
    minWidth: 1180,
    minHeight: 800,
    title: 'Noor — Al-Quran',
    backgroundColor: '#0f1a17',
    icon: path.join(__dirname, '..', 'public', 'noor-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const start = await appUrl();
  let fallbackTried = false;
  win.webContents.on('did-fail-load', (_event, _code, _desc, url, isMainFrame) => {
    if (!isMainFrame || fallbackTried) {
      return;
    }
    fallbackTried = true;
    const fallback = start.startsWith(DEV_URL) ? JAR_URL + MUSHAF_PATH : DEV_URL + MUSHAF_PATH;
    win.loadURL(fallback);
  });

  win.loadURL(start);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const existing = BrowserWindow.getAllWindows()[0];
    if (!existing) {
      return;
    }
    if (existing.isMinimized()) {
      existing.restore();
    }
    existing.show();
    existing.focus();
  });

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(allowPermission(permission));
    });
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => allowPermission(permission));

    void createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
