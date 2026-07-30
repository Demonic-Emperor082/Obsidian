import { useState, useEffect, useRef } from 'react'
import type { Page } from '../App'
import { api } from '../lib/api'
import { loadSettings, saveSettings, applyAccent, type LunexSettings } from '../lib/settings'
import { useAutoUpdate } from '../lib/useAutoUpdate'
import { useTranslation, setLocale as setI18nLocale, type Locale } from '../locales'
import './SettingsPage.css'

const ACCENTS: { id: LunexSettings['accentColor']; label: string; color: string }[] = [
  { id: 'mint',     label: 'Mint',     color: 'rgb(127,255,212)' },
  { id: 'blue',     label: 'Blue',     color: 'rgb(100,180,255)' },
  { id: 'purple',   label: 'Purple',   color: 'rgb(180,130,255)' },
  { id: 'red',      label: 'Red',      color: 'rgb(255,100,100)' },
  { id: 'orange',   label: 'Orange',   color: 'rgb(255,160,60)' },
  { id: 'cyan',     label: 'Cyan',     color: 'rgb(60,220,240)' },
  { id: 'pink',     label: 'Pink',     color: 'rgb(255,120,180)' },
  { id: 'yellow',   label: 'Yellow',   color: 'rgb(255,220,80)' },
  { id: 'lavender', label: 'Lavender', color: 'rgb(180,160,255)' },
  { id: 'emerald',  label: 'Emerald',  color: 'rgb(80,220,160)' },
  { id: 'coral',    label: 'Coral',    color: 'rgb(255,140,120)' },
  { id: 'slate',    label: 'Slate',    color: 'rgb(140,180,220)' },
  { id: 'gold',     label: 'Gold',     color: 'rgb(255,200,60)' },
  { id: 'rose',     label: 'Rose',     color: 'rgb(255,100,150)' },
]

function applySideEffects(s: LunexSettings) {
  if (s.discordRpc) {
    window.lunex?.rpc.start('Changing Settings')
  } else {
    window.lunex?.rpc.stop()
  }
  window.lunex?.setAutoAttach(s.autoAttach)
  window.lunex?.setAlwaysOnTop(s.alwaysOnTop)
  window.lunex?.setMinimizeToTray(s.minimizeToTray)
  applyAccent(s.accentColor)
}

interface Props {
  setPage?: (p: Page) => void
}

