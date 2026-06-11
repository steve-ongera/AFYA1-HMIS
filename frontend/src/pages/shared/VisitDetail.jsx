// pages/shared/VisitDetail.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { visitsAPI, consultationsAPI, prescriptionsAPI, labOrdersAPI } from '../../services/api'

export default function VisitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, hasRoleOrAdmin } = useAuth()
  
  const [visit, setVisit] = useState(null)
  const [consultation, setConsultation] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [labOrders, setLabOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadVisitData()
  }, [id])

  const loadVisitData = async () => {
    setLoading(true)
    try {
      const visitData = await visitsAPI.get(id)
      setVisit(visitData)
      
      // Load consultation if exists
      if (visitData.consultation) {
        const consultationData = await consultationsAPI.get(visitData.consultation)
        setConsultation(consultationData)
        
        const [rxData, labData] = await Promise.all([
          consultationsAPI.prescriptions(consultationData.id),
          consultationsAPI.labOrders(consultationData.id)
        ])
        setPrescriptions(rxData)
        setLabOrders(labData)
      }
    } catch (err) {
      setError('Failed to load visit details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateVisitStatus = async (newStatus) => {
    try {
      await visitsAPI.updateStatus(id, { status: newStatus })
      await loadVisitData()
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading visit details...</span>
        </div>
      </div>
    )
  }

  if (error || !visit) {
    return (
      <div className="page">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{error || 'Visit not found'}</span>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Visit #{visit.visit_number}</h1>
          <p className="page-subtitle">
            Patient: {visit.patient_info?.full_name} • Arrived: {new Date(visit.arrival_time).toLocaleString()}
          </p>
        </div>
        <div className="page-actions">
          {hasRoleOrAdmin('DOCTOR') && visit.status === 'WAITING' && (
            <button className="btn btn-primary" onClick={() => updateVisitStatus('IN_CONSULTATION')}>
              <i className="bi bi-play-fill"></i> Start Consultation
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
        </div>
      </div>

      <div className="info-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-body">
            <div className="info-item">
              <div className="info-label">Visit Type</div>
              <div className="info-value">{visit.visit_type_display}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Status</div>
              <div className="info-value">
                <span className={`badge badge-${visit.status}`}>{visit.status_display}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Chief Complaint</div>
              <div className="info-value">{visit.chief_complaint}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Assigned Doctor</div>
              <div className="info-value">{visit.doctor_info?.full_name || 'Not assigned'}</div>
            </div>
          </div>
        </div>
      </div>

      {consultation && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Consultation Details</h3>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Consultation Code</div>
                  <div className="info-value">{consultation.consultation_code}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Diagnosis</div>
                  <div className="info-value">{consultation.diagnosis}</div>
                </div>
                {consultation.follow_up_date && (
                  <div className="info-item">
                    <div className="info-label">Follow-up Date</div>
                    <div className="info-value">{new Date(consultation.follow_up_date).toLocaleDateString()}</div>
                  </div>
                )}
                <div className="info-item">
                  <div className="info-label">Notes</div>
                  <div className="info-value">{consultation.notes || 'No notes'}</div>
                </div>
              </div>
            </div>
          </div>

          {prescriptions.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3 className="card-title">Prescriptions</h3>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Medicine</th><th>Quantity</th><th>Dosage</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((rx) => (
                        <tr key={rx.id}>
                          <td>{rx.medicine_info?.name}</td>
                          <td>{rx.quantity}</td>
                          <td>{rx.dosage_text}</td>
                          <td>{rx.is_dispensed ? <span className="badge badge-success">Dispensed</span> : <span className="badge badge-warning">Pending</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {labOrders.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Lab Orders</h3>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Order #</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {labOrders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.order_number}</td>
                          <td><span className={`badge ${order.priority === 'URGENT' ? 'badge-danger' : 'badge-neutral'}`}>{order.priority_display}</span></td>
                          <td><span className="badge badge-neutral">{order.status_display}</span></td>
                          <td><button className="btn btn-sm btn-ghost" onClick={() => navigate(`/laboratory/orders/${order.id}`)}><i className="bi bi-eye"></i> View</button></td>
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