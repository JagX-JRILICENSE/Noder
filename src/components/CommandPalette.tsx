import { useState, useEffect, useRef, useMemo } from 'react'

export interface PaletteCommand {
  id: string
  title: string
  category?: string
  source?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onExecute: (id: string) => void
}

const HISTORY_KEY = 'noder-command-history'
const MAX_HISTORY = 12

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function pushHistory(id: string) {
  const prev = loadHistory().filter((x) => x !== id)
  const next = [id, ...prev].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

export default function CommandPalette({ open, onClose, onExecute }: Props) {
  const [query, setQuery] = useState('')
  const [commands, setCommands] = useState<PaletteCommand[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    setHistory(loadHistory())
    window.electronAPI?.listCommands?.().then((list) => {
      setCommands(list || [])
    }).catch(() => setCommands([]))
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = commands
    if (q) {
      list = commands.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.category || '').toLowerCase().includes(q)
      )
    } else if (history.length) {
      // Recent first when no query
      const map = new Map(commands.map((c) => [c.id, c]))
      const recent = history.map((id) => map.get(id)).filter(Boolean) as PaletteCommand[]
      const rest = commands.filter((c) => !history.includes(c.id))
      list = [...recent, ...rest]
    }
    return list
  }, [commands, query, history])

  useEffect(() => {
    setSelected(0)
  }, [query])

  if (!open) return null

  const run = (id: string) => {
    pushHistory(id)
    onExecute(id)
    onClose()
  }

  return (
    <div className="modal-overlay palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSelected((s) => Math.min(s + 1, filtered.length - 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSelected((s) => Math.max(s - 1, 0))
            }
            if (e.key === 'Enter' && filtered[selected]) {
              run(filtered[selected].id)
            }
          }}
        />
        {!query && history.length > 0 && (
          <div className="palette-section-label">Recent</div>
        )}
        <div className="palette-list">
          {filtered.length === 0 && (
            <div className="palette-empty">No commands found</div>
          )}
          {filtered.slice(0, 50).map((cmd, i) => (
            <div
              key={cmd.id}
              className={`palette-item ${i === selected ? 'selected' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => run(cmd.id)}
            >
              <span className="palette-title">{cmd.title}</span>
              <span className="palette-meta">
                {!query && history.includes(cmd.id) && i < history.length && (
                  <span className="palette-recent">recent</span>
                )}
                {cmd.category && <span className="palette-cat">{cmd.category}</span>}
              </span>
            </div>
          ))}
        </div>
        <div className="palette-footer">
          <kbd>↑</kbd><kbd>↓</kbd> navigate
          <kbd>Enter</kbd> run
          <kbd>Esc</kbd> close
        </div>
      </div>
    </div>
  )
}
