export interface NoderTheme {
  id: string; name: string; type: 'dark' | 'light'
  css: Record<string, string>
  monaco: { base: 'vs' | 'vs-dark' | 'hc-black'; rules: any[]; colors: Record<string, string> }
}
function darkBase(o: Record<string, string> = {}): Record<string, string> {
  return { '--bg': '#1e1e1e', '--bg-sidebar': '#252526', '--bg-titlebar': '#323233', '--bg-tab': '#2d2d2d', '--bg-tab-active': '#1e1e1e', '--bg-hover': '#2a2d2e', '--bg-active': '#37373d', '--bg-input': '#3c3c3c', '--bg-status': '#007acc', '--border': '#1e1e1e', '--border-soft': '#3e3e42', '--text': '#cccccc', '--text-muted': '#858585', '--text-bright': '#ffffff', '--accent': '#007acc', '--accent-2': '#00d4aa', '--danger': '#f48771', '--success': '#4ec9b0', ...o }
}
export const THEMES: Record<string, NoderTheme> = {
  'dark-plus': { id: 'dark-plus', name: 'Dark+', type: 'dark', css: darkBase(), monaco: { base: 'vs-dark', rules: [{ token: 'comment', foreground: '6A9955' }], colors: { 'editor.background': '#1e1e1e' } } },
  light: { id: 'light', name: 'Light+', type: 'light', css: { '--bg': '#ffffff', '--bg-sidebar': '#f3f3f3', '--bg-titlebar': '#dddddd', '--bg-tab': '#ececec', '--bg-tab-active': '#ffffff', '--bg-hover': '#e8e8e8', '--bg-active': '#d6ebff', '--bg-input': '#ffffff', '--bg-status': '#007acc', '--border': '#e0e0e0', '--border-soft': '#cccccc', '--text': '#333333', '--text-muted': '#6e6e6e', '--text-bright': '#000000', '--accent': '#007acc', '--accent-2': '#0e8a6a', '--danger': '#c72e0f', '--success': '#0e8a6a' }, monaco: { base: 'vs', rules: [], colors: { 'editor.background': '#ffffff' } } },
  midnight: { id: 'midnight', name: 'Midnight Ocean', type: 'dark', css: darkBase({ '--bg': '#0f1419', '--bg-sidebar': '#141a21', '--accent': '#3d9eff', '--bg-status': '#3d9eff' }), monaco: { base: 'vs-dark', rules: [], colors: { 'editor.background': '#0f1419' } } },
  dracula: { id: 'dracula', name: 'Dracula', type: 'dark', css: darkBase({ '--bg': '#282a36', '--bg-sidebar': '#21222c', '--accent': '#bd93f9', '--bg-status': '#bd93f9' }), monaco: { base: 'vs-dark', rules: [], colors: { 'editor.background': '#282a36' } } },
}
const KEY = 'noder-theme-id'
export function getSavedThemeId() { try { return localStorage.getItem(KEY) || 'dark-plus' } catch { return 'dark-plus' } }
export function applyTheme(themeId: string, monacoApi?: any): NoderTheme {
  const theme = THEMES[themeId] || THEMES['dark-plus']
  Object.entries(theme.css).forEach(([k, v]) => { document.documentElement.style.setProperty(k, v); (document.querySelector('.app') as HTMLElement | null)?.style.setProperty(k, v) })
  document.body.style.background = theme.css['--bg']; document.body.style.color = theme.css['--text']
  if (monacoApi) { const name = `noder-${theme.id}`; monacoApi.editor.defineTheme(name, { base: theme.monaco.base, inherit: true, rules: theme.monaco.rules, colors: theme.monaco.colors }); monacoApi.editor.setTheme(name) }
  try { localStorage.setItem(KEY, theme.id) } catch {}
  return theme
}
export function listThemes() { return Object.values(THEMES).map(t => ({ id: t.id, name: t.name, type: t.type })) }
