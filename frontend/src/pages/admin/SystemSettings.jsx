// pages/admin/SystemSettings.jsx
import React, { useState, useEffect } from 'react'
import { lookupsAPI, etimsAPI } from '../../services/api'

export default function SystemSettings() {
  const [clinicSettings, setClinicSettings] = useState(null)
  const [etimsConfig, setEtimsConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('clinic')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const [clinic, etims] = await Promise.all([
        lookupsAPI.clinicSettings(),
        etimsAPI.getConfig().catch(() => null)
      ])
      setClinicSettings(clinic)
      setEtimsConfig(etims)
    } catch (err) {
      console.error('Failed to load settings', err)
    } finally {
      setLoading(false)
    }
  }

  const saveClinicSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await lookupsAPI.updateClinicSettings(clinicSettings)
      alert('Clinic settings saved successfully')
    } catch (err) {
      console.error('Failed to save clinic settings', err)
      alert(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const saveEtimsConfig = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await etimsAPI.updateConfig(etimsConfig)
      alert('eTIMS configuration saved successfully')
    } catch (err) {
      console.error('Failed to save eTIMS config', err)
      alert(err.message || 'Failed to save eTIMS configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure hospital and system parameters</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'clinic' ? 'active' : ''}`} onClick={() => setActiveTab('clinic')}>
          <i className="bi bi-building"></i> Clinic Settings
        </button>
        <button className={`tab-btn ${activeTab === 'etims' ? 'active' : ''}`} onClick={() => setActiveTab('etims')}>
          <i className="bi bi-file-text"></i> eTIMS Configuration
        </button>
        <button className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
          <i className="bi bi-database"></i> Backup & Restore
        </button>
      </div>

      {activeTab === 'clinic' && clinicSettings && (
        <form onSubmit={saveClinicSettings}>
          <div className="card">
            <div className="card-body">
              <div className="form-group">
                <label className="form-label required">Clinic Name</label>
                <input type="text" className="form-input" required value={clinicSettings.clinic_name || ''} onChange={(e) => setClinicSettings(prev => ({ ...prev, clinic_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label required">Address</label>
                <textarea className="form-textarea" rows="2" required value={clinicSettings.address || ''} onChange={(e) => setClinicSettings(prev => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Phone Number</label>
                  <input type="tel" className="form-input" required value={clinicSettings.phone_number || ''} onChange={(e) => setClinicSettings(prev => ({ ...prev, phone_number: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Email</label>
                  <input type="email" className="form-input" required value={clinicSettings.email || ''} onChange={(e) => setClinicSettings(prev => ({ ...prev, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Working Hours</label>
                <input type="text" className="form-input" value={clinicSettings.working_hours || ''} onChange={(e) => setClinicSettings(prev => ({ ...prev, working_hours: e.target.value }))} placeholder="e.g., Mon-Fri: 8am-8pm, Sat: 8am-2pm" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Appointment Duration (minutes)</label>
                  <input type="number" className="form-input" value={clinicSettings.appointment_duration || 30} onChange={(e) => setClinicSettings(prev => ({ ...prev, appointment_duration: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Patients Per Day</label>
                  <input type="number" className="form-input" value={clinicSettings.max_patients_per_day || 200} onChange={(e) => setClinicSettings(prev => ({ ...prev, max_patients_per_day: parseInt(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Saving...</> : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'etims' && (
        <form onSubmit={saveEtimsConfig}>
          <div className="card">
            <div className="card-body">
              <div className="alert alert-info">
                <i className="bi bi-info-circle-fill"></i>
                <span>eTIMS integration with KRA for tax compliance. Medical services are VAT-exempt by default.</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">TIN Number</label>
                  <input type="text" className="form-input" required value={etimsConfig?.tin_number || ''} onChange={(e) => setEtimsConfig(prev => ({ ...prev, tin_number: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Business Name</label>
                  <input type="text" className="form-input" required value={etimsConfig?.business_name || ''} onChange={(e) => setEtimsConfig(prev => ({ ...prev, business_name: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input type="text" className="form-input" value={etimsConfig?.branch_name || ''} onChange={(e) => setEtimsConfig(prev => ({ ...prev, branch_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">County</label>
                  <input type="text" className="form-input" value={etimsConfig?.county || ''} onChange={(e) => setEtimsConfig(prev => ({ ...prev, county: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">API Base URL</label>
                <input type="url" className="form-input" value={etimsConfig?.api_base_url || ''} onChange={(e) => setEtimsConfig(prev => ({ ...prev, api_base_url: e.target.value }))} placeholder="https://etims.kra.go.ke/api" />
              </div>
              <div className="form-group">
                <label className="form-checkbox">
                  <input type="checkbox" checked={etimsConfig?.test_mode || false} onChange={(e) => setEtimsConfig(prev => ({ ...prev, test_mode: e.target.checked }))} />
                  Test Mode (Sandbox)
                </label>
              </div>
              <div className="form-group">
                <label className="form-checkbox">
                  <input type="checkbox" checked={etimsConfig?.auto_submit_invoices || false} onChange={(e) => setEtimsConfig(prev => ({ ...prev, auto_submit_invoices: e.target.checked }))} />
                  Automatically submit invoices to eTIMS
                </label>
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Saving...</> : 'Save eTIMS Configuration'}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'backup' && (
        <div className="card">
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Database Backup</div>
                <div className="info-value">Create a full backup of the system database</div>
                <button className="btn btn-primary mt-2">
                  <i className="bi bi-download"></i> Download Backup
                </button>
              </div>
              <div className="info-item">
                <div className="info-label">System Logs</div>
                <div className="info-value">Export system audit logs for compliance</div>
                <button className="btn btn-secondary mt-2">
                  <i className="bi bi-file-text"></i> Export Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}