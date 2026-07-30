import { useState, useEffect, useCallback } from 'react'
import es from './es.json'
import en from './en.json'

export type Locale = 'es' | 'en'

const translations: Record<Locale, typeof es> = { es, en }

const STORAGE_KEY = 'lunex_locale'

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'es') return stored
  } catch {}
  return 'es' // Default to Spanish
}

let currentLocale: Locale = getStoredLocale()
const listeners = new Set<() => void>()

export function setLocale(locale: Locale) {
  currentLocale = locale
  localStorage.setItem(STORAGE_KEY, locale)
  listeners.forEach(l => l())
}

export function getLocale(): Locale {
  return currentLocale
}

export function useTranslation() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const t = useCallback((path: string): string => {
    const keys = path.split('.')
    let result: any = translations[currentLocale]
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key]
      } else {
        return path // Fallback to path if not found
      }
    }
    return typeof result === 'string' ? result : path
  }, [currentLocale])

  return { t, locale: currentLocale, setLocale }
}
