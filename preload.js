const { contextBridge, ipcRenderer, webUtils } = require('electron');

let webCallback = null;

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion() {
    return ipcRenderer.invoke('version');
  },
  registerCallback(callback) {
    webCallback = callback;
  },
  execute(data) {
    return ipcRenderer.invoke('execute', data);
  },
  getFilePath(file) {
    return webUtils.getPathForFile(file);
  },
});

ipcRenderer.on('callback', (event, data) => {
  if (webCallback) {
    webCallback(data);
  }
});
