// pages/doctor/DoctorAppointments.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentsAPI, patientsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function DoctorAppointments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [filter, setFilter] = useState('upcoming')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [patients, setPatients] = useState([])
  const [formData, setFormData] = useState({
    patient: '',
    scheduled_time: '',
    reason: '',
    symptoms: ''
  })

  useEffect(() => {
    loadAppointments()
    loadPatients()
  }, [filter])

  const loadAppointments = async () => {
    try {
      let params = { my: true }
      if (filter === 'today') params.today = true
      else if (filter === 'upcoming') params.date__gte = new Date().toISOString().split('T')[0]
      
      const data = await appointmentsAPI.list(params)
      setAppointments(data)
    } catch (err) {
      console.error('Failed to load appointments', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPatients = async () => {
    try {
      const data = await patientsAPI.list({ limit: 100 })
      setPatients(data)
    } catch (err) {
      console.error('Failed to load patients', err)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await appointmentsAPI.create({
        ...formData,
        doctor: user.id
      })
      setShowModal(false)
      setFormData({ patient: '', scheduled_time: '', reason: '', symptoms: '' })
      loadAppointments()
    } catch (err) {
      console.error('Failed to create appointment', err)
      alert(err.message || 'Failed to create appointment')
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await appointmentsAPI.update(id, { status })
      loadAppointments()
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  const getStatusBadge = (status) => {
    const badges = { SCHEDULED: 'badge-primary', IN_PROGRESS: 'badge-warning', COMPLETED: 'badge-success', CANCELLED: 'badge-danger', NO_SHOW: 'badge-neutral' }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading appointments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">My Appointments</h1>
          <p className="page-subtitle">Manage your patient appointments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New Appointment
        </button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${filter === 'today' ? 'active' : ''}`} onClick={() => setFilter('today')}>Today</button>
        <button className={`tab-btn ${filter === 'upcoming' ? 'active' : ''}`} onClick={() => setFilter('upcoming')}>Upcoming</button>
        <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
      </div>

      <div className="card">
        <div className="card-body">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-calendar-x" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No appointments found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Date & Time</th><th>Patient</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td>{new Date(apt.scheduled_time).toLocaleString()}</td>
                      <td>{apt.patient_name}</td>
                      <td>{apt.reason}</td>
                      <td><span className={`badge ${getStatusBadge(apt.status)}`}>{apt.status_display}</span></td>
                      <td>
                        {apt.status === 'SCHEDULED' && (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => navigate(`/doctor/queue?appointment=${apt.id}`)}>
                              <i className="bi bi-play-fill"></i> Start
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => updateStatus(apt.id, 'CANCELLED')}>
                              <i className="bi bi-x-circle"></i> Cancel
                            </button>
                          </>
                        )}
                        {apt.status === 'IN_PROGRESS' && (
                          <button className="btn btn-sm btn-success" onClick={() => navigate(`/doctor/queue?appointment=${apt.id}`)}>
                            <i className="bi bi-arrow-right"></i> Continue
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

      {/* New Appointment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Schedule Appointment</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Patient</label>
                  <select className="form-select" required value={formData.patient} onChange={(e) => setFormData(prev => ({ ...prev, patient: e.target.value }))}>
                    <option value="">Select patient...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.phone_number})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Date & Time</label>
                  <input type="datetime-local" className="form-input" required value={formData.scheduled_time} onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Reason</label>
                  <textarea className="form-textarea" rows="2" required value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Symptoms</label>
                  <textarea className="form-textarea" rows="2" value={formData.symptoms} onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}