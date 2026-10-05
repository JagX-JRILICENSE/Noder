import { useEffect, useRef, useState } from 'react'
import { RefreshCw, ExternalLink, Monitor, Smartphone, Play, Info } from 'lucide-react'

interface Props {
  content: string
  language: string
  visible: boolean
  workspaceFiles?: Record<string, string>
  filePath?: string
  serverUrl?: string | null
  workspace?: string | null
  projectHint?: string
}

type PreviewMode = 'source' | 'app' | 'guide'

export default function LivePreview({
  content, language, visible, workspaceFiles = {}, filePath, serverUrl, workspace, projectHint,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [mode, setMode] = useState<PreviewMode>('source')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [customUrl, setCustomUrl] = useState(serverUrl || 'http://localhost:5173')
  const [tick, setTick] = useState(0)

  const lang = (language || '').toLowerCase()
  const isFlutter = lang === 'dart' || projectHint === 'flutter' || /MaterialApp|StatelessWidget|pubspec/i.test(content)
  const isTsJs = ['typescript', 'javascript', 'tsx', 'jsx', 'ts', 'js'].includes(lang)

  useEffect(() => {
    if (serverUrl) { setCustomUrl(serverUrl); setMode('app') }
  }, [serverUrl])

  useEffect(() => {
    if (isFlutter && mode === 'source') setMode('guide')
  }, [isFlutter])

  useEffect(() => {
    if (!visible || !iframeRef.current) return
    if (mode === 'app' || mode === 'guide') return
    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    const trimmed = content.trim()
    let html = ''
    if (lang === 'html' || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      html = expandHtmlProject(content, workspaceFiles, filePath)
    } else if (lang === 'svg' || trimmed.startsWith('<svg')) {
      html = `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1e1e1e}</style></head><body>${content}</body></html>`
    } else if (lang === 'css') {
      html = `<!DOCTYPE html><html><head><style>${content}</style></head><body><div style="padding:24px;font-family:system-ui"><h1>CSS Preview</h1><p>Sample</p><button>Button</button></div></body></html>`
    } else if (lang === 'json') {
      let pretty = content
      try { pretty = JSON.stringify(JSON.parse(content), null, 2) } catch {}
      html = shellPage(`<pre class="code">${escapeHtml(pretty)}</pre>`)
    } else if (lang === 'markdown' || lang === 'md') {
      html = shellPage(simpleMarkdown(content))
    } else if (isTsJs) {
      const runnable = stripTs(content)
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:Consolas,monospace;background:#0f1419;color:#c9d1d9;margin:0;padding:12px}#root{min-height:120px;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;background:#161b22}#out{white-space:pre-wrap;font-size:12px}.err{color:#f85149}.ok{color:#3fb950}</style></head><body><div id="root"><em style="opacity:.6">TS/JS sandbox — full apps: App mode → localhost</em></div><pre id="out"></pre><script>(function(){const out=document.getElementById('out');const log=(...args)=>{out.textContent+=args.map(a=>typeof a==='object'?JSON.stringify(a,null,2):String(a)).join(' ')+'\\n'};console.log=log;console.error=(...a)=>{out.innerHTML+='<span class=\"err\">'+a.join(' ')+'</span>\\n'};try{${runnable};out.innerHTML+='<span class=\"ok\">✓ ran</span>\\n'}catch(e){console.error(e&&e.stack||e)}})();</script></body></html>`
    } else if (lang === 'dart') {
      html = shellPage(flutterGuideHtml(content, workspace))
    } else if (lang === 'python' || lang === 'py') {
      html = shellPage(`<h2>Python</h2><p>Run in Terminal: <code>python ${escapeHtml((filePath || 'main.py').split(/[/\\]/).pop() || 'main.py')}</code></p><pre class="code">${escapeHtml(content.slice(0, 12000))}</pre>`)
    } else if (trimmed.includes('<') && trimmed.includes('>')) {
      html = `<!DOCTYPE html><html><head><style>body{font-family:system-ui;background:#1e1e1e;color:#ccc;padding:16px}</style></head><body>${content}</body></html>`
    } else {
      html = shellPage(`<h2>${escapeHtml(lang || 'file')}</h2><pre class="code">${escapeHtml(content.slice(0, 12000))}</pre>`)
    }
    doc.open(); doc.write(html); doc.close()
  }, [content, language, visible, mode, tick, workspaceFiles, filePath, isTsJs, isFlutter, lang, workspace])

  if (!visible) return null

  return (
    <div className="live-preview">
      <div className="preview-toolbar">
        <div className="preview-modes">
          <button className={mode === 'source' ? 'active' : ''} onClick={() => setMode('source')} title="Source iframe"><Monitor size={14} /> Source</button>
          <button className={mode === 'app' ? 'active' : ''} onClick={() => setMode('app')} title="Localhost app"><Play size={14} /> App</button>
          <button className={mode === 'guide' ? 'active' : ''} onClick={() => setMode('guide')} title="Run guide"><Info size={14} /> Guide</button>
        </div>
        {mode === 'app' && (
          <div className="preview-url-row">
            <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="http://localhost:5173" />
            <button onClick={() => setTick((t) => t + 1)}><RefreshCw size={14} /></button>
            <button onClick={() => window.electronAPI?.openExternal?.(customUrl)}><ExternalLink size={14} /></button>
          </div>
        )}
        <div className="preview-device">
          <button className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}><Monitor size={14} /></button>
          <button className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}><Smartphone size={14} /></button>
        </div>
        {projectHint && <span className="preview-hint">{projectHint}</span>}
      </div>
      <div className={`preview-frame ${device}`}>
        {mode === 'source' && <iframe ref={iframeRef} title="preview" sandbox="allow-scripts allow-same-origin" />}
        {mode === 'app' && <iframe key={tick + customUrl} title="app-preview" src={customUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />}
        {mode === 'guide' && (
          <div className="preview-guide" dangerouslySetInnerHTML={{ __html: flutterGuideHtml(content, workspace) }} />
        )}
      </div>
    </div>
  )
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')
}
function shellPage(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:system-ui;background:#1e1e1e;color:#ccc;padding:16px;line-height:1.5}pre.code{background:#0d1117;padding:12px;border-radius:8px;overflow:auto;font-size:12px}code{background:#30363d;padding:2px 6px;border-radius:4px}h2{color:#58a6ff}a{color:#58a6ff}</style></head><body>${body}</body></html>`
}
function simpleMarkdown(md: string) {
  return md.split('\n').map((line) => {
    if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`
    if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`
    if (line.startsWith('### ')) return `<h3>${escapeHtml(line.slice(4))}</h3>`
    if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`
    if (!line.trim()) return '<br/>'
    return `<p>${escapeHtml(line)}</p>`
  }).join('\n')
}
function stripTs(src: string) {
  return src
    .replace(/^import\s+.+?;?$/gm, '// import')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/:\s*[A-Za-z0-9_<>\[\]|\s]+(?=[,)=])/g, '')
    .slice(0, 8000)
}
function expandHtmlProject(html: string, files: Record<string, string>, _path?: string) {
  let out = html
  for (const [p, c] of Object.entries(files)) {
    if (p.endsWith('.css')) out = out.replace(new RegExp(`href=["'].*${p.split('/').pop()}["']`), `href="data:text/css,${encodeURIComponent(c)}"`)
  }
  return out.includes('<html') ? out : `<!DOCTYPE html><html><body>${out}</body></html>`
}
function flutterGuideHtml(content: string, workspace?: string | null) {
  return `
    <h2>Flutter / App preview</h2>
    <p>Noder does not emulate a full Flutter engine in-process. Use <strong>App</strong> mode after starting a web target.</p>
    <ol>
      <li>Open Terminal in workspace ${workspace ? `<code>${escapeHtml(workspace)}</code>` : ''}</li>
      <li><code>flutter pub get</code></li>
      <li><code>flutter run -d web-server --web-port 8080</code></li>
      <li>Switch to <strong>App</strong> tab → <code>http://localhost:8080</code></li>
    </ol>
    <p>For Vite/Next: <code>npm install && npm run dev</code> then App → :5173 / :3000.</p>
    <pre class="code">${escapeHtml(content.slice(0, 4000))}</pre>
  `
}
