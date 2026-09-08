import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, cpSync } from 'node:fs'
import os from 'node:os'
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process'
import { autoUpdater } from 'electron-updater'
import simpleGit, { SimpleGit } from 'simple-git'

let pty: typeof import('node-pty') | null = null
try {
  pty = require('node-pty')
} catch {
  console.warn('[Noder] node-pty not available — using child_process shell')
}

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null = null
let currentWorkspace: string | null = null

const ptySessions = new Map<string, any>()
const procSessions = new Map<string, ChildProcessWithoutNullStreams>()

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
  loadedExtensions.length = 0
  statusBarItems.length = 0

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
                    message: `Command ${cmd.command} executed`,
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

  const builtins: { id: string; title: string; category: string }[] = [
    { id: 'noder.openFolder', title: 'Open Folder', category: 'File' },
    { id: 'noder.saveFile', title: 'Save File', category: 'File' },
    { id: 'noder.toggleTerminal', title: 'Toggle Terminal', category: 'View' },
    { id: 'noder.togglePreview', title: 'Toggle Live Preview', category: 'View' },
    { id: 'noder.toggleFullscreen', title: 'Toggle Full Screen', category: 'View' },
    { id: 'noder.toggleCollab', title: 'Toggle Collaboration', category: 'Collaboration' },
    { id: 'noder.toggleGit', title: 'Toggle Git Panel', category: 'Git' },
    { id: 'noder.gitPush', title: 'Git: Push', category: 'Git' },
    { id: 'noder.gitPull', title: 'Git: Pull', category: 'Git' },
    { id: 'noder.toggleMarketplace', title: 'Open Extension Marketplace', category: 'Extensions' },
    { id: 'noder.toggleAI', title: 'Toggle AI Assistant', category: 'AI' },
    { id: 'noder.newGamePygame', title: 'New Game: Pygame Snake (desktop)', category: 'Games' },
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
  // Remove the light native menu bar — in-app UI already has File/Edit/etc.
  Menu.setApplicationMenu(null)

  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    title: 'Noder',
    backgroundColor: '#1e1e1e',
    show: false,
    autoHideMenuBar: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => {
    win?.show()
    win?.maximize()
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }
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
  for (const [id, meta] of commandMeta) list.push({ id, ...meta })
  return list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.title.localeCompare(b.title))
})

ipcMain.handle('extensions:executeCommand', async (_e, commandId: string, ...args: any[]) => {
  const handler = commandHandlers.get(commandId)
  if (!handler) return { ok: true, builtin: true, commandId }
  try {
    const result = await handler(...args)
    return { ok: true, result }
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) }
  }
})

ipcMain.handle('extensions:getStatusBarItems', () => statusBarItems)

ipcMain.handle('extensions:reload', () => {
  loadExtensions()
  return { ok: true, count: loadedExtensions.length }
})

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

