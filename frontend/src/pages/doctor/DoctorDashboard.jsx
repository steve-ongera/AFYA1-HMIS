// pages/doctor/DoctorDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, queueAPI, appointmentsAPI, labOrdersAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [todayAppointments, setTodayAppointments] = useState([])
  const [pendingResults, setPendingResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, queueData, appointmentsData, labData] = await Promise.all([
        dashboardAPI.stats(),
        queueAPI.byDept('CONSULTATION'),
        appointmentsAPI.list({ today: true, my: true }),
        labOrdersAPI.list({ status: 'REPORTED' })
      ])
      setStats(statsData)
      setQueue(queueData)
      setTodayAppointments(appointmentsData)
      setPendingResults(labData)
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'In Queue', value: queue.length, icon: 'bi-people', color: 'warning' },
    { label: "Today's Appointments", value: todayAppointments.length, icon: 'bi-calendar', color: 'primary' },
    { label: 'Pending Lab Results', value: pendingResults.length, icon: 'bi-microscope', color: 'info' }
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
          <h1 className="page-title">Doctor Dashboard</h1>
          <p className="page-subtitle">Welcome, Dr. {user?.full_name || user?.username}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/doctor/queue')}>
            <i className="bi bi-people"></i> Start Consultation
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
          <h3 className="card-title">Consultation Queue</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/doctor/queue')}>View All</button>
        </div>
        <div className="card-body">
          {queue.length === 0 ? (
            <div className="empty-state"><p>No patients in consultation queue</p></div>
          ) : (
            queue.slice(0, 5).map((item) => (
              <div key={item.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-number">{item.queue_number}</div>
                <div className="queue-info">
                  <div className="queue-name">{item.patient_name}</div>
                  <div className="queue-meta">Waiting: {item.wait_minutes} min • Triage: {item.triage_color || 'N/A'}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/doctor/queue?visit=${item.visit}`)}>Consult</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Today's Appointments</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/doctor/appointments')}>View All</button>
        </div>
        <div className="card-body">
          {todayAppointments.length === 0 ? (
            <div className="empty-state"><p>No appointments scheduled today</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Time</th><th>Patient</th><th>Reason</th><th>Actions</th></tr></thead>
                <tbody>
                  {todayAppointments.map((apt) => (
                    <tr key={apt.id}>
                      <td>{new Date(apt.scheduled_time).toLocaleTimeString()}</td>
                      <td>{apt.patient_name}</td>
                      <td>{apt.reason}</td>
                      <td><button className="btn btn-sm btn-primary" onClick={() => navigate(`/doctor/queue?appointment=${apt.id}`)}>Start</button></td>
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
          <h3 className="card-title">Pending Lab Results</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/doctor/lab-results')}>View All</button>
        </div>
        <div className="card-body">
          {pendingResults.length === 0 ? (
            <div className="empty-state"><p>No pending lab results</p></div>
          ) : (
            pendingResults.slice(0, 5).map((order) => (
              <div key={order.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-info">
                  <div className="queue-name">{order.patient_name}</div>
                  <div className="queue-meta">{order.order_number} • Completed: {new Date(order.completed_at).toLocaleString()}</div>
                </div>
                <button className="btn btn-info btn-sm" onClick={() => navigate(`/doctor/lab-results/${order.id}`)}>View Results</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}