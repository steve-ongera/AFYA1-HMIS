// pages/admin/AssetRegister.jsx
import React, { useState, useEffect } from 'react'
import { assetsAPI } from '../../services/api'

export default function AssetRegister() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [formData, setFormData] = useState({
    asset_id: '', asset_name: '', category: 'MEDICAL_EQUIPMENT',
    description: '', manufacturer: '', model_number: '', serial_number: '',
    purchase_date: '', purchase_cost: '', supplier: '', warranty_expiry: '',
    location: '', status: 'OPERATIONAL', condition: 'GOOD'
  })

  const categories = ['MEDICAL_EQUIPMENT', 'LABORATORY_EQUIPMENT', 'RADIOLOGY_EQUIPMENT', 'SURGICAL_EQUIPMENT', 'IT_EQUIPMENT', 'FURNITURE', 'VEHICLE', 'GENERATOR']

  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    try {
      const data = await assetsAPI.list()
      setAssets(Array.isArray(data) ? data : (data.results || []))
    } catch (err) {
      console.error('Failed to load assets', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await assetsAPI.create(formData)
      setShowModal(false)
      setFormData({
        asset_id: '', asset_name: '', category: 'MEDICAL_EQUIPMENT',
        description: '', manufacturer: '', model_number: '', serial_number: '',
        purchase_date: '', purchase_cost: '', supplier: '', warranty_expiry: '',
        location: '', status: 'OPERATIONAL', condition: 'GOOD'
      })
      loadAssets()
    } catch (err) {
      console.error('Failed to create asset', err)
      alert(err.message || 'Failed to create asset')
    }
  }

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || asset.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading assets...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Asset Register</h1>
          <p className="page-subtitle">Manage hospital equipment and assets</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> Add Asset
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="form-input"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 200 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="card-body">
          {filteredAssets.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-box-seam" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No assets found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Condition</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td>{asset.asset_id}</td>
                      <td>{asset.asset_name}</td>
                      <td>{asset.category_display}</td>
                      <td>{asset.location}</td>
                      <td>
                        <span className={`badge ${asset.status === 'OPERATIONAL' ? 'badge-success' : 'badge-warning'}`}>
                          {asset.status_display}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${asset.condition === 'GOOD' ? 'badge-success' : asset.condition === 'POOR' ? 'badge-danger' : 'badge-warning'}`}>
                          {asset.condition_display}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => setSelectedAsset(asset)}>
                          <i className="bi bi-eye"></i> View
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

      {/* Add Asset Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Asset</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Asset ID</label>
                    <input type="text" className="form-input" required value={formData.asset_id} onChange={(e) => setFormData(prev => ({ ...prev, asset_id: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Asset Name</label>
                    <input type="text" className="form-input" required value={formData.asset_name} onChange={(e) => setFormData(prev => ({ ...prev, asset_name: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}>
                      {categories.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input type="text" className="form-input" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Manufacturer</label>
                    <input type="text" className="form-input" value={formData.manufacturer} onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model Number</label>
                    <input type="text" className="form-input" value={formData.model_number} onChange={(e) => setFormData(prev => ({ ...prev, model_number: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input type="text" className="form-input" value={formData.serial_number} onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Purchase Date</label>
                    <input type="date" className="form-input" value={formData.purchase_date} onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Cost (KES)</label>
                    <input type="number" className="form-input" value={formData.purchase_cost} onChange={(e) => setFormData(prev => ({ ...prev, purchase_cost: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supplier</label>
                    <input type="text" className="form-input" value={formData.supplier} onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Warranty Expiry</label>
                    <input type="date" className="form-input" value={formData.warranty_expiry} onChange={(e) => setFormData(prev => ({ ...prev, warranty_expiry: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}>
                      <option value="OPERATIONAL">Operational</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                      <option value="RETIRED">Retired</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condition</label>
                    <select className="form-select" value={formData.condition} onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}>
                      <option value="EXCELLENT">Excellent</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="POOR">Poor</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows="2" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Asset Modal */}
      {selectedAsset && (
        <div className="modal-overlay" onClick={() => setSelectedAsset(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedAsset.asset_name}</h3>
              <button className="modal-close" onClick={() => setSelectedAsset(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Asset ID</div>
                  <div className="info-value">{selectedAsset.asset_id}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Category</div>
                  <div className="info-value">{selectedAsset.category_display}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Location</div>
                  <div className="info-value">{selectedAsset.location}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Status</div>
                  <div className="info-value">{selectedAsset.status_display}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Condition</div>
                  <div className="info-value">{selectedAsset.condition_display}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Manufacturer</div>
                  <div className="info-value">{selectedAsset.manufacturer || 'N/A'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Model Number</div>
                  <div className="info-value">{selectedAsset.model_number || 'N/A'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Serial Number</div>
                  <div className="info-value">{selectedAsset.serial_number || 'N/A'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Purchase Date</div>
                  <div className="info-value">{selectedAsset.purchase_date ? new Date(selectedAsset.purchase_date).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Purchase Cost</div>
                  <div className="info-value">KES {selectedAsset.purchase_cost?.toLocaleString() || 'N/A'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Supplier</div>
                  <div className="info-value">{selectedAsset.supplier || 'N/A'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Warranty Expiry</div>
                  <div className="info-value">{selectedAsset.warranty_expiry ? new Date(selectedAsset.warranty_expiry).toLocaleDateString() : 'N/A'}</div>
                </div>
                {selectedAsset.next_maintenance_date && (
                  <div className="info-item">
                    <div className="info-label">Next Maintenance</div>
                    <div className="info-value">{new Date(selectedAsset.next_maintenance_date).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
              {selectedAsset.description && (
                <>
                  <div className="divider"></div>
                  <div className="info-label">Description</div>
                  <div className="info-value" style={{ marginTop: 4 }}>{selectedAsset.description}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}