import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { api, parseClients } from '../lib/api'
import { useToast } from '../components/Toast'
import { useTranslation } from '../locales'
import './ScriptHubPage.css'

const FAVS_KEY = 'obsidian_script_favs'

interface Script {
  _id: string
  title: string
  game: { name: string }
  script: string
  views: number
  image: string
  verified: boolean
  key: boolean
  isUniversal: boolean
  likeCount: number
  dislikeCount: number
  createdAt: string
}

function fmt(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} minutes ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hours ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

function imgUrl(path: string) {
  if (!path) return ''
  return path.startsWith('http') ? path : 'https://scriptblox.com' + path
}

function loadFavs(): Script[] {
  try {
    const raw = localStorage.getItem(FAVS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    // Migrate old format (string IDs) to new format (Script objects)
    if (data.length > 0 && typeof data[0] === 'string') {
      const migrated: Script[] = []
      localStorage.setItem(FAVS_KEY, JSON.stringify(migrated))
      return migrated
    }
    return data.filter((s: any) => s && s._id)
  } catch { return [] }
}

function saveFavs(favs: Script[]) {
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs))
}

const ScriptCard = memo(function ScriptCard({ s, isFav, isCopied, onCopy, onExec, onToggleFav, onPreview }: {
  s: Script; isFav: boolean; isCopied: boolean
  onCopy: (script: string, id: string) => void
  onExec: (script: string) => void
  onToggleFav: (script: Script) => void
  onPreview: (script: Script) => void
}) {
  return (
    <div className="sh-card" onClick={() => onPreview(s)}>
      <div className="sh-img">
        {s.image ? <img src={imgUrl(s.image)} loading="lazy" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div className="sh-img-fallback" />}
        <div className="sh-badge-views">{fmt(s.views)}</div>
        <div className="sh-badge-time">{timeAgo(s.createdAt)}</div>
        <button className={`sh-fav ${isFav ? 'on' : ''}`} onClick={e => { e.stopPropagation(); onToggleFav(s) }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div className="sh-card-bottom">
        <div className="sh-status-row">
          <div className="sh-status-tags">
            {s.verified && <span className="sh-tag sh-tag-verified">V</span>}
            {s.key && <span className="sh-tag sh-tag-key">Key</span>}
            {!s.key && <span className="sh-tag sh-tag-free">Free</span>}
            {s.isUniversal && <span className="sh-tag sh-tag-universal">Uni</span>}
          </div>
        </div>
        <div className="sh-info">
          <div className="sh-title-row">
            <div className="sh-script-title">{s.title}</div>
          </div>
          <div className="sh-game-name">{s.game?.name ?? 'Universal'}</div>
          <div className="sh-row-bottom">
            <button className={`sh-btn sh-btn-copy ${isCopied ? 'ok' : ''}`} onClick={e => { e.stopPropagation(); onCopy(s.script, s._id) }}>
              {isCopied ? 'Copied' : 'Copy'}
            </button>
            <button className="sh-btn sh-btn-run" onClick={e => { e.stopPropagation(); onExec(s.script) }}>Run</button>
          </div>
        </div>
      </div>
    </div>
  )
})

type View = 'browse' | 'favorites'

interface Filters {
  verified: boolean
  universal: boolean
  key: boolean
  sortBy: 'updatedAt' | 'views' | 'likeCount'
  order: 'desc' | 'asc'
}

export default function ScriptHubPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [preview, setPreview] = useState<Script | null>(null)
  const [favs, setFavs] = useState<Script[]>(loadFavs)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('browse')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    verified: false,
    universal: false,
    key: false,
    sortBy: 'updatedAt',
    order: 'desc',
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const currentQ = useRef('fe')
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const loadingMoreRef = useRef(false)
  const scriptsRef = useRef<Script[]>([])
  const { showToast } = useToast()
  const { t } = useTranslation()

  const favIds = useMemo(() => new Set(favs.map(f => f._id)), [favs])

  const doSearch = async (q: string) => {
    currentQ.current = q || 'fe'
    pageRef.current = 1
    hasMoreRef.current = true
    scriptsRef.current = []
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`https://scriptblox.com/api/script/search?q=${encodeURIComponent(q || 'fe')}&page=1`, { cache: 'no-store' })
      if (res.status === 429) {
        setError('Rate limited by ScriptBlox. Wait a moment and try again.')
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError(`ScriptBlox servers are not responding (${res.status}). Try again later.`)
        setLoading(false)
        return
      }
      const data = await res.json()
      const list: Script[] = data.result?.scripts ?? []
      scriptsRef.current = list
      hasMoreRef.current = list.length > 0
      setScripts(list)
    } catch {
      setError('ScriptBlox servers are currently offline. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)

    const nextPage = pageRef.current + 1
    const q = currentQ.current
    let fetched: Script[] = []
    try {
      const params = new URLSearchParams({ q, page: String(nextPage), order: 'desc' })
      const res = await fetch(`https://scriptblox.com/api/script/search?${params}`)
      if (!res.ok) { hasMoreRef.current = false }
      else {
        const data = await res.json()
        fetched = data.result?.scripts ?? []
        if (fetched.length === 0) { hasMoreRef.current = false }
        else {
          pageRef.current = nextPage
          scriptsRef.current = [...scriptsRef.current, ...fetched]
        }
      }
    } catch { hasMoreRef.current = false }

    if (fetched.length > 0) {
      setScripts(prev => [...prev, ...fetched])
    }
    setLoadingMore(false)
    loadingMoreRef.current = false
  }, [])

  useEffect(() => { doSearch('') }, [])

  useEffect(() => {
    if (!showFilters) return
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFilters])

  const loadMoreRef2 = useRef(loadMore)
  loadMoreRef2.current = loadMore

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const h = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
        loadMoreRef2.current()
      }
    }
    el.addEventListener('scroll', h, { passive: true })
    return () => el.removeEventListener('scroll', h)
  }, [])

  const doCopy = useCallback((s: string, id: string) => {
    navigator.clipboard.writeText(s)
    setCopied(id)
    showToast('Script copied to clipboard', 'success')
    setTimeout(() => setCopied(null), 2000)
  }, [showToast])

  const doExec = useCallback(async (s: string) => {
    try {
      await api.init().catch(() => {})
      await new Promise(r => setTimeout(r, 500))
      await api.attach().catch(() => {})
      await new Promise(r => setTimeout(r, 1000))
      const d = await api.getClients().catch(() => ({ clients: '[]' }))
      const clients = parseClients(d.clients)
      const pids = clients.map(c => c.pid)
      if (pids.length) {
        await api.execute(s, pids)
        showToast(`Executed on ${pids.length} client${pids.length > 1 ? 's' : ''}`, 'success')
      } else {
        showToast('No clients attached', 'warning')
      }
    } catch {
      showToast('Failed to execute', 'error')
    }
  }, [showToast])

  const toggleFav = useCallback((script: Script) => {
    setFavs(prev => {
      const exists = prev.some(s => s._id === script._id)
      const next = exists ? prev.filter(s => s._id !== script._id) : [...prev, script]
      saveFavs(next)
      return next
    })
  }, [])

  const onPreview = useCallback((s: Script) => setPreview(s), [])

  const filtered = useMemo(() => {
    if (view === 'favorites') return favs
    return scripts.filter(s => {
      if (filters.verified && !s.verified) return false
      if (filters.universal && !s.isUniversal) return false
      if (filters.key && !s.key) return false
      return true
    }).sort((a, b) => {
      const dir = filters.order === 'desc' ? -1 : 1
      if (filters.sortBy === 'views') return (a.views - b.views) * dir
      if (filters.sortBy === 'likeCount') return (a.likeCount - b.likeCount) * dir
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
    })
  }, [view, favs, scripts, filters])

  const activeFilterCount = [filters.verified, filters.universal, filters.key].filter(Boolean).length
    + (filters.sortBy !== 'updatedAt' ? 1 : 0)
    + (filters.order !== 'desc' ? 1 : 0)

  const resetFilters = () => setFilters({ verified: false, universal: false, key: false, sortBy: 'updatedAt', order: 'desc' })

  return (
    <div className="sh-page">
      <div className="sh-header">
        <div className="sh-header-top">
          <div className="sh-view-tabs">
            <button className={`sh-view-tab ${view === 'browse' ? 'active' : ''}`} onClick={() => setView('browse')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              {t('scripthub.all')}
            </button>
            <button className={`sh-view-tab ${view === 'favorites' ? 'active' : ''}`} onClick={() => setView('favorites')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {t('scripthub.favorites')} {favs.length > 0 && <span className="sh-fav-count">{favs.length}</span>}
            </button>
          </div>
        </div>
        {view === 'browse' && (
          <>
            <div className="sh-search-bar">
              <div className="sh-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={inputRef} placeholder={t('scripthub.search')} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch(query)} />
                {query && <button className="sh-clear" onClick={() => { setQuery(''); doSearch(''); inputRef.current?.focus() }}>×</button>}
                <button className="sh-search-btn" onClick={() => doSearch(query)}>Search</button>
              </div>
              <div className="sh-filter-wrap" ref={filterRef}>
                <button className={`sh-filter-toggle ${showFilters ? 'active' : ''} ${activeFilterCount > 0 ? 'has-filters' : ''}`} onClick={() => setShowFilters(!showFilters)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                  Filter {activeFilterCount > 0 && <span className="sh-filter-badge">{activeFilterCount}</span>}
                </button>
                {showFilters && (
                  <div className="sh-filter-dropdown">
                    <div className="sh-filter-section">
                      <div className="sh-filter-section-title">Filter</div>
                      <label className="sh-filter-check">
                        <input type="checkbox" checked={filters.verified} onChange={e => setFilters(p => ({ ...p, verified: e.target.checked }))} />
                        <span>Verified</span>
                      </label>
                      <label className="sh-filter-check">
                        <input type="checkbox" checked={filters.universal} onChange={e => setFilters(p => ({ ...p, universal: e.target.checked }))} />
                        <span>Universal</span>
                      </label>
                      <label className="sh-filter-check">
                        <input type="checkbox" checked={filters.key} onChange={e => setFilters(p => ({ ...p, key: e.target.checked }))} />
                        <span>Key system</span>
                      </label>
                    </div>
                    <div className="sh-filter-divider" />
                    <div className="sh-filter-section">
                      <div className="sh-filter-section-title">Sort</div>
                      <select className="sh-filter-select" value={filters.sortBy} onChange={e => setFilters(p => ({ ...p, sortBy: e.target.value as Filters['sortBy'] }))}>
                        <option value="updatedAt">Update date</option>
                        <option value="views">Views</option>
                        <option value="likeCount">Likes</option>
                      </select>
                      <select className="sh-filter-select" value={filters.order} onChange={e => setFilters(p => ({ ...p, order: e.target.value as Filters['order'] }))}>
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>
                    <button className="sh-filter-reset" onClick={resetFilters}>Reset all</button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {view === 'favorites' && (
          <div className="sh-fav-info">
            <span>{favs.length} script{favs.length !== 1 ? 's' : ''} saved</span>
          </div>
        )}
      </div>

      <div className="sh-grid" ref={gridRef}>
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sh-card skeleton">
            <div className="sh-img skel" />
            <div className="sh-card-bottom">
              <div style={{ padding: '8px 10px 0' }}>
                <div className="skel" style={{ width: '50%', height: 7, borderRadius: 3 }} />
              </div>
              <div style={{ padding: '6px 10px' }}>
                <div className="skel" style={{ width: '80%', height: 10, borderRadius: 3 }} />
                <div className="skel" style={{ width: '50%', height: 8, marginTop: 5, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        ))}

        {!loading && error && (
          <div className="sh-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" style={{ marginBottom: 8 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ color: '#f0c000' }}>{error}</span>
            <button className="sh-btn sh-btn-run" style={{ padding: '6px 20px', marginTop: 8 }} onClick={() => doSearch(query)}>Retry</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="sh-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ marginBottom: 8 }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{view === 'favorites' ? 'No favorites yet. Browse scripts and tap the heart to save them.' : t('scripthub.noScripts')}</span>
          </div>
        )}

        {!loading && !error && filtered.map(s => (
          <ScriptCard
            key={s._id}
            s={s}
            isFav={favIds.has(s._id)}
            isCopied={copied === s._id}
            onCopy={doCopy}
            onExec={doExec}
            onToggleFav={toggleFav}
            onPreview={onPreview}
          />
        ))}

        {loadingMore && <div className="sh-loading-more"><div className="sh-spinner" /><span>Loading more...</span></div>}
      </div>

      {preview && (
        <div className="sh-modal-bg" onClick={() => setPreview(null)}>
          <div className="sh-modal" onClick={e => e.stopPropagation()}>
            <div className="sh-modal-head">
              <span className="sh-modal-title">{preview.title}</span>
              <button className="sh-modal-x" onClick={() => setPreview(null)}>×</button>
            </div>
            {preview.image && <div className="sh-modal-img"><img src={imgUrl(preview.image)} alt="" /></div>}
            <div className="sh-modal-body">
              <div className="sh-modal-row"><span className="sh-modal-label">Game</span><span className="sh-modal-val">{preview.game?.name ?? 'Universal'}</span></div>
              <div className="sh-modal-row"><span className="sh-modal-label">Views</span><span className="sh-modal-val">{preview.views.toLocaleString()}</span></div>
              <div className="sh-modal-row"><span className="sh-modal-label">Rating</span><span className="sh-modal-val"><span className="sh-modal-up">+{preview.likeCount}</span> <span className="sh-modal-down">-{preview.dislikeCount}</span></span></div>
              <div className="sh-modal-row"><span className="sh-modal-label">Posted</span><span className="sh-modal-val">{timeAgo(preview.createdAt)}</span></div>
              {preview.key && <div className="sh-modal-row"><span className="sh-modal-label">Key</span><span className="sh-modal-key">Required</span></div>}
            </div>
            <div className="sh-modal-foot">
              <button className={`sh-btn sh-btn-copy ${copied === preview._id ? 'ok' : ''}`} onClick={() => doCopy(preview.script, preview._id)}>
                {copied === preview._id ? 'Copied' : 'Copy Script'}
              </button>
              <button className="sh-btn sh-btn-run" onClick={() => doExec(preview.script)}>Execute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
