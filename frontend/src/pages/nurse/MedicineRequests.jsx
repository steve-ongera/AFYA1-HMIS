// pages/nurse/MedicineRequests.jsx
import React, { useState, useEffect } from 'react'
import { medicineRequestsAPI, admissionsAPI, medicinesAPI } from '../../services/api'

export default function MedicineRequests() {
  const [requests, setRequests] = useState([])
  const [admissions, setAdmissions] = useState([])
  const [medicines, setMedicines] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    admission: '',
    medicine: '',
    quantity_requested: '',
    dosage: '',
    route: 'Oral',
    frequency: '',
    priority: 'ROUTINE',
    clinical_notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [requestsData, admissionsData, medicinesData] = await Promise.all([
        medicineRequestsAPI.list(),
        admissionsAPI.active(),
        medicinesAPI.list()
      ])
      setRequests(requestsData)
      setAdmissions(admissionsData)
      setMedicines(medicinesData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await medicineRequestsAPI.create(formData)
      setShowModal(false)
      setFormData({ admission: '', medicine: '', quantity_requested: '', dosage: '', route: 'Oral', frequency: '', priority: 'ROUTINE', clinical_notes: '' })
      loadData()
    } catch (err) {
      console.error('Failed to create request', err)
      alert(err.message || 'Failed to create medicine request')
    }
  }

  const getPriorityBadge = (priority) => {
    const badges = { ROUTINE: 'badge-neutral', URGENT: 'badge-warning', EMERGENCY: 'badge-danger' }
    return badges[priority] || 'badge-neutral'
  }

  const getStatusBadge = (status) => {
    const badges = { PENDING: 'badge-warning', APPROVED: 'badge-info', DISPENSED: 'badge-success', REJECTED: 'badge-danger' }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading medicine requests...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Medicine Requests</h1>
          <p className="page-subtitle">Request medications for inpatient care</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New Request
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Active Requests</h3>
        </div>
        <div className="card-body">
          {requests.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-capsule" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No medicine requests found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Request #</th><th>Patient</th><th>Medicine</th><th>Quantity</th><th>Priority</th><th>Status</th><th>Requested</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td>{req.request_number}</td>
                      <td>{req.admission?.patient_name}</td>
                      <td>{req.medicine_info?.name}</td>
                      <td>{req.quantity_requested}</td>
                      <td><span className={`badge ${getPriorityBadge(req.priority)}`}>{req.priority_display}</span></td>
                      <td><span className={`badge ${getStatusBadge(req.status)}`}>{req.status_display}</span></td>
                      <td>{new Date(req.requested_at).toLocaleString()}</td>
                      <td>
                        {req.status === 'DISPENSED' && (
                          <span className="badge badge-success">Dispensed: {req.quantity_approved || req.quantity_requested}</span>
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

      {/* New Request Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Medicine Request</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Patient</label>
                    <select className="form-select" required value={formData.admission} onChange={(e) => setFormData(prev => ({ ...prev, admission: e.target.value }))}>
                      <option value="">Select inpatient...</option>
                      {admissions.map(a => <option key={a.id} value={a.id}>{a.patient_name} ({a.admission_number})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Medicine</label>
                    <select className="form-select" required value={formData.medicine} onChange={(e) => setFormData(prev => ({ ...prev, medicine: e.target.value }))}>
                      <option value="">Select medicine...</option>
                      {medicines.map(m => <option key={m.id} value={m.id}>{m.name} (Stock: {m.quantity_in_stock})</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Quantity</label>
                    <input type="number" className="form-input" required value={formData.quantity_requested} onChange={(e) => setFormData(prev => ({ ...prev, quantity_requested: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Priority</label>
                    <select className="form-select" required value={formData.priority} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}>
                      <option value="ROUTINE">Routine</option>
                      <option value="URGENT">Urgent</option>
                      <option value="EMERGENCY">Emergency STAT</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Dosage</label>
                    <input type="text" className="form-input" required value={formData.dosage} onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))} placeholder="e.g., 500mg" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Route</label>
                    <select className="form-select" value={formData.route} onChange={(e) => setFormData(prev => ({ ...prev, route: e.target.value }))}>
                      <option value="Oral">Oral</option><option value="IV">IV</option><option value="IM">IM</option><option value="SC">SC</option><option value="Topical">Topical</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <input type="text" className="form-input" value={formData.frequency} onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))} placeholder="e.g., Twice daily, Every 6 hours" />
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Notes</label>
                  <textarea className="form-textarea" rows="3" value={formData.clinical_notes} onChange={(e) => setFormData(prev => ({ ...prev, clinical_notes: e.target.value }))} placeholder="Reason for request, patient condition, etc."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}