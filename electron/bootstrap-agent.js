/**
 * Optional: require this from dist-electron after main loads, or paste into main:
 *   require('./registerAgentIpc')(ipcMain, { getWin: () => win, getWorkspace: () => currentWorkspace })
 *
 * registerAgentIpc.js is already in this folder and registers:
 *   shell:exec | dialog:openImage | fs:copyFile
 */
module.exports = {
  wire(ipcMain, getWin, getWorkspace) {
    try {
      require('./registerAgentIpc')(ipcMain, { getWin, getWorkspace })
      console.log('[Noder] Agent IPC wired')
    } catch (e) {
      console.warn('[Noder] Agent IPC wire failed', e)
    }
  },
}
