import { useState, useEffect } from 'react'
import type { Page } from '../App'
import { useTranslation } from '../locales'
import './TitleBar.css'

interface Props {
  page: Page
  setPage: (p: Page) => void
}

export default function TitleBar({ page, setPage }: Props) {
  const { t } = useTranslation()
  
  const PAGE_LABELS: Record<Page, string> = {
    home: t('pages.home'),
    editor: t('pages.editor'),
    scripthub: t('pages.scripthub'),
    settings: t('pages.settings'),
    library: t('pages.library'),
    ai: t('pages.ai'),
  }

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left">
        <div className="titlebar-logo" onClick={() => setPage('home')} title="Home">
          <img className="logo-img" src="./obsidian-mark.svg" alt="Obsidian" />
          <span className="logo-name">obsidian</span>
        </div>
        {page !== 'home' && (
          <>
            <span className="titlebar-sep">·</span>
            <span className="titlebar-page">{PAGE_LABELS[page]}</span>
          </>
        )}
      </div>
      <div className="titlebar-drag" data-tauri-drag-region />
      <div className="titlebar-right">
        <div className="titlebar-controls">
          <button className="ctrl-btn ctrl-min" onClick={() => window.lunex?.minimize()} aria-label="Minimize">
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button className="ctrl-btn ctrl-max" onClick={() => window.lunex?.maximize()} aria-label="Maximize">
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor"/></svg>
          </button>
          <button className="ctrl-btn ctrl-close" onClick={() => window.lunex?.close()} aria-label="Close">
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
