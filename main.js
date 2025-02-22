const { app, BrowserWindow, ipcMain, protocol } = require('electron/main');
const path = require('node:path');
const { execute } = require('./func');
const fs = require('node:fs').promises;

let win; // BrowserWindow

const isDev = process.argv.includes('dev');

const titleMessage = app.getLocale().startsWith('en')
  ? 'Loading may take some time, please be patient.'
  : '加载可能需要一些时间，请耐心等待。';

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

  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'local-file',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
      },
    },
  ]);

  const createWindow = () => {
    win = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        spellcheck: false,
      },
      autoHideMenuBar: true,
      title: titleMessage,
    });

    if (!isDev) {
      win.loadURL('https://yuanwei.site');
    } else {
      win.loadURL('http://localhost:5173');
      win.webContents.openDevTools();
    }
  };

  app.whenReady().then(() => {
    process.chdir(app.getPath('userData'));

    protocol.handle('local-file', async (request) => {
      let path = request.url.substring(13);
      if (process.platform === 'win32') {
        path = path.replace('/', ':/');
      }
      const data = await fs.readFile(path);
      return new Response(data);
    });

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
