// pages/nurse/MCHPage.jsx
import React, { useState, useEffect } from 'react'
import { mchAPI, visitsAPI, patientsAPI } from '../../services/api'

export default function MCHPage() {
  const [mchVisits, setMchVisits] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    visit_type: 'IMMUNIZATION',
    child_age_months: '',
    weight_kg: '',
    height_cm: '',
    temperature: '',
    immunization_due: false,
    vaccines_to_administer: '',
    has_danger_signs: false,
    danger_signs: '',
    needs_doctor_consultation: false,
    consultation_reason: '',
    mothers_name: '',
    mothers_phone: '',
    assessment_notes: ''
  })

  useEffect(() => {
    loadMCHVisits()
  }, [])

  const loadMCHVisits = async () => {
    try {
      const data = await mchAPI.list()
      setMchVisits(data)
    } catch (err) {
      console.error('Failed to load MCH visits', err)
    } finally {
      setLoading(false)
    }
  }

  const searchPatients = async () => {
    if (patientSearch.length < 2) return
    try {
      const data = await patientsAPI.list({ search: patientSearch })
      setSearchResults(data)
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
    
    try {
      const visit = await visitsAPI.create({
        patient: selectedPatient.id,
        visit_type: 'IMMUNIZATION',
        chief_complaint: `MCH visit - ${formData.visit_type}`,
        notes: formData.assessment_notes
      })
      
      await mchAPI.create({
        ...formData,
        visit: visit.id
      })
      
      setShowModal(false)
      setSelectedPatient(null)
      setFormData({
        visit_type: 'IMMUNIZATION', child_age_months: '', weight_kg: '', height_cm: '', temperature: '',
        immunization_due: false, vaccines_to_administer: '', has_danger_signs: false, danger_signs: '',
        needs_doctor_consultation: false, consultation_reason: '', mothers_name: '', mothers_phone: '', assessment_notes: ''
      })
      loadMCHVisits()
    } catch (err) {
      console.error('Failed to create MCH visit', err)
      alert(err.message || 'Failed to create MCH visit')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading MCH data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">MCH Clinic</h1>
          <p className="page-subtitle">Maternal and Child Health Services</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New MCH Visit
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent MCH Visits</h3>
        </div>
        <div className="card-body">
          {mchVisits.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-heart-half" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No MCH visits recorded</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Patient</th><th>Visit Type</th><th>Age (months)</th><th>Weight</th><th>Immunization</th><th>Doctor Needed</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {mchVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.patient_name}</td>
                      <td><span className="badge badge-info">{visit.visit_type_display}</span></td>
                      <td>{visit.child_age_months} months</td>
                      <td>{visit.weight_kg ? `${visit.weight_kg} kg` : '-'}</td>
                      <td>{visit.immunization_due ? <span className="badge badge-warning">Due</span> : <span className="badge badge-success">Up to date</span>}</td>
                      <td>{visit.needs_doctor_consultation ? <span className="badge badge-danger">Yes</span> : <span className="badge badge-neutral">No</span>}</td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => window.location.href = `/shared/visit/${visit.visit}`}>
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

      {/* New MCH Visit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New MCH Visit</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!selectedPatient ? (
                  <>
                    <div className="search-wrapper">
                      <i className="bi bi-search search-icon"></i>
                      <input type="text" className="form-input" placeholder="Search child patient..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchPatients())} />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="table-wrapper" style={{ marginTop: 16 }}>
                        <table className="table">
                          <thead><tr><th>Name</th><th>Phone</th><th>Age</th><th></th></tr></thead>
                          <tbody>
                            {searchResults.map(p => (
                              <tr key={p.id}><td>{p.full_name}</td><td>{p.phone_number}</td><td>{p.age}</td><td><button type="button" className="btn btn-sm btn-primary" onClick={() => setSelectedPatient(p)}>Select</button></td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="alert alert-info" style={{ marginBottom: 16 }}>
                      <i className="bi bi-person-circle"></i>
                      <span>Patient: {selectedPatient.full_name} | Age: {selectedPatient.age} | Phone: {selectedPatient.phone_number}</span>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedPatient(null)} style={{ marginLeft: 'auto' }}>Change</button>
                    </div>

                    <div className="form-row">
                      <div className="form-group"><label className="form-label required">Visit Type</label>
                        <select className="form-select" required value={formData.visit_type} onChange={(e) => setFormData(prev => ({ ...prev, visit_type: e.target.value }))}>
                          <option value="IMMUNIZATION">Immunization</option><option value="GROWTH_MONITORING">Growth Monitoring</option>
                          <option value="SICK_CHILD">Sick Child</option><option value="NUTRITION">Nutrition</option><option value="DEVELOPMENTAL">Developmental Assessment</option>
                        </select>
                      </div>
                      <div className="form-group"><label className="form-label required">Child Age (months)</label><input type="number" className="form-input" required value={formData.child_age_months} onChange={(e) => setFormData(prev => ({ ...prev, child_age_months: e.target.value }))} /></div>
                    </div>

                    <div className="form-row">
                      <div className="form-group"><label>Weight (kg)</label><input type="number" step="0.1" className="form-input" value={formData.weight_kg} onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))} /></div>
                      <div className="form-group"><label>Height (cm)</label><input type="number" step="0.1" className="form-input" value={formData.height_cm} onChange={(e) => setFormData(prev => ({ ...prev, height_cm: e.target.value }))} /></div>
                      <div className="form-group"><label>Temperature (°C)</label><input type="number" step="0.1" className="form-input" value={formData.temperature} onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))} /></div>
                    </div>

                    <div className="form-group">
                      <label className="form-checkbox">
                        <input type="checkbox" checked={formData.immunization_due} onChange={(e) => setFormData(prev => ({ ...prev, immunization_due: e.target.checked }))} />
                        Immunization Due
                      </label>
                    </div>

                    {formData.immunization_due && (
                      <div className="form-group">
                        <label className="form-label">Vaccines to Administer</label>
                        <textarea className="form-textarea" rows="2" value={formData.vaccines_to_administer} onChange={(e) => setFormData(prev => ({ ...prev, vaccines_to_administer: e.target.value }))} placeholder="BCG, Polio, DPT, etc."></textarea>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-checkbox">
                        <input type="checkbox" checked={formData.has_danger_signs} onChange={(e) => setFormData(prev => ({ ...prev, has_danger_signs: e.target.checked }))} />
                        Child has Danger Signs
                      </label>
                    </div>

                    {formData.has_danger_signs && (
                      <div className="form-group">
                        <label className="form-label">Danger Signs</label>
                        <textarea className="form-textarea" rows="2" value={formData.danger_signs} onChange={(e) => setFormData(prev => ({ ...prev, danger_signs: e.target.value }))} placeholder="Convulsions, difficulty breathing, unconsciousness, etc."></textarea>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-checkbox">
                        <input type="checkbox" checked={formData.needs_doctor_consultation} onChange={(e) => setFormData(prev => ({ ...prev, needs_doctor_consultation: e.target.checked }))} />
                        Needs Doctor Consultation
                      </label>
                    </div>

                    {formData.needs_doctor_consultation && (
                      <div className="form-group">
                        <label className="form-label">Consultation Reason</label>
                        <textarea className="form-textarea" rows="2" value={formData.consultation_reason} onChange={(e) => setFormData(prev => ({ ...prev, consultation_reason: e.target.value }))}></textarea>
                      </div>
                    )}

                    <div className="form-row">
                      <div className="form-group"><label className="form-label required">Mother's Name</label><input type="text" className="form-input" required value={formData.mothers_name} onChange={(e) => setFormData(prev => ({ ...prev, mothers_name: e.target.value }))} /></div>
                      <div className="form-group"><label className="form-label required">Mother's Phone</label><input type="tel" className="form-input" required value={formData.mothers_phone} onChange={(e) => setFormData(prev => ({ ...prev, mothers_phone: e.target.value }))} /></div>
                    </div>

                    <div className="form-group">
                      <label className="form-label required">Assessment Notes</label>
                      <textarea className="form-textarea" rows="3" required value={formData.assessment_notes} onChange={(e) => setFormData(prev => ({ ...prev, assessment_notes: e.target.value }))}></textarea>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!selectedPatient}>Create MCH Visit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}