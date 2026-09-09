import { useState, useEffect, useCallback } from 'react'
import {
  Folder, FolderOpen, FileCode, ChevronRight, ChevronDown,
  FilePlus, FolderPlus, RefreshCw, Trash2,
} from 'lucide-react'
import type { FileEntry } from '../types'

interface Props {
  workspace: string | null
  onOpenFile: (path: string, name: string) => void
  activePath?: string
  onWorkspaceFolder?: (folder: string) => void
  refreshKey?: number
}

function TreeNode({
  entry,
  depth,
  onOpenFile,
  activePath,
  onRefresh,
  onDelete,
}: {
  entry: FileEntry
  depth: number
  onOpenFile: (path: string, name: string) => void
  activePath?: string
  onRefresh: () => void
  onDelete: (path: string, isDir: boolean) => void
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const [children, setChildren] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)

  const loadChildren = useCallback(async () => {
    if (!window.electronAPI || !entry.isDirectory) return
    setLoading(true)
    const entries = await window.electronAPI.readDir(entry.path)
    entries.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
      return a.isDirectory ? -1 : 1
    })
    setChildren(entries)
    setLoading(false)
  }, [entry.path, entry.isDirectory])

  useEffect(() => {
    if (entry.isDirectory && expanded) loadChildren()
  }, [expanded, loadChildren])

  const isActive = activePath === entry.path

  if (entry.isDirectory) {
    return (
      <div>
        <div
          className={`tree-item ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(e) => {
            e.preventDefault()
            if (confirm(`Delete folder "${entry.name}"?`)) onDelete(entry.path, true)
          }}
        >
          <span className="chevron">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {expanded ? <FolderOpen size={16} className="icon folder" /> : <Folder size={16} className="icon folder" />}
          <span className="name">{entry.name}</span>
        </div>
        {expanded && (
          <div>
            {loading && <div className="tree-loading" style={{ paddingLeft: 24 + depth * 12 }}>Loading...</div>}
            {children.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onOpenFile={onOpenFile}
                activePath={activePath}
                onRefresh={onRefresh}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`tree-item file ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: 8 + depth * 12 }}
      onClick={() => onOpenFile(entry.path, entry.name)}
      onContextMenu={(e) => {
        e.preventDefault()
        if (confirm(`Delete "${entry.name}"?`)) onDelete(entry.path, false)
      }}
    >
      <span className="chevron-placeholder" />
      <FileCode size={16} className="icon file" />
      <span className="name">{entry.name}</span>
    </div>
  )
}

export default function FileExplorer({ workspace, onOpenFile, activePath, onWorkspaceFolder, refreshKey }: Props) {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([])
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => {
    if (workspace && window.electronAPI) {
      window.electronAPI.readDir(workspace).then((entries) => {
        entries.sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
          return a.isDirectory ? -1 : 1
        })
        setRootEntries(entries)
      })
    } else setRootEntries([])
  }, [workspace])

  useEffect(() => { reload() }, [workspace, refreshKey, tick, reload])

  const createFile = async () => {
    if (!workspace || !window.electronAPI) return
    const name = prompt('New file name (e.g. main.py, src/app.js):')
    if (!name?.trim()) return
    const rel = name.trim().replace(/^[/\\]+/, '')
    const full = `${workspace.replace(/\\/g, '/')}/${rel}`
    const ok = await window.electronAPI.writeFile(full, '')
    if (ok) {
      setTick((t) => t + 1)
      onOpenFile(full, rel.split(/[/\\]/).pop() || rel)
    } else alert('Could not create file')
  }

  const createFolder = async () => {
    if (!workspace || !(window.electronAPI as any)?.mkdir) return
    const name = prompt('New folder name (e.g. src, assets/images):')
    if (!name?.trim()) return
    const rel = name.trim().replace(/^[/\\]+/, '')
    const full = `${workspace.replace(/\\/g, '/')}/${rel}`
    const ok = await (window.electronAPI as any).mkdir(full)
    if (ok) setTick((t) => t + 1)
    else alert('Could not create folder')
  }

  const onDelete = async (path: string, isDir: boolean) => {
    if (!(window.electronAPI as any)?.deletePath) return
    const ok = await (window.electronAPI as any).deletePath(path)
    if (ok) setTick((t) => t + 1)
    else alert('Delete failed')
  }

  return (
    <div className="file-explorer">
      <div className="sidebar-header">
        <span>EXPLORER</span>
        {workspace && (
          <span className="workspace-name" title={workspace}>
            {workspace.split(/[/\\]/).pop()}
          </span>
        )}
      </div>

      {workspace && (
        <div className="explorer-toolbar">
          <button title="New File" onClick={createFile}><FilePlus size={14} /></button>
          <button title="New Folder" onClick={createFolder}><FolderPlus size={14} /></button>
          <button title="Refresh" onClick={() => setTick((t) => t + 1)}><RefreshCw size={14} /></button>
        </div>
      )}

      {!workspace ? (
        <div className="empty-state">
          <p>No folder opened</p>
          <button
            className="btn-primary"
            onClick={async () => {
              if (window.electronAPI) {
                const folder = await window.electronAPI.openFolder()
                if (folder) onWorkspaceFolder?.(folder)
              }
            }}
          >
            Open Folder
          </button>
        </div>
      ) : (
        <div className="tree">
          {rootEntries.map((entry) => (
            <TreeNode
              key={entry.path + tick}
              entry={entry}
              depth={0}
              onOpenFile={onOpenFile}
              activePath={activePath}
              onRefresh={() => setTick((t) => t + 1)}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
