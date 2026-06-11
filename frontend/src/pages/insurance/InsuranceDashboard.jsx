// pages/insurance/InsuranceDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI, consultationClaimsAPI, pharmacyClaimsAPI, inpatientClaimsAPI, shaAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function InsuranceDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [pendingConsultations, setPendingConsultations] = useState([])
  const [pendingPharmacy, setPendingPharmacy] = useState([])
  const [pendingSHA, setPendingSHA] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, consData, pharmData, shaData] = await Promise.all([
        dashboardAPI.stats(),
        consultationClaimsAPI.list({ status: 'PENDING' }),
        pharmacyClaimsAPI.list({ status: 'PENDING' }),
        shaAPI.claims.list({ status: 'PENDING' })
      ])
      setStats(statsData)
      setPendingConsultations(consData)
      setPendingPharmacy(pharmData)
      setPendingSHA(shaData)
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Consultation Claims', value: stats?.pending_consultation_claims || 0, icon: 'bi-chat-dots', color: 'primary' },
    { label: 'Pharmacy Claims', value: stats?.pending_pharmacy_claims || 0, icon: 'bi-capsule', color: 'info' },
    { label: 'Inpatient Claims', value: stats?.pending_inpatient_claims || 0, icon: 'bi-hospital', color: 'warning' },
    { label: 'SHA Claims', value: stats?.pending_sha_claims || 0, icon: ' bi-shield', color: 'danger' }
  ]

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading insurance dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Insurance Dashboard</h1>
          <p className="page-subtitle">Manage insurance claims and approvals</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/insurance/consultation')}>
            <i className="bi bi-file-text"></i> Process Claims
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
          <h3 className="card-title">Pending Consultation Claims</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/insurance/consultation')}>View All</button>
        </div>
        <div className="card-body">
          {pendingConsultations.length === 0 ? (
            <div className="empty-state"><p>No pending consultation claims</p></div>
          ) : (
            pendingConsultations.slice(0, 5).map((claim) => (
              <div key={claim.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-info">
                  <div className="queue-name">{claim.patient_name}</div>
                  <div className="queue-meta">Claim: {claim.claim_number} - KES {claim.consultation_fee}</div>
                  <div className="queue-meta">Provider: {claim.provider_name}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/insurance/consultation/${claim.id}`)}>Review</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Pending SHA Claims</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/insurance/sha')}>View All</button>
        </div>
        <div className="card-body">
          {pendingSHA.length === 0 ? (
            <div className="empty-state"><p>No pending SHA claims</p></div>
          ) : (
            pendingSHA.slice(0, 5).map((claim) => (
              <div key={claim.id} className="queue-card" style={{ marginBottom: 12 }}>
                <div className="queue-info">
                  <div className="queue-name">{claim.patient_name}</div>
                  <div className="queue-meta">SHA: {claim.sha_number} - Claim: {claim.claim_number}</div>
                  <div className="queue-meta">Amount: KES {claim.claimed_amount}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/insurance/sha/${claim.id}`)}>Review</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}