import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ErrorBoundary from './components/ErrorBoundary'
import UpdateBanner from './components/UpdateBanner'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'
import ScriptHubPage from './pages/ScriptHubPage'
import SettingsPage from './pages/SettingsPage'
import LibraryPage from './pages/LibraryPage'
import AiPage from './pages/AiPage'
import { ToastProvider, useToast } from './components/Toast'
import { loadSettings, applyLowPerf } from './lib/settings'
import { api } from './lib/api'
import './styles/app.css'

export type Page = 'home' | 'editor' | 'scripthub' | 'settings' | 'library' | 'ai'

const PAGE_RPC_STATE: Record<Page, string> = {
  home: 'Viewing Home',
  editor: 'Editing Script',
  scripthub: 'Browsing Script Hub',
  settings: 'Changing Settings',
  library: 'Managing Scripts',
  ai: 'Chatting with AI',
}

const PAGE_ORDER: Page[] = ['home', 'editor', 'scripthub', 'library', 'ai', 'settings']

function getDirection(from: Page, to: Page): 'left' | 'right' {
  const fi = PAGE_ORDER.indexOf(from)
  const ti = PAGE_ORDER.indexOf(to)
  return ti > fi ? 'right' : 'left'
}

function AppInner() {
  const [page, setPage] = useState<Page>('home')
  const [displayPage, setDisplayPage] = useState<Page>('home')
  const [exitingPage, setExitingPage] = useState<Page | null>(null)
  const [animDir, setAnimDir] = useState<'left' | 'right'>('right')
  const { showToast } = useToast()
  const [settings, setSettings] = useState(loadSettings)

  const handleSetPage = useCallback((newPage: Page) => {
    if (newPage === page) return
    let resizeDelay = 0
    if (newPage === 'ai') {
      window.lunex?.setWindowSize(1100, 650)
      resizeDelay = 260
    } else if (page === 'ai') {
      window.lunex?.setWindowSize(800, 500)
      resizeDelay = 130
    }
    setExitingPage(page)
    setAnimDir(getDirection(page, newPage))
    setPage(newPage)
    const showNew = () => {
      setDisplayPage(newPage)
      setTimeout(() => setExitingPage(null), 700)
    }
    if (resizeDelay > 0) {
      const t = setTimeout(showNew, resizeDelay)
      return () => clearTimeout(t)
    } else {
      showNew()
    }
    if (settings.discordRpc) {
      window.lunex?.rpc.update(PAGE_RPC_STATE[newPage])
    }
  }, [page, settings.discordRpc])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') { e.preventDefault(); window.lunex?.zoomIn() }
        else if (e.key === '-') { e.preventDefault(); window.lunex?.zoomOut() }
        else if (e.key === '0') { e.preventDefault(); window.lunex?.zoomReset() }
        else if (e.key === 's') {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('lunex-shortcut', { detail: 'save' }))
        }
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('lunex-shortcut', { detail: 'execute' }))
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    const checkUpdate = async () => {
      try {
        const currentVersion = await api.version().catch(() => '')
        if (!currentVersion) return
        const update = await api.sumiCheckUpdate(currentVersion).catch(() => null)
        if (update?.needsUpdate) {
          showToast(`Xeno v${update.latestVersion} available. Updating...`, 'info')
          const download = await api.sumiGetDownload().catch(() => null)
          const zipHit = download?.hits?.find(h => h.handler === 'relativeZipPath')
          if (zipHit?.url) {
            const ok = await window.lunex?.downloadXenoUpdate(zipHit.url)
            if (ok) showToast('Xeno updated successfully', 'success')
            else showToast('Update failed', 'error')
          }
        }
      } catch {}
    }
    const startupTimer = setTimeout(checkUpdate, 5000)
    const updateInterval = setInterval(checkUpdate, 30 * 60 * 1000)

    return () => {
      clearTimeout(startupTimer)
      clearInterval(updateInterval)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showToast])

  useEffect(() => {
    const handler = () => setSettings(loadSettings())
    window.addEventListener('lunex-settings-changed', handler)
    return () => window.removeEventListener('lunex-settings-changed', handler)
  }, [])

  useEffect(() => {
    if (settings.autoAttach) window.lunex?.setAutoAttach(true)
    window.lunex?.setMinimizeToTray(settings.minimizeToTray)
    applyLowPerf(settings.lowPerf)
  }, [settings])

  useEffect(() => {
    const s = loadSettings()
    if (s.discordRpc) {
      window.lunex?.rpc.start('Viewing Home')
    }
    return () => { window.lunex?.rpc.stop() }
  }, [])

  useEffect(() => {
    const recover = async () => {
      await new Promise(r => setTimeout(r, 2000))
      let running = false
      try { running = !!(await window.lunex?.isRobloxRunning()) } catch {}
      if (!running) return
      try {
        const initErr = await api.init().catch((e: any) => e)
        if (initErr && typeof initErr === 'string' && initErr.includes('not running')) return
        await api.attach().catch(() => {})
      } catch {}
    }
    recover()
  }, [])

  return (
    <div className="app">
      <div className="titlebar" data-tauri-drag-region>
        <div className="titlebar-left">
          <img className="titlebar-logo" src="./obsidian-mark.svg" alt="O" />
          <span className="titlebar-name">obsidian</span>
        </div>
        <div className="titlebar-drag" data-tauri-drag-region />
        <div className="titlebar-controls">
          <button className="ctrl-btn" onClick={() => window.lunex?.minimize()} title="Minimize">
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button className="ctrl-btn" onClick={() => window.lunex?.maximize()} title="Maximize">
            <svg width="9" height="9" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          <button className="ctrl-btn ctrl-close" onClick={() => window.lunex?.close()} title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.3"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.3"/></svg>
          </button>
        </div>
      </div>
      <div className="app-body">
        <Sidebar page={page} setPage={handleSetPage} />
        <div className="app-main">
          <UpdateBanner />
          <main className="app-content">
            {exitingPage && (
              <div key={`exit-${exitingPage}`} className="page-transition page-exit">
                {exitingPage === 'home'      && <HomePage setPage={handleSetPage} />}
                {exitingPage === 'editor'    && <EditorPage />}
                {exitingPage === 'scripthub' && <ScriptHubPage />}
                {exitingPage === 'library'   && <LibraryPage setPage={handleSetPage} />}
                {exitingPage === 'ai'        && <AiPage />}
                {exitingPage === 'settings'  && <SettingsPage setPage={handleSetPage} />}
              </div>
            )}
            <div key={`enter-${displayPage}`} className={`page-transition anim-${animDir}`}>
              {displayPage === 'home'      && <HomePage setPage={handleSetPage} />}
              {displayPage === 'editor'    && <EditorPage />}
              {displayPage === 'scripthub' && <ScriptHubPage />}
              {displayPage === 'library'   && <LibraryPage setPage={handleSetPage} />}
              {displayPage === 'ai'        && <AiPage />}
              {displayPage === 'settings'  && <SettingsPage setPage={handleSetPage} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </ErrorBoundary>
  )
}
