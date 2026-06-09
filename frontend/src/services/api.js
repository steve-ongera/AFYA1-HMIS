/**
 * AFYA1 HMIS — services/api.js
 * Axios instance + ALL API call functions.
 * Base URL: VITE_API_URL (default http://localhost:8000/api)
 *
 * Pattern:
 *   - Every function returns response.data directly.
 *   - Errors propagate as axios errors — callers handle with try/catch.
 *   - Auth token is attached by AuthContext via api.defaults.headers.common.
 *   - 401 refresh-retry is handled by the interceptor in AuthContext.
 */

import axios from 'axios'

// ── Axios instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── Request interceptor — attach token if present ─────────────────────────────
api.interceptors.request.use(
  (config) => config,
  (err) => Promise.reject(err)
)

// ── Response interceptor — unwrap data, normalise errors ──────────────────────
// The 401 retry logic lives in AuthContext to avoid circular deps.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Attach a human-readable message for components
    if (err.response?.data) {
      const d = err.response.data
      err.message =
        d.detail ||
        d.message ||
        (Array.isArray(d) ? d[0] : null) ||
        Object.values(d)?.[0]?.[0] ||
        `Request failed (${err.response.status})`
    }
    return Promise.reject(err)
  }
)

export default api

// ── Helper ─────────────────────────────────────────────────────────────────────
const get  = (url, params) => api.get(url, { params }).then((r) => r.data)
const post = (url, data)   => api.post(url, data).then((r) => r.data)
const put  = (url, data)   => api.put(url, data).then((r) => r.data)
const patch = (url, data)  => api.patch(url, data).then((r) => r.data)
const del  = (url)         => api.delete(url).then((r) => r.data)

// Multipart helper for file uploads
const postForm = (url, formData) =>
  api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)

const patchForm = (url, formData) =>
  api.patch(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)


// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════
export const authAPI = {
  login:   (username, password) => post('/auth/login/',   { username, password }),
  refresh: (refresh)            => post('/auth/refresh/', { refresh }),
  logout:  (refresh)            => post('/auth/logout/',  { refresh }),
  me:      ()                   => get('/auth/me/'),
}


// ══════════════════════════════════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════════════════════════════════
export const usersAPI = {
  list:          (params)       => get('/users/', params),
  get:           (id)           => get(`/users/${id}/`),
  create:        (data)         => post('/users/', data),
  update:        (id, data)     => patch(`/users/${id}/`, data),
  delete:        (id)           => del(`/users/${id}/`),
  activate:      (id)           => post(`/users/${id}/activate/`),
  deactivate:    (id)           => post(`/users/${id}/deactivate/`),
  resetPassword: (id, password) => post(`/users/${id}/reset_password/`, { password }),
}


// ══════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ══════════════════════════════════════════════════════════════════════════════
export const patientsAPI = {
  list:          (params)   => get('/patients/', params),
  get:           (id)       => get(`/patients/${id}/`),
  create:        (data)     => post('/patients/', data),
  update:        (id, data) => patch(`/patients/${id}/`, data),
  visits:        (id)       => get(`/patients/${id}/visits/`),
  prescriptions: (id)       => get(`/patients/${id}/prescriptions/`),
  medicalHistory:(id)       => get(`/patients/${id}/medical_history/`),
  labOrders:     (id)       => get(`/patients/${id}/lab_orders/`),
  shaStatus:     (id)       => get(`/patients/${id}/sha_status/`),
}


// ══════════════════════════════════════════════════════════════════════════════
// DOCTORS & NURSES
// ══════════════════════════════════════════════════════════════════════════════
export const doctorsAPI = {
  list:   (params)   => get('/doctors/', params),
  get:    (id)       => get(`/doctors/${id}/`),
  create: (data)     => postForm('/doctors/', data),
  update: (id, data) => patchForm(`/doctors/${id}/`, data),
  delete: (id)       => del(`/doctors/${id}/`),
}

export const nursesAPI = {
  list:   (params)   => get('/nurses/', params),
  get:    (id)       => get(`/nurses/${id}/`),
  create: (data)     => postForm('/nurses/', data),
  update: (id, data) => patchForm(`/nurses/${id}/`, data),
  delete: (id)       => del(`/nurses/${id}/`),
}


// ══════════════════════════════════════════════════════════════════════════════
// LOOKUPS
// ══════════════════════════════════════════════════════════════════════════════
export const lookupsAPI = {
  insuranceProviders:   (params) => get('/insurance-providers/', params),
  specializedServices:  (params) => get('/specialized-services/', params),
  diseases:             (params) => get('/diseases/', params),
  triageCategories:     ()       => get('/triage-categories/'),
  clinicSettings:       ()       => get('/clinic-settings/1/'),
  updateClinicSettings: (data)   => patch('/clinic-settings/1/', data),
}


