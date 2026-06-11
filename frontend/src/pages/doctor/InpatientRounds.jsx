// pages/doctor/InpatientRounds.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { admissionsAPI, inpatientClaimsAPI, medicineRequestsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function InpatientRounds() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [admissions, setAdmissions] = useState([])
  const [selectedAdmission, setSelectedAdmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [dischargeData, setDischargeData] = useState({
    discharge_summary: '',
    discharge_diagnosis: '',
    discharge_instructions: ''
  })

  useEffect(() => {
    loadAdmissions()
  }, [])

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.results)) return data.results
    return []
  }

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

  const loadAdmissionDetails = async (id) => {
    try {
      const data = await admissionsAPI.get(id)
      setSelectedAdmission(data)
    } catch (err) {
      console.error('Failed to load admission details', err)
    }
  }

  const handleDischarge = async () => {
    if (!selectedAdmission) return
    setUpdating(true)
    try {
      await admissionsAPI.discharge(selectedAdmission.id, dischargeData)
      await loadAdmissions()
      setSelectedAdmission(null)
      setDischargeData({ discharge_summary: '', discharge_diagnosis: '', discharge_instructions: '' })
    } catch (err) {
      console.error('Failed to discharge patient', err)
      alert(err.message || 'Failed to discharge patient')
    } finally {
      setUpdating(false)
    }
  }

  const addDailyCharge = async (type, description, amount) => {
    if (!selectedAdmission) return
    try {
      await admissionsAPI.addCharge(selectedAdmission.id, {
        charge_type: type,
        description: description,
        quantity: 1,
        unit_price: amount,
        total_amount: amount
      })
      const updated = await admissionsAPI.get(selectedAdmission.id)
      setSelectedAdmission(updated)
    } catch (err) {
      console.error('Failed to add charge', err)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading inpatient list...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Inpatient Rounds</h1>
          <p className="page-subtitle">Manage admitted patients</p>
        </div>
      </div>

      {!selectedAdmission ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Active Admissions</h3>
          </div>
          <div className="card-body">
            {admissions.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-hospital" style={{ fontSize: 48, opacity: 0.5 }}></i>
                <p className="empty-state-text">No active inpatient admissions</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Patient</th><th>Admission #</th><th>Admitted</th><th>Bed</th><th>Diagnosis</th><th>Length of Stay</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {admissions.map((admission) => (
                      <tr key={admission.id}>
                        <td>{admission.patient_name}</td>
                        <td>{admission.admission_number}</td>
                        <td>{new Date(admission.admission_datetime).toLocaleDateString()}</td>
                        <td>{admission.bed_info?.bed_number} ({admission.bed_info?.ward_info?.name})</td>
                        <td>{admission.admitting_diagnosis?.substring(0, 50)}...</td>
                        <td>Day {admission.length_of_stay}</td>
                        <td>
                          <button className="btn btn-sm btn-primary" onClick={() => loadAdmissionDetails(admission.id)}>
                            <i className="bi bi-eye"></i> View Rounds
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
                <div className="info-item"><div className="info-label">Admitted On</div><div className="info-value">{new Date(selectedAdmission.admission_datetime).toLocaleString()}</div></div>
                <div className="info-item"><div className="info-label">Bed</div><div className="info-value">{selectedAdmission.bed_info?.bed_number} ({selectedAdmission.bed_info?.ward_info?.name})</div></div>
                <div className="info-item"><div className="info-label">Attending Doctor</div><div className="info-value">{selectedAdmission.attending_doctor_name || 'Not assigned'}</div></div>
                <div className="info-item"><div className="info-label">Primary Nurse</div><div className="info-value">{selectedAdmission.primary_nurse_name || 'Not assigned'}</div></div>
                <div className="info-item"><div className="info-label">Admitting Diagnosis</div><div className="info-value">{selectedAdmission.admitting_diagnosis}</div></div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Recent Vitals</h3>
            </div>
            <div className="card-body">
              {!selectedAdmission.vital_signs?.length ? (
                <div className="empty-state"><p>No vital signs recorded</p></div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Time</th><th>Temp</th><th>BP</th><th>Pulse</th><th>RR</th><th>SpO2</th><th>Pain</th><th>Recorded By</th></tr>
                    </thead>
                    <tbody>
                      {normalizeList(selectedAdmission.vital_signs).slice(0, 5).map((vitals) => (
                        <tr key={vitals.id}>
                          <td>{new Date(vitals.recorded_at).toLocaleString()}</td>
                          <td>{vitals.temperature || '-'}°C</td>
                          <td>{vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}` : '-'}</td>
                          <td>{vitals.pulse_rate || '-'}</td>
                          <td>{vitals.respiratory_rate || '-'}</td>
                          <td>{vitals.oxygen_saturation || '-'}%</td>
                          <td>{vitals.pain_score || '-'}</td>
                          <td>{vitals.recorded_by_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Daily Charges</h3>
            </div>
            <div className="card-body">
              <div className="tag-list" style={{ marginBottom: 16 }}>
                <button className="btn btn-sm btn-secondary" onClick={() => addDailyCharge('DOCTOR_VISIT', 'Doctor Round Visit', 1500)}>
                  <i className="bi bi-plus"></i> Add Round Visit (KES 1,500)
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => addDailyCharge('PROCEDURE', 'Procedure Charge', 0)}>
                  <i className="bi bi-plus"></i> Add Procedure
                </button>
              </div>
              {!selectedAdmission.daily_charges?.length ? (
                <div className="empty-state"><p>No charges recorded</p></div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {normalizeList(selectedAdmission.daily_charges).map((charge) => (
                        <tr key={charge.id}>
                          <td>{new Date(charge.charge_date).toLocaleDateString()}</td>
                          <td>{charge.charge_type_display}</td>
                          <td>{charge.description}</td>
                          <td>KES {charge.total_amount?.toLocaleString()}</td>
                          <td>{charge.is_paid ? <span className="badge badge-success">Paid</span> : <span className="badge badge-warning">Pending</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="divider"></div>
              <div className="flex justify-between">
                <span className="font-bold">Total Charges:</span>
                <span className="font-bold">KES {selectedAdmission.total_charges?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span>KES {selectedAdmission.amount_paid?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-danger">Outstanding Balance:</span>
                <span className="text-danger">KES {selectedAdmission.outstanding_balance?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Discharge Patient</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Discharge Summary</label>
                <textarea className="form-textarea" rows="3" value={dischargeData.discharge_summary} onChange={(e) => setDischargeData(prev => ({ ...prev, discharge_summary: e.target.value }))}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Discharge Diagnosis</label>
                <textarea className="form-textarea" rows="2" value={dischargeData.discharge_diagnosis} onChange={(e) => setDischargeData(prev => ({ ...prev, discharge_diagnosis: e.target.value }))}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Discharge Instructions</label>
                <textarea className="form-textarea" rows="2" value={dischargeData.discharge_instructions} onChange={(e) => setDischargeData(prev => ({ ...prev, discharge_instructions: e.target.value }))}></textarea>
              </div>
              <button className="btn btn-danger" onClick={handleDischarge} disabled={updating}>
                {updating ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Processing...</> : 'Discharge Patient'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}