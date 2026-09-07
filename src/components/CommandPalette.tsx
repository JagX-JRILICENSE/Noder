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

export default function CommandPalette({ open, onClose, onExecute }: Props) {
  const [query, setQuery] = useState('')
  const [commands, setCommands] = useState<PaletteCommand[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    window.electronAPI?.listCommands?.().then((list) => {
      setCommands(list || [])
    }).catch(() => setCommands([]))
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
    )
  }, [commands, query])

  useEffect(() => {
    setSelected(0)
  }, [query])

  if (!open) return null

  const run = (id: string) => {
    onExecute(id)
    onClose()
  }

  return (
    <div className="modal-overlay palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Type a command..."
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
