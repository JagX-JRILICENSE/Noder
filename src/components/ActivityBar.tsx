import {
  Files, Search, GitBranch, Package, Sparkles, Settings, Users, Terminal as TerminalIcon,
} from 'lucide-react'

export type ActivityId = 'explorer' | 'search' | 'git' | 'extensions' | 'ai' | 'collab'

interface Props {
  active: ActivityId
  onSelect: (id: ActivityId) => void
  onOpenSettings: () => void
  onToggleTerminal: () => void
  collabOn?: boolean
}

const items: { id: ActivityId; icon: typeof Files; title: string }[] = [
  { id: 'explorer', icon: Files, title: 'Explorer' },
  { id: 'search', icon: Search, title: 'Search' },
  { id: 'git', icon: GitBranch, title: 'Source Control' },
  { id: 'extensions', icon: Package, title: 'Extensions' },
  { id: 'ai', icon: Sparkles, title: 'AI Assistant' },
  { id: 'collab', icon: Users, title: 'Live Collaboration' },
]

export default function ActivityBar({
  active,
  onSelect,
  onOpenSettings,
  onToggleTerminal,
  collabOn,
}: Props) {
  return (
    <div className="activity-bar">
      <div className="activity-brand" title="Noder">
        <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden>
          <rect width="64" height="64" rx="14" fill="#12161c" />
          <path d="M16 16v32M16 16l32 32M48 16v32" stroke="#00d4aa" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="16" r="4" fill="#3ecfff" />
          <circle cx="16" cy="48" r="4" fill="#3ecfff" />
          <circle cx="48" cy="16" r="4" fill="#3ecfff" />
          <circle cx="48" cy="48" r="4" fill="#3ecfff" />
          <circle cx="32" cy="32" r="5" fill="#00d4aa" />
          <circle cx="50" cy="14" r="3.5" fill="#00ffb4" />
        </svg>
      </div>
      <div className="activity-items">
        {items.map(({ id, icon: Icon, title }) => (
          <button
            key={id}
            className={`activity-item ${active === id ? 'active' : ''} ${id === 'collab' && collabOn ? 'live' : ''}`}
            title={title}
            onClick={() => onSelect(id)}
          >
            <Icon size={22} strokeWidth={1.6} />
          </button>
        ))}
      </div>
      <div className="activity-bottom">
        <button className="activity-item" title="Terminal" onClick={onToggleTerminal}>
          <TerminalIcon size={20} strokeWidth={1.6} />
        </button>
        <button className="activity-item" title="Settings" onClick={onOpenSettings}>
          <Settings size={20} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  )
}
