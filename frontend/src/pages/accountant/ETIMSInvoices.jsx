// pages/accountant/ETIMSInvoices.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { etimsAPI, patientsAPI, visitsAPI, otcAPI } from '../../services/api'

export default function ETIMSInvoices() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [patients, setPatients] = useState([])
  const [visits, setVisits] = useState([])
  const [otcSales, setOtcSales] = useState([])
  const [formData, setFormData] = useState({
    invoice_type: 'CONSULTATION',
    customer_name: '',
    customer_phone: '',
    customer_tin: '',
    patient: '',
    patient_visit: '',
    otc_sale: '',
    payment_method: 'CASH',
    mpesa_code: '',
    items: []
  })
  const [items, setItems] = useState([])
  const [newItem, setNewItem] = useState({ item_code: '', item_name: '', quantity: 1, unit_price: 0, tax_type: 'B' })

  useEffect(() => {
    if (id) {
      loadInvoice(id)
    } else {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      const [invoicesData, patientsData, visitsData, otcData] = await Promise.all([
        etimsAPI.invoices(),
        patientsAPI.list({ limit: 100 }),
        visitsAPI.list(),
        otcAPI.list()
      ])
      setInvoices(invoicesData)
      setPatients(patientsData)
      setVisits(visitsData)
      setOtcSales(otcData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadInvoice = async (invoiceId) => {
    try {
      const data = await etimsAPI.getInvoice(invoiceId)
      setSelectedInvoice(data)
    } catch (err) {
      console.error('Failed to load invoice', err)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    if (newItem.item_name && newItem.unit_price > 0) {
      setItems([...items, { ...newItem, total_amount: newItem.quantity * newItem.unit_price }])
      setNewItem({ item_code: '', item_name: '', quantity: 1, unit_price: 0, tax_type: 'B' })
    }
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (items.length === 0) {
      alert('Please add at least one invoice item')
      return
    }
    setProcessing(true)
    try {
      await etimsAPI.createInvoice({
        ...formData,
        items: items.map((item, idx) => ({ ...item, item_sequence: idx + 1 }))
      })
      setShowModal(false)
      setItems([])
      setFormData({
        invoice_type: 'CONSULTATION', customer_name: '', customer_phone: '', customer_tin: '',
        patient: '', patient_visit: '', otc_sale: '', payment_method: 'CASH', mpesa_code: '', items: []
      })
      loadData()
    } catch (err) {
      console.error('Failed to create invoice', err)
      alert(err.message || 'Failed to create invoice')
    } finally {
      setProcessing(false)
    }
  }

  const handleSubmitToETIMS = async () => {
    if (!selectedInvoice) return
    setProcessing(true)
    try {
      await etimsAPI.submitInvoice(selectedInvoice.id)
      navigate('/accountant/etims')
    } catch (err) {
      console.error('Failed to submit to eTIMS', err)
      alert(err.message || 'Failed to submit to eTIMS')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = { DRAFT: 'badge-warning', SUBMITTED: 'badge-info', APPROVED: 'badge-success', REJECTED: 'badge-danger', CANCELLED: 'badge-neutral' }
    return badges[status] || 'badge-neutral'
  }

  const getPaymentStatusBadge = (status) => {
    const badges = { PAID: 'badge-success', PARTIAL: 'badge-warning', PENDING: 'badge-danger' }
    return badges[status] || 'badge-neutral'
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading eTIMS invoices...</span>
        </div>
      </div>
    )
  }

  if (selectedInvoice) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">eTIMS Invoice #{selectedInvoice.invoice_number}</h1>
            <p className="page-subtitle">{selectedInvoice.customer_name}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/accountant/etims')}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Status</div><div className="info-value"><span className={`badge ${getStatusBadge(selectedInvoice.status)}`}>{selectedInvoice.status}</span></div></div>
              <div className="info-item"><div className="info-label">Payment Status</div><div className="info-value"><span className={`badge ${getPaymentStatusBadge(selectedInvoice.payment_status)}`}>{selectedInvoice.payment_status}</span></div></div>
              <div className="info-item"><div className="info-label">Invoice Date</div><div className="info-value">{new Date(selectedInvoice.invoice_date).toLocaleString()}</div></div>
              <div className="info-item"><div className="info-label">Total Amount</div><div className="info-value">KES {selectedInvoice.total_amount?.toLocaleString()}</div></div>
              {selectedInvoice.etims_invoice_number && (
                <div className="info-item"><div className="info-label">eTIMS Reference</div><div className="info-value">{selectedInvoice.etims_invoice_number}</div></div>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Invoice Items</h3>
          </div>
          <div className="card-body">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Item Code</th><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Tax Type</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.item_code || '-'}</td>
                      <td>{item.item_name}</td>
                      <td>{item.quantity}</td>
                      <td>KES {item.unit_price}</td>
                      <td>{item.tax_type === 'A' ? 'VAT 16%' : item.tax_type === 'B' ? 'Exempt' : 'Zero Rated'}</td>
                      <td>KES {item.total_amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold' }}>
                    <td colSpan="5" style={{ textAlign: 'right' }}>Total</td>
                    <td>KES {selectedInvoice.total_amount?.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {selectedInvoice.status === 'DRAFT' && selectedInvoice.etims_qr_code && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">eTIMS Verification</h3>
            </div>
            <div className="card-body" style={{ textAlign: 'center' }}>
              {selectedInvoice.etims_qr_code && (
                <div>
                  <img src={selectedInvoice.etims_qr_code} alt="eTIMS QR Code" style={{ maxWidth: 200 }} />
                  <p className="text-muted mt-2">Scan QR code to verify with KRA</p>
                  <a href={selectedInvoice.etims_verification_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Verify on KRA Portal</a>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedInvoice.status === 'DRAFT' && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSubmitToETIMS} disabled={processing}>
              {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Submitting...</> : 'Submit to KRA eTIMS'}
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
          <h1 className="page-title">eTIMS Invoices</h1>
          <p className="page-subtitle">Tax-compliant invoicing with KRA eTIMS</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> Create Invoice
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {invoices.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-file-text" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No eTIMS invoices found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Amount</th><th>eTIMS Ref</th><th>Status</th><th>Payment</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoice_number}</td>
                      <td>{invoice.customer_name}</td>
                      <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                      <td>KES {invoice.total_amount?.toLocaleString()}</td>
                      <td>{invoice.etims_invoice_number || '-'}</td>
                      <td><span className={`badge ${getStatusBadge(invoice.status)}`}>{invoice.status}</span></td>
                      <td><span className={`badge ${getPaymentStatusBadge(invoice.payment_status)}`}>{invoice.payment_status}</span></td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/accountant/etims/${invoice.id}`)}>
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

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create eTIMS Invoice</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Invoice Type</label>
                    <select className="form-select" required value={formData.invoice_type} onChange={(e) => setFormData(prev => ({ ...prev, invoice_type: e.target.value }))}>
                      <option value="CONSULTATION">Consultation</option><option value="PHARMACY">Pharmacy</option>
                      <option value="LABORATORY">Laboratory</option><option value="INPATIENT">Inpatient</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Payment Method</label>
                    <select className="form-select" required value={formData.payment_method} onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}>
                      <option value="CASH">Cash</option><option value="MPESA">M-Pesa</option><option value="CARD">Card</option><option value="INSURANCE">Insurance</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Link to Patient (Optional)</label>
                    <select className="form-select" value={formData.patient} onChange={(e) => setFormData(prev => ({ ...prev, patient: e.target.value }))}>
                      <option value="">Select patient...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} - {p.phone_number}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Customer Name</label>
                  <input type="text" className="form-input" required value={formData.customer_name} onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Phone</label>
                    <input type="tel" className="form-input" value={formData.customer_phone} onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer TIN (Optional)</label>
                    <input type="text" className="form-input" value={formData.customer_tin} onChange={(e) => setFormData(prev => ({ ...prev, customer_tin: e.target.value }))} />
                  </div>
                </div>

                {formData.payment_method === 'MPESA' && (
                  <div className="form-group">
                    <label className="form-label">M-Pesa Transaction Code</label>
                    <input type="text" className="form-input" value={formData.mpesa_code} onChange={(e) => setFormData(prev => ({ ...prev, mpesa_code: e.target.value }))} />
                  </div>
                )}

                <div className="card" style={{ marginTop: 16 }}>
                  <div className="card-header">
                    <h3 className="card-title">Invoice Items</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 2 }}>
                        <input type="text" className="form-input" placeholder="Item Code (e.g., SERV001)" value={newItem.item_code} onChange={(e) => setNewItem(prev => ({ ...prev, item_code: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ flex: 3 }}>
                        <input type="text" className="form-input" placeholder="Item Description" value={newItem.item_name} onChange={(e) => setNewItem(prev => ({ ...prev, item_name: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <input type="number" className="form-input" placeholder="Qty" value={newItem.quantity} onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) }))} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <input type="number" className="form-input" placeholder="Price" value={newItem.unit_price} onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) }))} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <select className="form-select" value={newItem.tax_type} onChange={(e) => setNewItem(prev => ({ ...prev, tax_type: e.target.value }))}>
                          <option value="A">VAT 16%</option><option value="B">Exempt</option><option value="C">Zero Rated</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 0 }}>
                        <button type="button" className="btn btn-primary" onClick={addItem}>Add</button>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div className="table-wrapper" style={{ marginTop: 16 }}>
                        <table className="table">
                          <thead>
                            <tr><th>Code</th><th>Description</th><th>Qty</th><th>Price</th><th>Tax</th><th>Total</th><th></th></tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.item_code || '-'}</td>
                                <td>{item.item_name}</td>
                                <td>{item.quantity}</td>
                                <td>KES {item.unit_price}</td>
                                <td>{item.tax_type === 'A' ? 'VAT' : item.tax_type === 'B' ? 'Exempt' : 'Zero'}</td>
                                <td>KES {item.quantity * item.unit_price}</td>
                                <td><button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem(idx)}>Remove</button></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ fontWeight: 'bold' }}>
                              <td colSpan="5" style={{ textAlign: 'right' }}>Total</td>
                              <td>KES {totalAmount.toLocaleString()}</td>
                              <td></td>
                            </tr>
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
                  {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Creating...</> : `Create Invoice - KES ${totalAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}