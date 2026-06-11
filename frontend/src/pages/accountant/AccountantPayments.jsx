// pages/accountant/AccountantPayments.jsx
import React, { useState, useEffect } from 'react'
import { paymentsAPI } from '../../services/api'

export default function AccountantPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [selectedPayment, setSelectedPayment] = useState(null)

  useEffect(() => {
    loadPayments()
  }, [dateRange])

  const loadPayments = async () => {
    try {
      const params = {}
      if (dateRange.from) params.created_at__date__gte = dateRange.from
      if (dateRange.to) params.created_at__date__lte = dateRange.to
      
      const data = await paymentsAPI.logs(params)
      setPayments(data)
    } catch (err) {
      console.error('Failed to load payments', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = { SUCCESS: 'badge-success', FAILED: 'badge-danger', PENDING: 'badge-warning', REVERSED: 'badge-neutral' }
    return badges[status] || 'badge-neutral'
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalCash = payments.filter(p => p.payment_method === 'CASH').reduce((sum, p) => sum + p.amount, 0)
  const totalMpesa = payments.filter(p => p.payment_method === 'MPESA').reduce((sum, p) => sum + p.amount, 0)
  const totalCard = payments.filter(p => p.payment_method === 'CARD').reduce((sum, p) => sum + p.amount, 0)
  const totalInsurance = payments.filter(p => p.payment_method === 'INSURANCE').reduce((sum, p) => sum + p.amount, 0)

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading payment logs...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Payment Logs</h1>
          <p className="page-subtitle">View and audit all financial transactions</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <i className="bi bi-printer"></i> Export Report
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Date Range Filter</h3>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDateRange({ from: '', to: '' })}>Reset</button>
            </div>
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card primary">
          <div className="stat-icon"><i className="bi bi-currency-dollar"></i></div>
          <div className="stat-value">KES {totalAmount.toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon"><i className="bi bi-cash"></i></div>
          <div className="stat-value">KES {totalCash.toLocaleString()}</div>
          <div className="stat-label">Cash Payments</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon"><i className="bi bi-phone"></i></div>
          <div className="stat-value">KES {totalMpesa.toLocaleString()}</div>
          <div className="stat-label">M-Pesa Payments</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon"><i className="bi bi-credit-card"></i></div>
          <div className="stat-value">KES {totalCard.toLocaleString()}</div>
          <div className="stat-label">Card Payments</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon"><i className="bi bi-building"></i></div>
          <div className="stat-value">KES {totalInsurance.toLocaleString()}</div>
          <div className="stat-label">Insurance Claims</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {payments.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-receipt" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No payment records found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Date & Time</th><th>Transaction ID</th><th>Patient</th><th>Type</th><th>Amount</th><th>Method</th><th>M-Pesa Code</th><th>Status</th><th>Processed By</th></tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.created_at).toLocaleString()}</td>
                      <td>{payment.transaction_id}</td>
                      <td>{payment.patient_name || 'Walk-in'}</td>
                      <td>{payment.transaction_type_display}</td>
                      <td>KES {payment.amount.toLocaleString()}</td>
                      <td>{payment.payment_method}</td>
                      <td>{payment.mpesa_code || '-'}</td>
                      <td><span className={`badge ${getStatusBadge(payment.status)}`}>{payment.status}</span></td>
                      <td>{payment.processed_by_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: 'var(--surface-raised)' }}>
                    <td colSpan="3">Total</td>
                    <td>KES {totalAmount.toLocaleString()}</td>
                    <td colSpan="4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Payment Details</h3>
              <button className="modal-close" onClick={() => setSelectedPayment(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item"><div className="info-label">Transaction ID</div><div className="info-value">{selectedPayment.transaction_id}</div></div>
                <div className="info-item"><div className="info-label">Date</div><div className="info-value">{new Date(selectedPayment.created_at).toLocaleString()}</div></div>
                <div className="info-item"><div className="info-label">Amount</div><div className="info-value">KES {selectedPayment.amount.toLocaleString()}</div></div>
                <div className="info-item"><div className="info-label">Payment Method</div><div className="info-value">{selectedPayment.payment_method}</div></div>
                <div className="info-item"><div className="info-label">Status</div><div className="info-value"><span className={`badge ${getStatusBadge(selectedPayment.status)}`}>{selectedPayment.status}</span></div></div>
                <div className="info-item"><div className="info-label">Processed By</div><div className="info-value">{selectedPayment.processed_by_name}</div></div>
                {selectedPayment.mpesa_code && <div className="info-item"><div className="info-label">M-Pesa Code</div><div className="info-value">{selectedPayment.mpesa_code}</div></div>}
                {selectedPayment.cost_breakdown && (
                  <div className="info-item" style={{ gridColumn: 'span 2' }}>
                    <div className="info-label">Cost Breakdown</div>
                    <pre className="font-mono text-sm">{JSON.stringify(selectedPayment.cost_breakdown, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}