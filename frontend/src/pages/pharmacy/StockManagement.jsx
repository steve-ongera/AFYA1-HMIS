// pages/pharmacy/StockManagement.jsx
import React, { useState, useEffect } from 'react'
import { medicinesAPI, stockAPI } from '../../services/api'

// Normalize API responses that may be a plain array or a paginated DRF response
const toArray = (data) => {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  if (data && Array.isArray(data.data)) return data.data
  console.warn('Unexpected list response shape:', data)
  return []
}

export default function StockManagement() {
  const [medicines, setMedicines] = useState([])
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '', category: '', manufacturer: '', unit_type: 'TABLET',
    units_per_pack: 10, pack_name: 'Strip', quantity_in_stock: 0,
    reorder_level: 100, cost_per_unit_cash: 0, price_per_unit_cash: 0,
    price_per_unit_insurance: 0, expiry_date: '', batch_number: ''
  })
  const [adjustData, setAdjustData] = useState({
    quantity: 0, movement_type: 'ADJUSTMENT', reason: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [medicinesData, categoriesData] = await Promise.all([
        medicinesAPI.list(),
        medicinesAPI.categories()
      ])
      setMedicines(toArray(medicinesData))
      setCategories(toArray(categoriesData))
    } catch (err) {
      console.error('Failed to load data', err)
      setMedicines([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await medicinesAPI.create(formData)
      setShowModal(false)
      setFormData({
        name: '', category: '', manufacturer: '', unit_type: 'TABLET',
        units_per_pack: 10, pack_name: 'Strip', quantity_in_stock: 0,
        reorder_level: 100, cost_per_unit_cash: 0, price_per_unit_cash: 0,
        price_per_unit_insurance: 0, expiry_date: '', batch_number: ''
      })
      loadData()
    } catch (err) {
      console.error('Failed to create medicine', err)
      alert(err.message || 'Failed to create medicine')
    }
  }

  const handleAdjustStock = async () => {
    if (!selectedMedicine) return
    try {
      await medicinesAPI.adjustStock(selectedMedicine.id, adjustData)
      setShowAdjustModal(false)
      setSelectedMedicine(null)
      setAdjustData({ quantity: 0, movement_type: 'ADJUSTMENT', reason: '' })
      loadData()
    } catch (err) {
      console.error('Failed to adjust stock', err)
      alert(err.message || 'Failed to adjust stock')
    }
  }

  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         med.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || med.category === parseInt(categoryFilter)
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading stock data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Stock Management</h1>
          <p className="page-subtitle">Manage medicine inventory</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> Add Medicine
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <i className="bi bi-search search-icon"></i>
            <input type="text" className="form-input" placeholder="Search medicines..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 200 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="card-body">
          {filteredMedicines.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-box-seam" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No medicines found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Category</th><th>Stock</th><th>Unit Price</th><th>Expiry</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredMedicines.map((med) => (
                    <tr key={med.id}>
                      <td>{med.name}</td>
                      <td>{med.category_name || '-'}</td>
                      <td>
                        <span className={med.is_low_stock ? 'text-danger font-bold' : ''}>
                          {med.quantity_in_stock} {med.unit_type_display}
                        </span>
                        {med.is_low_stock && <span className="badge badge-danger">Low Stock</span>}
                      </td>
                      <td>KES {med.price_per_unit_cash}</td>
                      <td>{med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        {med.expiry_date && new Date(med.expiry_date) < new Date() ? 
                          <span className="badge badge-danger">Expired</span> : 
                          <span className="badge badge-success">Active</span>
                        }
                      </td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => {
                          setSelectedMedicine(med)
                          setShowAdjustModal(true)
                        }}>
                          <i className="bi bi-pencil"></i> Adjust
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

      {/* Add Medicine Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Medicine</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Name</label><input type="text" className="form-input" required value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Manufacturer</label><input type="text" className="form-input" value={formData.manufacturer} onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))} /></div>
                  <div className="form-group"><label>Batch Number</label><input type="text" className="form-input" value={formData.batch_number} onChange={(e) => setFormData(prev => ({ ...prev, batch_number: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Unit Type</label><select className="form-select" value={formData.unit_type} onChange={(e) => setFormData(prev => ({ ...prev, unit_type: e.target.value }))}><option value="TABLET">Tablet</option><option value="CAPSULE">Capsule</option><option value="SYRUP_ML">Syrup (ML)</option><option value="INJECTION">Injection</option><option value="CREAM_TUBE">Cream/Ointment</option></select></div>
                  <div className="form-group"><label>Units per Pack</label><input type="number" className="form-input" value={formData.units_per_pack} onChange={(e) => setFormData(prev => ({ ...prev, units_per_pack: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Initial Stock</label><input type="number" className="form-input" value={formData.quantity_in_stock} onChange={(e) => setFormData(prev => ({ ...prev, quantity_in_stock: e.target.value }))} /></div>
                  <div className="form-group"><label>Reorder Level</label><input type="number" className="form-input" value={formData.reorder_level} onChange={(e) => setFormData(prev => ({ ...prev, reorder_level: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Cost per Unit (Cash)</label><input type="number" step="0.01" className="form-input" value={formData.cost_per_unit_cash} onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit_cash: e.target.value }))} /></div>
                  <div className="form-group"><label>Price per Unit (Cash)</label><input type="number" step="0.01" className="form-input" value={formData.price_per_unit_cash} onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit_cash: e.target.value }))} /></div>
                  <div className="form-group"><label>Price per Unit (Insurance)</label><input type="number" step="0.01" className="form-input" value={formData.price_per_unit_insurance} onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit_insurance: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Expiry Date</label><input type="date" className="form-input" value={formData.expiry_date} onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Medicine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedMedicine && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Adjust Stock - {selectedMedicine.name}</h3>
              <button className="modal-close" onClick={() => setShowAdjustModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid" style={{ marginBottom: 16 }}>
                <div className="info-item"><div className="info-label">Current Stock</div><div className="info-value">{selectedMedicine.quantity_in_stock}</div></div>
                <div className="info-item"><div className="info-label">Reorder Level</div><div className="info-value">{selectedMedicine.reorder_level}</div></div>
              </div>
              <div className="form-group">
                <label className="form-label">Movement Type</label>
                <select className="form-select" value={adjustData.movement_type} onChange={(e) => setAdjustData(prev => ({ ...prev, movement_type: e.target.value }))}>
                  <option value="PURCHASE">Purchase (Add Stock)</option>
                  <option value="SALE">Sale (Remove Stock)</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="RETURN">Return</option>
                  <option value="DAMAGE">Damage/Expired</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input type="number" className="form-input" value={adjustData.quantity} onChange={(e) => setAdjustData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))} />
                <div className="form-hint">Positive = Add stock, Negative = Remove stock</div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" rows="2" value={adjustData.reason} onChange={(e) => setAdjustData(prev => ({ ...prev, reason: e.target.value }))}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdjustStock}>Apply Adjustment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}