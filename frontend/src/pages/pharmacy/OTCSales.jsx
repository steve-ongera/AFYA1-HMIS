// pages/pharmacy/OTCSales.jsx
import React, { useState, useEffect } from 'react'
import { otcAPI, medicinesAPI } from '../../services/api'

// Normalize API responses that may be a plain array or a paginated DRF response
const toArray = (data) => {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  if (data && Array.isArray(data.data)) return data.data
  console.warn('Unexpected list response shape:', data)
  return []
}

export default function OTCSales() {
  const [sales, setSales] = useState([])
  const [medicines, setMedicines] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [formData, setFormData] = useState({
    customer_name: '',
    mpesa_code: '',
    notes: ''
  })
  const [selectedMedicine, setSelectedMedicine] = useState({ id: '', quantity: 1 })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [salesData, medicinesData] = await Promise.all([
        otcAPI.list(),
        medicinesAPI.list()
      ])
      setSales(toArray(salesData))
      setMedicines(toArray(medicinesData))
    } catch (err) {
      console.error('Failed to load data', err)
      setSales([])
      setMedicines([])
    } finally {
      setLoading(false)
    }
  }

  const addToCart = () => {
    const medicine = medicines.find(m => m.id === parseInt(selectedMedicine.id))
    if (!medicine) return
    
    const existing = cart.find(item => item.id === medicine.id)
    if (existing) {
      setCart(cart.map(item => 
        item.id === medicine.id 
          ? { ...item, quantity: item.quantity + selectedMedicine.quantity, subtotal: (item.quantity + selectedMedicine.quantity) * item.price }
          : item
      ))
    } else {
      setCart([...cart, {
        id: medicine.id,
        name: medicine.name,
        price: medicine.price_per_unit_cash,
        quantity: selectedMedicine.quantity,
        subtotal: medicine.price_per_unit_cash * selectedMedicine.quantity
      }])
    }
    setSelectedMedicine({ id: '', quantity: 1 })
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) return
    setCart(cart.map(item => 
      item.id === id 
        ? { ...item, quantity, subtotal: item.price * quantity }
        : item
    ))
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cart.length === 0) {
      alert('Please add items to cart')
      return
    }
    
    setProcessing(true)
    try {
      const sale = await otcAPI.create({
        customer_name: formData.customer_name,
        mpesa_code: formData.mpesa_code,
        total_amount: totalAmount,
        notes: formData.notes,
        items: cart.map(item => ({
          medicine: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.subtotal
        }))
      })
      
      await otcAPI.markPaid(sale.id, { mpesa_code: formData.mpesa_code })
      await otcAPI.dispense(sale.id)
      
      setShowModal(false)
      setCart([])
      setFormData({ customer_name: '', mpesa_code: '', notes: '' })
      loadData()
    } catch (err) {
      console.error('Failed to create sale', err)
      alert(err.message || 'Failed to process sale')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading OTC sales...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Over-the-Counter Sales</h1>
          <p className="page-subtitle">Process walk-in pharmacy sales</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-cart-plus"></i> New Sale
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Sales</h3>
        </div>
        <div className="card-body">
          {sales.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-cart" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No OTC sales recorded</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Sale ID</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.sale_id}</td>
                      <td>{sale.customer_name}</td>
                      <td>KES {sale.total_amount}</td>
                      <td>{sale.mpesa_code ? 'M-Pesa' : 'Cash'}</td>
                      <td>{sale.is_dispensed ? <span className="badge badge-success">Completed</span> : <span className="badge badge-warning">Pending</span>}</td>
                      <td>{new Date(sale.created_at).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => window.open(`/receipt/${sale.id}`, '_blank')}>
                          <i className="bi bi-printer"></i> Receipt
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

      {/* New Sale Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New OTC Sale</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Customer Name</label>
                    <input type="text" className="form-input" required value={formData.customer_name} onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">M-Pesa Code</label>
                    <input type="text" className="form-input" value={formData.mpesa_code} onChange={(e) => setFormData(prev => ({ ...prev, mpesa_code: e.target.value }))} placeholder="Leave blank for cash" />
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header">
                    <h3 className="card-title">Add Items</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 2 }}>
                        <select className="form-select" value={selectedMedicine.id} onChange={(e) => setSelectedMedicine(prev => ({ ...prev, id: e.target.value }))}>
                          <option value="">Select medicine...</option>
                          {medicines.map(m => (
                            <option key={m.id} value={m.id}>{m.name} - KES {m.price_per_unit_cash} (Stock: {m.quantity_in_stock})</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <input type="number" className="form-input" placeholder="Quantity" value={selectedMedicine.quantity} onChange={(e) => setSelectedMedicine(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))} />
                      </div>
                      <div className="form-group" style={{ flex: 0 }}>
                        <button type="button" className="btn btn-primary" onClick={addToCart}>Add</button>
                      </div>
                    </div>
                  </div>
                </div>

                {cart.length > 0 && (
                  <div className="table-wrapper" style={{ marginBottom: 16 }}>
                    <table className="table">
                      <thead>
                        <tr><th>Item</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr>
                      </thead>
                      <tbody>
                        {cart.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>KES {item.price}</td>
                            <td><input type="number" className="form-input" style={{ width: 80 }} value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))} /></td>
                            <td>KES {item.subtotal}</td>
                            <td><button type="button" className="btn btn-sm btn-danger" onClick={() => removeFromCart(item.id)}>Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr><td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td><td colSpan="2"><strong>KES {totalAmount}</strong></td></tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows="2" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={processing || cart.length === 0}>
                  {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Processing...</> : `Complete Sale - KES ${totalAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}