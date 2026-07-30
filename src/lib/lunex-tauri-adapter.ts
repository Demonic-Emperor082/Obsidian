import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';

export function setupLunexTauriBridge() {
  try {
    const appWindow = getCurrentWindow();

    const lunexBridge = {
      minimize: () => appWindow.minimize(),
      maximize: async () => {
        if (await appWindow.isMaximized()) {
          appWindow.unmaximize();
        } else {
          appWindow.maximize();
        }
      },
      close: () => appWindow.close(),
      openExternal: (url: string) => openUrl(url),

      rpc: {
        start: (state?: string) => invoke('rpc_start', { state }),
        update: (state: string) => invoke('rpc_update', { state }),
        stop: () => invoke('rpc_stop'),
      },

      getUsername: () => invoke<string>('get_username'),
      setAutoAttach: (enabled: boolean) => invoke('set_auto_attach', { enabled }),
      getAutoAttach: () => invoke<boolean>('get_auto_attach'),
      getServerStatus: () => invoke<string>('get_server_status'),
      validateClients: () => invoke<boolean>('validate_clients'),
      setAttachLock: (locked: boolean) => invoke('set_attach_lock', { locked }),
      getAttachLock: () => invoke<boolean>('get_attach_lock'),
      markExecuted: () => invoke('mark_executed'),

      onServerStatus: (cb: (status: string) => void) => {
        let unlisten: UnlistenFn | null = null;
        listen<string>('server-status', (event) => cb(event.payload)).then((fn) => { unlisten = fn; });
        return () => { if (unlisten) unlisten(); };
      },

      onRobloxStatusChanged: (cb: (running: boolean) => void) => {
        let unlisten: UnlistenFn | null = null;
        listen<boolean>('roblox-status-changed', (event) => cb(event.payload)).then((fn) => { unlisten = fn; });
        return () => { if (unlisten) unlisten(); };
      },

      onRobloxClientsCleared: (cb: () => void) => {
        let unlisten: UnlistenFn | null = null;
        listen('roblox-clients-cleared', () => cb()).then((fn) => { unlisten = fn; });
        return () => { if (unlisten) unlisten(); };
      },

      killRoblox: () => invoke('kill_roblox'),
      isRobloxRunning: () => invoke<boolean>('is_roblox_running'),
      fetchOgImage: (url: string) => invoke<string | null>('fetch_og_image', { url }),
      setAlwaysOnTop: (enabled: boolean) => appWindow.setAlwaysOnTop(enabled),
      setMinimizeToTray: (enabled: boolean) => invoke('set_minimize_to_tray', { enabled }),
      zoomIn: () => invoke('zoom_in'),
      zoomOut: () => invoke('zoom_out'),
      zoomReset: () => invoke('zoom_reset'),
      setWindowSize: (w: number, h: number) => invoke('set_window_size', { width: w, height: h }),

      clipboard: {
        read: async () => {
          try { return (await readText()) || ''; } catch { return ''; }
        },
        write: async (text: string) => {
          try { await writeText(text); } catch (e) { console.error('Failed to write clipboard:', e); }
        },
      },

      importLua: async () => {
        try {
          const filePath = await openDialog({
            filters: [{ name: 'Lua Scripts', extensions: ['lua', 'txt'] }],
            multiple: false,
          });
          if (filePath && typeof filePath === 'string') {
            return await readTextFile(filePath);
          }
        } catch (e) { console.error('importLua error:', e); }
        return null;
      },

      exportLua: async (content: string) => {
        try {
          const filePath = await saveDialog({
            filters: [{ name: 'Lua Script', extensions: ['lua'] }],
            defaultPath: 'script.lua',
          });
          if (filePath) { await writeTextFile(filePath, content); return true; }
        } catch (e) { console.error('exportLua error:', e); }
        return false;
      },

      clearBrowserCache: () => invoke('clear_browser_cache'),
      downloadXenoUpdate: (zipUrl: string) => invoke('download_xeno_update', { zipUrl }),
      openPastebinBat: () => invoke('open_pastebin_bat'),
      getLogFiles: () => invoke<string[]>('get_log_files'),
      readLogFile: (filename: string) => invoke<string>('read_log_file', { filename }),

      opencode: {
        start: () => invoke('opencode_start'),
        status: () => invoke<{ running: boolean }>('opencode_status'),
        check: () => invoke<{ binaryFound: boolean; binaryPath: string }>('opencode_check'),
        createSession: (title?: string) => invoke('opencode_session_create', { title }),
        listSessions: () => invoke('opencode_sessions'),
        deleteSession: (id: string) => invoke('opencode_session_delete', { id }),
        getMessages: (sessionId: string) => invoke('opencode_messages', { sessionId }),
        send: (sessionId: string, text: string, model?: string) => invoke('opencode_send', { sessionId, text, model }),
        sendAsync: (sessionId: string, text: string, model?: string) => invoke('opencode_send_async', { sessionId, text, model }),
        abort: (sessionId: string) => invoke('opencode_abort', { sessionId }),
        getConfig: () => invoke('opencode_config'),
        getProviders: () => invoke('opencode_providers'),
        getModels: () => invoke('opencode_models'),
        setModel: (providerID: string, modelID: string) => invoke('opencode_set_model', { providerID, modelID }),
        setAuth: (providerId: string, apiKey: string) => invoke('opencode_set_auth', { providerId, apiKey }),
        readFile: (path: string) => invoke('opencode_file_read', { path }),
        findFiles: (query: string) => invoke('opencode_find_files', { query }),
        search: (pattern: string) => invoke('opencode_search', { pattern }),
        getAgents: () => invoke('opencode_agents'),
      },

      getVersion: () => invoke<string>('app_get_version'),
      checkUpdate: () => invoke('app_check_update'),
      downloadUpdate: () => invoke('app_download_update'),
      installUpdate: () => invoke('app_install_update'),
      onUpdateStatus: (cb: (status: string) => void) => {
        let unlisten: UnlistenFn | null = null;
        listen<string>('update-status', (e) => cb(e.payload)).then((fn) => { unlisten = fn; });
        return () => { if (unlisten) unlisten(); };
      },
      onUpdateAvailable: (cb: (version: string) => void) => {
        let unlisten: UnlistenFn | null = null;
        listen<string>('update-available', (e) => cb(e.payload)).then((fn) => { unlisten = fn; });
        return () => { if (unlisten) unlisten(); };
      },
      onUpdateProgress: (cb: (progress: { percent: number; transferred: number; total: number }) => void) => {
        let unlisten: UnlistenFn | null = null;
        listen<{ percent: number; transferred: number; total: number }>('update-progress', (e) => cb(e.payload)).then((fn) => { unlisten = fn; });
        return () => { if (unlisten) unlisten(); };
      },
      onUpdateDownloaded: (cb: (version: string) => void) => {
        let unlisten: UnlistenFn | null = null;
        listen<string>('update-downloaded', (e) => cb(e.payload)).then((fn) => { unlisten = fn; });
        return () => { if (unlisten) unlisten(); };
      },
    };

    (window as any).lunex = lunexBridge;
  } catch (e) {
    console.error('[Obsidian] Failed to setup Tauri bridge:', e);
  }
}
