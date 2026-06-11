// pages/receptionist/RegisterPatient.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { patientsAPI } from '../../services/api'

export default function RegisterPatient() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'M',
    id_number: '',
    phone_number: '',
    email: '',
    address: '',
    blood_type: '',
    allergies: '',
    chronic_conditions: ''
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.first_name) newErrors.first_name = 'First name is required'
    if (!formData.last_name) newErrors.last_name = 'Last name is required'
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
    if (!formData.phone_number) newErrors.phone_number = 'Phone number is required'
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    setLoading(true)
    try {
      const patient = await patientsAPI.create(formData)
      navigate(`/shared/patient/${patient.id}`)
    } catch (err) {
      console.error('Failed to register patient', err)
      setErrors({ submit: err.message || 'Failed to register patient' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Register New Patient</h1>
          <p className="page-subtitle">Enter patient details to create a new record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Personal Information</h3>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">First Name</label>
                <input type="text" name="first_name" className={`form-input ${errors.first_name ? 'error' : ''}`} value={formData.first_name} onChange={handleChange} />
                {errors.first_name && <div className="form-error">{errors.first_name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label required">Last Name</label>
                <input type="text" name="last_name" className={`form-input ${errors.last_name ? 'error' : ''}`} value={formData.last_name} onChange={handleChange} />
                {errors.last_name && <div className="form-error">{errors.last_name}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Date of Birth</label>
                <input type="date" name="date_of_birth" className={`form-input ${errors.date_of_birth ? 'error' : ''}`} value={formData.date_of_birth} onChange={handleChange} />
                {errors.date_of_birth && <div className="form-error">{errors.date_of_birth}</div>}
              </div>
              <div className="form-group">
                <label className="form-label required">Gender</label>
                <select name="gender" className="form-select" value={formData.gender} onChange={handleChange}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ID Number</label>
                <input type="text" name="id_number" className="form-input" value={formData.id_number} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label required">Phone Number</label>
                <input type="tel" name="phone_number" className={`form-input ${errors.phone_number ? 'error' : ''}`} value={formData.phone_number} onChange={handleChange} />
                {errors.phone_number && <div className="form-error">{errors.phone_number}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" name="email" className={`form-input ${errors.email ? 'error' : ''}`} value={formData.email} onChange={handleChange} />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Blood Type</label>
                <select name="blood_type" className="form-select" value={formData.blood_type} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea name="address" className="form-textarea" rows="2" value={formData.address} onChange={handleChange}></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">Allergies</label>
              <textarea name="allergies" className="form-textarea" rows="2" value={formData.allergies} onChange={handleChange} placeholder="List any known allergies"></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">Chronic Conditions</label>
              <textarea name="chronic_conditions" className="form-textarea" rows="2" value={formData.chronic_conditions} onChange={handleChange} placeholder="List any chronic conditions"></textarea>
            </div>
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Registering...</> : 'Register Patient'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}