// pages/accountant/AccountantDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, etimsAPI, paymentsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function AccountantDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [pendingInvoices, setPendingInvoices] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, invoicesData, paymentsData] = await Promise.all([
        dashboardAPI.stats(),
        etimsAPI.invoices({ status: 'DRAFT' }),
        paymentsAPI.logs({ today: true })
      ])
      setStats(statsData)
      setPendingInvoices(Array.isArray(invoicesData) ? invoicesData : (invoicesData?.results ?? []))
      setRecentPayments(Array.isArray(paymentsData) ? paymentsData : (paymentsData?.results ?? []))
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Pending eTIMS Invoices', value: stats?.pending_etims_invoices || 0, icon: 'bi-file-text', color: 'warning' },
    { label: 'Submitted Today', value: stats?.submitted_today || 0, icon: 'bi-check-circle', color: 'success' },
    { label: "Today's Revenue", value: `KES ${stats?.today_revenue?.toLocaleString() || 0}`, icon: 'bi-currency-dollar', color: 'primary' }
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
          <h1 className="page-title">Accountant Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.full_name || user?.username}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/accountant/etims')}>
            <i className="bi bi-file-text"></i> eTIMS Invoices
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/accountant/reports')}>
            <i className="bi bi-graph-up"></i> Reports
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

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Pending eTIMS Invoices</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/accountant/etims')}>View All</button>
        </div>
        <div className="card-body">
          {pendingInvoices.length === 0 ? (
            <div className="empty-state"><p>No pending eTIMS invoices</p></div>
          ) : (
            pendingInvoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-info">
                  <div className="queue-name">{invoice.invoice_number}</div>
                  <div className="queue-meta">Customer: {invoice.customer_name} - Amount: KES {invoice.total_amount}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/accountant/etims/${invoice.id}`)}>Submit to eTIMS</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Today's Payments</h3>
        </div>
        <div className="card-body">
          {recentPayments.length === 0 ? (
            <div className="empty-state"><p>No payments recorded today</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Time</th><th>Transaction ID</th><th>Type</th><th>Amount</th><th>Method</th></tr>
                </thead>
                <tbody>
                  {recentPayments.slice(0, 10).map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.created_at).toLocaleTimeString()}</td>
                      <td>{payment.transaction_id}</td>
                      <td>{payment.transaction_type_display}</td>
                      <td>KES {payment.amount.toLocaleString()}</td>
                      <td>{payment.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold' }}>
                    <td colSpan="3">Total</td>
                    <td colSpan="2">KES {recentPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}