import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import os from 'node:os'
import { autoUpdater } from 'electron-updater'
import simpleGit, { SimpleGit } from 'simple-git'

let pty: typeof import('node-pty') | null = null
try {
  pty = require('node-pty')
} catch {
  console.warn('[Noder] node-pty not available — terminal fallback mode')
}

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null = null
let currentWorkspace: string | null = null
const ptySessions = new Map<string, any>()

interface ExtensionCommand {
  command: string
  title: string
  category?: string
}

interface ExtensionContribution {
  commands?: ExtensionCommand[]
  menus?: Record<string, any[]>
  statusBar?: { id: string; text: string; command?: string }[]
}

interface NoderExtension {
  id: string
  name: string
  version: string
  description?: string
  path: string
  contributes: ExtensionContribution
  activate?: (api: ExtensionAPI) => void | Promise<void>
  deactivate?: () => void
}

interface ExtensionAPI {
  registerCommand: (id: string, handler: (...args: any[]) => any) => void
  getWorkspace: () => string | null
  showMessage: (msg: string) => void
  executeCommand: (id: string, ...args: any[]) => Promise<any>
}

const loadedExtensions: NoderExtension[] = []
const commandHandlers = new Map<string, (...args: any[]) => any>()
const commandMeta = new Map<string, { title: string; category?: string; source: string }>()
const statusBarItems: { id: string; text: string; command?: string; extensionId: string }[] = []

function createExtensionAPI(ext: NoderExtension): ExtensionAPI {
  return {
    registerCommand(id, handler) {
      commandHandlers.set(id, handler)
    },
    getWorkspace() {
      return currentWorkspace
    },
    showMessage(msg) {
      win?.webContents.send('extension:message', { extensionId: ext.id, message: msg })
    },
    async executeCommand(id, ...args) {
      const handler = commandHandlers.get(id)
      if (!handler) throw new Error(`Command not found: ${id}`)
      return handler(...args)
    },
  }
}

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
        const extPath = path.join(dir, entry.name)
        const manifestPath = path.join(extPath, 'package.json')
        if (!existsSync(manifestPath)) continue

        try {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
          const contributes: ExtensionContribution = manifest.contributes || {}
          const extId = manifest.name || entry.name

          if (contributes.commands) {
            for (const cmd of contributes.commands) {
              commandMeta.set(cmd.command, {
                title: cmd.title,
                category: cmd.category || extId,
                source: extId,
              })
              if (!commandHandlers.has(cmd.command)) {
                commandHandlers.set(cmd.command, () => {
                  win?.webContents.send('extension:message', {
                    extensionId: extId,
                    message: `Command ${cmd.command} executed (no handler yet)`,
                  })
                })
              }
            }
          }

          if (contributes.statusBar) {
            for (const item of contributes.statusBar) {
              statusBarItems.push({ ...item, extensionId: extId })
            }
          }

          const ext: NoderExtension = {
            id: extId,
            name: manifest.displayName || manifest.name || entry.name,
            version: manifest.version || '0.0.0',
            description: manifest.description,
            path: extPath,
            contributes,
          }

          const mainFile = manifest.main || 'extension.js'
          const mainPath = path.join(extPath, mainFile)
          if (existsSync(mainPath)) {
            try {
              delete require.cache[require.resolve(mainPath)]
              const mod = require(mainPath)
              if (typeof mod.activate === 'function') {
                ext.activate = mod.activate
                Promise.resolve(mod.activate(createExtensionAPI(ext))).catch((e: any) =>
                  console.warn(`[Noder] Extension ${ext.id} activate error:`, e)
                )
              }
              if (typeof mod.deactivate === 'function') ext.deactivate = mod.deactivate
            } catch (e) {
              console.warn(`[Noder] Failed to activate ${ext.id}:`, e)
            }
          }

          loadedExtensions.push(ext)
          console.log(`[Noder] Loaded extension: ${ext.name} v${ext.version}`)
        } catch (e) {
          console.warn(`[Noder] Failed to load extension ${entry.name}`, e)
        }
      }
    } catch {}
  }

  // Built-in commands for command palette
  const builtins: { id: string; title: string; category: string }[] = [
    { id: 'noder.openFolder', title: 'Open Folder', category: 'File' },
    { id: 'noder.toggleTerminal', title: 'Toggle Terminal', category: 'View' },
    { id: 'noder.togglePreview', title: 'Toggle Live Preview', category: 'View' },
    { id: 'noder.toggleCollab', title: 'Toggle Collaboration', category: 'Collaboration' },
    { id: 'noder.toggleGit', title: 'Toggle Git Panel', category: 'Git' },
    { id: 'noder.toggleMarketplace', title: 'Open Extension Marketplace', category: 'Extensions' },
    { id: 'noder.saveFile', title: 'Save File', category: 'File' },
    { id: 'noder.checkUpdates', title: 'Check for Updates', category: 'Help' },
  ]
  for (const b of builtins) {
    commandMeta.set(b.id, { title: b.title, category: b.category, source: 'noder' })
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => win?.webContents.send('updater:status', { status: 'checking' }))
  autoUpdater.on('update-available', (info) => win?.webContents.send('updater:status', { status: 'available', info }))
  autoUpdater.on('update-not-available', () => win?.webContents.send('updater:status', { status: 'not-available' }))
  autoUpdater.on('download-progress', (progress) => win?.webContents.send('updater:status', { status: 'downloading', progress }))
  autoUpdater.on('update-downloaded', (info) => win?.webContents.send('updater:status', { status: 'downloaded', info }))
  autoUpdater.on('error', (err) => win?.webContents.send('updater:status', { status: 'error', message: err.message }))
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000)
}

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
        { label: 'Open Folder...', accelerator: 'CmdOrCtrl+O', click: () => win?.webContents.send('menu-open-folder') },
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
        { label: 'Command Palette...', accelerator: 'CmdOrCtrl+Shift+P', click: () => win?.webContents.send('menu-command-palette') },
        { type: 'separator' },
        { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Terminal',
      submenu: [
        { label: 'New Terminal', accelerator: 'Ctrl+Shift+`', click: () => win?.webContents.send('menu-new-terminal') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            if (app.isPackaged) autoUpdater.checkForUpdates()
            else win?.webContents.send('updater:status', { status: 'error', message: 'Updates only in packaged builds' })
          },
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
  if (result.canceled || !result.filePaths.length) return null
  currentWorkspace = result.filePaths[0]
  return currentWorkspace
})

