import { useState, useEffect } from 'react'
import { Github, GitPullRequest, AlertCircle, RefreshCw, Plus, ExternalLink } from 'lucide-react'
import type { GitHubRepo } from '../types'

interface Props {
  token: string | null
  user: string | null
  visible: boolean
  onClose: () => void
}

export default function GitHubPanel({ token, user, visible, onClose }: Props) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [view, setView] = useState<'repos' | 'create-issue' | 'create-pr'>('repos')

  // Create issue form
  const [issueTitle, setIssueTitle] = useState('')
  const [issueBody, setIssueBody] = useState('')
  const [creating, setCreating] = useState(false)

  // Create PR form
  const [prTitle, setPrTitle] = useState('')
  const [prBody, setPrBody] = useState('')
  const [prHead, setPrHead] = useState('')
  const [prBase, setPrBase] = useState('main')

  useEffect(() => {
    if (visible && token && view === 'repos') {
      fetchRepos()
    }
  }, [visible, token, view])

  async function fetchRepos() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      })
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
      const data = await res.json()
      setRepos(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }

  async function createIssue() {
    if (!token || !selectedRepo || !issueTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch(
        `https://api.github.com/repos/${selectedRepo.full_name}/issues`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: issueTitle, body: issueBody }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to create issue')
      }
      const issue = await res.json()
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
      const res = await fetch(
        `https://api.github.com/repos/${selectedRepo.full_name}/pulls`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: prTitle,
            body: prBody,
            head: prHead,
            base: prBase || selectedRepo.default_branch,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to create pull request')
      }
      const pr = await res.json()
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
        <div className="gh-empty">Connect your GitHub account first (Login button in title bar).</div>
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
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      window.electronAPI?.openExternal(repo.html_url)
                    }}
                  >
                    {repo.full_name}
                  </a>
                  {repo.private && <span className="badge">private</span>}
                  {repo.language && <span className="lang">{repo.language}</span>}
                  <p>{repo.description || 'No description'}</p>
                </div>
                <div className="gh-repo-actions">
                  <button
                    title="Create Issue"
                    onClick={() => {
                      setSelectedRepo(repo)
                      setView('create-issue')
                      setError(null)
                    }}
                  >
                    <AlertCircle size={14} />
                  </button>
                  <button
                    title="Create Pull Request"
                    onClick={() => {
                      setSelectedRepo(repo)
                      setPrBase(repo.default_branch)
                      setView('create-pr')
                      setError(null)
                    }}
                  >
                    <GitPullRequest size={14} />
                  </button>
                  <button
                    title="Open on GitHub"
                    onClick={() => window.electronAPI?.openExternal(repo.html_url)}
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : view === 'create-issue' && selectedRepo ? (
        <div className="gh-form">
          <h3>New Issue · {selectedRepo.name}</h3>
          {error && <div className="gh-error">{error}</div>}
          <input
            placeholder="Issue title"
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            rows={6}
            value={issueBody}
            onChange={(e) => setIssueBody(e.target.value)}
          />
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
          <input
            placeholder="PR title"
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
          />
          <input
            placeholder="Head branch (e.g. feature/my-feature)"
            value={prHead}
            onChange={(e) => setPrHead(e.target.value)}
          />
          <input
            placeholder="Base branch"
            value={prBase}
            onChange={(e) => setPrBase(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            rows={4}
            value={prBody}
            onChange={(e) => setPrBody(e.target.value)}
          />
          <div className="gh-form-actions">
            <button className="btn-secondary" onClick={() => setView('repos')}>Back</button>
            <button
              className="btn-primary"
              onClick={createPR}
              disabled={creating || !prTitle.trim() || !prHead.trim()}
            >
              <GitPullRequest size={14} /> {creating ? 'Creating…' : 'Create Pull Request'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
