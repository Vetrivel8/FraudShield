import React, { useState, useEffect, useMemo } from 'react'
import api from '../api/axios'
import { ShieldAlert, Clock, X, Info, AlertTriangle } from 'lucide-react'

const PAGE_SIZE = 50

const getId = tx => tx.transactionId ?? tx.id ?? '—'
const getSender = tx => tx.senderAccountNumber ?? tx.senderAccount ?? tx.sender ?? '—'
const getReceiver = tx => tx.receiverAccountNumber ?? tx.receiverAccount ?? tx.receiver ?? '—'
const getScore = tx => tx.fraudScore ?? tx.score ?? null
const getDevice = tx => tx.deviceTrustScore ?? tx.deviceScore ?? null
const getVelocity = tx => tx.velocityLast24h ?? tx.transactionVelocity ?? tx.velocity ?? '—'
const getMerchant = tx => tx.merchantCategory ?? tx.merchant ?? '—'

const formatINR = amount =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0)

const TIME_FILTERS = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
]

function AlertModal({ tx, onClose }) {
  if (!tx) return null
  const score = getScore(tx)
  const device = getDevice(tx)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(220,38,38,0.3)', width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.05)', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 700 }}>Fraud Alert — TX #{getId(tx)}</div>
              <div style={{ fontSize: 12 }}>{tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN') : '—'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(220,38,38,0.06)', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.1)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>⚠ FRAUD REASON</div>
            <div style={{ fontSize: '13px', color: '#374151' }}>{tx.message || 'High risk transaction detected.'}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Amount', value: formatINR(tx.amount) },
              { label: 'Sender', value: getSender(tx) },
              { label: 'Receiver', value: getReceiver(tx) },
              { label: 'Fraud Score', value: score !== null ? score.toFixed(3) : '—' },
              { label: 'Merchant', value: getMerchant(tx) },
              { label: 'Device Score', value: device !== null ? device.toFixed(3) : '—' },
              { label: 'Velocity', value: getVelocity(tx) },
              { label: 'Country', value: tx.foreignTransaction === 1 ? 'Foreign' : 'Local' }
            ].map(item => (
              <div key={item.label} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FraudAlerts() {
  const [flagged, setFlagged] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/simulation/flagged')
      .then(res => setFlagged(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (timeRange === 'all') return flagged
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - parseInt(timeRange))
    return flagged.filter(tx => tx.timestamp && new Date(tx.timestamp) >= cutoff)
  }, [flagged, timeRange])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1

  return (
    <div className="page-container animate-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Fraud Alerts</h1>
          <p>Potentially fraudulent transactions requiring review</p>
        </div>
        <div className="flex gap-8 items-center">
          <Clock size={16} color="#64748b" />
          <select className="select-input" value={timeRange} onChange={e => { setTimeRange(e.target.value); setPage(1); }}>
            {TIME_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#fff1f2', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="flex items-center gap-8">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>LIVE MONITORING ACTIVE</span>
          </div>
          <span style={{ fontSize: '12px', color: '#9f1239', fontWeight: 600 }}>{filtered.length} Flagged Incidents</span>
        </div>

        {loading ? (
          <div className="loading-wrap"><div className="spinner"></div></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Reason</th>
                  <th>Risk Score</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((tx, i) => (
                  <tr key={i} className="danger" onClick={() => setSelected(tx)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{getId(tx)}</td>
                    <td style={{ fontWeight: 700 }}>{formatINR(tx.amount)}</td>
                    <td>{getSender(tx)}</td>
                    <td>{getReceiver(tx)}</td>
                    <td><span className="badge badge-high" style={{ fontSize: '10px' }}>{tx.message || 'HIGH RISK'}</span></td>
                    <td style={{ fontWeight: 600 }}>{getScore(tx)?.toFixed(2) ?? '—'}</td>
                    <td style={{ fontSize: '11px', color: '#64748b' }}>{tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN') : '—'}</td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No fraud alerts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex justify-between items-center" style={{ padding: '12px 16px', borderTop: '1px solid #fecaca', background: '#fff1f2' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Page {page} of {totalPages}</span>
            <div className="flex gap-4">
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {selected && <AlertModal tx={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
