// pages/laboratory/LabOrders.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { labOrdersAPI, labTestsAPI } from '../../services/api'

export default function LabOrders() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [resultData, setResultData] = useState({})

  useEffect(() => {
    loadData()
  }, [filter])

  useEffect(() => {
    if (id) {
      loadOrder(id)
    }
  }, [id])

  const loadData = async () => {
    try {
      let params = {}
      if (filter === 'pending') params.status = 'PENDING'
      else if (filter === 'collected') params.status = 'SAMPLE_COLLECTED'
      else if (filter === 'completed') params.status = 'COMPLETED'
      else if (filter === 'reported') params.status = 'REPORTED'
      
      const [ordersData, testsData] = await Promise.all([
        labOrdersAPI.list(params),
        labTestsAPI.list()
      ])
      setOrders(ordersData)
      setTests(testsData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadOrder = async (orderId) => {
    try {
      const data = await labOrdersAPI.get(orderId)
      setSelectedOrder(data)
      // Initialize result data for each test
      const results = {}
      data.test_items?.forEach(item => {
        results[item.id] = {
          result_value: item.result_value || '',
          result_unit: item.result_unit || '',
          is_abnormal: item.is_abnormal || false,
          notes: item.notes || ''
        }
      })
      setResultData(results)
    } catch (err) {
      console.error('Failed to load order', err)
    }
  }

  const handleCollectSample = async () => {
    if (!selectedOrder) return
    setProcessing(true)
    try {
      await labOrdersAPI.collectSample(selectedOrder.id)
      await loadOrder(selectedOrder.id)
    } catch (err) {
      console.error('Failed to collect sample', err)
      alert(err.message || 'Failed to collect sample')
    } finally {
      setProcessing(false)
    }
  }

  const handleEnterResults = async () => {
    if (!selectedOrder) return
    setProcessing(true)
    try {
      const items = selectedOrder.test_items.map(item => ({
        id: item.id,
        result_value: resultData[item.id]?.result_value || '',
        result_unit: resultData[item.id]?.result_unit || '',
        is_abnormal: resultData[item.id]?.is_abnormal || false,
        notes: resultData[item.id]?.notes || ''
      }))
      
      await labOrdersAPI.enterResults(selectedOrder.id, {
        items,
        summary: document.getElementById('summary')?.value || '',
        interpretation: document.getElementById('interpretation')?.value || '',
        is_critical: document.getElementById('is_critical')?.checked || false
      })
      await loadOrder(selectedOrder.id)
    } catch (err) {
      console.error('Failed to enter results', err)
      alert(err.message || 'Failed to enter results')
    } finally {
      setProcessing(false)
    }
  }

  const handleReleaseResults = async () => {
    if (!selectedOrder) return
    setProcessing(true)
    try {
      await labOrdersAPI.release(selectedOrder.id)
      await loadOrder(selectedOrder.id)
      navigate('/laboratory/orders')
    } catch (err) {
      console.error('Failed to release results', err)
      alert(err.message || 'Failed to release results')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = { PENDING: 'badge-warning', SAMPLE_COLLECTED: 'badge-info', IN_PROGRESS: 'badge-primary', COMPLETED: 'badge-success', REPORTED: 'badge-success' }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading lab orders...</span>
        </div>
      </div>
    )
  }

  if (selectedOrder) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">Lab Order #{selectedOrder.order_number}</h1>
            <p className="page-subtitle">Patient: {selectedOrder.patient_name}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>
            <i className="bi bi-arrow-left"></i> Back to List
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Order Information</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Ordered By</div><div className="info-value">{selectedOrder.ordered_by_name}</div></div>
              <div className="info-item"><div className="info-label">Ordered At</div><div className="info-value">{new Date(selectedOrder.ordered_at).toLocaleString()}</div></div>
              <div className="info-item"><div className="info-label">Priority</div><div className="info-value"><span className={`badge ${selectedOrder.priority === 'URGENT' ? 'badge-danger' : 'badge-neutral'}`}>{selectedOrder.priority_display}</span></div></div>
              <div className="info-item"><div className="info-label">Status</div><div className="info-value"><span className={`badge ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status_display}</span></div></div>
              <div className="info-item"><div className="info-label">Clinical Notes</div><div className="info-value">{selectedOrder.clinical_notes || 'None'}</div></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Test Items</h3>
          </div>
          <div className="card-body">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Test</th><th>Sample Type</th><th>Status</th><th>Result</th><th>Unit</th><th>Abnormal</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {selectedOrder.test_items?.map((item) => (
                    <tr key={item.id}>
                      <td>{item.test_info?.test_name}</td>
                      <td>{item.test_info?.sample_type_display}</td>
                      <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                      <td>
                        {selectedOrder.status === 'IN_PROGRESS' || selectedOrder.status === 'COMPLETED' ? (
                          <input type="text" className="form-input" style={{ width: 120 }} value={resultData[item.id]?.result_value || ''} onChange={(e) => setResultData(prev => ({ ...prev, [item.id]: { ...prev[item.id], result_value: e.target.value } }))} />
                        ) : item.result_value || '-'}
                      </td>
                      <td>
                        {selectedOrder.status === 'IN_PROGRESS' || selectedOrder.status === 'COMPLETED' ? (
                          <input type="text" className="form-input" style={{ width: 80 }} value={resultData[item.id]?.result_unit || ''} onChange={(e) => setResultData(prev => ({ ...prev, [item.id]: { ...prev[item.id], result_unit: e.target.value } }))} />
                        ) : item.result_unit || '-'}
                      </td>
                      <td>
                        {selectedOrder.status === 'IN_PROGRESS' || selectedOrder.status === 'COMPLETED' ? (
                          <input type="checkbox" checked={resultData[item.id]?.is_abnormal || false} onChange={(e) => setResultData(prev => ({ ...prev, [item.id]: { ...prev[item.id], is_abnormal: e.target.checked } }))} />
                        ) : item.is_abnormal ? <span className="badge badge-danger">Abnormal</span> : <span className="badge badge-success">Normal</span>}
                      </td>
                      <td>
                        {selectedOrder.status === 'IN_PROGRESS' || selectedOrder.status === 'COMPLETED' ? (
                          <input type="text" className="form-input" style={{ width: 150 }} value={resultData[item.id]?.notes || ''} onChange={(e) => setResultData(prev => ({ ...prev, [item.id]: { ...prev[item.id], notes: e.target.value } }))} />
                        ) : item.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {(selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'REPORTED') && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Result Summary</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Summary</label>
                <textarea id="summary" className="form-textarea" rows="3" defaultValue={selectedOrder.result?.summary}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Interpretation</label>
                <textarea id="interpretation" className="form-textarea" rows="2" defaultValue={selectedOrder.result?.interpretation}></textarea>
              </div>
              <div className="form-group">
                <label className="form-checkbox">
                  <input id="is_critical" type="checkbox" defaultChecked={selectedOrder.result?.is_critical} />
                  Critical Value - Notify Doctor Immediately
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {selectedOrder.status === 'PENDING' && (
            <button className="btn btn-primary" onClick={handleCollectSample} disabled={processing}>
              {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Processing...</> : 'Collect Sample'}
            </button>
          )}
          {selectedOrder.status === 'SAMPLE_COLLECTED' && (
            <button className="btn btn-primary" onClick={handleEnterResults} disabled={processing}>
              {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Processing...</> : 'Enter Results'}
            </button>
          )}
          {selectedOrder.status === 'COMPLETED' && (
            <button className="btn btn-success" onClick={handleReleaseResults} disabled={processing}>
              {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Processing...</> : 'Release Results to Doctor'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Lab Orders</h1>
          <p className="page-subtitle">Process laboratory requests</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
        <button className={`tab-btn ${filter === 'collected' ? 'active' : ''}`} onClick={() => setFilter('collected')}>Sample Collected</button>
        <button className={`tab-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
        <button className={`tab-btn ${filter === 'reported' ? 'active' : ''}`} onClick={() => setFilter('reported')}>Reported</button>
      </div>

      <div className="card">
        <div className="card-body">
          {orders.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-microscope" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No lab orders found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Order #</th><th>Patient</th><th>Ordered</th><th>Priority</th><th>Tests</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.order_number}</td>
                      <td>{order.patient_name}</td>
                      <td>{new Date(order.ordered_at).toLocaleDateString()}</td>
                      <td><span className={`badge ${order.priority === 'URGENT' ? 'badge-danger' : 'badge-neutral'}`}>{order.priority_display}</span></td>
                      <td>{order.test_items?.length} tests</td>
                      <td><span className={`badge ${getStatusBadge(order.status)}`}>{order.status_display}</span></td>
                      <td><button className="btn btn-sm btn-primary" onClick={() => loadOrder(order.id)}>Process</button></td>
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