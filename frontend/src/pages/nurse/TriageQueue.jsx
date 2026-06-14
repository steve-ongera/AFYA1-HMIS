// pages/nurse/TriageQueue.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { visitsAPI, lookupsAPI, doctorsAPI } from '../../services/api'
import { Activity, Clock, User, Calendar, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

const normalizeList = (data) =>
  Array.isArray(data) ? data : (data?.results ?? [])

export default function TriageQueue() {
  const navigate = useNavigate()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [doctors, setDoctors] = useState([])
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    category: '',
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    pulse_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    consciousness_level: 'ALERT',
    breathing_status: 'NORMAL',
    pain_score: 0,
    presenting_symptoms: '',
    allergies_noted: '',
    current_medications: '',
    triage_notes: '',
    requires_immediate_attention: false,
    assigned_doctor: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [visitsData, categoriesData, doctorsData] = await Promise.all([
        visitsAPI.list({ status: 'REGISTERED' }),
        lookupsAPI.triageCategories(),
        doctorsAPI.list({ is_active: true })
      ])
      setVisits(normalizeList(visitsData))
      setCategories(normalizeList(categoriesData))
      setDoctors(normalizeList(doctorsData))
    } catch (err) {
      console.error('Failed to load data', err)
      toast.error('Failed to load triage queue')
    } finally {
      setLoading(false)
    }
  }

  const startTriage = (visit) => {
    setSelectedVisit(visit)
    setFormData({
      category: '',
      temperature: '',
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      pulse_rate: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      weight: '',
      height: '',
      consciousness_level: 'ALERT',
      breathing_status: 'NORMAL',
      pain_score: 0,
      presenting_symptoms: visit.chief_complaint || '',
      allergies_noted: '',
      current_medications: '',
      triage_notes: 'Initial assessment completed',  // Add default value
      requires_immediate_attention: false,
      assigned_doctor: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.category) {
      toast.error('Please select a triage category')
      return
    }
    
    if (!formData.presenting_symptoms) {
      toast.error('Please enter presenting symptoms')
      return
    }
    
    setSubmitting(true)
    
    try {
      // Prepare triage data - ensure no null/empty strings for required fields
      const triageData = {
        category: parseInt(formData.category),
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        blood_pressure_systolic: formData.blood_pressure_systolic ? parseInt(formData.blood_pressure_systolic) : null,
        blood_pressure_diastolic: formData.blood_pressure_diastolic ? parseInt(formData.blood_pressure_diastolic) : null,
        pulse_rate: formData.pulse_rate ? parseInt(formData.pulse_rate) : null,
        respiratory_rate: formData.respiratory_rate ? parseInt(formData.respiratory_rate) : null,
        oxygen_saturation: formData.oxygen_saturation ? parseInt(formData.oxygen_saturation) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        consciousness_level: formData.consciousness_level,
        breathing_status: formData.breathing_status,
        pain_score: parseInt(formData.pain_score) || 0,
        presenting_symptoms: formData.presenting_symptoms,
        allergies_noted: formData.allergies_noted || '',
        current_medications: formData.current_medications || '',
        triage_notes: formData.triage_notes || 'Assessment completed',
        requires_immediate_attention: formData.requires_immediate_attention
      }
      
      console.log('Submitting triage data:', triageData)
      
      // Step 1: Submit triage assessment
      await visitsAPI.triage(selectedVisit.id, triageData)
      
      // Step 2: Update visit with assigned doctor
      if (formData.assigned_doctor) {
        await visitsAPI.update(selectedVisit.id, { 
          assigned_doctor: parseInt(formData.assigned_doctor)
        })
      }
      
      // Step 3: Add to consultation queue
      await visitsAPI.assignQueue(selectedVisit.id, { department: 'CONSULTATION' })
      
      toast.success('Triage completed! Patient sent to consultation queue.')
      
      // Reset and reload
      setSelectedVisit(null)
      loadData()
      
    } catch (err) {
      console.error('Failed to submit triage:', err)
      
      // Display detailed error messages from backend
      if (err.response?.data) {
        const errors = err.response.data
        const errorMessages = []
        
        Object.keys(errors).forEach(key => {
          if (Array.isArray(errors[key])) {
            errorMessages.push(`${key}: ${errors[key].join(', ')}`)
          } else if (typeof errors[key] === 'string') {
            errorMessages.push(`${key}: ${errors[key]}`)
          } else if (errors[key]?.detail) {
            errorMessages.push(errors[key].detail)
          }
        })
        
        if (errorMessages.length > 0) {
          toast.error(errorMessages.join('; '))
        } else {
          toast.error('Failed to submit triage assessment')
        }
      } else {
        toast.error(err.message || 'Failed to submit triage assessment')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getConsultationFee = (visit) => {
    if (visit.specialized_service?.consultation_fee) {
      return visit.specialized_service.consultation_fee
    }
    return 1000
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading triage queue...</span>
        </div>
      </div>
    )
  }

  // Show triage form if a visit is selected
  if (selectedVisit) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">Triage Assessment</h1>
            <p className="page-subtitle">
              {selectedVisit.patient_info?.full_name} • Visit #{selectedVisit.visit_number}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => setSelectedVisit(null)}>
            ← Back to Queue
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-body">
              {/* Patient Info */}
              <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24, padding: 16, background: '#f0f4f8', borderRadius: 8 }}>
                <div><strong>Patient:</strong> {selectedVisit.patient_info?.full_name}</div>
                <div><strong>Age:</strong> {selectedVisit.patient_info?.age} yrs</div>
                <div><strong>Gender:</strong> {selectedVisit.patient_info?.gender === 'M' ? 'Male' : 'Female'}</div>
                <div><strong>Consultation Fee:</strong> <span style={{ color: '#0a6e6e', fontWeight: 'bold' }}>KES {getConsultationFee(selectedVisit).toLocaleString()}</span></div>
                <div><strong>Chief Complaint:</strong> {selectedVisit.chief_complaint}</div>
                <div><strong>Visit Type:</strong> {selectedVisit.visit_type_display || selectedVisit.visit_type}</div>
              </div>

              {/* Triage Category */}
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label required">Triage Category</label>
                  <select 
                    className="form-select" 
                    required 
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Select priority</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.color_code}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pain Score (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="form-input"
                    value={formData.pain_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, pain_score: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Vitals */}
              <div style={{ marginBottom: 20 }}>
                <h4>Vital Signs</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  <input type="number" step="0.1" className="form-input" placeholder="Temp (°C)" value={formData.temperature} onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))} />
                  <input type="number" className="form-input" placeholder="BP Systolic" value={formData.blood_pressure_systolic} onChange={(e) => setFormData(prev => ({ ...prev, blood_pressure_systolic: e.target.value }))} />
                  <input type="number" className="form-input" placeholder="BP Diastolic" value={formData.blood_pressure_diastolic} onChange={(e) => setFormData(prev => ({ ...prev, blood_pressure_diastolic: e.target.value }))} />
                  <input type="number" className="form-input" placeholder="Pulse Rate" value={formData.pulse_rate} onChange={(e) => setFormData(prev => ({ ...prev, pulse_rate: e.target.value }))} />
                  <input type="number" className="form-input" placeholder="Respiratory Rate" value={formData.respiratory_rate} onChange={(e) => setFormData(prev => ({ ...prev, respiratory_rate: e.target.value }))} />
                  <input type="number" className="form-input" placeholder="O2 Saturation %" value={formData.oxygen_saturation} onChange={(e) => setFormData(prev => ({ ...prev, oxygen_saturation: e.target.value }))} />
                  <input type="number" step="0.1" className="form-input" placeholder="Weight (kg)" value={formData.weight} onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))} />
                  <input type="number" step="0.1" className="form-input" placeholder="Height (cm)" value={formData.height} onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))} />
                </div>
              </div>

              {/* Assessment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <select className="form-select" value={formData.consciousness_level} onChange={(e) => setFormData(prev => ({ ...prev, consciousness_level: e.target.value }))}>
                  <option value="ALERT">Alert</option>
                  <option value="VERBAL">Verbal</option>
                  <option value="PAIN">Pain</option>
                  <option value="UNRESPONSIVE">Unresponsive</option>
                </select>
                <select className="form-select" value={formData.breathing_status} onChange={(e) => setFormData(prev => ({ ...prev, breathing_status: e.target.value }))}>
                  <option value="NORMAL">Normal</option>
                  <option value="LABORED">Labored</option>
                  <option value="SHALLOW">Shallow</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </div>

              <textarea 
                className="form-textarea" 
                rows="2" 
                placeholder="Presenting Symptoms" 
                required 
                value={formData.presenting_symptoms} 
                onChange={(e) => setFormData(prev => ({ ...prev, presenting_symptoms: e.target.value }))} 
                style={{ marginBottom: 16 }} 
              />
              
              <textarea 
                className="form-textarea" 
                rows="2" 
                placeholder="Allergies" 
                value={formData.allergies_noted} 
                onChange={(e) => setFormData(prev => ({ ...prev, allergies_noted: e.target.value }))} 
                style={{ marginBottom: 16 }} 
              />
              
              <textarea 
                className="form-textarea" 
                rows="2" 
                placeholder="Current Medications" 
                value={formData.current_medications} 
                onChange={(e) => setFormData(prev => ({ ...prev, current_medications: e.target.value }))} 
                style={{ marginBottom: 16 }} 
              />
              
              <textarea 
                className="form-textarea" 
                rows="2" 
                placeholder="Triage Notes" 
                value={formData.triage_notes} 
                onChange={(e) => setFormData(prev => ({ ...prev, triage_notes: e.target.value }))} 
                style={{ marginBottom: 16 }} 
              />

              {/* Assign Doctor */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Assign Doctor</label>
                <select 
                  className="form-select"
                  value={formData.assigned_doctor}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_doctor: e.target.value }))}
                >
                  <option value="">Select doctor...</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>Dr. {doc.full_name} - {doc.specialization_display || doc.specialization}</option>
                  ))}
                </select>
              </div>

              <label className="form-checkbox" style={{ marginBottom: 16 }}>
                <input
                  type="checkbox"
                  checked={formData.requires_immediate_attention}
                  onChange={(e) => setFormData(prev => ({ ...prev, requires_immediate_attention: e.target.checked }))}
                />
                Requires immediate medical attention
              </label>
            </div>

            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedVisit(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Processing...' : 'Complete Triage & Send to Doctor'}
              </button>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // Show list of visits
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">
            <Activity className="inline-icon" size={28} />
            Triage Queue
          </h1>
          <p className="page-subtitle">Patients waiting for triage assessment</p>
        </div>
        <button className="btn btn-outline" onClick={loadData}>
          Refresh
        </button>
      </div>

      {visits.length === 0 ? (
        <div className="empty-state">
          <Activity size={48} style={{ opacity: 0.5 }} />
          <p className="empty-state-text">No patients waiting for triage</p>
          <button className="btn btn-primary" onClick={() => navigate('/receptionist/new-visit')}>
            Register New Patient
          </button>
        </div>
      ) : (
        <div className="visits-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visits.map((visit) => (
            <div key={visit.id} className="visit-card" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: 16,
              background: 'white',
              borderRadius: 8,
              border: '1px solid #d1dbd9',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <User size={18} color="#0a6e6e" />
                  <strong style={{ fontSize: 16 }}>{visit.patient_info?.full_name}</strong>
                  <span className="badge badge-info">Visit: {visit.visit_number}</span>
                  <span className="badge badge-primary">Fee: KES {getConsultationFee(visit).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#5f7a7a' }}>
                  <span><Clock size={14} style={{ display: 'inline', marginRight: 4 }} /> Arrived: {new Date(visit.arrival_time).toLocaleTimeString()}</span>
                  <span><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> {visit.visit_type_display || visit.visit_type}</span>
                </div>
                <div style={{ fontSize: 13, color: '#5f7a7a', marginTop: 4 }}>
                  <strong>Chief complaint:</strong> {visit.chief_complaint}
                </div>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => startTriage(visit)}
                style={{ minWidth: 140 }}
              >
                <Activity size={16} /> Start Triage
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .inline-icon {
          vertical-align: middle;
          margin-right: 8px;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid #0a6e6e;
          color: #0a6e6e;
        }
        .btn-outline:hover {
          background: #0a6e6e;
          color: white;
        }
      `}</style>
    </div>
  )
}