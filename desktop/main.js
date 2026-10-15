const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let serverInstance = null;
const BACKEND_PORT = process.env.PORT || 5000;
const SERVER_URL = `http://localhost:${BACKEND_PORT}`;

function checkBackendAlive() {
  return new Promise((resolve) => {
    const req = http.get(`${SERVER_URL}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function resolveBackendServer() {
  const possiblePaths = [
    path.join(__dirname, 'backend', 'server.js'),
    path.join(process.resourcesPath || '', 'backend', 'server.js'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'backend', 'server.js'),
    path.join(__dirname, '..', 'backend', 'server.js')
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (e) {}
  }
  return null;
}

let lastBackendInitError = null;

async function ensureBackendRunning() {
  const isAlive = await checkBackendAlive();
  if (isAlive) {
    return true;
  }

  const backendScript = resolveBackendServer();
  if (!backendScript) {
    lastBackendInitError = new Error('Embedded backend script not found in packaged resources.');
    return false;
  }

  try {
    const backendModule = require(backendScript);
    if (backendModule && typeof backendModule.startServer === 'function') {
      serverInstance = await backendModule.startServer(BACKEND_PORT);
      return true;
    }
  } catch (err) {
    lastBackendInitError = err;
    console.error('Failed to initialize embedded backend:', err);
  }

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const ready = await checkBackendAlive();
    if (ready) {
      return true;
    }
  }

  return false;
}

function createWindow() {
  const appIconPath = path.join(__dirname, 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'CIVET DASHBOARDS — Management MIS',
    icon: appIconPath,
    backgroundColor: '#0F2A4A',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { label: 'Toggle Developer Tools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('trigger-update-check');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About Civet MIS',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Civet MIS',
              message: 'CIVET DASHBOARDS — Management MIS\nVersion: 1.0.1\nCivet Projects Private Limited'
            });
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  mainWindow.loadURL(SERVER_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(SERVER_URL);
      }
    }, 1500);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  ipcMain.handle('open-external', async (event, url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  ipcMain.handle('auto-update-and-restart', async () => {
    const tempDir = app.getPath('temp');
    const updateExe = path.join(tempDir, `Civet_MIS_Setup_Update_${Date.now()}.exe`);
    const updateUrl = `${SERVER_URL}/api/updates/download`;

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(updateExe);
      const req = http.get(updateUrl, (res) => {
        if (res.statusCode !== 200) {
          fileStream.close();
          try { fs.unlinkSync(updateExe); } catch (e) {}
          return reject(new Error('Update download failed with HTTP status ' + res.statusCode));
        }
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(async () => {
            try {
              const { spawn } = require('child_process');
              const child = spawn(updateExe, ['/S'], {
                detached: true,
                stdio: 'ignore'
              });
              child.unref();

              child.on('error', () => {
                shell.openPath(updateExe);
              });

              setTimeout(() => {
                app.quit();
              }, 800);
              resolve({ success: true });
            } catch (err) {
              try {
                await shell.openPath(updateExe);
                setTimeout(() => {
                  app.quit();
                }, 800);
                resolve({ success: true });
              } catch (openErr) {
                reject(openErr);
              }
            }
          });
        });
      });

      req.on('error', (err) => {
        fileStream.close();
        try { fs.unlinkSync(updateExe); } catch (e) {}
        reject(err);
      });

      req.setTimeout(60000, () => {
        req.destroy();
        fileStream.close();
        try { fs.unlinkSync(updateExe); } catch (e) {}
        reject(new Error('Update download timed out.'));
      });
    });
  });

  const started = await ensureBackendRunning();
  if (!started) {
    const isNowAlive = await checkBackendAlive();
    if (!isNowAlive) {
      const detailMsg = lastBackendInitError ? ('\n\nDiagnostic: ' + (lastBackendInitError.stack || lastBackendInitError.message)) : '';
      dialog.showErrorBox(
        'Server Initialization Note',
        'Could not connect to the local MIS service. Please ensure internet access is available for the database.' + detailMsg
      );
    }
  }

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

app.on('will-quit', () => {
  if (serverInstance && typeof serverInstance.close === 'function') {
    try {
      serverInstance.close();
    } catch (e) {}
  }
});