ipcMain.handle('git:push', async (_e, cwd?: string) => {
  try {
    const git = getGit(cwd)
    if (!git) return { ok: false, error: 'No workspace' }
    const result = await git.push()
    return { ok: true, result: String(result) }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('git:pull', async (_e, cwd?: string) => {
  try {
    const git = getGit(cwd)
    if (!git) return { ok: false, error: 'No workspace' }
    const result = await git.pull()
    return { ok: true, summary: result.summary }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('pty:spawn', (_e, id: string, cwd?: string) => {
  if (ptySessions.has(id) || procSessions.has(id)) return { ok: true, mode: ptySessions.has(id) ? 'pty' : 'proc' }

  const workDir = cwd || currentWorkspace || os.homedir()
  const env = { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' } as NodeJS.ProcessEnv

  if (pty) {
    try {
      const shellCmd = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
      const term = pty.spawn(shellCmd, process.platform === 'win32' ? [] : ['-l'], {
        name: 'xterm-256color',
        cols: 100,
        rows: 30,
        cwd: workDir,
        env: env as any,
      })
      term.onData((data: string) => win?.webContents.send('pty:data', { id, data }))
      term.onExit(() => {
        ptySessions.delete(id)
        win?.webContents.send('pty:exit', { id })
      })
      ptySessions.set(id, term)
      return { ok: true, mode: 'pty' }
    } catch (err: any) {
      console.warn('[Noder] node-pty spawn failed, falling back to process shell', err)
    }
  }

  try {
    let child: ChildProcessWithoutNullStreams
    if (process.platform === 'win32') {
      child = spawn('powershell.exe', ['-NoLogo', '-NoExit'], {
        cwd: workDir,
        env,
        windowsHide: true,
      })
    } else {
      const sh = process.env.SHELL || '/bin/bash'
      child = spawn(sh, ['-i'], { cwd: workDir, env })
    }

    child.stdout.on('data', (buf: Buffer) => {
      win?.webContents.send('pty:data', { id, data: buf.toString('utf8') })
    })
    child.stderr.on('data', (buf: Buffer) => {
      win?.webContents.send('pty:data', { id, data: buf.toString('utf8') })
    })
    child.on('exit', () => {
      procSessions.delete(id)
      win?.webContents.send('pty:exit', { id })
    })
    child.on('error', (err) => {
      win?.webContents.send('pty:data', { id, data: `\r\n[shell error] ${err.message}\r\n` })
    })

    procSessions.set(id, child)
    return { ok: true, mode: 'proc' }
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) }
  }
})

ipcMain.on('pty:write', (_e, id: string, data: string) => {
  const p = ptySessions.get(id)
  if (p) {
    p.write(data)
    return
  }
  const c = procSessions.get(id)
  if (c && c.stdin.writable) {
    c.stdin.write(data)
  }
})

ipcMain.on('pty:resize', (_e, id: string, cols: number, rows: number) => {
  try {
    ptySessions.get(id)?.resize(cols, rows)
  } catch {}
})

ipcMain.handle('pty:kill', (_e, id: string) => {
  const p = ptySessions.get(id)
  if (p) {
    try { p.kill() } catch {}
    ptySessions.delete(id)
  }
  const c = procSessions.get(id)
  if (c) {
    try { c.kill() } catch {}
    procSessions.delete(id)
  }
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

ipcMain.handle('marketplace:list', async () => {
  const catalogPath = path.join(app.getAppPath(), 'marketplace', 'catalog.json')
  try {
    if (existsSync(catalogPath)) return JSON.parse(readFileSync(catalogPath, 'utf-8'))
  } catch {}
  return { extensions: [] }
})

ipcMain.handle('marketplace:install', async (_e, extensionId: string) => {
  try {
    const catalogPath = path.join(app.getAppPath(), 'marketplace', 'catalog.json')
    if (!existsSync(catalogPath)) return { ok: false, error: 'Catalog missing' }
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
    const item = (catalog.extensions || []).find((x: any) => x.id === extensionId)
    if (!item) return { ok: false, error: 'Extension not in catalog' }
    if (item.install === 'coming-soon') return { ok: false, error: 'Not available yet' }

    const userExtRoot = path.join(app.getPath('userData'), 'extensions')
    if (!existsSync(userExtRoot)) mkdirSync(userExtRoot, { recursive: true })
    const dest = path.join(userExtRoot, extensionId)

    const candidates = [
      path.join(app.getAppPath(), 'extensions', extensionId),
      path.join(app.getAppPath(), 'marketplace', 'templates', extensionId),
    ]
    let source: string | null = null
    for (const c of candidates) {
      if (existsSync(c)) { source = c; break }
    }

    if (source) {
      cpSync(source, dest, { recursive: true })
    } else {
      mkdirSync(dest, { recursive: true })
      writeFileSync(
        path.join(dest, 'package.json'),
        JSON.stringify(
          {
            name: item.id,
            displayName: item.name,
            version: item.version || '0.1.0',
            description: item.description || '',
            main: 'extension.js',
            contributes: {
              commands: [
                { command: `${item.id}.hello`, title: `Hello from ${item.name}`, category: item.name },
              ],
            },
          },
          null,
          2
        )
      )
      writeFileSync(
        path.join(dest, 'extension.js'),
        `exports.activate = function (api) {
  api.registerCommand('${item.id}.hello', function () {
    api.showMessage('Installed: ${item.name}');
  });
};
exports.deactivate = function () {};
`
      )
    }

    loadExtensions()
    return { ok: true, path: dest }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('project:scaffoldGame', async (_e, kind: string, targetDir?: string) => {
  try {
    const destRoot = targetDir || currentWorkspace
    if (!destRoot) return { ok: false, error: 'Open a folder first' }
    const name = 'pygame-snake'
    const dest = path.join(destRoot, name)
    const srcCandidates = [
      path.join(app.getAppPath(), 'templates', name),
      path.join(process.cwd(), 'templates', name),
    ]
    let src: string | null = null
    for (const c of srcCandidates) {
      if (existsSync(c)) { src = c; break }
    }
    if (src) {
      cpSync(src, dest, { recursive: true })
    } else {
      mkdirSync(dest, { recursive: true })
      writeFileSync(path.join(dest, 'README.md'), '# Snake\n\n```\npip install pygame\npython main.py\n```\n')
      writeFileSync(path.join(dest, 'main.py'), 'print("Copy full template from Noder repo templates/pygame-snake")\n')
    }
    return { ok: true, path: dest }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('window:toggleFullscreen', () => {
  if (!win) return false
  win.setFullScreen(!win.isFullScreen())
  return win.isFullScreen()
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
  for (const child of procSessions.values()) {
    try { child.kill() } catch {}
  }
  procSessions.clear()
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
