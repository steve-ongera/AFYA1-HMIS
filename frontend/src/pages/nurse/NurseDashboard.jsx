// pages/nurse/NurseDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, ComposedChart
} from 'recharts'
import { dashboardAPI, visitsAPI, queueAPI, admissionsAPI, triageAPI, inpatientVitalsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { 
  Activity, Hospital, Bed, Heart, Users, Clock, 
  AlertCircle, TrendingUp, Calendar, UserCheck
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function NurseDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [triageQueue, setTriageQueue] = useState([])
  const [activeAdmissions, setActiveAdmissions] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Chart data states
  const [triageTrendData, setTriageTrendData] = useState([])
  const [bedOccupancyData, setBedOccupancyData] = useState([])
  const [loadingCharts, setLoadingCharts] = useState(true)

  useEffect(() => {
    loadDashboardData()
    loadChartData()
  }, [])

  const normalizeList = (data) =>
    Array.isArray(data) ? data : (data?.results ?? [])

  const loadDashboardData = async () => {
    try {
      const [statsData, queueData, admissionsData] = await Promise.all([
        dashboardAPI.stats(),
        queueAPI.byDept('TRIAGE'),
        admissionsAPI.active()
      ])
      setStats(statsData)
      setTriageQueue(normalizeList(queueData))
      setActiveAdmissions(normalizeList(admissionsData))
    } catch (err) {
      console.error('Failed to load dashboard', err)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadChartData = async () => {
    try {
      setLoadingCharts(true)
      
      // 1. FETCH TRIAGE TREND DATA (last 7 days)
      const last7Days = []
      const dateLabels = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dateLabels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
        last7Days.push(date.toISOString().split('T')[0])
      }
      
      // Get triage assessments for each day
      const triagePromises = last7Days.map(date => 
        visitsAPI.list({ date, triaged: true }).catch(() => ({ results: [] }))
      )
      const triageResults = await Promise.all(triagePromises)
      
      // Get triage categories distribution
      const allTriageVisits = await visitsAPI.list({ triaged: true, limit: 500 }).catch(() => ({ results: [] }))
      const triageVisits = normalizeList(allTriageVisits)
      
      // Count by triage category
      const categoryCount = {
        'RED': 0,
        'ORANGE': 0,
        'YELLOW': 0,
        'GREEN': 0,
        'BLUE': 0
      }
      
      triageVisits.forEach(visit => {
        if (visit.triage?.category?.color_code) {
          const color = visit.triage.category.color_code
          if (categoryCount[color] !== undefined) {
            categoryCount[color]++
          }
        }
      })
      
      const trendData = last7Days.map((date, index) => {
        const dayVisits = triageResults[index]
        const triaged = normalizeList(dayVisits).length
        return {
          date: dateLabels[index],
          triaged,
        }
      })
      setTriageTrendData(trendData)
      
      // 2. FETCH BED OCCUPANCY DATA by ward
      const wardsData = await admissionsAPI.getWards ? await admissionsAPI.getWards() : { results: [] }
      const wards = normalizeList(wardsData)
      
      // Get bed occupancy per ward
      const bedsData = await admissionsAPI.getBeds ? await admissionsAPI.getBeds() : { results: [] }
      const allBeds = normalizeList(bedsData)
      
      const wardOccupancy = wards.map(ward => {
        const wardBeds = allBeds.filter(bed => bed.ward === ward.id)
        const occupied = wardBeds.filter(bed => bed.status === 'OCCUPIED').length
        const available = wardBeds.filter(bed => bed.status === 'AVAILABLE').length
        const total = wardBeds.length
        const utilization = total > 0 ? Math.round((occupied / total) * 100) : 0
        
        return {
          ward: ward.ward_name || ward.ward_code,
          occupied,
          available,
          total,
          utilization,
          color: utilization > 80 ? '#dc2626' : utilization > 60 ? '#f59e0b' : '#16a34a'
        }
      }).filter(w => w.total > 0)
      
      setBedOccupancyData(wardOccupancy)
      
    } catch (err) {
      console.error('Failed to load chart data', err)
    } finally {
      setLoadingCharts(false)
    }
  }

  // Calculate triage category distribution for display
  const getTriageDistribution = () => {
    const distribution = [
      { name: 'Red (Immediate)', value: 0, color: '#dc2626' },
      { name: 'Orange (10 min)', value: 0, color: '#f97316' },
      { name: 'Yellow (30 min)', value: 0, color: '#eab308' },
      { name: 'Green (60 min)', value: 0, color: '#22c55e' },
      { name: 'Blue (120 min)', value: 0, color: '#3b82f6' }
    ]
    
    // This would be populated from actual triage data
    // For now, we'll use placeholder values
    return distribution.filter(d => d.value > 0)
  }

  const statCards = [
    { 
      label: 'Triage Queue', 
      value: triageQueue.length, 
      icon: <Activity size={20} />, 
      color: 'warning',
      detail: 'Awaiting assessment',
      action: () => navigate('/nurse/triage')
    },
    { 
      label: 'Active Admissions', 
      value: stats?.total_admitted || 0, 
      icon: <Hospital size={20} />, 
      color: 'info',
      detail: 'Currently hospitalized',
      action: () => navigate('/nurse/vitals')
    },
    { 
      label: 'Available Beds', 
      value: stats?.available_beds || 0, 
      icon: <Bed size={20} />, 
      color: 'success',
      detail: 'Ready for admission',
      action: () => navigate('/nurse/admissions')
    },
    { 
      label: 'Vitals Due Today', 
      value: activeAdmissions.length, 
      icon: <Heart size={20} />, 
      color: 'danger',
      detail: 'Need vitals check',
      action: () => navigate('/nurse/vitals')
    },
  ]

  const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6']

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
            Nurse Dashboard
          </h1>
          <p className="page-subtitle">
            Welcome, {user?.full_name || user?.username} • {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/nurse/triage')}>
            <Activity size={16} /> Start Triage
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

      {/* Chart 1: Triage Trends - Line/Area Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Triage Activity (Last 7 Days)</h3>
          <div className="card-actions">
            <span className="badge badge-info">Daily Triage Volume</span>
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
              <ComposedChart data={triageTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#5f7a7a" />
                <YAxis stroke="#5f7a7a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: 8, border: '1px solid #d1dbd9' }}
                  formatter={(value, name) => [value, name === 'triaged' ? 'Patients Triaged' : name]}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="triaged" 
                  fill="#0a6e6e" 
                  fillOpacity={0.1}
                  stroke="#0a6e6e" 
                  strokeWidth={2}
                  name="Patients Triaged"
                />
                <Line 
                  type="monotone" 
                  dataKey="triaged" 
                  stroke="#0a6e6e" 
                  strokeWidth={3}
                  dot={{ fill: '#0a6e6e', r: 6 }}
                  name="Daily Count"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          <div className="info-text" style={{ marginTop: 16, textAlign: 'center', color: '#5f7a7a' }}>
            <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
            Daily triage volume showing patient flow through emergency/OPD
          </div>
        </div>
      </div>

      {/* Chart 2: Bed Occupancy by Ward - Bar Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Bed Occupancy by Ward</h3>
          <div className="card-actions">
            <span className="badge badge-warning">Current Status</span>
          </div>
        </div>
        <div className="card-body">
          {loadingCharts ? (
            <div className="loading-overlay" style={{ minHeight: 300 }}>
              <div className="spinner"></div>
              <span>Loading bed data...</span>
            </div>
          ) : bedOccupancyData.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 300 }}>
              <Bed size={48} style={{ opacity: 0.5 }} />
              <p>No ward bed data available</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={bedOccupancyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ward" stroke="#5f7a7a" angle={-25} textAnchor="end" height={70} interval={0} />
                  <YAxis stroke="#5f7a7a" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: 8 }}
                    formatter={(value, name) => {
                      const labels = { occupied: 'Occupied', available: 'Available', utilization: 'Utilization %' }
                      return [value, labels[name]]
                    }}
                  />
                  <Legend />
                  <Bar dataKey="occupied" fill="#dc2626" name="Occupied Beds" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="available" fill="#16a34a" name="Available Beds" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Utilization Summary Cards */}
              <div className="utilization-summary" style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                {bedOccupancyData.map(ward => (
                  <div key={ward.ward} className="utilization-card" style={{ 
                    padding: 12, 
                    background: `${ward.color}10`, 
                    borderRadius: 8,
                    borderLeft: `3px solid ${ward.color}`
                  }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{ward.ward}</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: ward.color }}>
                      {ward.utilization}%
                    </div>
                    <div style={{ fontSize: 11, color: '#5f7a7a' }}>
                      {ward.occupied}/{ward.total} beds occupied
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="info-text" style={{ marginTop: 16, textAlign: 'center', color: '#5f7a7a' }}>
            <Hospital size={12} style={{ display: 'inline', marginRight: 4 }} />
            Real-time bed occupancy across all wards - {bedOccupancyData.reduce((sum, w) => sum + w.occupied, 0)} total occupied / {bedOccupancyData.reduce((sum, w) => sum + w.total, 0)} total beds
          </div>
        </div>
      </div>

      {/* Triage Queue Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">
            Triage Queue
            {triageQueue.length > 0 && <span className="badge badge-warning" style={{ marginLeft: 8 }}>{triageQueue.length} waiting</span>}
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/nurse/triage')}>
            View All <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <div className="card-body">
          {triageQueue.length === 0 ? (
            <div className="empty-state">
              <Activity size={48} style={{ opacity: 0.5 }} />
              <p>No patients waiting for triage</p>
            </div>
          ) : (
            triageQueue.slice(0, 5).map((item) => (
              <div key={item.id} className="queue-card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <div className="queue-number" style={{ width: 40, height: 40, borderRadius: '50%', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                  {item.queue_number}
                </div>
                <div className="queue-info" style={{ flex: 1 }}>
                  <div className="queue-name" style={{ fontWeight: 500 }}>{item.patient_name}</div>
                  <div className="queue-meta" style={{ fontSize: 12, color: '#5f7a7a' }}>
                    Arrived: {new Date(item.joined_queue).toLocaleTimeString()} • 
                    Waiting: {item.wait_minutes} min
                    {item.priority_override && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Priority</span>}
                  </div>
                </div>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => navigate(`/nurse/triage?visit=${item.visit}`)}
                  style={{ minWidth: 100 }}
                >
                  <Activity size={14} /> Assess
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Inpatients Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Active Inpatients
            {activeAdmissions.length > 0 && <span className="badge badge-info" style={{ marginLeft: 8 }}>{activeAdmissions.length} admitted</span>}
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/nurse/vitals')}>
            Record Vitals <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <div className="card-body">
          {activeAdmissions.length === 0 ? (
            <div className="empty-state">
              <Hospital size={48} style={{ opacity: 0.5 }} />
              <p>No active inpatient admissions</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Admission #</th>
                    <th>Bed</th>
                    <th>Ward</th>
                    <th>Doctor</th>
                    <th>Length of Stay</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdmissions.map((admission) => (
                    <tr key={admission.id}>
                      <td>
                        <div className="patient-name" style={{ fontWeight: 500 }}>{admission.patient_name}</div>
                        {admission.is_critical && <span className="badge badge-danger" style={{ fontSize: 10 }}>Critical</span>}
                      </td>
                      <td>{admission.admission_number}</td>
                      <td>{admission.bed_info?.bed_number || 'N/A'}</td>
                      <td>{admission.bed_info?.ward_info?.name || admission.bed_info?.ward_info?.code || 'N/A'}</td>
                      <td>{admission.attending_doctor_name || 'N/A'}</td>
                      <td>{admission.length_of_stay || 0} days</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/nurse/vitals?admission=${admission.id}`)}
                            title="Record Vitals"
                          >
                            <Heart size={14} /> Vitals
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => navigate(`/shared/patient/${admission.patient}`)}
                            title="View Patient"
                          >
                            <UserCheck size={14} /> Profile
                          </button>
                        </div>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
        .btn-outline {
          background: transparent;
          border: 1px solid #0a6e6e;
          color: #0a6e6e;
        }
        .btn-outline:hover {
          background: #0a6e6e;
          color: white;
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
        .utilization-card {
          transition: transform 0.2s;
        }
        .utilization-card:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  )
}