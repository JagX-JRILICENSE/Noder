import { useState, useEffect } from 'react'
import { Search, Replace } from 'lucide-react'

interface Props {
  visible: boolean
  content: string
  onClose: () => void
  onReplace: (next: string) => void
  onHighlight?: (index: number) => void
}

export default function FindReplace({ visible, content, onClose, onReplace }: Props) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!find) {
      setCount(0)
      return
    }
    try {
      const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      setCount((content.match(re) || []).length)
    } catch {
      setCount(0)
    }
  }, [find, content])

  if (!visible) return null

  const doReplaceOne = () => {
    if (!find) return
    const idx = content.indexOf(find)
    if (idx === -1) return
    onReplace(content.slice(0, idx) + replace + content.slice(idx + find.length))
  }

  const doReplaceAll = () => {
    if (!find) return
    onReplace(content.split(find).join(replace))
  }

  return (
    <div className="find-replace-bar">
      <Search size={14} />
      <input
        autoFocus
        placeholder="Find"
        value={find}
        onChange={(e) => setFind(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />
      <span className="find-count">{find ? `${count} found` : ''}</span>
      <Replace size={14} />
      <input
        placeholder="Replace"
        value={replace}
        onChange={(e) => setReplace(e.target.value)}
      />
      <button className="btn-small" disabled={!find || count === 0} onClick={doReplaceOne}>Replace</button>
      <button className="btn-small" disabled={!find || count === 0} onClick={doReplaceAll}>All</button>
      <button className="icon-btn" onClick={onClose}>✕</button>
    </div>
  )
}
