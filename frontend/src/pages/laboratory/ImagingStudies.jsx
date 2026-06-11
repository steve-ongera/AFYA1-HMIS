// pages/laboratory/ImagingStudies.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { imagingAPI, patientsAPI } from '../../services/api'

export default function ImagingStudies() {
  const navigate = useNavigate()
  const [studies, setStudies] = useState([])
  const [patients, setPatients] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [formData, setFormData] = useState({
    patient: '',
    modality: 'XRAY',
    body_part: '',
    study_description: '',
    clinical_indication: '',
    is_urgent: false,
    contrast_used: false
  })
  const [selectedStudy, setSelectedStudy] = useState(null)
  const [reportData, setReportData] = useState({ findings: '', impression: '' })

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    try {
      let params = {}
      if (filter === 'pending') params.status = 'PENDING'
      else if (filter === 'completed') params.status = 'COMPLETED'
      else if (filter === 'reported') params.status = 'REPORTED'
      
      const [studiesData, patientsData] = await Promise.all([
        imagingAPI.list(params),
        patientsAPI.list({ limit: 100 })
      ])
      setStudies(studiesData)
      setPatients(patientsData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await imagingAPI.create(formData)
      setShowModal(false)
      setFormData({
        patient: '', modality: 'XRAY', body_part: '', study_description: '',
        clinical_indication: '', is_urgent: false, contrast_used: false
      })
      loadData()
    } catch (err) {
      console.error('Failed to create study', err)
      alert(err.message || 'Failed to create imaging study')
    }
  }

  const handleComplete = async (id) => {
    try {
      await imagingAPI.update(id, { status: 'COMPLETED', performed_at: new Date().toISOString() })
      loadData()
    } catch (err) {
      console.error('Failed to complete study', err)
    }
  }

  const handleReport = async (id) => {
    try {
      await imagingAPI.update(id, { 
        status: 'REPORTED', 
        reported_at: new Date().toISOString(),
        findings: reportData.findings,
        impression: reportData.impression
      })
      setSelectedStudy(null)
      loadData()
    } catch (err) {
      console.error('Failed to submit report', err)
    }
  }

  const getStatusBadge = (status) => {
    const badges = { PENDING: 'badge-warning', IN_PROGRESS: 'badge-info', COMPLETED: 'badge-primary', REPORTED: 'badge-success' }
    return badges[status] || 'badge-neutral'
  }

  const getModalityIcon = (modality) => {
    const icons = { XRAY: 'bi-camera', CT: 'bi-camera-reels', MRI: 'bi-magnet', ULTRASOUND: 'bi-soundwave', MAMMOGRAPHY: 'bi-activity' }
    return icons[modality] || 'bi-image'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading imaging studies...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Imaging Studies</h1>
          <p className="page-subtitle">Radiology, X-Ray, Ultrasound, CT, MRI</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New Study
        </button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
        <button className={`tab-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
        <button className={`tab-btn ${filter === 'reported' ? 'active' : ''}`} onClick={() => setFilter('reported')}>Reported</button>
      </div>

      {selectedStudy ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Report: {selectedStudy.study_description}</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedStudy(null)}>Back</button>
          </div>
          <div className="card-body">
            <div className="info-grid" style={{ marginBottom: 24 }}>
              <div className="info-item"><div className="info-label">Patient</div><div className="info-value">{selectedStudy.patient_name}</div></div>
              <div className="info-item"><div className="info-label">Modality</div><div className="info-value">{selectedStudy.modality_display}</div></div>
              <div className="info-item"><div className="info-label">Body Part</div><div className="info-value">{selectedStudy.body_part}</div></div>
              <div className="info-item"><div className="info-label">Ordered By</div><div className="info-value">{selectedStudy.ordered_by_name}</div></div>
            </div>

            <div className="form-group">
              <label className="form-label">Findings</label>
              <textarea className="form-textarea" rows="5" value={reportData.findings} onChange={(e) => setReportData(prev => ({ ...prev, findings: e.target.value }))} placeholder="Describe radiological findings..."></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">Impression / Conclusion</label>
              <textarea className="form-textarea" rows="3" value={reportData.impression} onChange={(e) => setReportData(prev => ({ ...prev, impression: e.target.value }))} placeholder="Summary of key findings and recommendations..."></textarea>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedStudy(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleReport(selectedStudy.id)}>Submit Report</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            {studies.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-image" style={{ fontSize: 48, opacity: 0.5 }}></i>
                <p className="empty-state-text">No imaging studies found</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Date</th><th>Modality</th><th>Patient</th><th>Study</th><th>Urgent</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {studies.map((study) => (
                      <tr key={study.id}>
                        <td>{new Date(study.ordered_at).toLocaleDateString()}</td>
                        <td><i className={getModalityIcon(study.modality)}></i> {study.modality_display}</td>
                        <td>{study.patient_name}</td>
                        <td>{study.study_description}</td>
                        <td>{study.is_urgent ? <span className="badge badge-danger">Urgent</span> : '-'}</td>
                        <td><span className={`badge ${getStatusBadge(study.status)}`}>{study.status_display}</span></td>
                        <td>
                          {study.status === 'PENDING' && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleComplete(study.id)}>Mark Complete</button>
                          )}
                          {study.status === 'COMPLETED' && (
                            <button className="btn btn-sm btn-success" onClick={() => setSelectedStudy(study)}>Write Report</button>
                          )}
                          {study.status === 'REPORTED' && (
                            <button className="btn btn-sm btn-info" onClick={() => window.open(study.etims_verification_url, '_blank')}>View Report</button>
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
      )}

      {/* New Study Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Imaging Study</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Patient</label>
                    <select className="form-select" required value={formData.patient} onChange={(e) => setFormData(prev => ({ ...prev, patient: e.target.value }))}>
                      <option value="">Select patient...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.phone_number})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Modality</label>
                    <select className="form-select" required value={formData.modality} onChange={(e) => setFormData(prev => ({ ...prev, modality: e.target.value }))}>
                      <option value="XRAY">X-Ray</option><option value="CT">CT Scan</option><option value="MRI">MRI</option>
                      <option value="ULTRASOUND">Ultrasound</option><option value="MAMMOGRAPHY">Mammography</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Body Part</label>
                    <input type="text" className="form-input" required value={formData.body_part} onChange={(e) => setFormData(prev => ({ ...prev, body_part: e.target.value }))} placeholder="e.g., Chest, Abdomen, Knee" />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Study Description</label>
                    <input type="text" className="form-input" required value={formData.study_description} onChange={(e) => setFormData(prev => ({ ...prev, study_description: e.target.value }))} placeholder="e.g., Chest X-Ray PA View" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Clinical Indication</label>
                  <textarea className="form-textarea" rows="2" required value={formData.clinical_indication} onChange={(e) => setFormData(prev => ({ ...prev, clinical_indication: e.target.value }))} placeholder="Reason for examination..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-checkbox">
                      <input type="checkbox" checked={formData.is_urgent} onChange={(e) => setFormData(prev => ({ ...prev, is_urgent: e.target.checked }))} />
                      Urgent / STAT
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-checkbox">
                      <input type="checkbox" checked={formData.contrast_used} onChange={(e) => setFormData(prev => ({ ...prev, contrast_used: e.target.checked }))} />
                      Contrast Used
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Study</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}