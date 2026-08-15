const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nurDesktop', {
  notifyPrayer: (title, body) => ipcRenderer.invoke('prayer-notify', { title, body }),
  requestNotifyPermission: () => ipcRenderer.invoke('prayer-notify-permission')
});
