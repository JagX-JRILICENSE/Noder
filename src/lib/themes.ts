/**
 * Noder theme system — CSS variables + Monaco editor themes.
 */

export interface NoderTheme {
  id: string
  name: string
  type: 'dark' | 'light'
  css: Record<string, string>
  monaco: {
    base: 'vs' | 'vs-dark' | 'hc-black'
    rules: { token: string; foreground?: string; background?: string; fontStyle?: string }[]
    colors: Record<string, string>
  }
}

function darkBase(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    '--bg': '#1e1e1e',
    '--bg-sidebar': '#252526',
    '--bg-titlebar': '#323233',
    '--bg-tab': '#2d2d2d',
    '--bg-tab-active': '#1e1e1e',
    '--bg-hover': '#2a2d2e',
    '--bg-active': '#37373d',
    '--bg-input': '#3c3c3c',
    '--bg-status': '#007acc',
    '--border': '#1e1e1e',
    '--border-soft': '#3e3e42',
    '--text': '#cccccc',
    '--text-muted': '#858585',
    '--text-bright': '#ffffff',
    '--accent': '#007acc',
    '--accent-2': '#00d4aa',
    '--danger': '#f48771',
    '--success': '#4ec9b0',
    ...overrides,
  }
}

export const THEMES: Record<string, NoderTheme> = {
  'dark-plus': {
    id: 'dark-plus',
    name: 'Dark+',
    type: 'dark',
    css: darkBase(),
    monaco: {
      base: 'vs-dark',
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.selectionBackground': '#264f78',
      },
    },
  },
  light: {
    id: 'light',
    name: 'Light+',
    type: 'light',
    css: {
      '--bg': '#ffffff',
      '--bg-sidebar': '#f3f3f3',
      '--bg-titlebar': '#dddddd',
      '--bg-tab': '#ececec',
      '--bg-tab-active': '#ffffff',
      '--bg-hover': '#e8e8e8',
      '--bg-active': '#d6ebff',
      '--bg-input': '#ffffff',
      '--bg-status': '#007acc',
      '--border': '#e0e0e0',
      '--border-soft': '#cccccc',
      '--text': '#333333',
      '--text-muted': '#6e6e6e',
      '--text-bright': '#000000',
      '--accent': '#007acc',
      '--accent-2': '#0e8a6a',
      '--danger': '#c72e0f',
      '--success': '#0e8a6a',
    },
    monaco: {
      base: 'vs',
      rules: [],
      colors: { 'editor.background': '#ffffff', 'editor.foreground': '#333333' },
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Ocean',
    type: 'dark',
    css: darkBase({
      '--bg': '#0f1419',
      '--bg-sidebar': '#141a21',
      '--bg-titlebar': '#1a2332',
      '--bg-tab': '#1a2332',
      '--bg-tab-active': '#0f1419',
      '--bg-status': '#3d9eff',
      '--accent': '#3d9eff',
      '--accent-2': '#00e5c0',
    }),
    monaco: {
      base: 'vs-dark',
      rules: [{ token: 'comment', foreground: '5c6773' }],
      colors: { 'editor.background': '#0f1419', 'editor.foreground': '#e6e1cf' },
    },
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    type: 'dark',
    css: darkBase({
      '--bg': '#282a36',
      '--bg-sidebar': '#21222c',
      '--bg-titlebar': '#191a21',
      '--bg-tab': '#21222c',
      '--bg-tab-active': '#282a36',
      '--bg-status': '#bd93f9',
      '--accent': '#bd93f9',
      '--accent-2': '#50fa7b',
      '--danger': '#ff5555',
      '--success': '#50fa7b',
    }),
    monaco: {
      base: 'vs-dark',
      rules: [
        { token: 'comment', foreground: '6272a4' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'string', foreground: 'f1fa8c' },
      ],
      colors: { 'editor.background': '#282a36', 'editor.foreground': '#f8f8f2' },
    },
  },
}

const STORAGE_KEY = 'noder-theme-id'

export function getSavedThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'dark-plus'
  } catch {
    return 'dark-plus'
  }
}

export function applyTheme(
  themeId: string,
  monacoApi?: typeof import('monaco-editor') | null
): NoderTheme {
  const theme = THEMES[themeId] || THEMES['dark-plus']
  const root = document.documentElement
  const app = document.querySelector('.app') as HTMLElement | null
  Object.entries(theme.css).forEach(([k, v]) => {
    root.style.setProperty(k, v)
    app?.style.setProperty(k, v)
  })
  document.body.style.background = theme.css['--bg']
  document.body.style.color = theme.css['--text']
  if (monacoApi) {
    const monacoThemeName = `noder-${theme.id}`
    monacoApi.editor.defineTheme(monacoThemeName, {
      base: theme.monaco.base,
      inherit: true,
      rules: theme.monaco.rules,
      colors: theme.monaco.colors,
    })
    monacoApi.editor.setTheme(monacoThemeName)
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme.id)
  } catch {}
  window.dispatchEvent(new CustomEvent('noder-theme-changed', { detail: theme }))
  return theme
}

export function listThemes(): { id: string; name: string; type: string }[] {
  return Object.values(THEMES).map((t) => ({ id: t.id, name: t.name, type: t.type }))
}
