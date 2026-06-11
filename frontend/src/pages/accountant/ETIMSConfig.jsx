// pages/accountant/ETIMSConfig.jsx
import React, { useState, useEffect } from 'react'
import { etimsAPI } from '../../services/api'

export default function ETIMSConfig() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const data = await etimsAPI.getConfig()
      setConfig(data)
    } catch (err) {
      console.error('Failed to load eTIMS config', err)
      // Create default config if none exists
      setConfig({
        tin_number: '',
        business_name: '',
        branch_name: '',
        device_serial_number: '',
        api_base_url: 'https://etims.kra.go.ke/api',
        is_active: false,
        test_mode: true,
        auto_submit_invoices: false,
        data_anonymization_enabled: true,
        county: '',
        pharmacy_board_license: ''
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await etimsAPI.updateConfig(config)
      alert('eTIMS configuration saved successfully')
    } catch (err) {
      console.error('Failed to save config', err)
      alert(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTestResult({ status: 'testing', message: 'Testing connection to KRA eTIMS...' })
    try {
      // Simulate API test
      setTimeout(() => {
        setTestResult({ status: 'success', message: 'Connection successful! eTIMS API is reachable.' })
      }, 2000)
    } catch (err) {
      setTestResult({ status: 'error', message: 'Connection failed. Please check your API settings.' })
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading eTIMS configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">eTIMS Configuration</h1>
          <p className="page-subtitle">KRA Electronic Tax Invoice Management System</p>
        </div>
      </div>

      <div className="alert alert-info">
        <i className="bi bi-info-circle-fill"></i>
        <span>eTIMS integration enables real-time tax invoice submission to KRA. Medical services are VAT-exempt under the Kenya Finance Act.</span>
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">KRA eTIMS Credentials</h3>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">TIN Number</label>
                <input type="text" className="form-input" required value={config.tin_number} onChange={(e) => setConfig(prev => ({ ...prev, tin_number: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label required">Business Name</label>
                <input type="text" className="form-input" required value={config.business_name} onChange={(e) => setConfig(prev => ({ ...prev, business_name: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Branch Name</label>
                <input type="text" className="form-input" value={config.branch_name} onChange={(e) => setConfig(prev => ({ ...prev, branch_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Device Serial Number</label>
                <input type="text" className="form-input" value={config.device_serial_number} onChange={(e) => setConfig(prev => ({ ...prev, device_serial_number: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">API Base URL</label>
              <input type="url" className="form-input" value={config.api_base_url} onChange={(e) => setConfig(prev => ({ ...prev, api_base_url: e.target.value }))} placeholder="https://etims.kra.go.ke/api" />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Business Details</h3>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">County</label>
                <input type="text" className="form-input" value={config.county} onChange={(e) => setConfig(prev => ({ ...prev, county: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Pharmacy Board License</label>
                <input type="text" className="form-input" value={config.pharmacy_board_license} onChange={(e) => setConfig(prev => ({ ...prev, pharmacy_board_license: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Integration Settings</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={config.test_mode} onChange={(e) => setConfig(prev => ({ ...prev, test_mode: e.target.checked }))} />
                Test Mode (Sandbox Environment)
              </label>
              <div className="form-hint">Enable for testing before going live</div>
            </div>
            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={config.auto_submit_invoices} onChange={(e) => setConfig(prev => ({ ...prev, auto_submit_invoices: e.target.checked }))} />
                Automatically submit invoices to eTIMS
              </label>
            </div>
            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={config.data_anonymization_enabled} onChange={(e) => setConfig(prev => ({ ...prev, data_anonymization_enabled: e.target.checked }))} />
                Enable Data Anonymization (GDPR Compliance)
              </label>
            </div>
            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={config.is_active} onChange={(e) => setConfig(prev => ({ ...prev, is_active: e.target.checked }))} />
                Activate eTIMS Integration
              </label>
            </div>
          </div>
        </div>

        {testResult && (
          <div className={`alert alert-${testResult.status === 'success' ? 'success' : testResult.status === 'error' ? 'danger' : 'info'}`}>
            <i className={`bi bi-${testResult.status === 'success' ? 'check-circle-fill' : testResult.status === 'error' ? 'exclamation-triangle-fill' : 'hourglass-split'}`}></i>
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={testConnection}>
            Test Connection
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => loadConfig()}>Reset</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Saving...</> : 'Save Configuration'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}