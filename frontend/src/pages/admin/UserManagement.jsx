// pages/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react'
import { usersAPI } from '../../services/api'
import toast from 'react-hot-toast'

const toArray = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.results)) return data.results
  return []
}

const EMPTY_FORM = {
  username: '', email: '', first_name: '', last_name: '',
  user_type: 'DOCTOR', phone_number: '', password: '', password_confirm: ''
}

const USER_TYPES = [
  'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST',
  'LAB_TECH', 'CASHIER', 'INSURANCE', 'PROCUREMENT', 'ACCOUNTANT', 'HR'
]

export default function UserManagement() {
  const [users, setUsers]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchTerm, setSearchTerm]     = useState('')
  const [roleFilter, setRoleFilter]     = useState('')
  const [formData, setFormData]         = useState(EMPTY_FORM)
  const [formError, setFormError]       = useState('')
  const [submitting, setSubmitting]     = useState(false)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await usersAPI.list()
      const usersList = toArray(data)
      console.log('Loaded users:', usersList) // Debug: check what data comes back
      setUsers(usersList)
    } catch (err) {
      console.error('Failed to load users', err)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    
    if (formData.password !== formData.password_confirm) {
      setFormError('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters')
      return
    }
    
    try {
      setSubmitting(true)
      // Prepare data - remove password_confirm before sending
      const { password_confirm, ...submitData } = formData
      await usersAPI.create(submitData)
      toast.success('User created successfully')
      setShowModal(false)
      setFormData(EMPTY_FORM)
      loadUsers()
    } catch (err) {
      console.error('Failed to create user', err)
      // Parse Django validation errors
      if (err.response?.data) {
        const errors = err.response.data
        const errorMessages = []
        Object.keys(errors).forEach(key => {
          if (Array.isArray(errors[key])) {
            errorMessages.push(`${key}: ${errors[key].join(', ')}`)
          } else if (typeof errors[key] === 'string') {
            errorMessages.push(`${key}: ${errors[key]}`)
          }
        })
        setFormError(errorMessages.join('; ') || 'Failed to create user')
      } else {
        setFormError(err.message || 'Failed to create user')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const closeCreate = () => {
    setShowModal(false)
    setFormData(EMPTY_FORM)
    setFormError('')
  }

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      if (currentStatus) {
        await usersAPI.deactivate(id)
        toast.success('User deactivated')
      } else {
        await usersAPI.activate(id)
        toast.success('User activated')
      }
      loadUsers()
    } catch (err) {
      console.error('Failed to toggle status', err)
      toast.error('Failed to update user status')
    }
  }

  const resetPassword = async (id) => {
    const newPassword = prompt('Enter new password (min 8 characters):')
    if (!newPassword) return
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    try {
      await usersAPI.resetPassword(id, newPassword)
      toast.success('Password reset successfully')
    } catch (err) {
      console.error('Failed to reset password', err)
      toast.error('Failed to reset password')
    }
  }

  const filteredUsers = users.filter(u => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone_number || '').toLowerCase().includes(q)
    const matchesRole = !roleFilter || u.user_type === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading users...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system users and roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-person-plus"></i> Add User
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="search-wrapper" style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5f7a7a' }}></i>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search by name, username, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 160 }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {USER_TYPES.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
          <button className="btn btn-outline" onClick={loadUsers}>
            <i className="bi bi-arrow-repeat"></i> Refresh
          </button>
        </div>

        <div className="card-body">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-person-x" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">
                {searchTerm || roleFilter ? 'No users match your filters' : 'No users found'}
              </p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-info">
                          <div className="user-name">{u.full_name || `${u.first_name} ${u.last_name}`}</div>
                          {u.specialization && <div className="user-specialization text-muted">{u.specialization}</div>}
                        </div>
                      </td>
                      <td><code style={{ fontSize: 13 }}>{u.username}</code></td>
                      <td>{u.email ? <a href={`mailto:${u.email}`} className="email-link">{u.email}</a> : <span className="text-muted">—</span>}</td>
                      <td>
                        <span className={`badge badge-role-${u.user_type?.toLowerCase()}`}>
                          {u.user_type}
                        </span>
                      </td>
                      <td>{u.phone_number ? <a href={`tel:${u.phone_number}`}>{u.phone_number}</a> : <span className="text-muted">—</span>}</td>
                      <td>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-success' : 'btn-danger'}`}
                          onClick={() => toggleUserStatus(u.id, u.is_active)}
                          style={{ minWidth: 70 }}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-sm btn-outline" 
                          onClick={() => resetPassword(u.id)}
                          title="Reset Password"
                        >
                          <i className="bi bi-key"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-info" 
                          onClick={() => setSelectedUser(u)}
                          title="View Details"
                        >
                          <i className="bi bi-eye"></i>
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

      {/* ── Add User Modal ───────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeCreate}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New User</h3>
              <button className="modal-close" onClick={closeCreate}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <i className="bi bi-exclamation-triangle"></i> {formError}
                  </div>
                )}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label required">Username</label>
                    <input 
                      name="username" 
                      type="text" 
                      className="form-input" 
                      required
                      placeholder="e.g., johndoe"
                      value={formData.username} 
                      onChange={handleChange} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      name="email" 
                      type="email" 
                      className="form-input"
                      placeholder="john@example.com"
                      value={formData.email} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label required">First Name</label>
                    <input 
                      name="first_name" 
                      type="text" 
                      className="form-input" 
                      required
                      placeholder="John"
                      value={formData.first_name} 
                      onChange={handleChange} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Last Name</label>
                    <input 
                      name="last_name" 
                      type="text" 
                      className="form-input" 
                      required
                      placeholder="Doe"
                      value={formData.last_name} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label required">Role</label>
                    <select 
                      name="user_type" 
                      className="form-select" 
                      required
                      value={formData.user_type} 
                      onChange={handleChange}
                    >
                      {USER_TYPES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input 
                      name="phone_number" 
                      type="tel" 
                      className="form-input"
                      placeholder="+254 700 000 000"
                      value={formData.phone_number} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label required">Password</label>
                    <input 
                      name="password" 
                      type="password" 
                      className="form-input" 
                      required
                      placeholder="Min 8 characters"
                      value={formData.password} 
                      onChange={handleChange} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Confirm Password</label>
                    <input 
                      name="password_confirm" 
                      type="password" 
                      className="form-input" 
                      required
                      placeholder="Confirm password"
                      value={formData.password_confirm} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={closeCreate}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner spinner-sm"></span> Creating…</> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── User Detail Modal ──────────────────────────────────────────────── */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">User Details</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="user-detail-avatar" style={{ textAlign: 'center', marginBottom: 24 }}>
                <div className="avatar-lg" style={{ 
                  width: 80, height: 80, borderRadius: '50%', background: '#0a6e6e', 
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 32, fontWeight: 600
                }}>
                  {selectedUser.full_name?.charAt(0) || selectedUser.username?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div className="info-label" style={{ fontWeight: 600, color: '#1a2e2e' }}>Full Name:</div>
                <div className="info-value">{selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name}`}</div>
                
                <div className="info-label" style={{ fontWeight: 600, color: '#1a2e2e' }}>Username:</div>
                <div className="info-value"><code>{selectedUser.username}</code></div>
                
                <div className="info-label" style={{ fontWeight: 600, color: '#1a2e2e' }}>Email:</div>
                <div className="info-value">{selectedUser.email || <span className="text-muted">Not provided</span>}</div>
                
                <div className="info-label" style={{ fontWeight: 600, color: '#1a2e2e' }}>Phone:</div>
                <div className="info-value">{selectedUser.phone_number || <span className="text-muted">Not provided</span>}</div>
                
                <div className="info-label" style={{ fontWeight: 600, color: '#1a2e2e' }}>Role:</div>
                <div className="info-value">
                  <span className={`badge badge-role-${selectedUser.user_type?.toLowerCase()}`}>
                    {selectedUser.user_type}
                  </span>
                </div>
                
                <div className="info-label" style={{ fontWeight: 600, color: '#1a2e2e' }}>Status:</div>
                <div className="info-value">
                  {selectedUser.is_active
                    ? <span className="badge badge-success">Active</span>
                    : <span className="badge badge-danger">Inactive</span>}
                </div>
                
                {selectedUser.specialization && (
                  <>
                    <div className="info-label" style={{ fontWeight: 600, color: '#1a2e2e' }}>Specialization:</div>
                    <div className="info-value">{selectedUser.specialization}</div>
                  </>
                )}
                
                {selectedUser.license_number && (
                  <>
                    <div className="info-label" style={{ fontWeight: 600, color: '#1a2e2e' }}>License Number:</div>
                    <div className="info-value">{selectedUser.license_number}</div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 16 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
                Close
              </button>
              <button
                className={`btn ${selectedUser.is_active ? 'btn-danger' : 'btn-success'}`}
                onClick={() => { 
                  toggleUserStatus(selectedUser.id, selectedUser.is_active)
                  setSelectedUser(null)
                }}
              >
                {selectedUser.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  resetPassword(selectedUser.id)
                  setSelectedUser(null)
                }}
              >
                <i className="bi bi-key"></i> Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .user-info {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: 500;
        }
        .user-specialization {
          font-size: 11px;
        }
        .text-muted {
          color: #5f7a7a;
        }
        .email-link, .phone-link {
          color: #0a6e6e;
          text-decoration: none;
        }
        .email-link:hover, .phone-link:hover {
          text-decoration: underline;
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
        .avatar-lg {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  )
}