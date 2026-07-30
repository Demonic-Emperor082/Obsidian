import type { Locale } from '../locales'

// Settings stored in localStorage
export interface LunexSettings {
  displayName: string
  accentColor: 'mint' | 'blue' | 'purple' | 'red' | 'orange' | 'cyan' | 'pink' | 'yellow' | 'lavender' | 'emerald' | 'coral' | 'slate' | 'gold' | 'rose'
  discordRpc: boolean
  autoAttach: boolean
  fontSize: number
  showClock: boolean
  alwaysOnTop: boolean
  minimizeToTray: boolean
  lowPerf: boolean
  language: Locale
}

const DEFAULTS: LunexSettings = {
  displayName: '',
  accentColor: 'mint',
  discordRpc: true,
  autoAttach: false,
  fontSize: 13,
  showClock: true,
  alwaysOnTop: false,
  minimizeToTray: true,
  lowPerf: false,
  language: 'es',
}

const KEY = 'lunex_settings'

export function loadSettings(): LunexSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: LunexSettings) {
  localStorage.setItem(KEY, JSON.stringify(s))
  applyAccent(s.accentColor)
}

export function applyAccent(color: LunexSettings['accentColor']) {
  const map = {
    mint:     { main: '127,255,212', dim: '78,203,168' },
    blue:     { main: '100,180,255', dim: '60,140,220' },
    purple:   { main: '180,130,255', dim: '140,90,220' },
    red:      { main: '255,100,100', dim: '220,60,60'  },
    orange:   { main: '255,160,60',  dim: '220,130,40'  },
    cyan:     { main: '60,220,240',  dim: '40,180,200'  },
    pink:     { main: '255,120,180', dim: '220,80,140'  },
    yellow:   { main: '255,220,80',  dim: '220,190,50'  },
    lavender: { main: '180,160,255', dim: '140,120,220' },
    emerald:  { main: '80,220,160',  dim: '50,180,120'  },
    coral:    { main: '255,140,120', dim: '220,100,80'  },
    slate:    { main: '140,180,220', dim: '100,140,180' },
    gold:     { main: '255,200,60',  dim: '220,170,40'  },
    rose:     { main: '255,100,150', dim: '220,60,110'  },
  }
  const c = map[color]
  const root = document.documentElement
  root.style.setProperty('--mint-rgb',           c.main)
  root.style.setProperty('--mint',              `rgb(${c.main})`)
  root.style.setProperty('--mint-dim',          `rgb(${c.dim})`)
  root.style.setProperty('--mint-glow',         `rgba(${c.main},0.15)`)
  root.style.setProperty('--mint-glow-strong',  `rgba(${c.main},0.35)`)
  root.style.setProperty('--border',            `rgba(${c.main},0.12)`)
  root.style.setProperty('--border-hover',      `rgba(${c.main},0.30)`)
  root.style.setProperty('--mint-subtle',       `rgba(${c.main},0.06)`)
  root.style.setProperty('--mint-bg',           `rgba(${c.main},0.10)`)
  root.style.setProperty('--mint-bg-hover',     `rgba(${c.main},0.18)`)
  root.style.setProperty('--mint-glow-intense', `rgba(${c.main},0.60)`)
  root.style.setProperty('--mint-text-dim',     `rgba(${c.main},0.55)`)
  root.style.setProperty('--mint-text-bright',  `rgba(${c.main},0.90)`)
  root.style.setProperty('--mint-border',       `rgba(${c.main},0.28)`)
  root.style.setProperty('--mint-border-bright',`rgba(${c.main},0.45)`)
}

export function applyLowPerf(enabled: boolean) {
  document.documentElement.classList.toggle('low-perf', enabled)
}
