// pages/nurse/TriageQueue.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { queueAPI, visitsAPI, lookupsAPI } from '../../services/api'

export default function TriageQueue() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const selectedVisitId = queryParams.get('visit')
  
  const [queue, setQueue] = useState([])
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [assessing, setAssessing] = useState(false)
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
    requires_immediate_attention: false
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedVisitId) {
      loadVisit(selectedVisitId)
    }
  }, [selectedVisitId])

  const loadData = async () => {
    try {
      const [queueData, categoriesData] = await Promise.all([
        queueAPI.byDept('TRIAGE'),
        lookupsAPI.triageCategories()
      ])
      setQueue(queueData)
      setCategories(categoriesData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVisit = async (id) => {
    try {
      const data = await visitsAPI.get(id)
      setSelectedVisit(data)
      setFormData(prev => ({ ...prev, presenting_symptoms: data.chief_complaint }))
    } catch (err) {
      console.error('Failed to load visit', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAssessing(true)
    try {
      await visitsAPI.triage(selectedVisit.id, formData)
      await visitsAPI.assignQueue(selectedVisit.id, { department: 'CONSULTATION' })
      await loadData()
      setSelectedVisit(null)
      setFormData({
        category: '', temperature: '', blood_pressure_systolic: '', blood_pressure_diastolic: '',
        pulse_rate: '', respiratory_rate: '', oxygen_saturation: '', weight: '', height: '',
        consciousness_level: 'ALERT', breathing_status: 'NORMAL', pain_score: 0,
        presenting_symptoms: '', allergies_noted: '', current_medications: '', triage_notes: '',
        requires_immediate_attention: false
      })
    } catch (err) {
      console.error('Failed to submit triage', err)
      alert(err.message || 'Failed to submit triage assessment')
    } finally {
      setAssessing(false)
    }
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

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Triage Queue</h1>
          <p className="page-subtitle">Assess and prioritize patients</p>
        </div>
      </div>

      {!selectedVisit ? (
        <>
          {queue.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-check-circle" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No patients waiting for triage</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {queue.map((item) => (
                <div key={item.id} className="queue-card">
                  <div className="queue-number">{item.queue_number}</div>
                  <div className="queue-info">
                    <div className="queue-name">{item.patient_name}</div>
                    <div className="queue-meta">Visit: {item.patient_visit_number} • Arrived: {new Date(item.joined_queue).toLocaleTimeString()}</div>
                    <div className="queue-meta">Chief complaint: {item.visit?.chief_complaint?.substring(0, 100)}</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => loadVisit(item.visit)}>
                    <i className="bi bi-clipboard2-pulse"></i> Start Assessment
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Triage Assessment - {selectedVisit.patient_info?.full_name}</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedVisit(null)}>
                <i className="bi bi-arrow-left"></i> Back to Queue
              </button>
            </div>
            <div className="card-body">
              <div className="info-grid" style={{ marginBottom: 24 }}>
                <div className="info-item"><div className="info-label">Visit #</div><div className="info-value">{selectedVisit.visit_number}</div></div>
                <div className="info-item"><div className="info-label">Age</div><div className="info-value">{selectedVisit.patient_info?.age}</div></div>
                <div className="info-item"><div className="info-label">Gender</div><div className="info-value">{selectedVisit.patient_info?.gender === 'M' ? 'Male' : 'Female'}</div></div>
                <div className="info-item"><div className="info-label">Chief Complaint</div><div className="info-value">{selectedVisit.chief_complaint}</div></div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Triage Category</label>
                  <select className="form-select" required value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}>
                    <option value="">Select priority level</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} - {c.color_code} ({c.max_wait_time} min)</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pain Score (0-10)</label>
                  <input type="number" min="0" max="10" className="form-input" value={formData.pain_score} onChange={(e) => setFormData(prev => ({ ...prev, pain_score: parseInt(e.target.value) }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Temperature (°C)</label><input type="number" step="0.1" className="form-input" value={formData.temperature} onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))} /></div>
                <div className="form-group"><label>BP Systolic</label><input type="number" className="form-input" value={formData.blood_pressure_systolic} onChange={(e) => setFormData(prev => ({ ...prev, blood_pressure_systolic: e.target.value }))} /></div>
                <div className="form-group"><label>BP Diastolic</label><input type="number" className="form-input" value={formData.blood_pressure_diastolic} onChange={(e) => setFormData(prev => ({ ...prev, blood_pressure_diastolic: e.target.value }))} /></div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Pulse Rate</label><input type="number" className="form-input" value={formData.pulse_rate} onChange={(e) => setFormData(prev => ({ ...prev, pulse_rate: e.target.value }))} /></div>
                <div className="form-group"><label>Respiratory Rate</label><input type="number" className="form-input" value={formData.respiratory_rate} onChange={(e) => setFormData(prev => ({ ...prev, respiratory_rate: e.target.value }))} /></div>
                <div className="form-group"><label>O2 Saturation (%)</label><input type="number" className="form-input" value={formData.oxygen_saturation} onChange={(e) => setFormData(prev => ({ ...prev, oxygen_saturation: e.target.value }))} /></div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Weight (kg)</label><input type="number" step="0.1" className="form-input" value={formData.weight} onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))} /></div>
                <div className="form-group"><label>Height (cm)</label><input type="number" step="0.1" className="form-input" value={formData.height} onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))} /></div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Consciousness Level</label>
                  <select className="form-select" value={formData.consciousness_level} onChange={(e) => setFormData(prev => ({ ...prev, consciousness_level: e.target.value }))}>
                    <option value="ALERT">Alert</option><option value="VERBAL">Verbal</option><option value="PAIN">Pain</option><option value="UNRESPONSIVE">Unresponsive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Breathing Status</label>
                  <select className="form-select" value={formData.breathing_status} onChange={(e) => setFormData(prev => ({ ...prev, breathing_status: e.target.value }))}>
                    <option value="NORMAL">Normal</option><option value="LABORED">Labored</option><option value="SHALLOW">Shallow</option><option value="ABSENT">Absent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Presenting Symptoms</label>
                <textarea className="form-textarea" rows="3" required value={formData.presenting_symptoms} onChange={(e) => setFormData(prev => ({ ...prev, presenting_symptoms: e.target.value }))}></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Allergies Noted</label>
                <textarea className="form-textarea" rows="2" value={formData.allergies_noted} onChange={(e) => setFormData(prev => ({ ...prev, allergies_noted: e.target.value }))}></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Current Medications</label>
                <textarea className="form-textarea" rows="2" value={formData.current_medications} onChange={(e) => setFormData(prev => ({ ...prev, current_medications: e.target.value }))}></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Triage Notes</label>
                <textarea className="form-textarea" rows="2" value={formData.triage_notes} onChange={(e) => setFormData(prev => ({ ...prev, triage_notes: e.target.value }))}></textarea>
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input type="checkbox" checked={formData.requires_immediate_attention} onChange={(e) => setFormData(prev => ({ ...prev, requires_immediate_attention: e.target.checked }))} />
                  Requires immediate medical attention
                </label>
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedVisit(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={assessing}>
                {assessing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Submitting...</> : 'Complete Assessment & Send to Queue'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}