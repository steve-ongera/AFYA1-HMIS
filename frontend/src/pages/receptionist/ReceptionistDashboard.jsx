// pages/receptionist/ReceptionistDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, ComposedChart
} from 'recharts'
import { dashboardAPI, visitsAPI, queueAPI, appointmentsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function ReceptionistDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentVisits, setRecentVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Chart data states
  const [visitTrendData, setVisitTrendData] = useState([])
  const [visitTypeData, setVisitTypeData] = useState([])
  const [queueStatusData, setQueueStatusData] = useState([])
  const [loadingCharts, setLoadingCharts] = useState(true)

  useEffect(() => {
    loadDashboardData()
    loadChartData()
  }, [])

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.results)) return data.results
    return []
  }

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, visitsData] = await Promise.allSettled([
        dashboardAPI.stats(),
        visitsAPI.list({ ordering: '-arrival_time', limit: 10 }),
      ])

      if (statsData.status === 'fulfilled') {
        console.log('📊 Dashboard stats:', statsData.value)
        setStats(statsData.value)
      } else {
        console.error('❌ Stats failed:', statsData.reason)
      }

      if (visitsData.status === 'fulfilled') {
        console.log('🏥 Visits data:', visitsData.value)
        setRecentVisits(normalizeList(visitsData.value))
      } else {
        console.error('❌ Visits failed:', visitsData.reason)
      }

    } catch (err) {
      console.error('Dashboard load error:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadChartData = async () => {
    try {
      setLoadingCharts(true)
      
      // Get last 7 days for trends
      const last7Days = []
      const dateLabels = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        last7Days.push(dateStr)
        dateLabels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
      }

      // 1. FETCH VISIT TREND DATA (last 7 days)
      const visitPromises = last7Days.map(date => 
        visitsAPI.list({ date }).catch(() => ({ results: [] }))
      )
      const visitResults = await Promise.all(visitPromises)
      
      const trendData = last7Days.map((date, index) => {
        const dayVisits = visitResults[index]
        const visits = normalizeList(dayVisits).length
        return {
          date: dateLabels[index],
          visits,
        }
      })
      setVisitTrendData(trendData)

      // 2. FETCH VISIT TYPE DISTRIBUTION (current month)
      const monthStart = new Date()
      monthStart.setDate(1)
      const monthStartStr = monthStart.toISOString().split('T')[0]
      const monthEndStr = new Date().toISOString().split('T')[0]
      
      const monthVisits = await visitsAPI.list({ 
        from: monthStartStr, 
        to: monthEndStr 
      }).catch(() => ({ results: [] }))
      
      const visitsList = normalizeList(monthVisits)
      
      // Group by visit type
      const typeCountMap = {}
      const typeColors = {
        'EMERGENCY': '#dc2626',
        'OUTPATIENT': '#0a6e6e',
        'INPATIENT': '#f59e0b',
        'FOLLOW_UP': '#16a34a',
        'REFERRAL': '#8b5cf6',
        'ANTENATAL': '#ec489a',
        'IMMUNIZATION': '#06b6d4',
        'GENERAL': '#6b7280',
      }
      
      const typeLabels = {
        'EMERGENCY': 'Emergency',
        'OUTPATIENT': 'Outpatient',
        'INPATIENT': 'Inpatient',
        'FOLLOW_UP': 'Follow-up',
        'REFERRAL': 'Referral',
        'ANTENATAL': 'Antenatal',
        'IMMUNIZATION': 'Immunization',
        'GENERAL': 'General',
      }
      
      visitsList.forEach(visit => {
        const visitType = visit.visit_type || 'GENERAL'
        typeCountMap[visitType] = (typeCountMap[visitType] || 0) + 1
      })
      
      const typeData = Object.entries(typeCountMap).map(([type, count]) => ({
        name: typeLabels[type] || type,
        value: count,
        color: typeColors[type] || '#0a6e6e'
      }))
      setVisitTypeData(typeData)

      // 3. FETCH QUEUE STATUS DATA (current live queue)
      const departments = ['TRIAGE', 'CONSULTATION', 'LABORATORY', 'PHARMACY', 'RADIOLOGY']
      const queuePromises = departments.map(dept => 
        queueAPI.byDept(dept).catch(() => [])
      )
      const queueResults = await Promise.all(queuePromises)
      
      const queueData = departments.map((dept, index) => {
        const queueList = normalizeList(queueResults[index])
        const waiting = queueList.filter(q => !q.is_serving && !q.is_completed).length
        const inService = queueList.filter(q => q.is_serving && !q.is_completed).length
        const completed = queueList.filter(q => q.is_completed).length
        
        const deptColors = {
          'TRIAGE': '#0a6e6e',
          'CONSULTATION': '#f59e0b',
          'LABORATORY': '#dc2626',
          'PHARMACY': '#16a34a',
          'RADIOLOGY': '#8b5cf6',
        }
        
        return {
          department: dept,
          waiting,
          inService,
          completed,
          color: deptColors[dept],
        }
      })
      setQueueStatusData(queueData)

    } catch (err) {
      console.error('Failed to load chart data', err)
    } finally {
      setLoadingCharts(false)
    }
  }

  const statCards = [
    {
      label: "Today's Visits",
      value: stats?.today_visits ?? stats?.visits_today ?? stats?.total_visits_today ?? 0,
      icon: 'bi-calendar-check',
      color: 'primary',
      detail: 'Patients registered today',
    },
    {
      label: 'Waiting for Triage',
      value: stats?.waiting_triage ?? stats?.triage_waiting ?? stats?.waiting ?? 0,
      icon: 'bi-clock-history',
      color: 'warning',
      detail: 'Need initial assessment',
    },
    {
      label: 'In Consultation',
      value: stats?.in_consultation ?? stats?.consultation ?? 0,
      icon: 'bi-person-workspace',
      color: 'info',
      detail: 'Currently with doctors',
    },
    {
      label: 'Completed Today',
      value: stats?.completed_today ?? stats?.completed ?? 0,
      icon: 'bi-check2-circle',
      color: 'success',
      detail: 'Finished visits',
    },
  ]

  const COLORS = ['#0a6e6e', '#f59e0b', '#dc2626', '#16a34a', '#8b5cf6', '#ec489a', '#06b6d4']

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay" style={{ minHeight: '60vh' }}>
          <div className="spinner spinner-lg" />
          <span>Loading dashboard…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">
            Welcome, {user?.full_name || user?.username}
          </h1>
          <p className="page-subtitle">
            Receptionist Dashboard • {new Date().toLocaleDateString('en-KE', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/receptionist/register')}>
            <i className="bi bi-person-plus" /> Register Patient
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/receptionist/new-visit')}>
            <i className="bi bi-plus-circle" /> New Visit
          </button>
          <button className="btn btn-outline" onClick={loadChartData}>
            <i className="bi bi-arrow-repeat" /> Refresh Charts
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          <i className="bi bi-exclamation-triangle-fill" /> {error}
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="stat-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">
              <i className={stat.icon} style={{ fontSize: 20 }} />
            </div>
            <div className="stat-value">{stat.value.toLocaleString()}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-detail">{stat.detail}</div>
          </div>
        ))}
      </div>

      {/* Chart 1: Daily Visit Trends (Line Chart) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Daily Patient Visit Trends (Last 7 Days)</h3>
          <div className="card-actions">
            <span className="badge badge-info">Real-time Data</span>
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
              <ComposedChart data={visitTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#5f7a7a" />
                <YAxis stroke="#5f7a7a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: 8, border: '1px solid #d1dbd9' }}
                  formatter={(value, name) => [value, name === 'visits' ? 'Number of Visits' : name]}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="visits" 
                  fill="#0a6e6e" 
                  fillOpacity={0.2}
                  stroke="#0a6e6e" 
                  strokeWidth={2}
                  name="Patient Visits"
                />
                <Line 
                  type="monotone" 
                  dataKey="visits" 
                  stroke="#0a6e6e" 
                  strokeWidth={3}
                  dot={{ fill: '#0a6e6e', r: 6 }}
                  name="Visit Count"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          <div className="info-text" style={{ marginTop: 16, textAlign: 'center', color: '#5f7a7a' }}>
            <i className="bi bi-graph-up"></i> Daily patient flow showing registration trends
          </div>
        </div>
      </div>

      {/* Charts 2 & 3 - Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        
        {/* Chart 2: Visit Type Distribution (Pie Chart) */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Visit Type Distribution</h3>
            <div className="card-actions">
              <span className="badge badge-success">Current Month</span>
            </div>
          </div>
          <div className="card-body">
            {loadingCharts ? (
              <div className="loading-overlay" style={{ minHeight: 300 }}>
                <div className="spinner"></div>
              </div>
            ) : visitTypeData.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <i className="bi bi-pie-chart" style={{ fontSize: 48, color: '#d1dbd9' }}></i>
                <p>No visit data available this month</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={visitTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {visitTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [value, 'Number of Visits']}
                      contentStyle={{ backgroundColor: 'white', borderRadius: 8 }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="summary-stats" style={{ marginTop: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#0a6e6e' }}>
                    Total: {visitTypeData.reduce((sum, type) => sum + type.value, 0)}
                  </div>
                  <div style={{ fontSize: 11, color: '#5f7a7a' }}>Visits this month</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart 3: Live Queue Status (Stacked Bar Chart) */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Live Queue Status by Department</h3>
            <div className="card-actions">
              <span className="badge badge-warning">Real-time</span>
            </div>
          </div>
          <div className="card-body">
            {loadingCharts ? (
              <div className="loading-overlay" style={{ minHeight: 300 }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={queueStatusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="department" width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: 8 }}
                    formatter={(value, name) => {
                      const labels = { waiting: 'Waiting', inService: 'In Service', completed: 'Completed' }
                      return [value, labels[name]]
                    }}
                  />
                  <Legend />
                  <Bar dataKey="waiting" stackId="a" fill="#f59e0b" name="Waiting" />
                  <Bar dataKey="inService" stackId="a" fill="#0a6e6e" name="In Service" />
                  <Bar dataKey="completed" stackId="a" fill="#16a34a" name="Completed Today" />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="info-text" style={{ marginTop: 12, textAlign: 'center', color: '#5f7a7a', fontSize: 12 }}>
              <i className="bi bi-people"></i> Current patient distribution across departments
            </div>
          </div>
        </div>
      </div>

      {/* Recent visits table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Recent Visits
            {recentVisits.length > 0 && (
              <span className="badge badge-neutral" style={{ marginLeft: 8 }}>
                {recentVisits.length}
              </span>
            )}
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/receptionist/search')}>
            View All <i className="bi bi-arrow-right" />
          </button>
        </div>
        <div className="card-body">
          {recentVisits.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-calendar-x" style={{ fontSize: 48, opacity: 0.5 }} />
              <p className="empty-state-text">No visits found</p>
              <button className="btn btn-primary" onClick={() => navigate('/receptionist/new-visit')}>
                <i className="bi bi-plus-circle" /> Register First Visit
              </button>
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Visit #</th>
                    <th>Patient</th>
                    <th>Type</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.slice(0, 10).map((visit) => (
                    <tr key={visit.id}>
                      <td><strong>{visit.visit_number}</strong></td>
                      <td>{visit.patient_info?.full_name ?? '—'}</td>
                      <td>{visit.visit_type_display ?? visit.visit_type}</td>
                      <td>{new Date(visit.arrival_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <span className={`badge badge-${visit.status?.toLowerCase() === 'completed' ? 'success' : visit.status?.toLowerCase() === 'waiting' ? 'warning' : 'info'}`}>
                          {visit.status_display ?? visit.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => navigate(`/shared/visit/${visit.id}`)}
                        >
                          <i className="bi bi-eye" /> View
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

      <style jsx>{`
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
        .summary-stats {
          border-top: 1px solid #d1dbd9;
          padding-top: 12px;
        }
      `}</style>
    </div>
  )
}