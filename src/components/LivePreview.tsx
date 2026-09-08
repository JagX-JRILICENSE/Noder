import { useEffect, useRef } from 'react'

interface Props {
  content: string
  language: string
  visible: boolean
}

export default function LivePreview({ content, language, visible }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!visible || !iframeRef.current) return

    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    const lang = (language || '').toLowerCase()
    const trimmed = content.trim()
    let html = ''

    if (lang === 'html' || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      html = content
    } else if (lang === 'svg' || trimmed.startsWith('<svg')) {
      html = `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1e1e1e}</style></head><body>${content}</body></html>`
    } else if (lang === 'css') {
      html = `<!DOCTYPE html><html><head><style>${content}</style></head>
<body>
  <div class="card demo">
    <h1>CSS Preview</h1>
    <p>Sample content styled by your CSS.</p>
    <button>Button</button>
    <ul><li>Item one</li><li>Item two</li></ul>
  </div>
</body></html>`
    } else if (lang === 'json') {
      let pretty = content
      try { pretty = JSON.stringify(JSON.parse(content), null, 2) } catch {}
      html = shellPage(`<pre class="code">${escapeHtml(pretty)}</pre>`)
    } else if (lang === 'markdown' || lang === 'md') {
      html = shellPage(simpleMarkdown(content))
    } else if (['javascript', 'js', 'typescript', 'ts', 'jsx', 'tsx'].includes(lang)) {
      // Strip TS-ish types roughly for browser run
      const runnable = content
        .replace(/^import\s+.+;?$/gm, '')
        .replace(/^export\s+/gm, '')
      html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body{font-family:Consolas,monospace;background:#1e1e1e;color:#ccc;margin:0;padding:12px}
  #stage{border:1px solid #333;background:#111;margin-bottom:8px}
  #out{white-space:pre-wrap;font-size:12px}
  .err{color:#f48771}
</style></head>
<body>
<canvas id="stage" width="480" height="320"></canvas>
<pre id="out"></pre>
<script>
(function(){
  const out = document.getElementById('out');
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const log = (...args) => { out.textContent += args.map(a => typeof a === 'object' ? JSON.stringify(a,null,2) : String(a)).join(' ') + '\\n'; };
  console.log = log; console.error = (...a)=>{ out.innerHTML += '<span class="err">'+a.join(' ')+'</span>\\n'; }; console.warn = log;
  window.canvas = canvas; window.ctx = ctx;
  try {
${runnable}
  } catch(e) {
    out.innerHTML += '<span class="err">Error: ' + e.message + '</span>';
  }
})();
</script>
</body></html>`
    } else if (lang === 'python' || lang === 'py') {
      html = shellPage(`
        <h2>Python preview</h2>
        <p>Noder shows your source here. Run real Python games in the <strong>Terminal</strong> (pygame templates supported).</p>
        <pre class="code">${escapeHtml(content.slice(0, 8000))}</pre>
        <p class="hint">Tip: File → New Game → Pygame, then in terminal: <code>pip install pygame</code> and <code>python main.py</code></p>
      `)
    } else if (lang === 'lua') {
      html = shellPage(`<h2>Lua / Love2D</h2><pre class="code">${escapeHtml(content.slice(0, 8000))}</pre>
        <p class="hint">Run with Love2D: <code>love .</code> in the project folder.</p>`)
    } else {
      // Generic: try as HTML fragment, else show source
      if (trimmed.includes('<') && trimmed.includes('>')) {
        html = `<!DOCTYPE html><html><head><style>body{font-family:system-ui;background:#1e1e1e;color:#ccc;padding:16px}</style></head><body>${content}</body></html>`
      } else {
        html = shellPage(`<h2>${escapeHtml(lang || 'file')} preview</h2><pre class="code">${escapeHtml(content.slice(0, 8000))}</pre>`)
      }
    }

    doc.open()
    doc.write(html)
    doc.close()
  }, [content, language, visible])

  return (
    <div className={`preview-panel ${visible ? 'visible' : 'hidden'}`}>
      <div className="preview-header">
        <span>LIVE PREVIEW</span>
        <span className="preview-hint">{language || 'auto'}</span>
      </div>
      <iframe
        ref={iframeRef}
        title="Live Preview"
        sandbox="allow-scripts"
        className="preview-iframe"
      />
    </div>
  )
}

function shellPage(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{font-family:system-ui,sans-serif;padding:16px;line-height:1.55;background:#1e1e1e;color:#ccc;margin:0}
    h1,h2,h3{color:#fff}
    code,pre.code{background:#2d2d2d;border-radius:6px}
    code{padding:2px 6px}
    pre.code{padding:12px;overflow:auto;font-size:12px}
    .hint{color:#858585;font-size:13px}
  </style></head><body>${body}</body></html>`
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
}

function simpleMarkdown(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br />')
}
