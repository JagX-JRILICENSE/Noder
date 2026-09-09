/** Detect Monaco language from filename and optional content. */
export function detectLanguage(filename: string, content?: string): string {
  const name = (filename || '').toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop()! : ''

  const byExt: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    json: 'json', jsonc: 'json',
    html: 'html', htm: 'html', xhtml: 'html',
    css: 'css', scss: 'scss', less: 'less',
    md: 'markdown', markdown: 'markdown',
    py: 'python', pyw: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    c: 'c', h: 'c',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin', kts: 'kotlin',
    lua: 'lua',
    sh: 'shell', bash: 'shell', zsh: 'shell', ps1: 'powershell',
    yml: 'yaml', yaml: 'yaml',
    xml: 'xml', svg: 'xml',
    sql: 'sql',
    r: 'r',
    dart: 'dart',
    vue: 'html',
    svelte: 'html',
    toml: 'ini',
    ini: 'ini', cfg: 'ini', conf: 'ini',
    dockerfile: 'dockerfile',
    makefile: 'plaintext',
  }

  if (name === 'dockerfile' || name.endsWith('dockerfile')) return 'dockerfile'
  if (name === 'makefile' || name === 'gnumakefile') return 'plaintext'
  if (ext && byExt[ext]) return byExt[ext]

  if (content && content.trim()) {
    const sample = content.slice(0, 4000)
    if (/^#!/.test(sample)) {
      if (/python/.test(sample)) return 'python'
      if (/node|bash|sh/.test(sample)) return 'shell'
    }
    if (/\b(def|import|from)\s+\w+|print\s*\(/.test(sample) && /:\s*$/m.test(sample)) return 'python'
    if (/\b(function|const|let|var|=>|export\s+default)\b/.test(sample)) {
      if (/:\s*[A-Z]\w*[<>\[\]]?/.test(sample) || /interface\s+\w+/.test(sample)) return 'typescript'
      return 'javascript'
    }
    if (/^\s*<(!DOCTYPE|html|\?xml)/i.test(sample) || /<\w+[\s>]/.test(sample) && /<\/\w+>/.test(sample)) {
      if (/style\s*=|\.\w+\s*\{/.test(sample) && sample.includes('{')) return 'html'
      return 'html'
    }
    if (/[{;]\s*$/m.test(sample) && /[.#]?[\w-]+\s*\{/.test(sample)) return 'css'
    if (/^\s*[{\[]/.test(sample.trim()) && /"\w+"\s*:/.test(sample)) return 'json'
    if (/^\s*#include\s*</.test(sample) || /\bint\s+main\s*\(/.test(sample)) return 'cpp'
    if (/\bpackage\s+main\b|\bfunc\s+\w+\(/.test(sample)) return 'go'
    if (/\bfn\s+\w+|let\s+mut\s+/.test(sample)) return 'rust'
    if (/^\s*---\s*$/m.test(sample) || /^\w+:\s*.+$/m.test(sample) && !sample.includes('{')) return 'yaml'
  }

  return 'plaintext'
}

export const LANGUAGE_OPTIONS = [
  'plaintext', 'javascript', 'typescript', 'python', 'html', 'css', 'json',
  'markdown', 'cpp', 'c', 'csharp', 'java', 'go', 'rust', 'php', 'ruby',
  'shell', 'powershell', 'yaml', 'xml', 'sql', 'lua', 'dockerfile', 'scss',
] as const
