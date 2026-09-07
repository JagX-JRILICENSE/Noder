export interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
}

export interface OpenTab {
  id: string
  path: string
  name: string
  content: string
  language: string
  isDirty: boolean
}

export interface NoderExtension {
  id: string
  name: string
  version: string
  description?: string
  contributes?: {
    commands?: { command: string; title: string; category?: string }[]
    statusBar?: { id: string; text: string; command?: string }[]
  }
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description: string | null
  default_branch: string
  language: string | null
  stargazers_count: number
  updated_at: string
}

export interface GitStatus {
  current: string | null
  tracking: string | null
  ahead: number
  behind: number
  files: { path: string; index: string; working_dir: string }[]
  isClean: boolean
}

export interface BlameLine {
  line: number
  hash: string
  author: string
  summary: string
}

export interface TerminalSession {
  id: string
  title: string
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string
      openFolder: () => Promise<string | null>
      readDir: (dirPath: string) => Promise<FileEntry[]>
      readFile: (filePath: string) => Promise<string | null>
      writeFile: (filePath: string, content: string) => Promise<boolean>
      openExternal: (url: string) => Promise<void>
      getVersion: () => Promise<string>
      listExtensions: () => Promise<NoderExtension[]>
      listCommands: () => Promise<{ id: string; title: string; category?: string; source: string }[]>
      executeCommand: (commandId: string, ...args: any[]) => Promise<{ ok: boolean; result?: any; error?: string; builtin?: boolean; commandId?: string }>
      getStatusBarItems: () => Promise<{ id: string; text: string; command?: string; extensionId: string }[]>
      onExtensionMessage: (cb: (payload: { extensionId: string; message: string }) => void) => void
      onMenuOpenFolder: (callback: () => void) => void
      onMenuNewTerminal: (callback: () => void) => void
      onMenuCommandPalette: (callback: () => void) => void
      ptySpawn: (id: string, cwd?: string) => Promise<{ ok: boolean; error?: string }>
      ptyWrite: (id: string, data: string) => void
      ptyResize: (id: string, cols: number, rows: number) => void
      ptyKill: (id: string) => Promise<boolean>
      onPtyData: (callback: (payload: { id: string; data: string }) => void) => void
      onPtyExit: (callback: (payload: { id: string }) => void) => void
      gitStatus: (cwd?: string) => Promise<GitStatus | null>
      gitBlame: (filePath: string) => Promise<BlameLine[]>
      gitStage: (files: string | string[], cwd?: string) => Promise<{ ok: boolean; error?: string }>
      gitUnstage: (files: string | string[], cwd?: string) => Promise<{ ok: boolean; error?: string }>
      gitCommit: (message: string, cwd?: string) => Promise<{ ok: boolean; commit?: string; error?: string }>
      gitDiff: (filePath?: string, cwd?: string) => Promise<string | null>
      checkForUpdates: () => Promise<{ ok: boolean; message?: string }>
      installUpdate: () => Promise<void>
      onUpdaterStatus: (cb: (payload: any) => void) => void
      marketplaceList: () => Promise<{ extensions: any[] }>
    }
  }
}

export {}
