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
      onMenuOpenFolder: (callback: () => void) => void
    }
  }
}

export {}
