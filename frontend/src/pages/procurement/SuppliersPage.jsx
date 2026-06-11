// pages/procurement/SuppliersPage.jsx
import React, { useState, useEffect } from 'react'
import { suppliersAPI } from '../../services/api'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [formData, setFormData] = useState({
    supplier_name: '', supplier_type: 'PHARMACEUTICAL', contact_person: '',
    phone_number: '', email: '', physical_address: '', city: '', county: '',
    pin_number: '', bank_name: '', account_number: '', credit_days: 30,
    credit_limit: 0, notes: ''
  })

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      const data = await suppliersAPI.list()
      setSuppliers(data)
    } catch (err) {
      console.error('Failed to load suppliers', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await suppliersAPI.create(formData)
      setShowModal(false)
      setFormData({
        supplier_name: '', supplier_type: 'PHARMACEUTICAL', contact_person: '',
        phone_number: '', email: '', physical_address: '', city: '', county: '',
        pin_number: '', bank_name: '', account_number: '', credit_days: 30,
        credit_limit: 0, notes: ''
      })
      loadSuppliers()
    } catch (err) {
      console.error('Failed to create supplier', err)
      alert(err.message || 'Failed to create supplier')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingSupplier) return
    try {
      await suppliersAPI.update(editingSupplier.id, formData)
      setEditingSupplier(null)
      setFormData({
        supplier_name: '', supplier_type: 'PHARMACEUTICAL', contact_person: '',
        phone_number: '', email: '', physical_address: '', city: '', county: '',
        pin_number: '', bank_name: '', account_number: '', credit_days: 30,
        credit_limit: 0, notes: ''
      })
      loadSuppliers()
    } catch (err) {
      console.error('Failed to update supplier', err)
      alert(err.message || 'Failed to update supplier')
    }
  }

  const editSupplier = (supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      supplier_name: supplier.supplier_name,
      supplier_type: supplier.supplier_type,
      contact_person: supplier.contact_person,
      phone_number: supplier.phone_number,
      email: supplier.email,
      physical_address: supplier.physical_address,
      city: supplier.city,
      county: supplier.county,
      pin_number: supplier.pin_number,
      bank_name: supplier.bank_name || '',
      account_number: supplier.account_number || '',
      credit_days: supplier.credit_days,
      credit_limit: supplier.credit_limit,
      notes: supplier.notes || ''
    })
  }

  const getStatusBadge = (status) => {
    const badges = { ACTIVE: 'badge-success', INACTIVE: 'badge-danger', BLACKLISTED: 'badge-danger', PENDING: 'badge-warning' }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading suppliers...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Supplier Management</h1>
          <p className="page-subtitle">Manage vendor and supplier information</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> Add Supplier
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {suppliers.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-building" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No suppliers found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Type</th><th>Contact</th><th>Phone</th><th>Status</th><th>Credit Limit</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>{supplier.supplier_code}</td>
                      <td>{supplier.supplier_name}</td>
                      <td>{supplier.supplier_type_display}</td>
                      <td>{supplier.contact_person}</td>
                      <td>{supplier.phone_number}</td>
                      <td><span className={`badge ${getStatusBadge(supplier.status)}`}>{supplier.status}</span></td>
                      <td>KES {supplier.credit_limit?.toLocaleString()}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => editSupplier(supplier)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Supplier Modal */}
      {(showModal || editingSupplier) && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false)
          setEditingSupplier(null)
        }}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button className="modal-close" onClick={() => {
                setShowModal(false)
                setEditingSupplier(null)
              }}>✕</button>
            </div>
            <form onSubmit={editingSupplier ? handleUpdate : handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Supplier Name</label><input type="text" className="form-input" required value={formData.supplier_name} onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label required">Supplier Type</label>
                    <select className="form-select" required value={formData.supplier_type} onChange={(e) => setFormData(prev => ({ ...prev, supplier_type: e.target.value }))}>
                      <option value="PHARMACEUTICAL">Pharmaceutical</option><option value="MEDICAL_EQUIPMENT">Medical Equipment</option>
                      <option value="LABORATORY">Laboratory</option><option value="SURGICAL">Surgical</option><option value="GENERAL">General</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Contact Person</label><input type="text" className="form-input" required value={formData.contact_person} onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label required">Phone Number</label><input type="tel" className="form-input" required value={formData.phone_number} onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label required">Email</label><input type="email" className="form-input" required value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Physical Address</label><input type="text" className="form-input" required value={formData.physical_address} onChange={(e) => setFormData(prev => ({ ...prev, physical_address: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label required">City</label><input type="text" className="form-input" required value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label required">County</label><input type="text" className="form-input" required value={formData.county} onChange={(e) => setFormData(prev => ({ ...prev, county: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">PIN Number</label><input type="text" className="form-input" required value={formData.pin_number} onChange={(e) => setFormData(prev => ({ ...prev, pin_number: e.target.value }))} /></div>
                  <div className="form-group"><label>Bank Name</label><input type="text" className="form-input" value={formData.bank_name} onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))} /></div>
                  <div className="form-group"><label>Account Number</label><input type="text" className="form-input" value={formData.account_number} onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Credit Days</label><input type="number" className="form-input" value={formData.credit_days} onChange={(e) => setFormData(prev => ({ ...prev, credit_days: parseInt(e.target.value) }))} /></div>
                  <div className="form-group"><label>Credit Limit (KES)</label><input type="number" className="form-input" value={formData.credit_limit} onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) }))} /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows="2" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowModal(false)
                  setEditingSupplier(null)
                }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingSupplier ? 'Update' : 'Add'} Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}