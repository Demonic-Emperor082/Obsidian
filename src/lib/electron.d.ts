export {}

declare global {
  interface Window {
    __LUNEX_USER__?: string
    lunex: {
      minimize: () => void
      maximize: () => void
      close: () => void
      openExternal: (url: string) => void
      rpc: {
        start: (state?: string) => Promise<void>
        update: (state: string) => Promise<void>
        stop: () => Promise<void>
      }
      setAutoAttach: (enabled: boolean) => Promise<void>
      getUsername: () => Promise<string>
      getAutoAttach: () => Promise<boolean>
      getServerStatus: () => Promise<string>
      validateClients: () => Promise<boolean>
      setAttachLock: (locked: boolean) => Promise<void>
      getAttachLock: () => Promise<boolean>
      markExecuted: () => Promise<void>
      onServerStatus: (cb: (status: string) => void) => () => void
      onRobloxStatusChanged: (cb: (running: boolean) => void) => () => void
      onRobloxClientsCleared: (cb: () => void) => () => void
      killRoblox: () => Promise<boolean>
      isRobloxRunning: () => Promise<boolean>
      fetchOgImage: (url: string) => Promise<string | null>
      setAlwaysOnTop: (enabled: boolean) => void
      setMinimizeToTray: (enabled: boolean) => void
      zoomIn: () => void
      zoomOut: () => void
      zoomReset: () => void
      setWindowSize: (w: number, h: number) => void
      clipboard: {
        read: () => Promise<string>
        write: (text: string) => Promise<boolean>
      }
      importLua: () => Promise<{ content: string; name: string } | null>
      exportLua: (content: string) => Promise<boolean>
      clearBrowserCache: () => Promise<boolean>
      downloadXenoUpdate: (zipUrl: string) => Promise<boolean>
      openPastebinBat: () => Promise<void>
      getLogFiles: () => Promise<string[]>
      readLogFile: (filename: string) => Promise<string | null>

      // OpenCode AI
      opencode: {
        start: () => Promise<boolean>
        status: () => Promise<{ running: boolean }>
        check: () => Promise<{ binaryFound: boolean; binaryPath: string }>
        createSession: (title?: string) => Promise<{ id: string; title?: string }>
        listSessions: () => Promise<Array<{ id: string; title?: string }>>
        deleteSession: (id: string) => Promise<boolean>
        getMessages: (sessionId: string) => Promise<Array<{ info: any; parts: any[] }>>
        send: (sessionId: string, text: string, model?: string) => Promise<{ info: any; parts: any[] }>
        sendAsync: (sessionId: string, text: string, model?: string) => Promise<any>
        abort: (sessionId: string) => Promise<boolean>
        getConfig: () => Promise<any>
        getProviders: () => Promise<any>
        getModels: () => Promise<any>
        setModel: (providerID: string, modelID: string) => Promise<boolean>
        setAuth: (providerId: string, apiKey: string) => Promise<boolean>
        readFile: (path: string) => Promise<{ type: string; content: string } | null>
        findFiles: (query: string) => Promise<string[]>
        search: (pattern: string) => Promise<any[]>
        getAgents: () => Promise<any[]>
      }

      // Auto-updater
      getVersion: () => Promise<string>
      checkUpdate: () => Promise<string | null>
      downloadUpdate: () => Promise<boolean>
      installUpdate: () => void
      onUpdateStatus: (cb: (status: string) => void) => () => void
      onUpdateAvailable: (cb: (version: string) => void) => () => void
      onUpdateProgress: (cb: (progress: { percent: number; transferred: number; total: number }) => void) => () => void
      onUpdateDownloaded: (cb: (version: string) => void) => () => void
    }
  }
}
