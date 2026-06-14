/**
 * AFYA1 HMIS — App.jsx
 * Root router: layout shell, protected routes, role-based guards.
 */

import React, { useState, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
// Add these to your imports in App.jsx
import PatientList from './pages/shared/PatientList'
import PatientVisitList from './pages/shared/PatientVisitList'

// ── Lazy-load pages ────────────────────────────────────────────────────────────
const Login = lazy(() => import('./pages/Login'))

// Admin
const AdminDashboard   = lazy(() => import('./pages/admin/AdminDashboard'))
const UserManagement   = lazy(() => import('./pages/admin/UserManagement'))
const SystemSettings   = lazy(() => import('./pages/admin/SystemSettings'))
const AuditLogs        = lazy(() => import('./pages/admin/AuditLogs'))
const SecurityPage     = lazy(() => import('./pages/admin/SecurityPage'))
const AssetRegister    = lazy(() => import('./pages/admin/AssetRegister'))
const AdminReports     = lazy(() => import('./pages/admin/AdminReports'))

// Receptionist
const ReceptionistDashboard = lazy(() => import('./pages/receptionist/ReceptionistDashboard'))
const RegisterPatient       = lazy(() => import('./pages/receptionist/RegisterPatient'))
const NewVisit              = lazy(() => import('./pages/receptionist/NewVisit'))
const Appointments          = lazy(() => import('./pages/receptionist/Appointments'))
const PatientSearch         = lazy(() => import('./pages/receptionist/PatientSearch'))
const QueueDisplay          = lazy(() => import('./pages/receptionist/QueueDisplay'))

// Nurse
const NurseDashboard     = lazy(() => import('./pages/nurse/NurseDashboard'))
const TriageQueue        = lazy(() => import('./pages/nurse/TriageQueue'))
const InpatientVitals    = lazy(() => import('./pages/nurse/InpatientVitals'))
const MedicineRequests   = lazy(() => import('./pages/nurse/MedicineRequests'))
const MaternityPage      = lazy(() => import('./pages/nurse/MaternityPage'))
const MCHPage            = lazy(() => import('./pages/nurse/MCHPage'))

// Doctor
const DoctorDashboard    = lazy(() => import('./pages/doctor/DoctorDashboard'))
const ConsultQueue       = lazy(() => import('./pages/doctor/ConsultQueue'))
const DoctorAppointments = lazy(() => import('./pages/doctor/DoctorAppointments'))
const InpatientRounds    = lazy(() => import('./pages/doctor/InpatientRounds'))
const DoctorLabResults   = lazy(() => import('./pages/doctor/DoctorLabResults'))

// Pharmacy
const PharmacyDashboard = lazy(() => import('./pages/pharmacy/PharmacyDashboard'))
const PrescriptionQueue = lazy(() => import('./pages/pharmacy/PrescriptionQueue'))
const OTCSales          = lazy(() => import('./pages/pharmacy/OTCSales'))
const StockManagement   = lazy(() => import('./pages/pharmacy/StockManagement'))
const StockMovements    = lazy(() => import('./pages/pharmacy/StockMovements'))

// Laboratory
const LabDashboard    = lazy(() => import('./pages/laboratory/LabDashboard'))
const LabOrders       = lazy(() => import('./pages/laboratory/LabOrders'))
const ImagingStudies  = lazy(() => import('./pages/laboratory/ImagingStudies'))
const LabResults      = lazy(() => import('./pages/laboratory/LabResults'))

// Cashier
const CashierDashboard   = lazy(() => import('./pages/cashier/CashierDashboard'))
const SessionManagement  = lazy(() => import('./pages/cashier/SessionManagement'))
const PaymentsPage       = lazy(() => import('./pages/cashier/PaymentsPage'))
const ReceiptsPage       = lazy(() => import('./pages/cashier/ReceiptsPage'))
const CashierReports     = lazy(() => import('./pages/cashier/CashierReports'))

// Insurance
const InsuranceDashboard    = lazy(() => import('./pages/insurance/InsuranceDashboard'))
const ConsultationClaims    = lazy(() => import('./pages/insurance/ConsultationClaims'))
const PharmacyClaims        = lazy(() => import('./pages/insurance/PharmacyClaims'))
const InpatientClaims       = lazy(() => import('./pages/insurance/InpatientClaims'))
const SHAClaimsPage         = lazy(() => import('./pages/insurance/SHAClaimsPage'))
const InsuranceReports      = lazy(() => import('./pages/insurance/InsuranceReports'))

// Procurement
const ProcurementDashboard  = lazy(() => import('./pages/procurement/ProcurementDashboard'))
const PurchaseRequests      = lazy(() => import('./pages/procurement/PurchaseRequests'))
const PurchaseOrders        = lazy(() => import('./pages/procurement/PurchaseOrders'))
const GoodsReceived         = lazy(() => import('./pages/procurement/GoodsReceived'))
const SuppliersPage         = lazy(() => import('./pages/procurement/SuppliersPage'))

// Accountant
const AccountantDashboard = lazy(() => import('./pages/accountant/AccountantDashboard'))
const ETIMSInvoices       = lazy(() => import('./pages/accountant/ETIMSInvoices'))
const ETIMSConfig         = lazy(() => import('./pages/accountant/ETIMSConfig'))
const AccountantPayments  = lazy(() => import('./pages/accountant/AccountantPayments'))
const AccountantReports   = lazy(() => import('./pages/accountant/AccountantReports'))

// HR
const HRDashboard       = lazy(() => import('./pages/hr/HRDashboard'))
const AttendanceQR      = lazy(() => import('./pages/hr/AttendanceQR'))
const AttendanceReport  = lazy(() => import('./pages/hr/AttendanceReport'))
const LeaveManagement   = lazy(() => import('./pages/hr/LeaveManagement'))
const StaffList         = lazy(() => import('./pages/hr/StaffList'))

// Shared
const PatientProfile      = lazy(() => import('./pages/shared/PatientProfile'))
const VisitDetail         = lazy(() => import('./pages/shared/VisitDetail'))
const NotificationsPage   = lazy(() => import('./pages/shared/NotificationsPage'))
const MessagesPage        = lazy(() => import('./pages/shared/MessagesPage'))


// ── Loading fallback ───────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="loading-overlay" style={{ minHeight: '60vh' }}>
      <div className="spinner spinner-lg" />
      <span>Loading…</span>
    </div>
  )
}


