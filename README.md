<div align="center">

<img src="public/obsidian-mark.svg" alt="Obsidian Logo" width="120">

# Obsidian

**A modern Tauri-based UI for Xeno — the Roblox script executor.**

![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Rust](https://img.shields.io/badge/Rust-1.77-CE422B)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)

[Download](#installation) • [Features](#features) • [Development](#development)

</div>

---

## Features

- **Multi-tab Script Editor** — Monaco Editor with Lua syntax highlighting and autocomplete
- **ScriptHub** — Browse and run scripts from ScriptBlox directly inside the app
- **One-Click Attach** — Inject into Roblox via Xeno DLL with a single button
- **Execute, Clear, Kill** — Full control over script execution and Roblox processes
- **Discord Rich Presence** — Shows your status on Discord with a custom activity
- **Auto-Attach** — Optionally attach automatically when Roblox starts
- **AI Assistant** — Built-in OpenCode AI integration for code help
- **Always on Top** — Pin the window above other applications
- **Customizable** — Change accent color, font size, and more in Settings
- **Zoom Controls** — Ctrl+=, Ctrl+-, Ctrl+0 for quick zoom
- **Toast Notifications** — Non-intrusive feedback for every action
- **Animated Splash Screen** — Smooth window expansion on launch
- **System Tray** — Minimize to tray on close

---

## Installation

1. Download the latest release from [Releases](https://github.com/Demonic-Emperor082/Obsidian/releases)
2. Run the installer
3. Launch Obsidian

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- [pnpm](https://pnpm.io/) (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/Demonic-Emperor082/Obsidian.git
cd Obsidian

# Install dependencies
pnpm install

# Start development server (frontend only)
pnpm dev

# Start Tauri dev (full app with Rust backend)
pnpm tauri:dev
```

### Build

```bash
# Build for production
pnpm tauri:build
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Tauri 2.x | Desktop app shell & native APIs |
| React 18 | UI framework |
| Rust | Backend, DLL integration, system APIs |
| TypeScript | Type safety |
| Vite | Build tool |
| Monaco Editor | Code editor |

---

## Project Structure

```
obsidian/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── lib.rs       # App entry, commands, window management
│   │   ├── xeno.rs      # Xeno DLL integration
│   │   └── opencode.rs  # OpenCode AI integration
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                 # React frontend
│   ├── components/      # Reusable UI components
│   ├── pages/           # App pages
│   ├── lib/             # Utilities & API calls
│   ├── locales/         # i18n (en/es)
│   └── styles/          # Global styles
├── public/              # Static assets (logo, icons)
└── package.json
```

---

## License

GPL-3.0 License. If you modify and distribute this software, you must open source your changes.

---

<div align="center">

**Made with care by Mewlzebub** • Built with assistance from AI

</div>
