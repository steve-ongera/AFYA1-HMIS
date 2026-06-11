// pages/hr/LeaveManagement.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { leaveAPI, usersAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function LeaveManagement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [staff, setStaff] = useState([])
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    user: '',
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
    attachment: null
  })

  useEffect(() => {
    if (id) {
      loadLeave(id)
    } else {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      const [leavesData, typesData, staffData] = await Promise.all([
        leaveAPI.list(),
        leaveAPI.types(),
        usersAPI.list({ is_active: true })
      ])
      setLeaves(leavesData)
      setLeaveTypes(typesData)
      setStaff(staffData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLeave = async (leaveId) => {
    try {
      const data = await leaveAPI.get(leaveId)
      setSelectedLeave(data)
    } catch (err) {
      console.error('Failed to load leave', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (e) => {
    e.preventDefault()
    setProcessing(true)
    try {
      await leaveAPI.apply(formData)
      setShowModal(false)
      setFormData({ user: '', leave_type: '', start_date: '', end_date: '', reason: '', attachment: null })
      loadData()
    } catch (err) {
      console.error('Failed to apply for leave', err)
      alert(err.message || 'Failed to submit leave application')
    } finally {
      setProcessing(false)
    }
  }

  const handleApproveSupervisor = async () => {
    if (!selectedLeave) return
    setProcessing(true)
    try {
      await leaveAPI.approveSupervisor(selectedLeave.id, { comments: prompt('Supervisor comments:') })
      navigate('/hr/leave')
    } catch (err) {
      console.error('Failed to approve', err)
    } finally {
      setProcessing(false)
    }
  }

  const handleApproveHR = async () => {
    if (!selectedLeave) return
    setProcessing(true)
    try {
      await leaveAPI.approveHR(selectedLeave.id, { comments: prompt('HR comments:') })
      navigate('/hr/leave')
    } catch (err) {
      console.error('Failed to approve', err)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedLeave) return
    const reason = prompt('Rejection reason:')
    if (reason) {
      setProcessing(true)
      try {
        await leaveAPI.reject(selectedLeave.id, { reason })
        navigate('/hr/leave')
      } catch (err) {
        console.error('Failed to reject', err)
      } finally {
        setProcessing(false)
      }
    }
  }

  const getStatusBadge = (status) => {
    const badges = { PENDING: 'badge-warning', SUPERVISOR_APPROVED: 'badge-info', APPROVED: 'badge-success', REJECTED: 'badge-danger', CANCELLED: 'badge-neutral' }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading leave requests...</span>
        </div>
      </div>
    )
  }

  if (selectedLeave) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">Leave Request #{selectedLeave.application_number}</h1>
            <p className="page-subtitle">{selectedLeave.user_name} - {selectedLeave.leave_type_name}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/hr/leave')}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Status</div><div className="info-value"><span className={`badge ${getStatusBadge(selectedLeave.status)}`}>{selectedLeave.status}</span></div></div>
              <div className="info-item"><div className="info-label">Leave Type</div><div className="info-value">{selectedLeave.leave_type_name}</div></div>
              <div className="info-item"><div className="info-label">Duration</div><div className="info-value">{new Date(selectedLeave.start_date).toLocaleDateString()} to {new Date(selectedLeave.end_date).toLocaleDateString()}</div></div>
              <div className="info-item"><div className="info-label">Total Days</div><div className="info-value">{selectedLeave.total_days} days</div></div>
              <div className="info-item"><div className="info-label">Paid Leave</div><div className="info-value">{selectedLeave.is_paid ? 'Yes' : 'No'}</div></div>
              <div className="info-item"><div className="info-label">Applied On</div><div className="info-value">{new Date(selectedLeave.created_at).toLocaleString()}</div></div>
            </div>
            <div className="divider"></div>
            <div className="info-item"><div className="info-label">Reason</div><div className="info-value">{selectedLeave.reason}</div></div>
            {selectedLeave.supervisor_comments && (
              <div className="info-item"><div className="info-label">Supervisor Comments</div><div className="info-value">{selectedLeave.supervisor_comments}</div></div>
            )}
            {selectedLeave.hr_comments && (
              <div className="info-item"><div className="info-label">HR Comments</div><div className="info-value">{selectedLeave.hr_comments}</div></div>
            )}
          </div>
        </div>

        {(selectedLeave.status === 'PENDING' && user.user_type === 'ADMIN') && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-danger" onClick={handleReject} disabled={processing}>Reject</button>
            <button className="btn btn-success" onClick={handleApproveSupervisor} disabled={processing}>Approve as Supervisor</button>
          </div>
        )}

        {(selectedLeave.status === 'SUPERVISOR_APPROVED' && user.user_type === 'HR') && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-danger" onClick={handleReject} disabled={processing}>Reject</button>
            <button className="btn btn-success" onClick={handleApproveHR} disabled={processing}>Approve as HR</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Manage staff leave requests and balances</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-envelope-plus"></i> Apply for Leave
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {leaves.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-envelope" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No leave applications found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Application #</th><th>Staff</th><th>Leave Type</th><th>Dates</th><th>Days</th><th>Status</th><th>Applied</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>{leave.application_number}</td>
                      <td>{leave.user_name}</td>
                      <td>{leave.leave_type_name}</td>
                      <td>{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</td>
                      <td>{leave.total_days}</td>
                      <td><span className={`badge ${getStatusBadge(leave.status)}`}>{leave.status}</span></td>
                      <td>{new Date(leave.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/hr/leave/${leave.id}`)}>
                          Review
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

      {/* Apply for Leave Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Apply for Leave</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Staff Member</label>
                  <select className="form-select" required value={formData.user} onChange={(e) => setFormData(prev => ({ ...prev, user: e.target.value }))}>
                    <option value="">Select staff...</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.user_type})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Leave Type</label>
                  <select className="form-select" required value={formData.leave_type} onChange={(e) => setFormData(prev => ({ ...prev, leave_type: e.target.value }))}>
                    <option value="">Select leave type...</option>
                    {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.days_allowed_per_year} days/year)</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Start Date</label>
                    <input type="date" className="form-input" required value={formData.start_date} onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">End Date</label>
                    <input type="date" className="form-input" required value={formData.end_date} onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Reason</label>
                  <textarea className="form-textarea" rows="3" required value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Attachment (Optional)</label>
                  <input type="file" className="form-input" onChange={(e) => setFormData(prev => ({ ...prev, attachment: e.target.files[0] }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={processing}>Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}