export default function SettingsPage({ setPage }: Props) {
  const [settings, setSettings] = useState<LunexSettings>(loadSettings)
  const [xenoVersion, setXenoVersion] = useState('—')
  const [appVersion, setAppVersion] = useState('—')
  const [serverOk, setServerOk] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSettings = useRef<LunexSettings>(settings)
  const { status: updateStatus, availableVersion, progress, checkForUpdates, downloadUpdate, installUpdate } = useAutoUpdate()
  const { t } = useTranslation()

  useEffect(() => {
    api.version().then(v => setXenoVersion(v ?? '—')).catch(() => {})
    api.health().then(d => setServerOk(!!d)).catch(() => setServerOk(false))
    window.lunex?.getVersion().then(v => setAppVersion(v ?? '—')).catch(() => {})
  }, [])

  const update = <K extends keyof LunexSettings>(key: K, val: LunexSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val }
      saveSettings(next)
      applySideEffects(next)
      setSaved(true)
      window.dispatchEvent(new Event('lunex-settings-changed'))
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaved(false), 1500)
      return next
    })
  }

  const updateDelayed = <K extends keyof LunexSettings>(key: K, val: LunexSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveSettings(next)
        applySideEffects(next)
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      }, 400)
      return next
    })
  }

  const handleLanguageChange = (lang: Locale) => {
    setI18nLocale(lang)
    update('language', lang)
  }

  return (
    <div className="settings-page">
      <div className="settings-body">

        {/* Profile */}
        <div className="settings-section">
          <span className="section-label">{t('settings.profile')}</span>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">{t('settings.displayName')}</span>
              <span className="setting-desc">{t('settings.displayNameDesc')}</span>
            </div>
            <input
              className="setting-input"
              type="text"
              placeholder={t('settings.displayName')}
              value={settings.displayName}
              onChange={e => updateDelayed('displayName', e.target.value)}
              maxLength={24}
            />
          </div>
        </div>

        {/* Language */}
        <div className="settings-section">
          <span className="section-label">{t('settings.language')}</span>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">{t('settings.language')}</span>
              <span className="setting-desc">{settings.language === 'es' ? 'Español' : 'English'}</span>
            </div>
            <div className="lang-picker">
              <button
                className={`lang-btn ${settings.language === 'es' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('es')}
              >
                ES
              </button>
              <button
                className={`lang-btn ${settings.language === 'en' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="settings-section">
          <span className="section-label">{t('settings.appearance')}</span>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">{t('settings.accentColor')}</span>
            </div>
            <div className="accent-picker">
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  className={`accent-dot ${settings.accentColor === a.id ? 'active' : ''}`}
                  style={{ background: a.color, boxShadow: settings.accentColor === a.id ? `0 0 12px ${a.color}` : 'none' }}
                  title={a.label}
                  onClick={() => update('accentColor', a.id)}
                />
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">{t('settings.fontSize')}</span>
            </div>
            <div className="number-input">
              <button onClick={() => update('fontSize', Math.max(10, settings.fontSize - 1))}>−</button>
              <span>{settings.fontSize}</span>
              <button onClick={() => update('fontSize', Math.min(20, settings.fontSize + 1))}>+</button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="settings-section">
          <span className="section-label">{t('settings.features')}</span>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">{t('settings.discordRpc')}</span>
              <span className="setting-desc">{t('settings.discordRpcDesc')}</span>
            </div>
            <Toggle value={settings.discordRpc} onChange={v => update('discordRpc', v)} />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">{t('settings.autoAttach')}</span>
              <span className="setting-desc">{t('settings.autoAttachDesc')}</span>
            </div>
            <Toggle value={settings.autoAttach} onChange={v => update('autoAttach', v)} />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">{t('settings.alwaysOnTop')}</span>
              <span className="setting-desc">{t('settings.alwaysOnTopDesc')}</span>
            </div>
            <Toggle value={settings.alwaysOnTop} onChange={v => update('alwaysOnTop', v)} />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">{t('settings.minimizeToTray')}</span>
              <span className="setting-desc">{t('settings.minimizeToTrayDesc')}</span>
            </div>
            <Toggle value={settings.minimizeToTray} onChange={v => update('minimizeToTray', v)} />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">{t('settings.lowPerf')}</span>
              <span className="setting-desc">{t('settings.lowPerfDesc')}</span>
            </div>
            <Toggle value={settings.lowPerf} onChange={v => update('lowPerf', v)} />
          </div>
        </div>

        {/* Xeno */}
        <div className="settings-section">
          <span className="section-label">{t('settings.server')}</span>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-key">{t('settings.status')}</span>
              <span className={`info-val ${serverOk ? 'val-ok' : 'val-err'}`}>
                {serverOk ? `● ${t('settings.online')}` : `● ${t('settings.offline')}`}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Xeno</span>
              <span className="info-val">{xenoVersion}</span>
            </div>
          </div>
          <div className="setting-row" style={{ marginTop: 8 }}>
            <div className="setting-info">
              <span className="setting-name">Pastebin Block</span>
              <span className="setting-desc">Toggle pastebin.com for Xeno fallback</span>
            </div>
            <button
              className="action-btn btn-ghost"
              style={{ fontSize: 11, padding: '6px 14px' }}
              onClick={() => window.lunex?.openPastebinBat()}
            >
              Open
            </button>
          </div>
        </div>

        {/* Server Logs */}
        <div className="settings-section">
          <span className="section-label">{t('settings.logs')}</span>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">Server Logs</span>
              <span className="setting-desc">View Xeno server log files</span>
            </div>
            <Toggle value={showLogs} onChange={setShowLogs} />
          </div>
          {showLogs && <LogViewer />}
        </div>

        {/* About */}
        <div className="settings-section">
          <div className="about-card">
            <img className="about-logo-img" src="./obsidian-mark.svg" alt="Obsidian" />
            <div className="about-info">
              <span className="about-name">Obsidian</span>
              <span className="about-version">v{appVersion} · Powered by Xeno</span>
            </div>
          </div>
        </div>

        {/* Updates */}
        <div className="settings-section">
          <span className="section-label">{t('settings.updates')}</span>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-key">App Version</span>
              <span className="info-val">{appVersion}</span>
            </div>
            {updateStatus === 'available' && availableVersion && (
              <div className="info-row">
                <span className="info-key">{t('settings.updateAvailable')}</span>
                <span className="info-val" style={{ color: '#ffc832' }}>v{availableVersion}</span>
              </div>
            )}
            {updateStatus === 'downloading' && progress && (
              <div className="info-row" style={{ flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span className="info-key">{t('settings.downloading')}</span>
                  <span className="info-val">{progress.percent}%</span>
                </div>
                <div style={{ width: '100%', height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${progress.percent}%`, height: '100%', background: 'var(--mint)', borderRadius: 2, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {updateStatus === 'idle' || updateStatus === 'up-to-date' || updateStatus === 'error' ? (
              <button className="action-btn btn-ghost" onClick={checkForUpdates} style={{ fontSize: 11, padding: '6px 14px' }}>
                {t('settings.checkUpdates')}
              </button>
            ) : updateStatus === 'checking' ? (
              <button className="action-btn btn-ghost" disabled style={{ fontSize: 11, padding: '6px 14px', opacity: 0.5 }}>
                {t('common.loading')}
              </button>
            ) : updateStatus === 'available' ? (
              <button className="action-btn btn-mint" onClick={downloadUpdate} style={{ fontSize: 11, padding: '6px 14px' }}>
                {t('settings.downloading')}
              </button>
            ) : updateStatus === 'downloading' ? (
              <button className="action-btn btn-ghost" disabled style={{ fontSize: 11, padding: '6px 14px', opacity: 0.5 }}>
                {t('settings.downloading')}
              </button>
            ) : updateStatus === 'downloaded' ? (
              <button className="action-btn btn-mint" onClick={installUpdate} style={{ fontSize: 11, padding: '6px 14px' }}>
                {t('settings.install')}
              </button>
            ) : null}
            {updateStatus === 'up-to-date' && (
              <span style={{ fontSize: 11, color: 'var(--mint)', alignSelf: 'center' }}>{t('settings.upToDate')}</span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`toggle ${value ? 'on' : 'off'}`}
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

function LogViewer() {
  const [files, setFiles] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    window.lunex?.getLogFiles().then(f => {
      setFiles(f)
      if (f.length > 0) setSelected(f[f.length - 1])
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    window.lunex?.readLogFile(selected).then(c => {
      setContent(c || '')
      setLoading(false)
    })
  }, [selected])

  if (files.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '8px 0' }}>No log files found</div>
  }

  return (
    <div>
      <select
        className="setting-input"
        style={{ width: '100%', marginBottom: 8 }}
        value={selected ?? ''}
        onChange={e => setSelected(e.target.value)}
      >
        {files.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <pre style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 6,
        padding: 10,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        color: 'rgba(255,255,255,0.6)',
        maxHeight: 200,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        {loading ? t('common.loading') : content}
      </pre>
    </div>
  )
}
