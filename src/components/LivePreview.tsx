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

    let html = ''

    if (language === 'html' || content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) {
      html = content
    } else if (language === 'markdown' || language === 'md') {
      // Very basic markdown-to-html
      html = `<!DOCTYPE html><html><head><style>
        body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.6; background: #1e1e1e; color: #ccc; }
        h1,h2,h3 { color: #fff; }
        code { background: #2d2d2d; padding: 2px 6px; border-radius: 3px; }
        pre { background: #2d2d2d; padding: 12px; border-radius: 6px; overflow: auto; }
      </style></head><body>${simpleMarkdown(content)}</body></html>`
    } else if (language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts') {
      html = `<!DOCTYPE html>
<html>
<head>
  <style>body{font-family:monospace;background:#1e1e1e;color:#ccc;padding:16px;}</style>
</head>
<body>
  <pre id="out"></pre>
  <script>
    const out = document.getElementById('out');
    const log = (...args) => { out.textContent += args.map(a => typeof a === 'object' ? JSON.stringify(a,null,2) : String(a)).join(' ') + '\\n'; };
    console.log = log; console.error = log; console.warn = log;
    try {
      ${content}
    } catch(e) {
      out.textContent += 'Error: ' + e.message;
    }
  </script>
</body>
</html>`
    } else {
      html = `<!DOCTYPE html><html><body style="font-family:system-ui;padding:20px;background:#1e1e1e;color:#ccc;">
        <p>Live preview is available for HTML, Markdown, and JavaScript/TypeScript files.</p>
        <pre style="background:#2d2d2d;padding:12px;border-radius:6px;overflow:auto;">${escapeHtml(content.slice(0, 2000))}</pre>
      </body></html>`
    }

    doc.open()
    doc.write(html)
    doc.close()
  }, [content, language, visible])

  return (
    <div className={`preview-panel ${visible ? 'visible' : 'hidden'}`}>
      <div className="preview-header">
        <span>LIVE PREVIEW</span>
        <span className="preview-hint">Updates instantly</span>
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
