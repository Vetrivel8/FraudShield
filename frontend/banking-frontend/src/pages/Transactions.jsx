import React, { useState, useEffect, useMemo } from 'react'
import api from '../api/axios'
import { Search, ArrowLeftRight, X, AlertTriangle, CheckCircle, Info } from 'lucide-react'

const PAGE_SIZE = 50

const getId = tx => tx.transactionId ?? tx.id ?? '—'
const getSender = tx => tx.senderAccountNumber ?? tx.senderAccount ?? tx.sender ?? '—'
const getReceiver = tx => tx.receiverAccountNumber ?? tx.receiverAccount ?? tx.receiver ?? '—'
const getVelocity = tx => tx.velocityLast24h ?? tx.transactionVelocity ?? tx.velocity ?? '—'
const getDevice = tx => tx.deviceTrustScore ?? tx.deviceScore ?? null
const getScore = tx => tx.fraudScore ?? tx.score ?? null
const getMerchant = tx => tx.merchantCategory ?? tx.merchant ?? '—'

const getRiskStr = tx => {
  const fraudStatus = (tx.fraudStatus || '').toUpperCase()
  const simType = (tx.simulationType || '').toUpperCase()
  if (fraudStatus === 'HIGH_RISK' || simType === 'HIGH' || tx.flagged) return 'HIGH'
  if (fraudStatus === 'MEDIUM_RISK' || simType === 'MEDIUM') return 'MEDIUM'
  return 'SAFE'
}

const formatINR = amount =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0)

function TransactionModal({ tx, onClose }) {
  if (!tx) return null
  const risk = getRiskStr(tx)
  const isHigh = risk === 'HIGH'
  const isMed = risk === 'MEDIUM'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="animate-in" style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #cbd5e1', width: '580px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: '14px 14px 0 0' }}>
          <div className="flex items-center gap-10">
            {isHigh ? <AlertTriangle size={18} color="#dc2626" /> : <CheckCircle size={18} color={isMed ? "#d97706" : "#16a34a"} />}
            <div>
              <div style={{ fontWeight: 700 }}>Transaction Details</div>
              <div style={{ fontSize: 12 }}>ID: {getId(tx)}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ 
            marginBottom: '20px', padding: '12px', borderRadius: '8px', border: '1px solid',
            background: isHigh ? '#fff1f2' : isMed ? '#fffbeb' : '#f0fdf4',
            borderColor: isHigh ? '#fecaca' : isMed ? '#fef3c7' : '#bbf7d0',
            color: isHigh ? '#991b1b' : isMed ? '#92400e' : '#166534',
            display: 'flex', gap: '10px'
          }}>
            <Info size={16} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>{risk} RISK STATUS</div>
              <div style={{ fontSize: '13px' }}>{tx.message || (isHigh ? 'High risk flagged for potential fraud.' : 'Normal transaction behavior.')}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Amount', value: formatINR(tx.amount) },
              { label: 'Sender', value: getSender(tx) },
              { label: 'Receiver', value: getReceiver(tx) },
              { label: 'Timestamp', value: tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN') : '—' },
              { label: 'Merchant', value: getMerchant(tx) },
              { label: 'Fraud Score', value: getScore(tx)?.toFixed(2) ?? '—' },
              { label: 'Velocity (24h)', value: getVelocity(tx) },
              { label: 'Device ID', value: tx.deviceId ?? '—' }
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

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/simulation/all')
      .then(res => setTransactions(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const risk = getRiskStr(tx)
      const matchesFilter = filter === 'All' || risk === filter.toUpperCase()
      const searchStr = String(getId(tx) + getSender(tx) + getReceiver(tx)).toLowerCase()
      return matchesFilter && searchStr.includes(search.toLowerCase())
    })
  }, [transactions, filter, search])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1

  return (
    <div className="page-container animate-in">
      <div className="page-header flex justify-between items-center">
        <div className="flex items-center gap-12">
          <ArrowLeftRight size={24} color="var(--accent-cyan)" />
          <div>
            <h1>Transactions</h1>
            <p>Complete history of all simulated transactions</p>
          </div>
        </div>
        <div className="flex gap-12">
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="search-input" style={{ paddingLeft: '36px' }} placeholder="Search Transactions..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="select-input" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
            <option value="All">All Risks</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="SAFE">Safe</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                  <th>Timestamp</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((tx, i) => {
                  const risk = getRiskStr(tx)
                  return (
                    <tr key={i} onClick={() => setSelected(tx)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{getId(tx)}</td>
                      <td style={{ fontWeight: 700 }}>{formatINR(tx.amount)}</td>
                      <td>{getSender(tx)}</td>
                      <td>{getReceiver(tx)}</td>
                      <td style={{ fontSize: '11px', color: '#64748b' }}>{tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN') : '—'}</td>
                      <td>
                        <span className={`badge badge-${risk.toLowerCase()}`}>{risk}</span>
                      </td>
                    </tr>
                  )
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No transactions found matches your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && totalPages > 1 && (
          <div className="flex justify-between items-center" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Page {page} of {totalPages}</span>
            <div className="flex gap-4">
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {selected && <TransactionModal tx={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
