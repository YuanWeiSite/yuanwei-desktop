const { app, BrowserWindow, ipcMain } = require('electron/main');
const path = require('node:path');
const { execute } = require('./func');

let win; // BrowserWindow

let isDev = process.argv.includes('dev');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  const createWindow = () => {
    win = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
      autoHideMenuBar: true,
      title: 'Yuanwei Desktop',
    });

    if (!isDev) {
      win.loadURL('https://desktop.yuanwei.site');
    } else {
      win.loadURL('http://localhost:5173');
      win.webContents.openDevTools();
    }
  };

  app.whenReady().then(() => {
    process.chdir(app.getPath('userData'));

    ipcMain.handle('execute', (event, data) => {
      return execute(data, callback);
    });
    ipcMain.handle('version', () => {
      return app.getVersion();
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  function callback(data) {
    win.webContents.send('callback', data);
  }
}
