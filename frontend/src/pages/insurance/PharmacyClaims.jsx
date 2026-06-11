// pages/insurance/PharmacyClaims.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pharmacyClaimsAPI, prescriptionsAPI, insuranceProvidersAPI } from '../../services/api'

export default function PharmacyClaims() {
  const navigate = useNavigate()
  const [claims, setClaims] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [formData, setFormData] = useState({
    prescription: '',
    insurance_provider: '',
    member_number: '',
    member_name: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [claimsData, rxData, providersData] = await Promise.all([
        pharmacyClaimsAPI.list(),
        prescriptionsAPI.list({ is_insured: true, is_dispensed: false }),
        insuranceProvidersAPI.list()
      ])
      setClaims(claimsData)
      setPrescriptions(rxData)
      setProviders(providersData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!selectedPrescription) return
    
    try {
      await pharmacyClaimsAPI.create({
        ...formData,
        prescription: selectedPrescription.id,
        total_amount: selectedPrescription.total_price,
        items_breakdown: [{ medicine: selectedPrescription.medicine_info?.name, quantity: selectedPrescription.quantity, price: selectedPrescription.unit_price }]
      })
      setShowModal(false)
      setSelectedPrescription(null)
      setFormData({ prescription: '', insurance_provider: '', member_number: '', member_name: '' })
      loadData()
    } catch (err) {
      console.error('Failed to create claim', err)
      alert(err.message || 'Failed to create claim')
    }
  }

  const handleApprove = async (id) => {
    try {
      await pharmacyClaimsAPI.approve(id)
      loadData()
    } catch (err) {
      console.error('Failed to approve claim', err)
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
          <span>Loading pharmacy claims...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Pharmacy Insurance Claims</h1>
          <p className="page-subtitle">Process medication insurance claims</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> Submit Claim
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {claims.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-capsule" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No pharmacy claims found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Claim #</th><th>Patient</th><th>Member</th><th>Amount</th><th>Provider</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id}>
                      <td>{claim.claim_number}</td>
                      <td>{claim.patient_name}</td>
                      <td>{claim.member_name}</td>
                      <td>KES {claim.total_amount}</td>
                      <td>{claim.provider_name}</td>
                      <td><span className={`badge ${getStatusBadge(claim.status)}`}>{claim.status}</span></td>
                      <td>
                        {claim.status === 'PENDING' && (
                          <button className="btn btn-sm btn-success" onClick={() => handleApprove(claim.id)}>Approve</button>
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

      {/* Submit Claim Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Submit Pharmacy Claim</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Prescription</label>
                  <select className="form-select" required value={selectedPrescription?.id || ''} onChange={(e) => {
                    const rx = prescriptions.find(p => p.id === parseInt(e.target.value))
                    setSelectedPrescription(rx)
                  }}>
                    <option value="">Select prescription...</option>
                    {prescriptions.map(rx => (
                      <option key={rx.id} value={rx.id}>
                        {rx.patient_name} - {rx.medicine_info?.name} - KES {rx.total_price}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPrescription && (
                  <div className="alert alert-info">
                    <div>Medicine: {selectedPrescription.medicine_info?.name}</div>
                    <div>Quantity: {selectedPrescription.quantity}</div>
                    <div>Total: KES {selectedPrescription.total_price}</div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label required">Insurance Provider</label>
                  <select className="form-select" required value={formData.insurance_provider} onChange={(e) => setFormData(prev => ({ ...prev, insurance_provider: e.target.value }))}>
                    <option value="">Select provider...</option>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Member Number</label>
                  <input type="text" className="form-input" required value={formData.member_number} onChange={(e) => setFormData(prev => ({ ...prev, member_number: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Member Name</label>
                  <input type="text" className="form-input" required value={formData.member_name} onChange={(e) => setFormData(prev => ({ ...prev, member_name: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!selectedPrescription}>Submit Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}