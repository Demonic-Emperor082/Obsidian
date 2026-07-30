import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Obsidian] ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#050508', color: '#e0e0e0', fontFamily: 'monospace', padding: 40,
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="1.5" style={{ marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#ff6b6b' }}>Something went wrong</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888', maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              background: '#7fffd4', color: '#050508', border: 'none', padding: '8px 24px',
              borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
