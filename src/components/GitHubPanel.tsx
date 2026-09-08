import { useState, useEffect } from 'react'
import {
  Github, GitPullRequest, AlertCircle, RefreshCw, Plus, ExternalLink,
  FolderGit2, FileCode, ChevronLeft, Download,
} from 'lucide-react'
import type { GitHubRepo } from '../types'

interface Props {
  token: string | null
  user: string | null
  visible: boolean
  onClose: () => void
  workspace?: string | null
  onOpenContent?: (path: string, name: string, content: string) => void
  onCloned?: (folder: string) => void
  onStatus?: (msg: string) => void
}

interface GhFile {
  name: string
  path: string
  type: 'file' | 'dir'
  sha: string
  download_url?: string | null
}

export default function GitHubPanel({
  token, user, visible, onClose, workspace, onOpenContent, onCloned, onStatus,
}: Props) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [view, setView] = useState<'repos' | 'create-issue' | 'create-pr' | 'browse'>('repos')
  const [files, setFiles] = useState<GhFile[]>([])
  const [browsePath, setBrowsePath] = useState('')
  const [cloning, setCloning] = useState(false)

  const [issueTitle, setIssueTitle] = useState('')
  const [issueBody, setIssueBody] = useState('')
  const [creating, setCreating] = useState(false)
  const [prTitle, setPrTitle] = useState('')
  const [prBody, setPrBody] = useState('')
  const [prHead, setPrHead] = useState('')
  const [prBase, setPrBase] = useState('main')

  useEffect(() => {
    if (visible && token && view === 'repos') fetchRepos()
  }, [visible, token, view])

  async function gh(url: string, init?: RequestInit) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `GitHub ${res.status}`)
    }
    return res.json()
  }

  async function fetchRepos() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await gh('https://api.github.com/user/repos?per_page=50&sort=updated')
      setRepos(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }

  async function browseRepo(repo: GitHubRepo, path = '') {
    setSelectedRepo(repo)
    setBrowsePath(path)
    setView('browse')
    setLoading(true)
    setError(null)
    try {
      const url = path
        ? `https://api.github.com/repos/${repo.full_name}/contents/${path}`
        : `https://api.github.com/repos/${repo.full_name}/contents`
      const data = await gh(url)
      const list = (Array.isArray(data) ? data : [data]).map((f: any) => ({
        name: f.name,
        path: f.path,
        type: f.type === 'dir' ? 'dir' as const : 'file' as const,
        sha: f.sha,
        download_url: f.download_url,
      }))
      list.sort((a: GhFile, b: GhFile) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
      setFiles(list)
    } catch (e: any) {
      setError(e.message)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  async function openRemoteFile(file: GhFile) {
    if (!selectedRepo || file.type !== 'file') return
    setLoading(true)
    try {
      const data = await gh(
        `https://api.github.com/repos/${selectedRepo.full_name}/contents/${file.path}`
      )
      const content = data.encoding === 'base64'
        ? atob(data.content.replace(/\n/g, ''))
        : data.content
      // Prefer writing into workspace so user can commit/push with local git
      if (workspace && window.electronAPI?.writeFile) {
        const localPath = `${workspace.replace(/\\/g, '/')}/${file.path}`
        // ensure parent dirs by writing path as-is (main process writeFile is single file)
        const parts = file.path.split('/')
        if (parts.length > 1) {
          // create nested dirs via sequential writes not available — write only file if parent exists
        }
        const ok = await window.electronAPI.writeFile(localPath, content)
        if (ok) {
          onOpenContent?.(localPath, file.name, content)
          onStatus?.(`Opened ${file.path} from GitHub — edit, then Source Control → Commit & Push`)
        } else {
          onOpenContent?.(file.path, file.name, content)
          onStatus?.(`Previewing ${file.path} (save into an open folder to push)`)
        }
      } else {
        onOpenContent?.(file.path, file.name, content)
        onStatus?.(`Previewing ${file.path} — open a folder to save & push`)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function cloneRepo(repo: GitHubRepo) {
    if (!window.electronAPI) return
    setCloning(true)
    setError(null)
    try {
      // Pick parent folder
      const parent = await window.electronAPI.openFolder()
      if (!parent) {
        setCloning(false)
        return
      }
      const target = `${parent.replace(/\\/g, '/')}/${repo.name}`
      const res = await (window.electronAPI as any).gitClone?.(repo.clone_url || `https://github.com/${repo.full_name}.git`, target)
      if (res?.ok) {
        onCloned?.(target)
        onStatus?.(`Cloned ${repo.full_name} → ${target}`)
      } else {
        // Fallback: open clone URL guidance
        setError(res?.error || 'Clone failed — use Terminal: git clone ' + repo.html_url)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCloning(false)
    }
  }

  async function createIssue() {
    if (!token || !selectedRepo || !issueTitle.trim()) return
    setCreating(true)
    try {
      const issue = await gh(`https://api.github.com/repos/${selectedRepo.full_name}/issues`, {
        method: 'POST',
        body: JSON.stringify({ title: issueTitle, body: issueBody }),
      })
      window.electronAPI?.openExternal(issue.html_url)
      setIssueTitle('')
      setIssueBody('')
      setView('repos')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function createPR() {
    if (!token || !selectedRepo || !prTitle.trim() || !prHead.trim()) return
    setCreating(true)
    try {
      const pr = await gh(`https://api.github.com/repos/${selectedRepo.full_name}/pulls`, {
        method: 'POST',
        body: JSON.stringify({
          title: prTitle,
          body: prBody,
          head: prHead,
          base: prBase || selectedRepo.default_branch,
        }),
      })
      window.electronAPI?.openExternal(pr.html_url)
      setPrTitle('')
      setPrBody('')
      setPrHead('')
      setView('repos')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  if (!visible) return null

  return (
    <div className="gh-panel">
      <div className="gh-panel-header">
        <div className="gh-panel-title">
          <Github size={16} />
          <span>GitHub {user ? `@${user}` : ''}</span>
        </div>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>

      {!token ? (
        <div className="gh-empty">Connect GitHub (Login in the title bar), then clone or browse files, edit, and push from Source Control.</div>
      ) : view === 'repos' ? (
        <>
          <div className="gh-toolbar">
            <button className="btn-small" onClick={fetchRepos} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
          {error && <div className="gh-error">{error}</div>}
          <div className="gh-repo-list">
            {loading && <div className="gh-loading">Loading repositories…</div>}
            {!loading && repos.length === 0 && <div className="gh-empty">No repositories found.</div>}
            {repos.map((repo) => (
              <div key={repo.id} className="gh-repo-item">
                <div className="gh-repo-info">
                  <a href="#" onClick={(e) => { e.preventDefault(); browseRepo(repo) }}>
                    {repo.full_name}
                  </a>
                  {repo.private && <span className="badge">private</span>}
                  {repo.language && <span className="lang">{repo.language}</span>}
                  <p>{repo.description || 'No description'}</p>
                </div>
                <div className="gh-repo-actions">
                  <button title="Browse & edit files" onClick={() => browseRepo(repo)}>
                    <FolderGit2 size={14} />
                  </button>
                  <button title="Clone to disk" disabled={cloning} onClick={() => cloneRepo(repo)}>
                    <Download size={14} />
                  </button>
                  <button title="Create Issue" onClick={() => { setSelectedRepo(repo); setView('create-issue'); setError(null) }}>
                    <AlertCircle size={14} />
                  </button>
                  <button title="Create PR" onClick={() => { setSelectedRepo(repo); setPrBase(repo.default_branch); setView('create-pr'); setError(null) }}>
                    <GitPullRequest size={14} />
                  </button>
                  <button title="Open on GitHub" onClick={() => window.electronAPI?.openExternal(repo.html_url)}>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : view === 'browse' && selectedRepo ? (
        <div className="gh-browse">
          <div className="gh-toolbar">
            <button className="btn-small" onClick={() => {
              if (!browsePath) { setView('repos'); return }
              const parent = browsePath.split('/').slice(0, -1).join('/')
              browseRepo(selectedRepo, parent)
            }}>
              <ChevronLeft size={14} /> Back
            </button>
            <span className="gh-path">{selectedRepo.name}/{browsePath}</span>
            <button className="btn-small" disabled={cloning} onClick={() => cloneRepo(selectedRepo)}>
              <Download size={12} /> Clone
            </button>
          </div>
          {error && <div className="gh-error">{error}</div>}
          <div className="gh-repo-list">
            {loading && <div className="gh-loading">Loading…</div>}
            {files.map((f) => (
              <div
                key={f.path}
                className="gh-repo-item gh-file-row"
                onClick={() => (f.type === 'dir' ? browseRepo(selectedRepo, f.path) : openRemoteFile(f))}
              >
                <div className="gh-repo-info">
                  {f.type === 'dir' ? <FolderGit2 size={14} /> : <FileCode size={14} />}
                  <span>{f.name}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="ai-hint" style={{ padding: '8px 12px' }}>
            Open a file to edit it. For full push workflow: Clone the repo, edit locally, then Source Control → Commit & Push.
          </p>
        </div>
      ) : view === 'create-issue' && selectedRepo ? (
        <div className="gh-form">
          <h3>New Issue · {selectedRepo.name}</h3>
          {error && <div className="gh-error">{error}</div>}
          <input placeholder="Issue title" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} />
          <textarea placeholder="Description" rows={6} value={issueBody} onChange={(e) => setIssueBody(e.target.value)} />
          <div className="gh-form-actions">
            <button className="btn-secondary" onClick={() => setView('repos')}>Back</button>
            <button className="btn-primary" onClick={createIssue} disabled={creating || !issueTitle.trim()}>
              <Plus size={14} /> {creating ? 'Creating…' : 'Create Issue'}
            </button>
          </div>
        </div>
      ) : view === 'create-pr' && selectedRepo ? (
        <div className="gh-form">
          <h3>New Pull Request · {selectedRepo.name}</h3>
          {error && <div className="gh-error">{error}</div>}
          <input placeholder="PR title" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} />
          <input placeholder="Head branch" value={prHead} onChange={(e) => setPrHead(e.target.value)} />
          <input placeholder="Base branch" value={prBase} onChange={(e) => setPrBase(e.target.value)} />
          <textarea placeholder="Description" rows={4} value={prBody} onChange={(e) => setPrBody(e.target.value)} />
          <div className="gh-form-actions">
            <button className="btn-secondary" onClick={() => setView('repos')}>Back</button>
            <button className="btn-primary" onClick={createPR} disabled={creating || !prTitle.trim() || !prHead.trim()}>
              <GitPullRequest size={14} /> {creating ? 'Creating…' : 'Create PR'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
