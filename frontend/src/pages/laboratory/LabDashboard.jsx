// pages/laboratory/LabDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, labOrdersAPI, labTestsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function LabDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [pendingOrders, setPendingOrders] = useState([])
  const [urgentOrders, setUrgentOrders] = useState([])
  const [criticalResults, setCriticalResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, ordersData, urgentData, criticalData] = await Promise.all([
        dashboardAPI.stats(),
        labOrdersAPI.list({ status: 'PENDING' }),
        labOrdersAPI.list({ priority: 'URGENT', status: 'PENDING' }),
        labOrdersAPI.list({ status: 'REPORTED', is_critical: true })
      ])
      setStats(statsData)
      setPendingOrders(ordersData)
      setUrgentOrders(urgentData)
      setCriticalResults(criticalData)
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Pending Orders', value: pendingOrders.length, icon: 'bi-clock-history', color: 'warning' },
    { label: 'Urgent Orders', value: urgentOrders.length, icon: ' bi-exclamation-triangle', color: 'danger' },
    { label: 'Critical Results', value: criticalResults.length, icon: 'bi-heart-pulse', color: 'danger' },
    { label: "Today's Reports", value: stats?.completed_today || 0, icon: 'bi-file-text', color: 'success' }
  ]

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading lab dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Laboratory Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.full_name || user?.username}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/laboratory/orders')}>
            <i className="bi bi-list-check"></i> Process Orders
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

      {urgentOrders.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--danger)' }}>
          <div className="card-header">
            <h3 className="card-title">Urgent Orders <span className="badge badge-danger">STAT</span></h3>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/laboratory/orders?priority=URGENT')}>View All</button>
          </div>
          <div className="card-body">
            {urgentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="queue-card" style={{ marginBottom: 12, borderLeft: '3px solid var(--danger)' }}>
                <div className="queue-info">
                  <div className="queue-name">{order.patient_name}</div>
                  <div className="queue-meta">{order.order_number} - {order.test_items?.length} tests</div>
                  <div className="queue-meta">Ordered: {new Date(order.ordered_at).toLocaleString()}</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => navigate(`/laboratory/orders/${order.id}`)}>Process Now</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Pending Orders</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/laboratory/orders')}>View All</button>
        </div>
        <div className="card-body">
          {pendingOrders.length === 0 ? (
            <div className="empty-state"><p>No pending orders</p></div>
          ) : (
            pendingOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-info">
                  <div className="queue-name">{order.patient_name}</div>
                  <div className="queue-meta">{order.order_number} - {order.test_items?.length} tests - {order.priority_display}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/laboratory/orders/${order.id}`)}>Process</button>
              </div>
            ))
          )}
        </div>
      </div>

      {criticalResults.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Critical Results to Review</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/laboratory/results?critical=true')}>View All</button>
          </div>
          <div className="card-body">
            {criticalResults.map((result) => (
              <div key={result.id} className="alert alert-danger" style={{ marginBottom: 8 }}>
                <i className="bi bi-heart-pulse-fill"></i>
                <span><strong>{result.lab_order?.patient_name}</strong> - {result.lab_order?.order_number}</span>
                <button className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }} onClick={() => navigate(`/laboratory/results/${result.id}`)}>Review</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}