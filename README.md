<div align="center">

<img src="public/Lumex.png" alt="Lumex Logo" width="100">

# Lumex

**A sleek, modern Electron UI for Xeno — the Roblox script executor.**

![Version](https://img.shields.io/badge/version-1.0.0-green)
![Electron](https://img.shields.io/badge/Electron-31-47848F)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)

[Download](#installation) • [Features](#features) • [Screenshots](#screenshots) • [Setup](#development)

</div>

---

## Features

- **Multi-tab Script Editor** — Powered by Monaco Editor with Lua syntax highlighting, autocomplete, and a custom dark theme
- **ScriptHub** — Browse and run scripts from ScriptBlox directly inside the app
- **One-Click Attach** — Inject into Roblox with a single button press
- **Execute, Clear, Kill** — Full control over script execution and Roblox processes
- **Discord Rich Presence** — Shows your status on Discord with a clean custom activity
- **Auto-Attach** — Optionally attach automatically when Roblox starts
- **Kill Roblox** — Instantly terminate Roblox from the home screen or editor
- **Always on Top** — Pin the window above other applications
- **Customizable** — Change accent color, font size, and more in Settings
- **Zoom Controls** — Ctrl+=, Ctrl+-, Ctrl+0 for quick zoom
- **Toast Notifications** — Non-intrusive feedback for every action
- **Particle Background** — Animated particles that react to your cursor on the home screen

---

## Screenshots

<div align="center">

| Home | Editor | ScriptHub |
|------|--------|-----------|
| *Clock, greeting, status, quick actions* | *Monaco editor with multi-tab support* | *Browse & run scripts from ScriptBlox* |

</div>

---

## Installation

1. Download the latest release from [Releases](https://github.com/Mewlzebub/Lumex/releases)
2. Run the installer
3. Launch Lumex

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/Mewlzebub/Lumex.git
cd Lumex

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Build

```bash
# Build for production
pnpm build
```

The output will be in the `dist` folder.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Electron | Desktop app shell |
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Monaco Editor | Code editor |
| Electron Builder | Packaging & distribution |

---

## Project Structure

```
lumex/
├── electron/          # Electron main process
│   ├── main.ts        # App entry, IPC handlers, server management
│   ├── preload.ts     # Context bridge for renderer
│   └── rpc.ts         # Discord Rich Presence (native net module)
├── src/
│   ├── components/    # Reusable UI components
│   │   ├── TitleBar.tsx
│   │   ├── Toast.tsx
│   │   └── ClientsModal.tsx
│   ├── pages/         # App pages
│   │   ├── HomePage.tsx
│   │   ├── EditorPage.tsx
│   │   ├── ScriptHubPage.tsx
│   │   └── SettingsPage.tsx
│   ├── lib/           # Utilities & types
│   │   ├── api.ts
│   │   ├── settings.ts
│   │   └── electron.d.ts
│   └── styles/        # Global styles
├── dll/               # Xeno DLLs
├── public/            # Static assets
├── Lumex_server.exe   # Injection server
└── package.json
```

---

## License

GPL-3.0 License. If you modify and distribute this software, you must open source your changes.

---

<div align="center">

**Made with care by Mewlzebub** • Built with assistance from AI

</div>
