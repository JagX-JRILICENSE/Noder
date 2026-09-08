import { useEffect, useState } from 'react'
import { GitCompare } from 'lucide-react'

interface Props {
  workspace: string | null
  filePath: string | null
  visible: boolean
  onClose: () => void
  onOpenFile?: (path: string, name: string) => void
}

export default function DiffViewer({ workspace, filePath, visible, onClose, onOpenFile }: Props) {
  const [diff, setDiff] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible || !workspace) return
    setLoading(true)
    window.electronAPI
      ?.gitDiff?.(filePath || undefined, workspace)
      .then((d) => setDiff(d || 'No changes'))
      .finally(() => setLoading(false))
  }, [visible, workspace, filePath])

  if (!visible) return null

  const lines = (diff || '').split('\n')

  return (
    <div className="diff-panel">
      <div className="diff-header">
        <div className="diff-title">
          <GitCompare size={14} />
          <span>Changes {filePath ? `· ${filePath}` : '(all)'}</span>
        </div>
        <div className="diff-actions">
          {filePath && onOpenFile && (
            <button
              className="btn-small"
              onClick={() => onOpenFile(filePath.includes('/') || filePath.includes('\\') ? `${workspace}/${filePath}`.replace(/\\/g, '/') : `${workspace}/${filePath}`, filePath.split(/[/\\]/).pop() || filePath)}
            >
              Edit file
            </button>
          )}
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="diff-body">
        {loading && <div className="gh-loading">Loading diff…</div>}
        {!loading && lines.map((line, i) => {
          let cls = 'diff-line'
          if (line.startsWith('+') && !line.startsWith('+++')) cls += ' add'
          else if (line.startsWith('-') && !line.startsWith('---')) cls += ' del'
          else if (line.startsWith('@@')) cls += ' hunk'
          return (
            <div key={i} className={cls}>
              {line || ' '}
            </div>
          )
        })}
      </div>
    </div>
  )
}
