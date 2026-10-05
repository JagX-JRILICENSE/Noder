/** Production entry: agent IPC then main bundle */
const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
try {
  require('./registerAgentIpc')(ipcMain, {
    getWin: () => BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0],
    getWorkspace: () => {
      try {
        const { app } = require('electron')
        const fs = require('fs')
        const p = path.join(app.getPath('userData'), 'noder-workspace.json')
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')).lastWorkspace || null
      } catch (e) {}
      return null
    },
    setWorkspace: () => {},
  })
} catch (e) {
  console.warn('[Noder] agent ipc', e)
}
require(path.join(__dirname, '../dist-electron/main.js'))
