// pages/cashier/CashierReports.jsx
import React, { useState, useEffect } from 'react'
import { reportsAPI, cashierAPI } from '../../services/api'

export default function CashierReports() {
  const [reportData, setReportData] = useState(null)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [reportType, setReportType] = useState('revenue')
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await cashierAPI.sessions()
      setSessions(data)
    } catch (err) {
      console.error('Failed to load sessions', err)
    }
  }

  const generateReport = async () => {
    setLoading(true)
    try {
      const params = {}
      if (dateRange.from) params.from = dateRange.from
      if (dateRange.to) params.to = dateRange.to
      
      const data = await reportsAPI.get(reportType, params)
      setReportData(data)
    } catch (err) {
      console.error('Failed to generate report', err)
      alert(err.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData?.data) return
    
    let csvContent = "data:text/csv;charset=utf-8,"
    
    if (reportType === 'revenue') {
      csvContent += "Payment Method,Count,Total Amount (KES)\n"
      reportData.data.forEach(item => {
        csvContent += `${item.payment_method},${item.count},${item.total}\n`
      })
    } else if (reportType === 'daily-visits') {
      csvContent += "Visit Type,Status,Count\n"
      reportData.data.forEach(item => {
        csvContent += `${item.visit_type},${item.status},${item.count}\n`
      })
    }
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Cashier Reports</h1>
          <p className="page-subtitle">Financial reports and analytics</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Report Filters</h3>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Report Type</label>
              <select className="form-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="revenue">Revenue Report</option>
                <option value="daily-visits">Daily Visits Report</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Generating...</> : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {reportData && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title">Report Summary</h3>
              <button className="btn btn-secondary btn-sm" onClick={exportToCSV}>
                <i className="bi bi-download"></i> Export CSV
              </button>
            </div>
            <div className="card-body">
              {reportType === 'revenue' && (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Payment Method</th><th>Transaction Count</th><th>Total Amount (KES)</th></tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.payment_method}</td>
                          <td>{item.count}</td>
                          <td><strong>KES {parseFloat(item.total).toLocaleString()}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 'bold', background: 'var(--surface-raised)' }}>
                        <td>Total</td>
                        <td>{reportData.data.reduce((sum, i) => sum + i.count, 0)}</td>
                        <td>KES {reportData.data.reduce((sum, i) => sum + parseFloat(i.total), 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              
              {reportType === 'daily-visits' && (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Visit Type</th><th>Status</th><th>Count</th></tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.visit_type}</td>
                          <td>{item.status}</td>
                          <td>{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Session Summary</h3>
            </div>
            <div className="card-body">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Session ID</th><th>Cashier</th><th>Opened</th><th>Closed</th><th>Opening</th><th>Closing</th><th>Variance</th></tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 10).map((session) => (
                      <tr key={session.id}>
                        <td>{session.session_id}</td>
                        <td>{session.cashier_name}</td>
                        <td>{new Date(session.opened_at).toLocaleDateString()}</td>
                        <td>{session.closed_at ? new Date(session.closed_at).toLocaleDateString() : '-'}</td>
                        <td>KES {session.opening_balance?.toLocaleString()}</td>
                        <td>KES {session.actual_cash?.toLocaleString() || '-'}</td>
                        <td>
                          {session.cash_variance !== 0 && (
                            <span className={session.cash_variance > 0 ? 'text-success' : 'text-danger'}>
                              KES {session.cash_variance?.toLocaleString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}