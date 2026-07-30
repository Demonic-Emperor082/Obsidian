import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { loadSettings, applyAccent } from './lib/settings'
import { setupLunexTauriBridge } from './lib/lunex-tauri-adapter'
import './styles/globals.css'

// Setup Tauri Lunex API Bridge
setupLunexTauriBridge()

// Apply saved accent color before first render
const settings = loadSettings()
applyAccent(settings.accentColor)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

