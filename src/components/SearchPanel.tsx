import { useState } from 'react'
import { Search } from 'lucide-react'

interface Hit {
  path: string
  name: string
  line: number
  preview: string
}

interface Props {
  workspace: string | null
  visible: boolean
  onOpenFile: (path: string, name: string) => void
}

export default function SearchPanel({ workspace, visible, onOpenFile }: Props) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!visible) return null

  const run = async () => {
    if (!workspace || !query.trim() || !window.electronAPI) return
    setBusy(true)
    setError(null)
    const found: Hit[] = []
    const q = query.toLowerCase()

    async function walk(dir: string, depth = 0) {
      if (depth > 6 || found.length > 80) return
      const entries = await window.electronAPI!.readDir(dir)
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist' || e.name === 'release') continue
        if (e.isDirectory) {
          await walk(e.path, depth + 1)
        } else if (/\.(ts|tsx|js|jsx|json|md|css|html|py|rs|go|txt)$/i.test(e.name)) {
          const content = await window.electronAPI!.readFile(e.path)
          if (!content) continue
          const lines = content.split('\n')
          lines.forEach((line, i) => {
            if (found.length > 80) return
            if (line.toLowerCase().includes(q)) {
              found.push({
                path: e.path,
                name: e.name,
                line: i + 1,
                preview: line.trim().slice(0, 120),
              })
            }
          })
        }
      }
    }

    try {
      await walk(workspace)
      setHits(found)
      if (!found.length) setError('No matches')
    } catch (e: any) {
      setError(e.message || 'Search failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="side-panel search-panel">
      <div className="side-panel-header">
        <Search size={14} />
        <span>SEARCH</span>
      </div>
      <div className="search-box">
        <input
          placeholder="Search in files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
        />
        <button className="btn-small" disabled={busy || !workspace} onClick={run}>
          {busy ? '…' : 'Search'}
        </button>
      </div>
      {!workspace && <div className="git-empty-sm">Open a folder to search.</div>}
      {error && <div className="git-empty-sm">{error}</div>}
      <div className="search-results">
        {hits.map((h, i) => (
          <div
            key={`${h.path}:${h.line}:${i}`}
            className="search-hit"
            onClick={() => onOpenFile(h.path, h.name)}
          >
            <div className="search-hit-file">{h.name}<span>:{h.line}</span></div>
            <div className="search-hit-preview">{h.preview}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
