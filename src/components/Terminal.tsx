import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

interface Props {
  visible: boolean
}

export default function Terminal({ visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current || termRef.current) return

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
    })

    const fitAddon = new FitAddon()
    const webLinks = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinks)

    term.open(containerRef.current)
    fitAddon.fit()

    term.writeln('\x1b[1;36mNoder Terminal\x1b[0m  —  by JagX & JRILICENSE')
    term.writeln('Type commands below (local simulation for now).')
    term.writeln('')
    term.write('$ ')

    // Simple echo shell for demo (real shell requires node-pty + native module)
    let currentLine = ''
    term.onData((data) => {
      if (data === '\r') {
        // Enter
        term.write('\r\n')
        if (currentLine.trim()) {
          handleCommand(term, currentLine.trim())
        }
        currentLine = ''
        term.write('$ ')
      } else if (data === '\u007f') {
        // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1)
          term.write('\b \b')
        }
      } else if (data >= ' ') {
        currentLine += data
        term.write(data)
      }
    })

    termRef.current = term
    fitRef.current = fitAddon

    const onResize = () => fitAddon.fit()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      term.dispose()
      termRef.current = null
    }
  }, [])

  useEffect(() => {
    if (visible && fitRef.current) {
      setTimeout(() => fitRef.current?.fit(), 50)
    }
  }, [visible])

  return (
    <div className={`terminal-panel ${visible ? 'visible' : 'hidden'}`}>
      <div className="terminal-header">
        <span>TERMINAL</span>
      </div>
      <div ref={containerRef} className="terminal-container" />
    </div>
  )
}

function handleCommand(term: XTerm, cmd: string) {
  const lower = cmd.toLowerCase()
  if (lower === 'help') {
    term.writeln('Available demo commands: help, clear, version, echo <text>, about')
  } else if (lower === 'clear') {
    term.clear()
  } else if (lower === 'version') {
    term.writeln('Noder v0.2.0')
  } else if (lower === 'about') {
    term.writeln('Noder — Real-time collaborative editor by JagX & JRILICENSE')
  } else if (lower.startsWith('echo ')) {
    term.writeln(cmd.slice(5))
  } else {
    term.writeln(`\x1b[31mCommand not found: ${cmd}\x1b[0m`)
    term.writeln('(Full shell support coming with node-pty)')
  }
}
