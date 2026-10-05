import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { v4 as uuidv4 } from 'uuid'
import { Plus, X } from 'lucide-react'
import type { TerminalSession } from '../types'
import 'xterm/css/xterm.css'

interface Props { visible: boolean; cwd?: string | null }
interface SessionRuntime { id: string; term: XTerm; fit: FitAddon; container: HTMLDivElement; mode: 'pty' | 'proc' | 'fallback' }
export interface TerminalPanelHandle {
  runCommand: (cmd: string) => Promise<string>
  ensureVisibleSession: () => Promise<string | null>
}

const TerminalPanel = forwardRef<TerminalPanelHandle, Props>(function TerminalPanel({ visible, cwd }, ref) {
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const runtimes = useRef<Map<string, SessionRuntime>>(new Map())
  const hostRef = useRef<HTMLDivElement>(null)
  const dataHandlerAttached = useRef(false)
  const activeIdRef = useRef<string | null>(null)
  const sessionsRef = useRef<TerminalSession[]>([])
  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { sessionsRef.current = sessions }, [sessions])

  const createSession = useCallback(async () => {
    const id = uuidv4()
    const title = `Terminal ${sessionsRef.current.length + 1}`
    const container = document.createElement('div')
    container.style.height = '100%'; container.style.width = '100%'; container.style.display = 'none'
    const term = new XTerm({
      theme: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#ffffff', selectionBackground: '#264f78' },
      fontFamily: 'Consolas, "Courier New", monospace', fontSize: 13, cursorBlink: true, convertEol: true, allowProposedApi: true, scrollback: 8000,
    })
    const fit = new FitAddon()
    term.loadAddon(fit); term.loadAddon(new WebLinksAddon()); term.open(container)
    let mode: 'pty' | 'proc' | 'fallback' = 'fallback'
    if (window.electronAPI?.ptySpawn) {
      const result = await window.electronAPI.ptySpawn(id, cwd || undefined)
      if (result?.ok) {
        mode = (result.mode as 'pty' | 'proc') || 'proc'
        term.writeln(mode === 'pty' ? '\x1b[1;32m✓ Full system shell (node-pty)\x1b[0m\r\n' : '\x1b[1;32m✓ System shell connected\x1b[0m\r\n')
        term.onData((data) => window.electronAPI?.ptyWrite(id, data))
      }
    }
    if (mode === 'fallback') {
      term.writeln('\x1b[1;31mShell unavailable — agent will use shellExec fallback.\x1b[0m\r\n')
      term.write('$ ')
      let line = ''
      term.onData((data) => {
        if (data === '\r') { term.write('\r\n'); line = ''; term.write('$ ') }
        else if (data === '\u007f') { if (line.length) { line = line.slice(0, -1); term.write('\b \b') } }
        else if (data >= ' ') { line += data; term.write(data) }
      })
    }
    runtimes.current.set(id, { id, term, fit, container, mode })
    if (hostRef.current) hostRef.current.appendChild(container)
    setSessions((prev) => [...prev, { id, title }]); setActiveId(id)
    setTimeout(() => {
      container.style.display = 'block'; fit.fit()
      if (mode === 'pty' || mode === 'proc') { const dims = fit.proposeDimensions(); if (dims) window.electronAPI?.ptyResize(id, dims.cols, dims.rows) }
      term.focus()
    }, 30)
    return id
  }, [cwd])

  useEffect(() => {
    if (dataHandlerAttached.current || !window.electronAPI) return
    dataHandlerAttached.current = true
    window.electronAPI.onPtyData(({ id, data }) => { const rt = runtimes.current.get(id); if (rt) rt.term.write(data) })
    window.electronAPI.onPtyExit(({ id }) => { const rt = runtimes.current.get(id); if (rt) rt.term.writeln('\r\n\x1b[31m[Process exited]\x1b[0m') })
  }, [])

  useEffect(() => { if (visible && sessions.length === 0) createSession() }, [visible])
  useEffect(() => {
    runtimes.current.forEach((rt, id) => {
      rt.container.style.display = id === activeId ? 'block' : 'none'
      if (id === activeId) setTimeout(() => { rt.fit.fit(); if (rt.mode === 'pty' || rt.mode === 'proc') { const dims = rt.fit.proposeDimensions(); if (dims) window.electronAPI?.ptyResize(id, dims.cols, dims.rows) }; rt.term.focus() }, 20)
    })
  }, [activeId])

  const closeSession = (id: string) => {
    const rt = runtimes.current.get(id)
    if (rt) { window.electronAPI?.ptyKill(id); rt.term.dispose(); rt.container.remove(); runtimes.current.delete(id) }
    setSessions((prev) => { const next = prev.filter((s) => s.id !== id); if (activeId === id) setActiveId(next.length ? next[next.length - 1].id : null); return next })
  }

  useImperativeHandle(ref, () => ({
    async ensureVisibleSession() {
      let id = activeIdRef.current
      if (!id || !runtimes.current.has(id)) id = await createSession()
      return id
    },
    async runCommand(cmd: string) {
      let id = activeIdRef.current
      if (!id || !runtimes.current.has(id)) id = await createSession()
      const rt = runtimes.current.get(id!)
      if (!rt) {
        const res = await (window.electronAPI as any)?.shellExec?.(cmd, cwd || undefined)
        return res ? `${res.stdout || ''}${res.stderr ? '\n' + res.stderr : ''}` : 'no shell'
      }
      rt.term.writeln(`\r\n\x1b[1;36m▸ agent: ${cmd}\x1b[0m`)
      if ((rt.mode === 'pty' || rt.mode === 'proc') && window.electronAPI?.ptyWrite) {
        window.electronAPI.ptyWrite(id!, cmd + '\r')
        const res = await (window.electronAPI as any)?.shellExec?.(cmd, cwd || undefined)
        if (res) return `${res.stdout || ''}${res.stderr ? '\n' + res.stderr : ''}`.slice(0, 12000) || '(no output)'
        return `Sent to terminal: ${cmd}`
      }
      const res = await (window.electronAPI as any)?.shellExec?.(cmd, cwd || undefined)
      const out = res ? `${res.stdout || ''}${res.stderr ? '\n' + res.stderr : ''}` : 'shellExec unavailable'
      rt.term.write(out.replace(/\n/g, '\r\n') + '\r\n$ ')
      return out.slice(0, 12000)
    },
  }), [cwd, createSession])

  return (
    <div className={`terminal-panel ${visible ? 'visible' : 'hidden'}`}>
      <div className="terminal-tabs">
        <div className="terminal-tab-list">
          {sessions.map((s) => (
            <div key={s.id} className={`terminal-tab ${s.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(s.id)}>
              <span>{s.title}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); closeSession(s.id) }}><X size={12} /></button>
            </div>
          ))}
        </div>
        <button type="button" className="terminal-add" onClick={() => createSession()}><Plus size={14} /></button>
      </div>
      <div className="terminal-host" ref={hostRef} />
    </div>
  )
})

export default TerminalPanel
