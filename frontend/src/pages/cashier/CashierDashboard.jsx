// pages/cashier/CashierDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, cashierAPI, paymentsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function CashierDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, sessionData, paymentsData] = await Promise.all([
        dashboardAPI.stats(),
        cashierAPI.activeSession().catch(() => null),
        paymentsAPI.logs({ today: true })
      ])
      setStats(statsData)
      setActiveSession(sessionData)
      setRecentPayments(paymentsData)
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const openSession = async () => {
    const openingBalance = prompt('Enter opening balance (KES):', '0')
    if (openingBalance !== null) {
      try {
        await cashierAPI.openSession({ opening_balance: parseFloat(openingBalance) })
        loadDashboardData()
      } catch (err) {
        alert(err.message || 'Failed to open session')
      }
    }
  }

  const statCards = [
    { label: "Today's Revenue", value: `KES ${stats?.today_revenue?.toLocaleString() || 0}`, icon: 'bi-currency-dollar', color: 'success' },
    { label: 'Cash Payments', value: `KES ${stats?.today_cash?.toLocaleString() || 0}`, icon: 'bi-cash', color: 'primary' },
    { label: 'M-Pesa Payments', value: `KES ${stats?.today_mpesa?.toLocaleString() || 0}`, icon: ' bi-phone', color: 'info' },
    { label: 'Session Status', value: activeSession ? 'OPEN' : 'CLOSED', icon: 'bi-door-open', color: activeSession ? 'success' : 'danger' }
  ]

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Cashier Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.full_name || user?.username}</p>
        </div>
        <div className="page-actions">
          {!activeSession ? (
            <button className="btn btn-success" onClick={openSession}>
              <i className="bi bi-door-open"></i> Open Session
            </button>
          ) : (
            <button className="btn btn-warning" onClick={() => navigate('/cashier/session')}>
              <i className="bi bi-door-closed"></i> Close Session
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/cashier/payments')}>
            <i className="bi bi-credit-card"></i> Process Payment
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.color}`}>
            <div className="stat-icon"><i className={stat.icon} style={{ fontSize: 20 }}></i></div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {activeSession && (
        <div className="card" style={{ marginBottom: 24, background: 'var(--primary-10)' }}>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Session ID</div><div className="info-value">{activeSession.session_id}</div></div>
              <div className="info-item"><div className="info-label">Opened At</div><div className="info-value">{new Date(activeSession.opened_at).toLocaleString()}</div></div>
              <div className="info-item"><div className="info-label">Opening Balance</div><div className="info-value">KES {activeSession.opening_balance}</div></div>
              <div className="info-item"><div className="info-label">Expected Cash</div><div className="info-value">KES {activeSession.expected_cash}</div></div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Transactions</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/cashier/payments')}>View All</button>
        </div>
        <div className="card-body">
          {recentPayments.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-receipt" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No transactions today</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Time</th><th>Transaction ID</th><th>Type</th><th>Amount</th><th>Method</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentPayments.slice(0, 10).map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.created_at).toLocaleTimeString()}</td>
                      <td>{payment.transaction_id}</td>
                      <td>{payment.transaction_type_display}</td>
                      <td>KES {payment.amount.toLocaleString()}</td>
                      <td>{payment.payment_method}</td>
                      <td><span className={`badge ${payment.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>{payment.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}