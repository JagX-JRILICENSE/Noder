import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null = null
let currentWorkspace: string | null = null

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

  win.once('ready-to-show', () => {
    win?.show()
  })

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }

  // Simple application menu
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
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// --- IPC Handlers ---

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  currentWorkspace = result.filePaths[0]
  return currentWorkspace
})

ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(dirPath, e.name),
    }))
  } catch (err) {
    console.error('readDir error', err)
    return []
  }
})

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content
  } catch (err) {
    console.error('readFile error', err)
    return null
  }
})

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch (err) {
    console.error('writeFile error', err)
    return false
  }
})

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url)
})

ipcMain.handle('app:getVersion', () => app.getVersion())

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
