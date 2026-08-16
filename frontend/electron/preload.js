const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('nurDesktop', {
  isDesktop: true
});
