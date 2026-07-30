import { useState, useEffect, useCallback } from 'react'

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error'

export interface UpdateProgress {
  percent: number
  transferred: number
  total: number
}

export function useAutoUpdate() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)

  useEffect(() => {
    const unsubs = [
      window.lunex?.onUpdateStatus((s) => {
        setStatus(s as UpdateStatus)
        if (s === 'up-to-date' || s === 'error') {
          setTimeout(() => setStatus('idle'), 5000)
        }
      }),
      window.lunex?.onUpdateAvailable((v) => {
        setAvailableVersion(v)
        setStatus('available')
      }),
      window.lunex?.onUpdateProgress((p) => {
        setProgress(p)
      }),
      window.lunex?.onUpdateDownloaded((v) => {
        setAvailableVersion(v)
        setStatus('downloaded')
        setProgress(null)
      }),
    ]
    return () => { unsubs.forEach(u => u?.()) }
  }, [])

  const checkForUpdates = useCallback(async () => {
    setStatus('checking')
    await window.lunex?.checkUpdate()
  }, [])

  const downloadUpdate = useCallback(async () => {
    setStatus('downloading')
    await window.lunex?.downloadUpdate()
  }, [])

  const installUpdate = useCallback(() => {
    window.lunex?.installUpdate()
  }, [])

  return { status, availableVersion, progress, checkForUpdates, downloadUpdate, installUpdate }
}
