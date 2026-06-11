// pages/admin/SecurityPage.jsx
import React, { useState, useEffect } from 'react'
import { auditAPI } from '../../services/api'

export default function SecurityPage() {
  const [threats, setThreats] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadThreats()
  }, [filter])

  const loadThreats = async () => {
    try {
      const params = {}
      if (filter === 'active') params.resolved = false
      else if (filter === 'resolved') params.resolved = true
      
      const data = await auditAPI.threats(params)
      setThreats(data)
    } catch (err) {
      console.error('Failed to load threats', err)
    } finally {
      setLoading(false)
    }
  }

  const resolveThreat = async (id) => {
    try {
      await auditAPI.resolveThreat(id, { notes: prompt('Resolution notes:') })
      loadThreats()
    } catch (err) {
      console.error('Failed to resolve threat', err)
    }
  }

  const getSeverityBadge = (severity) => {
    const badges = { low: 'badge-info', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' }
    return badges[severity] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading security data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Security & Threats</h1>
          <p className="page-subtitle">Monitor and respond to security incidents</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Threats</button>
        <button className={`tab-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
        <button className={`tab-btn ${filter === 'resolved' ? 'active' : ''}`} onClick={() => setFilter('resolved')}>Resolved</button>
      </div>

      <div className="card">
        <div className="card-body">
          {threats.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-shield-check" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No security threats detected</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Detected</th><th>Type</th><th>Severity</th><th>IP Address</th><th>User</th><th>Description</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {threats.map((threat) => (
                    <tr key={threat.id}>
                      <td>{new Date(threat.detected_at).toLocaleString()}</td>
                      <td>{threat.threat_type_display}</td>
                      <td><span className={`badge ${getSeverityBadge(threat.severity)}`}>{threat.severity}</span></td>
                      <td>{threat.ip_address}</td>
                      <td>{threat.user?.full_name || 'Unknown'}</td>
                      <td>{threat.description}</td>
                      <td>
                        {threat.resolved ? 
                          <span className="badge badge-success">Resolved</span> : 
                          <span className="badge badge-danger">Active</span>
                        }
                      </td>
                      <td>
                        {!threat.resolved && (
                          <button className="btn btn-sm btn-primary" onClick={() => resolveThreat(threat.id)}>
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Security Recommendations</h3>
        </div>
        <div className="card-body">
          <ul className="tag-list" style={{ flexDirection: 'column', gap: 8 }}>
            <li><i className="bi bi-check-circle-fill text-success"></i> Enable two-factor authentication for admin accounts</li>
            <li><i className="bi bi-check-circle-fill text-success"></i> Regular password updates every 90 days</li>
            <li><i className="bi bi-check-circle-fill text-success"></i> IP whitelisting for API access</li>
            <li><i className="bi bi-check-circle-fill text-success"></i> Weekly security audit reviews</li>
          </ul>
        </div>
      </div>
    </div>
  )
}