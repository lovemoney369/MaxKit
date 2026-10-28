const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('hahaimageOffice', Object.freeze({
  status: () => ipcRenderer.invoke('office:status'),
  install: () => ipcRenderer.invoke('office:install'),
  cancelInstall: () => ipcRenderer.invoke('office:install-cancel'),
  remove: () => ipcRenderer.invoke('office:remove'),
  onInstallProgress: callback => {
    const listener = (_event, progress) => callback(progress)
    ipcRenderer.on('office:install-progress', listener)
    return () => ipcRenderer.removeListener('office:install-progress', listener)
  },
  convert: payload => ipcRenderer.invoke('office:convert', payload),
  cancel: jobId => ipcRenderer.invoke('office:cancel', jobId),
  htmlToPdf: payload => ipcRenderer.invoke('document:html-to-pdf', payload),
}))

contextBridge.exposeInMainWorld('maxkitAi', Object.freeze({
  status: () => ipcRenderer.invoke('ai:status'),
  install: () => ipcRenderer.invoke('ai:install'),
  cancelInstall: () => ipcRenderer.invoke('ai:install-cancel'),
  remove: () => ipcRenderer.invoke('ai:remove'),
  onInstallProgress: callback => {
    const listener = (_event, progress) => callback(progress)
    ipcRenderer.on('ai:install-progress', listener)
    return () => ipcRenderer.removeListener('ai:install-progress', listener)
  },
}))
