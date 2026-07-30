import { invoke } from '@tauri-apps/api/core'

const SUMI_BASE = 'https://sumi-api.netlify.app/api/v0/rblx/executors/dl/xeno'

async function sumiRequest(params?: string) {
  const url = params ? `${SUMI_BASE}?${params}` : SUMI_BASE
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface Client {
  pid: number
  username: string
  version: string
}

function parseClients(raw: unknown): Client[] {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(arr)) return []
    return arr.map((c: unknown) => {
      if (Array.isArray(c)) {
        return { pid: c[0] as number, username: c[1] as string, version: c[2] as string }
      }
      if (typeof c === 'object' && c !== null) {
        const o = c as Record<string, unknown>
        return { pid: o.pid as number, username: o.username as string ?? '', version: o.version as string ?? '' }
      }
      return null
    }).filter(Boolean) as Client[]
  } catch {
    return []
  }
}

export { parseClients }

export const api = {
  health: async () => {
    const version = await invoke<string>('xeno_version').catch(() => '')
    const downloaded = await invoke<boolean>('xeno_downloaded')
    return { status: downloaded ? 'ok' : 'not_found', version, dllLoaded: downloaded }
  },

  version: () => invoke<string>('xeno_version'),

  getClients: async (): Promise<{ clients: string }> => {
    const clients = await invoke<string>('xeno_clients')
    return { clients }
  },

  attach: () => invoke<void>('xeno_attach'),

  execute: (script: string, pids: number[]) =>
    invoke<void>('xeno_execute', { script, pids }),

  setSetting: (settingID: number, value: number) =>
    invoke<void>('xeno_set_setting', { id: settingID, value }),

  getLogs: async (_limit = 100) => ({ logs: [] }),

  getConfig: async () => ({
    port: 0,
    dataDir: '',
    xenoDir: '',
    versionsDir: '',
    version: await invoke<string>('xeno_version').catch(() => ''),
    dllLoaded: await invoke<boolean>('xeno_downloaded'),
    downloaded: await invoke<boolean>('xeno_downloaded'),
  }),

  download: async () => {
    // Downloads are handled by the Sumi API in the frontend
    throw new Error('Use sumiGetDownload + downloadXenoUpdate instead')
  },

  ensureXeno: async () => {
    return await invoke<boolean>('xeno_downloaded')
  },

  downloaded: () => invoke<boolean>('xeno_downloaded'),

  downloadStatus: async () => ({ state: 'idle', progress: 0, error: '' }),

  checkUpdates: async (version?: string) => {
    try {
      const v = version ?? await invoke<string>('xeno_version').catch(() => '')
      return await sumiRequest(`myversion=${v}`)
    } catch {
      return { needsUpdate: false, latestVersion: '' }
    }
  },

  stop: () => invoke<void>('xeno_stop'),

  init: () => invoke<string>('xeno_init'),

  verifyInjection: async (pids: number[]): Promise<boolean> => {
    try {
      const clients = await invoke<string>('xeno_clients')
      const parsed = JSON.parse(clients || '[]')
      return Array.isArray(parsed) && parsed.length > 0
    } catch {
      return false
    }
  },

  sumiCheckUpdate: (currentVersion: string): Promise<{ latestVersion: string; needsUpdate: boolean }> =>
    sumiRequest(`myversion=${currentVersion}`),
  sumiGetDownload: (): Promise<{ hits: Array<{ handler: string; file: string; url: string }> }> =>
    sumiRequest(),
}
