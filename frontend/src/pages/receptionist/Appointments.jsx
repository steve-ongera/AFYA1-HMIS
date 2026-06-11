// pages/receptionist/Appointments.jsx
import React, { useState, useEffect } from 'react'
import { appointmentsAPI, patientsAPI, doctorsAPI } from '../../services/api'

export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    scheduled_time: '',
    reason: '',
    symptoms: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('today')

  useEffect(() => {
    loadData()
  }, [dateFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = dateFilter === 'today' ? { today: true } : {}
      const [apptsData, patientsData, doctorsData] = await Promise.all([
        appointmentsAPI.list(params),
        patientsAPI.list({ limit: 100 }),
        doctorsAPI.list({ is_active: true })
      ])
      setAppointments(apptsData)
      setPatients(patientsData)
      setDoctors(doctorsData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await appointmentsAPI.create(formData)
      setShowModal(false)
      setFormData({ patient: '', doctor: '', scheduled_time: '', reason: '', symptoms: '' })
      loadData()
    } catch (err) {
      console.error('Failed to create appointment', err)
      alert(err.message || 'Failed to create appointment')
    }
  }

  const handleCancel = async (id) => {
    if (window.confirm('Cancel this appointment?')) {
      try {
        await appointmentsAPI.update(id, { status: 'CANCELLED' })
        loadData()
      } catch (err) {
        console.error('Failed to cancel', err)
      }
    }
  }

  const filteredAppointments = appointments.filter(a => 
    a.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Schedule and manage patient appointments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New Appointment
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <i className="bi bi-search search-icon"></i>
            <input type="text" className="form-input" placeholder="Search by patient or doctor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 120 }} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="card-body">
          {filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-calendar-x" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No appointments found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Date & Time</th><th>Patient</th><th>Doctor</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt) => (
                    <tr key={apt.id}>
                      <td>{new Date(apt.scheduled_time).toLocaleString()}</td>
                      <td>{apt.patient_name}</td>
                      <td>{apt.doctor_name}</td>
                      <td>{apt.reason}</td>
                      <td>
                        <span className={`badge badge-${apt.status === 'SCHEDULED' ? 'primary' : apt.status === 'COMPLETED' ? 'success' : 'danger'}`}>
                          {apt.status_display}
                        </span>
                      </td>
                      <td>
                        {apt.status === 'SCHEDULED' && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleCancel(apt.id)}>
                            <i className="bi bi-x-circle"></i> Cancel
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
                  <label className="form-label required">Doctor</label>
                  <select className="form-select" required value={formData.doctor} onChange={(e) => setFormData(prev => ({ ...prev, doctor: e.target.value }))}>
                    <option value="">Select doctor...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
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