const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('nurDesktop', {
  isDesktop: true
});

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('desktop');
});