// ══════════════════════════════════════════════════════════════════════════════
// ICD-10
// ══════════════════════════════════════════════════════════════════════════════
export const icd10API = {
  search:      (q)       => get('/icd10-codes/search/', { q }),
  list:        (params)  => get('/icd10-codes/', params),
  get:         (id)      => get(`/icd10-codes/${id}/`),
  categories:  (params)  => get('/icd10-categories/', params),
}


// ══════════════════════════════════════════════════════════════════════════════
// VISITS, TRIAGE & QUEUE
// ══════════════════════════════════════════════════════════════════════════════
export const visitsAPI = {
  list:         (params)   => get('/visits/', params),
  get:          (id)       => get(`/visits/${id}/`),
  create:       (data)     => post('/visits/', data),
  update:       (id, data) => patch(`/visits/${id}/`, data),
  triage:       (id, data) => post(`/visits/${id}/triage/`, data),
  assignQueue:  (id, data) => post(`/visits/${id}/assign_queue/`, data),
  updateStatus: (id, data) => post(`/visits/${id}/update_status/`, data),
}

export const queueAPI = {
  list:     (params)  => get('/queue/', params),
  byDept:   (dept)    => get('/queue/', { department: dept }),
  call:     (id)      => post(`/queue/${id}/call/`),
  complete: (id)      => post(`/queue/${id}/complete/`),
}


// ══════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS & CONSULTATIONS
// ══════════════════════════════════════════════════════════════════════════════
export const appointmentsAPI = {
  list:   (params)   => get('/appointments/', params),
  get:    (id)       => get(`/appointments/${id}/`),
  create: (data)     => post('/appointments/', data),
  update: (id, data) => patch(`/appointments/${id}/`, data),
  delete: (id)       => del(`/appointments/${id}/`),
  today:  ()         => get('/appointments/', { today: true }),
}

export const consultationsAPI = {
  list:         (params)   => get('/consultations/', params),
  get:          (id)       => get(`/consultations/${id}/`),
  create:       (data)     => post('/consultations/', data),
  update:       (id, data) => patch(`/consultations/${id}/`, data),
  addDiagnosis: (id, data) => post(`/consultations/${id}/add_diagnosis/`, data),
  prescriptions:(id)       => get(`/consultations/${id}/prescriptions/`),
  labOrders:    (id)       => get(`/consultations/${id}/lab_orders/`),
}

export const diagnosesAPI = {
  list:   (params)   => get('/consultation-diagnoses/', params),
  create: (data)     => post('/consultation-diagnoses/', data),
  update: (id, data) => patch(`/consultation-diagnoses/${id}/`, data),
  delete: (id)       => del(`/consultation-diagnoses/${id}/`),
}


// ══════════════════════════════════════════════════════════════════════════════
// PHARMACY & MEDICINES
// ══════════════════════════════════════════════════════════════════════════════
export const medicinesAPI = {
  list:        (params)        => get('/medicines/', params),
  get:         (id)            => get(`/medicines/${id}/`),
  create:      (data)          => postForm('/medicines/', data),
  update:      (id, data)      => patchForm(`/medicines/${id}/`, data),
  delete:      (id)            => del(`/medicines/${id}/`),
  lowStock:    ()              => get('/medicines/low_stock/'),
  adjustStock: (id, data)      => post(`/medicines/${id}/adjust_stock/`, data),
  categories:  ()              => get('/medicine-categories/'),
}

export const stockAPI = {
  list: (params) => get('/stock-movements/', params),
}

export const prescriptionsAPI = {
  list:     (params) => get('/prescriptions/', params),
  get:      (id)     => get(`/prescriptions/${id}/`),
  create:   (data)   => post('/prescriptions/', data),
  dispense: (id)     => post(`/prescriptions/${id}/dispense/`),
}

export const otcAPI = {
  list:     (params)   => get('/otc-sales/', params),
  get:      (id)       => get(`/otc-sales/${id}/`),
  create:   (data)     => post('/otc-sales/', data),
  dispense: (id)       => post(`/otc-sales/${id}/dispense/`),
  markPaid: (id, data) => post(`/otc-sales/${id}/mark_paid/`, data),
}


// ══════════════════════════════════════════════════════════════════════════════
// LABORATORY & IMAGING
// ══════════════════════════════════════════════════════════════════════════════
export const labTestsAPI = {
  list:       (params) => get('/lab-tests/', params),
  get:        (id)     => get(`/lab-tests/${id}/`),
  categories: ()       => get('/lab-test-categories/'),
}

