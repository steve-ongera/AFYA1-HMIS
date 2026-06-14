// pages/doctor/DoctorDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, ComposedChart
} from 'recharts'
import { dashboardAPI, queueAPI, appointmentsAPI, labOrdersAPI, consultationsAPI, patientsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { 
  Users, Calendar, Microscope, Activity, Clock, CheckCircle, 
  User, Phone, Mail, AlertCircle, TrendingUp, Briefcase
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [todayAppointments, setTodayAppointments] = useState([])
  const [pendingResults, setPendingResults] = useState([])
  const [myPatients, setMyPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Chart data states
  const [consultationTrendData, setConsultationTrendData] = useState([])
  const [patientTypeData, setPatientTypeData] = useState([])
  const [weeklyActivityData, setWeeklyActivityData] = useState([])
  const [loadingCharts, setLoadingCharts] = useState(true)

  useEffect(() => {
    loadDashboardData()
    loadChartData()
    loadMyPatients()
  }, [])

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.results)) return data.results
    return []
  }

  const loadDashboardData = async () => {
    try {
      const [statsData, queueData, appointmentsData, labData] = await Promise.all([
        dashboardAPI.stats(),
        queueAPI.byDept('CONSULTATION'),
        appointmentsAPI.list({ today: true, my: true }),
        labOrdersAPI.list({ status: 'REPORTED' })
      ])
      setStats(statsData)
      setQueue(normalizeList(queueData))
      setTodayAppointments(normalizeList(appointmentsData))
      setPendingResults(normalizeList(labData))
    } catch (err) {
      console.error('Failed to load dashboard', err)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadMyPatients = async () => {
    try {
      // Get patients from doctor's consultations
      const consultations = await consultationsAPI.list({ doctor: user?.id, limit: 100 })
      const consults = normalizeList(consultations)
      
      // Get unique patients
      const patientMap = new Map()
      for (const consult of consults) {
        if (consult.patient && !patientMap.has(consult.patient)) {
          try {
            const patient = await patientsAPI.get(consult.patient)
            patientMap.set(consult.patient, patient)
          } catch (err) {
            console.error('Failed to load patient', err)
          }
        }
      }
      setMyPatients(Array.from(patientMap.values()))
    } catch (err) {
      console.error('Failed to load my patients', err)
    }
  }

  const loadChartData = async () => {
    try {
      setLoadingCharts(true)
      
      // Get all consultations for this doctor
      const allConsultations = await consultationsAPI.list({ doctor: user?.id, limit: 500 })
      const consults = normalizeList(allConsultations)
      
      // 1. CONSULTATION TREND (last 7 days)
      const last7Days = []
      const dateLabels = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dateLabels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
        last7Days.push(date.toISOString().split('T')[0])
      }
      
      const trendData = last7Days.map((date, index) => {
        const dayConsults = consults.filter(c => c.created_at?.split('T')[0] === date)
        return {
          date: dateLabels[index],
          consultations: dayConsults.length,
          followUps: dayConsults.filter(c => c.follow_up_date).length,
        }
      })
      setConsultationTrendData(trendData)
      
      // 2. PATIENT TYPE DISTRIBUTION (New vs Follow-up)
      const last30Days = new Date()
      last30Days.setDate(last30Days.getDate() - 30)
      const recentConsults = consults.filter(c => new Date(c.created_at) > last30Days)
      
      // Get unique patients to determine new vs returning
      const patientFirstVisit = new Map()
      consults.forEach(consult => {
        if (!patientFirstVisit.has(consult.patient) || 
            new Date(consult.created_at) < new Date(patientFirstVisit.get(consult.patient))) {
          patientFirstVisit.set(consult.patient, consult.created_at)
        }
      })
      
      const newPatients = new Set()
      const returningPatients = new Set()
      
      recentConsults.forEach(consult => {
        const firstVisit = patientFirstVisit.get(consult.patient)
        if (firstVisit && new Date(firstVisit) > last30Days) {
          newPatients.add(consult.patient)
        } else {
          returningPatients.add(consult.patient)
        }
      })
      
      const patientTypeData = [
        { name: 'New Patients', value: newPatients.size, color: '#0a6e6e' },
        { name: 'Returning', value: returningPatients.size, color: '#f59e0b' },
        { name: 'Follow-ups', value: consults.filter(c => c.follow_up_date).length, color: '#16a34a' },
      ]
      setPatientTypeData(patientTypeData)
      
      // 3. WEEKLY ACTIVITY (Consultations by day of week)
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const weekdayCount = [0, 0, 0, 0, 0, 0, 0]
      
      consults.forEach(consult => {
        const date = new Date(consult.created_at)
        let dayIndex = date.getDay()
        // Convert Sunday (0) to 6, Monday-Friday to 0-4
        dayIndex = dayIndex === 0 ? 6 : dayIndex - 1
        if (dayIndex >= 0 && dayIndex < 7) {
          weekdayCount[dayIndex]++
        }
      })
      
      const activityData = dayNames.map((day, index) => ({
        day: day.substring(0, 3),
        consultations: weekdayCount[index],
        percentage: consults.length ? Math.round((weekdayCount[index] / consults.length) * 100) : 0,
      }))
      setWeeklyActivityData(activityData)
      
    } catch (err) {
      console.error('Failed to load chart data', err)
    } finally {
      setLoadingCharts(false)
    }
  }

  const viewPatientDetails = async (patientId) => {
    try {
      const patient = await patientsAPI.get(patientId)
      setSelectedPatient(patient)
      setShowPatientModal(true)
    } catch (err) {
      console.error('Failed to load patient details', err)
      toast.error('Failed to load patient details')
    }
  }

  const statCards = [
    { 
      label: 'In Queue', 
      value: queue.length, 
      icon: <Users size={20} />, 
      color: 'warning',
      detail: 'Waiting for consultation',
      action: () => navigate('/doctor/queue')
    },
    { 
      label: "Today's Appointments", 
      value: todayAppointments.length, 
      icon: <Calendar size={20} />, 
      color: 'primary',
      detail: 'Scheduled for today',
      action: () => navigate('/doctor/appointments')
    },
    { 
      label: 'My Patients', 
      value: myPatients.length, 
      icon: <User size={20} />, 
      color: 'info',
      detail: 'Total patients under care',
      action: () => setShowPatientModal(true)
    },
    { 
      label: 'Pending Lab Results', 
      value: pendingResults.length, 
      icon: <Microscope size={20} />, 
      color: 'danger',
      detail: 'Awaiting review',
      action: () => navigate('/doctor/lab-results')
    },
  ]

  const COLORS = ['#0a6e6e', '#f59e0b', '#16a34a', '#dc2626', '#8b5cf6']

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">
            <Activity className="inline-icon" size={28} />
            Doctor Dashboard
          </h1>
          <p className="page-subtitle">
            Welcome, Dr. {user?.full_name || user?.username} • {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/doctor/queue')}>
            <Users size={16} /> Start Consultation
          </button>
          <button className="btn btn-outline" onClick={loadChartData}>
            <TrendingUp size={16} /> Refresh Stats
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.color}`} onClick={stat.action} style={{ cursor: stat.action ? 'pointer' : 'default' }}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-detail">{stat.detail}</div>
          </div>
        ))}
      </div>

      {/* Chart 1: Consultation Trends */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Consultation Trends (Last 7 Days)</h3>
          <div className="card-actions">
            <span className="badge badge-info">Weekly Overview</span>
          </div>
        </div>
        <div className="card-body">
          {loadingCharts ? (
            <div className="loading-overlay" style={{ minHeight: 300 }}>
              <div className="spinner"></div>
              <span>Loading chart data...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={consultationTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#5f7a7a" />
                <YAxis stroke="#5f7a7a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: 8, border: '1px solid #d1dbd9' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="consultations" 
                  fill="#0a6e6e" 
                  fillOpacity={0.1}
                  stroke="#0a6e6e" 
                  strokeWidth={2}
                  name="Total Consultations"
                />
                <Bar dataKey="followUps" fill="#f59e0b" name="Follow-ups Scheduled" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          <div className="info-text" style={{ marginTop: 16, textAlign: 'center', color: '#5f7a7a' }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} />
            Daily consultation volume and follow-up scheduling trends
          </div>
        </div>
      </div>

      {/* Charts 2 & 3 - Two Column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        
        {/* Chart 2: Patient Type Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Patient Distribution (Last 30 Days)</h3>
            <div className="card-actions">
              <span className="badge badge-success">Patient Analytics</span>
            </div>
          </div>
          <div className="card-body">
            {loadingCharts ? (
              <div className="loading-overlay" style={{ minHeight: 280 }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={patientTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {patientTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [value, 'Patients']}
                      contentStyle={{ backgroundColor: 'white', borderRadius: 8 }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="summary-stats" style={{ textAlign: 'center', marginTop: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#0a6e6e' }}>
                    Total: {patientTypeData.reduce((sum, p) => sum + p.value, 0)}
                  </div>
                  <div style={{ fontSize: 11, color: '#5f7a7a' }}>Unique patients seen</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart 3: Weekly Activity Heatmap */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Weekly Consultation Activity</h3>
            <div className="card-actions">
              <span className="badge badge-warning">Workload Distribution</span>
            </div>
          </div>
          <div className="card-body">
            {loadingCharts ? (
              <div className="loading-overlay" style={{ minHeight: 280 }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyActivityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="day" width={50} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: 8 }}
                    formatter={(value, name) => {
                      if (name === 'consultations') return [value, 'Consultations']
                      return [value, 'Percentage']
                    }}
                  />
                  <Legend />
                  <Bar dataKey="consultations" fill="#0a6e6e" name="Consultations" radius={[0, 4, 4, 0]}>
                    {weeklyActivityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.consultations > 10 ? '#dc2626' : entry.consultations > 5 ? '#f59e0b' : '#16a34a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="info-text" style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#5f7a7a' }}>
              <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
              Busiest days: {weeklyActivityData.reduce((max, day) => day.consultations > max.consultations ? day : max, { consultations: 0 }).day || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Consultation Queue */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">
            Consultation Queue
            {queue.length > 0 && <span className="badge badge-warning" style={{ marginLeft: 8 }}>{queue.length} waiting</span>}
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/doctor/queue')}>
            View All <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <div className="card-body">
          {queue.length === 0 ? (
            <div className="empty-state">
              <Users size={48} style={{ opacity: 0.5 }} />
              <p>No patients in consultation queue</p>
            </div>
          ) : (
            queue.slice(0, 5).map((item) => (
              <div key={item.id} className="queue-card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <div className="queue-number" style={{ width: 40, height: 40, borderRadius: '50%', background: '#0a6e6e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                  {item.queue_number}
                </div>
                <div className="queue-info" style={{ flex: 1 }}>
                  <div className="queue-name" style={{ fontWeight: 500 }}>{item.patient_name}</div>
                  <div className="queue-meta" style={{ fontSize: 12, color: '#5f7a7a' }}>
                    Waiting: {item.wait_minutes} min • Priority: {item.priority_override ? 'High' : 'Normal'}
                    {item.triage_color && <span style={{ marginLeft: 8 }}>Triage: <span className={`badge badge-${item.triage_color?.toLowerCase()}`}>{item.triage_color}</span></span>}
                  </div>
                </div>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => navigate(`/doctor/queue?visit=${item.visit}`)}
                  style={{ minWidth: 100 }}
                >
                  <Activity size={14} /> Start
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Today's Appointments */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">
            Today's Appointments
            {todayAppointments.length > 0 && <span className="badge badge-primary" style={{ marginLeft: 8 }}>{todayAppointments.length} scheduled</span>}
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/doctor/appointments')}>
            View All <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <div className="card-body">
          {todayAppointments.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} style={{ opacity: 0.5 }} />
              <p>No appointments scheduled today</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/doctor/appointments?action=new')}>
                <Calendar size={14} /> Schedule Appointment
              </button>
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Age</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.map((apt) => (
                    <tr key={apt.id}>
                      <td>
                        <div className="time" style={{ fontWeight: 500 }}>{new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td>
                        <div className="patient-name" style={{ fontWeight: 500 }}>{apt.patient_name}</div>
                        <button 
                          className="btn-link" 
                          onClick={() => viewPatientDetails(apt.patient)}
                          style={{ fontSize: 11 }}
                        >
                          View Profile →
                        </button>
                      </td>
                      <td>{apt.patient_age || 'N/A'} yrs</td>
                      <td>
                        <div style={{ maxWidth: 200 }}>
                          {apt.reason}
                          {apt.symptoms && <div className="text-muted" style={{ fontSize: 11 }}>{apt.symptoms.substring(0, 50)}...</div>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${apt.status === 'SCHEDULED' ? 'badge-primary' : 'badge-warning'}`}>
                          {apt.status_display || apt.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => navigate(`/doctor/queue?appointment=${apt.id}`)}
                          style={{ minWidth: 80 }}
                        >
                          {apt.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
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

      {/* Pending Lab Results */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Pending Lab Results
            {pendingResults.length > 0 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>{pendingResults.length} to review</span>}
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/doctor/lab-results')}>
            View All <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <div className="card-body">
          {pendingResults.length === 0 ? (
            <div className="empty-state">
              <Microscope size={48} style={{ opacity: 0.5 }} />
              <p>No pending lab results</p>
            </div>
          ) : (
            pendingResults.slice(0, 5).map((order) => (
              <div key={order.id} className="lab-card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: '#fef3c7', borderRadius: 8, borderLeft: '3px solid #f59e0b' }}>
                <div className="lab-icon">
                  <Microscope size={24} color="#f59e0b" />
                </div>
                <div className="lab-info" style={{ flex: 1 }}>
                  <div className="lab-patient" style={{ fontWeight: 500 }}>{order.patient_name}</div>
                  <div className="lab-meta" style={{ fontSize: 12, color: '#5f7a7a' }}>
                    {order.order_number} • Completed: {new Date(order.completed_at).toLocaleString()}
                    {order.is_critical && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Critical</span>}
                  </div>
                </div>
                <button 
                  className="btn btn-info btn-sm" 
                  onClick={() => navigate(`/doctor/lab-results/${order.id}`)}
                  style={{ minWidth: 100 }}
                >
                  <i className="bi bi-eye"></i> Review
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Patient Details Modal */}
      {showPatientModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowPatientModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">Patient Details</h3>
              <button className="modal-close" onClick={() => setShowPatientModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="patient-summary" style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
                <div className="patient-avatar-lg" style={{ width: 80, height: 80, borderRadius: '50%', background: '#0a6e6e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32, fontWeight: 600 }}>
                  {selectedPatient.full_name?.charAt(0) || 'P'}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 8px 0' }}>{selectedPatient.full_name}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                    <div><strong>ID Number:</strong> {selectedPatient.id_number || 'N/A'}</div>
                    <div><strong>Date of Birth:</strong> {selectedPatient.date_of_birth || 'N/A'}</div>
                    <div><strong>Age:</strong> {selectedPatient.age || '?'} years</div>
                    <div><strong>Gender:</strong> {selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : 'Other'}</div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <strong><Phone size={14} /> Contact</strong>
                  <div>{selectedPatient.phone_number || 'N/A'}</div>
                  <div>{selectedPatient.email || 'No email'}</div>
                </div>
                <div>
                  <strong><Mail size={14} /> Blood Type</strong>
                  <div>{selectedPatient.blood_type || 'Not recorded'}</div>
                </div>
              </div>
              
              {(selectedPatient.allergies || selectedPatient.chronic_conditions) && (
                <div style={{ marginBottom: 24 }}>
                  <strong>Medical Alerts</strong>
                  {selectedPatient.allergies && (
                    <div className="alert alert-warning" style={{ marginTop: 8 }}>
                      <AlertCircle size={14} /> <strong>Allergies:</strong> {selectedPatient.allergies}
                    </div>
                  )}
                  {selectedPatient.chronic_conditions && (
                    <div className="alert alert-info" style={{ marginTop: 8 }}>
                      <Activity size={14} /> <strong>Chronic Conditions:</strong> {selectedPatient.chronic_conditions}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPatientModal(false)}>Close</button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowPatientModal(false)
                  navigate(`/shared/patient/${selectedPatient.id}`)
                }}
              >
                <i className="bi bi-file-text"></i> Full Medical History
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowPatientModal(false)
                  navigate(`/receptionist/new-visit?patientId=${selectedPatient.id}`)
                }}
              >
                <Calendar size={14} /> Schedule Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inline-icon {
          vertical-align: middle;
          margin-right: 8px;
        }
        .stat-detail {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 4px;
        }
        .btn-link {
          background: none;
          border: none;
          color: #0a6e6e;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }
        .btn-link:hover {
          color: #074f4f;
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
        .summary-stats {
          border-top: 1px solid #d1dbd9;
          padding-top: 12px;
        }
        .info-text {
          font-size: 12px;
        }
        .stat-card {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(10,110,110,0.15);
        }
      `}</style>
    </div>
  )
}