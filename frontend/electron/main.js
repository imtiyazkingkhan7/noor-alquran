const { app, BrowserWindow, screen, session } = require('electron');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const DEV_URL = 'http://127.0.0.1:4200/';
const JAR_URL = 'http://127.0.0.1:8080/';
const LIVE_URL = 'https://noor-alquran.onrender.com/';
const MUSHAF_PATH = 'read?para=1';
const WIN32_IA32 = process.platform === 'win32' && process.arch === 'ia32';

function mushafUrl(base) {
  return base + MUSHAF_PATH;
}

function gpuFlagPath() {
  return path.join(app.getPath('userData'), 'disable-gpu');
}

function shouldDisableGpu() {
  if (WIN32_IA32) {
    return true;
  }
  try {
    return fs.existsSync(gpuFlagPath());
  } catch {
    return false;
  }
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.nur.alquran');
}

app.setPath('userData', path.join(app.getPath('appData'), 'NoorAlQuranDesktop'));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

if (WIN32_IA32) {
  // 32-bit Windows PCs are typically low-RAM with old GPUs. Cap V8 and skip
  // hardware compositing so Chromium can start on Intel GMA / early HD graphics.
  const heapMb = Math.max(256, Math.min(768, Math.floor(os.totalmem() / (1024 * 1024 * 4))));
  app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${heapMb}`);
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,HardwareMediaKeyHandling');
}

if (shouldDisableGpu()) {
  app.disableHardwareAcceleration();
}

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
  if (!app.isPackaged && await reachable(DEV_URL)) {
    return mushafUrl(DEV_URL);
  }
  if (await reachable(JAR_URL)) {
    return mushafUrl(JAR_URL);
  }
  return mushafUrl(LIVE_URL);
}

function nextFallback(failedUrl) {
  if (failedUrl.startsWith(DEV_URL)) {
    return mushafUrl(JAR_URL);
  }
  if (failedUrl.startsWith(JAR_URL)) {
    return mushafUrl(LIVE_URL);
  }
  return null;
}

function windowBounds() {
  const { width: workW, height: workH } = screen.getPrimaryDisplay().workAreaSize;
  return {
    width: Math.min(1680, workW),
    height: Math.min(1080, workH),
    minWidth: Math.min(WIN32_IA32 ? 800 : 1024, workW),
    minHeight: Math.min(WIN32_IA32 ? 560 : 700, workH),
    maximize: workW < 1280 || workH < 800
  };
}

function persistGpuFallback() {
  try {
    fs.writeFileSync(gpuFlagPath(), '1');
  } catch {
    // ignore
  }
}

async function createWindow() {
  const ses = session.defaultSession;
  await ses.clearCache();
  await ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });

  const bounds = windowBounds();
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: bounds.minWidth,
    minHeight: bounds.minHeight,
    show: false,
    title: 'Noor — Al-Quran',
    backgroundColor: '#0f1a17',
    icon: path.join(__dirname, '..', 'public', 'noor-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: !WIN32_IA32
    }
  });

  win.once('ready-to-show', () => {
    if (bounds.maximize) {
      win.maximize();
    }
    win.show();
  });

  const start = await appUrl();
  const tried = new Set([start]);
  win.webContents.on('did-fail-load', (_event, _code, _desc, url, isMainFrame) => {
    if (!isMainFrame) {
      return;
    }
    const fallback = nextFallback(url || start);
    if (!fallback || tried.has(fallback)) {
      return;
    }
    tried.add(fallback);
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

  app.on('child-process-gone', (_event, details) => {
    if (details.type !== 'GPU' || shouldDisableGpu()) {
      return;
    }
    persistGpuFallback();
    app.relaunch();
    app.exit(0);
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
