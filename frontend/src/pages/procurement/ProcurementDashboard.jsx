// pages/procurement/ProcurementDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, purchaseRequestsAPI, purchaseOrdersAPI, grnAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function ProcurementDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [pendingPRs, setPendingPRs] = useState([])
  const [pendingPOs, setPendingPOs] = useState([])
  const [pendingGRNs, setPendingGRNs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, prData, poData, grnData] = await Promise.all([
        dashboardAPI.stats(),
        purchaseRequestsAPI.list({ status__in: ['SUBMITTED', 'APPROVED', 'APPROVED_ACCOUNTANT'] }),
        purchaseOrdersAPI.list({ status__in: ['SENT', 'ACKNOWLEDGED'] }),
        grnAPI.list({ status: 'PENDING' })
      ])
      setStats(statsData)
      setPendingPRs(prData)
      setPendingPOs(poData)
      setPendingGRNs(grnData)
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Pending PRs', value: stats?.pending_prs || 0, icon: 'bi-file-text', color: 'warning' },
    { label: 'POs in Transit', value: stats?.pos_in_transit || 0, icon: 'bi-truck', color: 'info' },
    { label: 'Pending GRNs', value: stats?.pending_grns || 0, icon: 'bi-box-seam', color: 'primary' }
  ]

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading procurement dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Procurement Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.full_name || user?.username}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/procurement/requests')}>
            <i className="bi bi-file-text"></i> Create PR
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/procurement/orders')}>
            <i className="bi bi-truck"></i> Create PO
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
          <h3 className="card-title">Pending Purchase Requests</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/procurement/requests')}>View All</button>
        </div>
        <div className="card-body">
          {pendingPRs.length === 0 ? (
            <div className="empty-state"><p>No pending purchase requests</p></div>
          ) : (
            pendingPRs.slice(0, 5).map((pr) => (
              <div key={pr.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-info">
                  <div className="queue-name">{pr.request_number}</div>
                  <div className="queue-meta">Department: {pr.requesting_department} - Urgency: {pr.urgency}</div>
                  <div className="queue-meta">Estimated: KES {pr.estimated_cost} - Status: {pr.status}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/procurement/requests/${pr.id}`)}>Review</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Pending Goods Receipts</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/procurement/grn')}>View All</button>
        </div>
        <div className="card-body">
          {pendingGRNs.length === 0 ? (
            <div className="empty-state"><p>No pending goods receipts</p></div>
          ) : (
            pendingGRNs.slice(0, 5).map((grn) => (
              <div key={grn.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-info">
                  <div className="queue-name">GRN: {grn.grn_number}</div>
                  <div className="queue-meta">PO: {grn.po_number} - Delivery: {grn.delivery_note_number}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/procurement/grn/${grn.id}`)}>Inspect</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}