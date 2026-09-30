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
    py: 'python', pyw: 'python', pyi: 'python',
    rs: 'rust', go: 'go', java: 'java',
    c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
    cs: 'csharp', php: 'php', rb: 'ruby', swift: 'swift',
    kt: 'kotlin', kts: 'kotlin', lua: 'lua',
    sh: 'shell', bash: 'shell', zsh: 'shell', ps1: 'powershell',
    yml: 'yaml', yaml: 'yaml', xml: 'xml', svg: 'xml', sql: 'sql',
    dart: 'dart', vue: 'html', svelte: 'html',
    toml: 'ini', ini: 'ini', dockerfile: 'dockerfile',
  }

  if (name === 'dockerfile' || name.endsWith('dockerfile')) return 'dockerfile'
  if (name === 'makefile' || name === 'gnumakefile') return 'plaintext'
  if (name === 'pubspec.yaml' || name === 'pubspec.yml') return 'yaml'
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return 'typescript'
  if (byExt[ext]) return byExt[ext]

  if (content) {
    const head = content.slice(0, 800)
    if (/^\s*<!DOCTYPE\s+html/i.test(head) || /^\s*<html/i.test(head)) return 'html'
    if (/\bWidget\b|\bStatelessWidget\b|\bMaterialApp\b/.test(head)) return 'dart'
    if (/from\s+['"]react['"]/.test(head)) {
      return /\binterface\b|\btype\s+\w+\s*=/.test(head) ? 'typescript' : 'javascript'
    }
  }

  return 'plaintext'
}

export const LANGUAGE_OPTIONS = [
  'plaintext', 'typescript', 'javascript', 'json', 'html', 'css', 'scss', 'markdown',
  'python', 'dart', 'rust', 'go', 'java', 'c', 'cpp', 'csharp', 'php', 'ruby',
  'swift', 'kotlin', 'lua', 'shell', 'powershell', 'yaml', 'xml', 'sql', 'dockerfile',
]