ipcMain.handle('fs:readDir', async (_e, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory(), path: path.join(dirPath, e.name) }))
  } catch {
    return []
  }
})

ipcMain.handle('fs:readFile', async (_e, filePath: string) => {
  try { return await fs.readFile(filePath, 'utf-8') } catch { return null }
})

ipcMain.handle('fs:writeFile', async (_e, filePath: string, content: string) => {
  try { await fs.writeFile(filePath, content, 'utf-8'); return true } catch { return false }
})

ipcMain.handle('shell:openExternal', async (_e, url: string) => { await shell.openExternal(url) })
ipcMain.handle('app:getVersion', () => app.getVersion())

ipcMain.handle('extensions:list', () =>
  loadedExtensions.map((e) => ({
    id: e.id, name: e.name, version: e.version, description: e.description, contributes: e.contributes,
  }))
)

ipcMain.handle('extensions:listCommands', () => {
  const list: { id: string; title: string; category?: string; source: string }[] = []
  for (const [id, meta] of commandMeta) {
    list.push({ id, ...meta })
  }
  return list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.title.localeCompare(b.title))
})

ipcMain.handle('extensions:executeCommand', async (_e, commandId: string, ...args: any[]) => {
  const handler = commandHandlers.get(commandId)
  if (!handler) {
    // Built-in commands are handled in renderer
    return { ok: true, builtin: true, commandId }
  }
  try {
    const result = await handler(...args)
    return { ok: true, result }
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) }
  }
})

ipcMain.handle('extensions:getStatusBarItems', () => statusBarItems)

function getGit(cwd?: string): SimpleGit | null {
  const root = cwd || currentWorkspace
  if (!root) return null
  return simpleGit(root)
}

