import { useState, useRef, useEffect } from 'react'
import type { Page } from '../App'
import { useToast } from '../components/Toast'
import { useTranslation } from '../locales'
import './LibraryPage.css'

const LIB_KEY = 'obsidian_script_library'

export interface LibScript {
  id: string
  name: string
  content: string
  source: 'editor' | 'hub' | 'import' | 'paste'
  game?: string
  createdAt: number
  updatedAt: number
}

function loadLibrary(): LibScript[] {
  try {
    const raw = localStorage.getItem(LIB_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

function saveLibrary(scripts: LibScript[]) {
  localStorage.setItem(LIB_KEY, JSON.stringify(scripts))
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

interface Props {
  setPage?: (p: Page) => void
}

export default function LibraryPage({ setPage }: Props) {
  const [scripts, setScripts] = useState<LibScript[]>(loadLibrary)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    if (editing !== null) {
      editRef.current?.focus()
      editRef.current?.select()
    }
  }, [editing])

  const addScript = (name: string, content: string, source: LibScript['source'] = 'paste', game?: string) => {
    const now = Date.now()
    const s: LibScript = { id: uid(), name, content, source, game, createdAt: now, updatedAt: now }
    setScripts(prev => { const next = [s, ...prev]; saveLibrary(next); return next })
    showToast('Script saved to library', 'success')
  }

  const deleteScript = (id: string) => {
    setScripts(prev => {
      const next = prev.filter(s => s.id !== id)
      saveLibrary(next)
      return next
    })
    if (selected === id) setSelected(null)
    showToast('Script deleted', 'info')
  }

  const renameScript = (id: string, name: string) => {
    setScripts(prev => {
      const next = prev.map(s => s.id === id ? { ...s, name, updatedAt: Date.now() } : s)
      saveLibrary(next)
      return next
    })
    setEditing(null)
  }

  const loadIntoEditor = (s: LibScript) => {
    if (setPage) {
      // Store the script to load in localStorage so editor can pick it up
      localStorage.setItem('lunex_load_script', JSON.stringify({ name: s.name, content: s.content }))
      setPage('editor')
      showToast(`"${s.name}" loaded into editor`, 'success')
    }
  }

  const copyScript = (s: LibScript) => {
    navigator.clipboard.writeText(s.content)
    showToast('Copied to clipboard', 'success')
  }

  const filtered = scripts.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.content.toLowerCase().includes(search.toLowerCase())
  )

  const selectedScript = scripts.find(s => s.id === selected)

  return (
    <div className="lib-page">
      <div className="lib-sidebar">
        <div className="lib-sidebar-head">
          <span className="lib-sidebar-title">{t('library.title')}</span>
          <button className="lib-new-btn" onClick={() => setShowNew(true)} title="New script">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <div className="lib-search">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref={inputRef} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="lib-list">
          {filtered.length === 0 && (
            <div className="lib-empty-list">
              {scripts.length === 0 ? t('library.empty') : 'No matches'}
            </div>
          )}
          {filtered.map(s => (
            <div
              key={s.id}
              className={`lib-item ${selected === s.id ? 'active' : ''}`}
              onClick={() => { setSelected(s.id); setShowNew(false) }}
              onDoubleClick={() => { setEditing(s.id); setEditName(s.name) }}
            >
              {editing === s.id ? (
                <input
                  ref={editRef}
                  className="lib-rename-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                    onBlur={() => { if (editName.trim()) renameScript(s.id, editName.trim()); else setEditing(null) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && editName.trim()) renameScript(s.id, editName.trim())
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  onClick={e => e.stopPropagation()}
                  maxLength={40}
                />
              ) : (
                <>
                  <span className="lib-item-name">{s.name}</span>
                  <span className="lib-item-time">{timeAgo(s.updatedAt)}</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="lib-sidebar-foot">
          <span className="lib-count">{scripts.length} script{scripts.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="lib-content">
        {showNew && (
          <div className="lib-new-form">
            <div className="lib-new-head">
              <span className="lib-new-title">New Script</span>
              <button className="lib-modal-x" onClick={() => { setShowNew(false); setNewName(''); setNewContent('') }}>×</button>
            </div>
            <input
              className="lib-new-name"
              placeholder="Script name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
            />
            <textarea
              className="lib-new-code"
              placeholder="Paste your script here..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              spellCheck={false}
            />
            <div className="lib-new-foot">
              <button className="lib-btn lib-btn-cancel" onClick={() => { setShowNew(false); setNewName(''); setNewContent('') }}>Cancel</button>
              <button
                className="lib-btn lib-btn-save"
                disabled={!newName.trim() || !newContent.trim()}
                onClick={() => { addScript(newName.trim(), newContent.trim()); setShowNew(false); setNewName(''); setNewContent('') }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {!showNew && selectedScript && (
          <div className="lib-detail">
            <div className="lib-detail-head">
              <div className="lib-detail-info">
                <span className="lib-detail-name">{selectedScript.name}</span>
                <span className="lib-detail-meta">
                  {selectedScript.source === 'editor' ? 'From Editor' : selectedScript.source === 'hub' ? 'From Script Hub' : selectedScript.source === 'import' ? 'Imported' : 'Pasted'}
                  {' · '}{timeAgo(selectedScript.updatedAt)}
                  {selectedScript.game && ` · ${selectedScript.game}`}
                </span>
              </div>
              <div className="lib-detail-actions">
                <button className="lib-btn lib-btn-ghost" onClick={() => copyScript(selectedScript)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </button>
                <button className="lib-btn lib-btn-accent" onClick={() => loadIntoEditor(selectedScript)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L13.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Load in Editor
                </button>
                <button className="lib-btn lib-btn-ghost lib-btn-danger" onClick={() => deleteScript(selectedScript.id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  Delete
                </button>
              </div>
            </div>
            <pre className="lib-code">{selectedScript.content}</pre>
          </div>
        )}

        {!showNew && !selectedScript && scripts.length > 0 && (
          <div className="lib-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
              <path d="M13.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L13.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>Select a script to preview</span>
          </div>
        )}

        {!showNew && !selectedScript && scripts.length === 0 && (
          <div className="lib-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
              <path d="M13.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L13.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>Your script library is empty</span>
            <span className="lib-placeholder-sub">Click + to add a new script, or save one from the editor</span>
          </div>
        )}
      </div>
    </div>
  )
}
