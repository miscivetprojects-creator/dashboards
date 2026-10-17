const { contextBridge, ipcRenderer } = require('electron');
const pkg = require('./package.json');

contextBridge.exposeInMainWorld('civetDesktop', {
  platform: process.platform,
  version: pkg.version || '1.0.17',
  isElectron: true,
  ping: () => ipcRenderer.invoke('ping'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  autoUpdateAndRestart: () => ipcRenderer.invoke('auto-update-and-restart')
});
