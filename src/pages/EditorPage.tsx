import { useState, useRef, useCallback, useEffect } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { api, parseClients, type Client } from '../lib/api'
import { loadSettings } from '../lib/settings'
import { getCompletionsForLine } from '../lib/roblox-api'
import { useTranslation } from '../locales'
import { useToast } from '../components/Toast'
import ClientsModal from '../components/ClientsModal'
import './EditorPage.css'

interface Tab {
  id: number
  name: string
  content: string
}

const STORAGE_KEY = 'lunex_editor_state'

const ACCENT_HEX: Record<string, string> = {
  mint: '7fffd4', blue: '64b4ff', purple: 'b482ff', red: 'ff6464',
  orange: 'ffa03c', cyan: '3cdcf0', pink: 'ff78b4', yellow: 'ffdc50',
  lavender: 'b4a0ff', emerald: '50dca0', coral: 'ff8c78',
  slate: '8cb4dc', gold: 'ffc83c', rose: 'ff6496',
}

function getAccentHex() {
  const s = loadSettings()
  return ACCENT_HEX[s.accentColor] || '7fffd4'
}

function loadEditorState(): { tabs: Tab[]; activeTab: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { tabs: [{ id: 1, name: 'Script 1', content: 'print("✨ Bienvenido a Obsidian — hecho para volar")\n' }], activeTab: 1 }
    const data = JSON.parse(raw)
    if (Array.isArray(data.tabs) && data.tabs.length > 0) return data
    return { tabs: [{ id: 1, name: 'Script 1', content: 'print("✨ Bienvenido a Obsidian — hecho para volar")\n' }], activeTab: 1 }
  } catch {
    return { tabs: [{ id: 1, name: 'Script 1', content: '-- Obsidian\n' }], activeTab: 1 }
  }
}

function saveEditorState(tabs: Tab[], activeTab: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTab }))
}

const WELCOME_PRINTS = [
  'print("✨ Otro script, otra aventura")',
  'print("🚀 Listo para ejecutar magia")',
  'print("🌙 cattus diaboli fue aquí")',
  'print("⚡ Nuevo script, nuevas posibilidades")',
  'print("💚 Obsidian — hecho con cariño")',
]

function randomWelcome() {
  return WELCOME_PRINTS[Math.floor(Math.random() * WELCOME_PRINTS.length)] + '\n'
}

function nextScriptName(tabs: Tab[]): string {
  const used = new Set(
    tabs
      .map((t) => /^Script (\d+)$/.exec(t.name))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => parseInt(m[1], 10))
  )
  let n = 1
  while (used.has(n)) n++
  return `Script ${n}`
}

let tabCounter = loadEditorState().tabs.reduce((max, t) => Math.max(max, t.id), 0)

