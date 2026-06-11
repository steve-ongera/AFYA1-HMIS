// pages/hr/AttendanceReport.jsx
import React, { useState, useEffect } from 'react'
import { attendanceAPI, usersAPI } from '../../services/api'

export default function AttendanceReport() {
  const [attendance, setAttendance] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  useEffect(() => {
    loadData()
  }, [selectedStaff, dateRange])

  const loadData = async () => {
    try {
      const params = {}
      if (selectedStaff) params.user = selectedStaff
      if (dateRange.from) params.date__gte = dateRange.from
      if (dateRange.to) params.date__lte = dateRange.to
      
      const [attendanceData, staffData] = await Promise.all([
        attendanceAPI.list(params),
        usersAPI.list({ is_active: true })
      ])
      setAttendance(attendanceData)
      setStaff(staffData)
    } catch (err) {
      console.error('Failed to load attendance', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = { PRESENT: 'badge-success', ABSENT: 'badge-danger', LATE: 'badge-warning', HALF_DAY: 'badge-info', ON_LEAVE: 'badge-primary' }
    return badges[status] || 'badge-neutral'
  }

  const summary = attendance.reduce((acc, record) => {
    acc[record.status] = (acc[record.status] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading attendance records...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Attendance Report</h1>
          <p className="page-subtitle">Track staff attendance and punctuality</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <i className="bi bi-printer"></i> Print Report
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Filters</h3>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Staff Member</label>
              <select className="form-select" value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                <option value="">All Staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.user_type})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card success">
          <div className="stat-icon"><i className="bi bi-check-circle"></i></div>
          <div className="stat-value">{summary.PRESENT || 0}</div>
          <div className="stat-label">Present</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon"><i className="bi bi-x-circle"></i></div>
          <div className="stat-value">{summary.ABSENT || 0}</div>
          <div className="stat-label">Absent</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon"><i className="bi bi-clock"></i></div>
          <div className="stat-value">{summary.LATE || 0}</div>
          <div className="stat-label">Late</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon"><i className="bi bi-envelope"></i></div>
          <div className="stat-value">{summary.ON_LEAVE || 0}</div>
          <div className="stat-label">On Leave</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {attendance.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-calendar" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No attendance records found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Date</th><th>Staff</th><th>Role</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Location</th></tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id}>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>{record.user_name}</td>
                      <td>{record.user_type}</td>
                      <td><span className={`badge ${getStatusBadge(record.status)}`}>{record.status_display}</span></td>
                      <td>{record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '-'}</td>
                      <td>{record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'}</td>
                      <td>{record.total_hours || '-'}</td>
                      <td>{record.check_in_location || '-'}</td>
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