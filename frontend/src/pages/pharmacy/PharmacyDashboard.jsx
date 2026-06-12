// pages/pharmacy/PharmacyDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, prescriptionsAPI, medicinesAPI, otcAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const toArray = (data) => Array.isArray(data) ? data : (data?.results ?? [])

export default function PharmacyDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [pendingPrescriptions, setPendingPrescriptions] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, rxData, stockData, salesData] = await Promise.all([
        dashboardAPI.stats(),
        prescriptionsAPI.list({ is_dispensed: false }),
        medicinesAPI.lowStock(),
        otcAPI.list({ today: true })
      ])
      setStats(statsData)
      setPendingPrescriptions(toArray(rxData))
      setLowStock(toArray(stockData))
      setRecentSales(toArray(salesData))
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Pending Prescriptions', value: pendingPrescriptions.length, icon: 'bi-capsule', color: 'warning' },
    { label: 'Low Stock Items', value: lowStock.length, icon: 'bi-exclamation-triangle', color: 'danger' },
    { label: "Today's Sales", value: recentSales.length, icon: 'bi-currency-dollar', color: 'success' }
  ]

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading pharmacy dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Pharmacy Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.full_name || user?.username}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/pharmacy/prescriptions')}>
            <i className="bi bi-capsule"></i> Dispense Prescriptions
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/pharmacy/otc')}>
            <i className="bi bi-cart"></i> OTC Sale
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
          <h3 className="card-title">Pending Prescriptions</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/pharmacy/prescriptions')}>View All</button>
        </div>
        <div className="card-body">
          {pendingPrescriptions.length === 0 ? (
            <div className="empty-state"><p>No pending prescriptions</p></div>
          ) : (
            pendingPrescriptions.slice(0, 5).map((rx) => (
              <div key={rx.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-info">
                  <div className="queue-name">{rx.patient_name}</div>
                  <div className="queue-meta">{rx.medicine_info?.name} - {rx.quantity} {rx.medicine_info?.unit_type_display} - {rx.dosage_text}</div>
                  <div className="queue-meta">Prescribed: {new Date(rx.prescribed_at).toLocaleString()}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/pharmacy/prescriptions?rx=${rx.id}`)}>Dispense</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Low Stock Alert</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/pharmacy/stock')}>View All</button>
        </div>
        <div className="card-body">
          {lowStock.length === 0 ? (
            <div className="empty-state"><p>All stock levels are adequate</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Medicine</th><th>Current Stock</th><th>Reorder Level</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {lowStock.slice(0, 5).map((med) => (
                    <tr key={med.id}>
                      <td>{med.name}</td>
                      <td><span className="badge badge-danger">{med.quantity_in_stock}</span></td>
                      <td>{med.reorder_level}</td>
                      <td><button className="btn btn-sm btn-primary" onClick={() => navigate('/pharmacy/stock')}>Reorder</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Today's OTC Sales</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/pharmacy/otc')}>View All</button>
        </div>
        <div className="card-body">
          {recentSales.length === 0 ? (
            <div className="empty-state"><p>No OTC sales today</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Sale ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.sale_id}</td>
                      <td>{sale.customer_name}</td>
                      <td>KES {sale.total_amount}</td>
                      <td>{sale.is_dispensed ? <span className="badge badge-success">Dispensed</span> : <span className="badge badge-warning">Pending</span>}</td>
                      <td>{new Date(sale.created_at).toLocaleTimeString()}</td>
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