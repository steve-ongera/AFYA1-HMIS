// pages/receptionist/PatientSearch.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { patientsAPI } from '../../services/api'

export default function PatientSearch() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm]   = useState('')
  const [results, setResults]         = useState([])
  const [searched, setSearched]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  const handleSearch = async (term = searchTerm) => {
    if (term.trim().length < 2) return
    setLoading(true)
    setError(null)
    setSearched(false)
    try {
      const data = await patientsAPI.list({ search: term.trim() })
      // ✅ Unwrap paginated response { count, results: [...] } OR plain array
      setResults(Array.isArray(data) ? data : (data.results ?? []))
    } catch (err) {
      console.error('Search failed', err)
      setError('Search failed. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const handleChange = (e) => {
    const val = e.target.value
    setSearchTerm(val)
    if (val.trim() === '') {
      setResults([])
      setSearched(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Patient Search</h1>
          <p className="page-subtitle">Find and manage patient records</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/receptionist/register')}>
          <i className="bi bi-person-plus" /> New Patient
        </button>
      </div>

      {/* Search card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-wrapper" style={{ flex: 1 }}>
            <i className="bi bi-search search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, phone number, or ID number…"
              value={searchTerm}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {searchTerm && (
              <button
                className="btn btn-sm btn-ghost"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => { setSearchTerm(''); setResults([]); setSearched(false) }}
              >
                <i className="bi bi-x-lg" />
              </button>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => handleSearch()} disabled={loading || searchTerm.trim().length < 2}>
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Searching…</>
              : <><i className="bi bi-search" /> Search</>}
          </button>
        </div>

        <div className="card-body">

          {/* Error */}
          {error && (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle-fill" /> {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-overlay" style={{ minHeight: 200 }}>
              <div className="spinner spinner-lg" />
              <span>Searching patients…</span>
            </div>
          )}

          {/* No results */}
          {!loading && searched && results.length === 0 && (
            <div className="empty-state">
              <i className="bi bi-person-x" style={{ fontSize: 48, opacity: 0.5 }} />
              <p className="empty-state-text">No patients found matching "{searchTerm}"</p>
              <button className="btn btn-primary" onClick={() => navigate('/receptionist/register')}>
                <i className="bi bi-person-plus" /> Register New Patient
              </button>
            </div>
          )}

          {/* Initial prompt */}
          {!loading && !searched && (
            <div className="empty-state">
              <i className="bi bi-search" style={{ fontSize: 48, opacity: 0.3 }} />
              <p className="empty-state-text" style={{ opacity: 0.6 }}>
                Enter a name, phone number, or ID to search
              </p>
            </div>
          )}

          {/* Results table */}
          {!loading && results.length > 0 && (
            <>
              <p style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 14 }}>
                {results.length} patient{results.length !== 1 ? 's' : ''} found
              </p>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>ID Number</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((patient) => (
                      <tr key={patient.id}>
                        <td>
                          <strong>{patient.full_name || `${patient.first_name} ${patient.last_name}`}</strong>
                        </td>
                        <td>{patient.phone_number || '—'}</td>
                        <td>{patient.id_number || 'N/A'}</td>
                        <td>{patient.age ?? '—'}</td>
                        <td>
                          {patient.gender === 'M' ? 'Male'
                            : patient.gender === 'F' ? 'Female'
                            : 'Other'}
                        </td>
                        <td style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/shared/patient/${patient.id}`)}
                          >
                            <i className="bi bi-eye" /> View
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => navigate(`/receptionist/new-visit?patient=${patient.id}`)}
                          >
                            <i className="bi bi-plus-circle" /> New Visit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}