export const labOrdersAPI = {
  list:          (params)   => get('/lab-orders/', params),
  get:           (id)       => get(`/lab-orders/${id}/`),
  create:        (data)     => post('/lab-orders/', data),
  collectSample: (id)       => post(`/lab-orders/${id}/collect_sample/`),
  enterResults:  (id, data) => post(`/lab-orders/${id}/enter_results/`, data),
  release:       (id)       => post(`/lab-orders/${id}/release_results/`),
}

export const labResultsAPI = {
  list: (params) => get('/lab-results/', params),
  get:  (id)     => get(`/lab-results/${id}/`),
}

export const imagingAPI = {
  list:   (params)   => get('/imaging-studies/', params),
  get:    (id)       => get(`/imaging-studies/${id}/`),
  create: (data)     => postForm('/imaging-studies/', data),
  update: (id, data) => patchForm(`/imaging-studies/${id}/`, data),
}


// ══════════════════════════════════════════════════════════════════════════════
// INPATIENT — WARDS, BEDS, ADMISSIONS
// ══════════════════════════════════════════════════════════════════════════════
export const wardsAPI = {
  list:  (params) => get('/wards/', params),
  get:   (id)     => get(`/wards/${id}/`),
  beds:  (id, params) => get(`/wards/${id}/beds/`, params),
  create:(data)   => post('/wards/', data),
  update:(id, d)  => patch(`/wards/${id}/`, d),
}

export const bedsAPI = {
  list:   (params)   => get('/beds/', params),
  get:    (id)       => get(`/beds/${id}/`),
  create: (data)     => post('/beds/', data),
  update: (id, data) => patch(`/beds/${id}/`, data),
}

export const admissionsAPI = {
  list:         (params)   => get('/admissions/', params),
  get:          (id)       => get(`/admissions/${id}/`),
  create:       (data)     => post('/admissions/', data),
  update:       (id, data) => patch(`/admissions/${id}/`, data),
  active:       ()         => get('/admissions/', { active: true }),
  charges:      (id)       => get(`/admissions/${id}/charges/`),
  addCharge:    (id, data) => post(`/admissions/${id}/add_charge/`, data),
  recordVitals: (id, data) => post(`/admissions/${id}/record_vitals/`, data),
  vitals:       (id)       => get(`/admissions/${id}/vitals/`),
  discharge:    (id, data) => post(`/admissions/${id}/discharge/`, data),
}

export const medicineRequestsAPI = {
  list:     (params)   => get('/medicine-requests/', params),
  get:      (id)       => get(`/medicine-requests/${id}/`),
  create:   (data)     => post('/medicine-requests/', data),
  approve:  (id, data) => post(`/medicine-requests/${id}/approve/`, data),
  dispense: (id)       => post(`/medicine-requests/${id}/dispense/`),
  reject:   (id, data) => post(`/medicine-requests/${id}/reject/`, data),
}


// ══════════════════════════════════════════════════════════════════════════════
// EMERGENCY
// ══════════════════════════════════════════════════════════════════════════════
export const emergencyAPI = {
  beds:         (params)   => get('/emergency-beds/', params),
  visits:       (params)   => get('/emergency-visits/', params),
  getVisit:     (id)       => get(`/emergency-visits/${id}/`),
  createVisit:  (data)     => post('/emergency-visits/', data),
  updateVisit:  (id, data) => patch(`/emergency-visits/${id}/`, data),
  assignBed:    (id, data) => post(`/emergency-visits/${id}/assign_bed/`, data),
  transferWard: (id, data) => post(`/emergency-visits/${id}/transfer_to_ward/`, data),
  addCharge:    (id, data) => post(`/emergency-visits/${id}/add_charge/`, data),
  recordPayment:(id, data) => post(`/emergency-visits/${id}/record_payment/`, data),
}


// ══════════════════════════════════════════════════════════════════════════════
// MATERNITY & MCH
// ══════════════════════════════════════════════════════════════════════════════
export const maternityAPI = {
  list:   (params)   => get('/maternity-visits/', params),
  get:    (id)       => get(`/maternity-visits/${id}/`),
  create: (data)     => post('/maternity-visits/', data),
  update: (id, data) => patch(`/maternity-visits/${id}/`, data),
}

export const mchAPI = {
  list:   (params)   => get('/mch-visits/', params),
  get:    (id)       => get(`/mch-visits/${id}/`),
  create: (data)     => post('/mch-visits/', data),
  update: (id, data) => patch(`/mch-visits/${id}/`, data),
}


