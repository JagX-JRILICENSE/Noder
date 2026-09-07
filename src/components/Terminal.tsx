import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { v4 as uuidv4 } from 'uuid'
import 'xterm/css/xterm.css'

interface Props {
  visible: boolean
  cwd?: string | null
}

export default function Terminal({ visible, cwd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const sessionId = useRef(uuidv4())
  const [mode, setMode] = useState<'pty' | 'fallback' | 'loading'>('loading')

  useEffect(() => {
    if (!containerRef.current || termRef.current) return

    const term = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const webLinks = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinks)
    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitRef.current = fitAddon

    const start = async () => {
      if (window.electronAPI?.ptySpawn) {
        const result = await window.electronAPI.ptySpawn(sessionId.current, cwd || undefined)
        if (result.ok) {
          setMode('pty')
          term.writeln('\x1b[1;32m✓ Connected to system shell (node-pty)\x1b[0m')
          term.writeln('')

          // Forward input to PTY
          term.onData((data) => {
            window.electronAPI?.ptyWrite(sessionId.current, data)
          })

          // Receive output from PTY
          window.electronAPI.onPtyData(({ id, data }) => {
            if (id === sessionId.current) {
              term.write(data)
            }
          })

          window.electronAPI.onPtyExit(({ id }) => {
            if (id === sessionId.current) {
              term.writeln('\r\n\x1b[31m[Process exited]\x1b[0m')
            }
          })

          // Resize handling
          const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit()
            const dims = fitAddon.proposeDimensions()
            if (dims) {
              window.electronAPI?.ptyResize(sessionId.current, dims.cols, dims.rows)
            }
          })
          if (containerRef.current) resizeObserver.observe(containerRef.current)

          return
        }
      }

      // Fallback mode
      setMode('fallback')
      term.writeln('\x1b[1;36mNoder Terminal (fallback mode)\x1b[0m')
      term.writeln('node-pty is not available. Using simulated shell.')
      term.writeln('Run \x1b[33mnpm run rebuild\x1b[0m after installing build tools for full shell.')
      term.writeln('')
      term.write('$ ')

      let currentLine = ''
      term.onData((data) => {
        if (data === '\r') {
          term.write('\r\n')
          if (currentLine.trim()) handleFallbackCommand(term, currentLine.trim())
          currentLine = ''
          term.write('$ ')
        } else if (data === '\u007f') {
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1)
            term.write('\b \b')
          }
        } else if (data >= ' ') {
          currentLine += data
          term.write(data)
        }
      })
    }

    start()

    const onResize = () => fitAddon.fit()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      window.electronAPI?.ptyKill(sessionId.current)
      term.dispose()
      termRef.current = null
    }
  }, [])

  useEffect(() => {
    if (visible && fitRef.current) {
      setTimeout(() => {
        fitRef.current?.fit()
        const dims = fitRef.current?.proposeDimensions()
        if (dims && mode === 'pty') {
          window.electronAPI?.ptyResize(sessionId.current, dims.cols, dims.rows)
        }
      }, 50)
    }
  }, [visible, mode])

  return (
    <div className={`terminal-panel ${visible ? 'visible' : 'hidden'}`}>
      <div className="terminal-header">
        <span>TERMINAL</span>
        <span className="terminal-mode">
          {mode === 'pty' ? 'system shell' : mode === 'fallback' ? 'fallback' : 'starting…'}
        </span>
      </div>
      <div ref={containerRef} className="terminal-container" />
    </div>
  )
}

function handleFallbackCommand(term: XTerm, cmd: string) {
  const lower = cmd.toLowerCase()
  if (lower === 'help') {
    term.writeln('Demo commands: help, clear, version, echo <text>, about')
  } else if (lower === 'clear') {
    term.clear()
  } else if (lower === 'version') {
    term.writeln('Noder v0.3.0')
  } else if (lower === 'about') {
    term.writeln('Noder — Real-time collaborative editor by JagX & JRILICENSE')
  } else if (lower.startsWith('echo ')) {
    term.writeln(cmd.slice(5))
  } else {
    term.writeln(`\x1b[31mCommand not found: ${cmd}\x1b[0m`)
  }
}
