import React, { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  Activity, ShieldAlert, ShieldCheck, TrendingUp,
  RefreshCw, AlertTriangle, BarChart2, CheckCircle, Bell, X, Info
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PIE_COLORS = ['#059669', '#ea580c', '#dc2626']

const tt = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #b8d9f0',
    borderRadius: '8px',
    fontFamily: 'JetBrains Mono',
    fontSize: '12px',
    color: '#0f172a',
  }
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`toast ${type}`}>
      <CheckCircle size={16} color={type === 'success' ? '#059669' : '#dc2626'} />
      {message}
    </div>
  )
}

function extractSummary(data) {
  if (!data) return { total: 0, safe: 0, medium: 0, high: 0 }
  return {
    total: data.totalSimulated ?? data.total ?? data.totalTransactions ?? data.totalCount ?? 0,
    safe: data.safeCount ?? data.safe ?? data.safeTransactions ?? 0,
    medium: data.mediumRiskCount ?? data.mediumRisk ?? data.medium ?? 0,
    high: data.highRiskCount ?? data.highRisk ?? data.high ?? 0,
  }
}

const formatINR = amount =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)

const getId = tx => tx.transactionId ?? tx.id ?? '—'
const getSender = tx => tx.senderAccountNumber ?? tx.senderAccount ?? tx.sender ?? '—'
const getReceiver = tx => tx.receiverAccountNumber ?? tx.receiverAccount ?? tx.receiver ?? '—'
const getScore = tx => tx.fraudScore ?? tx.score ?? null
const getDevice = tx => tx.deviceTrustScore ?? tx.deviceScore ?? null
const getVelocity = tx => tx.velocityLast24h ?? tx.transactionVelocity ?? tx.velocity ?? '—'
const getMerchant = tx => tx.merchantCategory ?? tx.merchant ?? '—'

function TransactionModal({ tx, onClose }) {
  if (!tx) return null
  const score = getScore(tx)
  const device = getDevice(tx)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      background: 'rgba(15,23,42,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid rgba(220,38,38,0.3)',
        width: '560px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(220,38,38,0.2)',
          background: 'rgba(220,38,38,0.05)',
          borderRadius: '14px 14px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <AlertTriangle size={18} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 700 }}>Fraud Alert — TX #{getId(tx)}</div>
              <div style={{ fontSize: 12 }}>
                {tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN') : '—'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ margin: '0 0 20px 0', padding: '12px', background: 'rgba(220,38,38,0.06)', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.1)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>⚠ FRAUD REASON</div>
            <div style={{ fontSize: '13px', color: '#374151' }}>{tx.message || 'High risk transaction detected'}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Amount', value: formatINR(tx.amount) },
              { label: 'Sender', value: getSender(tx) },
              { label: 'Receiver', value: getReceiver(tx) },
              { label: 'Velocity', value: getVelocity(tx) },
              { label: 'Score', value: score !== null ? score.toFixed(4) : '—' },
              { label: 'Device Trust', value: device !== null ? device.toFixed(4) : '—' }
            ].map(item => (
              <div key={item.label} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AlertDropdown({ alerts, onClose, onSelectTx }) {
  return (
    <div style={{
      position: 'absolute', top: '50px', right: 0, zIndex: 1000,
      background: '#ffffff', border: '1px solid #b8d9f0',
      borderRadius: '12px', width: '320px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '14px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: 700, fontSize: '13px' }}>
        New Fraud Alerts ({alerts.length})
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {alerts.map((tx, i) => (
          <div key={i} onClick={() => { onSelectTx(tx); onClose() }} style={{
            padding: '12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
            transition: 'background 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '12px' }}>TX #{getId(tx)}</span>
              <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '12px' }}>{formatINR(tx.amount)}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{getSender(tx)} → {getReceiver(tx)}</div>
          </div>
        ))}
        {alerts.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>No new alerts</div>}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color}`}>{value.toLocaleString()}</div>
    </div>
  )
}

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newAlerts, setNewAlerts] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [toast, setToast] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/simulation/summary')
      setSummary(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // Snapshot flagged IDs before
      const beforeRes = await api.get('/simulation/flagged')
      const beforeIds = new Set((beforeRes.data || []).map(tx => tx.transactionId ?? tx.id))

      await api.post('/simulation/generate?count=5')
      
      const afterRes = await api.get('/simulation/flagged')
      const allFlagged = afterRes.data || []
      const newest = allFlagged.filter(tx => !beforeIds.has(tx.transactionId ?? tx.id))

      if (newest.length > 0) {
        setNewAlerts(prev => [...newest, ...prev])
        setShowDropdown(true)
        setToast({ msg: `Successfully created 5 transactions. ${newest.length} fraud detected!`, type: 'error' })
      } else {
        setToast({ msg: 'Successfully created 5 safe transactions.', type: 'success' })
      }
      
      fetchData()
    } catch (e) {
      setToast({ msg: 'Failed to generate transactions', type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  const s = extractSummary(summary)
  const pieData = [
    { name: 'Safe', value: s.safe },
    { name: 'Medium', value: s.medium },
    { name: 'High Risk', value: s.high },
  ]

  return (
    <div className="page-container animate-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Fraud Monitor</h1>
          <p>Real-time machine learning fraud detection overview</p>
        </div>
        <div className="flex items-center gap-12">
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost" onClick={() => setShowDropdown(!showDropdown)} style={{ border: newAlerts.length > 0 ? '1px solid #dc2626' : '1px solid #b8d9f0' }}>
              <Bell size={18} color={newAlerts.length > 0 ? '#dc2626' : '#64748b'} />
              {newAlerts.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#dc2626', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{newAlerts.length}</span>}
            </button>
            {showDropdown && <AlertDropdown alerts={newAlerts} onClose={() => setShowDropdown(false)} onSelectTx={setSelectedTx} />}
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              <RefreshCw size={16} className={generating ? 'spinner' : ''} style={generating ? { border: 'none' } : {}} />
              {generating ? 'Generating...' : 'Generate test data'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      ) : (
        <>
          <div className="grid-4 mb-24">
            <StatCard label="Total Simulated" value={s.total} color="blue" icon={<Activity size={32} />} />
            <StatCard label="Safe Transactions" value={s.safe} color="green" icon={<ShieldCheck size={32} />} />
            <StatCard label="Medium Risk" value={s.medium} color="orange" icon={<AlertTriangle size={32} />} />
            <StatCard label="High Risk" value={s.high} color="red" icon={<ShieldAlert size={32} />} />
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="section-title"><BarChart2 size={16} /> Risk Distribution</div>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={5}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip {...tt} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="section-title"><TrendingUp size={16} /> Risk Breakdown</div>
              {[
                { label: 'Safe (Low Risk)', value: s.safe, color: '#059669' },
                { label: 'Medium Risk', value: s.medium, color: '#ea580c' },
                { label: 'High Risk (Flagged)', value: s.high, color: '#dc2626' }
              ].map(m => {
                const perc = s.total > 0 ? (m.value / s.total * 100).toFixed(1) : 0
                return (
                  <div key={m.label} className="metric-row">
                    <div className="metric-label-row">
                      <span className="metric-label">{m.label}</span>
                      <span className="metric-val">{perc}%</span>
                    </div>
                    <div className="metric-track">
                      <div className="metric-fill" style={{ width: `${perc}%`, background: m.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {selectedTx && <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
