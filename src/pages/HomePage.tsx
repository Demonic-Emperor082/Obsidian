import { useState, useEffect, useRef } from 'react'
import type { Page } from '../App'
import { api, parseClients, type Client } from '../lib/api'
import { useToast } from '../components/Toast'
import { loadSettings } from '../lib/settings'
import { useTranslation } from '../locales'
import ClientsModal from '../components/ClientsModal'
import './HomePage.css'

interface Props {
  setPage: (p: Page) => void
}

function useTime() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function getGreeting(t: (key: string) => string): string {
  const h = new Date().getHours()
  if (h < 12) return t('home.greeting.morning')
  if (h < 20) return t('home.greeting.afternoon')
  return t('home.greeting.evening')
}

const XENO_RECOVERY_KEY = 'obsidian_xeno_recovery'

function saveXenoRecovery(clients: Client[]) {
  try { localStorage.setItem(XENO_RECOVERY_KEY, JSON.stringify({ clients, ts: Date.now() })) } catch {}
}
function loadXenoRecovery(): Client[] | null {
  try {
    const raw = localStorage.getItem(XENO_RECOVERY_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (Date.now() - d.ts > 60 * 60 * 1000) { localStorage.removeItem(XENO_RECOVERY_KEY); return null }
    return d.clients
  } catch { return null }
}

export default function HomePage({ setPage }: Props) {
  const time = useTime()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const saved = loadXenoRecovery()
  const [clientCount, setClientCount] = useState(saved?.length ?? 0)
  const [clients, setClients] = useState<Client[]>(saved ?? [])
  const [serverOk, setServerOk] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [attachMsg, setAttachMsg] = useState('')
  const [showClients, setShowClients] = useState(false)
  const [robloxRunning, setRobloxRunning] = useState(false)
  const [injectionVerified, setInjectionVerified] = useState(!!saved?.length)
  const { showToast } = useToast()
  const { t } = useTranslation()

  const hours   = pad(time.getHours())
  const minutes = pad(time.getMinutes())
  const settings = loadSettings()
  const savedName = settings.displayName
  const [username, setUsername] = useState(savedName || 'User')

  useEffect(() => {
    if (savedName) { setUsername(savedName); return }
    window.lunex?.getUsername().then((name: string) => {
      if (name) setUsername(name)
    }).catch(() => {})
  }, [savedName])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let w = 0
    let h = 0
    let mouseX = -9999
    let mouseY = -9999

    const resize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }
    window.addEventListener('mousemove', handleMouse)

    const handleLeave = () => { mouseX = -9999; mouseY = -9999 }
    window.addEventListener('mouseleave', handleLeave)

    interface Particle {
      x: number; y: number; vx: number; vy: number
      size: number; alpha: number; color: string
    }

    const colors = [
      'rgba(0, 210, 150,',
      'rgba(91, 130, 255,',
      'rgba(168, 85, 247,',
    ]

    const particles: Particle[] = []
    const COUNT = 20
    const MOUSE_RADIUS = 100
    const MOUSE_FORCE = 0.5

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        const dx = p.x - mouseX
        const dy = p.y - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        p.vx *= 0.99
        p.vy *= 0.99

        if (Math.abs(p.vx) < 0.05) p.vx += (Math.random() - 0.5) * 0.1
        if (Math.abs(p.vy) < 0.05) p.vy += (Math.random() - 0.5) * 0.1

        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color + p.alpha + ')'
        ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = a.color + (0.08 * (1 - dist / 120)) + ')'
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  useEffect(() => {
    const check = async () => {
      try {
        const [h, d] = await Promise.all([
          api.health().catch(() => null),
          api.getClients().catch(() => ({ clients: '[]' })),
        ])
        setServerOk(!!h)
        const parsed = parseClients(d.clients)
        if (parsed.length > 0) {
          setClients(parsed)
          setClientCount(parsed.length)
          setInjectionVerified(true)
          saveXenoRecovery(parsed)
        }
        let running = false
        try { running = !!(await window.lunex?.isRobloxRunning()) } catch {}
        setRobloxRunning(running)
      } catch {
        setServerOk(false)
        setClientCount(0)
        setInjectionVerified(false)
      }
    }
    check()

    const clientPoll = setInterval(check, 3000)

    const handleRobloxCleared = () => {
      setClients([])
      setClientCount(0)
      setRobloxRunning(false)
      setInjectionVerified(false)
      localStorage.removeItem(XENO_RECOVERY_KEY)
    }
    const unsubClear = window.lunex?.onRobloxClientsCleared(handleRobloxCleared) ?? (() => {})

    const handleRobloxStatus = (running: boolean) => {
      setRobloxRunning(running)
      if (!running) {
        setClients([])
        setClientCount(0)
        setInjectionVerified(false)
        localStorage.removeItem(XENO_RECOVERY_KEY)
      }
    }
    const unsubStatus = window.lunex?.onRobloxStatusChanged(handleRobloxStatus) ?? (() => {})

    return () => {
      clearInterval(clientPoll)
      unsubClear()
      unsubStatus()
    }
  }, [])

  const handleAttach = async () => {
    setAttaching(true)
    setAttachMsg('')
    try {
      await window.lunex?.setAttachLock(true)

      const initErr = await api.init().catch((e: any) => e)
      if (initErr && typeof initErr === 'string' && initErr.includes('not running')) {
        setAttachMsg(initErr)
        showToast(initErr, 'error')
        return
      }

      let parsed: Client[] = []

      const tryAttach = async (): Promise<Client[]> => {
        await api.init().catch(() => {})
        await new Promise(r => setTimeout(r, 500))
        const attachErr = await api.attach().catch((e: any) => e)
        if (attachErr && typeof attachErr === 'string' && attachErr.includes('not running')) {
          throw new Error(attachErr)
        }
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise(r => setTimeout(r, 1000))
          const d = await api.getClients().catch(() => ({ clients: '[]' }))
          const p = parseClients(d.clients)
          if (p.length > 0) return p
        }
        return []
      }

      parsed = await tryAttach()

      if (parsed.length === 0) {
        setAttachMsg('Retrying...')
        showToast('Attach failed, retrying...', 'info')
        await new Promise(r => setTimeout(r, 3000))
        parsed = await tryAttach()
      }

      setClients(parsed)
      setClientCount(parsed.length)
      setServerOk(true)
        if (parsed.length > 0) {
          setAttachMsg('Attached!')
          showToast(`Attached to ${parsed.length} client${parsed.length > 1 ? 's' : ''}`, 'success')
      } else {
        setAttachMsg('No client found')
        showToast('No Roblox client found', 'warning')
      }
    } catch {
      setAttachMsg('Failed')
      showToast('Attach failed', 'error')
    } finally {
      await window.lunex?.setAttachLock(false)
      setAttaching(false)
      setTimeout(() => setAttachMsg(''), 2500)
    }
  }

  const handleKillRoblox = async () => {
    if (!window.confirm('Kill Roblox? All unsaved progress will be lost.')) return
    try {
      await window.lunex?.killRoblox()
      setRobloxRunning(false)
      setClients([])
      setClientCount(0)
      showToast('Roblox killed', 'success')
    } catch {
      showToast('Failed to kill Roblox', 'error')
    }
  }

  return (
    <div className="home">
      <canvas ref={canvasRef} className="home-canvas" />

      <div className="home-left">
        {settings.showClock && (
          <div className="home-clock">
            <span className="clock-hours">{hours}</span>
            <span className="clock-minutes">{minutes}</span>
          </div>
        )}

        <div className="home-greeting-area">
          <span className="clock-greeting">{getGreeting(t)}, <strong>{username}</strong>!</span>
          <div
            className={`home-status ${serverOk ? (injectionVerified ? 'ok' : 'warn') : 'off'} ${clientCount > 0 ? 'clickable' : ''}`}
            onClick={clientCount > 0 ? () => setShowClients(true) : undefined}
          >
            <span className="status-dot" />
            {serverOk
              ? clientCount > 0
                ? injectionVerified
                  ? `${clientCount} client${clientCount !== 1 ? 's' : ''} attached`
                  : 'Xeno may be patched'
                : 'Xeno ready'
              : 'Server offline'}
          </div>
        </div>

      </div>

      <div className="home-right">
        <div className="home-tiles">
          <button
            className={`home-tile home-tile-inject ${attaching ? 'loading' : ''}`}
            onClick={handleAttach}
            disabled={attaching}
          >
            <div className="home-tile-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <span className="home-tile-label">{attaching ? '...' : attachMsg || t('home.attach')}</span>
          </button>
          <button className="home-tile" onClick={() => setPage('editor')}>
            <div className="home-tile-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <span className="home-tile-label">{t('home.editor')}</span>
          </button>
          <button className="home-tile" onClick={() => setPage('scripthub')}>
            <div className="home-tile-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <span className="home-tile-label">{t('home.scripts')}</span>
          </button>
          <button className="home-tile home-tile-kill" onClick={handleKillRoblox}>
            <div className="home-tile-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <span className="home-tile-label">Kill</span>
          </button>
          <button className="home-tile" onClick={() => setPage('library')}>
            <div className="home-tile-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <span className="home-tile-label">{t('home.library')}</span>
          </button>
          <button className="home-tile" onClick={() => setPage('ai')}>
            <div className="home-tile-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                <path d="M12 6a4 4 0 0 0-4 4h1a3 3 0 0 1 3 3v1a4 4 0 0 0 4-4 4 4 0 0 0-4-4z"/>
              </svg>
            </div>
            <span className="home-tile-label">{t('home.ai')}</span>
          </button>
        </div>
      </div>

      <ClientsModal open={showClients} onClose={() => setShowClients(false)} />
    </div>
  )
}
