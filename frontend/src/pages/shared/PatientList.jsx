// pages/shared/PatientList.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { patientsAPI, visitsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { 
  Search, UserPlus, Eye, Calendar, Phone, Mail, 
  MapPin, Activity, FileText, Filter, X, Download,
  ChevronLeft, ChevronRight, User, Clock, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PatientList() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [recentVisits, setRecentVisits] = useState([])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20
  
  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    gender: '',
    hasSha: '',
    dateFrom: '',
    dateTo: '',
  })
  
  // Role-based permissions
  const canEdit = hasRole('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST')
  const canCreateVisit = hasRole('RECEPTIONIST', 'ADMIN')
  const canViewMedical = hasRole('DOCTOR', 'NURSE', 'ADMIN')

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: searchTerm || undefined,
        ...filters,
      }
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key]
      })
      
      const data = await patientsAPI.list(params)
      setPatients(data.results || data || [])
      setTotalCount(data.count || (data.length || 0))
      setTotalPages(Math.ceil((data.count || data.length || 0) / pageSize))
    } catch (err) {
      console.error('Failed to load patients', err)
      toast.error('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, filters])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    loadPatients()
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({ gender: '', hasSha: '', dateFrom: '', dateTo: '' })
    setSearchTerm('')
    setCurrentPage(1)
  }

  const viewPatientDetails = async (patient) => {
    setSelectedPatient(patient)
    setShowDetailModal(true)
    
    // Load recent visits for this patient
    try {
      const visits = await patientsAPI.visits(patient.id)
      setRecentVisits(visits.results || visits || [])
    } catch (err) {
      console.error('Failed to load visits', err)
    }
  }

  const createNewVisit = (patientId) => {
    navigate(`/receptionist/new-visit?patientId=${patientId}`)
  }

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '')[0]}${(lastName || '')[0]}`.toUpperCase()
  }

  const getAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A'
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  if (loading && patients.length === 0) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading patients...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">
            <User className="inline-icon" size={28} />
            Patient Directory
          </h1>
          <p className="page-subtitle">
            Manage and search patient records • {totalCount.toLocaleString()} total patients
          </p>
        </div>
        {canCreateVisit && (
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/receptionist/register')}
          >
            <UserPlus size={18} /> Register New Patient
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="search-wrapper" style={{ flex: 1, minWidth: 250, position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5f7a7a' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Search by name, phone number, or ID number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <Search size={16} /> Search
              </button>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} /> Filters
                {Object.values(filters).some(v => v) && <span className="badge badge-primary" style={{ marginLeft: 8 }}>Active</span>}
              </button>
              {(searchTerm || Object.values(filters).some(v => v)) && (
                <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                  <X size={16} /> Clear
                </button>
              )}
            </div>
          </form>

          {/* Advanced Filters */}
          {showFilters && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #d1dbd9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    className="form-select"
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">SHA Status</label>
                  <select 
                    className="form-select"
                    value={filters.hasSha}
                    onChange={(e) => handleFilterChange('hasSha', e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="true">Has SHA</option>
                    <option value="false">No SHA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Registered From</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Registered To</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patients Table */}
      <div className="card">
        <div className="card-body">
          {patients.length === 0 ? (
            <div className="empty-state">
              <User size={48} style={{ opacity: 0.5 }} />
              <p className="empty-state-text">
                {searchTerm || Object.values(filters).some(v => v) 
                  ? 'No patients match your search criteria' 
                  : 'No patients found'}
              </p>
              {canCreateVisit && (
                <button className="btn btn-primary" onClick={() => navigate('/receptionist/register')}>
                  <UserPlus size={16} /> Register First Patient
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Contact</th>
                      <th>Age/Gender</th>
                      <th>Registered</th>
                      <th>SHA</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.id}>
                        <td>
                          <div className="patient-info">
                            <div className="patient-avatar">
                              {getInitials(patient.first_name, patient.last_name)}
                            </div>
                            <div>
                              <div className="patient-name">{patient.full_name}</div>
                              <div className="patient-id text-muted">ID: {patient.id_number || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {patient.phone_number && (
                            <div><Phone size={12} /> {patient.phone_number}</div>
                          )}
                          {patient.email && (
                            <div><Mail size={12} /> {patient.email}</div>
                          )}
                        </td>
                        <td>
                          {getAge(patient.date_of_birth)} yrs • {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                        </td>
                        <td>
                          {new Date(patient.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          {patient.has_sha ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-secondary">None</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              onClick={() => viewPatientDetails(patient)}
                              title="View Details"
                            >
                              <Eye size={14} /> View
                            </button>
                            {canCreateVisit && (
                              <button 
                                className="btn btn-sm btn-primary" 
                                onClick={() => createNewVisit(patient.id)}
                                title="Create Visit"
                              >
                                <Calendar size={14} /> Visit
                              </button>
                            )}
                            {canViewMedical && (
                              <button 
                                className="btn btn-sm btn-outline" 
                                onClick={() => navigate(`/shared/patient/${patient.id}`)}
                                title="Medical History"
                              >
                                <Activity size={14} /> History
                              </button>
                            )}
                          </div>
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
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} patients
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

      {/* Patient Detail Modal */}
      {showDetailModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 className="modal-title">Patient Details</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Patient Summary */}
              <div className="patient-summary" style={{ display: 'flex', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #d1dbd9' }}>
                <div className="patient-avatar-lg" style={{ width: 80, height: 80, borderRadius: '50%', background: '#0a6e6e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32, fontWeight: 600 }}>
                  {getInitials(selectedPatient.first_name, selectedPatient.last_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 8px 0' }}>{selectedPatient.full_name}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                    <div><strong>ID Number:</strong> {selectedPatient.id_number || 'N/A'}</div>
                    <div><strong>Date of Birth:</strong> {selectedPatient.date_of_birth || 'N/A'}</div>
                    <div><strong>Age:</strong> {getAge(selectedPatient.date_of_birth)} years</div>
                    <div><strong>Gender:</strong> {selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : 'Other'}</div>
                    <div><strong>Phone:</strong> {selectedPatient.phone_number || 'N/A'}</div>
                    <div><strong>Email:</strong> {selectedPatient.email || 'N/A'}</div>
                    <div><strong>Blood Type:</strong> {selectedPatient.blood_type || 'N/A'}</div>
                    <div><strong>SHA Status:</strong> {selectedPatient.has_sha ? 'Active Member' : 'Not Enrolled'}</div>
                  </div>
                </div>
              </div>

              {/* Allergies & Conditions */}
              {(selectedPatient.allergies || selectedPatient.chronic_conditions) && (
                <div style={{ marginBottom: 24 }}>
                  <h4>Medical Information</h4>
                  {selectedPatient.allergies && (
                    <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                      <AlertCircle size={16} /> <strong>Allergies:</strong> {selectedPatient.allergies}
                    </div>
                  )}
                  {selectedPatient.chronic_conditions && (
                    <div className="alert alert-info">
                      <Activity size={16} /> <strong>Chronic Conditions:</strong> {selectedPatient.chronic_conditions}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Visits */}
              <h4>Recent Visits</h4>
              {recentVisits.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <p>No recent visits</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Visit #</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentVisits.slice(0, 5).map((visit) => (
                        <tr key={visit.id}>
                          <td>{visit.visit_number}</td>
                          <td>{new Date(visit.arrival_time).toLocaleDateString()}</td>
                          <td>{visit.visit_type_display || visit.visit_type}</td>
                          <td>
                            <span className={`badge badge-${visit.status?.toLowerCase() === 'completed' ? 'success' : 'warning'}`}>
                              {visit.status_display || visit.status}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              onClick={() => navigate(`/shared/visit/${visit.id}`)}
                            >
                              <Eye size={14} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
              {canCreateVisit && (
                <button className="btn btn-primary" onClick={() => createNewVisit(selectedPatient.id)}>
                  <Calendar size={16} /> Create New Visit
                </button>
              )}
              {canViewMedical && (
                <button className="btn btn-outline" onClick={() => navigate(`/shared/patient/${selectedPatient.id}`)}>
                  <FileText size={16} /> Full Medical History
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .patient-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .patient-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0a6e6e, #0d8f8f);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }
        .patient-name {
          font-weight: 500;
        }
        .patient-id {
          font-size: 11px;
        }
        .text-muted {
          color: #5f7a7a;
        }
        .inline-icon {
          vertical-align: middle;
          margin-right: 8px;
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
        .alert-warning {
          background: #fef3c7;
          border-left: 3px solid #f59e0b;
          padding: 12px;
          border-radius: 6px;
        }
        .alert-info {
          background: #e0f2fe;
          border-left: 3px solid #0284c7;
          padding: 12px;
          border-radius: 6px;
        }
      `}</style>
    </div>
  )
}