export default function EditorPage() {
  const [editorState] = useState(loadEditorState)
  const [tabs, setTabs] = useState<Tab[]>(editorState.tabs)
  const [activeTab, setActiveTab] = useState(editorState.activeTab)
  const [clients, setClients] = useState<Client[]>([])
  const [serverReady, setServerReady] = useState(false)
  const [fontSize, setFontSize] = useState(() => loadSettings().fontSize)
  const [showClients, setShowClients] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [libraryScripts, setLibraryScripts] = useState<{ id: string; name: string; content: string }[]>([])
  const [editingTabId, setEditingTabId] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const tabsListRef = useRef<HTMLDivElement | null>(null)
  const { t } = useTranslation()
  const { showToast } = useToast()

  useEffect(() => {
    if (editingTabId !== null) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [editingTabId])

  useEffect(() => {
    const el = tabsListRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const currentTab = tabs.find((t) => t.id === activeTab)

  const refreshClients = async () => {
    try {
      const health = await api.health()
      setServerReady(!!health)
      const data = await api.getClients()
      setClients(parseClients(data.clients))
    } catch {
      setServerReady(false)
      setClients([])
    }
  }

  const loadLibrary = () => {
    try {
      const raw = localStorage.getItem('obsidian_script_library')
      if (raw) {
        const scripts = JSON.parse(raw)
        if (Array.isArray(scripts)) {
          setLibraryScripts(scripts.map((s: any) => ({ id: s.id, name: s.name, content: s.content })))
        }
      }
    } catch {}
  }

  const toggleFavorites = () => {
    if (!showFavorites) loadLibrary()
    setShowFavorites(!showFavorites)
  }

  const loadScriptToEditor = (script: { name: string; content: string }) => {
    setTabs(prev => {
      const updated = prev.map(t =>
        t.id === activeTab ? { ...t, content: script.content, name: script.name } : t
      )
      saveEditorState(updated, activeTab)
      return updated
    })
    showToast(`Loaded: ${script.name}`, 'success')
  }

  // check clients on mount + periodic polling
  useEffect(() => {
    refreshClients()

    const clientPoll = setInterval(refreshClients, 5000)

    // Reset clients when Roblox is closed
    const handleRobloxCleared = () => {
      setClients([])
    }
    const unsubClear = window.lunex?.onRobloxClientsCleared(handleRobloxCleared) ?? (() => {})

    const handleRobloxStatus = (running: boolean) => {
      if (!running) setClients([])
    }
    const unsubStatus = window.lunex?.onRobloxStatusChanged(handleRobloxStatus) ?? (() => {})

    return () => {
      clearInterval(clientPoll)
      unsubClear()
      unsubStatus()
    }
  }, [])

  // Live log polling
  useEffect(() => {
    const handleStorage = () => setFontSize(loadSettings().fontSize)
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize })
  }, [fontSize])

  useEffect(() => {
    saveEditorState(tabs, activeTab)
  }, [tabs, activeTab])

  // Load script from library if pending
  useEffect(() => {
    const raw = localStorage.getItem('lunex_load_script')
    if (!raw) return
    localStorage.removeItem('lunex_load_script')
    try {
      const { name, content } = JSON.parse(raw)
      tabCounter++
      const newTab: Tab = { id: tabCounter, name: name || 'Imported', content: content || '' }
      setTabs(prev => [...prev, newTab])
      setActiveTab(tabCounter)
    } catch {}
  }, [])

  const handleEditorMount = (ed: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = ed
    const hex = getAccentHex()
    monaco.editor.defineTheme('lunex-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '3a3a3a', fontStyle: 'italic' },
        { token: 'keyword', foreground: hex },
        { token: 'string', foreground: 'a8ff9e' },
        { token: 'number', foreground: 'c9a0f5' },
        { token: 'identifier', foreground: 'e0e0e0' },
        { token: 'delimiter', foreground: '666666' },
        { token: 'operator', foreground: '888888' },
      ],
      colors: {
        'editor.background': '#0d0d0d',
        'editor.foreground': '#e0e0e0',
        'editor.lineHighlightBackground': '#141414',
        'editorLineNumber.foreground': '#2e2e2e',
        'editorLineNumber.activeForeground': '#' + hex,
        'editor.selectionBackground': '#' + hex + '20',
        'editor.inactiveSelectionBackground': '#' + hex + '10',
        'editorCursor.foreground': '#' + hex,
        'editorWidget.background': '#111111',
        'editorSuggestWidget.background': '#0f0f0f',
        'editorSuggestWidget.border': '#' + hex + '18',
        'editorSuggestWidget.selectedBackground': '#' + hex + '15',
        'editorSuggestWidget.foreground': '#cccccc',
        'editorHoverWidget.background': '#0f0f0f',
        'editorHoverWidget.border': '#' + hex + '18',
        'scrollbar.shadow': '#00000000',
        'scrollbarSlider.background': '#ffffff08',
        'scrollbarSlider.hoverBackground': '#' + hex + '20',
      },
    })
    monaco.editor.setTheme('lunex-dark')

    // Register Roblox Lua completions
    monaco.languages.registerCompletionItemProvider('lua', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        }

        const lineContent = model.getLineContent(position.lineNumber).substring(0, position.column - 1)
        const items = getCompletionsForLine(lineContent)

        return {
          suggestions: items.map(item => ({
            label: item.label,
            kind: item.kind,
            detail: item.detail,
            documentation: item.documentation,
            insertText: item.insertText,
            insertTextRules: item.insertTextRules,
            range,
          })),
        }
      },
    })
  }

  const updateContent = (val: string | undefined) => {
    if (val === undefined) return
    setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, content: val } : t)))
  }

  const addTab = () => {
    tabCounter++
    const newTab: Tab = { id: tabCounter, name: nextScriptName(tabs), content: randomWelcome() }
    setTabs((prev) => [...prev, newTab])
    setActiveTab(tabCounter)
    setTimeout(() => {
      const el = tabsListRef.current?.querySelector(`[data-tab-id="${tabCounter}"]`)
      el?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' })
    }, 50)
  }

  const startRename = (tab: Tab) => {
    setEditingTabId(tab.id)
    setEditingValue(tab.name)
  }

  const commitRename = () => {
    if (editingTabId === null) return
    const trimmed = editingValue.trim()
    setTabs((prev) =>
      prev.map((t) => (t.id === editingTabId ? { ...t, name: trimmed || t.name } : t))
    )
    setEditingTabId(null)
  }

  const cancelRename = () => {
    setEditingTabId(null)
  }

  const closeTab = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (tabs.length === 1) return
    const remaining = tabs.filter((t) => t.id !== id)
    setTabs(remaining)
    if (activeTab === id) setActiveTab(remaining[remaining.length - 1].id)
  }

  const handleAttach = useCallback(async () => {
    try {
      const initErr = await api.init().catch((e: any) => e)
      if (initErr && typeof initErr === 'string' && initErr.includes('not running')) {
        showToast(initErr, 'error')
        return
      }
      showToast('Attaching...', 'info')
      await new Promise(r => setTimeout(r, 500))
      await api.attach()

      let fresh: Client[] = []
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise(r => setTimeout(r, 1000))
        const d = await api.getClients().catch(() => ({ clients: '[]' }))
        fresh = parseClients(d.clients)
        if (fresh.length > 0) break
      }

      if (fresh.length === 0) {
        showToast('Reinitializing...', 'info')
        await api.init().catch(() => {})
        await new Promise(r => setTimeout(r, 500))
        await api.attach().catch(() => {})
        for (let attempt = 0; attempt < 8; attempt++) {
          await new Promise(r => setTimeout(r, 1000))
          const d = await api.getClients().catch(() => ({ clients: '[]' }))
          fresh = parseClients(d.clients)
          if (fresh.length > 0) break
        }
      }

      setClients(fresh)
      setServerReady(true)
      if (fresh.length > 0) {
        showToast('Attached!', 'success')
      } else {
        showToast('No client found', 'error')
      }
    } catch {
      showToast('Attach failed', 'error')
    }
  }, [])

  const handleExecute = useCallback(async () => {
    const code = currentTab?.content ?? ''
    if (!code.trim()) return showToast('Nothing to execute', 'error')
    const startTime = Date.now()

    const attach = async (): Promise<Client[]> => {
      showToast('Attaching...', 'info')
      try {
        await window.lunex?.setAttachLock(true)
        await api.init().catch(() => {})
        await new Promise(r => setTimeout(r, 500))
        await api.attach()
        for (let attempt = 0; attempt < 8; attempt++) {
          await new Promise(r => setTimeout(r, 1000))
          const d = await api.getClients().catch(() => ({ clients: '[]' }))
          const fresh = parseClients(d.clients)
          if (fresh.length > 0) {
            return fresh
          }
        }
      } catch {} finally {
        await window.lunex?.setAttachLock(false)
      }
      return []
    }

    const execute = async (clients: Client[]): Promise<boolean> => {
      if (clients.length === 0) return false
      showToast('Executing...', 'info')
      try {
        const pids = clients.map((c) => c.pid)
        await api.execute(code, pids)
        const elapsed = Date.now() - startTime
        showToast('Executed!', 'success')
        await window.lunex?.markExecuted()
        return true
      } catch (e) {
        return false
      }
    }

    // Get current clients from server
    let clients: Client[] = []
    const d = await api.getClients().catch(() => ({ clients: '[]' }))
    clients = parseClients(d.clients)

    // If no clients, attach
    if (clients.length === 0) {
      clients = await attach()
    }

    setClients(clients)

    // Try to execute
    let success = await execute(clients)

    // If failed, re-attach and try again
    if (!success) {
      clients = await attach()
      setClients(clients)
      success = await execute(clients)
    }

    if (!success) {
      showToast('Execute failed', 'error')
    }
  }, [currentTab])

  const handleClear = () => {
    setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, content: '' } : t)))
  }

  const handleSaveToLibrary = () => {
    const code = currentTab?.content ?? ''
    if (!code.trim()) return showToast('Nothing to save', 'error')
    const name = currentTab?.name ?? 'Untitled'
    const LIB_KEY = 'obsidian_script_library'
    try {
      const raw = localStorage.getItem(LIB_KEY)
      const lib: Array<{ id: string; name: string; content: string; source: string; createdAt: number; updatedAt: number }> = raw ? JSON.parse(raw) : []
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name,
        content: code,
        source: 'editor',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      lib.unshift(entry)
      localStorage.setItem(LIB_KEY, JSON.stringify(lib))
      showToast('Saved to library', 'success')
    } catch {
      showToast('Failed to save', 'error')
    }
  }

  const handleKillRoblox = async () => {
    if (!window.confirm('Kill Roblox? All unsaved progress will be lost.')) return
    try {
      await window.lunex?.killRoblox()
      setClients([])
      showToast('Roblox killed', 'success')
    } catch {
      showToast('Failed to kill Roblox', 'error')
    }
  }

  const handleImport = async () => {
    try {
      const result = await window.lunex?.importLua()
      if (result) {
        const { content, name } = result
        setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, content, name } : t)))
        showToast('Script imported', 'success')
      }
    } catch {
      showToast('Import failed', 'error')
    }
  }

  const handleExport = async () => {
    const content = currentTab?.content ?? ''
    if (!content.trim()) return showToast('Nothing to export', 'error')
    try {
      const success = await window.lunex?.exportLua(content)
      if (success) showToast('Script exported', 'success')
    } catch {
      showToast('Export failed', 'error')
    }
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === 'save') handleSaveToLibrary()
      if (detail === 'execute') handleExecute()
    }
    window.addEventListener('lunex-shortcut', handler)
    return () => window.removeEventListener('lunex-shortcut', handler)
  }, [handleSaveToLibrary, handleExecute])

  const dragTabRef = useRef<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [fileDragOver, setFileDragOver] = useState(false)

  const handleDragStart = (id: number, e: React.DragEvent) => {
    dragTabRef.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (id: number, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragTabRef.current) setDragOverId(id)
  }

  const handleDrop = (id: number, e: React.DragEvent) => {
    e.preventDefault()
    const fromId = dragTabRef.current
    if (fromId === null || fromId === id) { setDragOverId(null); return }
    setTabs(prev => {
      const arr = [...prev]
      const fromIdx = arr.findIndex(t => t.id === fromId)
      const toIdx = arr.findIndex(t => t.id === id)
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr
    })
    setDragOverId(null)
  }

  const handleDragEnd = () => { dragTabRef.current = null; setDragOverId(null) }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setFileDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const luaFiles = files.filter(f => f.name.endsWith('.lua') || f.name.endsWith('.txt'))
    if (luaFiles.length === 0) return

    luaFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        const name = file.name.replace(/\.(lua|txt)$/, '')
        tabCounter++
        const newTab: Tab = { id: tabCounter, name, content }
        setTabs(prev => [...prev, newTab])
        setActiveTab(tabCounter)
      }
      reader.readAsText(file)
    })
    showToast(`Imported ${luaFiles.length} file(s)`, 'success')
  }

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    const hasLua = Array.from(e.dataTransfer.types).includes('Files')
    if (hasLua) setFileDragOver(true)
  }

  const handleFileDragLeave = () => setFileDragOver(false)

  return (
    <div className="editor-page">
      {/* Tabs */}
      <div className="tabs-bar">
        <div className="tabs-list" ref={tabsListRef}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab ${tab.id === activeTab ? 'active' : ''} ${dragOverId === tab.id ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(tab.id, e)}
              onDragOver={(e) => handleDragOver(tab.id, e)}
              onDrop={(e) => handleDrop(tab.id, e)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveTab(tab.id)}
              data-tab-id={tab.id}
            >
              {editingTabId === tab.id ? (
                <input
                  ref={renameInputRef}
                  className="tab-rename-input"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={commitRename}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') cancelRename()
                  }}
                  maxLength={40}
                />
              ) : (
                <span
                  className="tab-name"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    startRename(tab)
                  }}
                  title="Doble clic para renombrar"
                >
                  {tab.name}
                </span>
              )}
              {tabs.length > 1 && tab.id === activeTab && (
                <button className="tab-close" onClick={(e) => closeTab(tab.id, e)} aria-label={`Close ${tab.name}`}>×</button>
              )}
            </div>
          ))}
        </div>
        <button className="tab-clear-all" onClick={() => {
          const single: Tab = { id: ++tabCounter, name: 'Script 1', content: 'print("✨ Bienvenido a Obsidian — hecho para volar")\n' }
          setTabs([single])
          setActiveTab(single.id)
        }} title="Clear all tabs">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
        <button className="tab-add" onClick={addTab} title="New tab">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Action bar */}
      <div className="action-bar">
          <button className="action-btn btn-ghost btn-kill" onClick={handleKillRoblox} title="Kill Roblox">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Kill
          </button>
          <button className={`action-btn btn-ghost btn-clients ${clients.length > 0 ? 'has-clients' : ''}`} onClick={() => { refreshClients(); setShowClients(true) }} title="Clients">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Clients
            {clients.length > 0 && <span className="client-badge">{clients.length}</span>}
          </button>
          <button className="action-btn btn-ghost" onClick={handleClear} title="Clear">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            {t('editor.clear')}
          </button>
          <button className="action-btn btn-ghost" onClick={handleImport} title="Import .lua file">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t('editor.import')}
          </button>
          <button className="action-btn btn-ghost" onClick={handleExport} title="Export as .lua">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {t('editor.export')}
          </button>
          <button className="action-btn btn-ghost" onClick={handleSaveToLibrary} title="Save to Library">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            {t('editor.save')}
          </button>
          <button className={`action-btn btn-ghost ${showFavorites ? 'active' : ''}`} onClick={toggleFavorites} title="Library Scripts">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Scripts
          </button>
          <button className="action-btn btn-ghost" onClick={handleAttach} title="Attach">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            {t('editor.attach')}
          </button>
          <button className="action-btn btn-mint" onClick={handleExecute} title="Execute (Ctrl+Enter)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {t('editor.execute')}
          </button>
      </div>

      {/* Editor area */}
      <div className="editor-area">
        {/* Monaco */}
        <div
          className={`editor-wrap ${fileDragOver ? 'file-drag-over' : ''} ${showFavorites ? 'with-panel' : ''}`}
          onDrop={handleFileDrop}
          onDragOver={handleFileDragOver}
          onDragLeave={handleFileDragLeave}
        >
          <Editor
            height="100%"
            language="lua"
            value={currentTab?.content ?? ''}
            onChange={updateContent}
            onMount={handleEditorMount}
            options={{
              fontSize,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 14, bottom: 14 },
              scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              glyphMargin: false,
              folding: true,
              renderWhitespace: 'none',
              bracketPairColorization: { enabled: true },
            }}
          />
        </div>

        {/* Favorites panel */}
        {showFavorites && (
          <div className="favorites-panel">
            <div className="favorites-header">
              <span className="favorites-title">Library Scripts</span>
              <button className="favorites-close" onClick={() => setShowFavorites(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="favorites-list">
              {libraryScripts.length === 0 ? (
                <div className="favorites-empty">No scripts saved yet.<br/>Save from the editor or Script Hub.</div>
              ) : (
                libraryScripts.map(script => (
                  <div key={script.id} className="favorites-item" onClick={() => loadScriptToEditor(script)}>
                    <div className="favorites-item-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div className="favorites-item-info">
                      <span className="favorites-item-name">{script.name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <ClientsModal open={showClients} onClose={() => setShowClients(false)} />
    </div>
  )
}