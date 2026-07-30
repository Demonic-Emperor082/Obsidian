import { useState, useEffect } from 'react'
import { useAutoUpdate, type UpdateStatus } from '../lib/useAutoUpdate'

export default function UpdateBanner() {
  const { status, availableVersion, progress, checkForUpdates, downloadUpdate, installUpdate } = useAutoUpdate()
  const [dismissed, setDismissed] = useState(false)

  // Auto-check on mount
  useEffect(() => {
    const timer = setTimeout(() => checkForUpdates(), 10000)
    return () => clearTimeout(timer)
  }, [checkForUpdates])

  // Reset dismissed when status changes to something new
  useEffect(() => {
    if (status === 'available' || status === 'downloaded') {
      setDismissed(false)
    }
  }, [status])

  if (dismissed) return null

  // Downloaded → ready to install
  if (status === 'downloaded' && availableVersion) {
    return (
      <div className="update-banner update-ready">
        <div className="update-banner-content">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Obsidian <strong>v{availableVersion}</strong> ready to install</span>
        </div>
        <div className="update-banner-actions">
          <button className="update-btn" onClick={installUpdate}>Restart & Install</button>
          <button className="update-btn-dismiss" onClick={() => setDismissed(true)}>×</button>
        </div>
      </div>
    )
  }

  // Downloading with progress
  if (status === 'downloading' && progress) {
    return (
      <div className="update-banner update-downloading">
        <div className="update-banner-content">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Downloading update... {progress.percent}%</span>
        </div>
        <div className="update-progress-bar">
          <div className="update-progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
    )
  }

  // Available → offer download
  if (status === 'available' && availableVersion) {
    return (
      <div className="update-banner update-available">
        <div className="update-banner-content">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffc832" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>New version <strong>v{availableVersion}</strong> available</span>
        </div>
        <div className="update-banner-actions">
          <button className="update-btn" onClick={downloadUpdate}>Download</button>
          <button className="update-btn-dismiss" onClick={() => setDismissed(true)}>×</button>
        </div>
      </div>
    )
  }

  return null
}
