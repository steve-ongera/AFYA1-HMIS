// pages/doctor/DoctorLabResults.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { labOrdersAPI, labResultsAPI } from '../../services/api'

export default function DoctorLabResults() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadOrderDetails(id)
    } else {
      loadOrders()
    }
  }, [id])

  const loadOrders = async () => {
    try {
      const data = await labOrdersAPI.list({ status: 'REPORTED' })
      setOrders(data)
    } catch (err) {
      console.error('Failed to load lab orders', err)
    } finally {
      setLoading(false)
    }
  }

  const loadOrderDetails = async (orderId) => {
    try {
      const [orderData, resultData] = await Promise.all([
        labOrdersAPI.get(orderId),
        labResultsAPI.list({ lab_order: orderId })
      ])
      setSelectedOrder(orderData)
      setResult(resultData[0])
    } catch (err) {
      console.error('Failed to load order details', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsReviewed = async () => {
    // In production, mark result as reviewed by doctor
    navigate('/doctor/lab-results')
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading lab results...</span>
        </div>
      </div>
    )
  }

  if (id && selectedOrder) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">Lab Results</h1>
            <p className="page-subtitle">{selectedOrder.order_number} - {selectedOrder.patient_name}</p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/doctor/lab-results')}>
              <i className="bi bi-arrow-left"></i> Back to List
            </button>
            <button className="btn btn-primary" onClick={markAsReviewed}>
              <i className="bi bi-check2-circle"></i> Mark as Reviewed
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Order Information</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Order #</div><div className="info-value">{selectedOrder.order_number}</div></div>
              <div className="info-item"><div className="info-label">Ordered By</div><div className="info-value">{selectedOrder.ordered_by_name}</div></div>
              <div className="info-item"><div className="info-label">Ordered At</div><div className="info-value">{new Date(selectedOrder.ordered_at).toLocaleString()}</div></div>
              <div className="info-item"><div className="info-label">Priority</div><div className="info-value"><span className={`badge ${selectedOrder.priority === 'URGENT' ? 'badge-danger' : 'badge-neutral'}`}>{selectedOrder.priority_display}</span></div></div>
              <div className="info-item"><div className="info-label">Clinical Notes</div><div className="info-value">{selectedOrder.clinical_notes || 'None'}</div></div>
            </div>
          </div>
        </div>

        {result && (
          <>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3 className="card-title">Test Results</h3>
                {result.is_critical && <span className="badge badge-danger">CRITICAL VALUE</span>}
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Test</th><th>Result</th><th>Normal Range</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {selectedOrder.test_items?.map((item) => (
                        <tr key={item.id}>
                          <td>{item.test_info?.test_name}</td>
                          <td>{item.result_value || 'Pending'}</td>
                          <td>{item.test_info?.normal_range || '-'}</td>
                          <td>{item.is_abnormal ? <span className="badge badge-danger">Abnormal</span> : <span className="badge badge-success">Normal</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divider"></div>
                <div className="form-group">
                  <div className="info-label">Summary</div>
                  <div className="info-value">{result.summary}</div>
                </div>
                <div className="form-group">
                  <div className="info-label">Interpretation</div>
                  <div className="info-value">{result.interpretation || 'None'}</div>
                </div>
                <div className="form-group">
                  <div className="info-label">Recommendations</div>
                  <div className="info-value">{result.recommendations || 'None'}</div>
                </div>
              </div>
            </div>

            {result.result_document && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Attachments</h3>
                </div>
                <div className="card-body">
                  <a href={result.result_document} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    <i className="bi bi-file-pdf"></i> Download Full Report
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Lab Results</h1>
          <p className="page-subtitle">Review patient laboratory results</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Pending Review</h3>
        </div>
        <div className="card-body">
          {orders.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-check-circle" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No pending lab results</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Order #</th><th>Patient</th><th>Ordered</th><th>Completed</th><th>Critical</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.order_number}</td>
                      <td>{order.patient_name}</td>
                      <td>{new Date(order.ordered_at).toLocaleDateString()}</td>
                      <td>{order.completed_at ? new Date(order.completed_at).toLocaleDateString() : '-'}</td>
                      <td>{order.result?.is_critical ? <span className="badge badge-danger">Yes</span> : <span className="badge badge-success">No</span>}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/doctor/lab-results/${order.id}`)}>
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
    </div>
  )
}