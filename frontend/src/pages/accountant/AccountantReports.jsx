// pages/accountant/AccountantReports.jsx
import React, { useState } from 'react'
import { reportsAPI } from '../../services/api'

export default function AccountantReports() {
  const [reportType, setReportType] = useState('revenue')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  const reportTypes = [
    { value: 'revenue', label: 'Revenue Report', icon: 'bi-currency-dollar' },
    { value: 'claims', label: 'Insurance Claims Report', icon: 'bi-file-text' },
    { value: 'stock', label: 'Stock Value Report', icon: 'bi-box-seam' },
    { value: 'attendance', label: 'Staff Attendance', icon: 'bi-person-badge' }
  ]

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
    
    if (Array.isArray(reportData.data)) {
      const headers = Object.keys(reportData.data[0] || {})
      csvContent += headers.join(',') + '\n'
      reportData.data.forEach(item => {
        csvContent += headers.map(h => item[h]).join(',') + '\n'
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
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Generate and export financial statements</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Report Configuration</h3>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Report Type</label>
              <select className="form-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                {reportTypes.map(rt => (
                  <option key={rt.value} value={rt.value}>
                    <i className={rt.icon}></i> {rt.label}
                  </option>
                ))}
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Report Results</h3>
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
                    {reportData.data?.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.payment_method}</td>
                        <td>{item.count}</td>
                        <td><strong>KES {parseFloat(item.total).toLocaleString()}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 'bold' }}>
                      <td>Total</td>
                      <td>{reportData.data?.reduce((sum, i) => sum + i.count, 0)}</td>
                      <td>KES {reportData.data?.reduce((sum, i) => sum + parseFloat(i.total), 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {reportType === 'claims' && (
              <div>
                {Object.entries(reportData.data || {}).map(([category, data]) => (
                  <div key={category} style={{ marginBottom: 24 }}>
                    <h4 className="card-title">{category.toUpperCase()}</h4>
                    <div className="table-wrapper">
                      <table className="table">
                        <thead><tr><th>Status</th><th>Count</th></tr></thead>
                        <tbody>
                          {data.map((item, idx) => (
                            <tr key={idx}><td>{item.status}</td><td>{item.count}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reportType === 'stock' && (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Medicine</th><th>Current Stock</th><th>Reorder Level</th><th>Status</th></tr></thead>
                  <tbody>
                    {reportData.low_stock?.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td><span className="badge badge-danger">{item.quantity_in_stock}</span></td>
                        <td>{item.reorder_level}</td>
                        <td><span className="badge badge-warning">Low Stock</span></td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === 'attendance' && (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Status</th><th>Count</th></tr></thead>
                  <tbody>
                    {reportData.data?.map((item, idx) => (
                      <tr key={idx}><td>{item.status}</td><td>{item.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}