import { useState, useEffect } from 'react'
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown } from 'lucide-react'
import type { FileEntry } from '../types'

interface Props {
  workspace: string | null
  onOpenFile: (path: string, name: string) => void
  activePath?: string
}

function TreeNode({
  entry,
  depth,
  onOpenFile,
  activePath,
}: {
  entry: FileEntry
  depth: number
  onOpenFile: (path: string, name: string) => void
  activePath?: string
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const [children, setChildren] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (entry.isDirectory && expanded && children.length === 0) {
      loadChildren()
    }
  }, [expanded])

  async function loadChildren() {
    if (!window.electronAPI) return
    setLoading(true)
    const entries = await window.electronAPI.readDir(entry.path)
    // Sort: folders first, then files
    entries.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
      return a.isDirectory ? -1 : 1
    })
    setChildren(entries)
    setLoading(false)
  }

  const isActive = activePath === entry.path

  if (entry.isDirectory) {
    return (
      <div>
        <div
          className={`tree-item ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => setExpanded(!expanded)}
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
    >
      <span className="chevron-placeholder" />
      <FileCode size={16} className="icon file" />
      <span className="name">{entry.name}</span>
    </div>
  )
}

export default function FileExplorer({ workspace, onOpenFile, activePath }: Props) {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([])

  useEffect(() => {
    if (workspace && window.electronAPI) {
      window.electronAPI.readDir(workspace).then((entries) => {
        entries.sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
          return a.isDirectory ? -1 : 1
        })
        setRootEntries(entries)
      })
    } else {
      setRootEntries([])
    }
  }, [workspace])

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

      {!workspace ? (
        <div className="empty-state">
          <p>No folder opened</p>
          <button
            className="btn-primary"
            onClick={async () => {
              if (window.electronAPI) {
                const folder = await window.electronAPI.openFolder()
                if (folder) {
                  // Parent will handle via prop update; we emit via custom event for simplicity
                  window.dispatchEvent(new CustomEvent('noder-open-folder', { detail: folder }))
                }
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
              key={entry.path}
              entry={entry}
              depth={0}
              onOpenFile={onOpenFile}
              activePath={activePath}
            />
          ))}
        </div>
      )}
    </div>
  )
}
