// pages/pharmacy/PrescriptionQueue.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { prescriptionsAPI, medicinesAPI } from '../../services/api'

export default function PrescriptionQueue() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const selectedRxId = queryParams.get('rx')

  const [prescriptions, setPrescriptions] = useState([])
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dispensing, setDispensing] = useState(false)

  useEffect(() => {
    loadPrescriptions()
  }, [])

  useEffect(() => {
    if (selectedRxId) {
      loadPrescription(selectedRxId)
    }
  }, [selectedRxId])

  const loadPrescriptions = async () => {
    try {
      const data = await prescriptionsAPI.list({ is_dispensed: false })

      // Handle DRF pagination shape: { count, next, previous, results: [...] }
      // as well as plain array responses.
      let list = []
      if (Array.isArray(data)) {
        list = data
      } else if (data && Array.isArray(data.results)) {
        list = data.results
      } else if (data && Array.isArray(data.data)) {
        list = data.data
      } else {
        console.warn('Unexpected prescriptions response shape:', data)
      }

      setPrescriptions(list)
    } catch (err) {
      console.error('Failed to load prescriptions', err)
      setPrescriptions([])
    } finally {
      setLoading(false)
    }
  }

  const loadPrescription = async (id) => {
    try {
      const data = await prescriptionsAPI.get(id)
      setSelectedPrescription(data)
    } catch (err) {
      console.error('Failed to load prescription', err)
    }
  }

  const handleDispense = async () => {
    if (!selectedPrescription) return
    setDispensing(true)
    try {
      await prescriptionsAPI.dispense(selectedPrescription.id)
      await loadPrescriptions()
      setSelectedPrescription(null)
    } catch (err) {
      console.error('Failed to dispense', err)
      alert(err.message || 'Failed to dispense medication')
    } finally {
      setDispensing(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading prescriptions...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Prescription Queue</h1>
          <p className="page-subtitle">Dispense medications to patients</p>
        </div>
      </div>

      {!selectedPrescription ? (
        <>
          {prescriptions.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-check-circle" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No pending prescriptions</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {prescriptions.map((rx) => (
                <div key={rx.id} className="queue-card">
                  <div className="queue-info" style={{ flex: 1 }}>
                    <div className="queue-name">{rx.patient_name}</div>
                    <div className="queue-meta">
                      {rx.medicine_info?.name} - {rx.quantity} {rx.medicine_info?.unit_type_display}
                    </div>
                    <div className="queue-meta">Dosage: {rx.dosage_text} | Duration: {rx.duration}</div>
                    <div className="queue-meta">Prescribed: {new Date(rx.prescribed_at).toLocaleString()}</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => loadPrescription(rx.id)}>
                    <i className="bi bi-capsule"></i> Dispense
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Dispense Prescription</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPrescription(null)}>
              <i className="bi bi-arrow-left"></i> Back to Queue
            </button>
          </div>
          <div className="card-body">
            <div className="info-grid" style={{ marginBottom: 24 }}>
              <div className="info-item"><div className="info-label">Patient</div><div className="info-value">{selectedPrescription.patient_name}</div></div>
              <div className="info-item"><div className="info-label">Medicine</div><div className="info-value">{selectedPrescription.medicine_info?.name}</div></div>
              <div className="info-item"><div className="info-label">Quantity</div><div className="info-value">{selectedPrescription.quantity} {selectedPrescription.medicine_info?.unit_type_display}</div></div>
              <div className="info-item"><div className="info-label">Dosage</div><div className="info-value">{selectedPrescription.dosage_text}</div></div>
              <div className="info-item"><div className="info-label">Duration</div><div className="info-value">{selectedPrescription.duration}</div></div>
              <div className="info-item"><div className="info-label">Instructions</div><div className="info-value">{selectedPrescription.instructions || 'Take as directed'}</div></div>
              <div className="info-item"><div className="info-label">Payment Type</div><div className="info-value">{selectedPrescription.is_insured ? 'Insurance' : 'Cash'}</div></div>
              <div className="info-item"><div className="info-label">Total Cost</div><div className="info-value">KES {selectedPrescription.total_price}</div></div>
            </div>

            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>Please verify the prescription and check stock availability before dispensing.</span>
            </div>

            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPrescription(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleDispense} disabled={dispensing}>
                {dispensing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Processing...</> : 'Confirm Dispense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}