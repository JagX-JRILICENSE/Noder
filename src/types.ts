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
      onMenuOpenFolder: (callback: () => void) => void
      onMenuNewTerminal: (callback: () => void) => void
      // PTY
      ptySpawn: (id: string, cwd?: string) => Promise<{ ok: boolean; error?: string }>
      ptyWrite: (id: string, data: string) => void
      ptyResize: (id: string, cols: number, rows: number) => void
      ptyKill: (id: string) => Promise<boolean>
      onPtyData: (callback: (payload: { id: string; data: string }) => void) => void
      onPtyExit: (callback: (payload: { id: string }) => void) => void
    }
  }
}

export {}
