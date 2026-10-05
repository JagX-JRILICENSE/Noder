import { useEffect, useState } from 'react'
import { Download, Puzzle, Star } from 'lucide-react'

interface ExtItem {
  id: string
  name: string
  version: string
  publisher: string
  description: string
  categories?: string[]
  install?: string
  featured?: boolean
}

export default function Marketplace() {
  const [items, setItems] = useState<ExtItem[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await window.electronAPI?.marketplaceList?.()
        if (res?.extensions) setItems(res.extensions)
      } catch {
        setItems([])
      }
    })()
  }, [])

  const filtered = items.filter((e) =>
    !q.trim() || e.name.toLowerCase().includes(q.toLowerCase()) || e.description?.toLowerCase().includes(q.toLowerCase())
  )

  const install = async (id: string) => {
    setBusy(id)
    try {
      const r = await window.electronAPI?.marketplaceInstall?.(id)
      if (r?.ok) alert(`Installed ${id}`)
      else alert(r?.error || 'Install failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="marketplace-panel">
      <div className="sidebar-header"><span><Puzzle size={14} style={{ verticalAlign: -2, marginRight: 6 }} />EXTENSIONS</span></div>
      <input className="marketplace-search" placeholder="Search extensions..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="marketplace-list">
        {filtered.map((e) => (
          <div key={e.id} className="marketplace-card">
            <div className="marketplace-card-title">
              {e.name} {e.featured && <Star size={12} className="featured-star" />}
            </div>
            <div className="marketplace-card-meta">{e.publisher} · v{e.version}</div>
            <p className="marketplace-card-desc">{e.description}</p>
            <button className="btn-secondary" disabled={busy === e.id || e.install === 'coming-soon'} onClick={() => install(e.id)}>
              <Download size={14} /> {busy === e.id ? 'Installing…' : e.install === 'bundled' ? 'Bundled' : 'Install'}
            </button>
          </div>
        ))}
        {!filtered.length && <div className="empty-state">No extensions found</div>}
      </div>
    </div>
  )
}
