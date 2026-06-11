// pages/procurement/PurchaseOrders.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { purchaseOrdersAPI, suppliersAPI, purchaseRequestsAPI } from '../../services/api'

export default function PurchaseOrders() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    purchase_request: '',
    supplier: '',
    expected_delivery_date: '',
    delivery_address: '',
    payment_terms: 'CREDIT_30',
    special_instructions: ''
  })

  useEffect(() => {
    if (id) {
      loadOrder(id)
    } else {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      const [ordersData, suppliersData] = await Promise.all([
        purchaseOrdersAPI.list(),
        suppliersAPI.list()
      ])
      setOrders(ordersData)
      setSuppliers(suppliersData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadOrder = async (orderId) => {
    try {
      const data = await purchaseOrdersAPI.get(orderId)
      setSelectedOrder(data)
    } catch (err) {
      console.error('Failed to load order', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setProcessing(true)
    try {
      await purchaseOrdersAPI.create(formData)
      setShowModal(false)
      setFormData({ purchase_request: '', supplier: '', expected_delivery_date: '', delivery_address: '', payment_terms: 'CREDIT_30', special_instructions: '' })
      loadData()
    } catch (err) {
      console.error('Failed to create PO', err)
      alert(err.message || 'Failed to create purchase order')
    } finally {
      setProcessing(false)
    }
  }

  const handleSend = async () => {
    if (!selectedOrder) return
    setProcessing(true)
    try {
      await purchaseOrdersAPI.send(selectedOrder.id)
      navigate('/procurement/orders')
    } catch (err) {
      console.error('Failed to send PO', err)
      alert(err.message || 'Failed to send purchase order')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge-neutral', SENT: 'badge-info', ACKNOWLEDGED: 'badge-primary',
      PARTIALLY_RECEIVED: 'badge-warning', FULLY_RECEIVED: 'badge-success', CANCELLED: 'badge-danger'
    }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading purchase orders...</span>
        </div>
      </div>
    )
  }

  if (selectedOrder) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">PO #{selectedOrder.po_number}</h1>
            <p className="page-subtitle">{selectedOrder.supplier_info?.supplier_name}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/procurement/orders')}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Status</div><div className="info-value"><span className={`badge ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span></div></div>
              <div className="info-item"><div className="info-label">PO Date</div><div className="info-value">{new Date(selectedOrder.po_date).toLocaleDateString()}</div></div>
              <div className="info-item"><div className="info-label">Expected Delivery</div><div className="info-value">{new Date(selectedOrder.expected_delivery_date).toLocaleDateString()}</div></div>
              <div className="info-item"><div className="info-label">Payment Terms</div><div className="info-value">{selectedOrder.payment_terms}</div></div>
              <div className="info-item"><div className="info-label">Total Amount</div><div className="info-value">KES {selectedOrder.total_amount?.toLocaleString()}</div></div>
            </div>
            <div className="divider"></div>
            <div className="info-item"><div className="info-label">Delivery Address</div><div className="info-value">{selectedOrder.delivery_address}</div></div>
            {selectedOrder.special_instructions && (
              <div className="info-item"><div className="info-label">Special Instructions</div><div className="info-value">{selectedOrder.special_instructions}</div></div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Order Items</h3>
          </div>
          <div className="card-body">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Item</th><th>Quantity Ordered</th><th>Quantity Received</th><th>Unit Price</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.item_name} {item.medicine_name && `(${item.medicine_name})`}</td>
                      <td>{item.quantity_ordered}</td>
                      <td>{item.quantity_received}</td>
                      <td>KES {item.unit_price}</td>
                      <td>KES {item.total_price}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan="4" style={{ textAlign: 'right' }}><strong>Total</strong></td><td><strong>KES {selectedOrder.total_amount?.toLocaleString()}</strong></td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {selectedOrder.status === 'DRAFT' && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSend} disabled={processing}>
              {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Sending...</> : 'Send to Supplier'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Manage supplier purchase orders</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New Purchase Order
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {orders.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-truck" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No purchase orders found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Expected</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {orders.map((po) => (
                    <tr key={po.id}>
                      <td>{po.po_number}</td>
                      <td>{po.supplier_info?.supplier_name}</td>
                      <td>{new Date(po.po_date).toLocaleDateString()}</td>
                      <td>{new Date(po.expected_delivery_date).toLocaleDateString()}</td>
                      <td>KES {po.total_amount?.toLocaleString()}</td>
                      <td><span className={`badge ${getStatusBadge(po.status)}`}>{po.status}</span></td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/procurement/orders/${po.id}`)}>
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

      {/* Create PO Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Purchase Order</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Based on Purchase Request</label>
                  <select className="form-select" value={formData.purchase_request} onChange={(e) => setFormData(prev => ({ ...prev, purchase_request: e.target.value }))}>
                    <option value="">Create from PR (optional)</option>
                    {/* Would load approved PRs here */}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Supplier</label>
                  <select className="form-select" required value={formData.supplier} onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Expected Delivery Date</label>
                  <input type="date" className="form-input" required value={formData.expected_delivery_date} onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Delivery Address</label>
                  <textarea className="form-textarea" rows="2" required value={formData.delivery_address} onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Terms</label>
                  <select className="form-select" value={formData.payment_terms} onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}>
                    <option value="CASH">Cash on Delivery</option><option value="CREDIT_30">Net 30 Days</option>
                    <option value="CREDIT_60">Net 60 Days</option><option value="PREPAID">Prepaid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Special Instructions</label>
                  <textarea className="form-textarea" rows="2" value={formData.special_instructions} onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={processing}>Create PO</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}