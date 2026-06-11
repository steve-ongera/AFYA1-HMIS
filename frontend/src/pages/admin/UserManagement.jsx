// pages/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react'
import { usersAPI } from '../../services/api'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [formData, setFormData] = useState({
    username: '', email: '', first_name: '', last_name: '',
    user_type: 'DOCTOR', phone_number: '', password: '', password_confirm: ''
  })

  const userTypes = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'CASHIER', 'INSURANCE', 'PROCUREMENT', 'ACCOUNTANT', 'HR']

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await usersAPI.list()
      setUsers(data)
    } catch (err) {
      console.error('Failed to load users', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.password_confirm) {
      alert('Passwords do not match')
      return
    }
    try {
      await usersAPI.create(formData)
      setShowModal(false)
      setFormData({ username: '', email: '', first_name: '', last_name: '', user_type: 'DOCTOR', phone_number: '', password: '', password_confirm: '' })
      loadUsers()
    } catch (err) {
      console.error('Failed to create user', err)
      alert(err.message || 'Failed to create user')
    }
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
    if (newPassword && newPassword.length >= 8) {
      try {
        await usersAPI.resetPassword(id, newPassword)
        alert('Password reset successfully')
      } catch (err) {
        console.error('Failed to reset password', err)
      }
    } else if (newPassword) {
      alert('Password must be at least 8 characters')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = !roleFilter || user.user_type === roleFilter
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
            <input type="text" className="form-input" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 150 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {userTypes.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <div className="card-body">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-person-x" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No users found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Phone</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td>{user.username}</td>
                      <td>{user.email || '-'}</td>
                      <td><span className={`badge badge-role-${user.user_type}`}>{user.user_type}</span></td>
                      <td>{user.phone_number || '-'}</td>
                      <td>
                        <button className={`btn btn-sm ${user.is_active ? 'btn-success' : 'btn-danger'}`} onClick={() => toggleUserStatus(user.id, user.is_active)}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => resetPassword(user.id)}>
                          <i className="bi bi-key"></i> Reset PW
                        </button>
                        <button className="btn btn-sm btn-info" onClick={() => setSelectedUser(user)}>
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

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New User</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Username</label><input type="text" className="form-input" required value={formData.username} onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">First Name</label><input type="text" className="form-input" required value={formData.first_name} onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label required">Last Name</label><input type="text" className="form-input" required value={formData.last_name} onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Role</label>
                    <select className="form-select" required value={formData.user_type} onChange={(e) => setFormData(prev => ({ ...prev, user_type: e.target.value }))}>
                      {userTypes.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Phone Number</label><input type="tel" className="form-input" value={formData.phone_number} onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Password</label><input type="password" className="form-input" required value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label required">Confirm Password</label><input type="password" className="form-input" required value={formData.password_confirm} onChange={(e) => setFormData(prev => ({ ...prev, password_confirm: e.target.value }))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit User: {selectedUser.full_name}</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item"><div className="info-label">Username</div><div className="info-value">{selectedUser.username}</div></div>
                <div className="info-item"><div className="info-label">Role</div><div className="info-value">{selectedUser.user_type}</div></div>
                <div className="info-item"><div className="info-label">Status</div><div className="info-value">{selectedUser.is_active ? 'Active' : 'Inactive'}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => resetPassword(selectedUser.id)}>Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}