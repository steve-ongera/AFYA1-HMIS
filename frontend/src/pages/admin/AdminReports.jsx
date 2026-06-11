// pages/admin/AdminReports.jsx
import React, { useState } from 'react'
import { reportsAPI } from '../../services/api'

export default function AdminReports() {
  const [reportType, setReportType] = useState('daily-visits')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  const reportTypes = [
    { value: 'daily-visits', label: 'Daily Visits Report', icon: 'bi-calendar-check' },
    { value: 'revenue', label: 'Revenue Report', icon: 'bi-currency-dollar' },
    { value: 'stock', label: 'Stock Status Report', icon: 'bi-box-seam' },
    { value: 'claims', label: 'Insurance Claims Report', icon: 'bi-file-text' },
    { value: 'lab-turnaround', label: 'Lab Turnaround Times', icon: 'bi-microscope' },
    { value: 'attendance', label: 'Staff Attendance Report', icon: 'bi-person-badge' },
    { value: 'admissions', label: 'Admissions Report', icon: 'bi-hospital' },
    { value: 'discharge-summary', label: 'Discharge Summary Report', icon: 'bi-file-check' }
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
    } else if (typeof reportData.data === 'object') {
      for (const [key, value] of Object.entries(reportData.data)) {
        csvContent += `${key},${JSON.stringify(value)}\n`
      }
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
          <h1 className="page-title">Reports Dashboard</h1>
          <p className="page-subtitle">Generate and export system reports</p>
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
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    {reportData.data && Array.isArray(reportData.data) && reportData.data.length > 0 && 
                      Object.keys(reportData.data[0]).map(key => (
                        <th key={key}>{key.replace(/_/g, ' ').toUpperCase()}</th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody>
                  {reportData.data && Array.isArray(reportData.data) && reportData.data.map((item, idx) => (
                    <tr key={idx}>
                      {Object.values(item).map((value, i) => (
                        <td key={i}>{typeof value === 'object' ? JSON.stringify(value) : value}</td>
                      ))}
                    </tr>
                  ))}
                  {reportData.data && typeof reportData.data === 'object' && !Array.isArray(reportData.data) && (
                    <tr>
                      <td colSpan="2">
                        <pre className="font-mono">{JSON.stringify(reportData.data, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}