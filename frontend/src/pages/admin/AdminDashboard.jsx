// pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, usersAPI, patientsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentUsers, setRecentUsers] = useState([])
  const [recentPatients, setRecentPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Helper: DRF returns either a plain array OR { count, results: [...] }
  // This handles both shapes safely.
  const toArray = (data) => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (Array.isArray(data.results)) return data.results
    return []
  }

  const loadDashboardData = async () => {
    try {
      setError(null)
      const [statsData, usersData, patientsData] = await Promise.all([
        dashboardAPI.stats(),
        usersAPI.list({ limit: 5 }),
        patientsAPI.list({ limit: 5 }),
      ])
      setStats(statsData)
      setRecentUsers(toArray(usersData))
      setRecentPatients(toArray(patientsData))
    } catch (err) {
      console.error('Failed to load dashboard', err)
      setError('Failed to load dashboard data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Patients',         value: stats?.total_patients          || 0, icon: 'bi-people',       color: 'primary' },
    { label: 'Total Staff',            value: stats?.total_staff             || 0, icon: 'bi-person-badge', color: 'info'    },
    { label: 'Active Admissions',      value: stats?.total_admitted          || 0, icon: 'bi-hospital',     color: 'warning' },
    { label: 'Available Beds',         value: stats?.available_beds          || 0, icon: 'bi-bed',          color: 'success' },
    { label: 'Assets Due Maintenance', value: stats?.assets_maintenance_due  || 0, icon: 'bi-tools',        color: 'danger'  },
    { label: 'Active Emergency',       value: stats?.active_emergency        || 0, icon: 'bi-ambulance',    color: 'danger'  },
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
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.full_name || user?.username}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/admin/users')}>
            <i className="bi bi-person-plus"></i> Manage Users
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/settings')}>
            <i className="bi bi-gear"></i> System Settings
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          <i className="bi bi-exclamation-triangle"></i> {error}
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 12 }} onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="stat-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.color}`}>
            <div className="stat-icon"><i className={`bi ${stat.icon}`} style={{ fontSize: 20 }}></i></div>
            <div className="stat-value">{stat.value.toLocaleString()}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── System Overview ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">System Overview</h3>
        </div>
        <div className="card-body">
          <div className="info-grid">
            <div className="info-item"><div className="info-label">Total Doctors</div><div className="info-value">{stats?.total_doctors  || 0}</div></div>
            <div className="info-item"><div className="info-label">Total Nurses</div> <div className="info-value">{stats?.total_nurses   || 0}</div></div>
            <div className="info-item"><div className="info-label">Today's Visits</div><div className="info-value">{stats?.today_visits  || 0}</div></div>
            <div className="info-item"><div className="info-label">Occupied Beds</div><div className="info-value">{stats?.occupied_beds  || 0}</div></div>
          </div>
        </div>
      </div>

      {/* ── Recent Staff ────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Recent Staff Registrations</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/admin/users')}>View All</button>
        </div>
        <div className="card-body">
          {recentUsers.length === 0 ? (
            <div className="empty-state"><p>No recent staff registrations</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name}</td>
                      <td>{u.username}</td>
                      <td><span className={`badge badge-role-${u.user_type?.toLowerCase()}`}>{u.user_type}</span></td>
                      <td>
                        {u.is_active
                          ? <span className="badge badge-success">Active</span>
                          : <span className="badge badge-danger">Inactive</span>}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/admin/users/${u.id}`)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Patients ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Patient Registrations</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/receptionist/search')}>View All</button>
        </div>
        <div className="card-body">
          {recentPatients.length === 0 ? (
            <div className="empty-state"><p>No recent patient registrations</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.full_name}</td>
                      <td>{patient.phone_number}</td>
                      <td>{new Date(patient.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/shared/patient/${patient.id}`)}>
                          View
                        </button>
                      </td>
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