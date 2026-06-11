// pages/nurse/MaternityPage.jsx
import React, { useState, useEffect } from 'react'
import { maternityAPI, visitsAPI, patientsAPI } from '../../services/api'

export default function MaternityPage() {
  const [maternityVisits, setMaternityVisits] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    visit_purpose: 'LABOR',
    gravida: '',
    para: '',
    abortion: '0',
    gestational_age_weeks: '',
    expected_delivery_date: '',
    is_in_labor: false,
    contractions_frequency: '',
    membranes_ruptured: false,
    cervical_dilation: '',
    fetal_heart_rate: '',
    is_high_risk: false,
    risk_factors: '',
    needs_csection: false,
    initial_assessment: ''
  })

  useEffect(() => {
    loadMaternityVisits()
  }, [])

  const loadMaternityVisits = async () => {
    try {
      const data = await maternityAPI.list()
      setMaternityVisits(data)
    } catch (err) {
      console.error('Failed to load maternity visits', err)
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
      // First create a visit
      const visit = await visitsAPI.create({
        patient: selectedPatient.id,
        visit_type: 'ANTENATAL',
        chief_complaint: `Maternity visit - ${formData.visit_purpose}`,
        notes: formData.initial_assessment
      })
      
      // Then create maternity record
      await maternityAPI.create({
        ...formData,
        visit: visit.id
      })
      
      setShowModal(false)
      setSelectedPatient(null)
      setFormData({
        visit_purpose: 'LABOR', gravida: '', para: '', abortion: '0', gestational_age_weeks: '',
        expected_delivery_date: '', is_in_labor: false, contractions_frequency: '', membranes_ruptured: false,
        cervical_dilation: '', fetal_heart_rate: '', is_high_risk: false, risk_factors: '',
        needs_csection: false, initial_assessment: ''
      })
      loadMaternityVisits()
    } catch (err) {
      console.error('Failed to create maternity visit', err)
      alert(err.message || 'Failed to create maternity visit')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading maternity data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Maternity Services</h1>
          <p className="page-subtitle">Labor & Delivery, Antenatal, Postnatal Care</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New Maternity Visit
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Active Maternity Cases</h3>
        </div>
        <div className="card-body">
          {maternityVisits.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-baby" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No active maternity visits</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Patient</th><th>Visit Type</th><th>Gravida/Para</th><th>Gestational Age</th><th>In Labor</th><th>High Risk</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {maternityVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.patient_name}</td>
                      <td><span className="badge badge-info">{visit.visit_purpose_display}</span></td>
                      <td>G{visit.gravida}P{visit.para}</td>
                      <td>{visit.gestational_age_weeks ? `${visit.gestational_age_weeks} weeks` : 'N/A'}</td>
                      <td>{visit.is_in_labor ? <span className="badge badge-danger">Yes</span> : <span className="badge badge-neutral">No</span>}</td>
                      <td>{visit.is_high_risk ? <span className="badge badge-warning">Yes</span> : <span className="badge badge-success">No</span>}</td>
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

      {/* New Maternity Visit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Maternity Visit</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!selectedPatient ? (
                  <>
                    <div className="search-wrapper">
                      <i className="bi bi-search search-icon"></i>
                      <input type="text" className="form-input" placeholder="Search patient by name, phone, or ID..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchPatients())} />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="table-wrapper" style={{ marginTop: 16 }}>
                        <table className="table">
                          <thead><tr><th>Name</th><th>Phone</th><th>Age</th><th></th></tr></thead>
                          <tbody>
                            {searchResults.map(p => (
                              <tr key={p.id}>
                                <td>{p.full_name}</td><td>{p.phone_number}</td><td>{p.age}</td>
                                <td><button type="button" className="btn btn-sm btn-primary" onClick={() => setSelectedPatient(p)}>Select</button></td>
                              </tr>
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
                      <div className="form-group">
                        <label className="form-label required">Visit Purpose</label>
                        <select className="form-select" required value={formData.visit_purpose} onChange={(e) => setFormData(prev => ({ ...prev, visit_purpose: e.target.value }))}>
                          <option value="LABOR">Labor & Delivery</option><option value="ANTENATAL">Antenatal</option><option value="POSTNATAL">Postnatal</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Gravida</label><input type="number" className="form-input" value={formData.gravida} onChange={(e) => setFormData(prev => ({ ...prev, gravida: e.target.value }))} /></div>
                      <div className="form-group"><label className="form-label">Para</label><input type="number" className="form-input" value={formData.para} onChange={(e) => setFormData(prev => ({ ...prev, para: e.target.value }))} /></div>
                      <div className="form-group"><label className="form-label">Abortions</label><input type="number" className="form-input" value={formData.abortion} onChange={(e) => setFormData(prev => ({ ...prev, abortion: e.target.value }))} /></div>
                    </div>

                    <div className="form-row">
                      <div className="form-group"><label>Gestational Age (weeks)</label><input type="number" className="form-input" value={formData.gestational_age_weeks} onChange={(e) => setFormData(prev => ({ ...prev, gestational_age_weeks: e.target.value }))} /></div>
                      <div className="form-group"><label>Expected Delivery Date</label><input type="date" className="form-input" value={formData.expected_delivery_date} onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))} /></div>
                    </div>

                    <div className="form-group">
                      <label className="form-checkbox">
                        <input type="checkbox" checked={formData.is_in_labor} onChange={(e) => setFormData(prev => ({ ...prev, is_in_labor: e.target.checked }))} />
                        In Labor
                      </label>
                    </div>

                    {formData.is_in_labor && (
                      <div className="form-row">
                        <div className="form-group"><label>Contractions Frequency</label><input type="text" className="form-input" value={formData.contractions_frequency} onChange={(e) => setFormData(prev => ({ ...prev, contractions_frequency: e.target.value }))} placeholder="e.g., Every 5 minutes" /></div>
                        <div className="form-group"><label>Cervical Dilation (cm)</label><input type="number" step="0.5" className="form-input" value={formData.cervical_dilation} onChange={(e) => setFormData(prev => ({ ...prev, cervical_dilation: e.target.value }))} /></div>
                        <div className="form-group"><label>Fetal Heart Rate</label><input type="number" className="form-input" value={formData.fetal_heart_rate} onChange={(e) => setFormData(prev => ({ ...prev, fetal_heart_rate: e.target.value }))} /></div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-checkbox">
                        <input type="checkbox" checked={formData.membranes_ruptured} onChange={(e) => setFormData(prev => ({ ...prev, membranes_ruptured: e.target.checked }))} />
                        Membranes Ruptured
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="form-checkbox">
                        <input type="checkbox" checked={formData.is_high_risk} onChange={(e) => setFormData(prev => ({ ...prev, is_high_risk: e.target.checked }))} />
                        High Risk Pregnancy
                      </label>
                    </div>

                    {formData.is_high_risk && (
                      <div className="form-group">
                        <label className="form-label">Risk Factors</label>
                        <textarea className="form-textarea" rows="2" value={formData.risk_factors} onChange={(e) => setFormData(prev => ({ ...prev, risk_factors: e.target.value }))}></textarea>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-checkbox">
                        <input type="checkbox" checked={formData.needs_csection} onChange={(e) => setFormData(prev => ({ ...prev, needs_csection: e.target.checked }))} />
                        Needs C-Section
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="form-label required">Initial Assessment</label>
                      <textarea className="form-textarea" rows="3" required value={formData.initial_assessment} onChange={(e) => setFormData(prev => ({ ...prev, initial_assessment: e.target.value }))}></textarea>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!selectedPatient}>Create Maternity Visit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}