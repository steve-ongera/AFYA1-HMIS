// pages/admin/AuditLogs.jsx
import React, { useState, useEffect } from 'react'
import { auditAPI } from '../../services/api'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    loadLogs()
  }, [actionFilter, dateFilter])

  const loadLogs = async () => {
    try {
      const params = {}
      if (actionFilter) params.action = actionFilter
      if (dateFilter) params.date = dateFilter

      const data = await auditAPI.logs(params)
      setLogs(Array.isArray(data) ? data : (data.results || []))
    } catch (err) {
      console.error('Failed to load audit logs', err)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (action) => {
    const badges = {
      create: 'badge-success',
      update: 'badge-info',
      delete: 'badge-danger',
      view: 'badge-neutral',
      login: 'badge-primary',
      logout: 'badge-secondary'
    }
    return badges[action] || 'badge-neutral'
  }

  const filteredLogs = logs.filter(log =>
    log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.table_affected?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading audit logs...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Track all system activities and changes</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <i className="bi bi-printer"></i> Export Report
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="form-input"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 120 }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>
          <input
            type="date"
            className="form-input"
            style={{ width: 150 }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        <div className="card-body">
          {filteredLogs.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-file-text" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No audit logs found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Table</th>
                    <th>Record ID</th>
                    <th>Description</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>{log.user_name || 'System'}</td>
                      <td>
                        <span className={`badge ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.table_affected}</td>
                      <td>{log.record_id || '-'}</td>
                      <td>{log.description}</td>
                      <td>{log.ip_address}</td>
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