import { Files, Search, GitBranch, Puzzle, Settings, Sparkles, Github } from 'lucide-react'

export type ActivityId = 'explorer' | 'search' | 'git' | 'extensions' | 'github' | 'ai' | 'settings'

interface Props {
  active: ActivityId
  onSelect: (id: ActivityId) => void
}

const items: { id: ActivityId; icon: typeof Files; title: string }[] = [
  { id: 'explorer', icon: Files, title: 'Explorer' },
  { id: 'search', icon: Search, title: 'Search' },
  { id: 'git', icon: GitBranch, title: 'Source Control' },
  { id: 'github', icon: Github, title: 'GitHub' },
  { id: 'extensions', icon: Puzzle, title: 'Extensions' },
  { id: 'ai', icon: Sparkles, title: 'AI Agent' },
]

export default function ActivityBar({ active, onSelect }: Props) {
  return (
    <div className="activity-bar">
      <div className="activity-top">
        {items.map(({ id, icon: Icon, title }) => (
          <button key={id} className={`activity-btn ${active === id ? 'active' : ''}`} title={title} onClick={() => onSelect(id)}>
            <Icon size={22} />
          </button>
        ))}
      </div>
      <div className="activity-bottom">
        <button className={`activity-btn ${active === 'settings' ? 'active' : ''}`} title="Settings" onClick={() => onSelect('settings')}>
          <Settings size={22} />
        </button>
      </div>
    </div>
  )
}
