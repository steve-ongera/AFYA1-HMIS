// pages/nurse/NurseDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, visitsAPI, queueAPI, admissionsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function NurseDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [triageQueue, setTriageQueue] = useState([])
  const [activeAdmissions, setActiveAdmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, queueData, admissionsData] = await Promise.all([
        dashboardAPI.stats(),
        queueAPI.byDept('TRIAGE'),
        admissionsAPI.active()
      ])
      setStats(statsData)
      setTriageQueue(queueData)
      setActiveAdmissions(admissionsData)
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Triage Queue', value: triageQueue.length, icon: 'bi-activity', color: 'warning' },
    { label: 'Active Admissions', value: stats?.total_admitted || 0, icon: 'bi-hospital', color: 'info' },
    { label: 'Available Beds', value: stats?.available_beds || 0, icon: 'bi-bed', color: 'success' }
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
          <h1 className="page-title">Nurse Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.full_name || user?.username}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/nurse/triage')}>
            <i className="bi bi-activity"></i> Start Triage
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
          <h3 className="card-title">Triage Queue</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/nurse/triage')}>View All</button>
        </div>
        <div className="card-body">
          {triageQueue.length === 0 ? (
            <div className="empty-state"><p>No patients waiting for triage</p></div>
          ) : (
            triageQueue.slice(0, 5).map((item) => (
              <div key={item.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-number">{item.queue_number}</div>
                <div className="queue-info">
                  <div className="queue-name">{item.patient_name}</div>
                  <div className="queue-meta">Arrived: {new Date(item.joined_queue).toLocaleTimeString()}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/nurse/triage?visit=${item.visit}`)}>
                  Assess
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Active Inpatients</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/nurse/vitals')}>Record Vitals</button>
        </div>
        <div className="card-body">
          {activeAdmissions.length === 0 ? (
            <div className="empty-state"><p>No active inpatient admissions</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Patient</th><th>Admission #</th><th>Bed</th><th>Doctor</th><th>Actions</th></tr></thead>
                <tbody>
                  {activeAdmissions.map((admission) => (
                    <tr key={admission.id}>
                      <td>{admission.patient_name}</td>
                      <td>{admission.admission_number}</td>
                      <td>{admission.bed_info?.bed_number || 'N/A'}</td>
                      <td>{admission.attending_doctor_name || 'N/A'}</td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/nurse/vitals?admission=${admission.id}`)}>
                          <i className="bi bi-heart-pulse"></i> Vitals
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