// pages/receptionist/NewVisit.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { visitsAPI, patientsAPI, doctorsAPI, lookupsAPI } from '../../services/api'

export default function NewVisit() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const patientId = new URLSearchParams(location.search).get('patient')

  const [loading, setLoading]                           = useState(false)
  const [searchTerm, setSearchTerm]                     = useState('')
  const [patientSearchResults, setPatientSearchResults] = useState([])
  const [selectedPatient, setSelectedPatient]           = useState(null)
  const [doctors, setDoctors]                           = useState([])
  const [services, setServices]                         = useState([])
  const [insuranceProviders, setInsuranceProviders]     = useState([])  // ✅
  const [formData, setFormData] = useState({
    visit_type:           'OUTPATIENT',
    chief_complaint:      '',
    assigned_doctor:      '',
    specialized_service:  '',
    insurance_provider:   '',   // will hold PK as string from select
    referral_from:        '',
    notes:                '',
  })

  useEffect(() => {
    loadDoctors()
    loadServices()
    loadInsuranceProviders()
    if (patientId) loadPatient(patientId)
  }, [patientId])

  const loadDoctors = async () => {
    try {
      const res = await doctorsAPI.list({ is_active: true })
      setDoctors(Array.isArray(res) ? res : (res.results ?? []))
    } catch (err) {
      console.error('Failed to load doctors', err)
    }
  }

  const loadServices = async () => {
    try {
      const res = await lookupsAPI.specializedServices()
      setServices(Array.isArray(res) ? res : (res.results ?? []))
    } catch (err) {
      console.error('Failed to load services', err)
    }
  }

  const loadInsuranceProviders = async () => {
    try {
      const res = await lookupsAPI.insuranceProviders()
      setInsuranceProviders(Array.isArray(res) ? res : (res.results ?? []))
    } catch (err) {
      console.error('Failed to load insurance providers', err)
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
    if (searchTerm.trim().length < 2) {
      alert('Please enter at least 2 characters to search')
      return
    }
    setLoading(true)
    try {
      const res = await patientsAPI.list({ search: searchTerm.trim() })
      const patients = Array.isArray(res) ? res : (res.results ?? [])
      setPatientSearchResults(patients)
      if (patients.length === 0) alert('No patients found matching your search')
    } catch (err) {
      console.error('Search failed', err)
      alert('Failed to search patients')
    } finally {
      setLoading(false)
    }
  }

  const setField = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPatient) { alert('Please select a patient'); return }
    if (!formData.chief_complaint.trim()) { alert('Please enter the chief complaint'); return }

    setLoading(true)
    try {
      const visitData = {
        patient:             parseInt(selectedPatient.id),
        visit_type:          formData.visit_type,
        chief_complaint:     formData.chief_complaint.trim(),
        assigned_doctor:     formData.assigned_doctor     ? parseInt(formData.assigned_doctor)     : null,
        specialized_service: formData.specialized_service ? parseInt(formData.specialized_service) : null,
        insurance_provider:  formData.insurance_provider  ? parseInt(formData.insurance_provider)  : null, // ✅ FK int
        referral_from:       formData.referral_from        || null,
        notes:               formData.notes                || null,
      }

      console.log('Sending visit data:', visitData)
      const visit = await visitsAPI.create(visitData)
      navigate(`/shared/visit/${visit.id}`)
    } catch (err) {
      console.error('Failed to create visit:', err)
      const d = err.response?.data
      const message = d
        ? (typeof d === 'object'
            ? Object.entries(d).map(([k, v]) => `${k}: ${[v].flat().join(', ')}`).join('\n')
            : String(d))
        : (err.message || 'Failed to create visit')
      alert(message)
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

        {/* ── Patient Selection ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Patient Selection</h3>
          </div>
          <div className="card-body">
            {!selectedPatient ? (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <i className="bi bi-search search-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search by name, phone number, or ID…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchPatients())}
                    />
                  </div>
                  <button type="button" className="btn btn-primary" onClick={searchPatients} disabled={loading}>
                    {loading
                      ? <span className="spinner" style={{ width: 16, height: 16 }} />
                      : <><i className="bi bi-search" /> Search</>}
                  </button>
                </div>

                {patientSearchResults.length > 0 && (
                  <div className="table-wrapper" style={{ marginTop: 16 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th><th>Phone</th><th>ID Number</th>
                          <th>Age</th><th>Gender</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientSearchResults.map(p => (
                          <tr key={p.id}>
                            <td><strong>{p.full_name || `${p.first_name} ${p.last_name}`}</strong></td>
                            <td>{p.phone_number || '—'}</td>
                            <td>{p.id_number || 'N/A'}</td>
                            <td>{p.age ?? '—'}</td>
                            <td>{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => {
                                  setSelectedPatient(p)
                                  setPatientSearchResults([])
                                  setSearchTerm('')
                                }}
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
                  <div className="info-value"><strong>{selectedPatient.full_name}</strong></div>
                </div>
                <div className="info-item">
                  <div className="info-label">Phone</div>
                  <div className="info-value">{selectedPatient.phone_number || '—'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Age</div>
                  <div className="info-value">{selectedPatient.age ?? '—'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Gender</div>
                  <div className="info-value">
                    {selectedPatient.gender === 'M' ? 'Male'
                      : selectedPatient.gender === 'F' ? 'Female' : 'Other'}
                  </div>
                </div>
                <div className="info-item">
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedPatient(null)}>
                    <i className="bi bi-arrow-left" /> Change Patient
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Visit Details ── */}
        {selectedPatient && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Visit Details</h3>
            </div>
            <div className="card-body">

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Visit Type</label>
                  <select className="form-select" value={formData.visit_type} onChange={(e) => setField('visit_type', e.target.value)}>
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
                  <select className="form-select" value={formData.assigned_doctor} onChange={(e) => setField('assigned_doctor', e.target.value)}>
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
                  <select className="form-select" value={formData.specialized_service} onChange={(e) => setField('specialized_service', e.target.value)}>
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
                  {/* ✅ FK select — sends integer PK not string */}
                  <select className="form-select" value={formData.insurance_provider} onChange={(e) => setField('insurance_provider', e.target.value)}>
                    <option value="">None / Cash</option>
                    {insuranceProviders.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Chief Complaint</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  value={formData.chief_complaint}
                  onChange={(e) => setField('chief_complaint', e.target.value)}
                  placeholder="Describe the patient's main symptoms or reason for visit"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Referral From</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.referral_from}
                  onChange={(e) => setField('referral_from', e.target.value)}
                  placeholder="If referred, specify facility"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Any additional information"
                />
              </div>

            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading
                  ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating…</>
                  : <><i className="bi bi-plus-circle" /> Create Visit</>}
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  )
}