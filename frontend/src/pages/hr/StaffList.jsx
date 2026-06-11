// pages/hr/StaffList.jsx
import React, { useState, useEffect } from 'react'
import { usersAPI } from '../../services/api'

export default function StaffList() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    try {
      const data = await usersAPI.list()
      setStaff(data)
    } catch (err) {
      console.error('Failed to load staff', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = !roleFilter || s.user_type === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading staff directory...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Staff Directory</h1>
          <p className="page-subtitle">View all hospital staff members</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <i className="bi bi-search search-icon"></i>
            <input type="text" className="form-input" placeholder="Search by name, username, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 150 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option><option value="DOCTOR">Doctor</option><option value="NURSE">Nurse</option>
            <option value="RECEPTIONIST">Receptionist</option><option value="PHARMACIST">Pharmacist</option>
            <option value="LAB_TECH">Lab Technician</option><option value="CASHIER">Cashier</option>
            <option value="INSURANCE">Insurance</option><option value="PROCUREMENT">Procurement</option>
            <option value="ACCOUNTANT">Accountant</option><option value="HR">HR</option>
          </select>
        </div>
        <div className="card-body">
          {filteredStaff.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-people" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No staff members found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Username</th><th>Role</th><th>Email</th><th>Phone</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staffMember) => (
                    <tr key={staffMember.id}>
                      <td>{staffMember.full_name}</td>
                      <td>{staffMember.username}</td>
                      <td><span className={`badge badge-role-${staffMember.user_type}`}>{staffMember.user_type}</span></td>
                      <td>{staffMember.email || '-'}</td>
                      <td>{staffMember.phone_number || '-'}</td>
                      <td>{staffMember.is_active ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Inactive</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}