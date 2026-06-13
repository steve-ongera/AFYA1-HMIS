// pages/procurement/PurchaseRequests.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { purchaseRequestsAPI, medicinesAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function PurchaseRequests() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [items, setItems] = useState([])
  const [formData, setFormData] = useState({
    requesting_department: 'PHARMACY',
    urgency: 'ROUTINE',
    purpose: '',
    expected_delivery_date: ''
  })
  const [newItem, setNewItem] = useState({ medicine: '', item_name: '', quantity_requested: 1, estimated_unit_price: 0 })

  useEffect(() => {
    if (id) {
      loadRequest(id)
    } else {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      const [requestsData, medicinesData] = await Promise.all([
        purchaseRequestsAPI.list(),
        medicinesAPI.list()
      ])
      setRequests(Array.isArray(requestsData) ? requestsData : (requestsData?.results ?? []))
      setMedicines(Array.isArray(medicinesData) ? medicinesData : (medicinesData?.results ?? []))
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadRequest = async (requestId) => {
    try {
      const data = await purchaseRequestsAPI.get(requestId)
      setSelectedRequest(data)
      setItems(data.items || [])
    } catch (err) {
      console.error('Failed to load request', err)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    if (newItem.medicine) {
      const medicine = medicines.find(m => m.id === parseInt(newItem.medicine))
      setItems([...items, {
        medicine: newItem.medicine,
        item_name: medicine?.name || newItem.item_name,
        quantity_requested: newItem.quantity_requested,
        estimated_unit_price: newItem.estimated_unit_price,
        estimated_total: newItem.quantity_requested * newItem.estimated_unit_price
      }])
      setNewItem({ medicine: '', item_name: '', quantity_requested: 1, estimated_unit_price: 0 })
    } else if (newItem.item_name) {
      setItems([...items, {
        item_name: newItem.item_name,
        quantity_requested: newItem.quantity_requested,
        estimated_unit_price: newItem.estimated_unit_price,
        estimated_total: newItem.quantity_requested * newItem.estimated_unit_price
      }])
      setNewItem({ medicine: '', item_name: '', quantity_requested: 1, estimated_unit_price: 0 })
    }
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (items.length === 0) {
      alert('Please add at least one item')
      return
    }
    setProcessing(true)
    try {
      await purchaseRequestsAPI.create({
        ...formData,
        items: items.map(item => ({
          medicine: item.medicine || null,
          item_name: item.item_name,
          quantity_requested: item.quantity_requested,
          estimated_unit_price: item.estimated_unit_price
        }))
      })
      setShowModal(false)
      setItems([])
      setFormData({ requesting_department: 'PHARMACY', urgency: 'ROUTINE', purpose: '', expected_delivery_date: '' })
      loadData()
    } catch (err) {
      console.error('Failed to create PR', err)
      alert(err.message || 'Failed to create purchase request')
    } finally {
      setProcessing(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedRequest) return
    setProcessing(true)
    try {
      await purchaseRequestsAPI.submit(selectedRequest.id)
      navigate('/procurement/requests')
    } catch (err) {
      console.error('Failed to submit PR', err)
      alert(err.message || 'Failed to submit')
    } finally {
      setProcessing(false)
    }
  }

  const handleApprove = async (action) => {
    if (!selectedRequest) return
    setProcessing(true)
    try {
      if (action === 'hod') await purchaseRequestsAPI.approveHOD(selectedRequest.id, { comments: prompt('Comments:') })
      if (action === 'accountant') await purchaseRequestsAPI.approveAccountant(selectedRequest.id)
      if (action === 'procurement') await purchaseRequestsAPI.approveProcurement(selectedRequest.id)
      loadRequest(selectedRequest.id)
    } catch (err) {
      console.error('Failed to approve', err)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    const reason = prompt('Rejection reason:')
    if (reason) {
      setProcessing(true)
      try {
        await purchaseRequestsAPI.reject(selectedRequest.id, { reason })
        navigate('/procurement/requests')
      } catch (err) {
        console.error('Failed to reject', err)
      } finally {
        setProcessing(false)
      }
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge-neutral', SUBMITTED: 'badge-info', APPROVED: 'badge-primary',
      APPROVED_ACCOUNTANT: 'badge-primary', APPROVED_PROCUREMENT: 'badge-success',
      REJECTED: 'badge-danger', CONVERTED_TO_PO: 'badge-success'
    }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading purchase requests...</span>
        </div>
      </div>
    )
  }

  if (selectedRequest) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">PR #{selectedRequest.request_number}</h1>
            <p className="page-subtitle">{selectedRequest.requesting_department} Department</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/procurement/requests')}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Status</div><div className="info-value"><span className={`badge ${getStatusBadge(selectedRequest.status)}`}>{selectedRequest.status}</span></div></div>
              <div className="info-item"><div className="info-label">Urgency</div><div className="info-value">{selectedRequest.urgency_display}</div></div>
              <div className="info-item"><div className="info-label">Requested By</div><div className="info-value">{selectedRequest.requested_by_name}</div></div>
              <div className="info-item"><div className="info-label">Expected Delivery</div><div className="info-value">{new Date(selectedRequest.expected_delivery_date).toLocaleDateString()}</div></div>
              <div className="info-item"><div className="info-label">Estimated Cost</div><div className="info-value">KES {selectedRequest.estimated_cost?.toLocaleString()}</div></div>
            </div>
            <div className="divider"></div>
            <div className="info-item"><div className="info-label">Purpose</div><div className="info-value">{selectedRequest.purpose}</div></div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Items Requested</h3>
          </div>
          <div className="card-body">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Item</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {selectedRequest.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.item_name} {item.medicine_name && `(${item.medicine_name})`}</td>
                      <td>{item.quantity_requested}</td>
                      <td>KES {item.estimated_unit_price}</td>
                      <td>KES {item.estimated_total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold' }}>
                    <td colSpan="3">Total</td>
                    <td>KES {selectedRequest.items?.reduce((sum, i) => sum + i.estimated_total, 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {selectedRequest.status === 'DRAFT' && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-danger" onClick={handleReject}>Delete</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={processing}>Submit for Approval</button>
          </div>
        )}

        {selectedRequest.status === 'SUBMITTED' && user.user_type === 'ADMIN' && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-danger" onClick={handleReject}>Reject</button>
            <button className="btn btn-success" onClick={() => handleApprove('hod')}>Approve as HOD</button>
          </div>
        )}

        {selectedRequest.status === 'APPROVED' && user.user_type === 'ACCOUNTANT' && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-danger" onClick={handleReject}>Reject</button>
            <button className="btn btn-success" onClick={() => handleApprove('accountant')}>Approve as Accountant</button>
          </div>
        )}

        {selectedRequest.status === 'APPROVED_ACCOUNTANT' && user.user_type === 'PROCUREMENT' && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-danger" onClick={handleReject}>Reject</button>
            <button className="btn btn-success" onClick={() => handleApprove('procurement')}>Approve as Procurement</button>
          </div>
        )}

        {selectedRequest.status === 'APPROVED_PROCUREMENT' && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate(`/procurement/orders/new?pr=${selectedRequest.id}`)}>Convert to Purchase Order</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Purchase Requests</h1>
          <p className="page-subtitle">Create and manage procurement requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New Purchase Request
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {requests.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-file-text" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No purchase requests found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>PR #</th><th>Department</th><th>Urgency</th><th>Items</th><th>Est. Cost</th><th>Status</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {requests.map((pr) => (
                    <tr key={pr.id}>
                      <td>{pr.request_number}</td>
                      <td>{pr.department_display}</td>
                      <td><span className="badge badge-neutral">{pr.urgency_display}</span></td>
                      <td>{pr.items?.length || 0} items</td>
                      <td>KES {pr.estimated_cost?.toLocaleString()}</td>
                      <td><span className={`badge ${getStatusBadge(pr.status)}`}>{pr.status}</span></td>
                      <td>{new Date(pr.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/procurement/requests/${pr.id}`)}>
                          View
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Purchase Request</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Department</label>
                    <select className="form-select" required value={formData.requesting_department} onChange={(e) => setFormData(prev => ({ ...prev, requesting_department: e.target.value }))}>
                      <option value="PHARMACY">Pharmacy</option><option value="LABORATORY">Laboratory</option>
                      <option value="RADIOLOGY">Radiology</option><option value="SURGERY">Surgery</option>
                      <option value="ICU">ICU</option><option value="WARD">Ward</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Urgency</label>
                    <select className="form-select" required value={formData.urgency} onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}>
                      <option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option><option value="EMERGENCY">Emergency</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Expected Delivery Date</label>
                    <input type="date" className="form-input" required value={formData.expected_delivery_date} onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Purpose / Justification</label>
                  <textarea className="form-textarea" rows="2" required value={formData.purpose} onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))} />
                </div>

                <div className="card" style={{ marginTop: 16 }}>
                  <div className="card-header">
                    <h3 className="card-title">Items</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 2 }}>
                        <select className="form-select" value={newItem.medicine} onChange={(e) => setNewItem(prev => ({ ...prev, medicine: e.target.value, item_name: '' }))}>
                          <option value="">Select medicine (or enter custom)</option>
                          {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <input type="text" className="form-input" placeholder="Custom item name" value={newItem.item_name} onChange={(e) => setNewItem(prev => ({ ...prev, medicine: '', item_name: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ flex: 0.5 }}>
                        <input type="number" className="form-input" placeholder="Qty" value={newItem.quantity_requested} onChange={(e) => setNewItem(prev => ({ ...prev, quantity_requested: parseInt(e.target.value) }))} />
                      </div>
                      <div className="form-group" style={{ flex: 0.5 }}>
                        <input type="number" className="form-input" placeholder="Price" value={newItem.estimated_unit_price} onChange={(e) => setNewItem(prev => ({ ...prev, estimated_unit_price: parseFloat(e.target.value) }))} />
                      </div>
                      <div className="form-group" style={{ flex: 0 }}>
                        <button type="button" className="btn btn-primary" onClick={addItem}>Add</button>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div className="table-wrapper" style={{ marginTop: 16 }}>
                        <table className="table">
                          <thead>
                            <tr><th>Item</th><th>Quantity</th><th>Unit Price</th><th>Total</th><th></th></tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.item_name} {item.medicine && medicines.find(m => m.id === parseInt(item.medicine))?.name}</td>
                                <td>{item.quantity_requested}</td>
                                <td>KES {item.estimated_unit_price}</td>
                                <td>KES {item.estimated_total}</td>
                                <td><button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem(idx)}>Remove</button></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr><td colSpan="3" style={{ textAlign: 'right' }}><strong>Total</strong></td><td><strong>KES {items.reduce((sum, i) => sum + i.estimated_total, 0).toLocaleString()}</strong></td><td></td></tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={processing || items.length === 0}>
                  {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Creating...</> : 'Create as Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}