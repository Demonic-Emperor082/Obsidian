import { useState, useRef, useEffect, useMemo } from 'react'
import './OutputConsole.css'

export type OutputEntry = {
  id: number
  type: 'print' | 'warn' | 'error' | 'info'
  message: string
  timestamp: number
}

interface Props {
  entries: OutputEntry[]
  onClear: () => void
}

export default function OutputConsole({ entries, onClear }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all')
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return entries
    return entries.filter(e => e.type === filter)
  }, [entries, filter])

  const errorCount = entries.filter(e => e.type === 'error').length
  const warnCount = entries.filter(e => e.type === 'warn').length

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [entries])

  const handleCopy = () => {
    const text = filtered.map(e =>
      `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.type}] ${e.message}`
    ).join('\n')
    navigator.clipboard.writeText(text)
  }

  if (collapsed) {
    return (
      <div className="output-bar" onClick={() => setCollapsed(false)}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        <span className="output-bar-label">Output</span>
        {entries.length > 0 && <span className="output-bar-count">{entries.length}</span>}
        {errorCount > 0 && <span className="output-bar-error">{errorCount}</span>}
      </div>
    )
  }

  return (
    <div className="output-panel">
      <div className="output-header">
        <div className="output-header-left" onClick={() => setCollapsed(true)}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
          <span className="output-title">Output</span>
          {entries.length > 0 && <span className="output-count">{entries.length}</span>}
        </div>
        <div className="output-filters">
          <button className={`output-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          {warnCount > 0 && <button className={`output-filter output-filter-warn ${filter === 'warn' ? 'active' : ''}`} onClick={() => setFilter('warn')}>Warn ({warnCount})</button>}
          {errorCount > 0 && <button className={`output-filter output-filter-error ${filter === 'error' ? 'active' : ''}`} onClick={() => setFilter('error')}>Error ({errorCount})</button>}
        </div>
        <div className="output-actions">
          <button className="output-action" onClick={handleCopy} title="Copy output">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button className="output-action" onClick={onClear} title="Clear output">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </div>
      <div className="output-list" ref={listRef}>
        {filtered.length === 0 && (
          <div className="output-empty">
            {entries.length === 0 ? 'No output yet' : `No ${filter} entries`}
          </div>
        )}
        {filtered.map(e => (
          <div key={e.id} className={`output-entry output-${e.type}`}>
            <span className="output-time">
              {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="output-type-badge">{e.type}</span>
            <span className="output-msg">{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
