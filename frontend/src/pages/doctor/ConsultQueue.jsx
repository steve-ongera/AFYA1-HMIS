// pages/doctor/ConsultQueue.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { queueAPI, visitsAPI, consultationsAPI, prescriptionsAPI, labOrdersAPI, icd10API } from '../../services/api'

export default function ConsultQueue() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const selectedVisitId = queryParams.get('visit')
  const appointmentId = queryParams.get('appointment')
  
  const [queue, setQueue] = useState([])
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [consultation, setConsultation] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [labOrders, setLabOrders] = useState([])
  const [icd10Search, setIcd10Search] = useState('')
  const [icd10Results, setIcd10Results] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [loading, setLoading] = useState(true)
  const [consulting, setConsulting] = useState(false)
  const [formData, setFormData] = useState({
    diagnosis: '',
    notes: '',
    follow_up_date: '',
    follow_up_notes: ''
  })
  const [newPrescription, setNewPrescription] = useState({ medicine: '', quantity: '', dosage_text: '', duration: '', instructions: '', is_insured: false })

  useEffect(() => {
    loadQueue()
  }, [])

  useEffect(() => {
    if (selectedVisitId) {
      loadVisit(selectedVisitId)
    } else if (appointmentId) {
      loadAppointment(appointmentId)
    }
  }, [selectedVisitId, appointmentId])

  const loadQueue = async () => {
    try {
      const data = await queueAPI.byDept('CONSULTATION')
      setQueue(data)
    } catch (err) {
      console.error('Failed to load queue', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVisit = async (id) => {
    try {
      const data = await visitsAPI.get(id)
      setSelectedVisit(data)
      
      // Check if consultation exists
      if (data.consultation) {
        const consData = await consultationsAPI.get(data.consultation)
        setConsultation(consData)
        const [rxData, labData] = await Promise.all([
          consultationsAPI.prescriptions(consData.id),
          consultationsAPI.labOrders(consData.id)
        ])
        setPrescriptions(rxData)
        setLabOrders(labData)
        setFormData({
          diagnosis: consData.diagnosis,
          notes: consData.notes,
          follow_up_date: consData.follow_up_date,
          follow_up_notes: consData.follow_up_notes
        })
        if (consData.icd10_diagnoses) {
          setDiagnoses(consData.icd10_diagnoses)
        }
      }
    } catch (err) {
      console.error('Failed to load visit', err)
    }
  }

  const loadAppointment = async (id) => {
    // Similar to loadVisit - would fetch appointment and create visit
    console.log('Load appointment', id)
  }

  const searchICD10 = async () => {
    if (icd10Search.length < 2) return
    try {
      const data = await icd10API.search(icd10Search)
      setIcd10Results(data)
    } catch (err) {
      console.error('Failed to search ICD10', err)
    }
  }

  const addDiagnosis = async (icd10Code) => {
    if (!consultation) return
    try {
      await consultationsAPI.addDiagnosis(consultation.id, {
        icd10_code: icd10Code.id,
        diagnosis_type: 'PRIMARY',
        certainty: 'CONFIRMED',
        clinical_notes: ''
      })
      const consData = await consultationsAPI.get(consultation.id)
      setDiagnoses(consData.icd10_diagnoses)
      setIcd10Search('')
      setIcd10Results([])
    } catch (err) {
      console.error('Failed to add diagnosis', err)
    }
  }

  const addPrescription = async () => {
    if (!consultation) return
    try {
      await prescriptionsAPI.create({
        consultation: consultation.id,
        ...newPrescription
      })
      const rxData = await consultationsAPI.prescriptions(consultation.id)
      setPrescriptions(rxData)
      setNewPrescription({ medicine: '', quantity: '', dosage_text: '', duration: '', instructions: '', is_insured: false })
    } catch (err) {
      console.error('Failed to add prescription', err)
    }
  }

  const orderLabTest = async (testId) => {
    if (!consultation) return
    try {
      await labOrdersAPI.create({
        consultation: consultation.id,
        patient: selectedVisit.patient,
        priority: 'ROUTINE',
        clinical_notes: 'Ordered during consultation',
        test_items: [{ test: testId }]
      })
      const labData = await consultationsAPI.labOrders(consultation.id)
      setLabOrders(labData)
    } catch (err) {
      console.error('Failed to order lab test', err)
    }
  }

  const saveConsultation = async () => {
    if (!selectedVisit) return
    setConsulting(true)
    try {
      let consId = consultation?.id
      if (!consultation) {
        // Create new consultation
        const appointment = await appointmentsAPI.create({
          patient: selectedVisit.patient,
          doctor: selectedVisit.assigned_doctor,
          scheduled_time: new Date().toISOString(),
          reason: selectedVisit.chief_complaint,
          status: 'IN_PROGRESS'
        })
        const newCons = await consultationsAPI.create({
          appointment: appointment.id,
          diagnosis: formData.diagnosis,
          notes: formData.notes,
          follow_up_date: formData.follow_up_date,
          follow_up_notes: formData.follow_up_notes
        })
        consId = newCons.id
        setConsultation(newCons)
      } else {
        await consultationsAPI.update(consultation.id, formData)
      }
      
      await visitsAPI.updateStatus(selectedVisit.id, { status: 'COMPLETED' })
      await queueAPI.complete(queue.find(q => q.visit === selectedVisit.id)?.id)
      
      navigate(`/shared/visit/${selectedVisit.id}`)
    } catch (err) {
      console.error('Failed to save consultation', err)
      alert(err.message || 'Failed to save consultation')
    } finally {
      setConsulting(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading queue...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Consultation Queue</h1>
          <p className="page-subtitle">Manage patient consultations</p>
        </div>
      </div>

      {!selectedVisit ? (
        <>
          {queue.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-check-circle" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No patients in consultation queue</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {queue.map((item) => (
                <div key={item.id} className="queue-card">
                  <div className="queue-number">{item.queue_number}</div>
                  <div className="queue-info">
                    <div className="queue-name">{item.patient_name}</div>
                    <div className="queue-meta">Visit: {item.patient_visit_number} • Waiting: {item.wait_minutes} min</div>
                    <div className="queue-meta">Chief complaint: {item.visit?.chief_complaint?.substring(0, 100)}</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => loadVisit(item.visit)}>
                    <i className="bi bi-chat-dots"></i> Start Consultation
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Patient: {selectedVisit.patient_info?.full_name}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedVisit(null)}>
                <i className="bi bi-arrow-left"></i> Back to Queue
              </button>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item"><div className="info-label">Visit #</div><div className="info-value">{selectedVisit.visit_number}</div></div>
                <div className="info-item"><div className="info-label">Age/Gender</div><div className="info-value">{selectedVisit.patient_info?.age} / {selectedVisit.patient_info?.gender}</div></div>
                <div className="info-item"><div className="info-label">Chief Complaint</div><div className="info-value">{selectedVisit.chief_complaint}</div></div>
                {selectedVisit.triage && (
                  <div className="info-item"><div className="info-label">Triage</div><div className="info-value">Category: {selectedVisit.triage?.category_info?.name} • Pain: {selectedVisit.triage?.pain_score}/10</div></div>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Diagnosis & Treatment</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Diagnosis</label>
                <textarea className="form-textarea" rows="3" value={formData.diagnosis} onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">ICD-10 Codes</label>
                <div className="search-wrapper">
                  <i className="bi bi-search search-icon"></i>
                  <input type="text" className="form-input" placeholder="Search ICD-10 codes..." value={icd10Search} onChange={(e) => setIcd10Search(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchICD10())} />
                </div>
                {icd10Results.length > 0 && (
                  <div className="table-wrapper" style={{ marginTop: 8 }}>
                    <table className="table">
                      <tbody>
                        {icd10Results.map(code => (
                          <tr key={code.id}>
                            <td><strong>{code.code}</strong></td>
                            <td>{code.short_description}</td>
                            <td><button className="btn btn-sm btn-primary" onClick={() => addDiagnosis(code)}>Add</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {diagnoses.length > 0 && (
                <div className="tag-list" style={{ marginBottom: 16 }}>
                  {diagnoses.map(d => (
                    <span key={d.id} className="badge badge-primary">{d.icd10_info?.code} - {d.icd10_info?.short_description}</span>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Clinical Notes</label>
                <textarea className="form-textarea" rows="3" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Follow-up Date</label>
                  <input type="date" className="form-input" value={formData.follow_up_date} onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Follow-up Notes</label>
                  <input type="text" className="form-input" value={formData.follow_up_notes} onChange={(e) => setFormData(prev => ({ ...prev, follow_up_notes: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Prescriptions</h3>
              <button className="btn btn-sm btn-primary" onClick={() => document.getElementById('prescription-form').style.display = 'block'}>Add Prescription</button>
            </div>
            <div className="card-body">
              <div id="prescription-form" style={{ display: 'none', marginBottom: 16 }}>
                <div className="form-row">
                  <div className="form-group"><label>Medicine</label><input type="text" className="form-input" value={newPrescription.medicine} onChange={(e) => setNewPrescription(prev => ({ ...prev, medicine: e.target.value }))} /></div>
                  <div className="form-group"><label>Quantity</label><input type="number" className="form-input" value={newPrescription.quantity} onChange={(e) => setNewPrescription(prev => ({ ...prev, quantity: e.target.value }))} /></div>
                  <div className="form-group"><label>Dosage</label><input type="text" className="form-input" value={newPrescription.dosage_text} onChange={(e) => setNewPrescription(prev => ({ ...prev, dosage_text: e.target.value }))} placeholder="e.g., 2 tablets" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Duration</label><input type="text" className="form-input" value={newPrescription.duration} onChange={(e) => setNewPrescription(prev => ({ ...prev, duration: e.target.value }))} placeholder="e.g., 7 days" /></div>
                  <div className="form-group"><label>Instructions</label><input type="text" className="form-input" value={newPrescription.instructions} onChange={(e) => setNewPrescription(prev => ({ ...prev, instructions: e.target.value }))} placeholder="e.g., Take after meals" /></div>
                </div>
                <div className="form-group">
                  <label className="form-checkbox"><input type="checkbox" checked={newPrescription.is_insured} onChange={(e) => setNewPrescription(prev => ({ ...prev, is_insured: e.target.checked }))} /> Insurance Claim</label>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => document.getElementById('prescription-form').style.display = 'none'}>Cancel</button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={addPrescription}>Add</button>
                </div>
              </div>
              
              {prescriptions.length === 0 ? (
                <div className="empty-state"><p>No prescriptions added</p></div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Medicine</th><th>Quantity</th><th>Dosage</th><th>Duration</th><th>Status</th></tr></thead>
                    <tbody>
                      {prescriptions.map(rx => (
                        <tr key={rx.id}><td>{rx.medicine_info?.name}</td><td>{rx.quantity}</td><td>{rx.dosage_text}</td><td>{rx.duration}</td><td>{rx.is_dispensed ? 'Dispensed' : 'Pending'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Lab Orders</h3>
            </div>
            <div className="card-body">
              {labOrders.length === 0 ? (
                <div className="empty-state"><p>No lab orders</p></div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Order #</th><th>Priority</th><th>Status</th><th>Results</th></tr></thead>
                    <tbody>
                      {labOrders.map(order => (
                        <tr key={order.id}>
                          <td>{order.order_number}</td>
                          <td><span className={`badge ${order.priority === 'URGENT' ? 'badge-danger' : 'badge-neutral'}`}>{order.priority_display}</span></td>
                          <td>{order.status_display}</td>
                          <td>{order.status === 'REPORTED' ? <button className="btn btn-sm btn-info">View Results</button> : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button className="btn btn-secondary btn-sm">Order Lab Test</button>
            </div>
          </div>

          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setSelectedVisit(null)}>Save Draft</button>
            <button className="btn btn-primary" onClick={saveConsultation} disabled={consulting}>
              {consulting ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Saving...</> : 'Complete Consultation'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}