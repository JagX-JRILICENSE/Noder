/** Restore last opened project folder so users can come back to their work. */

export async function restoreLastWorkspace(): Promise<string | null> {
  try {
    const api = window.electronAPI as any
    if (!api?.workspaceGetLast) return null
    const res = await api.workspaceGetLast()
    if (res?.path) return res.path as string
    return null
  } catch {
    return null
  }
}

export async function saveWorkspace(folderPath: string): Promise<void> {
  try {
    await (window.electronAPI as any)?.workspaceSave?.(folderPath)
  } catch {}
}

export async function listRecentWorkspaces(): Promise<string[]> {
  try {
    const list = await (window.electronAPI as any)?.workspaceListRecent?.()
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
