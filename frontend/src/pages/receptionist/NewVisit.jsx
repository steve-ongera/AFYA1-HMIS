// pages/receptionist/NewVisit.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { visitsAPI, patientsAPI, doctorsAPI, lookupsAPI } from '../../services/api'

export default function NewVisit() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const patientId = queryParams.get('patient')
  
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [patientSearchResults, setPatientSearchResults] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [services, setServices] = useState([])
  const [formData, setFormData] = useState({
    patient: patientId || '',
    visit_type: 'OUTPATIENT',
    chief_complaint: '',
    assigned_doctor: '',
    specialized_service: '',
    insurance_provider: '',
    referral_from: '',
    notes: ''
  })

  useEffect(() => {
    loadDoctors()
    loadServices()
    if (patientId) {
      loadPatient(patientId)
    }
  }, [patientId])

  const loadDoctors = async () => {
    try {
      const data = await doctorsAPI.list({ is_active: true })
      setDoctors(data)
    } catch (err) {
      console.error('Failed to load doctors', err)
    }
  }

  const loadServices = async () => {
    try {
      const data = await lookupsAPI.specializedServices()
      setServices(data)
    } catch (err) {
      console.error('Failed to load services', err)
    }
  }

  const loadPatient = async (id) => {
    try {
      const data = await patientsAPI.get(id)
      setSelectedPatient(data)
    } catch (err) {
      console.error('Failed to load patient', err)
    }
  }

  const searchPatients = async () => {
    if (searchTerm.length < 2) return
    try {
      const data = await patientsAPI.list({ search: searchTerm })
      setPatientSearchResults(data)
    } catch (err) {
      console.error('Search failed', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPatient) {
      alert('Please select a patient')
      return
    }
    
    setLoading(true)
    try {
      const visit = await visitsAPI.create({
        ...formData,
        patient: selectedPatient.id
      })
      navigate(`/shared/visit/${visit.id}`)
    } catch (err) {
      console.error('Failed to create visit', err)
      alert(err.message || 'Failed to create visit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">New Patient Visit</h1>
          <p className="page-subtitle">Register a new visit for a patient</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Patient Selection</h3>
          </div>
          <div className="card-body">
            {!selectedPatient ? (
              <>
                <div className="search-wrapper">
                  <i className="bi bi-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by name, phone number, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchPatients())}
                  />
                </div>
                {patientSearchResults.length > 0 && (
                  <div className="table-wrapper" style={{ marginTop: 16 }}>
                    <table className="table">
                      <thead>
                        <tr><th>Name</th><th>Phone</th><th>ID</th><th></th></tr>
                      </thead>
                      <tbody>
                        {patientSearchResults.map(p => (
                          <tr key={p.id}>
                            <td>{p.full_name}</td>
                            <td>{p.phone_number}</td>
                            <td>{p.id_number || 'N/A'}</td>
                            <td>
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => setSelectedPatient(p)}>
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="info-grid">
                <div className="info-item"><div className="info-label">Patient</div><div className="info-value">{selectedPatient.full_name}</div></div>
                <div className="info-item"><div className="info-label">Phone</div><div className="info-value">{selectedPatient.phone_number}</div></div>
                <div className="info-item"><div className="info-label">Age</div><div className="info-value">{selectedPatient.age}</div></div>
                <div className="info-item"><div className="info-label">Gender</div><div className="info-value">{selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : 'Other'}</div></div>
                <div className="info-item"><div className="info-label">
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedPatient(null)}>
                    <i className="bi bi-arrow-left"></i> Change Patient
                  </button>
                </div></div>
              </div>
            )}
          </div>
        </div>

        {selectedPatient && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Visit Details</h3>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Visit Type</label>
                  <select name="visit_type" className="form-select" value={formData.visit_type} onChange={(e) => setFormData(prev => ({ ...prev, visit_type: e.target.value }))}>
                    <option value="OUTPATIENT">Outpatient</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="ANTENATAL">Antenatal</option>
                    <option value="IMMUNIZATION">Immunization</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Doctor</label>
                  <select name="assigned_doctor" className="form-select" value={formData.assigned_doctor} onChange={(e) => setFormData(prev => ({ ...prev, assigned_doctor: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Specialized Service</label>
                  <select name="specialized_service" className="form-select" value={formData.specialized_service} onChange={(e) => setFormData(prev => ({ ...prev, specialized_service: e.target.value }))}>
                    <option value="">None</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} (KES {s.consultation_fee})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Insurance Provider</label>
                  <input type="text" name="insurance_provider" className="form-input" value={formData.insurance_provider} onChange={(e) => setFormData(prev => ({ ...prev, insurance_provider: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Chief Complaint</label>
                <textarea name="chief_complaint" className="form-textarea" rows="3" value={formData.chief_complaint} onChange={(e) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))} placeholder="Describe the patient's main symptoms or reason for visit"></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Referral From</label>
                <input type="text" name="referral_from" className="form-input" value={formData.referral_from} onChange={(e) => setFormData(prev => ({ ...prev, referral_from: e.target.value }))} placeholder="If referred, specify facility" />
              </div>

              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea name="notes" className="form-textarea" rows="2" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}></textarea>
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Creating...</> : 'Create Visit'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}