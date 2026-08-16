const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const DEV_URL = 'http://127.0.0.1:4200/';
const JAR_URL = 'http://127.0.0.1:8080/';

if (process.platform === 'win32') {
  app.setAppUserModelId('com.nur.alquran');
}

app.setPath('userData', path.join(app.getPath('appData'), 'NoorAlQuranDesktop'));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function allowPermission(permission) {
  return permission === 'media' || permission === 'microphone';
}

function createWindow() {
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

  let fallbackTried = false;
  win.webContents.on('did-fail-load', (_event, _code, _desc, url, isMainFrame) => {
    if (!isMainFrame || fallbackTried || !url.startsWith(DEV_URL)) {
      return;
    }
    fallbackTried = true;
    win.loadURL(JAR_URL);
  });

  win.loadURL(DEV_URL);
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

    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
