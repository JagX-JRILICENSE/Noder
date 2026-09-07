import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import os from 'node:os'

// Optional native module — may fail if not rebuilt for current Electron
let pty: typeof import('node-pty') | null = null
try {
  pty = require('node-pty')
} catch {
  console.warn('[Noder] node-pty not available — terminal will use fallback mode')
}

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null = null
let currentWorkspace: string | null = null

// Active PTY sessions keyed by id
const ptySessions = new Map<string, any>()

// Loaded extensions
interface NoderExtension {
  id: string
  name: string
  version: string
  description?: string
  activate?: (api: any) => void
}
const loadedExtensions: NoderExtension[] = []

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    title: 'Noder',
    backgroundColor: '#1e1e1e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => win?.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: () => win?.webContents.send('menu-open-folder'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Terminal',
      submenu: [
        {
          label: 'New Terminal',
          accelerator: 'Ctrl+Shift+`',
          click: () => win?.webContents.send('menu-new-terminal'),
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ---------- Extension system foundation ----------
function loadExtensions() {
  const extDirs = [
    path.join(app.getAppPath(), 'extensions'),
    path.join(app.getPath('userData'), 'extensions'),
  ]

  for (const dir of extDirs) {
    if (!existsSync(dir)) continue
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const manifestPath = path.join(dir, entry.name, 'package.json')
        if (!existsSync(manifestPath)) continue
        try {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
          const ext: NoderExtension = {
            id: manifest.name || entry.name,
            name: manifest.displayName || manifest.name || entry.name,
            version: manifest.version || '0.0.0',
            description: manifest.description,
          }
          // Simple activation: if main is specified, try to require (for future)
          loadedExtensions.push(ext)
          console.log(`[Noder] Loaded extension: ${ext.name} v${ext.version}`)
        } catch (e) {
          console.warn(`[Noder] Failed to load extension ${entry.name}`, e)
        }
      }
    } catch {}
  }
}

// ---------- IPC ----------
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
  if (result.canceled || !result.filePaths.length) return null
  currentWorkspace = result.filePaths[0]
  return currentWorkspace
})

ipcMain.handle('fs:readDir', async (_e, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(dirPath, e.name),
    }))
  } catch {
    return []
  }
})

ipcMain.handle('fs:readFile', async (_e, filePath: string) => {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
})

ipcMain.handle('fs:writeFile', async (_e, filePath: string, content: string) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('shell:openExternal', async (_e, url: string) => {
  await shell.openExternal(url)
})

ipcMain.handle('app:getVersion', () => app.getVersion())

ipcMain.handle('extensions:list', () => loadedExtensions)

// ---- node-pty Terminal ----
ipcMain.handle('pty:spawn', (_e, id: string, cwd?: string) => {
  if (!pty) {
    return { ok: false, error: 'node-pty not available' }
  }
  if (ptySessions.has(id)) {
    return { ok: true }
  }

  const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
  const cols = 80
  const rows = 24

  try {
    const term = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd: cwd || currentWorkspace || os.homedir(),
      env: process.env as any,
    })

    term.onData((data: string) => {
      win?.webContents.send('pty:data', { id, data })
    })

    term.onExit(() => {
      ptySessions.delete(id)
      win?.webContents.send('pty:exit', { id })
    })

    ptySessions.set(id, term)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) }
  }
})

ipcMain.on('pty:write', (_e, id: string, data: string) => {
  const term = ptySessions.get(id)
  if (term) term.write(data)
})

ipcMain.on('pty:resize', (_e, id: string, cols: number, rows: number) => {
  const term = ptySessions.get(id)
  if (term) term.resize(cols, rows)
})

ipcMain.handle('pty:kill', (_e, id: string) => {
  const term = ptySessions.get(id)
  if (term) {
    term.kill()
    ptySessions.delete(id)
  }
  return true
})

app.whenReady().then(() => {
  loadExtensions()
  createWindow()
})

app.on('window-all-closed', () => {
  // Clean up PTYs
  for (const term of ptySessions.values()) {
    try { term.kill() } catch {}
  }
  ptySessions.clear()

  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
