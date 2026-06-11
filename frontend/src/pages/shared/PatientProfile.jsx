// pages/shared/PatientProfile.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { patientsAPI, visitsAPI, prescriptionsAPI, labOrdersAPI } from '../../services/api'

export default function PatientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, hasRoleOrAdmin } = useAuth()
  
  const [patient, setPatient] = useState(null)
  const [visits, setVisits] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [labOrders, setLabOrders] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPatientData()
  }, [id])

  const loadPatientData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [patientData, visitsData, prescriptionsData, labOrdersData] = await Promise.all([
        patientsAPI.get(id),
        patientsAPI.visits(id),
        patientsAPI.prescriptions(id),
        patientsAPI.labOrders(id)
      ])
      setPatient(patientData)
      setVisits(visitsData)
      setPrescriptions(prescriptionsData)
      setLabOrders(labOrdersData)
    } catch (err) {
      setError('Failed to load patient data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      REGISTERED: 'badge-REGISTERED',
      TRIAGED: 'badge-TRIAGED',
      WAITING: 'badge-WAITING',
      IN_CONSULTATION: 'badge-IN_CONSULTATION',
      COMPLETED: 'badge-COMPLETED',
      ADMITTED: 'badge-ADMITTED',
      CANCELLED: 'badge-CANCELLED'
    }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading patient profile...</span>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="page">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{error || 'Patient not found'}</span>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i> Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">{patient.full_name}</h1>
          <p className="page-subtitle">
            Patient ID: {patient.id_number || 'N/A'} • Age: {patient.age} • {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
          </p>
        </div>
        <div className="page-actions">
          {hasRoleOrAdmin('DOCTOR', 'NURSE', 'RECEPTIONIST') && (
            <button className="btn btn-primary" onClick={() => navigate(`/shared/visit/new?patient=${patient.id}`)}>
              <i className="bi bi-plus-circle"></i> New Visit
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <i className="bi bi-person"></i> Overview
        </button>
        <button className={`tab-btn ${activeTab === 'visits' ? 'active' : ''}`} onClick={() => setActiveTab('visits')}>
          <i className="bi bi-calendar-check"></i> Visits
          <span className="tab-count">{visits.length}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
          <i className="bi bi-capsule"></i> Prescriptions
          <span className="tab-count">{prescriptions.length}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'lab' ? 'active' : ''}`} onClick={() => setActiveTab('lab')}>
          <i className="bi bi-microscope"></i> Lab Orders
          <span className="tab-count">{labOrders.length}</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Patient Information</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Full Name</div>
                <div className="info-value">{patient.full_name}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Date of Birth</div>
                <div className="info-value">{new Date(patient.date_of_birth).toLocaleDateString()}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Age</div>
                <div className="info-value">{patient.age} years</div>
              </div>
              <div className="info-item">
                <div className="info-label">Gender</div>
                <div className="info-value">{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">ID Number</div>
                <div className="info-value">{patient.id_number || 'N/A'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Phone Number</div>
                <div className="info-value">{patient.phone_number}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Email</div>
                <div className="info-value">{patient.email || 'N/A'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Blood Type</div>
                <div className="info-value">{patient.blood_type || 'N/A'}</div>
              </div>
            </div>

            {patient.allergies && (
              <>
                <div className="divider"></div>
                <div>
                  <div className="info-label">Allergies</div>
                  <div className="info-value">{patient.allergies}</div>
                </div>
              </>
            )}

            {patient.chronic_conditions && (
              <>
                <div className="divider"></div>
                <div>
                  <div className="info-label">Chronic Conditions</div>
                  <div className="info-value">{patient.chronic_conditions}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Visit History</h3>
          </div>
          <div className="card-body">
            {visits.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-calendar-x empty-state-icon" style={{ fontSize: 48 }}></i>
                <p className="empty-state-text">No visits recorded</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Visit #</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Doctor</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((visit) => (
                      <tr key={visit.id}>
                        <td>{visit.visit_number}</td>
                        <td>{new Date(visit.arrival_time).toLocaleDateString()}</td>
                        <td>
                          <span className="badge badge-neutral">{visit.visit_type_display}</span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(visit.status)}`}>
                            {visit.status_display}
                          </span>
                        </td>
                        <td>{visit.doctor_info?.full_name || 'N/A'}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-ghost"
                            onClick={() => navigate(`/shared/visit/${visit.id}`)}
                          >
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
      )}

      {activeTab === 'prescriptions' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Prescription History</h3>
          </div>
          <div className="card-body">
            {prescriptions.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-capsule empty-state-icon" style={{ fontSize: 48 }}></i>
                <p className="empty-state-text">No prescriptions found</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Medicine</th>
                      <th>Quantity</th>
                      <th>Dosage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((rx) => (
                      <tr key={rx.id}>
                        <td>{new Date(rx.prescribed_at).toLocaleDateString()}</td>
                        <td>{rx.medicine_info?.name}</td>
                        <td>{rx.quantity}</td>
                        <td>{rx.dosage_text}</td>
                        <td>
                          {rx.is_dispensed ? (
                            <span className="badge badge-success">Dispensed</span>
                          ) : (
                            <span className="badge badge-warning">Pending</span>
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

      {activeTab === 'lab' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Lab Orders</h3>
          </div>
          <div className="card-body">
            {labOrders.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-microscope empty-state-icon" style={{ fontSize: 48 }}></i>
                <p className="empty-state-text">No lab orders found</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.order_number}</td>
                        <td>{new Date(order.ordered_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${order.priority === 'URGENT' ? 'badge-danger' : 'badge-neutral'}`}>
                            {order.priority_display}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${order.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                            {order.status_display}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-ghost">
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
      )}
    </div>
  )
}