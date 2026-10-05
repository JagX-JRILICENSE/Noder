/** Agent shell + image IPC + workspace persistence for Noder */
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs/promises')
const fssync = require('node:fs')
const { dialog, app } = require('electron')

function workspaceStorePath() {
  try {
    return path.join(app.getPath('userData'), 'noder-workspace.json')
  } catch {
    return null
  }
}

function loadWorkspaceState() {
  try {
    const p = workspaceStorePath()
    if (!p || !fssync.existsSync(p)) return { lastWorkspace: null, recent: [] }
    return JSON.parse(fssync.readFileSync(p, 'utf-8'))
  } catch {
    return { lastWorkspace: null, recent: [] }
  }
}

function saveWorkspaceState(state) {
  try {
    const p = workspaceStorePath()
    if (!p) return false
    fssync.mkdirSync(path.dirname(p), { recursive: true })
    fssync.writeFileSync(p, JSON.stringify(state, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}

module.exports = function registerAgentIpc(ipcMain, opts) {
  const getWin = () => (opts.getWin ? opts.getWin() : null)
  const getWorkspace = () => (opts.getWorkspace ? opts.getWorkspace() : null)
  const setWorkspace = (p) => {
    if (opts.setWorkspace) opts.setWorkspace(p)
  }

  ipcMain.handle('shell:exec', async (_e, command, cwd) => {
    return new Promise((resolve) => {
      const workDir = cwd || getWorkspace() || process.cwd()
      const isWin = process.platform === 'win32'
      const child = spawn(
        isWin ? 'powershell.exe' : process.env.SHELL || 'bash',
        isWin ? ['-NoProfile', '-Command', command] : ['-lc', command],
        { cwd: workDir, env: process.env, windowsHide: true }
      )
      let out = ''
      let err = ''
      const max = 200000
      if (child.stdout) child.stdout.on('data', (d) => { if (out.length < max) out += d.toString('utf8') })
      if (child.stderr) child.stderr.on('data', (d) => { if (err.length < max) err += d.toString('utf8') })
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
    const win = getWin()
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

  ipcMain.handle('workspace:save', async (_e, folderPath) => {
    if (!folderPath) return false
    setWorkspace(folderPath)
    const state = loadWorkspaceState()
    state.lastWorkspace = folderPath
    const recent = (state.recent || []).filter((r) => r !== folderPath)
    recent.unshift(folderPath)
    state.recent = recent.slice(0, 12)
    return saveWorkspaceState(state)
  })

  ipcMain.handle('workspace:getLast', async () => {
    const state = loadWorkspaceState()
    const last = state.lastWorkspace
    if (last && fssync.existsSync(last)) return { path: last, recent: state.recent || [] }
    return { path: null, recent: (state.recent || []).filter((p) => fssync.existsSync(p)) }
  })

  ipcMain.handle('workspace:listRecent', async () => {
    const state = loadWorkspaceState()
    return (state.recent || []).filter((p) => fssync.existsSync(p))
  })
}
