const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('civetDesktop', {
  platform: process.platform,
  version: '1.0.7',
  isElectron: true,
  ping: () => ipcRenderer.invoke('ping'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  autoUpdateAndRestart: () => ipcRenderer.invoke('auto-update-and-restart')
});