// ══════════════════════════════════════════════════════════════════════════════
// PROCUREMENT
// ══════════════════════════════════════════════════════════════════════════════
export const suppliersAPI = {
  list:   (params)   => get('/suppliers/', params),
  get:    (id)       => get(`/suppliers/${id}/`),
  create: (data)     => post('/suppliers/', data),
  update: (id, data) => patch(`/suppliers/${id}/`, data),
}

export const purchaseRequestsAPI = {
  list:               (params) => get('/purchase-requests/', params),
  get:                (id)     => get(`/purchase-requests/${id}/`),
  create:             (data)   => post('/purchase-requests/', data),
  update:             (id, d)  => patch(`/purchase-requests/${id}/`, d),
  submit:             (id)     => post(`/purchase-requests/${id}/submit/`),
  approveHOD:         (id, d)  => post(`/purchase-requests/${id}/approve_hod/`, d),
  approveAccountant:  (id)     => post(`/purchase-requests/${id}/approve_accountant/`),
  approveProcurement: (id)     => post(`/purchase-requests/${id}/approve_procurement/`),
  convertToPO:        (id)     => post(`/purchase-requests/${id}/convert_to_po/`),
  reject:             (id, d)  => post(`/purchase-requests/${id}/reject/`, d),
}

export const purchaseOrdersAPI = {
  list:   (params)   => get('/purchase-orders/', params),
  get:    (id)       => get(`/purchase-orders/${id}/`),
  create: (data)     => post('/purchase-orders/', data),
  update: (id, data) => patch(`/purchase-orders/${id}/`, data),
  send:   (id)       => post(`/purchase-orders/${id}/send/`),
}

export const grnAPI = {
  list:   (params)   => get('/goods-received-notes/', params),
  get:    (id)       => get(`/goods-received-notes/${id}/`),
  create: (data)     => post('/goods-received-notes/', data),
  accept: (id, data) => post(`/goods-received-notes/${id}/accept/`, data),
}


// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE CLAIMS
// ══════════════════════════════════════════════════════════════════════════════
export const consultationClaimsAPI = {
  list:           (params) => get('/consultation-claims/', params),
  get:            (id)     => get(`/consultation-claims/${id}/`),
  create:         (data)   => post('/consultation-claims/', data),
  approve:        (id, d)  => post(`/consultation-claims/${id}/approve/`, d),
  reject:         (id, d)  => post(`/consultation-claims/${id}/reject/`, d),
  confirmPayment: (id, d)  => post(`/consultation-claims/${id}/confirm_payment/`, d),
}

export const pharmacyClaimsAPI = {
  list:    (params) => get('/pharmacy-claims/', params),
  get:     (id)     => get(`/pharmacy-claims/${id}/`),
  create:  (data)   => post('/pharmacy-claims/', data),
  approve: (id)     => post(`/pharmacy-claims/${id}/approve/`),
  reject:  (id, d)  => post(`/pharmacy-claims/${id}/reject/`, d),
}

export const inpatientClaimsAPI = {
  list:    (params)  => get('/inpatient-claims/', params),
  get:     (id)      => get(`/inpatient-claims/${id}/`),
  create:  (data)    => post('/inpatient-claims/', data),
  approve: (id, d)   => post(`/inpatient-claims/${id}/approve/`, d),
  reject:  (id, d)   => post(`/inpatient-claims/${id}/reject/`, d),
}


// ══════════════════════════════════════════════════════════════════════════════
// SHA
// ══════════════════════════════════════════════════════════════════════════════
export const shaAPI = {
  members: {
    list:   (params) => get('/sha-members/', params),
    get:    (id)     => get(`/sha-members/${id}/`),
    create: (data)   => post('/sha-members/', data),
    update: (id, d)  => patch(`/sha-members/${id}/`, d),
    verify: (id)     => post(`/sha-members/${id}/verify/`),
  },
  claims: {
    list:   (params) => get('/sha-claims/', params),
    get:    (id)     => get(`/sha-claims/${id}/`),
    create: (data)   => post('/sha-claims/', data),
    submit: (id)     => post(`/sha-claims/${id}/submit/`),
  },
}


// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT & BILLING
// ══════════════════════════════════════════════════════════════════════════════
export const paymentsAPI = {
  logs:      (params)  => get('/payment-logs/', params),
  getLog:    (id)      => get(`/payment-logs/${id}/`),
}

export const cashierAPI = {
  sessions:        (params)   => get('/cashier-sessions/', params),
  activeSession:   ()         => get('/cashier-sessions/active/'),
  openSession:     (data)     => post('/cashier-sessions/open/', data),
  closeSession:    (id, data) => post(`/cashier-sessions/${id}/close/`, data),
}


