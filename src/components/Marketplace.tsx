import { useState, useEffect } from 'react'
import { Package, Star, Download } from 'lucide-react'

interface MarketExt {
  id: string
  name: string
  version: string
  publisher: string
  description: string
  categories: string[]
  install: string
  featured?: boolean
}

interface Props {
  visible: boolean
  onClose: () => void
}

export default function Marketplace({ visible, onClose }: Props) {
  const [extensions, setExtensions] = useState<MarketExt[]>([])
  const [installed, setInstalled] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    Promise.all([
      window.electronAPI?.marketplaceList?.() ?? Promise.resolve({ extensions: [] }),
      window.electronAPI?.listExtensions?.() ?? Promise.resolve([]),
    ]).then(([catalog, local]) => {
      setExtensions(catalog?.extensions || [])
      setInstalled((local || []).map((e: any) => e.id))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [visible])

  if (!visible) return null

  const filtered = extensions.filter((e) => {
    const q = query.toLowerCase()
    if (!q) return true
    return (
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.publisher.toLowerCase().includes(q) ||
      e.categories.some((c) => c.toLowerCase().includes(q))
    )
  })

  return (
    <div className="marketplace-panel">
      <div className="marketplace-header">
        <div className="marketplace-title">
          <Package size={16} />
          <span>Extensions</span>
        </div>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>

      <div className="marketplace-search">
        <input
          placeholder="Search extensions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="marketplace-list">
        {loading && <div className="git-empty">Loading catalog…</div>}
        {!loading && filtered.length === 0 && (
          <div className="git-empty">No extensions found.</div>
        )}
        {filtered.map((ext) => {
          const isInstalled = installed.includes(ext.id) || ext.install === 'bundled'
          return (
            <div key={ext.id} className="marketplace-item">
              <div className="marketplace-item-icon">
                <Package size={22} />
              </div>
              <div className="marketplace-item-body">
                <div className="marketplace-item-name">
                  {ext.name}
                  {ext.featured && <Star size={12} className="featured-star" />}
                </div>
                <div className="marketplace-item-meta">
                  {ext.publisher} · v{ext.version}
                  {ext.categories.map((c) => (
                    <span key={c} className="badge">{c}</span>
                  ))}
                </div>
                <p>{ext.description}</p>
              </div>
              <div className="marketplace-item-action">
                {isInstalled ? (
                  <span className="installed-label">Installed</span>
                ) : ext.install === 'coming-soon' ? (
                  <span className="coming-soon">Coming soon</span>
                ) : (
                  <button className="btn-small" disabled>
                    <Download size={12} /> Install
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="marketplace-footer">
        Local extensions load from <code>extensions/</code>. Remote install coming later.
      </div>
    </div>
  )
}
