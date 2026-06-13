// pages/receptionist/ReceptionistDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, visitsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function ReceptionistDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats]             = useState(null)
  const [recentVisits, setRecentVisits] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.results)) return data.results
    return []
  }

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Run both requests; don't let one failure kill the other
      const [statsData, visitsData] = await Promise.allSettled([
        dashboardAPI.stats(),
        visitsAPI.list({ ordering: '-arrival_time', limit: 10 }),
      ])

      // ── Stats ──────────────────────────────────────────────────────────────
      if (statsData.status === 'fulfilled') {
        console.log('📊 Dashboard stats:', statsData.value)
        setStats(statsData.value)
      } else {
        console.error('❌ Stats failed:', statsData.reason)
      }

      // ── Visits ─────────────────────────────────────────────────────────────
      if (visitsData.status === 'fulfilled') {
        console.log('🏥 Visits data:', visitsData.value)
        setRecentVisits(normalizeList(visitsData.value))
      } else {
        console.error('❌ Visits failed:', visitsData.reason)
      }

    } catch (err) {
      console.error('Dashboard load error:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  // ── Derive stat values defensively ──────────────────────────────────────────
  // Log stats keys so you can see the exact field names your backend sends
  useEffect(() => {
    if (stats) {
      console.log('📋 Stats keys available:', Object.keys(stats))
    }
  }, [stats])

  const statCards = [
    {
      label: "Today's Visits",
      // Common key variants — adjust after seeing console output
      value: stats?.today_visits ?? stats?.visits_today ?? stats?.total_visits_today ?? 0,
      icon: 'bi-calendar-check',
      color: 'primary',
    },
    {
      label: 'Waiting for Triage',
      value: stats?.waiting_triage ?? stats?.triage_waiting ?? stats?.waiting ?? 0,
      icon: 'bi-clock-history',
      color: 'warning',
    },
    {
      label: 'In Consultation',
      value: stats?.in_consultation ?? stats?.consultation ?? 0,
      icon: 'bi-person-workspace',
      color: 'info',
    },
    {
      label: 'Completed Today',
      value: stats?.completed_today ?? stats?.completed ?? 0,
      icon: 'bi-check2-circle',
      color: 'success',
    },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay" style={{ minHeight: '60vh' }}>
          <div className="spinner spinner-lg" />
          <span>Loading dashboard…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">
            Welcome, {user?.full_name || user?.username}
          </h1>
          <p className="page-subtitle">
            Receptionist Dashboard • {new Date().toLocaleDateString('en-KE', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/receptionist/register')}>
            <i className="bi bi-person-plus" /> Register Patient
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/receptionist/new-visit')}>
            <i className="bi bi-plus-circle" /> New Visit
          </button>
        </div>
      </div>

      {/* Error banner — visible so you can see what's wrong */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          <i className="bi bi-exclamation-triangle-fill" /> {error}
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="stat-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">
              <i className={stat.icon} style={{ fontSize: 20 }} />
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent visits */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Recent Visits
            {recentVisits.length > 0 && (
              <span className="badge badge-neutral" style={{ marginLeft: 8 }}>
                {recentVisits.length}
              </span>
            )}
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/receptionist/search')}>
            View All <i className="bi bi-arrow-right" />
          </button>
        </div>
        <div className="card-body">
          {recentVisits.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-calendar-x" style={{ fontSize: 48, opacity: 0.5 }} />
              <p className="empty-state-text">No visits found</p>
              <button className="btn btn-primary" onClick={() => navigate('/receptionist/new-visit')}>
                <i className="bi bi-plus-circle" /> Register First Visit
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Visit #</th>
                    <th>Patient</th>
                    <th>Type</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td><strong>{visit.visit_number}</strong></td>
                      <td>{visit.patient_info?.full_name ?? '—'}</td>
                      <td>{visit.visit_type_display ?? visit.visit_type}</td>
                      <td>{new Date(visit.arrival_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <span className={`badge badge-${visit.status?.toLowerCase()}`}>
                          {visit.status_display ?? visit.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => navigate(`/shared/visit/${visit.id}`)}
                        >
                          <i className="bi bi-eye" /> View
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