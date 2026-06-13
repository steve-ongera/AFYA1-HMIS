// pages/hr/HRDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, attendanceAPI, leaveAPI, usersAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function HRDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [presentToday, setPresentToday] = useState([])
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, attendanceData, leavesData] = await Promise.all([
        dashboardAPI.stats(),
        attendanceAPI.list({ date: new Date().toISOString().split('T')[0], status: 'PRESENT' }),
        leaveAPI.list({ status: 'PENDING' })
      ])
      setStats(statsData)
      setPresentToday(Array.isArray(attendanceData) ? attendanceData : (attendanceData?.results ?? []))
      setPendingLeaves(Array.isArray(leavesData) ? leavesData : (leavesData?.results ?? []))
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Staff', value: stats?.total_staff || 0, icon: 'bi-people', color: 'primary' },
    { label: 'Present Today', value: stats?.present_today || 0, icon: ' bi-calendar-check', color: 'success' },
    { label: 'Absent Today', value: stats?.absent_today || 0, icon: 'bi-calendar-x', color: 'danger' },
    { label: 'Pending Leave', value: stats?.pending_leaves || 0, icon: 'bi-envelope', color: 'warning' }
  ]

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading HR dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">HR Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.full_name || user?.username}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/hr/qr-codes')}>
            <i className="bi bi-qr-code"></i> Generate QR Codes
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/hr/attendance')}>
            <i className="bi bi-calendar"></i> View Attendance
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
          <h3 className="card-title">Staff Present Today</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/hr/attendance')}>View All</button>
        </div>
        <div className="card-body">
          {presentToday.length === 0 ? (
            <div className="empty-state"><p>No attendance records for today</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Staff Name</th><th>Role</th><th>Check In Time</th><th>Location</th></tr>
                </thead>
                <tbody>
                  {presentToday.slice(0, 10).map((record) => (
                    <tr key={record.id}>
                      <td>{record.user_name}</td>
                      <td>{record.user_type}</td>
                      <td>{record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '-'}</td>
                      <td>{record.check_in_location || '-'}</td>
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
          <h3 className="card-title">Pending Leave Requests</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/hr/leave')}>View All</button>
        </div>
        <div className="card-body">
          {pendingLeaves.length === 0 ? (
            <div className="empty-state"><p>No pending leave requests</p></div>
          ) : (
            pendingLeaves.slice(0, 5).map((leave) => (
              <div key={leave.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-info">
                  <div className="queue-name">{leave.user_name}</div>
                  <div className="queue-meta">{leave.leave_type_name} - {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}</div>
                  <div className="queue-meta">{leave.total_days} days - {leave.reason.substring(0, 100)}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/hr/leave/${leave.id}`)}>Review</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}