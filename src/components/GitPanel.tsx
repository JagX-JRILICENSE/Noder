import { useState, useEffect, useCallback } from 'react'
import { GitBranch, RefreshCw, Plus, Minus, Check, FileCode, ArrowUp, ArrowDown } from 'lucide-react'
import type { GitStatus } from '../types'

interface Props {
  workspace: string | null
  visible: boolean
  onClose: () => void
  onStatusChange?: (status: GitStatus | null) => void
}

function fileState(f: { index: string; working_dir: string }) {
  const staged = f.index !== ' ' && f.index !== '?'
  const unstaged = f.working_dir !== ' '
  return { staged, unstaged }
}

export default function GitPanel({ workspace, visible, onClose, onStatusChange }: Props) {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!workspace || !window.electronAPI?.gitStatus) {
      setStatus(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const s = await window.electronAPI.gitStatus(workspace)
      setStatus(s)
      onStatusChange?.(s)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [workspace, onStatusChange])

  useEffect(() => {
    if (visible) refresh()
  }, [visible, refresh])

  if (!visible) return null

  const staged = status?.files.filter((f) => fileState(f).staged) || []
  const unstaged = status?.files.filter((f) => fileState(f).unstaged || f.index === '?') || []

  const stage = async (path: string) => {
    setBusy(true)
    await window.electronAPI?.gitStage?.(path, workspace || undefined)
    await refresh()
    setBusy(false)
  }

  const unstage = async (path: string) => {
    setBusy(true)
    await window.electronAPI?.gitUnstage?.(path, workspace || undefined)
    await refresh()
    setBusy(false)
  }

  const stageAll = async () => {
    if (!unstaged.length) return
    setBusy(true)
    await window.electronAPI?.gitStage?.(unstaged.map((f) => f.path), workspace || undefined)
    await refresh()
    setBusy(false)
  }

  const commit = async () => {
    if (!message.trim()) {
      setError('Enter a commit message')
      return
    }
    setBusy(true)
    setError(null)
    const res = await window.electronAPI?.gitCommit?.(message.trim(), workspace || undefined)
    setBusy(false)
    if (res?.ok) {
      setMessage('')
      setInfo(`Committed ${res.commit || ''}`)
      await refresh()
    } else {
      setError(res?.error || 'Commit failed')
    }
  }

  const push = async () => {
    setBusy(true)
    setError(null)
    setInfo(null)
    const res = await window.electronAPI?.gitPush?.(workspace || undefined)
    setBusy(false)
    if (res?.ok) {
      setInfo('Push succeeded')
      await refresh()
    } else {
      setError(res?.error || 'Push failed')
    }
  }

  const pull = async () => {
    setBusy(true)
    setError(null)
    setInfo(null)
    const res = await window.electronAPI?.gitPull?.(workspace || undefined)
    setBusy(false)
    if (res?.ok) {
      setInfo('Pull succeeded')
      await refresh()
    } else {
      setError(res?.error || 'Pull failed')
    }
  }

  return (
    <div className="git-panel">
      <div className="git-panel-header">
        <div className="git-panel-title">
          <GitBranch size={14} />
          <span>Source Control</span>
          {status?.current && <span className="git-branch-label">{status.current}</span>}
        </div>
        <div className="git-panel-actions">
          <button className="icon-btn" title="Pull" onClick={pull} disabled={busy || !status}>
            <ArrowDown size={14} />
          </button>
          <button className="icon-btn" title="Push" onClick={push} disabled={busy || !status}>
            <ArrowUp size={14} />
          </button>
          <button className="icon-btn" title="Refresh" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {!workspace ? (
        <div className="git-empty">Open a folder to use Git.</div>
      ) : !status ? (
        <div className="git-empty">{loading ? 'Loading…' : 'Not a Git repository (or Git unavailable).'}</div>
      ) : (
        <>
          <div className="git-sync-bar">
            <button className="btn-small" onClick={pull} disabled={busy}>
              <ArrowDown size={12} /> Pull
            </button>
            <button className="btn-small" onClick={push} disabled={busy}>
              <ArrowUp size={12} /> Push
            </button>
            {(status.ahead > 0 || status.behind > 0) && (
              <span className="git-sync-meta">
                {status.ahead > 0 && <span>↑{status.ahead}</span>}
                {status.behind > 0 && <span> ↓{status.behind}</span>}
              </span>
            )}
          </div>

          <div className="git-commit-box">
            <textarea
              placeholder="Commit message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <button
              className="btn-primary git-commit-btn"
              disabled={busy || staged.length === 0}
              onClick={commit}
            >
              <Check size={14} /> Commit {staged.length > 0 ? `(${staged.length})` : ''}
            </button>
            {error && <div className="gh-error">{error}</div>}
            {info && <div className="git-info">{info}</div>}
          </div>

          <div className="git-section">
            <div className="git-section-header">
              <span>Staged Changes ({staged.length})</span>
            </div>
            {staged.length === 0 && <div className="git-empty-sm">No staged files</div>}
            {staged.map((f) => (
              <div key={`s-${f.path}`} className="git-file">
                <FileCode size={14} />
                <span className="git-file-name" title={f.path}>{f.path}</span>
                <span className="git-file-badge staged">{f.index}</span>
                <button title="Unstage" disabled={busy} onClick={() => unstage(f.path)}>
                  <Minus size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="git-section">
            <div className="git-section-header">
              <span>Changes ({unstaged.length})</span>
              {unstaged.length > 0 && (
                <button className="btn-small" onClick={stageAll} disabled={busy}>
                  <Plus size={12} /> Stage All
                </button>
              )}
            </div>
            {unstaged.length === 0 && status.isClean && (
              <div className="git-empty-sm">Working tree clean</div>
            )}
            {unstaged.map((f) => (
              <div key={`u-${f.path}`} className="git-file">
                <FileCode size={14} />
                <span className="git-file-name" title={f.path}>{f.path}</span>
                <span className="git-file-badge">{f.working_dir === '?' ? 'U' : f.working_dir}</span>
                <button title="Stage" disabled={busy} onClick={() => stage(f.path)}>
                  <Plus size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
