import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { v4 as uuidv4 } from 'uuid'
import { Plus, X } from 'lucide-react'
import type { TerminalSession } from '../types'
import 'xterm/css/xterm.css'

interface Props {
  visible: boolean
  cwd?: string | null
  onRequestNew?: () => void
}

interface SessionRuntime {
  id: string
  term: XTerm
  fit: FitAddon
  container: HTMLDivElement
  mode: 'pty' | 'fallback'
}

export default function TerminalPanel({ visible, cwd }: Props) {
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const runtimes = useRef<Map<string, SessionRuntime>>(new Map())
  const hostRef = useRef<HTMLDivElement>(null)
  const dataHandlerAttached = useRef(false)

  const createSession = useCallback(async () => {
    const id = uuidv4()
    const title = `Terminal ${sessions.length + 1}`

    // Create container
    const container = document.createElement('div')
    container.style.height = '100%'
    container.style.width = '100%'
    container.style.display = 'none'

    const term = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
      allowProposedApi: true,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(container)

    let mode: 'pty' | 'fallback' = 'fallback'

    if (window.electronAPI?.ptySpawn) {
      const result = await window.electronAPI.ptySpawn(id, cwd || undefined)
      if (result.ok) {
        mode = 'pty'
        term.writeln('\x1b[1;32m✓ System shell connected\x1b[0m\r\n')
        term.onData((data) => window.electronAPI?.ptyWrite(id, data))
      }
    }

    if (mode === 'fallback') {
      term.writeln('\x1b[1;36mNoder Terminal (fallback)\x1b[0m')
      term.writeln('node-pty unavailable. Run npm run rebuild for full shell.\r\n')
      term.write('$ ')
      let line = ''
      term.onData((data) => {
        if (data === '\r') {
          term.write('\r\n')
          if (line.trim() === 'clear') term.clear()
          else if (line.trim()) term.writeln(`\x1b[90m(fallback) ${line}\x1b[0m`)
          line = ''
          term.write('$ ')
        } else if (data === '\u007f') {
          if (line.length) {
            line = line.slice(0, -1)
            term.write('\b \b')
          }
        } else if (data >= ' ') {
          line += data
          term.write(data)
        }
      })
    }

    runtimes.current.set(id, { id, term, fit, container, mode })

    if (hostRef.current) {
      hostRef.current.appendChild(container)
    }

    setSessions((prev) => [...prev, { id, title }])
    setActiveId(id)

    // Show this one
    setTimeout(() => {
      container.style.display = 'block'
      fit.fit()
      if (mode === 'pty') {
        const dims = fit.proposeDimensions()
        if (dims) window.electronAPI?.ptyResize(id, dims.cols, dims.rows)
      }
      term.focus()
    }, 30)

    return id
  }, [sessions.length, cwd])

  // Attach global PTY data/exit once
  useEffect(() => {
    if (dataHandlerAttached.current || !window.electronAPI) return
    dataHandlerAttached.current = true

    window.electronAPI.onPtyData(({ id, data }) => {
      const rt = runtimes.current.get(id)
      if (rt) rt.term.write(data)
    })
    window.electronAPI.onPtyExit(({ id }) => {
      const rt = runtimes.current.get(id)
      if (rt) rt.term.writeln('\r\n\x1b[31m[Process exited]\x1b[0m')
    })
  }, [])

  // Create first session when panel becomes visible
  useEffect(() => {
    if (visible && sessions.length === 0) {
      createSession()
    }
  }, [visible])

  // Switch visible terminal
  useEffect(() => {
    runtimes.current.forEach((rt, id) => {
      rt.container.style.display = id === activeId ? 'block' : 'none'
      if (id === activeId) {
        setTimeout(() => {
          rt.fit.fit()
          if (rt.mode === 'pty') {
            const dims = rt.fit.proposeDimensions()
            if (dims) window.electronAPI?.ptyResize(id, dims.cols, dims.rows)
          }
          rt.term.focus()
        }, 20)
      }
    })
  }, [activeId])

  // Resize on panel show
  useEffect(() => {
    if (!visible || !activeId) return
    const rt = runtimes.current.get(activeId)
    if (!rt) return
    setTimeout(() => {
      rt.fit.fit()
      if (rt.mode === 'pty') {
        const dims = rt.fit.proposeDimensions()
        if (dims) window.electronAPI?.ptyResize(activeId, dims.cols, dims.rows)
      }
    }, 50)
  }, [visible, activeId])

  const closeSession = (id: string) => {
    const rt = runtimes.current.get(id)
    if (rt) {
      window.electronAPI?.ptyKill(id)
      rt.term.dispose()
      rt.container.remove()
      runtimes.current.delete(id)
    }
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (activeId === id) {
        setActiveId(next.length ? next[next.length - 1].id : null)
      }
      return next
    })
  }

  return (
    <div className={`terminal-panel ${visible ? 'visible' : 'hidden'}`}>
      <div className="terminal-header">
        <div className="terminal-tabs">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`terminal-tab ${s.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(s.id)}
            >
              <span>{s.title}</span>
              <X
                size={12}
                className="terminal-tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  closeSession(s.id)
                }}
              />
            </div>
          ))}
          <button className="terminal-new" title="New Terminal" onClick={() => createSession()}>
            <Plus size={14} />
          </button>
        </div>
      </div>
      <div ref={hostRef} className="terminal-container" />
    </div>
  )
}
