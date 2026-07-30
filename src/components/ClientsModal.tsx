import { useState, useEffect } from 'react'
import { api, parseClients, type Client } from '../lib/api'
import './ClientsModal.css'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ClientsModal({ open, onClose }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.getClients()
      .then(d => setClients(parseClients(d.clients)))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-clients" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Active Clients ({clients.length})</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {loading && <div className="modal-empty">Loading...</div>}
          {!loading && clients.length === 0 && (
            <div className="modal-empty">No clients attached</div>
          )}
          {!loading && clients.map((c, i) => (
            <div key={c.pid} className="client-row">
              <span className="client-dot" />
              <span className="client-index">[{i + 1}]</span>
              <span className="client-name">{c.username || 'Unknown'}</span>
              <span className="client-sep">|</span>
              <span className="client-pid">PID: {c.pid}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
