// pages/insurance/SHAClaimsPage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { shaAPI, patientsAPI, consultationsAPI } from '../../services/api'

export default function SHAClaimsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [claims, setClaims] = useState([])
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [patients, setPatients] = useState([])
  const [consultations, setConsultations] = useState([])
  const [shaMembers, setShaMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [shaMember, setShaMember] = useState(null)
  const [formData, setFormData] = useState({
    sha_member: '',
    consultation: '',
    claim_type: 'OUTPATIENT',
    service_date: new Date().toISOString().split('T')[0],
    claimed_amount: '',
    notes: ''
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
      const [claimsData, patientsData, consultationsData, membersData] = await Promise.all([
        shaAPI.claims.list(),
        patientsAPI.list({ limit: 100 }),
        consultationsAPI.list(),
        shaAPI.members.list()
      ])
      setClaims(claimsData)
      setPatients(patientsData)
      setConsultations(consultationsData)
      setShaMembers(membersData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadClaim = async (claimId) => {
    try {
      const data = await shaAPI.claims.get(claimId)
      setSelectedClaim(data)
    } catch (err) {
      console.error('Failed to load claim', err)
    } finally {
      setLoading(false)
    }
  }

  const verifySHAMember = async (patientId) => {
    const patient = patients.find(p => p.id === parseInt(patientId))
    if (!patient) return
    
    setSelectedPatient(patient)
    try {
      // Check if patient has SHA member record
      const members = await shaAPI.members.list({ patient: patientId })
      if (members.length > 0) {
        setShaMember(members[0])
        // Verify with SHA API
        const verified = await shaAPI.members.verify(members[0].id)
        setShaMember(verified)
      } else {
        setShaMember(null)
      }
      setShowVerifyModal(true)
    } catch (err) {
      console.error('Failed to verify SHA member', err)
      alert(err.message || 'Failed to verify SHA membership')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setProcessing(true)
    try {
      await shaAPI.claims.create(formData)
      setShowModal(false)
      setFormData({
        sha_member: '', consultation: '', claim_type: 'OUTPATIENT',
        service_date: new Date().toISOString().split('T')[0],
        claimed_amount: '', notes: ''
      })
      loadData()
    } catch (err) {
      console.error('Failed to create claim', err)
      alert(err.message || 'Failed to create SHA claim')
    } finally {
      setProcessing(false)
    }
  }

  const handleSubmitClaim = async () => {
    if (!selectedClaim) return
    setProcessing(true)
    try {
      await shaAPI.claims.submit(selectedClaim.id)
      navigate('/insurance/sha')
    } catch (err) {
      console.error('Failed to submit claim', err)
      alert(err.message || 'Failed to submit claim to SHA')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge-neutral',
      SUBMITTED: 'badge-info',
      PENDING: 'badge-warning',
      APPROVED: 'badge-success',
      PARTIALLY_APPROVED: 'badge-warning',
      REJECTED: 'badge-danger',
      PAID: 'badge-success'
    }
    return badges[status] || 'badge-neutral'
  }

  const formatCurrency = (amount) => {
    return `KES ${parseFloat(amount || 0).toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading SHA claims...</span>
        </div>
      </div>
    )
  }

  if (selectedClaim) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">SHA Claim Details</h1>
            <p className="page-subtitle">{selectedClaim.claim_number}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/insurance/sha')}>
            <i className="bi bi-arrow-left"></i> Back to List
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Status</div>
                <div className="info-value">
                  <span className={`badge ${getStatusBadge(selectedClaim.status)}`}>
                    {selectedClaim.status}
                  </span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">SHA Reference</div>
                <div className="info-value">{selectedClaim.sha_reference || 'Pending'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Patient</div>
                <div className="info-value">{selectedClaim.patient_name}</div>
              </div>
              <div className="info-item">
                <div className="info-label">SHA Number</div>
                <div className="info-value">{selectedClaim.sha_number}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Claim Type</div>
                <div className="info-value">{selectedClaim.claim_type_display}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Service Date</div>
                <div className="info-value">{new Date(selectedClaim.service_date).toLocaleDateString()}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Claimed Amount</div>
                <div className="info-value">{formatCurrency(selectedClaim.claimed_amount)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Approved Amount</div>
                <div className="info-value">{formatCurrency(selectedClaim.approved_amount)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Patient Copay</div>
                <div className="info-value">{formatCurrency(selectedClaim.patient_copay)}</div>
              </div>
            </div>
            
            {selectedClaim.notes && (
              <>
                <div className="divider"></div>
                <div className="info-item">
                  <div className="info-label">Notes</div>
                  <div className="info-value">{selectedClaim.notes}</div>
                </div>
              </>
            )}

            {selectedClaim.rejection_reason && (
              <>
                <div className="divider"></div>
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span><strong>Rejection Reason:</strong> {selectedClaim.rejection_reason}</span>
                </div>
              </>
            )}

            {selectedClaim.submission_response && (
              <>
                <div className="divider"></div>
                <div className="info-item">
                  <div className="info-label">SHA Response</div>
                  <pre className="font-mono text-sm" style={{ background: 'var(--bg)', padding: 12, borderRadius: 8 }}>
                    {JSON.stringify(selectedClaim.submission_response, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>

        {selectedClaim.status === 'DRAFT' && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSubmitClaim} disabled={processing}>
              {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Submitting...</> : 'Submit to SHA'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">SHA Claims</h1>
          <p className="page-subtitle">Social Health Authority claims management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New SHA Claim
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {claims.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-shield" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No SHA claims found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Claim #</th>
                    <th>Patient</th>
                    <th>SHA Number</th>
                    <th>Type</th>
                    <th>Claimed</th>
                    <th>Approved</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id}>
                      <td>{claim.claim_number}</td>
                      <td>{claim.patient_name}</td>
                      <td>{claim.sha_number}</td>
                      <td>{claim.claim_type_display}</td>
                      <td>{formatCurrency(claim.claimed_amount)}</td>
                      <td>{formatCurrency(claim.approved_amount)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(claim.status)}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td>{claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString() : '-'}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => navigate(`/insurance/sha/${claim.id}`)}
                        >
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

      {/* Create SHA Claim Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create SHA Claim</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Patient</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select 
                        className="form-select" 
                        style={{ flex: 1 }}
                        required 
                        value={formData.sha_member} 
                        onChange={(e) => setFormData(prev => ({ ...prev, sha_member: e.target.value }))}
                      >
                        <option value="">Select patient...</option>
                        {shaMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.patient_name} - {m.sha_number} ({m.status})
                          </option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => {
                          const patientId = prompt('Enter patient ID to verify SHA status:')
                          if (patientId) verifySHAMember(patientId)
                        }}
                      >
                        <i className="bi bi-shield-check"></i> Verify
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Claim Type</label>
                    <select 
                      className="form-select" 
                      required 
                      value={formData.claim_type} 
                      onChange={(e) => setFormData(prev => ({ ...prev, claim_type: e.target.value }))}
                    >
                      <option value="OUTPATIENT">Outpatient</option>
                      <option value="INPATIENT">Inpatient</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="PHARMACY">Pharmacy</option>
                      <option value="LABORATORY">Laboratory</option>
                      <option value="RADIOLOGY">Radiology</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Consultation (Optional)</label>
                    <select 
                      className="form-select" 
                      value={formData.consultation} 
                      onChange={(e) => setFormData(prev => ({ ...prev, consultation: e.target.value }))}
                    >
                      <option value="">Select consultation...</option>
                      {consultations.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.consultation_code} - {c.patient_name} - {new Date(c.created_at).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Service Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required 
                      value={formData.service_date} 
                      onChange={(e) => setFormData(prev => ({ ...prev, service_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Claimed Amount (KES)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-input" 
                      required 
                      value={formData.claimed_amount} 
                      onChange={(e) => setFormData(prev => ({ ...prev, claimed_amount: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea 
                    className="form-textarea" 
                    rows="3" 
                    value={formData.notes} 
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes for SHA..."
                  />
                </div>

                <div className="alert alert-info">
                  <i className="bi bi-info-circle-fill"></i>
                  <span>
                    SHA claims are submitted electronically. Please ensure the patient's SHA membership is active 
                    and the service is covered under their package before submitting.
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={processing}>
                  {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Creating...</> : 'Create Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHA Member Verification Modal */}
      {showVerifyModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">SHA Member Verification</h3>
              <button className="modal-close" onClick={() => setShowVerifyModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Patient Name</div>
                  <div className="info-value">{selectedPatient.full_name}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Phone Number</div>
                  <div className="info-value">{selectedPatient.phone_number}</div>
                </div>
              </div>

              {shaMember ? (
                <>
                  <div className="divider"></div>
                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-label">SHA Number</div>
                      <div className="info-value">{shaMember.sha_number}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Package</div>
                      <div className="info-value">{shaMember.package_name}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Status</div>
                      <div className="info-value">
                        <span className={`badge ${shaMember.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {shaMember.status}
                        </span>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Enrollment Date</div>
                      <div className="info-value">{new Date(shaMember.enrollment_date).toLocaleDateString()}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Expiry Date</div>
                      <div className="info-value">{shaMember.expiry_date ? new Date(shaMember.expiry_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Annual Limit</div>
                      <div className="info-value">{formatCurrency(shaMember.annual_limit)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Used Amount</div>
                      <div className="info-value">{formatCurrency(shaMember.used_amount)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Available Balance</div>
                      <div className="info-value">
                        <strong className="text-success">{formatCurrency(shaMember.available_balance)}</strong>
                      </div>
                    </div>
                  </div>
                  
                  {!shaMember.is_valid && (
                    <div className="alert alert-warning" style={{ marginTop: 16 }}>
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <span>SHA membership is not active or has expired. Please update the member's status.</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="alert alert-warning" style={{ marginTop: 16 }}>
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>No SHA membership record found for this patient. Please register the patient as an SHA member first.</span>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ marginLeft: 16 }}
                    onClick={() => {
                      setShowVerifyModal(false)
                      // Navigate to SHA member registration
                      alert('SHA member registration would open here')
                    }}
                  >
                    Register SHA Member
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowVerifyModal(false)}>Close</button>
              {shaMember && shaMember.is_valid && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setShowVerifyModal(false)
                    setFormData(prev => ({ ...prev, sha_member: shaMember.id }))
                  }}
                >
                  Use This Member
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}