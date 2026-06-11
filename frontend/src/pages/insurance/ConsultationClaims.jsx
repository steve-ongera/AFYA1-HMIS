// pages/insurance/ConsultationClaims.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { consultationClaimsAPI, visitsAPI, insuranceProvidersAPI } from '../../services/api'

export default function ConsultationClaims() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [claims, setClaims] = useState([])
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [visits, setVisits] = useState([])
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    patient_visit: '',
    insurance_provider: '',
    consultation_fee: '',
    service_name: '',
    member_number: ''
  })

  useEffect(() => {
    if (id) {
      loadClaim(id)
    } else {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      const [claimsData, visitsData, providersData] = await Promise.all([
        consultationClaimsAPI.list(),
        visitsAPI.list(),
        insuranceProvidersAPI.list()
      ])
      setClaims(claimsData)
      setVisits(visitsData)
      setProviders(providersData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadClaim = async (claimId) => {
    try {
      const data = await consultationClaimsAPI.get(claimId)
      setSelectedClaim(data)
    } catch (err) {
      console.error('Failed to load claim', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await consultationClaimsAPI.create(formData)
      setShowModal(false)
      setFormData({ patient_visit: '', insurance_provider: '', consultation_fee: '', service_name: '', member_number: '' })
      loadData()
    } catch (err) {
      console.error('Failed to create claim', err)
      alert(err.message || 'Failed to create claim')
    }
  }

  const handleApprove = async () => {
    if (!selectedClaim) return
    setProcessing(true)
    try {
      await consultationClaimsAPI.approve(selectedClaim.id, { comments: prompt('Approval comments:') })
      navigate('/insurance/consultation')
    } catch (err) {
      console.error('Failed to approve claim', err)
      alert(err.message || 'Failed to approve claim')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedClaim) return
    const reason = prompt('Rejection reason:')
    if (reason) {
      setProcessing(true)
      try {
        await consultationClaimsAPI.reject(selectedClaim.id, { reason })
        navigate('/insurance/consultation')
      } catch (err) {
        console.error('Failed to reject claim', err)
        alert(err.message || 'Failed to reject claim')
      } finally {
        setProcessing(false)
      }
    }
  }

  const handleConfirmPayment = async () => {
    if (!selectedClaim) return
    setProcessing(true)
    try {
      await consultationClaimsAPI.confirmPayment(selectedClaim.id, { reference: prompt('Payment reference number:') })
      navigate('/insurance/consultation')
    } catch (err) {
      console.error('Failed to confirm payment', err)
      alert(err.message || 'Failed to confirm payment')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = { PENDING: 'badge-warning', APPROVED: 'badge-info', REJECTED: 'badge-danger', PAID: 'badge-success' }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading claims...</span>
        </div>
      </div>
    )
  }

  if (selectedClaim) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">Claim Details</h1>
            <p className="page-subtitle">{selectedClaim.claim_number}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/insurance/consultation')}>
            <i className="bi bi-arrow-left"></i> Back to List
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Patient</div><div className="info-value">{selectedClaim.patient_name}</div></div>
              <div className="info-item"><div className="info-label">Insurance Provider</div><div className="info-value">{selectedClaim.provider_name}</div></div>
              <div className="info-item"><div className="info-label">Member Number</div><div className="info-value">{selectedClaim.member_number || 'N/A'}</div></div>
              <div className="info-item"><div className="info-label">Service</div><div className="info-value">{selectedClaim.service_name}</div></div>
              <div className="info-item"><div className="info-label">Consultation Fee</div><div className="info-value">KES {selectedClaim.consultation_fee}</div></div>
              <div className="info-item"><div className="info-label">Status</div><div className="info-value"><span className={`badge ${getStatusBadge(selectedClaim.status)}`}>{selectedClaim.status}</span></div></div>
              <div className="info-item"><div className="info-label">Submitted</div><div className="info-value">{new Date(selectedClaim.created_at).toLocaleString()}</div></div>
              {selectedClaim.claims_officer_comments && (
                <div className="info-item"><div className="info-label">Officer Comments</div><div className="info-value">{selectedClaim.claims_officer_comments}</div></div>
              )}
            </div>
          </div>
        </div>

        <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {selectedClaim.status === 'PENDING' && (
            <>
              <button className="btn btn-danger" onClick={handleReject} disabled={processing}>Reject</button>
              <button className="btn btn-success" onClick={handleApprove} disabled={processing}>Approve</button>
            </>
          )}
          {selectedClaim.status === 'APPROVED' && (
            <button className="btn btn-primary" onClick={handleConfirmPayment} disabled={processing}>Confirm Payment Received</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Consultation Claims</h1>
          <p className="page-subtitle">Process insurance claims for consultations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> Submit Claim
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {claims.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-file-text" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No consultation claims found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Claim #</th><th>Patient</th><th>Service</th><th>Amount</th><th>Provider</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id}>
                      <td>{claim.claim_number}</td>
                      <td>{claim.patient_name}</td>
                      <td>{claim.service_name}</td>
                      <td>KES {claim.consultation_fee}</td>
                      <td>{claim.provider_name}</td>
                      <td><span className={`badge ${getStatusBadge(claim.status)}`}>{claim.status}</span></td>
                      <td>{new Date(claim.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/insurance/consultation/${claim.id}`)}>
                          Review
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

      {/* Submit Claim Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Submit Insurance Claim</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Patient Visit</label>
                  <select className="form-select" required value={formData.patient_visit} onChange={(e) => setFormData(prev => ({ ...prev, patient_visit: e.target.value }))}>
                    <option value="">Select visit...</option>
                    {visits.map(v => <option key={v.id} value={v.id}>{v.visit_number} - {v.patient_info?.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Insurance Provider</label>
                  <select className="form-select" required value={formData.insurance_provider} onChange={(e) => setFormData(prev => ({ ...prev, insurance_provider: e.target.value }))}>
                    <option value="">Select provider...</option>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Consultation Fee</label>
                  <input type="number" className="form-input" required value={formData.consultation_fee} onChange={(e) => setFormData(prev => ({ ...prev, consultation_fee: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Service Name</label>
                  <input type="text" className="form-input" required value={formData.service_name} onChange={(e) => setFormData(prev => ({ ...prev, service_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Member Number</label>
                  <input type="text" className="form-input" value={formData.member_number} onChange={(e) => setFormData(prev => ({ ...prev, member_number: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}