// pages/hr/AttendanceQR.jsx
import React, { useState, useEffect } from 'react'
import { attendanceAPI, wifiAPI } from '../../services/api'

export default function AttendanceQR() {
  const [qrCodes, setQrCodes] = useState([])
  const [wifiNetworks, setWifiNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    qr_type: 'CHECK_IN',
    valid_from: '',
    valid_until: '',
    location: '',
    wifi_network: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [qrData, wifiData] = await Promise.all([
        attendanceAPI.qrCodes(),
        wifiAPI.list()
      ])
      setQrCodes(qrData)
      setWifiNetworks(wifiData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    try {
      await attendanceAPI.generateQR({
        ...formData,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
        attendance_date: new Date().toISOString().split('T')[0]
      })
      setShowModal(false)
      setFormData({ qr_type: 'CHECK_IN', valid_from: '', valid_until: '', location: '', wifi_network: '' })
      loadData()
    } catch (err) {
      console.error('Failed to generate QR', err)
      alert(err.message || 'Failed to generate QR code')
    }
  }

  const downloadQR = (qrCode, type) => {
    // In production, generate actual QR code image
    alert(`QR Code for ${type}: ${qrCode}`)
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading QR codes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Attendance QR Codes</h1>
          <p className="page-subtitle">Generate QR codes for staff check-in/out</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-qr-code"></i> Generate QR Code
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {qrCodes.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-qr-code" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No QR codes generated</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Type</th><th>Date</th><th>Valid Period</th><th>Location</th><th>Status</th><th>Scans</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {qrCodes.map((qr) => (
                    <tr key={qr.id}>
                      <td><span className="badge badge-primary">{qr.qr_type_display}</span></td>
                      <td>{new Date(qr.attendance_date).toLocaleDateString()}</td>
                      <td>{qr.valid_window}</td>
                      <td>{qr.location}</td>
                      <td>{qr.is_active ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Expired</span>}</td>
                      <td>{qr.scan_count}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => downloadQR(qr.qr_code, qr.qr_type)}>
                          <i className="bi bi-download"></i> Download
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

      {/* Generate QR Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Generate QR Code</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGenerate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">QR Type</label>
                  <select className="form-select" required value={formData.qr_type} onChange={(e) => setFormData(prev => ({ ...prev, qr_type: e.target.value }))}>
                    <option value="CHECK_IN">Check In</option>
                    <option value="CHECK_OUT">Check Out</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Valid From</label>
                  <input type="datetime-local" className="form-input" required value={formData.valid_from} onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Valid Until</label>
                  <input type="datetime-local" className="form-input" required value={formData.valid_until} onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Location</label>
                  <input type="text" className="form-input" required value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g., Main Entrance, Pharmacy" />
                </div>
                <div className="form-group">
                  <label className="form-label">WiFi Network (Optional)</label>
                  <select className="form-select" value={formData.wifi_network} onChange={(e) => setFormData(prev => ({ ...prev, wifi_network: e.target.value }))}>
                    <option value="">Select network...</option>
                    {wifiNetworks.map(w => <option key={w.id} value={w.id}>{w.network_name} - {w.location}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Generate QR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}