// pages/doctor/ConsultQueue.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  queueAPI, visitsAPI, consultationsAPI, prescriptionsAPI, labOrdersAPI, 
  icd10API, appointmentsAPI, medicinesAPI, labTestsAPI, imagingAPI,
  patientsAPI
} from '../../services/api'
import { Activity, Plus, Search, Save, FileText, Microscope, Pill, 
         Calendar, Clock, AlertCircle, CheckCircle, XCircle, 
         Image, Download, Printer, Pause, Play, Trash2, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const [imagingStudies, setImagingStudies] = useState([])
  const [medicines, setMedicines] = useState([])
  const [labTests, setLabTests] = useState([])
  const [icd10Search, setIcd10Search] = useState('')
  const [icd10Results, setIcd10Results] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [loading, setLoading] = useState(true)
  const [consulting, setConsulting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showLabModal, setShowLabModal] = useState(false)
  const [showImagingModal, setShowImagingModal] = useState(false)
  const [selectedLabTests, setSelectedLabTests] = useState([])
  const [searchMedicine, setSearchMedicine] = useState('')
  const [medicineResults, setMedicineResults] = useState([])
  
  const [formData, setFormData] = useState({
    diagnosis: '',
    notes: '',
    follow_up_date: '',
    follow_up_notes: ''
  })
  
  const [newPrescription, setNewPrescription] = useState({
    medicine_id: '', quantity: '', dosage_text: '', duration: '', 
    instructions: '', is_insured: false
  })
  
  const [newImagingStudy, setNewImagingStudy] = useState({
    modality: 'XRAY',
    body_part: '',
    study_description: '',
    clinical_indication: '',
    is_urgent: false
  })

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.results)) return data.results
    return []
  }

  useEffect(() => {
    loadQueue()
    loadMedicines()
    loadLabTests()
  }, [])

  useEffect(() => {
    if (selectedVisitId) {
      loadVisit(selectedVisitId)
    } else if (appointmentId) {
      loadAppointment(appointmentId)
    }
  }, [selectedVisitId, appointmentId])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (icd10Search.length >= 2) {
        searchICD10()
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [icd10Search])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchMedicine.length >= 2) {
        searchMedicines()
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchMedicine])

  const loadQueue = async () => {
    try {
      const data = await queueAPI.byDept('CONSULTATION')
      setQueue(normalizeList(data))
    } catch (err) {
      console.error('Failed to load queue', err)
      toast.error('Failed to load consultation queue')
    } finally {
      setLoading(false)
    }
  }

  const loadMedicines = async () => {
    try {
      const data = await medicinesAPI.list()
      setMedicines(normalizeList(data))
    } catch (err) {
      console.error('Failed to load medicines', err)
    }
  }

  const loadLabTests = async () => {
    try {
      const data = await labTestsAPI.list()
      setLabTests(normalizeList(data))
    } catch (err) {
      console.error('Failed to load lab tests', err)
    }
  }

  const loadVisit = async (id) => {
    try {
      setConsulting(true)
      const data = await visitsAPI.get(id)
      setSelectedVisit(data)
      
      // Fetch patient details
      const patientData = await patientsAPI.get(data.patient)
      
      // Check for existing consultation
      const existingConsults = await consultationsAPI.list({ visit: id })
      const existingConsult = normalizeList(existingConsults)[0]
      
      if (existingConsult) {
        setConsultation(existingConsult)
        const [rxData, labData, imagingData] = await Promise.all([
          consultationsAPI.prescriptions(existingConsult.id),
          consultationsAPI.labOrders(existingConsult.id),
          imagingAPI.list({ consultation: existingConsult.id })
        ])
        setPrescriptions(normalizeList(rxData))
        setLabOrders(normalizeList(labData))
        setImagingStudies(normalizeList(imagingData))
        setFormData({
          diagnosis: existingConsult.diagnosis || '',
          notes: existingConsult.notes || '',
          follow_up_date: existingConsult.follow_up_date || '',
          follow_up_notes: existingConsult.follow_up_notes || ''
        })
        if (existingConsult.icd10_diagnoses) {
          setDiagnoses(normalizeList(existingConsult.icd10_diagnoses))
        }
      } else {
        // Create draft consultation
        const appointment = await appointmentsAPI.create({
          patient: data.patient,
          doctor: data.assigned_doctor || null,
          scheduled_time: new Date().toISOString(),
          reason: data.chief_complaint,
          status: 'IN_PROGRESS'
        })
        const newConsult = await consultationsAPI.create({
          appointment: appointment.id,
          diagnosis: '',
          notes: '',
          follow_up_date: null,
          follow_up_notes: ''
        })
        setConsultation(newConsult)
      }
      
      // Update visit status to IN_CONSULTATION
      await visitsAPI.updateStatus(id, { status: 'IN_CONSULTATION' })
      
    } catch (err) {
      console.error('Failed to load visit', err)
      toast.error('Failed to load patient data')
    } finally {
      setConsulting(false)
    }
  }

  const loadAppointment = async (id) => {
    try {
      const appointment = await appointmentsAPI.get(id)
      if (appointment.visit) {
        loadVisit(appointment.visit)
      }
    } catch (err) {
      console.error('Failed to load appointment', err)
    }
  }

  const searchICD10 = async () => {
    try {
      const data = await icd10API.search(icd10Search)
      setIcd10Results(normalizeList(data))
    } catch (err) {
      console.error('Failed to search ICD10', err)
    }
  }

  const searchMedicines = async () => {
    try {
      const filtered = medicines.filter(m => 
        m.name.toLowerCase().includes(searchMedicine.toLowerCase())
      )
      setMedicineResults(filtered.slice(0, 10))
    } catch (err) {
      console.error('Failed to search medicines', err)
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
      setDiagnoses(normalizeList(consData.icd10_diagnoses))
      setIcd10Search('')
      setIcd10Results([])
      toast.success('Diagnosis added')
    } catch (err) {
      console.error('Failed to add diagnosis', err)
      toast.error('Failed to add diagnosis')
    }
  }

  const removeDiagnosis = async (diagnosisId) => {
    try {
      await diagnosesAPI.delete(diagnosisId)
      setDiagnoses(diagnoses.filter(d => d.id !== diagnosisId))
      toast.success('Diagnosis removed')
    } catch (err) {
      console.error('Failed to remove diagnosis', err)
      toast.error('Failed to remove diagnosis')
    }
  }

  const addPrescription = async () => {
    if (!consultation) return
    if (!newPrescription.medicine_id || !newPrescription.quantity || !newPrescription.dosage_text) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      await prescriptionsAPI.create({
        consultation: consultation.id,
        medicine: parseInt(newPrescription.medicine_id),
        quantity: parseInt(newPrescription.quantity),
        dosage_text: newPrescription.dosage_text,
        duration: newPrescription.duration,
        instructions: newPrescription.instructions,
        is_insured: newPrescription.is_insured
      })
      const rxData = await consultationsAPI.prescriptions(consultation.id)
      setPrescriptions(normalizeList(rxData))
      setNewPrescription({ 
        medicine_id: '', quantity: '', dosage_text: '', 
        duration: '', instructions: '', is_insured: false 
      })
      toast.success('Prescription added')
    } catch (err) {
      console.error('Failed to add prescription', err)
      toast.error('Failed to add prescription')
    }
  }

  const orderLabTests = async () => {
    if (!consultation || selectedLabTests.length === 0) return
    try {
      await labOrdersAPI.create({
        consultation: consultation.id,
        patient: selectedVisit.patient,
        priority: 'ROUTINE',
        clinical_notes: formData.notes,
        test_items: selectedLabTests.map(testId => ({ test: testId }))
      })
      const labData = await consultationsAPI.labOrders(consultation.id)
      setLabOrders(normalizeList(labData))
      setShowLabModal(false)
      setSelectedLabTests([])
      toast.success('Lab tests ordered')
    } catch (err) {
      console.error('Failed to order lab tests', err)
      toast.error('Failed to order lab tests')
    }
  }

  const orderImagingStudy = async () => {
    if (!consultation) return
    try {
      await imagingAPI.create({
        consultation: consultation.id,
        patient: selectedVisit.patient,
        modality: newImagingStudy.modality,
        body_part: newImagingStudy.body_part,
        study_description: newImagingStudy.study_description,
        clinical_indication: newImagingStudy.clinical_indication,
        is_urgent: newImagingStudy.is_urgent,
        status: 'PENDING'
      })
      const imagingData = await imagingAPI.list({ consultation: consultation.id })
      setImagingStudies(normalizeList(imagingData))
      setShowImagingModal(false)
      setNewImagingStudy({
        modality: 'XRAY',
        body_part: '',
        study_description: '',
        clinical_indication: '',
        is_urgent: false
      })
      toast.success('Imaging study ordered')
    } catch (err) {
      console.error('Failed to order imaging', err)
      toast.error('Failed to order imaging study')
    }
  }

  const pauseConsultation = async () => {
    setIsPaused(true)
    toast.success('Consultation paused. You can resume later from the queue.')
  }

  const saveDraft = async () => {
    if (!consultation) return
    try {
      await consultationsAPI.update(consultation.id, formData)
      toast.success('Draft saved successfully')
    } catch (err) {
      console.error('Failed to save draft', err)
      toast.error('Failed to save draft')
    }
  }

  const viewLabResult = (order) => {
    navigate(`/doctor/lab-results/${order.id}`)
  }

  const viewImagingStudy = (study) => {
    navigate(`/laboratory/imaging/${study.id}`)
  }

  const completeConsultation = async () => {
    if (!consultation) return
    
    if (!formData.diagnosis) {
      toast.error('Please enter a diagnosis before completing')
      return
    }
    
    setConsulting(true)
    try {
      await consultationsAPI.update(consultation.id, {
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        follow_up_date: formData.follow_up_date,
        follow_up_notes: formData.follow_up_notes
      })

      await visitsAPI.updateStatus(selectedVisit.id, { status: 'COMPLETED' })
      
      const queueItem = queue.find(q => q.visit === selectedVisit.id)
      if (queueItem) await queueAPI.complete(queueItem.id)

      toast.success('Consultation completed successfully')
      navigate(`/shared/visit/${selectedVisit.id}`)
    } catch (err) {
      console.error('Failed to complete consultation', err)
      toast.error('Failed to complete consultation')
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
          <h1 className="page-title">
            <Activity className="inline-icon" size={28} />
            Consultation Queue
          </h1>
          <p className="page-subtitle">Manage patient consultations</p>
        </div>
      </div>

      {!selectedVisit ? (
        <>
          {queue.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} style={{ opacity: 0.5, color: '#16a34a' }} />
              <p className="empty-state-text">No patients in consultation queue</p>
            </div>
          ) : (
            <div className="queue-list" style={{ display: 'grid', gap: 12 }}>
              {queue.map((item) => (
                <div key={item.id} className="queue-card" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 20, 
                  padding: 20,
                  background: 'white',
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${item.triage_color === 'RED' ? '#dc2626' : item.triage_color === 'ORANGE' ? '#f97316' : item.triage_color === 'YELLOW' ? '#eab308' : '#0a6e6e'}`
                }}>
                  <div className="queue-number" style={{ 
                    width: 50, 
                    height: 50, 
                    borderRadius: '50%', 
                    background: '#0a6e6e', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700,
                    fontSize: 20
                  }}>
                    {item.queue_number}
                  </div>
                  <div className="queue-info" style={{ flex: 1 }}>
                    <div className="queue-name" style={{ fontSize: 18, fontWeight: 600 }}>{item.patient_name}</div>
                    <div className="queue-meta" style={{ display: 'flex', gap: 16, fontSize: 13, color: '#5f7a7a', marginTop: 4 }}>
                      <span><Clock size={14} style={{ display: 'inline', marginRight: 4 }} /> Waiting: {item.wait_minutes} min</span>
                      <span>Triage: {item.triage_color || 'N/A'}</span>
                    </div>
                    <div className="queue-meta" style={{ fontSize: 13, color: '#5f7a7a', marginTop: 4 }}>
                      <strong>Chief complaint:</strong> {item.visit?.chief_complaint?.substring(0, 100)}
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => loadVisit(item.visit)}
                    style={{ minWidth: 150 }}
                  >
                    <Activity size={16} /> Start Consultation
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          {/* Patient Info Card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>
                  Patient: {selectedVisit.patient_info?.full_name}
                </h3>
                <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>Visit #{selectedVisit.visit_number}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {isPaused ? (
                  <button className="btn btn-success btn-sm" onClick={() => setIsPaused(false)}>
                    <Play size={14} /> Resume
                  </button>
                ) : (
                  <button className="btn btn-warning btn-sm" onClick={pauseConsultation}>
                    <Pause size={14} /> Pause
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedVisit(null)}>
                  ← Back to Queue
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: 16, background: '#f0f4f8', borderRadius: 8 }}>
                <div><strong>Age/Gender:</strong> {selectedVisit.patient_info?.age} yrs / {selectedVisit.patient_info?.gender === 'M' ? 'Male' : 'Female'}</div>
                <div><strong>Phone:</strong> {selectedVisit.patient_info?.phone_number}</div>
                <div><strong>Chief Complaint:</strong> {selectedVisit.chief_complaint}</div>
                <div><strong>Visit Type:</strong> {selectedVisit.visit_type_display || selectedVisit.visit_type}</div>
                {selectedVisit.triage && (
                  <>
                    <div><strong>Triage Category:</strong> <span className={`badge badge-${selectedVisit.triage.category_info?.color_code?.toLowerCase()}`}>{selectedVisit.triage.category_info?.name}</span></div>
                    <div><strong>Pain Score:</strong> {selectedVisit.triage.pain_score}/10</div>
                    <div><strong>Vitals:</strong> BP: {selectedVisit.triage.blood_pressure_systolic}/{selectedVisit.triage.blood_pressure_diastolic}, Pulse: {selectedVisit.triage.pulse_rate}, Temp: {selectedVisit.triage.temperature}°C</div>
                    <div><strong>BMI:</strong> {selectedVisit.triage.bmi || 'N/A'}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Diagnosis & Treatment */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Diagnosis & Treatment</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label required">Diagnosis</label>
                <textarea 
                  className="form-textarea" 
                  rows="3" 
                  placeholder="Enter primary diagnosis..."
                  value={formData.diagnosis} 
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  disabled={isPaused}
                />
              </div>

              {/* ICD-10 Search */}
              <div className="form-group">
                <label className="form-label">ICD-10 Codes</label>
                <div className="search-wrapper" style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5f7a7a' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    placeholder="Search ICD-10 codes by name or code..."
                    value={icd10Search}
                    onChange={(e) => setIcd10Search(e.target.value)}
                    disabled={isPaused}
                  />
                </div>
                {icd10Results.length > 0 && (
                  <div className="icd10-results" style={{ marginTop: 8, border: '1px solid #d1dbd9', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {icd10Results.map(code => (
                      <div key={code.id} style={{ padding: 8, borderBottom: '1px solid #d1dbd9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{code.code}</strong> - {code.short_description}
                        </div>
                        <button className="btn btn-sm btn-primary" onClick={() => addDiagnosis(code)}>
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Added Diagnoses */}
              {diagnoses.length > 0 && (
                <div className="diagnoses-list" style={{ marginBottom: 16 }}>
                  <label className="form-label">Added Diagnoses</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {diagnoses.map(d => (
                      <span key={d.id} className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {d.icd10_info?.code} - {d.icd10_info?.short_description}
                        {!isPaused && (
                          <button onClick={() => removeDiagnosis(d.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Clinical Notes</label>
                <textarea 
                  className="form-textarea" 
                  rows="3" 
                  placeholder="Enter clinical notes, examination findings, treatment plan..."
                  value={formData.notes} 
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  disabled={isPaused}
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Follow-up Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.follow_up_date} 
                    onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                    disabled={isPaused}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Follow-up Notes</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Reason for follow-up..."
                    value={formData.follow_up_notes} 
                    onChange={(e) => setFormData(prev => ({ ...prev, follow_up_notes: e.target.value }))}
                    disabled={isPaused}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Prescriptions */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">
                <Pill size={18} style={{ display: 'inline', marginRight: 8 }} />
                Prescriptions
              </h3>
              {!isPaused && (
                <button className="btn btn-sm btn-primary" onClick={() => document.getElementById('prescription-form').style.display = 'block'}>
                  <Plus size={14} /> Add Prescription
                </button>
              )}
            </div>
            <div className="card-body">
              <div id="prescription-form" style={{ display: 'none', marginBottom: 16, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label required">Medicine</label>
                    <div className="search-wrapper" style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5f7a7a' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: 36 }}
                        placeholder="Search medicine..."
                        value={searchMedicine}
                        onChange={(e) => setSearchMedicine(e.target.value)}
                      />
                    </div>
                    {medicineResults.length > 0 && (
                      <div style={{ marginTop: 8, border: '1px solid #d1dbd9', borderRadius: 8, maxHeight: 150, overflowY: 'auto' }}>
                        {medicineResults.map(m => (
                          <div key={m.id} style={{ padding: 8, borderBottom: '1px solid #d1dbd9', cursor: 'pointer' }} onClick={() => {
                            setNewPrescription(prev => ({ ...prev, medicine_id: m.id }))
                            setSearchMedicine(m.name)
                            setMedicineResults([])
                          }}>
                            <strong>{m.name}</strong> - Stock: {m.quantity_in_stock}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Quantity</label>
                    <input type="number" className="form-input" value={newPrescription.quantity} onChange={(e) => setNewPrescription(prev => ({ ...prev, quantity: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label required">Dosage</label>
                    <input type="text" className="form-input" placeholder="e.g., 2 tablets" value={newPrescription.dosage_text} onChange={(e) => setNewPrescription(prev => ({ ...prev, dosage_text: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <input type="text" className="form-input" placeholder="e.g., 7 days" value={newPrescription.duration} onChange={(e) => setNewPrescription(prev => ({ ...prev, duration: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Instructions</label>
                  <input type="text" className="form-input" placeholder="e.g., Take after meals" value={newPrescription.instructions} onChange={(e) => setNewPrescription(prev => ({ ...prev, instructions: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-checkbox">
                    <input type="checkbox" checked={newPrescription.is_insured} onChange={(e) => setNewPrescription(prev => ({ ...prev, is_insured: e.target.checked }))} /> 
                    Claim via Insurance
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => document.getElementById('prescription-form').style.display = 'none'}>Cancel</button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={addPrescription}>Add Prescription</button>
                </div>
              </div>

              {prescriptions.length === 0 ? (
                <div className="empty-state"><p>No prescriptions added</p></div>
              ) : (
                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ minWidth: 600 }}>
                    <thead>
                      <tr><th>Medicine</th><th>Quantity</th><th>Dosage</th><th>Duration</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {prescriptions.map(rx => (
                        <tr key={rx.id}>
                          <td><strong>{rx.medicine_info?.name}</strong></td>
                          <td>{rx.quantity}</td>
                          <td>{rx.dosage_text}</td>
                          <td>{rx.duration}</td>
                          <td>{rx.is_dispensed ? <span className="badge badge-success">Dispensed</span> : <span className="badge badge-warning">Pending</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Lab Orders */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">
                <Microscope size={18} style={{ display: 'inline', marginRight: 8 }} />
                Laboratory Orders
              </h3>
              {!isPaused && (
                <button className="btn btn-sm btn-primary" onClick={() => setShowLabModal(true)}>
                  <Plus size={14} /> Order Lab Tests
                </button>
              )}
            </div>
            <div className="card-body">
              {labOrders.length === 0 ? (
                <div className="empty-state"><p>No lab orders</p></div>
              ) : (
                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ minWidth: 600 }}>
                    <thead>
                      <tr><th>Order #</th><th>Tests</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {labOrders.map(order => (
                        <tr key={order.id}>
                          <td>{order.order_number}</td>
                          <td>{order.test_items?.map(t => t.test_info?.test_name).join(', ')}</td>
                          <td><span className={`badge ${order.priority === 'URGENT' ? 'badge-danger' : 'badge-neutral'}`}>{order.priority_display}</span></td>
                          <td>{order.status_display}</td>
                          <td>
                            {order.status === 'REPORTED' && (
                              <button className="btn btn-sm btn-info" onClick={() => viewLabResult(order)}>
                                <FileText size={14} /> View Results
                              </button>
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

          {/* Imaging Studies */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">
                <Image size={18} style={{ display: 'inline', marginRight: 8 }} />
                Imaging Studies
              </h3>
              {!isPaused && (
                <button className="btn btn-sm btn-primary" onClick={() => setShowImagingModal(true)}>
                  <Plus size={14} /> Order Imaging
                </button>
              )}
            </div>
            <div className="card-body">
              {imagingStudies.length === 0 ? (
                <div className="empty-state"><p>No imaging studies ordered</p></div>
              ) : (
                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ minWidth: 600 }}>
                    <thead>
                      <tr><th>Modality</th><th>Body Part</th><th>Study Description</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {imagingStudies.map(study => (
                        <tr key={study.id}>
                          <td>{study.modality_display}</td>
                          <td>{study.body_part}</td>
                          <td>{study.study_description}</td>
                          <td><span className={`badge badge-${study.status === 'COMPLETED' ? 'success' : 'warning'}`}>{study.status}</span></td>
                          <td>
                            {study.status === 'COMPLETED' && (
                              <button className="btn btn-sm btn-info" onClick={() => viewImagingStudy(study)}>
                                <Image size={14} /> View Images
                              </button>
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

          {/* Action Buttons */}
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 16, background: 'white', borderRadius: 8 }}>
            <button className="btn btn-secondary" onClick={saveDraft} disabled={isPaused}>
              <Save size={16} /> Save Draft
            </button>
            <button className="btn btn-primary" onClick={completeConsultation} disabled={consulting || isPaused}>
              {consulting ? <><span className="spinner"></span> Saving...</> : 'Complete Consultation'}
            </button>
          </div>
        </div>
      )}

      {/* Lab Order Modal */}
      {showLabModal && (
        <div className="modal-overlay" onClick={() => setShowLabModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Order Laboratory Tests</h3>
              <button className="modal-close" onClick={() => setShowLabModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="lab-tests-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
                {labTests.map(test => (
                  <label key={test.id} className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderBottom: '1px solid #d1dbd9' }}>
                    <input
                      type="checkbox"
                      checked={selectedLabTests.includes(test.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLabTests([...selectedLabTests, test.id])
                        } else {
                          setSelectedLabTests(selectedLabTests.filter(id => id !== test.id))
                        }
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <strong>{test.test_name}</strong>
                      <div style={{ fontSize: 12, color: '#5f7a7a' }}>{test.test_code} - KES {test.cost}</div>
                    </div>
                    <div style={{ fontSize: 12 }}>Turnaround: {test.turnaround_time} hrs</div>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLabModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={orderLabTests} disabled={selectedLabTests.length === 0}>
                Order Selected ({selectedLabTests.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Imaging Study Modal */}
      {showImagingModal && (
        <div className="modal-overlay" onClick={() => setShowImagingModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Order Imaging Study</h3>
              <button className="modal-close" onClick={() => setShowImagingModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Modality</label>
                <select className="form-select" value={newImagingStudy.modality} onChange={(e) => setNewImagingStudy(prev => ({ ...prev, modality: e.target.value }))}>
                  <option value="XRAY">X-Ray</option>
                  <option value="CT">CT Scan</option>
                  <option value="MRI">MRI</option>
                  <option value="ULTRASOUND">Ultrasound</option>
                  <option value="MAMMOGRAPHY">Mammography</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Body Part</label>
                <input type="text" className="form-input" placeholder="e.g., Chest, Knee, Abdomen" value={newImagingStudy.body_part} onChange={(e) => setNewImagingStudy(prev => ({ ...prev, body_part: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Study Description</label>
                <input type="text" className="form-input" placeholder="e.g., Chest X-Ray PA view" value={newImagingStudy.study_description} onChange={(e) => setNewImagingStudy(prev => ({ ...prev, study_description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Clinical Indication</label>
                <textarea className="form-textarea" rows="2" placeholder="Reason for imaging..." value={newImagingStudy.clinical_indication} onChange={(e) => setNewImagingStudy(prev => ({ ...prev, clinical_indication: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-checkbox">
                  <input type="checkbox" checked={newImagingStudy.is_urgent} onChange={(e) => setNewImagingStudy(prev => ({ ...prev, is_urgent: e.target.checked }))} />
                  Urgent (STAT)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowImagingModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={orderImagingStudy}>Order Study</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inline-icon {
          vertical-align: middle;
          margin-right: 8px;
        }
        .btn-warning {
          background: #f59e0b;
          color: white;
        }
        .btn-warning:hover {
          background: #d97706;
        }
        .text-muted {
          color: #5f7a7a;
        }
      `}</style>
    </div>
  )
}