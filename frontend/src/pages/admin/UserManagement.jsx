// pages/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react'
import { usersAPI } from '../../services/api'

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
      const data = await usersAPI.list()
      setUsers(toArray(data))          // ← safe regardless of pagination
    } catch (err) {
      console.error('Failed to load users', err)
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
      await usersAPI.create(formData)
      setShowModal(false)
      setFormData(EMPTY_FORM)
      loadUsers()
    } catch (err) {
      console.error('Failed to create user', err)
      setFormError(err?.response?.data?.detail || err.message || 'Failed to create user')
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
      } else {
        await usersAPI.activate(id)
      }
      loadUsers()
    } catch (err) {
      console.error('Failed to toggle status', err)
    }
  }

  const resetPassword = async (id) => {
    const newPassword = prompt('Enter new password (min 8 characters):')
    if (!newPassword) return
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }
    try {
      await usersAPI.resetPassword(id, newPassword)
      alert('Password reset successfully')
    } catch (err) {
      console.error('Failed to reset password', err)
      alert('Failed to reset password')
    }
  }

  const filteredUsers = users.filter(u => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
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
        <div className="card-header">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="form-input"
              placeholder="Search users..."
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
            <div className="table-wrapper">
              <table className="table">
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
                      <td>{u.full_name}</td>
                      <td>{u.username}</td>
                      <td>{u.email || '—'}</td>
                      <td>
                        <span className={`badge badge-role-${u.user_type?.toLowerCase()}`}>
                          {u.user_type}
                        </span>
                      </td>
                      <td>{u.phone_number || '—'}</td>
                      <td>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-success' : 'btn-danger'}`}
                          onClick={() => toggleUserStatus(u.id, u.is_active)}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => resetPassword(u.id)}>
                          <i className="bi bi-key"></i> Reset PW
                        </button>
                        <button className="btn btn-sm btn-info" onClick={() => setSelectedUser(u)}>
                          <i className="bi bi-pencil"></i> Edit
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
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Username</label>
                    <input name="username" type="text" className="form-input" required
                      value={formData.username} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input name="email" type="email" className="form-input"
                      value={formData.email} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">First Name</label>
                    <input name="first_name" type="text" className="form-input" required
                      value={formData.first_name} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Last Name</label>
                    <input name="last_name" type="text" className="form-input" required
                      value={formData.last_name} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Role</label>
                    <select name="user_type" className="form-select" required
                      value={formData.user_type} onChange={handleChange}>
                      {USER_TYPES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input name="phone_number" type="tel" className="form-input"
                      value={formData.phone_number} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Password</label>
                    <input name="password" type="password" className="form-input" required
                      value={formData.password} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Confirm Password</label>
                    <input name="password_confirm" type="password" className="form-input" required
                      value={formData.password_confirm} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
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

      {/* ── Edit User Modal ──────────────────────────────────────────────── */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit User: {selectedUser.full_name}</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Username</div>
                  <div className="info-value">{selectedUser.username}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Role</div>
                  <div className="info-value">
                    <span className={`badge badge-role-${selectedUser.user_type?.toLowerCase()}`}>
                      {selectedUser.user_type}
                    </span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Email</div>
                  <div className="info-value">{selectedUser.email || '—'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Phone</div>
                  <div className="info-value">{selectedUser.phone_number || '—'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Status</div>
                  <div className="info-value">
                    {selectedUser.is_active
                      ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-danger">Inactive</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
                Close
              </button>
              <button
                className={`btn ${selectedUser.is_active ? 'btn-danger' : 'btn-success'}`}
                onClick={() => { toggleUserStatus(selectedUser.id, selectedUser.is_active); setSelectedUser(null) }}
              >
                {selectedUser.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button className="btn btn-primary" onClick={() => resetPassword(selectedUser.id)}>
                <i className="bi bi-key"></i> Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}