ipcMain.handle('git:status', async (_e, cwd?: string) => {
  try {
    const git = getGit(cwd)
    if (!git) return null
    const status = await git.status()
    return {
      current: status.current,
      tracking: status.tracking,
      ahead: status.ahead,
      behind: status.behind,
      files: status.files.map((f) => ({ path: f.path, index: f.index, working_dir: f.working_dir })),
      isClean: status.isClean(),
    }
  } catch {
    return null
  }
})

ipcMain.handle('git:blame', async (_e, filePath: string) => {
  try {
    const dir = path.dirname(filePath)
    const git = simpleGit(dir)
    const result = await git.raw(['blame', '--line-porcelain', filePath])
    const lines: { line: number; hash: string; author: string; summary: string }[] = []
    let current: any = {}
    let lineNum = 0
    for (const row of result.split('\n')) {
      if (/^[0-9a-f]{40}/.test(row)) current = { hash: row.slice(0, 8) }
      else if (row.startsWith('author ')) current.author = row.slice(7)
      else if (row.startsWith('summary ')) current.summary = row.slice(8)
      else if (row.startsWith('\t')) {
        lineNum++
        lines.push({ line: lineNum, hash: current.hash || '00000000', author: current.author || 'Unknown', summary: current.summary || '' })
      }
    }
    return lines
  } catch {
    return []
  }
})

ipcMain.handle('git:stage', async (_e, files: string | string[], cwd?: string) => {
  try {
    const git = getGit(cwd)
    if (!git) return { ok: false, error: 'No workspace' }
    await git.add(files)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('git:unstage', async (_e, files: string | string[], cwd?: string) => {
  try {
    const git = getGit(cwd)
    if (!git) return { ok: false, error: 'No workspace' }
    await git.reset(['HEAD', '--', ...(Array.isArray(files) ? files : [files])])
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('git:commit', async (_e, message: string, cwd?: string) => {
  try {
    const git = getGit(cwd)
    if (!git) return { ok: false, error: 'No workspace' }
    if (!message?.trim()) return { ok: false, error: 'Empty commit message' }
    const result = await git.commit(message.trim())
    return { ok: true, commit: result.commit }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('git:diff', async (_e, filePath?: string, cwd?: string) => {
  try {
    const git = getGit(cwd)
    if (!git) return null
    if (filePath) return await git.diff(['--', filePath])
    return await git.diff()
  } catch {
    return null
  }
})

ipcMain.handle('pty:spawn', (_e, id: string, cwd?: string) => {
  if (!pty) return { ok: false, error: 'node-pty not available' }
  if (ptySessions.has(id)) return { ok: true }
  const shellCmd = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
  try {
    const term = pty.spawn(shellCmd, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: cwd || currentWorkspace || os.homedir(),
      env: process.env as any,
    })
    term.onData((data: string) => win?.webContents.send('pty:data', { id, data }))
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

ipcMain.on('pty:write', (_e, id: string, data: string) => { ptySessions.get(id)?.write(data) })
ipcMain.on('pty:resize', (_e, id: string, cols: number, rows: number) => {
  try { ptySessions.get(id)?.resize(cols, rows) } catch {}
})
ipcMain.handle('pty:kill', (_e, id: string) => {
  const term = ptySessions.get(id)
  if (term) { try { term.kill() } catch {} ptySessions.delete(id) }
  return true
})

ipcMain.handle('updater:check', async () => {
  if (!app.isPackaged) return { ok: false, message: 'Only in packaged builds' }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { ok: true, result }
  } catch (e: any) {
    return { ok: false, message: e.message }
  }
})

ipcMain.handle('updater:install', () => { autoUpdater.quitAndInstall(false, true) })

// Marketplace catalog (local skeleton)
ipcMain.handle('marketplace:list', async () => {
  const catalogPath = path.join(app.getAppPath(), 'marketplace', 'catalog.json')
  try {
    if (existsSync(catalogPath)) {
      return JSON.parse(readFileSync(catalogPath, 'utf-8'))
    }
  } catch {}
  return { extensions: [] }
})

app.whenReady().then(() => {
  loadExtensions()
  createWindow()
  setupAutoUpdater()
})

app.on('window-all-closed', () => {
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
