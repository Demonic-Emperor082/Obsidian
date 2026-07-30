import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../locales'
import './AiPage.css'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface Session {
  id: string
  title?: string
}

interface OpenCodeModel {
  providerID: string
  modelID: string
  name: string
}

function renderInlineMarkdown(text: string, keyPrefix: string): JSX.Element[] {
  const parts: JSX.Element[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`|\[(.+?)\]\((.+?)\))/g
  let lastIndex = 0
  let match
  let partIndex = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${keyPrefix}-t${partIndex++}`}>{text.slice(lastIndex, match.index)}</span>)
    }
    if (match[2]) {
      parts.push(<strong key={`${keyPrefix}-b${partIndex++}`}>{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(<em key={`${keyPrefix}-i${partIndex++}`}>{match[3]}</em>)
    } else if (match[4]) {
      parts.push(<del key={`${keyPrefix}-d${partIndex++}`}>{match[4]}</del>)
    } else if (match[5]) {
      parts.push(<code key={`${keyPrefix}-c${partIndex++}`} className="md-inline-code">{match[5]}</code>)
    } else if (match[6] && match[7]) {
      parts.push(<a key={`${keyPrefix}-a${partIndex++}`} href={match[7]} target="_blank" rel="noopener noreferrer" className="md-link">{match[6]}</a>)
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`${keyPrefix}-t${partIndex++}`}>{text.slice(lastIndex)}</span>)
  }
  if (parts.length === 0) {
    parts.push(<span key={`${keyPrefix}-t0`}>{text}</span>)
  }
  return parts
}

function renderMarkdown(text: string): JSX.Element[] {
  const lines = text.split('\n')
  const elements: JSX.Element[] = []
  let i = 0
  let keyCounter = 0

  while (i < lines.length) {
    const line = lines[i]
    const key = `md-${keyCounter++}`

    // Code block (```)
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = []
      const lang = line.trimStart().slice(3).trim()
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <div key={key} className="md-code-block">
          {lang && <div className="md-code-lang">{lang}</div>}
          <pre><code>{codeLines.join('\n')}</code></pre>
        </div>
      )
      continue
    }

    // Horizontal rule
    if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
      elements.push(<hr key={key} className="md-hr" />)
      i++
      continue
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const content = headerMatch[2]
      elements.push(
        <div key={key} className={`md-header md-h${level}`}>
          {renderInlineMarkdown(content, key)}
        </div>
      )
      i++
      continue
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+[-|:\s]+\s*$/.test(lines[i + 1])) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      if (tableLines.length >= 2) {
        const parseRow = (row: string) => row.split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''))
        const headers = parseRow(tableLines[0])
        const bodyRows = tableLines.slice(2).map(parseRow)
        elements.push(
          <div key={key} className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>{headers.map((h, hi) => <th key={hi}>{renderInlineMarkdown(h, `${key}-th${hi}`)}</th>)}</tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderInlineMarkdown(cell, `${key}-td${ri}${ci}`)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      elements.push(
        <blockquote key={key} className="md-blockquote">
          {quoteLines.map((ql, qi) => <div key={qi}>{renderInlineMarkdown(ql, `${key}-q${qi}`)}</div>)}
        </blockquote>
      )
      continue
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.+)/)
    if (ulMatch) {
      const listItems: { indent: number; content: string }[] = []
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+])\s+(.+)/)
        if (!m) break
        listItems.push({ indent: m[1].length, content: m[3] })
        i++
      }
      elements.push(
        <ul key={key} className="md-ul">
          {listItems.map((item, li) => (
            <li key={li} style={{ marginLeft: item.indent * 8 }}>
              {renderInlineMarkdown(item.content, `${key}-li${li}`)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)(\d+[.)]\s+)(.+)/)
    if (olMatch) {
      const listItems: { indent: number; content: string }[] = []
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)(\d+[.)]\s+)(.+)/)
        if (!m) break
        listItems.push({ indent: m[1].length, content: m[3] })
        i++
      }
      elements.push(
        <ol key={key} className="md-ol">
          {listItems.map((item, li) => (
            <li key={li} style={{ marginLeft: item.indent * 8 }}>
              {renderInlineMarkdown(item.content, `${key}-oli${li}`)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={key} className="md-spacer" />)
      i++
      continue
    }

    // Normal text
    elements.push(
      <div key={key} className="md-line">
        {renderInlineMarkdown(line, key)}
      </div>
    )
    i++
  }

  return elements
}

const RECOVERY_KEY = 'obsidian_ai_recovery'

interface RecoveryData {
  activeSession: string | null
  messages: Message[]
  selectedModel: string
  timestamp: number
}

function saveRecovery(activeSession: string | null, messages: Message[], selectedModel: string) {
  if (messages.length === 0 && !activeSession) return
  const data: RecoveryData = { activeSession, messages, selectedModel, timestamp: Date.now() }
  try { localStorage.setItem(RECOVERY_KEY, JSON.stringify(data)) } catch {}
}

function loadRecovery(): RecoveryData | null {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as RecoveryData
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(RECOVERY_KEY)
      return null
    }
    return data
  } catch { return null }
}

