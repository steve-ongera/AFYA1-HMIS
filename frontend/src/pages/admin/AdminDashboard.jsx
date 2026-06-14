// pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area
} from 'recharts'
import { 
  dashboardAPI, 
  usersAPI, 
  patientsAPI, 
  visitsAPI, 
  paymentsAPI,
  admissionsAPI,
  labOrdersAPI,
  prescriptionsAPI
} from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentUsers, setRecentUsers] = useState([])
  const [recentPatients, setRecentPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Chart data states - populated from real API
  const [visitTrendData, setVisitTrendData] = useState([])
  const [revenueByDepartment, setRevenueByDepartment] = useState([])
  const [departmentUtilization, setDepartmentUtilization] = useState([])
  const [labOrderStats, setLabOrderStats] = useState([])
  const [loadingCharts, setLoadingCharts] = useState(true)

  useEffect(() => {
    loadDashboardData()
    loadChartData()
  }, [])

  const toArray = (data) => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (Array.isArray(data.results)) return data.results
    return []
  }

  const loadDashboardData = async () => {
    try {
      setError(null)
      const [statsData, usersData, patientsData] = await Promise.all([
        dashboardAPI.stats(),
        usersAPI.list({ limit: 5 }),
        patientsAPI.list({ limit: 5 }),
      ])
      setStats(statsData)
      setRecentUsers(toArray(usersData))
      setRecentPatients(toArray(patientsData))
    } catch (err) {
      console.error('Failed to load dashboard', err)
      setError('Failed to load dashboard data. Please refresh.')
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

      // 1. FETCH REAL VISIT DATA for each day
      const visitPromises = last7Days.map(date => 
        visitsAPI.list({ date }).catch(() => ({ results: [] }))
      )
      const visitResults = await Promise.all(visitPromises)
      
      // 2. FETCH REAL REVENUE DATA for each day from payment logs
      const revenuePromises = last7Days.map(date => 
        paymentsAPI.logs({ date }).catch(() => ({ results: [] }))
      )
      const revenueResults = await Promise.all(revenuePromises)
      
      // Process visit trend data with REAL numbers
      const trendData = last7Days.map((date, index) => {
        const dayVisits = visitResults[index]
        const visits = Array.isArray(dayVisits) ? dayVisits.length : (dayVisits.results?.length || 0)
        
        const dayPayments = revenueResults[index]
        const payments = Array.isArray(dayPayments) ? dayPayments : (dayPayments.results || [])
        const revenue = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
        
        return {
          date: dateLabels[index],
          visits,
          revenue,
        }
      })
      setVisitTrendData(trendData)

      // 3. FETCH REAL REVENUE BY DEPARTMENT from payment logs grouped by transaction_type
      const currentMonthStart = new Date()
      currentMonthStart.setDate(1)
      const monthStartStr = currentMonthStart.toISOString().split('T')[0]
      
      const allPayments = await paymentsAPI.logs({ 
        from: monthStartStr,
        to: new Date().toISOString().split('T')[0]
      }).catch(() => ({ results: [] }))
      
      const paymentsList = toArray(allPayments)
      
      // Group by transaction_type
      const deptRevenueMap = {}
      paymentsList.forEach(payment => {
        const dept = payment.transaction_type || 'OTHER'
        const amount = parseFloat(payment.amount) || 0
        deptRevenueMap[dept] = (deptRevenueMap[dept] || 0) + amount
      })
      
      const deptColors = {
        'CONSULTATION_PAYMENT': '#0a6e6e',
        'MEDICINE_SALE': '#0d8f8f',
        'LAB_PAYMENT': '#074f4f',
        'INPATIENT_PAYMENT': '#f59e0b',
        'EMERGENCY_PAYMENT': '#dc2626',
        'OTHER': '#8b5cf6',
      }
      
      const deptLabels = {
        'CONSULTATION_PAYMENT': 'Consultations',
        'MEDICINE_SALE': 'Pharmacy',
        'LAB_PAYMENT': 'Laboratory',
        'INPATIENT_PAYMENT': 'Inpatient',
        'EMERGENCY_PAYMENT': 'Emergency',
        'OTHER': 'Other Services',
      }
      
      const revenueData = Object.entries(deptRevenueMap).map(([key, value]) => ({
        name: deptLabels[key] || key.replace(/_/g, ' '),
        value: value,
        color: deptColors[key] || '#0a6e6e'
      }))
      setRevenueByDepartment(revenueData)

      // 4. FETCH REAL DEPARTMENT UTILIZATION
      // Get active admissions count by department
      const activeAdmissions = await admissionsAPI.list({ active: true }).catch(() => ({ results: [] }))
      const admissions = toArray(activeAdmissions)
      
      // Get ward counts
      const wardsData = await admissionsAPI.getWards ? await admissionsAPI.getWards() : { results: [] }
      const wards = toArray(wardsData)
      
      // Calculate utilization per department based on actual bed occupancy
      const deptUtilization = [
        { 
          department: 'OPD', 
          utilized: Math.round((trendData[trendData.length - 1]?.visits || 0) / 200 * 100), // Assuming 200 daily capacity
          capacity: 100,
          color: '#0a6e6e'
        },
        { 
          department: 'Emergency', 
          utilized: Math.min(100, Math.round((stats?.active_emergency || 0) / 20 * 100)), // 20 bed capacity
          capacity: 100,
          color: '#f59e0b'
        },
        { 
          department: 'Ward', 
          utilized: Math.round(((stats?.occupied_beds || 0) / (stats?.available_beds + stats?.occupied_beds || 1)) * 100),
          capacity: 100,
          color: '#16a34a'
        },
        { 
          department: 'ICU', 
          utilized: Math.min(100, Math.round((admissions.filter(a => a.is_critical).length || 0) / 15 * 100)),
          capacity: 100,
          color: '#dc2626'
        },
        { 
          department: 'Laboratory', 
          utilized: Math.min(100, Math.round((trendData[trendData.length - 1]?.visits || 0) / 150 * 100)),
          capacity: 100,
          color: '#0284c7'
        },
        { 
          department: 'Pharmacy', 
          utilized: Math.min(100, Math.round((trendData[trendData.length - 1]?.visits || 0) / 180 * 100)),
          capacity: 100,
          color: '#8b5cf6'
        },
      ]
      setDepartmentUtilization(deptUtilization)

      // 5. FETCH LAB ORDER STATISTICS
      const labOrders = await labOrdersAPI.list({ status: 'COMPLETED' }).catch(() => ({ results: [] }))
      const ordersList = toArray(labOrders)
      
      // Group lab orders by test category
      const labStatsMap = {}
      ordersList.forEach(order => {
        const category = order.test_items?.[0]?.test?.category?.name || 'General'
        labStatsMap[category] = (labStatsMap[category] || 0) + 1
      })
      
      const labStats = Object.entries(labStatsMap).slice(0, 5).map(([name, count]) => ({
        name: name.length > 15 ? name.substring(0, 12) + '...' : name,
        count,
      }))
      setLabOrderStats(labStats)

    } catch (err) {
      console.error('Failed to load chart data', err)
    } finally {
      setLoadingCharts(false)
    }
  }

  const statCards = [
    { 
      label: 'Total Patients', 
      value: stats?.total_patients || 0, 
      icon: 'bi-people', 
      color: 'primary',
      detail: 'Registered in system'
    },
    { 
      label: 'Total Staff', 
      value: stats?.total_staff || 0, 
      icon: 'bi-person-badge', 
      color: 'info',
      detail: 'Active employees'
    },
    { 
      label: 'Active Admissions', 
      value: stats?.total_admitted || 0, 
      icon: 'bi-hospital', 
      color: 'warning',
      detail: 'Currently hospitalized'
    },
    { 
      label: 'Available Beds', 
      value: stats?.available_beds || 0, 
      icon: 'bi-bed', 
      color: 'success',
      detail: 'Ready for admission'
    },
    { 
      label: 'Due for Maintenance', 
      value: stats?.assets_maintenance_due || 0, 
      icon: 'bi-tools', 
      color: 'danger',
      detail: 'Assets needing service'
    },
    { 
      label: 'Active Emergency', 
      value: stats?.active_emergency || 0, 
      icon: 'bi-ambulance', 
      color: 'danger',
      detail: 'Current emergency cases'
    },
  ]

  const COLORS = ['#0a6e6e', '#0d8f8f', '#074f4f', '#f59e0b', '#dc2626', '#16a34a', '#0284c7', '#8b5cf6']

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
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.full_name || user?.username} | 
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/admin/users')}>
            <i className="bi bi-person-plus"></i> Manage Users
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/settings')}>
            <i className="bi bi-gear"></i> System Settings
          </button>
          <button className="btn btn-outline" onClick={loadChartData}>
            <i className="bi bi-arrow-repeat"></i> Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          <i className="bi bi-exclamation-triangle"></i> {error}
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 12 }} onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.color}`}>
            <div className="stat-icon"><i className={`bi ${stat.icon}`} style={{ fontSize: 20 }}></i></div>
            <div className="stat-value">{stat.value.toLocaleString()}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-detail">{stat.detail}</div>
          </div>
        ))}
      </div>

      {/* Chart 1: Patient Visit & Revenue Trends */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Patient Visits & Revenue Trends (Last 7 Days)</h3>
          <div className="card-actions">
            <span className="badge badge-info">Real-time Data</span>
          </div>
        </div>
        <div className="card-body">
          {loadingCharts ? (
            <div className="loading-overlay" style={{ minHeight: 350 }}>
              <div className="spinner"></div>
              <span>Loading real data...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={visitTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#5f7a7a" angle={-15} textAnchor="end" height={60} />
                <YAxis yAxisId="left" stroke="#0a6e6e" label={{ value: 'Number of Visits', angle: -90, position: 'insideLeft', fill: '#0a6e6e' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" label={{ value: 'Revenue (KES)', angle: 90, position: 'insideRight', fill: '#f59e0b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: 8, border: '1px solid #d1dbd9' }}
                  formatter={(value, name) => {
                    if (name === 'revenue') return [`KES ${value.toLocaleString()}`, 'Revenue']
                    return [value, 'Patient Visits']
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="visits" fill="#0a6e6e" name="Patient Visits" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} name="Revenue (KES)" dot={{ fill: '#f59e0b', r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          <div className="info-text" style={{ marginTop: 16, textAlign: 'center', color: '#5f7a7a' }}>
            <i className="bi bi-bar-chart-steps"></i> Daily patient flow and revenue generation from payment logs
          </div>
        </div>
      </div>

      {/* Charts 2 & 3 - Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        
        {/* Chart 2: Revenue by Department */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Revenue by Department</h3>
            <div className="card-actions">
              <span className="badge badge-success">Current Month</span>
            </div>
          </div>
          <div className="card-body">
            {loadingCharts ? (
              <div className="loading-overlay" style={{ minHeight: 300 }}>
                <div className="spinner"></div>
              </div>
            ) : revenueByDepartment.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-currency-dollar" style={{ fontSize: 48, color: '#d1dbd9' }}></i>
                <p>No payment data available yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={revenueByDepartment}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueByDepartment.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                      contentStyle={{ backgroundColor: 'white', borderRadius: 8 }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="revenue-summary" style={{ marginTop: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#0a6e6e' }}>
                    Total: KES {revenueByDepartment.reduce((sum, dept) => sum + dept.value, 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#5f7a7a' }}>Based on confirmed payment logs</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart 3: Department Utilization */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Department Capacity Utilization</h3>
            <div className="card-actions">
              <span className="badge badge-warning">Live Status</span>
            </div>
          </div>
          <div className="card-body">
            {loadingCharts ? (
              <div className="loading-overlay" style={{ minHeight: 300 }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentUtilization} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="department" width={80} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Utilization Rate']}
                    contentStyle={{ backgroundColor: 'white', borderRadius: 8 }}
                  />
                  <Bar dataKey="utilized" fill="#0a6e6e" radius={[0, 4, 4, 0]}>
                    {departmentUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="info-text" style={{ marginTop: 12, textAlign: 'center', color: '#5f7a7a', fontSize: 12 }}>
              <i className="bi bi-building"></i> Bed occupancy and service demand metrics
            </div>
          </div>
        </div>
      </div>

      {/* Chart 4: Lab Orders Analysis (Optional - 4th chart) */}
      {labOrderStats.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Laboratory Order Analysis</h3>
            <div className="card-actions">
              <span className="badge badge-info">Completed Orders</span>
            </div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={labOrderStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#5f7a7a" angle={-25} textAnchor="end" height={70} interval={0} />
                <YAxis stroke="#5f7a7a" />
                <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="count" fill="#0284c7" name="Number of Orders" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Staff and Patients Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Recent Staff Registrations */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Staff Registrations</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/admin/users')}>
              View All <i className="bi bi-arrow-right"></i>
            </button>
          </div>
          <div className="card-body">
            {recentUsers.length === 0 ? (
              <div className="empty-state"><p>No recent staff registrations</p></div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="user-info">
                            <span className="user-name">{u.full_name}</span>
                            <span className="user-username text-muted">{u.username}</span>
                          </div>
                        </td>
                        <td><span className={`badge badge-role-${u.user_type?.toLowerCase()}`}>{u.user_type}</span></td>
                        <td>
                          {u.is_active
                            ? <span className="badge badge-success">Active</span>
                            : <span className="badge badge-danger">Inactive</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Patient Registrations */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Patient Registrations</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/receptionist/search')}>
              View All <i className="bi bi-arrow-right"></i>
            </button>
          </div>
          <div className="card-body">
            {recentPatients.length === 0 ? (
              <div className="empty-state"><p>No recent patient registrations</p></div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map((patient) => (
                      <tr key={patient.id}>
                        <td>
                          <div className="user-info">
                            <span className="user-name">{patient.full_name}</span>
                            <span className="user-username text-muted">ID: {patient.id_number || 'N/A'}</span>
                          </div>
                        </td>
                        <td>{patient.phone_number}</td>
                        <td>{new Date(patient.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .stat-detail {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 4px;
        }
        .user-info {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: 500;
        }
        .user-username {
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
      `}</style>
    </div>
  )
}