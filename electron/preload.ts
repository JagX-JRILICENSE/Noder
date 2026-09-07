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

  listExtensions: () => ipcRenderer.invoke('extensions:list'),
  listCommands: () => ipcRenderer.invoke('extensions:listCommands'),
  executeCommand: (commandId: string, ...args: any[]) =>
    ipcRenderer.invoke('extensions:executeCommand', commandId, ...args),
  getStatusBarItems: () => ipcRenderer.invoke('extensions:getStatusBarItems'),
  onExtensionMessage: (cb: (payload: { extensionId: string; message: string }) => void) => {
    ipcRenderer.on('extension:message', (_e, payload) => cb(payload))
  },

  onMenuOpenFolder: (callback: () => void) => {
    ipcRenderer.on('menu-open-folder', callback)
  },
  onMenuNewTerminal: (callback: () => void) => {
    ipcRenderer.on('menu-new-terminal', callback)
  },
  onMenuCommandPalette: (callback: () => void) => {
    ipcRenderer.on('menu-command-palette', callback)
  },

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

  gitStatus: (cwd?: string) => ipcRenderer.invoke('git:status', cwd),
  gitBlame: (filePath: string) => ipcRenderer.invoke('git:blame', filePath),
  gitStage: (files: string | string[], cwd?: string) =>
    ipcRenderer.invoke('git:stage', files, cwd),
  gitUnstage: (files: string | string[], cwd?: string) =>
    ipcRenderer.invoke('git:unstage', files, cwd),
  gitCommit: (message: string, cwd?: string) =>
    ipcRenderer.invoke('git:commit', message, cwd),
  gitDiff: (filePath?: string, cwd?: string) =>
    ipcRenderer.invoke('git:diff', filePath, cwd),

  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdaterStatus: (cb: (payload: any) => void) => {
    ipcRenderer.on('updater:status', (_e, payload) => cb(payload))
  },

  marketplaceList: () => ipcRenderer.invoke('marketplace:list'),
})
