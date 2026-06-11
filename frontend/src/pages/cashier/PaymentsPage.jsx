// pages/cashier/PaymentsPage.jsx
import React, { useState, useEffect } from 'react'
import { paymentsAPI, visitsAPI, patientsAPI } from '../../services/api'

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [mpesaCode, setMpesaCode] = useState('')
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (searchTerm.length < 2) return
    setLoading(true)
    try {
      const data = await visitsAPI.list({ search: searchTerm })
      setSearchResults(data)
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      setLoading(false)
    }
  }

  const processPayment = async () => {
    if (!selectedVisit) return
    setProcessing(true)
    try {
      // In production, call payment API
      // await paymentsAPI.create({ visit: selectedVisit.id, amount, payment_method: paymentMethod, mpesa_code: mpesaCode })
      alert(`Payment of KES ${amount} processed successfully!`)
      setSelectedVisit(null)
      setAmount('')
      setMpesaCode('')
      handleSearch()
    } catch (err) {
      console.error('Payment failed', err)
      alert(err.message || 'Payment processing failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Process Payments</h1>
          <p className="page-subtitle">Accept payments for services</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Find Patient Visit</h3>
        </div>
        <div className="card-body">
          <div className="search-wrapper">
            <i className="bi bi-search search-icon"></i>
            <input type="text" className="form-input" placeholder="Search by visit number or patient name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          {loading && <div className="loading-overlay"><div className="spinner"></div></div>}
          {searchResults.length > 0 && (
            <div className="table-wrapper" style={{ marginTop: 16 }}>
              <table className="table">
                <thead>
                  <tr><th>Visit #</th><th>Patient</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {searchResults.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.visit_number}</td>
                      <td>{visit.patient_info?.full_name}</td>
                      <td>{new Date(visit.arrival_time).toLocaleDateString()}</td>
                      <td><span className={`badge badge-${visit.status}`}>{visit.status_display}</span></td>
                      <td><button className="btn btn-sm btn-primary" onClick={() => setSelectedVisit(visit)}>Select</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedVisit && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Payment Details</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedVisit(null)}>Change Visit</button>
          </div>
          <div className="card-body">
            <div className="info-grid" style={{ marginBottom: 24 }}>
              <div className="info-item"><div className="info-label">Visit #</div><div className="info-value">{selectedVisit.visit_number}</div></div>
              <div className="info-item"><div className="info-label">Patient</div><div className="info-value">{selectedVisit.patient_info?.full_name}</div></div>
              <div className="info-item"><div className="info-label">Services</div><div className="info-value">Consultation, Pharmacy, Lab (if applicable)</div></div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Amount (KES)</label>
                <input type="number" className="form-input" required value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label required">Payment Method</label>
                <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="CARD">Card</option>
                  <option value="INSURANCE">Insurance</option>
                </select>
              </div>
            </div>

            {paymentMethod === 'MPESA' && (
              <div className="form-group">
                <label className="form-label">M-Pesa Transaction Code</label>
                <input type="text" className="form-input" value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value)} placeholder="e.g., QWERTY123" />
              </div>
            )}

            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedVisit(null)}>Cancel</button>
              <button className="btn btn-success" onClick={processPayment} disabled={processing || !amount}>
                {processing ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Processing...</> : `Process Payment - KES ${amount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}