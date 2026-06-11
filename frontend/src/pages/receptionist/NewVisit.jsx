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
      const response = await doctorsAPI.list({ is_active: true })
      const doctorsList = response.results || response
      setDoctors(doctorsList)
      console.log('Doctors loaded:', doctorsList)
    } catch (err) {
      console.error('Failed to load doctors', err)
    }
  }

  const loadServices = async () => {
    try {
      const response = await lookupsAPI.specializedServices()
      const servicesList = response.results || response
      setServices(servicesList)
      console.log('Services loaded:', servicesList)
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
    if (searchTerm.length < 2) {
      alert('Please enter at least 2 characters to search')
      return
    }
    
    setLoading(true)
    try {
      const response = await patientsAPI.list({ search: searchTerm })
      const patients = response.results || response
      setPatientSearchResults(patients)
      
      if (!patients || patients.length === 0) {
        alert('No patients found matching your search')
      }
    } catch (err) {
      console.error('Search failed', err)
      alert('Failed to search patients')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedPatient) {
      alert('Please select a patient')
      return
    }
    
    if (!formData.chief_complaint.trim()) {
      alert('Please enter the chief complaint')
      return
    }
    
    setLoading(true)
    try {
      // 🔧 FIX: Convert empty strings to null and ensure integers for PK fields
      const visitData = {
        patient: selectedPatient.id,
        visit_type: formData.visit_type,
        chief_complaint: formData.chief_complaint,
        // For foreign keys: send null if empty string, otherwise convert to integer
        assigned_doctor: formData.assigned_doctor ? parseInt(formData.assigned_doctor) : null,
        specialized_service: formData.specialized_service ? parseInt(formData.specialized_service) : null,
        insurance_provider: formData.insurance_provider || null,
        referral_from: formData.referral_from || null,
        notes: formData.notes || null
      }
      
      console.log('Sending visit data:', visitData)
      const visit = await visitsAPI.create(visitData)
      console.log('Visit created:', visit)
      navigate(`/shared/visit/${visit.id}`)
    } catch (err) {
      console.error('Failed to create visit:', err)
      
      // Better error message from Django
      let errorMessage = 'Failed to create visit'
      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          errorMessage = Object.values(err.response.data).flat().join(', ')
        } else {
          errorMessage = err.response.data
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      alert(errorMessage)
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
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={searchPatients}
                    style={{ marginLeft: 8 }}
                    disabled={loading}
                  >
                    {loading ? <span className="spinner" style={{ width: 16, height: 16 }}></span> : 'Search'}
                  </button>
                </div>
                
                {patientSearchResults.length > 0 && (
                  <div className="table-wrapper" style={{ marginTop: 16 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>ID Number</th>
                          <th>Age</th>
                          <th>Gender</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientSearchResults.map(p => (
                          <tr key={p.id}>
                            <td>{p.full_name || `${p.first_name} ${p.last_name}`}</td>
                            <td>{p.phone_number}</td>
                            <td>{p.id_number || 'N/A'}</td>
                            <td>{p.age || '-'}</td>
                            <td>{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}</td>
                            <td>
                              <button 
                                type="button" 
                                className="btn btn-sm btn-primary" 
                                onClick={() => setSelectedPatient(p)}
                              >
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
                <div className="info-item">
                  <div className="info-label">Patient</div>
                  <div className="info-value">{selectedPatient.full_name}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Phone</div>
                  <div className="info-value">{selectedPatient.phone_number}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Age</div>
                  <div className="info-value">{selectedPatient.age}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Gender</div>
                  <div className="info-value">{selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : 'Other'}</div>
                </div>
                <div className="info-item">
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedPatient(null)}>
                    <i className="bi bi-arrow-left"></i> Change Patient
                  </button>
                </div>
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
                  <select 
                    name="visit_type" 
                    className="form-select" 
                    value={formData.visit_type} 
                    onChange={(e) => setFormData(prev => ({ ...prev, visit_type: e.target.value }))}
                  >
                    <option value="OUTPATIENT">Outpatient</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="ANTENATAL">Antenatal</option>
                    <option value="IMMUNIZATION">Immunization</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Doctor</label>
                  <select 
                    name="assigned_doctor" 
                    className="form-select" 
                    value={formData.assigned_doctor} 
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_doctor: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.full_name || `${d.first_name} ${d.last_name}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Specialized Service</label>
                  <select 
                    name="specialized_service" 
                    className="form-select" 
                    value={formData.specialized_service} 
                    onChange={(e) => setFormData(prev => ({ ...prev, specialized_service: e.target.value }))}
                  >
                    <option value="">None</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (KES {s.consultation_fee})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Insurance Provider</label>
                  <input 
                    type="text" 
                    name="insurance_provider" 
                    className="form-input" 
                    value={formData.insurance_provider} 
                    onChange={(e) => setFormData(prev => ({ ...prev, insurance_provider: e.target.value }))}
                    placeholder="e.g., NHIF, AAR, Jubilee"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Chief Complaint</label>
                <textarea 
                  name="chief_complaint" 
                  className="form-textarea" 
                  rows="3" 
                  required
                  value={formData.chief_complaint} 
                  onChange={(e) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))} 
                  placeholder="Describe the patient's main symptoms or reason for visit"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Referral From</label>
                <input 
                  type="text" 
                  name="referral_from" 
                  className="form-input" 
                  value={formData.referral_from} 
                  onChange={(e) => setFormData(prev => ({ ...prev, referral_from: e.target.value }))} 
                  placeholder="If referred, specify facility"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea 
                  name="notes" 
                  className="form-textarea" 
                  rows="2" 
                  value={formData.notes} 
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional information"
                />
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