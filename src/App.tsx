import { useState, useEffect, useRef, useCallback } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { WebsocketProvider } from 'y-websocket'
import { v4 as uuidv4 } from 'uuid'
import {
  FolderOpen, Terminal as TerminalIcon, Eye, Users, Github, Save, X,
  Settings, GitBranch, Download, Search, Sparkles,
} from 'lucide-react'

import FileExplorer from './components/FileExplorer'
import TerminalPanel from './components/TerminalPanel'
import LivePreview from './components/LivePreview'
import GitHubPanel from './components/GitHubPanel'
import CommandPalette from './components/CommandPalette'
import GitPanel from './components/GitPanel'
import Marketplace from './components/Marketplace'
import AIPanel from './components/AIPanel'
import ActivityBar, { ActivityId } from './components/ActivityBar'
import SearchPanel from './components/SearchPanel'
import DiffViewer from './components/DiffViewer'
import FindReplace from './components/FindReplace'
import type { OpenTab, GitStatus, BlameLine } from './types'
import { detectLanguage, LANGUAGE_OPTIONS } from './lib/language'
import './App.css'
import './styles-activity.css'
import './styles-git-extra.css'
import './styles-chrome.css'

const DEFAULT_COLLAB = 'wss://demos.yjs.dev'

export default function App() {
  const [workspace, setWorkspace] = useState<string | null>(null)
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showGhPanel, setShowGhPanel] = useState(false)
  const [showGitPanel, setShowGitPanel] = useState(false)
  const [showMarketplace, setShowMarketplace] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [collabEnabled, setCollabEnabled] = useState(false)
  const [collabRoom, setCollabRoom] = useState('noder-room-' + Math.random().toString(36).slice(2, 8))
  const [collabServer, setCollabServer] = useState(localStorage.getItem('noder-collab-server') || DEFAULT_COLLAB)
  const [githubToken, setGithubToken] = useState<string | null>(localStorage.getItem('noder-gh-token'))
  const [githubUser, setGithubUser] = useState<string | null>(localStorage.getItem('noder-gh-user'))
  const [showGhModal, setShowGhModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Ready')
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
  const [showBlame, setShowBlame] = useState(false)
  const [blameLines, setBlameLines] = useState<BlameLine[]>([])
  const [updaterStatus, setUpdaterStatus] = useState<string | null>(null)
  const [collabPeers, setCollabPeers] = useState(0)
  const [activity, setActivity] = useState<ActivityId>('explorer')
  const [zen, setZen] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [diffPath, setDiffPath] = useState<string | null>(null)
  const [showFind, setShowFind] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on')
  const [minimap, setMinimap] = useState(true)
  const [explorerTick, setExplorerTick] = useState(0)
  const [recentFiles, setRecentFiles] = useState<{ path: string; name: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('noder-recent') || '[]') } catch { return [] }
  })

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const bindingRef = useRef<MonacoBinding | null>(null)
  const activeTab = tabs.find((t) => t.id === activeTabId) || null

  const openFolder = useCallback(async () => {
    if (!window.electronAPI) return
    const folder = await window.electronAPI.openFolder()
    if (folder) { setWorkspace(folder); setStatusMsg(`Opened: ${folder}`) }
  }, [])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMenuOpenFolder(() => openFolder())
      window.electronAPI.onMenuNewTerminal?.(() => setShowTerminal(true))
      window.electronAPI.onMenuCommandPalette?.(() => setShowPalette(true))
      window.electronAPI.onMenuToggleAI?.(() => setShowAI((v) => !v))
      window.electronAPI.onExtensionMessage?.(({ extensionId, message }) => setStatusMsg(`[${extensionId}] ${message}`))
      window.electronAPI.onUpdaterStatus?.((payload) => {
        if (payload.status === 'available') setUpdaterStatus('Update available')
        else if (payload.status === 'downloading') setUpdaterStatus(`Downloading… ${Math.round(payload.progress?.percent || 0)}%`)
        else if (payload.status === 'downloaded') setUpdaterStatus('Update ready — click to install')
        else setUpdaterStatus(null)
      })
    }
  }, [openFolder])

  useEffect(() => {
    if (!showBlame || !activeTab || !window.electronAPI?.gitBlame) { setBlameLines([]); return }
    window.electronAPI.gitBlame(activeTab.path).then(setBlameLines)
  }, [showBlame, activeTab?.path])

  const openFile = useCallback(async (path: string, name: string) => {
    const existing = tabs.find((t) => t.path === path)
    if (existing) { setActiveTabId(existing.id); return }
    let content = '// Unable to read file'
    if (window.electronAPI) {
      const data = await window.electronAPI.readFile(path)
      if (data !== null) content = data
    }
    const tab: OpenTab = { id: uuidv4(), path, name, content, language: detectLanguage(name, content), isDirty: false }
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
    setStatusMsg(`Opened ${name} (${detectLanguage(name, content)})`)
    setRecentFiles((prev) => {
      const next = [{ path, name }, ...prev.filter((r) => r.path !== path)].slice(0, 12)
      localStorage.setItem('noder-recent', JSON.stringify(next))
      return next
    })
  }, [tabs])

  const openFromContent = useCallback((path: string, name: string, content: string) => {
    const existing = tabs.find((t) => t.path === path)
    if (existing) {
      setTabs((prev) => prev.map((t) => t.id === existing.id ? { ...t, content, isDirty: true, language: detectLanguage(name, content) } : t))
      setActiveTabId(existing.id)
      return
    }
    const tab: OpenTab = { id: uuidv4(), path, name, content, language: detectLanguage(name, content), isDirty: true }
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
    setStatusMsg(`Editing ${name}`)
  }, [tabs])

  const saveCurrent = useCallback(async () => {
    if (!activeTab || !window.electronAPI) return
    const ok = await window.electronAPI.writeFile(activeTab.path, activeTab.content)
    if (ok) {
      setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, isDirty: false } : t)))
      setStatusMsg(`Saved ${activeTab.name}`)
      if (workspace && window.electronAPI.gitStatus) window.electronAPI.gitStatus(workspace).then(setGitStatus)
    } else setStatusMsg('Failed to save')
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
    setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content: value, isDirty: true } : t))
  }

  const insertAICode = (code: string) => {
    if (!activeTabId) return
    setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content: t.content + (t.content.endsWith('\n') ? '' : '\n') + code + '\n', isDirty: true } : t))
    setStatusMsg('AI code inserted into editor')
  }

  const toggleCollab = useCallback(() => {
    if (collabEnabled) {
      bindingRef.current?.destroy(); providerRef.current?.destroy(); ydocRef.current?.destroy()
      bindingRef.current = null; providerRef.current = null; ydocRef.current = null
      setCollabEnabled(false); setCollabPeers(0); setStatusMsg('Collaboration disconnected')
    } else {
      if (!editorRef.current || !activeTab) { setStatusMsg('Open a file first to enable collaboration'); return }
      const ydoc = new Y.Doc()
      const ytext = ydoc.getText('monaco')
      ytext.insert(0, activeTab.content)
      const provider = new WebsocketProvider(collabServer, collabRoom, ydoc)
      provider.awareness.on('change', () => setCollabPeers(provider.awareness.getStates().size))
      const binding = new MonacoBinding(ytext, editorRef.current.getModel()!, new Set([editorRef.current]), provider.awareness)
      ydocRef.current = ydoc; providerRef.current = provider; bindingRef.current = binding
      setCollabEnabled(true)
      setStatusMsg(`Collab live — ${collabServer} / room ${collabRoom}`)
    }
  }, [collabEnabled, activeTab, collabServer, collabRoom])

  const onActivity = (id: ActivityId) => {
    setActivity(id)
    setShowGitPanel(id === 'git')
    setShowMarketplace(id === 'extensions')
    setShowAI(id === 'ai')
    if (id === 'collab') toggleCollab()
  }

  const handleEditorMount: OnMount = (ed) => { editorRef.current = ed }

  const connectGitHub = async (token: string) => {
    try {
      const res = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Invalid token')
      const user = await res.json()
      setGithubToken(token); setGithubUser(user.login)
      localStorage.setItem('noder-gh-token', token)
      localStorage.setItem('noder-gh-user', user.login)
      setShowGhModal(false)
      setStatusMsg(`Connected as @${user.login}`)
    } catch { setStatusMsg('GitHub authentication failed') }
  }

  const runCommand = useCallback(async (id: string) => {
    switch (id) {
      case 'noder.openFolder': await openFolder(); break
      case 'noder.toggleTerminal': setShowTerminal((v) => !v); break
      case 'noder.togglePreview': setShowPreview((v) => !v); break
      case 'noder.toggleCollab': toggleCollab(); break
      case 'noder.toggleGit': setShowGitPanel((v) => !v); setActivity('git'); break
      case 'noder.toggleMarketplace': setShowMarketplace((v) => !v); setActivity('extensions'); break
      case 'noder.toggleAI': setShowAI((v) => !v); setActivity('ai'); break
      case 'noder.saveFile': await saveCurrent(); break
      case 'noder.gitPush': {
        const res = await window.electronAPI?.gitPush?.(workspace || undefined)
        setStatusMsg(res?.ok ? 'Git push succeeded' : (res?.error || 'Push failed'))
        if (res?.ok && workspace) window.electronAPI?.gitStatus?.(workspace).then(setGitStatus)
        break
      }
      case 'noder.gitPull': {
        const res = await window.electronAPI?.gitPull?.(workspace || undefined)
        setStatusMsg(res?.ok ? 'Git pull succeeded' : (res?.error || 'Pull failed'))
        if (res?.ok && workspace) window.electronAPI?.gitStatus?.(workspace).then(setGitStatus)
        break
      }
      case 'noder.checkUpdates': window.electronAPI?.checkForUpdates(); setStatusMsg('Checking for updates…'); break
      case 'noder.toggleFullscreen': await (window.electronAPI as any)?.toggleFullscreen?.(); break
      case 'noder.findReplace': setShowFind(true); break
      case 'noder.showDiff': setDiffPath(null); setShowDiff(true); setShowGitPanel(true); break
      case 'noder.newFile': {
        if (!workspace) { setStatusMsg('Open a folder first'); break }
        const name = prompt('New file name:')
        if (!name?.trim()) break
        const full = `${workspace.replace(/\\/g, '/')}/${name.trim().replace(/^[/\\]+/, '')}`
        const ok = await window.electronAPI?.writeFile(full, '')
        if (ok) { setExplorerTick((t) => t + 1); await openFile(full, name.trim().split(/[/\\]/).pop() || name) }
        break
      }
      case 'noder.newFolder': {
        if (!workspace) { setStatusMsg('Open a folder first'); break }
        const name = prompt('New folder name:')
        if (!name?.trim()) break
        const full = `${workspace.replace(/\\/g, '/')}/${name.trim().replace(/^[/\\]+/, '')}`
        const ok = await (window.electronAPI as any)?.mkdir?.(full)
        if (ok) { setExplorerTick((t) => t + 1); setStatusMsg('Folder created') }
        break
      }
      case 'noder.saveAs': {
        if (!activeTab) break
        const p = await (window.electronAPI as any)?.saveFileDialog?.(activeTab.name)
        if (p) {
          const ok = await window.electronAPI?.writeFile(p, activeTab.content)
          if (ok) {
            const name = p.split(/[/\\]/).pop() || p
            setTabs((prev) => prev.map((t) => t.id === activeTab.id ? { ...t, path: p, name, isDirty: false, language: detectLanguage(name, activeTab.content) } : t))
            setStatusMsg('Saved as ' + name)
          }
        }
        break
      }
      case 'noder.closeAllTabs': setTabs([]); setActiveTabId(null); break
      case 'noder.gotoLine': {
        const n = prompt('Go to line:')
        const line = parseInt(n || '', 10)
        if (line > 0 && editorRef.current) {
          editorRef.current.revealLineInCenter(line)
          editorRef.current.setPosition({ lineNumber: line, column: 1 })
          editorRef.current.focus()
        }
        break
      }
      case 'noder.fontUp': setFontSize((s) => Math.min(28, s + 1)); break
      case 'noder.fontDown': setFontSize((s) => Math.max(10, s - 1)); break
      case 'noder.toggleWordWrap': setWordWrap((w) => (w === 'on' ? 'off' : 'on')); break
      case 'noder.toggleMinimap': setMinimap((m) => !m); break
      case 'noder.copyPath':
        if (activeTab) { await navigator.clipboard.writeText(activeTab.path); setStatusMsg('Path copied') }
        break
      case 'noder.revealInOs':
        if (activeTab) await (window.electronAPI as any)?.showItemInFolder?.(activeTab.path)
        break
      case 'noder.detectLanguage':
        if (activeTab) {
          const lang = detectLanguage(activeTab.name, activeTab.content)
          setTabs((prev) => prev.map((t) => t.id === activeTab.id ? { ...t, language: lang } : t))
          setStatusMsg('Language: ' + lang)
        }
        break
      case 'noder.saveAndPush': {
        await saveCurrent()
        const msg = prompt('Commit message for GitHub push:')
        if (!msg?.trim()) { setStatusMsg('Push cancelled'); break }
        await window.electronAPI?.gitStage?.('.', workspace || undefined)
        const c = await window.electronAPI?.gitCommit?.(msg.trim(), workspace || undefined)
        if (!c?.ok) { setStatusMsg(c?.error || 'Commit failed'); break }
        const p = await window.electronAPI?.gitPush?.(workspace || undefined)
        setStatusMsg(p?.ok ? 'Saved, committed & pushed to GitHub' : (p?.error || 'Push failed'))
        if (workspace) window.electronAPI?.gitStatus?.(workspace).then(setGitStatus)
        break
      }
      case 'noder.newGamePygame': {
        const res = await (window.electronAPI as any)?.scaffoldGame?.('snake', workspace || undefined)
        if (res?.ok) { setStatusMsg(`Game at ${res.path}`); setShowTerminal(true) }
        else setStatusMsg(res?.error || 'Open a folder first')
        break
      }
      default: {
        const res = await window.electronAPI?.executeCommand(id)
        if (res && !res.ok) setStatusMsg(res.error || 'Command failed')
        break
      }
    }
  }, [openFolder, toggleCollab, saveCurrent, workspace, activeTab, openFile])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); setShowPalette(true) }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); setShowAI((v) => !v) }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCurrent() }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); setShowTerminal((v) => !v) }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); setZen((v) => !v) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') { e.preventDefault(); setShowFind(true) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); runCommand('noder.newFile') }
      if (e.key === 'F11') { e.preventDefault(); (window.electronAPI as any)?.toggleFullscreen?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveCurrent, runCommand])

  const dirtyCount = gitStatus?.files?.length ?? 0

  return (
    <div className={`app ${zen ? 'zen' : ''}`}>
      <header className="titlebar">
        <div className="logo-wrap">
          <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden>
            <rect width="64" height="64" rx="14" fill="#12161c"/>
            <path d="M16 16v32M16 16l32 32M48 16v32" stroke="#00d4aa" strokeWidth="4" strokeLinecap="round" fill="none"/>
            <circle cx="16" cy="16" r="4" fill="#3ecfff"/><circle cx="16" cy="48" r="4" fill="#3ecfff"/>
            <circle cx="48" cy="16" r="4" fill="#3ecfff"/><circle cx="48" cy="48" r="4" fill="#3ecfff"/>
            <circle cx="32" cy="32" r="5" fill="#00d4aa"/><circle cx="50" cy="14" r="3.5" fill="#00ffb4"/>
          </svg>
          <span className="logo-text">Noder</span>
          <span className="logo-live">LIVE</span>
        </div>
        <div className="menu">
          <span onClick={openFolder}>File</span>
          <span onClick={() => setShowPalette(true)}>Edit</span>
          <span onClick={() => setShowPalette(true)}>View</span>
          <span onClick={() => setShowTerminal((v) => !v)}>Terminal</span>
          <span onClick={() => setShowSettings(true)}>Help</span>
        </div>
        <div className="titlebar-actions">
          <button className="icon-btn" title="Command Palette" onClick={() => setShowPalette(true)}><Search size={16} /></button>
          <button className={`icon-btn ${showAI ? 'active' : ''}`} title="AI" onClick={() => setShowAI((v) => !v)}><Sparkles size={16} /></button>
          <button className={`icon-btn ${collabEnabled ? 'active' : ''}`} title="Collab" onClick={toggleCollab}><Users size={16} /></button>
          <button className={`icon-btn ${showPreview ? 'active' : ''}`} title="Preview" onClick={() => setShowPreview((v) => !v)}><Eye size={16} /></button>
          <button className={`icon-btn ${showTerminal ? 'active' : ''}`} title="Terminal" onClick={() => setShowTerminal((v) => !v)}><TerminalIcon size={16} /></button>
          <button className="icon-btn" title="Save" onClick={saveCurrent} disabled={!activeTab?.isDirty}><Save size={16} /></button>
          <button className="icon-btn" title="Settings" onClick={() => setShowSettings(true)}><Settings size={16} /></button>
          {githubUser ? (
            <button className="gh-btn connected" onClick={() => setShowGhPanel((v) => !v)}><Github size={16} /><span>@{githubUser}</span></button>
          ) : (
            <button className="gh-btn" onClick={() => setShowGhModal(true)}><Github size={16} /><span>Login</span></button>
          )}
          <div className="window-controls">
            <button type="button" title="Minimize" onClick={() => (window.electronAPI as any)?.windowMinimize?.()}>─</button>
            <button type="button" title="Maximize" onClick={() => (window.electronAPI as any)?.windowMaximize?.()}>□</button>
            <button type="button" className="win-close" title="Close" onClick={() => (window.electronAPI as any)?.windowClose?.()}>✕</button>
          </div>
        </div>
      </header>

      <div className="main-with-activity">
        <ActivityBar active={activity} onSelect={onActivity} onOpenSettings={() => setShowSettings(true)} onToggleTerminal={() => setShowTerminal((v) => !v)} collabOn={collabEnabled} />
        {activity === 'search' ? (
          <SearchPanel workspace={workspace} visible onOpenFile={openFile} />
        ) : (
          <aside className="sidebar">
            <FileExplorer workspace={workspace} onOpenFile={openFile} activePath={activeTab?.path} onWorkspaceFolder={setWorkspace} refreshKey={explorerTick} />
          </aside>
        )}

        <div className="center">
          <div className="editor-area">
            <div className="tabs">
              {tabs.map((tab) => (
                <div key={tab.id} className={`tab ${tab.id === activeTabId ? 'active' : ''}`} onClick={() => setActiveTabId(tab.id)}>
                  <span>{tab.name}{tab.isDirty ? ' •' : ''}</span>
                  <X size={14} className="tab-close" onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }} />
                </div>
              ))}
            </div>
            <div className="editor-wrapper">
              {activeTab && (
                <FindReplace visible={showFind} content={activeTab.content} onClose={() => setShowFind(false)}
                  onReplace={(next) => setTabs((prev) => prev.map((t) => t.id === activeTab.id ? { ...t, content: next, isDirty: true } : t))} />
              )}
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
                    <Editor height="100%" language={activeTab.language} theme="vs-dark" value={activeTab.content}
                      onChange={updateContent} onMount={handleEditorMount}
                      options={{ fontSize, fontFamily: 'Consolas, "Courier New", monospace', minimap: { enabled: minimap }, scrollBeyondLastLine: false, automaticLayout: true, wordWrap, padding: { top: 8 } }} />
                  </div>
                </div>
              ) : (
                <div className="welcome">
                  <div className="welcome-brand">
                    <h1 className="wordmark">Noder</h1>
                  </div>
                  <p className="tagline">Real-time collaborative IDE by <strong>JagX</strong> & <strong>JRILICENSE</strong></p>
                  <div className="welcome-actions">
                    <button className="btn-primary" onClick={openFolder}><FolderOpen size={18} /> Open Folder</button>
                  </div>
                  {recentFiles.length > 0 && (
                    <div className="recent-files">
                      <div>Recent files</div>
                      {recentFiles.slice(0, 6).map((r) => (
                        <button key={r.path} onClick={() => openFile(r.path, r.name)}>{r.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <LivePreview content={activeTab?.content || ''} language={activeTab?.language || 'plaintext'} visible={showPreview} />
          <GitHubPanel token={githubToken} user={githubUser} visible={showGhPanel} onClose={() => setShowGhPanel(false)}
            workspace={workspace} onOpenContent={openFromContent}
            onCloned={(folder) => { setWorkspace(folder); setStatusMsg('Cloned: ' + folder); setShowGitPanel(true) }}
            onStatus={setStatusMsg} />
          <GitPanel workspace={workspace} visible={showGitPanel} onClose={() => setShowGitPanel(false)}
            onStatusChange={setGitStatus} onOpenFile={openFile}
            onShowDiff={(p) => { setDiffPath(p); setShowDiff(true) }} />
          <DiffViewer workspace={workspace} filePath={diffPath} visible={showDiff} onClose={() => setShowDiff(false)} onOpenFile={openFile} />
          <Marketplace visible={showMarketplace} onClose={() => setShowMarketplace(false)} />
          <AIPanel visible={showAI} onClose={() => setShowAI(false)} contextCode={activeTab?.content} contextFile={activeTab?.name}
            workspace={workspace} onStatus={setStatusMsg} onInsertCode={insertAICode}
            onWriteEditor={(code, filename) => {
              if (activeTabId) {
                setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content: code, isDirty: true, language: detectLanguage(t.name, code) } : t))
                setStatusMsg('AI wrote code into editor')
              } else {
                const name = filename || 'untitled.py'
                const path = workspace ? `${workspace.replace(/\\/g, '/')}/${name}` : name
                const tab: OpenTab = { id: uuidv4(), path, name, content: code, language: detectLanguage(name, code), isDirty: true }
                setTabs((prev) => [...prev, tab]); setActiveTabId(tab.id)
                setStatusMsg(`AI created ${name} in editor`)
              }
            }}
            onWriteFile={async (rel, content) => {
              if (!workspace || !window.electronAPI?.writeFile) {
                const name = rel.split(/[/\\]/).pop() || rel
                openFromContent(rel, name, content)
                return false
              }
              const full = `${workspace.replace(/\\/g, '/')}/${rel.replace(/^[/\\]+/, '')}`
              const ok = await window.electronAPI.writeFile(full, content)
              if (ok) { openFromContent(full, rel.split(/[/\\]/).pop() || rel, content); setExplorerTick((t) => t + 1) }
              return !!ok
            }} />
        </div>
      </div>

      <TerminalPanel visible={showTerminal} cwd={workspace} />

      <footer className="statusbar">
        <span className="status-left">{statusMsg}</span>
        {gitStatus?.current && (
          <span className="git-branch" onClick={() => setShowGitPanel(true)} style={{ cursor: 'pointer' }}>
            <GitBranch size={12} /> {gitStatus.current}{dirtyCount > 0 && <span className="git-dirty">*</span>}
          </span>
        )}
        {collabEnabled && <span className="collab-badge">● LIVE · {collabRoom}{collabPeers > 0 ? ` · ${collabPeers}` : ''}</span>}
        {updaterStatus && (
          <span className="updater-badge" onClick={() => { if (updaterStatus.includes('ready')) window.electronAPI?.installUpdate() }}>
            <Download size={12} /> {updaterStatus}
          </span>
        )}
        {activeTab && (
          <>
            <select className="lang-select" value={activeTab.language}
              onChange={(e) => setTabs((prev) => prev.map((t) => t.id === activeTab.id ? { ...t, language: e.target.value } : t))}
              title="Language mode">
              {LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <span>UTF-8</span>
          </>
        )}
        <span className="right">Noder v0.8.0 · JagX & JRILICENSE</span>
      </footer>

      <CommandPalette open={showPalette} onClose={() => setShowPalette(false)} onExecute={runCommand} />

      {showGhModal && (
        <div className="modal-overlay" onClick={() => setShowGhModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Connect GitHub</h2>
            <p>Paste a Personal Access Token with <code>repo</code> scope.</p>
            <input type="password" id="gh-token" placeholder="ghp_…" autoFocus />
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
            <p>Collaboration server</p>
            <input value={collabServer} onChange={(e) => setCollabServer(e.target.value)} />
            <p>Room ID</p>
            <input value={collabRoom} onChange={(e) => setCollabRoom(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>Close</button>
              <button className="btn-primary" onClick={() => {
                localStorage.setItem('noder-collab-server', collabServer)
                setShowSettings(false)
                setStatusMsg('Settings saved')
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
