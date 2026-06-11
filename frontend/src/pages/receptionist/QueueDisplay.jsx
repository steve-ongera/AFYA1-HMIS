// pages/receptionist/QueueDisplay.jsx
import React, { useState, useEffect } from 'react'
import { queueAPI } from '../../services/api'

export default function QueueDisplay() {
  const [queueData, setQueueData] = useState({})
  const [selectedDept, setSelectedDept] = useState('CONSULTATION')
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const departments = [
    { value: 'TRIAGE', label: 'Triage', icon: 'bi-activity' },
    { value: 'CONSULTATION', label: 'Consultation', icon: 'bi-chat-dots' },
    { value: 'LABORATORY', label: 'Laboratory', icon: 'bi-microscope' },
    { value: 'PHARMACY', label: 'Pharmacy', icon: 'bi-capsule' },
    { value: 'RADIOLOGY', label: 'Radiology', icon: 'bi-camera' },
    { value: 'PROCEDURE', label: 'Procedure', icon: 'bi-scissors' }
  ]

  useEffect(() => {
    loadQueue()
    let interval
    if (autoRefresh) {
      interval = setInterval(loadQueue, 10000)
    }
    return () => clearInterval(interval)
  }, [selectedDept, autoRefresh])

  const loadQueue = async () => {
    try {
      const data = await queueAPI.byDept(selectedDept)
      setQueueData(prev => ({ ...prev, [selectedDept]: data }))
    } catch (err) {
      console.error('Failed to load queue', err)
    } finally {
      setLoading(false)
    }
  }

  const getTriageColor = (color) => {
    const colors = { RED: 'triage-red', ORANGE: 'triage-orange', YELLOW: 'triage-yellow', GREEN: 'triage-green', BLUE: 'triage-blue' }
    return colors[color] || ''
  }

  const currentQueue = queueData[selectedDept] || []

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Queue Display</h1>
          <p className="page-subtitle">Live patient queue status</p>
        </div>
        <div className="page-actions">
          <button className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAutoRefresh(!autoRefresh)}>
            <i className={`bi ${autoRefresh ? 'bi-pause-fill' : 'bi-play-fill'}`}></i> {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={loadQueue}>
            <i className="bi bi-arrow-repeat"></i> Refresh
          </button>
        </div>
      </div>

      <div className="tabs">
        {departments.map((dept) => (
          <button key={dept.value} className={`tab-btn ${selectedDept === dept.value ? 'active' : ''}`} onClick={() => setSelectedDept(dept.value)}>
            <i className={dept.icon}></i> {dept.label}
            <span className="tab-count">{queueData[dept.value]?.length || 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading queue...</span>
        </div>
      ) : currentQueue.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-list-ul" style={{ fontSize: 48, opacity: 0.5 }}></i>
          <p className="empty-state-text">No patients in queue for {departments.find(d => d.value === selectedDept)?.label}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {currentQueue.map((item) => (
            <div key={item.id} className="queue-card">
              <div className="queue-number">{item.queue_number}</div>
              <div className="queue-info">
                <div className="queue-name">{item.patient_name}</div>
                <div className="queue-meta">
                  Visit: {item.patient_visit_number} • Joined: {new Date(item.joined_queue).toLocaleTimeString()}
                </div>
                {item.triage_color && (
                  <div className="triage-bar" style={{ marginTop: 8 }}>
                    <div className={`triage-bar-seg ${getTriageColor(item.triage_color)}`}></div>
                  </div>
                )}
              </div>
              <div className="queue-wait">
                <i className="bi bi-clock"></i> {item.wait_minutes || 0} min wait
              </div>
              {item.is_serving && (
                <div className="badge badge-warning">Being Served</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}