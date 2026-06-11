// pages/receptionist/PatientSearch.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { patientsAPI } from '../../services/api'

export default function PatientSearch() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)

  const handleSearch = async () => {
    if (searchTerm.length < 2) return
    setLoading(true)
    try {
      const data = await patientsAPI.list({ search: searchTerm })
      setResults(data)
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Patient Search</h1>
          <p className="page-subtitle">Find and manage patient records</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/receptionist/register')}>
          <i className="bi bi-person-plus"></i> New Patient
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, phone number, or ID number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }}></span> : 'Search'}
          </button>
        </div>
        <div className="card-body">
          {results.length === 0 && searchTerm && !loading && (
            <div className="empty-state">
              <i className="bi bi-person-x" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">No patients found matching "{searchTerm}"</p>
            </div>
          )}
          {results.length > 0 && (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>ID Number</th><th>Age</th><th>Gender</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {results.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.full_name}</td>
                      <td>{patient.phone_number}</td>
                      <td>{patient.id_number || 'N/A'}</td>
                      <td>{patient.age}</td>
                      <td>{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/shared/patient/${patient.id}`)}>
                          <i className="bi bi-eye"></i> View
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/receptionist/new-visit?patient=${patient.id}`)}>
                          <i className="bi bi-plus-circle"></i> New Visit
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
    </div>
  )
}