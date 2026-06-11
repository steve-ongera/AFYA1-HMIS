// pages/laboratory/LabResults.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { labResultsAPI, labOrdersAPI } from '../../services/api'

export default function LabResults() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [selectedResult, setSelectedResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadResult(id)
    } else {
      loadResults()
    }
  }, [id])

  const loadResults = async () => {
    try {
      const data = await labResultsAPI.list()
      setResults(data)
    } catch (err) {
      console.error('Failed to load results', err)
    } finally {
      setLoading(false)
    }
  }

  const loadResult = async (resultId) => {
    try {
      const data = await labResultsAPI.get(resultId)
      setSelectedResult(data)
    } catch (err) {
      console.error('Failed to load result', err)
    } finally {
      setLoading(false)
    }
  }

  const getResultStatus = (isAbnormal, isCritical) => {
    if (isCritical) return { class: 'badge-danger', text: 'Critical' }
    if (isAbnormal) return { class: 'badge-warning', text: 'Abnormal' }
    return { class: 'badge-success', text: 'Normal' }
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

  if (selectedResult) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">Lab Results</h1>
            <p className="page-subtitle">{selectedResult.order_number} - {selectedResult.patient_name}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/laboratory/results')}>
            <i className="bi bi-arrow-left"></i> Back to List
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Result Details</h3>
            {selectedResult.is_critical && <span className="badge badge-danger">CRITICAL VALUE - DOCTOR NOTIFIED</span>}
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Order Number</div><div className="info-value">{selectedResult.order_number}</div></div>
              <div className="info-item"><div className="info-label">Patient</div><div className="info-value">{selectedResult.patient_name}</div></div>
              <div className="info-item"><div className="info-label">Result By</div><div className="info-value">{selectedResult.result_by_name}</div></div>
              <div className="info-item"><div className="info-label">Verified By</div><div className="info-value">{selectedResult.verified_by_name || 'Pending'}</div></div>
              <div className="info-item"><div className="info-label">Result Date</div><div className="info-value">{new Date(selectedResult.created_at).toLocaleString()}</div></div>
              <div className="info-item"><div className="info-label">Released to Patient</div><div className="info-value">{selectedResult.result_released_to_patient ? 'Yes' : 'No'}</div></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Test Results</h3>
          </div>
          <div className="card-body">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Test</th><th>Result</th><th>Reference Range</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {selectedResult.lab_order?.test_items?.map((item) => {
                    const status = getResultStatus(item.is_abnormal, selectedResult.is_critical)
                    return (
                      <tr key={item.id}>
                        <td>{item.test_info?.test_name}</td>
                        <td><strong>{item.result_value || '-'}</strong> {item.result_unit}</td>
                        <td>{item.test_info?.normal_range || '-'}</td>
                        <td><span className={`badge ${status.class}`}>{status.text}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="divider"></div>
            <div className="form-group">
              <div className="info-label">Summary</div>
              <div className="info-value">{selectedResult.summary}</div>
            </div>
            <div className="form-group">
              <div className="info-label">Interpretation</div>
              <div className="info-value">{selectedResult.interpretation || 'None provided'}</div>
            </div>
            <div className="form-group">
              <div className="info-label">Recommendations</div>
              <div className="info-value">{selectedResult.recommendations || 'None provided'}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Lab Results Archive</h1>
          <p className="page-subtitle">View completed laboratory reports</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {results.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-file-text" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No lab results found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Date</th><th>Order #</th><th>Patient</th><th>Tests</th><th>Critical</th><th>Verified</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id}>
                      <td>{new Date(result.created_at).toLocaleDateString()}</td>
                      <td>{result.order_number}</td>
                      <td>{result.patient_name}</td>
                      <td>{result.lab_order?.test_items?.length || 0} tests</td>
                      <td>{result.is_critical ? <span className="badge badge-danger">Yes</span> : <span className="badge badge-success">No</span>}</td>
                      <td>{result.verified_by ? <span className="badge badge-success">Yes</span> : <span className="badge badge-warning">Pending</span>}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/laboratory/results/${result.id}`)}>
                          <i className="bi bi-eye"></i> View
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => window.print()}>
                          <i className="bi bi-printer"></i> Print
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