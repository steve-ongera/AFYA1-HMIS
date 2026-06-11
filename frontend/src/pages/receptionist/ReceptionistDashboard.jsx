// pages/receptionist/ReceptionistDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, visitsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function ReceptionistDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentVisits, setRecentVisits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.results)) return data.results
    return []
  }

  const loadDashboardData = async () => {
    try {
      const [statsData, visitsData] = await Promise.all([
        dashboardAPI.stats(),
        visitsAPI.list({ today: true, limit: 10 })
      ])
      setStats(statsData)
      setRecentVisits(normalizeList(visitsData))
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: "Today's Visits", value: stats?.today_visits || 0, icon: 'bi-calendar-check', color: 'primary' },
    { label: 'Waiting for Triage', value: stats?.waiting_triage || 0, icon: 'bi-clock-history', color: 'warning' },
    { label: 'In Consultation', value: stats?.in_consultation || 0, icon: 'bi-person-workspace', color: 'info' },
    { label: 'Completed Today', value: stats?.completed_today || 0, icon: 'bi-check2-circle', color: 'success' }
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
          <h1 className="page-title">Welcome, {user?.full_name || user?.username}</h1>
          <p className="page-subtitle">Receptionist Dashboard • {new Date().toLocaleDateString()}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/receptionist/register')}>
            <i className="bi bi-person-plus"></i> Register Patient
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/receptionist/new-visit')}>
            <i className="bi bi-plus-circle"></i> New Visit
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">
              <i className={stat.icon} style={{ fontSize: 20 }}></i>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Visits</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/receptionist/search')}>
            View All <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <div className="card-body">
          {recentVisits.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-calendar-x" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No visits today</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Visit #</th><th>Patient</th><th>Time</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {recentVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.visit_number}</td>
                      <td>{visit.patient_info?.full_name}</td>
                      <td>{new Date(visit.arrival_time).toLocaleTimeString()}</td>
                      <td><span className={`badge badge-${visit.status}`}>{visit.status_display}</span></td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/shared/visit/${visit.id}`)}>
                          <i className="bi bi-eye"></i> View
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