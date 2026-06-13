// pages/cashier/ReceiptsPage.jsx
import React, { useState, useEffect } from 'react'
import { paymentsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function ReceiptsPage() {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState([])
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [dateFilter, setDateFilter] = useState('today')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReceipts()
  }, [dateFilter])

  const loadReceipts = async () => {
    setLoading(true)
    try {
      let params = {}
      if (dateFilter === 'today') params.today = true
      else if (dateFilter === 'week') params.created_at__week = new Date().getWeek()

      const data = await paymentsAPI.logs(params)
      setReceipts(Array.isArray(data) ? data : (data?.results ?? []))
    } catch (err) {
      console.error('Failed to load receipts', err)
    } finally {
      setLoading(false)
    }
  }

  const printReceipt = (receipt) => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt.transaction_id}</title>
        <style>
          body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .hospital-name { font-size: 18px; font-weight: bold; }
          .receipt-title { font-size: 14px; margin-top: 5px; }
          .details { margin: 15px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital-name">AFYA1 HMIS</div>
          <div>South B Hospital</div>
          <div class="receipt-title">PAYMENT RECEIPT</div>
        </div>
        <div class="details">
          <div class="row"><span>Receipt No:</span><strong>${receipt.transaction_id}</strong></div>
          <div class="row"><span>Date:</span>${new Date(receipt.created_at).toLocaleString()}</div>
          <div class="row"><span>Cashier:</span>${receipt.processed_by_name || user?.full_name}</div>
          <div class="row"><span>Transaction Type:</span>${receipt.transaction_type_display}</div>
          <div class="row"><span>Payment Method:</span>${receipt.payment_method}</div>
          ${receipt.mpesa_code ? `<div class="row"><span>M-Pesa Code:</span>${receipt.mpesa_code}</div>` : ''}
          <div class="row total"><span>Amount Paid:</span><strong>KES ${receipt.amount.toLocaleString()}</strong></div>
        </div>
        <div class="footer">
          <div>Thank you for choosing South B Hospital</div>
          <div>This is a computer-generated receipt</div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading receipts...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Payment Receipts</h1>
          <p className="page-subtitle">View and print transaction receipts</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${dateFilter === 'today' ? 'active' : ''}`} onClick={() => setDateFilter('today')}>Today</button>
        <button className={`tab-btn ${dateFilter === 'week' ? 'active' : ''}`} onClick={() => setDateFilter('week')}>This Week</button>
        <button className={`tab-btn ${dateFilter === 'month' ? 'active' : ''}`} onClick={() => setDateFilter('month')}>This Month</button>
      </div>

      <div className="card">
        <div className="card-body">
          {receipts.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-receipt" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No receipts found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Receipt No</th><th>Date</th><th>Patient</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>{receipt.transaction_id}</td>
                      <td>{new Date(receipt.created_at).toLocaleString()}</td>
                      <td>{receipt.patient_name || 'Walk-in'}</td>
                      <td>KES {receipt.amount.toLocaleString()}</td>
                      <td>{receipt.payment_method}</td>
                      <td><span className={`badge ${receipt.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>{receipt.status}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => printReceipt(receipt)}>
                          <i className="bi bi-printer"></i> Print
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelectedReceipt(receipt)}>
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

      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Receipt Details</h3>
              <button className="modal-close" onClick={() => setSelectedReceipt(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item"><div className="info-label">Receipt No</div><div className="info-value">{selectedReceipt.transaction_id}</div></div>
                <div className="info-item"><div className="info-label">Date</div><div className="info-value">{new Date(selectedReceipt.created_at).toLocaleString()}</div></div>
                <div className="info-item"><div className="info-label">Patient</div><div className="info-value">{selectedReceipt.patient_name || 'N/A'}</div></div>
                <div className="info-item"><div className="info-label">Transaction Type</div><div className="info-value">{selectedReceipt.transaction_type_display}</div></div>
                <div className="info-item"><div className="info-label">Payment Method</div><div className="info-value">{selectedReceipt.payment_method}</div></div>
                {selectedReceipt.mpesa_code && <div className="info-item"><div className="info-label">M-Pesa Code</div><div className="info-value">{selectedReceipt.mpesa_code}</div></div>}
                <div className="info-item"><div className="info-label">Amount</div><div className="info-value"><strong>KES {selectedReceipt.amount.toLocaleString()}</strong></div></div>
                <div className="info-item"><div className="info-label">Processed By</div><div className="info-value">{selectedReceipt.processed_by_name}</div></div>
                <div className="info-item"><div className="info-label">Status</div><div className="info-value"><span className={`badge ${selectedReceipt.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>{selectedReceipt.status}</span></div></div>
              </div>
              {selectedReceipt.cost_breakdown && (
                <>
                  <div className="divider"></div>
                  <div className="info-label">Cost Breakdown</div>
                  <pre className="font-mono text-sm">{JSON.stringify(selectedReceipt.cost_breakdown, null, 2)}</pre>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => printReceipt(selectedReceipt)}>Print Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function for week calculation
Date.prototype.getWeek = function () {
  const date = new Date(this)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}