// ══════════════════════════════════════════════════════════════════════════════
// eTIMS
// ══════════════════════════════════════════════════════════════════════════════
export const etimsAPI = {
  getConfig:      ()         => get('/etims-config/'),
  updateConfig:   (data)     => patch('/etims-config/', data),
  invoices:       (params)   => get('/etims-invoices/', params),
  getInvoice:     (id)       => get(`/etims-invoices/${id}/`),
  createInvoice:  (data)     => post('/etims-invoices/', data),
  submitInvoice:  (id)       => post(`/etims-invoices/${id}/submit/`),
}


// ══════════════════════════════════════════════════════════════════════════════
// HR — ATTENDANCE & LEAVE
// ══════════════════════════════════════════════════════════════════════════════
export const attendanceAPI = {
  qrCodes:      (params) => get('/attendance-qr-codes/', params),
  todayQR:      ()       => get('/attendance-qr-codes/today/'),
  generateQR:   (data)   => post('/attendance-qr-codes/', data),
  list:         (params) => get('/attendance/', params),
  get:          (id)     => get(`/attendance/${id}/`),
  scanCheckIn:  (data)   => post('/attendance/scan_check_in/', data),
  scanCheckOut: (data)   => post('/attendance/scan_check_out/', data),
  manualEntry:  (data)   => post('/attendance/manual_entry/', data),
}

export const leaveAPI = {
  types:             ()         => get('/leave-types/'),
  list:              (params)   => get('/leave-applications/', params),
  get:               (id)       => get(`/leave-applications/${id}/`),
  apply:             (data)     => post('/leave-applications/', data),
  approveSupervisor: (id, d)    => post(`/leave-applications/${id}/approve_supervisor/`, d),
  approveHR:         (id, d)    => post(`/leave-applications/${id}/approve_hr/`, d),
  reject:            (id, d)    => post(`/leave-applications/${id}/reject/`, d),
}

export const wifiAPI = {
  list:   (params)   => get('/wifi-networks/', params),
  create: (data)     => post('/wifi-networks/', data),
  update: (id, data) => patch(`/wifi-networks/${id}/`, data),
}


// ══════════════════════════════════════════════════════════════════════════════
// ASSETS
// ══════════════════════════════════════════════════════════════════════════════
export const assetsAPI = {
  list:           (params)   => get('/assets/', params),
  get:            (id)       => get(`/assets/${id}/`),
  create:         (data)     => postForm('/assets/', data),
  update:         (id, data) => patchForm(`/assets/${id}/`, data),
  maintenanceDue: ()         => get('/assets/maintenance_due/'),
  byCategory:     (cat)      => get('/assets/by_category/', { category: cat }),
  logs:           (params)   => get('/asset-maintenance-logs/', params),
  createLog:      (data)     => post('/asset-maintenance-logs/', data),
}


// ══════════════════════════════════════════════════════════════════════════════
// AUDIT & SECURITY
// ══════════════════════════════════════════════════════════════════════════════
export const auditAPI = {
  logs:          (params) => get('/audit-logs/', params),
  threats:       (params) => get('/security-threats/', params),
  resolveThreat: (id, d)  => post(`/security-threats/${id}/resolve/`, d),
}


// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS & MESSAGING
// ══════════════════════════════════════════════════════════════════════════════
export const notificationsAPI = {
  list:        (params) => get('/notifications/', params),
  get:         (id)     => get(`/notifications/${id}/`),
  markRead:    (id)     => post(`/notifications/${id}/mark_read/`),
  markAllRead: ()       => post('/notifications/mark_all_read/'),
  unreadCount: ()       => get('/notifications/unread_count/'),
}

export const messagingAPI = {
  conversations:  (params)   => get('/conversations/', params),
  getConversation:(id)       => get(`/conversations/${id}/`),
  createConversation:(data)  => post('/conversations/', data),
  messages:       (id)       => get(`/conversations/${id}/messages/`),
  sendMessage:    (id, data) => post(`/conversations/${id}/send_message/`, data),
}


// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD & REPORTS
// ══════════════════════════════════════════════════════════════════════════════
export const dashboardAPI = {
  stats: () => get('/dashboard/'),
}

export const reportsAPI = {
  /**
   * @param {'daily-visits'|'revenue'|'stock'|'claims'|'lab-turnaround'|'attendance'|'admissions'|'discharge-summary'} type
   */
  get: (type, params) => get(`/reports/${type}/`, params),
}