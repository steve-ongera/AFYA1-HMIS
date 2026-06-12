// pages/nurse/InpatientVitals.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { admissionsAPI, wardsAPI } from '../../services/api'

const normalizeList = (data) =>
  Array.isArray(data) ? data : (data?.results ?? [])

export default function InpatientVitals() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const selectedAdmissionId = queryParams.get('admission')

  const [admissions, setAdmissions] = useState([])
  const [selectedAdmission, setSelectedAdmission] = useState(null)
  const [vitalsHistory, setVitalsHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)

  const emptyForm = {
    temperature: '', blood_pressure_systolic: '', blood_pressure_diastolic: '',
    pulse_rate: '', respiratory_rate: '', oxygen_saturation: '', weight: '',
    pain_score: '', consciousness_level: '', notes: ''
  }

  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    loadAdmissions()
  }, [])

  useEffect(() => {
    if (selectedAdmissionId) {
      loadAdmission(selectedAdmissionId)
    }
  }, [selectedAdmissionId])

  const loadAdmissions = async () => {
    try {
      const data = await admissionsAPI.active()
      setAdmissions(normalizeList(data))
    } catch (err) {
      console.error('Failed to load admissions', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAdmission = async (id) => {
    try {
      const [admissionData, vitalsData] = await Promise.all([
        admissionsAPI.get(id),
        admissionsAPI.vitals(id)
      ])
      setSelectedAdmission(admissionData)
      setVitalsHistory(normalizeList(vitalsData))
    } catch (err) {
      console.error('Failed to load admission', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedAdmission) return

    setRecording(true)
    try {
      await admissionsAPI.recordVitals(selectedAdmission.id, formData)
      await loadAdmission(selectedAdmission.id)
      setFormData(emptyForm)
    } catch (err) {
      console.error('Failed to record vitals', err)
      alert(err.message || 'Failed to record vitals')
    } finally {
      setRecording(false)
    }
  }

  const field = (key, extra = {}) => ({
    value: formData[key],
    onChange: (e) => setFormData(prev => ({ ...prev, [key]: e.target.value })),
    ...extra
  })

  const getVitalStatus = (value, type) => {
    if (!value) return ''
    const ranges = {
      temperature: { normal: [36.1, 37.2], warning: [37.3, 38.5] },
      pulse_rate: { normal: [60, 100], warning: [40, 59] },
      oxygen_saturation: { normal: [95, 100], warning: [90, 94] }
    }
    const range = ranges[type]
    if (!range) return ''
    if (value >= range.normal[0] && value <= range.normal[1]) return 'normal'
    if (value >= range.warning[0] && value <= range.warning[1]) return 'warning'
    return 'critical'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading inpatient data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Inpatient Vitals</h1>
          <p className="page-subtitle">Record and monitor patient vital signs</p>
        </div>
      </div>

      {!selectedAdmission ? (
        <>
          {admissions.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-hospital" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No active inpatient admissions</p>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Select Patient</h3>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Admission #</th>
                        <th>Bed</th>
                        <th>Doctor</th>
                        <th>Last Vitals</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admissions.map((admission) => (
                        <tr key={admission.id}>
                          <td>{admission.patient_name}</td>
                          <td>{admission.admission_number}</td>
                          <td>{admission.bed_info?.bed_number || 'N/A'}</td>
                          <td>{admission.attending_doctor_name || 'N/A'}</td>
                          <td>
                            {admission.vital_signs?.[0]?.recorded_at
                              ? new Date(admission.vital_signs[0].recorded_at).toLocaleString()
                              : 'Not recorded'}
                          </td>
                          <td>
                            <button className="btn btn-sm btn-primary" onClick={() => loadAdmission(admission.id)}>
                              <i className="bi bi-heart-pulse"></i> Record Vitals
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Patient: {selectedAdmission.patient_name}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAdmission(null)}>
                <i className="bi bi-arrow-left"></i> Back to List
              </button>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item"><div className="info-label">Admission #</div><div className="info-value">{selectedAdmission.admission_number}</div></div>
                <div className="info-item"><div className="info-label">Bed</div><div className="info-value">{selectedAdmission.bed_info?.bed_number} ({selectedAdmission.bed_info?.ward_info?.name})</div></div>
                <div className="info-item"><div className="info-label">Admitting Diagnosis</div><div className="info-value">{selectedAdmission.admitting_diagnosis}</div></div>
                <div className="info-item"><div className="info-label">Admitted On</div><div className="info-value">{new Date(selectedAdmission.admission_datetime).toLocaleString()}</div></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3 className="card-title">Record New Vitals</h3>
              </div>
              <div className="card-body">
                <div className="vitals-grid">
                  <div className="vital-item">
                    <div className="vital-label">Temperature (°C)</div>
                    <input type="number" step="0.1" className="form-input" {...field('temperature')} />
                  </div>
                  <div className="vital-item">
                    <div className="vital-label">BP Systolic</div>
                    <input type="number" className="form-input" {...field('blood_pressure_systolic')} />
                  </div>
                  <div className="vital-item">
                    <div className="vital-label">BP Diastolic</div>
                    <input type="number" className="form-input" {...field('blood_pressure_diastolic')} />
                  </div>
                  <div className="vital-item">
                    <div className="vital-label">Pulse Rate</div>
                    <input type="number" className="form-input" {...field('pulse_rate')} />
                  </div>
                  <div className="vital-item">
                    <div className="vital-label">Respiratory Rate</div>
                    <input type="number" className="form-input" {...field('respiratory_rate')} />
                  </div>
                  <div className="vital-item">
                    <div className="vital-label">O2 Saturation (%)</div>
                    <input type="number" className="form-input" {...field('oxygen_saturation')} />
                  </div>
                  <div className="vital-item">
                    <div className="vital-label">Weight (kg)</div>
                    <input type="number" step="0.1" className="form-input" {...field('weight')} />
                  </div>
                  <div className="vital-item">
                    <div className="vital-label">Pain Score (0–10)</div>
                    <input type="number" min="0" max="10" className="form-input" {...field('pain_score')} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Consciousness Level</label>
                  <select className="form-select" {...field('consciousness_level')}>
                    <option value="">Select</option>
                    <option value="Alert">Alert</option>
                    <option value="Verbal">Verbal</option>
                    <option value="Pain">Pain</option>
                    <option value="Unresponsive">Unresponsive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows="2" {...field('notes')}></textarea>
                </div>
              </div>

              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={recording}>
                  {recording
                    ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Recording...</>
                    : 'Record Vitals'}
                </button>
              </div>
            </div>
          </form>

          {vitalsHistory.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Vitals History</h3>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time</th><th>Temp</th><th>BP</th><th>Pulse</th>
                        <th>RR</th><th>SpO2</th><th>Pain</th><th>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitalsHistory.map((vitals) => (
                        <tr key={vitals.id}>
                          <td>{new Date(vitals.recorded_at).toLocaleString()}</td>
                          <td>
                            <span className={`vital-value ${getVitalStatus(parseFloat(vitals.temperature), 'temperature')}`}>
                              {vitals.temperature || '-'}°C
                            </span>
                          </td>
                          <td>
                            {vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic
                              ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}`
                              : '-'}
                          </td>
                          <td>
                            <span className={`vital-value ${getVitalStatus(vitals.pulse_rate, 'pulse_rate')}`}>
                              {vitals.pulse_rate || '-'}
                            </span>
                          </td>
                          <td>{vitals.respiratory_rate || '-'}</td>
                          <td>
                            <span className={`vital-value ${getVitalStatus(vitals.oxygen_saturation, 'oxygen_saturation')}`}>
                              {vitals.oxygen_saturation || '-'}%
                            </span>
                          </td>
                          <td>{vitals.pain_score || '-'}</td>
                          <td>{vitals.recorded_by_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}