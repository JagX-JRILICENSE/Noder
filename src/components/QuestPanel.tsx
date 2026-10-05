import { useState, useEffect } from 'react'
import { ListTodo, Play, CheckCircle2, Circle, Sparkles, Trash2 } from 'lucide-react'

export interface QuestStep { id: string; title: string; status: 'pending' | 'running' | 'done' | 'failed'; detail?: string }
export interface Quest { id: string; goal: string; steps: QuestStep[]; createdAt: number; status: 'idle' | 'running' | 'done' }

interface Props {
  visible: boolean
  onClose: () => void
  quest: Quest | null
  onStartAgent: (goal: string) => void
  onClear: () => void
}

export default function QuestPanel({ visible, onClose, quest, onStartAgent, onClear }: Props) {
  const [goal, setGoal] = useState('')
  useEffect(() => { if (quest?.goal) setGoal(quest.goal) }, [quest?.goal])
  if (!visible) return null
  const done = quest?.steps.filter((s) => s.status === 'done').length || 0
  const total = quest?.steps.length || 0
  return (
    <div className="quest-panel">
      <div className="sidebar-header">
        <span><ListTodo size={14} style={{ verticalAlign: -2, marginRight: 6 }} />QUEST</span>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      <div className="quest-body">
        <p className="quest-hint">Describe a multi-step goal. The agent plans steps, writes files, and runs commands.</p>
        <textarea className="quest-input" rows={3} placeholder="e.g. Build an animated portfolio site" value={goal} onChange={(e) => setGoal(e.target.value)} />
        <div className="quest-actions">
          <button className="btn-primary" disabled={!goal.trim()} onClick={() => onStartAgent(goal.trim())}><Play size={14} /> Start Quest</button>
          {quest && <button className="btn-secondary" onClick={onClear}><Trash2 size={14} /></button>}
        </div>
        {quest && (
          <div className="quest-progress">
            <div className="quest-progress-bar"><div style={{ width: total ? `${(done / total) * 100}%` : '0%' }} /></div>
            <span>{done}/{total} steps · {quest.status}</span>
          </div>
        )}
        {quest?.steps?.length ? (
          <ul className="quest-steps">
            {quest.steps.map((s) => (
              <li key={s.id} className={`quest-step ${s.status}`}>
                {s.status === 'done' ? <CheckCircle2 size={14} /> : s.status === 'running' ? <Sparkles size={14} /> : <Circle size={14} />}
                <div><div className="quest-step-title">{s.title}</div>{s.detail && <div className="quest-step-detail">{s.detail}</div>}</div>
              </li>
            ))}
          </ul>
        ) : <div className="quest-empty">No active quest. Start one above or ask the AI Agent.</div>}
      </div>
    </div>
  )
}

export function parseQuestSteps(text: string, goal: string): Quest {
  const steps: QuestStep[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(?:\d+[\.)]\s+|[-*]\s+)(.+)/)
    if (m) steps.push({ id: `s-${steps.length + 1}`, title: m[1].replace(/\*\*/g, '').slice(0, 120), status: 'pending' })
  }
  if (!steps.length) {
    steps.push(
      { id: 's-1', title: 'Understand goal & workspace', status: 'done' },
      { id: 's-2', title: 'Write / update project files', status: 'running' },
      { id: 's-3', title: 'Run install / build if needed', status: 'pending' },
      { id: 's-4', title: 'Verify in editor / preview', status: 'pending' },
    )
  }
  return { id: `q-${Date.now()}`, goal, steps, createdAt: Date.now(), status: 'running' }
}
