import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Dialogs
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // File system
  readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // App
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Extensions
  listExtensions: () => ipcRenderer.invoke('extensions:list'),

  // Menu events
  onMenuOpenFolder: (callback: () => void) => {
    ipcRenderer.on('menu-open-folder', callback)
  },
  onMenuNewTerminal: (callback: () => void) => {
    ipcRenderer.on('menu-new-terminal', callback)
  },

  // PTY (full terminal)
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
})