// ── ProtectedRoute ─────────────────────────────────────────────────────────────
function ProtectedRoute({ children, roles }) {
  const { isAuth, user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user?.user_type)) {
    // Wrong role → redirect to their own dashboard
    const dashboards = {
      ADMIN: '/admin/dashboard',
      DOCTOR: '/doctor/dashboard',
      NURSE: '/nurse/dashboard',
      RECEPTIONIST: '/receptionist/dashboard',
      PHARMACIST: '/pharmacy/dashboard',
      LAB_TECH: '/laboratory/dashboard',
      CASHIER: '/cashier/dashboard',
      INSURANCE: '/insurance/dashboard',
      PROCUREMENT: '/procurement/dashboard',
      ACCOUNTANT: '/accountant/dashboard',
      HR: '/hr/dashboard',
    }
    return <Navigate to={dashboards[user?.user_type] || '/'} replace />
  }

  return children
}


// ── Layout shell ──────────────────────────────────────────────────────────────
function AppShell({ children }) {
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen((o) => !o)
    } else {
      setCollapsed((c) => !c)
    }
  }

  return (
    <div className="layout">
      <Navbar
        onToggleSidebar={toggleSidebar}
        sidebarOpen={mobileOpen || !collapsed}
      />
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleSidebar}
        mobileOpen={mobileOpen}
      />
      <main className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}


// ── Root redirect ──────────────────────────────────────────────────────────────
function RootRedirect() {
  const { isAuth, user, loading, getDashboardPath } = useAuth()
  if (loading) return <PageLoader />
  if (!isAuth) return <Navigate to="/login" replace />
  return <Navigate to={getDashboardPath()} replace />
}


// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const { isAuth, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
        <span style={{ color: 'var(--text-muted)' }}>Loading AFYA1 HMIS…</span>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public ── */}
        <Route
          path="/login"
          element={isAuth ? <Navigate to="/" replace /> : <Login />}
        />

        {/* ── Root → dashboard redirect ── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ════════════════════════════════════════
            ADMIN
        ════════════════════════════════════════ */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard"   element={<AdminDashboard />} />
                  <Route path="users"        element={<UserManagement />} />
                  <Route path="settings"     element={<SystemSettings />} />
                  <Route path="audit-logs"   element={<AuditLogs />} />
                  <Route path="security"     element={<SecurityPage />} />
                  <Route path="assets"       element={<AssetRegister />} />
                  <Route path="reports"      element={<AdminReports />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            RECEPTIONIST
        ════════════════════════════════════════ */}
        <Route
          path="/receptionist/*"
          element={
            <ProtectedRoute roles={['RECEPTIONIST', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard"   element={<ReceptionistDashboard />} />
                  <Route path="register"    element={<RegisterPatient />} />
                  <Route path="new-visit"   element={<NewVisit />} />
                  <Route path="appointments" element={<Appointments />} />
                  <Route path="search"      element={<PatientSearch />} />
                  <Route path="queue"       element={<QueueDisplay />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            NURSE
        ════════════════════════════════════════ */}
        <Route
          path="/nurse/*"
          element={
            <ProtectedRoute roles={['NURSE', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard"         element={<NurseDashboard />} />
                  <Route path="triage"            element={<TriageQueue />} />
                  <Route path="vitals"            element={<InpatientVitals />} />
                  <Route path="medicine-requests" element={<MedicineRequests />} />
                  <Route path="maternity"         element={<MaternityPage />} />
                  <Route path="mch"               element={<MCHPage />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            DOCTOR
        ════════════════════════════════════════ */}
        <Route
          path="/doctor/*"
          element={
            <ProtectedRoute roles={['DOCTOR', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard"    element={<DoctorDashboard />} />
                  <Route path="queue"        element={<ConsultQueue />} />
                  <Route path="appointments" element={<DoctorAppointments />} />
                  <Route path="inpatient"    element={<InpatientRounds />} />
                  <Route path="lab-results"  element={<DoctorLabResults />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            PHARMACY
        ════════════════════════════════════════ */}
        <Route
          path="/pharmacy/*"
          element={
            <ProtectedRoute roles={['PHARMACIST', 'CASHIER', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard"    element={<PharmacyDashboard />} />
                  <Route path="prescriptions" element={<PrescriptionQueue />} />
                  <Route path="otc"          element={<OTCSales />} />
                  <Route path="stock"        element={<StockManagement />} />
                  <Route path="movements"    element={<StockMovements />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            LABORATORY
        ════════════════════════════════════════ */}
        <Route
          path="/laboratory/*"
          element={
            <ProtectedRoute roles={['LAB_TECH', 'DOCTOR', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard" element={<LabDashboard />} />
                  <Route path="orders"    element={<LabOrders />} />
                  <Route path="imaging"   element={<ImagingStudies />} />
                  <Route path="results"   element={<LabResults />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            CASHIER
        ════════════════════════════════════════ */}
        <Route
          path="/cashier/*"
          element={
            <ProtectedRoute roles={['CASHIER', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard" element={<CashierDashboard />} />
                  <Route path="session"   element={<SessionManagement />} />
                  <Route path="payments"  element={<PaymentsPage />} />
                  <Route path="receipts"  element={<ReceiptsPage />} />
                  <Route path="reports"   element={<CashierReports />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            INSURANCE
        ════════════════════════════════════════ */}
        <Route
          path="/insurance/*"
          element={
            <ProtectedRoute roles={['INSURANCE', 'ACCOUNTANT', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard"    element={<InsuranceDashboard />} />
                  <Route path="consultation" element={<ConsultationClaims />} />
                  <Route path="pharmacy"     element={<PharmacyClaims />} />
                  <Route path="inpatient"    element={<InpatientClaims />} />
                  <Route path="sha"          element={<SHAClaimsPage />} />
                  <Route path="reports"      element={<InsuranceReports />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            PROCUREMENT
        ════════════════════════════════════════ */}
        <Route
          path="/procurement/*"
          element={
            <ProtectedRoute roles={['PROCUREMENT', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard" element={<ProcurementDashboard />} />
                  <Route path="requests"  element={<PurchaseRequests />} />
                  <Route path="orders"    element={<PurchaseOrders />} />
                  <Route path="grn"       element={<GoodsReceived />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            ACCOUNTANT
        ════════════════════════════════════════ */}
        <Route
          path="/accountant/*"
          element={
            <ProtectedRoute roles={['ACCOUNTANT', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard"    element={<AccountantDashboard />} />
                  <Route path="etims"        element={<ETIMSInvoices />} />
                  <Route path="etims-config" element={<ETIMSConfig />} />
                  <Route path="payments"     element={<AccountantPayments />} />
                  <Route path="reports"      element={<AccountantReports />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            HR
        ════════════════════════════════════════ */}
        <Route
          path="/hr/*"
          element={
            <ProtectedRoute roles={['HR', 'ADMIN']}>
              <AppShell>
                <Routes>
                  <Route path="dashboard"  element={<HRDashboard />} />
                  <Route path="qr-codes"   element={<AttendanceQR />} />
                  <Route path="attendance" element={<AttendanceReport />} />
                  <Route path="leave"      element={<LeaveManagement />} />
                  <Route path="staff"      element={<StaffList />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════
            SHARED — accessible to all roles
        ════════════════════════════════════════ */}
        {/* ════════════════════════════════════════
            SHARED — accessible to all roles
        ════════════════════════════════════════ */}
        <Route
          path="/shared/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="patients"      element={<PatientList />} />        {/* NEW */}
                  <Route path="visits"        element={<PatientVisitList />} />    {/* NEW */}
                  <Route path="patient/:id"   element={<PatientProfile />} />
                  <Route path="visit/:id"     element={<VisitDetail />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="messages"      element={<MessagesPage />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* ── 404 ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}