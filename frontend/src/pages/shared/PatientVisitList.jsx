// pages/shared/PatientVisitList.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { visitsAPI, queueAPI, consultationsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { 
  Calendar, Filter, Eye, Clock, CheckCircle, XCircle, 
  AlertCircle, ChevronLeft, ChevronRight, Activity,
  Search, Hospital, User, FileText, Pill, FlaskConical
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PatientVisitList() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const patientId = searchParams.get('patientId')
  
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [consultationData, setConsultationData] = useState(null)
  const [queueData, setQueueData] = useState(null)
  
  // Filters
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    visitType: searchParams.get('visitType') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  // Role-based permissions
  const canTriage = hasRole('NURSE', 'ADMIN')
  const canConsult = hasRole('DOCTOR', 'ADMIN')
  const canViewQueue = hasRole('RECEPTIONIST', 'NURSE', 'ADMIN')

  const loadVisits = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        page_size: pageSize,
        ordering: '-arrival_time',
        ...filters,
      }
      if (patientId) params.patient = patientId
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key]
      })
      
      const data = await visitsAPI.list(params)
      setVisits(data.results || data || [])
      setTotalCount(data.count || (data.length || 0))
      setTotalPages(Math.ceil((data.count || data.length || 0) / pageSize))
    } catch (err) {
      console.error('Failed to load visits', err)
      toast.error('Failed to load visits')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filters, patientId])

  useEffect(() => {
    loadVisits()
  }, [loadVisits])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
    // Update URL params
    const newParams = new URLSearchParams(searchParams)
    if (value) newParams.set(key, value)
    else newParams.delete(key)
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setFilters({ status: '', visitType: '', dateFrom: '', dateTo: '' })
    setCurrentPage(1)
    setSearchParams({})
  }

  const viewVisitDetails = async (visit) => {
    setSelectedVisit(visit)
    setShowDetailModal(true)
    
    // Load consultation data if exists
    try {
      const consults = await consultationsAPI.list({ visit: visit.id })
      const consult = consults.results?.[0] || consults?.[0]
      setConsultationData(consult || null)
    } catch (err) {
      console.error('Failed to load consultation', err)
    }
    
    // Load queue data
    try {
      const queues = await queueAPI.list({ visit: visit.id })
      setQueueData(queues.results || queues || [])
    } catch (err) {
      console.error('Failed to load queue data', err)
    }
  }

  const getStatusBadge = (status) => {
    const config = {
      'REGISTERED': { class: 'info', icon: <Clock size={12} />, text: 'Registered' },
      'TRIAGED': { class: 'primary', icon: <Activity size={12} />, text: 'Triaged' },
      'WAITING': { class: 'warning', icon: <Clock size={12} />, text: 'Waiting' },
      'IN_CONSULTATION': { class: 'info', icon: <User size={12} />, text: 'In Consultation' },
      'COMPLETED': { class: 'success', icon: <CheckCircle size={12} />, text: 'Completed' },
      'ADMITTED': { class: 'danger', icon: <Hospital size={12} />, text: 'Admitted' },
      'CANCELLED': { class: 'secondary', icon: <XCircle size={12} />, text: 'Cancelled' },
    }
    const cfg = config[status] || { class: 'secondary', icon: <AlertCircle size={12} />, text: status }
    return <span className={`badge badge-${cfg.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{cfg.icon} {cfg.text}</span>
  }

  const getVisitTypeIcon = (type) => {
    const icons = {
      'EMERGENCY': <AlertCircle size={14} />,
      'OUTPATIENT': <User size={14} />,
      'INPATIENT': <Hospital size={14} />,
      'FOLLOW_UP': <FileText size={14} />,
      'ANTENATAL': <Activity size={14} />,
    }
    return icons[type] || <Calendar size={14} />
  }

  if (loading && visits.length === 0) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading visits...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">
            <Calendar className="inline-icon" size={28} />
            Patient Visits
          </h1>
          <p className="page-subtitle">
            Track and manage all patient visits • {totalCount.toLocaleString()} total visits
            {patientId && <span className="badge badge-info" style={{ marginLeft: 12 }}>Filtered by Patient</span>}
          </p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-outline" 
            onClick={() => navigate('/receptionist/new-visit')}
          >
            <Calendar size={16} /> New Visit
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? 16 : 0 }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} /> {showFilters ? 'Hide Filters' : 'Show Filters'}
              {Object.values(filters).some(v => v) && <span className="badge badge-primary" style={{ marginLeft: 8 }}>Active</span>}
            </button>
            {(Object.values(filters).some(v => v)) && (
              <button className="btn btn-sm btn-ghost" onClick={clearFilters}>
                Clear All
              </button>
            )}
          </div>
          
          {showFilters && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="TRIAGED">Triaged</option>
                  <option value="WAITING">Waiting</option>
                  <option value="IN_CONSULTATION">In Consultation</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ADMITTED">Admitted</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Visit Type</label>
                <select 
                  className="form-select"
                  value={filters.visitType}
                  onChange={(e) => handleFilterChange('visitType', e.target.value)}
                >
                  <option value="">All</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="OUTPATIENT">Outpatient</option>
                  <option value="INPATIENT">Inpatient</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="ANTENATAL">Antenatal</option>
                  <option value="IMMUNIZATION">Immunization</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">From Date</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">To Date</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visits Table */}
      <div className="card">
        <div className="card-body">
          {visits.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} style={{ opacity: 0.5 }} />
              <p className="empty-state-text">
                {Object.values(filters).some(v => v) 
                  ? 'No visits match your filters' 
                  : 'No visits found'}
              </p>
            </div>
          ) : (
            <>
              <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Visit #</th>
                      <th>Patient</th>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Doctor</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((visit) => (
                      <tr key={visit.id}>
                        <td>
                          <strong>{visit.visit_number}</strong>
                        </td>
                        <td>
                          <div className="patient-name">{visit.patient_info?.full_name || '—'}</div>
                          <div className="patient-contact text-muted">{visit.patient_info?.phone_number || ''}</div>
                        </td>
                        <td>
                          <div>{new Date(visit.arrival_time).toLocaleDateString()}</div>
                          <div className="text-muted">{new Date(visit.arrival_time).toLocaleTimeString()}</div>
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {getVisitTypeIcon(visit.visit_type)}
                            {visit.visit_type_display || visit.visit_type}
                          </span>
                        </td>
                        <td>{visit.doctor_info?.full_name || 'Not assigned'}</td>
                        <td>{getStatusBadge(visit.status)}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-ghost" 
                            onClick={() => viewVisitDetails(visit)}
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div className="pagination-info">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} visits
                  </div>
                  <div className="pagination-controls" style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <span className="pagination-current" style={{ padding: '6px 12px', background: '#f0f4f8', borderRadius: 6 }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Visit Detail Modal */}
      {showDetailModal && selectedVisit && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3 className="modal-title">Visit Details: {selectedVisit.visit_number}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Visit Summary */}
              <div className="visit-summary" style={{ marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div><strong>Patient:</strong> {selectedVisit.patient_info?.full_name}</div>
                  <div><strong>Visit Type:</strong> {selectedVisit.visit_type_display || selectedVisit.visit_type}</div>
                  <div><strong>Status:</strong> {getStatusBadge(selectedVisit.status)}</div>
                  <div><strong>Arrival Time:</strong> {new Date(selectedVisit.arrival_time).toLocaleString()}</div>
                  <div><strong>Doctor:</strong> {selectedVisit.doctor_info?.full_name || 'Not assigned'}</div>
                  <div><strong>Nurse:</strong> {selectedVisit.nurse_info?.full_name || 'Not assigned'}</div>
                </div>
                {selectedVisit.chief_complaint && (
                  <div className="alert alert-info" style={{ marginTop: 16 }}>
                    <strong>Chief Complaint:</strong> {selectedVisit.chief_complaint}
                  </div>
                )}
              </div>

              {/* Triage Info */}
              {selectedVisit.has_triage && (
                <div style={{ marginBottom: 24 }}>
                  <h4>Triage Assessment</h4>
                  <div className="triage-info" style={{ background: '#f0f4f8', padding: 16, borderRadius: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                      <div><strong>Category:</strong> {selectedVisit.triage?.category_info?.color_code || 'N/A'}</div>
                      <div><strong>Pain Score:</strong> {selectedVisit.triage?.pain_score || 'N/A'}/10</div>
                      <div><strong>Consciousness:</strong> {selectedVisit.triage?.consciousness_display || 'N/A'}</div>
                      <div><strong>Breathing:</strong> {selectedVisit.triage?.breathing_display || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Consultation Info */}
              {consultationData && (
                <div style={{ marginBottom: 24 }}>
                  <h4>Consultation</h4>
                  <div style={{ background: '#f0f4f8', padding: 16, borderRadius: 8 }}>
                    <div><strong>Diagnosis:</strong> {consultationData.diagnosis}</div>
                    {consultationData.follow_up_date && (
                      <div><strong>Follow-up Date:</strong> {consultationData.follow_up_date}</div>
                    )}
                    {consultationData.notes && (
                      <div><strong>Notes:</strong> {consultationData.notes}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Queue Timeline */}
              {queueData && queueData.length > 0 && (
                <div>
                  <h4>Queue Timeline</h4>
                  <div className="queue-timeline" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {queueData.map((queue, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                        <div className="queue-step" style={{ width: 30, height: 30, borderRadius: '50%', background: '#0a6e6e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div><strong>{queue.department_display || queue.department}</strong></div>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            Queue #{queue.queue_number} • Joined: {new Date(queue.joined_queue).toLocaleTimeString()}
                            {queue.service_start && ` • Started: ${new Date(queue.service_start).toLocaleTimeString()}`}
                            {queue.service_end && ` • Completed: ${new Date(queue.service_end).toLocaleTimeString()}`}
                          </div>
                        </div>
                        <div>
                          {queue.is_completed ? (
                            <CheckCircle size={16} color="#16a34a" />
                          ) : queue.is_serving ? (
                            <Activity size={16} color="#f59e0b" />
                          ) : (
                            <Clock size={16} color="#5f7a7a" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
              {canConsult && selectedVisit.status !== 'COMPLETED' && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => navigate(`/doctor/consult/${selectedVisit.id}`)}
                >
                  <FileText size={16} /> Start Consultation
                </button>
              )}
              {canTriage && !selectedVisit.has_triage && (
                <button 
                  className="btn btn-warning" 
                  onClick={() => navigate(`/nurse/triage/${selectedVisit.id}`)}
                >
                  <Activity size={16} /> Start Triage
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inline-icon {
          vertical-align: middle;
          margin-right: 8px;
        }
        .patient-name {
          font-weight: 500;
        }
        .patient-contact {
          font-size: 11px;
        }
        .text-muted {
          color: #5f7a7a;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid #0a6e6e;
          color: #0a6e6e;
        }
        .btn-outline:hover {
          background: #0a6e6e;
          color: white;
        }
        .alert-info {
          background: #e0f2fe;
          border-left: 3px solid #0284c7;
          padding: 12px;
          border-radius: 6px;
        }
        .btn-warning {
          background: #f59e0b;
          color: white;
        }
        .btn-warning:hover {
          background: #d97706;
        }
      `}</style>
    </div>
  )
}