export function detectLanguage(filename: string, content?: string): string {
  const name = (filename || '').toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop()! : ''
  const byExt: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', html: 'html', htm: 'html', css: 'css', scss: 'scss',
    md: 'markdown', py: 'python', dart: 'dart', rs: 'rust', go: 'go',
    java: 'java', c: 'c', cpp: 'cpp', sh: 'shell', yml: 'yaml', yaml: 'yaml', sql: 'sql',
  }
  if (name === 'dockerfile') return 'dockerfile'
  if (name === 'pubspec.yaml') return 'yaml'
  if (byExt[ext]) return byExt[ext]
  if (content) {
    const head = content.slice(0, 800)
    if (/\bWidget\b|\bMaterialApp\b/.test(head)) return 'dart'
    if (/from\s+['"]react['"]/.test(head)) return 'typescript'
  }
  return 'plaintext'
}
export const LANGUAGE_OPTIONS = ['plaintext', 'typescript', 'javascript', 'json', 'html', 'css', 'markdown', 'python', 'dart', 'rust', 'go', 'java', 'shell', 'yaml']
