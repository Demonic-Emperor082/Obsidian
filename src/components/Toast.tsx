import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import './Toast.css'

interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
            <div className="toast-icon">
              {t.type === 'info' && 'ℹ'}
              {t.type === 'success' && '✓'}
              {t.type === 'warning' && '⚠'}
              {t.type === 'error' && '✕'}
            </div>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={e => { e.stopPropagation(); dismiss(t.id) }}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
