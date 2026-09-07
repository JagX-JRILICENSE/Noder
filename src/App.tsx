import { useState, useEffect, useRef, useCallback } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { WebsocketProvider } from 'y-websocket'
import { v4 as uuidv4 } from 'uuid'
import {
  FolderOpen,
  Terminal as TerminalIcon,
  Eye,
  Users,
  Github,
  Save,
  X,
  Settings,
  GitBranch,
  Download,
} from 'lucide-react'

import FileExplorer from './components/FileExplorer'
import TerminalPanel from './components/TerminalPanel'
import LivePreview from './components/LivePreview'
import GitHubPanel from './components/GitHubPanel'
import type { OpenTab, GitStatus, BlameLine } from './types'
import './App.css'

const DEFAULT_COLLAB = 'wss://demos.yjs.dev'

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    json: 'json', html: 'html', css: 'css',
    md: 'markdown', py: 'python', rs: 'rust',
    go: 'go', java: 'java', c: 'c', cpp: 'cpp',
    yml: 'yaml', yaml: 'yaml', xml: 'xml',
  }
  return map[ext] || 'plaintext'
}

export default function App() {
  const [workspace, setWorkspace] = useState<string | null>(null)
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showGhPanel, setShowGhPanel] = useState(false)
  const [collabEnabled, setCollabEnabled] = useState(false)
  const [collabRoom, setCollabRoom] = useState('noder-room-' + Math.random().toString(36).slice(2, 8))
  const [collabServer, setCollabServer] = useState(
    localStorage.getItem('noder-collab-server') || DEFAULT_COLLAB
  )
  const [githubToken, setGithubToken] = useState<string | null>(localStorage.getItem('noder-gh-token'))
  const [githubUser, setGithubUser] = useState<string | null>(localStorage.getItem('noder-gh-user'))
  const [showGhModal, setShowGhModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Ready')
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
  const [showBlame, setShowBlame] = useState(false)
  const [blameLines, setBlameLines] = useState<BlameLine[]>([])
  const [updaterStatus, setUpdaterStatus] = useState<string | null>(null)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const bindingRef = useRef<MonacoBinding | null>(null)

  const activeTab = tabs.find((t) => t.id === activeTabId) || null

  // Menus & extension messages
  useEffect(() => {
    const handler = (e: Event) => {
      const folder = (e as CustomEvent).detail as string
      setWorkspace(folder)
      setStatusMsg(`Opened: ${folder}`)
    }
    window.addEventListener('noder-open-folder', handler)

    if (window.electronAPI) {
      window.electronAPI.onMenuOpenFolder(async () => {
        const folder = await window.electronAPI!.openFolder()
        if (folder) {
          setWorkspace(folder)
          setStatusMsg(`Opened: ${folder}`)
        }
      })
      window.electronAPI.onMenuNewTerminal?.(() => setShowTerminal(true))
      window.electronAPI.onExtensionMessage?.(({ extensionId, message }) => {
        setStatusMsg(`[${extensionId}] ${message}`)
      })
      window.electronAPI.onUpdaterStatus?.((payload) => {
        if (payload.status === 'available') setUpdaterStatus('Update available')
        else if (payload.status === 'downloading') setUpdaterStatus(`Downloading… ${Math.round(payload.progress?.percent || 0)}%`)
        else if (payload.status === 'downloaded') setUpdaterStatus('Update ready — restart to install')
        else if (payload.status === 'error') setUpdaterStatus(null)
        else if (payload.status === 'not-available') setUpdaterStatus(null)
      })
    }

    return () => window.removeEventListener('noder-open-folder', handler)
  }, [])

  // Git status when workspace changes
  useEffect(() => {
    if (!workspace || !window.electronAPI?.gitStatus) {
      setGitStatus(null)
      return
    }
    const load = async () => {
      const s = await window.electronAPI!.gitStatus(workspace)
      setGitStatus(s)
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [workspace])

  // Blame when toggling or changing file
  useEffect(() => {
    if (!showBlame || !activeTab || !window.electronAPI?.gitBlame) {
      setBlameLines([])
      return
    }
    window.electronAPI.gitBlame(activeTab.path).then(setBlameLines)
  }, [showBlame, activeTab?.path])

  const openFile = useCallback(async (path: string, name: string) => {
    const existing = tabs.find((t) => t.path === path)
    if (existing) {
      setActiveTabId(existing.id)
      return
    }
    let content = '// Unable to read file'
    if (window.electronAPI) {
      const data = await window.electronAPI.readFile(path)
      if (data !== null) content = data
    }
    const tab: OpenTab = {
      id: uuidv4(),
      path,
      name,
      content,
      language: detectLanguage(name),
      isDirty: false,
    }
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
    setStatusMsg(`Opened ${name}`)
  }, [tabs])

  const saveCurrent = useCallback(async () => {
    if (!activeTab || !window.electronAPI) return
    const ok = await window.electronAPI.writeFile(activeTab.path, activeTab.content)
    if (ok) {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab.id ? { ...t, isDirty: false } : t))
      )
      setStatusMsg(`Saved ${activeTab.name}`)
      // Refresh git status after save
      if (workspace && window.electronAPI.gitStatus) {
        window.electronAPI.gitStatus(workspace).then(setGitStatus)
      }
    } else {
      setStatusMsg('Failed to save')
    }
  }, [activeTab, workspace])

  const closeTab = (id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id))
    if (activeTabId === id) {
      const remaining = tabs.filter((t) => t.id !== id)
      setActiveTabId(remaining.length ? remaining[remaining.length - 1].id : null)
    }
  }

  const updateContent = (value: string | undefined) => {
    if (!activeTabId || value === undefined) return
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, content: value, isDirty: true } : t
      )
    )
  }

  const toggleCollab = () => {
    if (collabEnabled) {
      bindingRef.current?.destroy()
      providerRef.current?.destroy()
      ydocRef.current?.destroy()
      bindingRef.current = null
      providerRef.current = null
      ydocRef.current = null
      setCollabEnabled(false)
      setStatusMsg('Collaboration disconnected')
    } else {
      if (!editorRef.current || !activeTab) {
        setStatusMsg('Open a file first to enable collaboration')
        return
      }
      const ydoc = new Y.Doc()
      const ytext = ydoc.getText('monaco')
      ytext.insert(0, activeTab.content)
      const provider = new WebsocketProvider(collabServer, collabRoom, ydoc)
      const binding = new MonacoBinding(
        ytext,
        editorRef.current.getModel()!,
        new Set([editorRef.current]),
        provider.awareness
      )
      ydocRef.current = ydoc
      providerRef.current = provider
      bindingRef.current = binding
      setCollabEnabled(true)
      setStatusMsg(`Collab connected — ${collabServer} / ${collabRoom}`)
    }
  }

  const handleEditorMount: OnMount = (ed) => {
    editorRef.current = ed
  }

  const connectGitHub = async (token: string) => {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Invalid token')
      const user = await res.json()
      setGithubToken(token)
      setGithubUser(user.login)
      localStorage.setItem('noder-gh-token', token)
      localStorage.setItem('noder-gh-user', user.login)
      setShowGhModal(false)
      setStatusMsg(`Connected as @${user.login}`)
    } catch {
      setStatusMsg('GitHub authentication failed')
    }
  }

  const disconnectGitHub = () => {
    setGithubToken(null)
    setGithubUser(null)
    localStorage.removeItem('noder-gh-token')
    localStorage.removeItem('noder-gh-user')
    setShowGhPanel(false)
    setStatusMsg('GitHub disconnected')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveCurrent()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        setShowTerminal((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveCurrent])

  const dirtyCount = gitStatus?.files?.length ?? 0

  return (
    <div className="app">
      <header className="titlebar">
        <div className="logo">Noder</div>
        <div className="menu">
          <span onClick={async () => {
            if (window.electronAPI) {
              const folder = await window.electronAPI.openFolder()
              if (folder) {
                setWorkspace(folder)
                setStatusMsg(`Opened: ${folder}`)
              }
            }
          }}>File</span>
          <span>Edit</span>
          <span>View</span>
          <span onClick={() => setShowTerminal(v => !v)}>Terminal</span>
          <span onClick={() => setShowSettings(true)}>Help</span>
        </div>

        <div className="titlebar-actions">
          <button className={`icon-btn ${collabEnabled ? 'active' : ''}`} title="Collaboration" onClick={toggleCollab}>
            <Users size={16} />
          </button>
          <button className={`icon-btn ${showPreview ? 'active' : ''}`} title="Live Preview" onClick={() => setShowPreview(v => !v)}>
            <Eye size={16} />
          </button>
          <button className={`icon-btn ${showTerminal ? 'active' : ''}`} title="Terminal (Ctrl+`)" onClick={() => setShowTerminal(v => !v)}>
            <TerminalIcon size={16} />
          </button>
          <button className={`icon-btn ${showBlame ? 'active' : ''}`} title="Toggle Git Blame" onClick={() => setShowBlame(v => !v)}>
            <GitBranch size={16} />
          </button>
          <button className="icon-btn" title="Save (Ctrl+S)" onClick={saveCurrent} disabled={!activeTab?.isDirty}>
            <Save size={16} />
          </button>
          <button className="icon-btn" title="Settings" onClick={() => setShowSettings(true)}>
            <Settings size={16} />
          </button>

          {githubUser ? (
            <button className="gh-btn connected" onClick={() => setShowGhPanel(v => !v)} title={`@${githubUser}`}>
              <Github size={16} />
              <span>@{githubUser}</span>
            </button>
          ) : (
            <button className="gh-btn" onClick={() => setShowGhModal(true)}>
              <Github size={16} />
              <span>Login</span>
            </button>
          )}
        </div>
      </header>

      <div className="main">
        <aside className="sidebar">
          <FileExplorer workspace={workspace} onOpenFile={openFile} activePath={activeTab?.path} />
        </aside>

        <div className="center">
          <div className="editor-area">
            <div className="tabs">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <span>{tab.name}{tab.isDirty ? ' •' : ''}</span>
                  <X size={14} className="tab-close" onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }} />
                </div>
              ))}
            </div>

            <div className="editor-wrapper">
              {activeTab ? (
                <div className="editor-with-blame">
                  {showBlame && blameLines.length > 0 && (
                    <div className="blame-gutter">
                      {blameLines.slice(0, 200).map((b) => (
                        <div key={b.line} className="blame-line" title={`${b.hash} ${b.author}: ${b.summary}`}>
                          <span className="blame-author">{b.author.split(' ')[0]}</span>
                          <span className="blame-hash">{b.hash.slice(0, 7)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="editor-main">
                    <Editor
                      height="100%"
                      language={activeTab.language}
                      theme="vs-dark"
                      value={activeTab.content}
                      onChange={updateContent}
                      onMount={handleEditorMount}
                      options={{
                        fontSize: 14,
                        fontFamily: 'Consolas, "Courier New", monospace',
                        minimap: { enabled: true },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        padding: { top: 8 },
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="welcome">
                  <h1>Noder</h1>
                  <p>Real-time collaborative editor by <strong>JagX</strong> & <strong>JRILICENSE</strong></p>
                  <div className="welcome-actions">
                    <button className="btn-primary" onClick={async () => {
                      if (window.electronAPI) {
                        const folder = await window.electronAPI.openFolder()
                        if (folder) setWorkspace(folder)
                      }
                    }}>
                      <FolderOpen size={18} /> Open Folder
                    </button>
                  </div>
                  <ul className="shortcuts">
                    <li><kbd>Ctrl</kbd>+<kbd>O</kbd> Open Folder</li>
                    <li><kbd>Ctrl</kbd>+<kbd>S</kbd> Save</li>
                    <li><kbd>Ctrl</kbd>+<kbd>`</kbd> Terminal</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <LivePreview
            content={activeTab?.content || ''}
            language={activeTab?.language || 'plaintext'}
            visible={showPreview}
          />

          <GitHubPanel
            token={githubToken}
            user={githubUser}
            visible={showGhPanel}
            onClose={() => setShowGhPanel(false)}
          />
        </div>
      </div>

      <TerminalPanel visible={showTerminal} cwd={workspace} />

      <footer className="statusbar">
        <span className="status-left">{statusMsg}</span>
        {gitStatus?.current && (
          <span className="git-branch" title={dirtyCount ? `${dirtyCount} changed files` : 'Clean'}>
            <GitBranch size={12} /> {gitStatus.current}
            {dirtyCount > 0 && <span className="git-dirty">*</span>}
            {gitStatus.ahead > 0 && <span> ↑{gitStatus.ahead}</span>}
            {gitStatus.behind > 0 && <span> ↓{gitStatus.behind}</span>}
          </span>
        )}
        {collabEnabled && <span className="collab-badge">● LIVE · {collabRoom}</span>}
        {updaterStatus && (
          <span className="updater-badge" onClick={() => {
            if (updaterStatus.includes('ready')) window.electronAPI?.installUpdate()
          }}>
            <Download size={12} /> {updaterStatus}
          </span>
        )}
        {activeTab && (
          <>
            <span>{activeTab.language}</span>
            <span>UTF-8</span>
          </>
        )}
        <span className="right">Noder v0.4.0 · JagX & JRILICENSE</span>
      </footer>

      {showGhModal && (
        <div className="modal-overlay" onClick={() => setShowGhModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Connect GitHub</h2>
            <p>Paste a Personal Access Token (classic) with <code>repo</code> scope.</p>
            <p className="hint">
              Create one at{' '}
              <a href="#" onClick={(e) => {
                e.preventDefault()
                window.electronAPI?.openExternal('https://github.com/settings/tokens')
              }}>github.com/settings/tokens</a>
            </p>
            <input type="password" id="gh-token" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autoFocus />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowGhModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => {
                const input = document.getElementById('gh-token') as HTMLInputElement
                if (input?.value) connectGitHub(input.value.trim())
              }}>Connect</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Settings</h2>
            <p>Collaboration server URL</p>
            <p className="hint">
              Use public server or run <code>npm run collab:server</code> then <code>ws://localhost:1234</code>
            </p>
            <input
              type="text"
              value={collabServer}
              onChange={(e) => setCollabServer(e.target.value)}
              placeholder="wss://demos.yjs.dev or ws://localhost:1234"
            />
            <p style={{ marginTop: 12 }}>Room ID</p>
            <input type="text" value={collabRoom} onChange={(e) => setCollabRoom(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>Close</button>
              <button className="btn-primary" onClick={() => {
                localStorage.setItem('noder-collab-server', collabServer)
                setShowSettings(false)
                setStatusMsg('Settings saved')
              }}>Save</button>
            </div>
            <div style={{ marginTop: 16, borderTop: '1px solid #3e3e42', paddingTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => window.electronAPI?.checkForUpdates()}>
                Check for Updates
              </button>
              {githubUser && (
                <button className="btn-secondary" onClick={disconnectGitHub}>Disconnect GitHub</button>
              )}
              <button
                className="btn-secondary"
                onClick={async () => {
                  const res = await window.electronAPI?.executeCommand('hello-noder.sayHello')
                  if (res?.ok) setStatusMsg('Extension command ran')
                }}
              >
                Run Hello Extension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
