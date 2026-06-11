// pages/procurement/GoodsReceived.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { grnAPI, purchaseOrdersAPI } from '../../services/api'

export default function GoodsReceived() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [grns, setGrns] = useState([])
  const [selectedGRN, setSelectedGRN] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedPO, setSelectedPO] = useState(null)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [formData, setFormData] = useState({
    purchase_order: '',
    delivery_note_number: '',
    invoice_number: '',
    notes: ''
  })
  const [items, setItems] = useState([])

  useEffect(() => {
    if (id) {
      loadGRN(id)
    } else {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      const [grnsData, posData] = await Promise.all([
        grnAPI.list(),
        purchaseOrdersAPI.list({ status__in: ['SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED'] })
      ])
      setGrns(grnsData)
      setPurchaseOrders(posData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadGRN = async (grnId) => {
    try {
      const data = await grnAPI.get(grnId)
      setSelectedGRN(data)
    } catch (err) {
      console.error('Failed to load GRN', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPOForGRN = async (poId) => {
    try {
      const data = await purchaseOrdersAPI.get(poId)
      setSelectedPO(data)
      setItems(data.items?.map(item => ({
        po_item: item.id,
        item_name: item.item_name,
        quantity_ordered: item.quantity_ordered,
        quantity_received: 0,
        quantity_accepted: 0,
        quantity_rejected: 0,
        batch_number: '',
        expiry_date: '',
        rejection_reason: ''
      })) || [])
    } catch (err) {
      console.error('Failed to load PO', err)
    }
  }

  const updateItem = (index, field, value) => {
    const updated = [...items]
    updated[index][field] = value
    if (field === 'quantity_received') {
      updated[index].quantity_accepted = value
    }
    setItems(updated)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setProcessing(true)
    try {
      await grnAPI.create({
        ...formData,
        items: items.map(item => ({
          po_item: item.po_item,
          quantity_received: item.quantity_received,
          quantity_accepted: item.quantity_accepted,
          quantity_rejected: item.quantity_rejected,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          rejection_reason: item.rejection_reason
        }))
      })
      setShowModal(false)
      setSelectedPO(null)
      setItems([])
      setFormData({ purchase_order: '', delivery_note_number: '', invoice_number: '', notes: '' })
      loadData()
    } catch (err) {
      console.error('Failed to create GRN', err)
      alert(err.message || 'Failed to create goods received note')
    } finally {
      setProcessing(false)
    }
  }

  const handleAccept = async () => {
    if (!selectedGRN) return
    setProcessing(true)
    try {
      await grnAPI.accept(selectedGRN.id, { inspection_notes: prompt('Inspection notes:') })
      navigate('/procurement/grn')
    } catch (err) {
      console.error('Failed to accept GRN', err)
      alert(err.message || 'Failed to accept goods')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = { PENDING: 'badge-warning', INSPECTED: 'badge-info', ACCEPTED: 'badge-success', PARTIALLY_ACCEPTED: 'badge-warning', REJECTED: 'badge-danger' }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading goods received notes...</span>
        </div>
      </div>
    )
  }

  if (selectedGRN) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">GRN #{selectedGRN.grn_number}</h1>
            <p className="page-subtitle">PO: {selectedGRN.po_number}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/procurement/grn')}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Status</div><div className="info-value"><span className={`badge ${getStatusBadge(selectedGRN.status)}`}>{selectedGRN.status}</span></div></div>
              <div className="info-item"><div className="info-label">Delivery Date</div><div className="info-value">{new Date(selectedGRN.delivery_date).toLocaleDateString()}</div></div>
              <div className="info-item"><div className="info-label">Delivery Note #</div><div className="info-value">{selectedGRN.delivery_note_number}</div></div>
              <div className="info-item"><div className="info-label">Invoice #</div><div className="info-value">{selectedGRN.invoice_number || 'N/A'}</div></div>
              <div className="info-item"><div className="info-label">Received By</div><div className="info-value">{selectedGRN.received_by_name}</div></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Received Items</h3>
          </div>
          <div className="card-body">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Item</th><th>Ordered</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>Batch #</th><th>Expiry</th></tr>
                </thead>
                <tbody>
                  {selectedGRN.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.item_name}</td>
                      <td>{item.po_item?.quantity_ordered}</td>
                      <td>{item.quantity_received}</td>
                      <td>{item.quantity_accepted}</td>
                      <td>{item.quantity_rejected}</td>
                      <td>{item.batch_number || '-'}</td>
                      <td>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedGRN.status === 'PENDING' && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-success" onClick={handleAccept} disabled={processing}>
              {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Processing...</> : 'Accept & Complete Receipt'}
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
          <h1 className="page-title">Goods Received Notes</h1>
          <p className="page-subtitle">Record and inspect received goods</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-box-seam"></i> Receive Goods
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {grns.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-box-seam" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No goods received notes found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>GRN #</th><th>PO #</th><th>Supplier</th><th>Delivery Date</th><th>Items</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {grns.map((grn) => (
                    <tr key={grn.id}>
                      <td>{grn.grn_number}</td>
                      <td>{grn.po_number}</td>
                      <td>{grn.purchase_order?.supplier_info?.supplier_name}</td>
                      <td>{new Date(grn.delivery_date).toLocaleDateString()}</td>
                      <td>{grn.items?.length || 0} items</td>
                      <td><span className={`badge ${getStatusBadge(grn.status)}`}>{grn.status}</span></td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/procurement/grn/${grn.id}`)}>
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

      {/* Receive Goods Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Receive Goods</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Purchase Order</label>
                  <select className="form-select" required value={formData.purchase_order} onChange={(e) => {
                    setFormData(prev => ({ ...prev, purchase_order: e.target.value }))
                    loadPOForGRN(e.target.value)
                  }}>
                    <option value="">Select PO...</option>
                    {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.po_number} - {po.supplier_info?.supplier_name}</option>)}
                  </select>
                </div>

                {selectedPO && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label required">Delivery Note Number</label>
                        <input type="text" className="form-input" required value={formData.delivery_note_number} onChange={(e) => setFormData(prev => ({ ...prev, delivery_note_number: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Invoice Number</label>
                        <input type="text" className="form-input" value={formData.invoice_number} onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))} />
                      </div>
                    </div>

                    <div className="table-wrapper" style={{ marginTop: 16 }}>
                      <table className="table">
                        <thead>
                          <tr><th>Item</th><th>Ordered</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>Batch #</th><th>Expiry Date</th><th>Rejection Reason</th></tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.item_name}</td>
                              <td>{item.quantity_ordered}</td>
                              <td><input type="number" className="form-input" style={{ width: 80 }} value={item.quantity_received} onChange={(e) => updateItem(idx, 'quantity_received', parseInt(e.target.value))} /></td>
                              <td><input type="number" className="form-input" style={{ width: 80 }} value={item.quantity_accepted} onChange={(e) => updateItem(idx, 'quantity_accepted', parseInt(e.target.value))} /></td>
                              <td><input type="number" className="form-input" style={{ width: 80 }} value={item.quantity_rejected} onChange={(e) => updateItem(idx, 'quantity_rejected', parseInt(e.target.value))} /></td>
                              <td><input type="text" className="form-input" style={{ width: 100 }} value={item.batch_number} onChange={(e) => updateItem(idx, 'batch_number', e.target.value)} /></td>
                              <td><input type="date" className="form-input" style={{ width: 120 }} value={item.expiry_date} onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)} /></td>
                              <td><input type="text" className="form-input" style={{ width: 150 }} value={item.rejection_reason} onChange={(e) => updateItem(idx, 'rejection_reason', e.target.value)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <textarea className="form-textarea" rows="2" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={processing || !selectedPO}>
                  {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Creating...</> : 'Create GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}