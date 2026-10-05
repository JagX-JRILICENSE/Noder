/** Register agent shell + device image IPC. Called from main.ts */
module.exports = function registerAgentIpc(ipcMain, opts) {
  const { spawn } = require('node:child_process')
  const path = require('node:path')
  const fs = require('node:fs/promises')
  const { dialog } = require('electron')

  ipcMain.handle('shell:exec', async (_e, command, cwd) => {
    return new Promise((resolve) => {
      const workDir = cwd || (opts.getWorkspace && opts.getWorkspace()) || process.cwd()
      const isWin = process.platform === 'win32'
      const child = spawn(
        isWin ? 'powershell.exe' : process.env.SHELL || 'bash',
        isWin ? ['-NoProfile', '-Command', command] : ['-lc', command],
        { cwd: workDir, env: process.env, windowsHide: true }
      )
      let out = ''
      let err = ''
      const max = 200000
      child.stdout && child.stdout.on('data', (d) => { if (out.length < max) out += d.toString('utf8') })
      child.stderr && child.stderr.on('data', (d) => { if (err.length < max) err += d.toString('utf8') })
      const timer = setTimeout(() => {
        try { child.kill() } catch (e) {}
        resolve({ ok: false, stdout: out, stderr: err + '\n(timeout)', code: -1 })
      }, 120000)
      child.on('close', (code) => {
        clearTimeout(timer)
        resolve({ ok: code === 0, stdout: out, stderr: err, code: code == null ? 1 : code })
      })
      child.on('error', (e) => {
        clearTimeout(timer)
        resolve({ ok: false, stdout: out, stderr: String(e), code: 1 })
      })
    })
  })

  ipcMain.handle('dialog:openImage', async () => {
    const win = opts.getWin && opts.getWin()
    if (!win) return null
    const res = await dialog.showOpenDialog(win, {
      title: 'Add image to project',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'] },
        { name: 'All', extensions: ['*'] },
      ],
    })
    if (res.canceled || !res.filePaths.length) return null
    return res.filePaths
  })

  ipcMain.handle('fs:copyFile', async (_e, from, to) => {
    try {
      await fs.mkdir(path.dirname(to), { recursive: true })
      await fs.copyFile(from, to)
      return true
    } catch (e) {
      return false
    }
  })
}
