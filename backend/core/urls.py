"""
AFYA1 HMIS — core/urls.py
App-level URL patterns for all API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

# ── Auth & Users ──────────────────────────────────────────────────────────────
router.register(r'users',                    views.UserViewSet,                   basename='user')

# ── Patients & Clinical Staff ─────────────────────────────────────────────────
router.register(r'patients',                 views.PatientViewSet,                basename='patient')
router.register(r'doctors',                  views.DoctorViewSet,                 basename='doctor')
router.register(r'nurses',                   views.NurseViewSet,                  basename='nurse')

# ── Lookups ───────────────────────────────────────────────────────────────────
router.register(r'insurance-providers',      views.InsuranceProviderViewSet,      basename='insurance-provider')
router.register(r'specialized-services',     views.SpecializedServiceViewSet,     basename='specialized-service')
router.register(r'diseases',                 views.DiseaseViewSet,                basename='disease')
router.register(r'clinic-settings',          views.ClinicSettingsViewSet,         basename='clinic-settings')
router.register(r'triage-categories',        views.TriageCategoryViewSet,         basename='triage-category')

# ── ICD-10 ────────────────────────────────────────────────────────────────────
router.register(r'icd10-categories',         views.ICD10CategoryViewSet,          basename='icd10-category')
router.register(r'icd10-codes',              views.ICD10CodeViewSet,              basename='icd10-code')

# ── Visits, Triage & Queue ────────────────────────────────────────────────────
router.register(r'visits',                   views.PatientVisitViewSet,           basename='visit')
router.register(r'queue',                    views.QueueManagementViewSet,        basename='queue')

# ── Consultations ─────────────────────────────────────────────────────────────
router.register(r'appointments',             views.AppointmentViewSet,            basename='appointment')
router.register(r'consultations',            views.ConsultationViewSet,           basename='consultation')
router.register(r'consultation-diagnoses',   views.ConsultationDiagnosisViewSet,  basename='consultation-diagnosis')

# ── Pharmacy ──────────────────────────────────────────────────────────────────
router.register(r'medicine-categories',      views.MedicineCategoryViewSet,       basename='medicine-category')
router.register(r'medicines',                views.MedicineViewSet,               basename='medicine')
router.register(r'stock-movements',          views.StockMovementViewSet,          basename='stock-movement')
router.register(r'prescriptions',            views.PrescriptionViewSet,           basename='prescription')
router.register(r'otc-sales',                views.OverTheCounterSaleViewSet,     basename='otc-sale')

# ── Laboratory ────────────────────────────────────────────────────────────────
router.register(r'lab-test-categories',      views.LabTestCategoryViewSet,        basename='lab-test-category')
router.register(r'lab-tests',                views.LabTestViewSet,                basename='lab-test')
router.register(r'lab-orders',               views.LabOrderViewSet,               basename='lab-order')
router.register(r'lab-results',              views.LabResultViewSet,              basename='lab-result')
router.register(r'imaging-studies',          views.ImagingStudyViewSet,           basename='imaging-study')

# ── Inpatient ─────────────────────────────────────────────────────────────────
router.register(r'wards',                    views.WardViewSet,                   basename='ward')
router.register(r'beds',                     views.BedViewSet,                    basename='bed')
router.register(r'admissions',               views.InpatientAdmissionViewSet,     basename='admission')
router.register(r'inpatient-charges',        views.InpatientDailyChargeViewSet,   basename='inpatient-charge')
router.register(r'inpatient-vitals',         views.InpatientVitalsViewSet,        basename='inpatient-vitals')
router.register(r'medicine-requests',        views.InpatientMedicineRequestViewSet, basename='medicine-request')

# ── Emergency ─────────────────────────────────────────────────────────────────
router.register(r'emergency-beds',           views.EmergencyBedViewSet,           basename='emergency-bed')
router.register(r'emergency-visits',         views.EmergencyVisitViewSet,         basename='emergency-visit')

# ── Maternity & MCH ───────────────────────────────────────────────────────────
router.register(r'maternity-visits',         views.MaternityVisitViewSet,         basename='maternity-visit')
router.register(r'mch-visits',               views.MCHVisitViewSet,               basename='mch-visit')

# ── Procurement ───────────────────────────────────────────────────────────────
router.register(r'suppliers',                views.SupplierViewSet,               basename='supplier')
router.register(r'purchase-requests',        views.PurchaseRequestViewSet,        basename='purchase-request')
router.register(r'purchase-orders',          views.PurchaseOrderViewSet,          basename='purchase-order')
router.register(r'goods-received-notes',     views.GoodsReceivedNoteViewSet,      basename='goods-received-note')

# ── Insurance Claims ──────────────────────────────────────────────────────────
router.register(r'consultation-claims',      views.ConsultationInsuranceClaimViewSet, basename='consultation-claim')
router.register(r'pharmacy-claims',          views.PharmacyInsuranceClaimViewSet, basename='pharmacy-claim')
router.register(r'inpatient-claims',         views.InpatientInsuranceClaimViewSet, basename='inpatient-claim')

# ── SHA ───────────────────────────────────────────────────────────────────────
router.register(r'sha-members',              views.SHAMemberViewSet,              basename='sha-member')
router.register(r'sha-claims',               views.SHAClaimViewSet,               basename='sha-claim')

# ── Payment & Billing ─────────────────────────────────────────────────────────
router.register(r'payment-logs',             views.PaymentAuditLogViewSet,        basename='payment-log')
router.register(r'cashier-sessions',         views.CashierSessionViewSet,         basename='cashier-session')

# ── eTIMS ─────────────────────────────────────────────────────────────────────
router.register(r'etims-config',             views.eTIMSConfigurationViewSet,     basename='etims-config')
router.register(r'etims-invoices',           views.eTIMSInvoiceViewSet,           basename='etims-invoice')

# ── HR ────────────────────────────────────────────────────────────────────────
router.register(r'wifi-networks',            views.HospitalWiFiNetworkViewSet,    basename='wifi-network')
router.register(r'attendance-qr-codes',      views.AttendanceQRCodeViewSet,       basename='attendance-qr-code')
router.register(r'attendance',               views.AttendanceViewSet,             basename='attendance')
router.register(r'leave-types',              views.LeaveTypeViewSet,              basename='leave-type')
router.register(r'leave-applications',       views.LeaveApplicationViewSet,       basename='leave-application')

# ── Assets ────────────────────────────────────────────────────────────────────
router.register(r'assets',                   views.HospitalAssetViewSet,          basename='asset')
router.register(r'asset-maintenance-logs',   views.AssetMaintenanceLogViewSet,    basename='asset-maintenance-log')

# ── Audit & Security ──────────────────────────────────────────────────────────
router.register(r'audit-logs',               views.AuditLogViewSet,               basename='audit-log')
router.register(r'security-threats',         views.SecurityThreatViewSet,         basename='security-threat')

# ── Notifications & Messaging ─────────────────────────────────────────────────
router.register(r'notifications',            views.NotificationViewSet,           basename='notification')
router.register(r'conversations',            views.ConversationViewSet,           basename='conversation')


urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('auth/login/',
         views.AuthViewSet.as_view({'post': 'login'}),
         name='auth-login'),

    path('auth/refresh/',
         views.AuthViewSet.as_view({'post': 'refresh'}),
         name='auth-refresh'),

    path('auth/logout/',
         views.AuthViewSet.as_view({'post': 'logout'}),
         name='auth-logout'),

    path('auth/me/',
         views.AuthViewSet.as_view({'get': 'me'}),
         name='auth-me'),

    # ── Dashboard & Reports ───────────────────────────────────────────────────
    path('dashboard/',
         views.DashboardView.as_view(),
         name='dashboard'),

    path('reports/<str:report_type>/',
         views.ReportsView.as_view(),
         name='reports'),

    # ── Router URLs ───────────────────────────────────────────────────────────
    path('', include(router.urls)),
]