function clearRecovery() {
  try { localStorage.removeItem(RECOVERY_KEY) } catch {}
}

export default function AiPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [serverRunning, setServerRunning] = useState(false)
  const [availableModels, setAvailableModels] = useState<OpenCodeModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [lastUserPrompt, setLastUserPrompt] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    checkServer()
    loadSessions()

    const recovery = loadRecovery()
    if (recovery) {
      if (recovery.activeSession) setActiveSession(recovery.activeSession)
      if (recovery.messages.length > 0) setMessages(recovery.messages)
      if (recovery.selectedModel) setSelectedModel(recovery.selectedModel)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    saveRecovery(activeSession, messages, selectedModel)
  }, [activeSession, messages, selectedModel])

  // Load models only when server is running
  useEffect(() => {
    if (serverRunning) {
      loadModels()
    }
  }, [serverRunning])

  const checkServer = async () => {
    try {
      const status = await window.lunex?.opencode.status()
      setServerRunning(status?.running ?? false)
      if (!status?.running) {
        // Check if binary exists before trying to start
        const check = await window.lunex?.opencode.check()
        if (check && !check.binaryFound) {
          setMessages([{
            id: 'error-binary',
            role: 'system',
            content: 'OpenCode no está instalado. Instálalo con: npm install -g opencode',
            timestamp: Date.now(),
          }])
          return
        }
        await window.lunex?.opencode.start()
        const retry = await window.lunex?.opencode.status()
        setServerRunning(retry?.running ?? false)
      }
    } catch (e: any) {
      setServerRunning(false)
      console.error('[AI] checkServer error:', e)
    }
  }

  const loadModels = async () => {
    try {
      const config = await window.lunex?.opencode.getConfig()
      if (config?.model) {
        setSelectedModel(config.model)
      }
      const providers = await window.lunex?.opencode.getProviders()
      const providerList = providers?.providers ?? (Array.isArray(providers) ? providers : [])
      if (providerList.length > 0) {
        const models: OpenCodeModel[] = []
        for (const provider of providerList) {
          if (provider.models) {
            for (const [modelID, modelInfo] of Object.entries(provider.models)) {
              models.push({
                providerID: provider.id,
                modelID,
                name: (modelInfo as any).name || modelID,
              })
            }
          }
        }
        setAvailableModels(models)
        if (!selectedModel && models.length > 0) {
          setSelectedModel(`${models[0].providerID}/${models[0].modelID}`)
        }
      }
    } catch (e) {
      console.error('[AI] loadModels error:', e)
    }
  }

  const loadSessions = async () => {
    try {
      const list = await window.lunex?.opencode.listSessions()
      setSessions(list ?? [])
    } catch {}
  }

  const createSession = async () => {
    try {
      const session = await window.lunex?.opencode.createSession('Obsidian AI Chat')
      if (session) {
        setSessions(prev => [session, ...prev])
        setActiveSession(session.id)
        setMessages([])
      }
    } catch {}
  }

  const deleteSession = async (id: string) => {
    try {
      await window.lunex?.opencode.deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeSession === id) {
        setActiveSession(null)
        setMessages([])
      }
    } catch {}
  }

  const loadSessionMessages = async (sessionId: string) => {
    try {
      setActiveSession(sessionId)
      const data = await window.lunex?.opencode.getMessages(sessionId)
      if (data) {
        const parsed: Message[] = []
        for (const msg of data) {
          const textParts = msg.parts?.filter((p: any) => p.type === 'text') ?? []
          const content = textParts.map((p: any) => p.text).join('\n')
          if (content) {
            parsed.push({
              id: msg.info?.id ?? Math.random().toString(),
              role: msg.info?.role ?? 'assistant',
              content,
              timestamp: Date.now(),
            })
          }
        }
        setMessages(parsed)
      }
    } catch {}
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    if (!serverRunning) {
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'system',
        content: 'OpenCode server is not running. Check your configuration.',
        timestamp: Date.now(),
      }])
      return
    }

    const text = input.trim()
    setInput('')
    setLastUserPrompt(text)
    setLoading(true)

    const userMsg: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])

    let sessionId = activeSession
    if (!sessionId) {
      try {
        const session = await window.lunex?.opencode.createSession('Obsidian AI Chat')
        if (session) {
          sessionId = session.id
          setActiveSession(sessionId)
          setSessions(prev => [session, ...prev])
        }
      } catch {}
    }

    if (!sessionId) {
      setLoading(false)
      return
    }

    const fullText = text

    try {
      // Use async prompt (returns immediately) + poll for response
      await window.lunex?.opencode.sendAsync(sessionId, fullText, selectedModel || undefined)

      // Poll messages until the assistant response appears
      const startTime = Date.now()
      const timeout = 180000 // 3 minutes
      let found = false

      while (Date.now() - startTime < timeout) {
        await new Promise(r => setTimeout(r, 500))
        const data = await window.lunex?.opencode.getMessages(sessionId)
        if (!data) continue

        // Find the last assistant message that wasn't already displayed
        for (let i = data.length - 1; i >= 0; i--) {
          const msg: any = data[i]
          if (msg?.info?.role === 'assistant' && !messages.some((m: any) => m.id === msg.info?.id)) {
            const textParts = msg.parts?.filter((p: any) => p.type === 'text') ?? []
            const content = textParts.map((p: any) => p.text).join('\n')
            if (content) {
              setMessages(prev => [...prev, {
                id: msg.info?.id ?? 'assistant-' + Date.now(),
                role: 'assistant',
                content,
                timestamp: Date.now(),
              }])
              found = true
              break
            }
          }
        }
        if (found) break
      }

      if (!found) {
        setMessages(prev => [...prev, {
          id: 'error-' + Date.now(),
          role: 'system',
          content: 'Timeout: no response from AI after 3 minutes.',
          timestamp: Date.now(),
        }])
      }
    } catch (e: any) {
      console.error('[AI] sendMessage error:', e)
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'system',
        content: `Error: ${e?.message || e?.toString?.() || JSON.stringify(e) || 'Failed to get response'}`,
        timestamp: Date.now(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleModelChange = async (model: string) => {
    setSelectedModel(model)
    try {
      await window.lunex?.opencode.setModel(model.split('/')[0], model.split('/').slice(1).join('/'))
    } catch {}
  }

  const copyMessage = async (id: string, content: string) => {
    try {
      await (window as any).lunex?.clipboard?.write(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch (e) {
      console.error('[AI] copy error:', e)
    }
  }

  const repeatLastPrompt = () => {
    if (lastUserPrompt && !loading) {
      setInput(lastUserPrompt)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="ai-page">
      {/* Sidebar */}
      <div className="ai-sidebar">
        <div className="ai-sidebar-header">
          <button className="ai-new-chat" onClick={createSession}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('ai.newChat')}
          </button>
        </div>
        <div className="ai-sessions-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`ai-session-item ${activeSession === session.id ? 'active' : ''}`}
              onClick={() => loadSessionMessages(session.id)}
            >
              <svg className="session-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="session-title">{session.title || t('ai.untitled')}</span>
              <button
                className="session-delete"
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="ai-sidebar-footer">
          <div className="ai-model-badge" onClick={() => setShowSettings(!showSettings)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {selectedModel || t('ai.selectModel')}
          </div>
          <div className={`ai-status ${serverRunning ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {serverRunning ? t('ai.connected') : t('ai.disconnected')}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="ai-main">
        {/* Settings Modal */}
        {showSettings && (
          <div className="ai-settings-overlay" onClick={() => setShowSettings(false)}>
            <div className="ai-settings-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t('ai.settings')}</h3>
                <button className="modal-close" onClick={() => setShowSettings(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <label>{t('ai.model')}</label>
                <select value={selectedModel} onChange={e => handleModelChange(e.target.value)}>
                  {availableModels.length === 0 ? (
                    <option value="">{t('ai.noModels')}</option>
                  ) : (
                    availableModels.map(m => (
                      <option key={`${m.providerID}/${m.modelID}`} value={`${m.providerID}/${m.modelID}`}>
                        {m.name}
                      </option>
                    ))
                  )}
                </select>
                <span className="modal-hint">{t('ai.configureHint')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="ai-messages">
          {messages.length === 0 && !loading && (
            <div className="ai-welcome">
              <div className="welcome-glow" />
              <div className="welcome-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                  <path d="M12 6a4 4 0 0 0-4 4h1a3 3 0 0 1 3 3v1a4 4 0 0 0 4-4 4 4 0 0 0-4-4z"/>
                </svg>
              </div>
              <h2>Obsidian AI</h2>
              <p>{t('ai.welcome')}</p>
              <div className="welcome-chips">
                <button onClick={() => setInput('Write me an aimbot script')}>{t('ai.chipAimbot')}</button>
                <button onClick={() => setInput('Write me an ESP script')}>{t('ai.chipEsp')}</button>
                <button onClick={() => setInput('Write me a fly script')}>{t('ai.chipFly')}</button>
                <button onClick={() => setInput('Write me a speed hack')}>{t('ai.chipSpeed')}</button>
                <button onClick={() => setInput('How to use Obsidian?')}>{t('ai.chipHowTo')}</button>
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`msg msg-${msg.role}`}>
              <div className="msg-avatar">
                {msg.role === 'user' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                    <path d="M12 6a4 4 0 0 0-4 4h1a3 3 0 0 1 3 3v1a4 4 0 0 0 4-4 4 4 0 0 0-4-4z"/>
                  </svg>
                )}
              </div>
              <div className="msg-body">
                {renderMarkdown(msg.content)}
              </div>
              <div className="msg-actions">
                <button
                  className="msg-action-btn"
                  onClick={() => copyMessage(msg.id, msg.content)}
                  title="Copiar"
                >
                  {copiedId === msg.id ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                </button>
                {msg.role === 'user' && (
                  <button
                    className="msg-action-btn"
                    onClick={() => { setInput(msg.content); inputRef.current?.focus() }}
                    title="Editar y reenviar"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg msg-assistant">
              <div className="msg-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                  <path d="M12 6a4 4 0 0 0-4 4h1a3 3 0 0 1 3 3v1a4 4 0 0 0 4-4 4 4 0 0 0-4-4z"/>
                </svg>
              </div>
              <div className="msg-body">
                <div className="typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="ai-input">
          {lastUserPrompt && !loading && (
            <button className="repeat-btn" onClick={repeatLastPrompt} title="Repetir último prompt">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai.placeholder')}
            rows={1}
            disabled={loading}
          />
          <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
