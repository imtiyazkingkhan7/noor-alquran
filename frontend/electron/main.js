const { app, BrowserWindow, Notification, ipcMain, session } = require('electron');
const path = require('path');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.nur.alquran');
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function allowPermission(permission) {
  return permission === 'geolocation'
    || permission === 'notifications'
    || permission === 'media'
    || permission === 'microphone';
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
  win.loadURL('http://127.0.0.1:4200/');
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(allowPermission(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => allowPermission(permission));

  ipcMain.handle('prayer-notify', (_event, payload) => {
    if (!Notification.isSupported()) {
      return false;
    }
    const note = new Notification({
      title: payload?.title || 'Noor',
      body: payload?.body || '',
      silent: true
    });
    note.show();
    return true;
  });

  ipcMain.handle('prayer-notify-permission', () => Notification.isSupported());

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
