import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Extensions
  listExtensions: () => ipcRenderer.invoke('extensions:list'),
  executeCommand: (commandId: string, ...args: any[]) =>
    ipcRenderer.invoke('extensions:executeCommand', commandId, ...args),
  getStatusBarItems: () => ipcRenderer.invoke('extensions:getStatusBarItems'),
  onExtensionMessage: (cb: (payload: { extensionId: string; message: string }) => void) => {
    ipcRenderer.on('extension:message', (_e, payload) => cb(payload))
  },

  // Menu
  onMenuOpenFolder: (callback: () => void) => {
    ipcRenderer.on('menu-open-folder', callback)
  },
  onMenuNewTerminal: (callback: () => void) => {
    ipcRenderer.on('menu-new-terminal', callback)
  },

  // PTY
  ptySpawn: (id: string, cwd?: string) => ipcRenderer.invoke('pty:spawn', id, cwd),
  ptyWrite: (id: string, data: string) => ipcRenderer.send('pty:write', id, data),
  ptyResize: (id: string, cols: number, rows: number) =>
    ipcRenderer.send('pty:resize', id, cols, rows),
  ptyKill: (id: string) => ipcRenderer.invoke('pty:kill', id),
  onPtyData: (callback: (payload: { id: string; data: string }) => void) => {
    ipcRenderer.on('pty:data', (_e, payload) => callback(payload))
  },
  onPtyExit: (callback: (payload: { id: string }) => void) => {
    ipcRenderer.on('pty:exit', (_e, payload) => callback(payload))
  },

  // Git
  gitStatus: (cwd?: string) => ipcRenderer.invoke('git:status', cwd),
  gitBlame: (filePath: string) => ipcRenderer.invoke('git:blame', filePath),

  // Updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdaterStatus: (cb: (payload: any) => void) => {
    ipcRenderer.on('updater:status', (_e, payload) => cb(payload))
  },
})
