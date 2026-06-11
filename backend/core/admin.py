"""
AFYA1 HMIS — admin.py
South B Hospital Management Information System
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone

from .models import (
    User, LoginAttempt, AccountLock, TwoFactorCode, UserSession,
    Patient, Doctor, Nurse,
    InsuranceProvider, SpecializedService, Disease, ClinicSettings,
    TriageCategory, PatientVisit, TriageAssessment, QueueManagement,
    Appointment, Consultation, PatientMedicalHistory,
    ICD10Category, ICD10Code, ConsultationDiagnosis,
    MedicineCategory, Medicine, StockMovement, Prescription,
    MedicineSale, SoldMedicine, OverTheCounterSale, OverTheCounterSaleItem,
    LabTestCategory, LabTest, LabOrder, LabOrderItem, LabResult, ImagingStudy,
    Ward, Bed, InpatientAdmission, InpatientDailyCharge, InpatientVitals,
    InpatientMedicineRequest,
    EmergencyBed, EmergencyVisit, EmergencyCharge, EmergencyPayment,
    MaternityVisit, MCHVisit,
    Supplier, PurchaseRequest, PurchaseRequestItem, PurchaseOrder,
    PurchaseOrderItem, GoodsReceivedNote, GoodsReceivedNoteItem,
    ConsultationInsuranceClaim, PharmacyInsuranceClaim, InpatientInsuranceClaim,
    SHAMember, SHAClaim,
    PaymentAuditLog, CashierSession, MPesaDuplicateCheck,
    eTIMSConfiguration, eTIMSInvoice, eTIMSInvoiceItem,
    HospitalWiFiNetwork, AttendanceQRCode, Attendance, LeaveType, LeaveApplication,
    HospitalAsset, AssetMaintenanceLog,
    AuditLog, SecurityThreat, Notification, Conversation, Message,
)


# ============================================================
# HELPERS
# ============================================================

def short_datetime(dt):
    return dt.strftime("%d %b %Y %H:%M") if dt else "—"


# ============================================================
# AUTH & USERS
# ============================================================

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "get_full_name", "user_type", "phone_number", "is_active", "date_joined")
    list_filter = ("user_type", "is_active", "is_staff")
    search_fields = ("username", "first_name", "last_name", "email", "phone_number")
    ordering = ("-date_joined",)
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Hospital Profile", {"fields": ("user_type", "phone_number", "specialization", "license_number")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Hospital Profile", {"fields": ("user_type", "phone_number", "specialization", "license_number")}),
    )


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ("username", "ip_address", "success", "timestamp")
    list_filter = ("success",)
    search_fields = ("username", "ip_address")
    readonly_fields = ("timestamp",)
    date_hierarchy = "timestamp"


@admin.register(AccountLock)
class AccountLockAdmin(admin.ModelAdmin):
    list_display = ("user", "is_locked", "failed_attempts", "locked_at", "unlock_time")
    list_filter = ("is_locked",)
    search_fields = ("user__username",)
    readonly_fields = ("locked_at",)


@admin.register(TwoFactorCode)
class TwoFactorCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "code", "used", "created_at", "expires_at")
    list_filter = ("used",)
    search_fields = ("user__username",)
    readonly_fields = ("created_at",)


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "ip_address", "device_type", "browser", "login_time", "is_active")
    list_filter = ("is_active", "device_type")
    search_fields = ("user__username", "ip_address")
    readonly_fields = ("login_time", "last_activity")
    date_hierarchy = "login_time"


# ============================================================
# PATIENTS, DOCTORS, NURSES
# ============================================================

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("full_name", "gender", "date_of_birth", "phone_number", "blood_type", "created_at")
    list_filter = ("gender", "blood_type")
    search_fields = ("first_name", "last_name", "phone_number", "id_number", "email")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Personal", {"fields": ("first_name", "last_name", "date_of_birth", "gender", "id_number")}),
        ("Contact", {"fields": ("phone_number", "email", "address")}),
        ("Medical", {"fields": ("blood_type", "allergies", "chronic_conditions")}),
        ("Meta", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("full_name", "specialization", "license_number", "department", "is_active")
    list_filter = ("specialization", "is_active", "gender")
    search_fields = ("first_name", "last_name", "license_number", "id_number")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Personal", {"fields": ("user", "first_name", "last_name", "date_of_birth", "gender", "id_number", "profile_picture")}),
        ("Contact", {"fields": ("phone_number", "email")}),
        ("Professional", {"fields": ("specialization", "license_number", "license_expiry", "years_of_experience", "qualifications", "department", "joining_date")}),
        ("Status", {"fields": ("is_active",)}),
        ("Meta", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(Nurse)
class NurseAdmin(admin.ModelAdmin):
    list_display = ("full_name", "nurse_type", "department", "is_charge_nurse", "is_active")
    list_filter = ("nurse_type", "department", "is_charge_nurse", "is_active")
    search_fields = ("first_name", "last_name", "nurse_id", "license_number")
    readonly_fields = ("created_at", "updated_at")


# ============================================================
# FACILITY & LOOKUP MODELS
# ============================================================

@admin.register(InsuranceProvider)
class InsuranceProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")


@admin.register(SpecializedService)
class SpecializedServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "consultation_fee")
    search_fields = ("name",)


@admin.register(Disease)
class DiseaseAdmin(admin.ModelAdmin):
    list_display = ("name", "icd_code")
    search_fields = ("name", "icd_code")


@admin.register(ClinicSettings)
class ClinicSettingsAdmin(admin.ModelAdmin):
    list_display = ("clinic_name", "phone_number", "email", "max_patients_per_day")


# ============================================================
# VISITS, TRIAGE & QUEUE
# ============================================================

@admin.register(TriageCategory)
class TriageCategoryAdmin(admin.ModelAdmin):
    list_display = ("priority_level", "color_code", "name", "max_wait_time", "is_active")
    list_filter = ("is_active",)
    ordering = ("priority_level",)


class TriageAssessmentInline(admin.StackedInline):
    model = TriageAssessment
    extra = 0
    readonly_fields = ("assessment_time", "created_at", "bmi")


class QueueManagementInline(admin.TabularInline):
    model = QueueManagement
    extra = 0
    readonly_fields = ("joined_queue", "created_at")


@admin.register(PatientVisit)
class PatientVisitAdmin(admin.ModelAdmin):
    list_display = ("visit_number", "patient", "visit_type", "status", "arrival_time", "assigned_doctor")
    list_filter = ("visit_type", "status")
    search_fields = ("visit_number", "patient__first_name", "patient__last_name")
    readonly_fields = ("visit_number", "created_at", "updated_at")
    date_hierarchy = "arrival_time"
    inlines = [TriageAssessmentInline, QueueManagementInline]


@admin.register(TriageAssessment)
class TriageAssessmentAdmin(admin.ModelAdmin):
    list_display = ("visit", "category", "pain_score", "consciousness_level", "requires_immediate_attention", "assessed_by")
    list_filter = ("category", "consciousness_level", "requires_immediate_attention")
    search_fields = ("visit__visit_number",)
    readonly_fields = ("assessment_time", "created_at", "bmi")


@admin.register(QueueManagement)
class QueueManagementAdmin(admin.ModelAdmin):
    list_display = ("queue_number", "department", "visit", "is_active", "is_serving", "is_completed", "joined_queue")
    list_filter = ("department", "is_active", "is_serving", "is_completed")
    search_fields = ("visit__visit_number",)
    date_hierarchy = "joined_queue"


# ============================================================
# CONSULTATIONS & DIAGNOSES
# ============================================================

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "scheduled_time", "status")
    list_filter = ("status",)
    search_fields = ("patient__first_name", "patient__last_name", "doctor__username")
    date_hierarchy = "scheduled_time"
    readonly_fields = ("created_at", "updated_at")


class PrescriptionInline(admin.TabularInline):
    model = Prescription
    extra = 0
    readonly_fields = ("prescribed_at",)


class ConsultationDiagnosisInline(admin.TabularInline):
    model = ConsultationDiagnosis
    extra = 0
    readonly_fields = ("diagnosed_date", "created_at")


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ("consultation_code", "appointment", "follow_up_date", "created_at")
    search_fields = ("consultation_code", "appointment__patient__first_name", "appointment__patient__last_name")
    readonly_fields = ("consultation_code", "created_at", "updated_at")
    inlines = [ConsultationDiagnosisInline, PrescriptionInline]
    date_hierarchy = "created_at"


@admin.register(PatientMedicalHistory)
class PatientMedicalHistoryAdmin(admin.ModelAdmin):
    list_display = ("patient", "record_type", "date_recorded", "recorded_by")
    list_filter = ("record_type",)
    search_fields = ("patient__first_name", "patient__last_name")
    date_hierarchy = "date_recorded"


@admin.register(ICD10Category)
class ICD10CategoryAdmin(admin.ModelAdmin):
    list_display = ("chapter_number", "code_range", "category_name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("chapter_number", "category_name", "code_range")
    ordering = ("chapter_number",)


@admin.register(ICD10Code)
class ICD10CodeAdmin(admin.ModelAdmin):
    list_display = ("code", "short_description", "category", "nhif_eligible", "sha_covered", "is_common", "usage_count")
    list_filter = ("is_active", "is_common", "nhif_eligible", "sha_covered", "is_notifiable", "requires_isolation")
    search_fields = ("code", "short_description", "description", "local_name")
    readonly_fields = ("usage_count", "created_at")
    ordering = ("code",)


@admin.register(ConsultationDiagnosis)
class ConsultationDiagnosisAdmin(admin.ModelAdmin):
    list_display = ("icd10_code", "diagnosis_type", "certainty", "consultation", "diagnosed_date", "submitted_to_nhif")
    list_filter = ("diagnosis_type", "certainty", "submitted_to_nhif")
    search_fields = ("icd10_code__code", "icd10_code__short_description")
    readonly_fields = ("diagnosed_date", "created_at")


# ============================================================
# PHARMACY & MEDICINES
# ============================================================

@admin.register(MedicineCategory)
class MedicineCategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "unit_type", "quantity_in_stock", "reorder_level", "is_low_stock", "price_per_unit_cash", "expiry_date")
    list_filter = ("category", "unit_type")
    search_fields = ("name", "manufacturer", "batch_number")
    readonly_fields = ("created_at", "updated_at", "is_low_stock")
    fieldsets = (
        ("General", {"fields": ("name", "category", "description", "manufacturer", "image")}),
        ("Stock", {"fields": ("unit_type", "units_per_pack", "pack_name", "quantity_in_stock", "reorder_level", "batch_number", "expiry_date")}),
        ("Pricing", {"fields": ("cost_per_unit_cash", "price_per_unit_cash", "price_per_unit_insurance")}),
        ("Meta", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def is_low_stock(self, obj):
        return obj.is_low_stock
    is_low_stock.boolean = True
    is_low_stock.short_description = "Low Stock?"


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("medicine", "movement_type", "quantity", "previous_quantity", "new_quantity", "performed_by", "created_at")
    list_filter = ("movement_type",)
    search_fields = ("medicine__name", "batch_number")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("medicine", "quantity", "dosage_text", "is_dispensed", "is_insured", "total_price", "prescribed_at")
    list_filter = ("is_dispensed", "is_insured")
    search_fields = ("medicine__name", "consultation__consultation_code")
    readonly_fields = ("prescribed_at",)
    date_hierarchy = "prescribed_at"


class SoldMedicineInline(admin.TabularInline):
    model = SoldMedicine
    extra = 0


@admin.register(MedicineSale)
class MedicineSaleAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "payment_method", "total_amount", "sale_date")
    list_filter = ("payment_method",)
    search_fields = ("patient__first_name", "patient__last_name", "mpesa_code")
    readonly_fields = ("sale_date",)
    date_hierarchy = "sale_date"
    inlines = [SoldMedicineInline]


class OTCSaleItemInline(admin.TabularInline):
    model = OverTheCounterSaleItem
    extra = 0
    readonly_fields = ("subtotal", "created_at")


@admin.register(OverTheCounterSale)
class OverTheCounterSaleAdmin(admin.ModelAdmin):
    list_display = ("sale_id", "customer_name", "total_amount", "payment_status", "is_dispensed", "cashier", "created_at")
    list_filter = ("payment_status", "is_dispensed")
    search_fields = ("sale_id", "customer_name", "mpesa_code")
    readonly_fields = ("sale_id", "created_at", "updated_at")
    date_hierarchy = "created_at"
    inlines = [OTCSaleItemInline]


# ============================================================
# LABORATORY & IMAGING
# ============================================================

@admin.register(LabTestCategory)
class LabTestCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "category_type", "department", "is_active")
    list_filter = ("category_type", "is_active")
    search_fields = ("name", "department")


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ("test_code", "test_name", "category", "sample_type", "cost", "nhif_covered", "sha_covered", "is_active")
    list_filter = ("category", "sample_type", "nhif_covered", "sha_covered", "is_active")
    search_fields = ("test_code", "test_name")
    readonly_fields = ("usage_count", "created_at")


class LabOrderItemInline(admin.TabularInline):
    model = LabOrderItem
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "patient", "priority", "status", "total_cost", "paid", "ordered_at")
    list_filter = ("status", "priority", "paid")
    search_fields = ("order_number", "patient__first_name", "patient__last_name")
    readonly_fields = ("order_number", "ordered_at", "created_at")
    date_hierarchy = "ordered_at"
    inlines = [LabOrderItemInline]


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ("lab_order", "is_critical", "quality_control_passed", "patient_notified", "result_released_to_patient", "created_at")
    list_filter = ("is_critical", "quality_control_passed", "patient_notified", "result_released_to_patient")
    search_fields = ("lab_order__order_number",)
    readonly_fields = ("created_at",)


@admin.register(ImagingStudy)
class ImagingStudyAdmin(admin.ModelAdmin):
    list_display = ("modality", "body_part", "patient", "status", "is_urgent", "ordered_by", "ordered_at")
    list_filter = ("modality", "status", "is_urgent")
    search_fields = ("patient__first_name", "patient__last_name", "study_description")
    readonly_fields = ("ordered_at", "created_at")
    date_hierarchy = "ordered_at"


# ============================================================
# INPATIENT
# ============================================================

class BedInline(admin.TabularInline):
    model = Bed
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ("ward_code", "ward_name", "ward_type", "total_beds", "occupied_beds_count", "available_beds_count", "is_active")
    list_filter = ("ward_type", "is_active")
    search_fields = ("ward_code", "ward_name")
    readonly_fields = ("created_at", "occupied_beds_count", "available_beds_count")
    inlines = [BedInline]


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ("bed_number", "ward", "bed_type", "status", "has_oxygen", "has_monitor", "daily_rate", "is_active")
    list_filter = ("bed_type", "status", "has_oxygen", "has_monitor", "has_ventilator", "is_active")
    search_fields = ("bed_number", "ward__ward_code", "ward__ward_name")
    readonly_fields = ("created_at",)


class InpatientDailyChargeInline(admin.TabularInline):
    model = InpatientDailyCharge
    extra = 0
    readonly_fields = ("total_amount", "created_at")


class InpatientVitalsInline(admin.TabularInline):
    model = InpatientVitals
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(InpatientAdmission)
class InpatientAdmissionAdmin(admin.ModelAdmin):
    list_display = ("admission_number", "patient", "bed", "admission_type", "status", "is_critical", "total_charges", "admission_datetime")
    list_filter = ("status", "admission_type", "is_critical", "is_insured")
    search_fields = ("admission_number", "patient__first_name", "patient__last_name")
    readonly_fields = ("admission_number", "length_of_stay", "outstanding_balance", "created_at", "updated_at")
    date_hierarchy = "admission_datetime"
    inlines = [InpatientDailyChargeInline, InpatientVitalsInline]


@admin.register(InpatientMedicineRequest)
class InpatientMedicineRequestAdmin(admin.ModelAdmin):
    list_display = ("request_number", "medicine", "admission", "quantity_requested", "priority", "status", "requested_at")
    list_filter = ("status", "priority")
    search_fields = ("request_number", "medicine__name", "admission__admission_number")
    readonly_fields = ("request_number", "requested_at", "updated_at")
    date_hierarchy = "requested_at"


# ============================================================
# EMERGENCY
# ============================================================

@admin.register(EmergencyBed)
class EmergencyBedAdmin(admin.ModelAdmin):
    list_display = ("bed_number", "location", "status", "has_oxygen", "has_monitor", "has_suction", "is_active")
    list_filter = ("status", "is_active")
    search_fields = ("bed_number", "location")


class EmergencyChargeInline(admin.TabularInline):
    model = EmergencyCharge
    extra = 0
    readonly_fields = ("total_amount", "created_at")


class EmergencyPaymentInline(admin.TabularInline):
    model = EmergencyPayment
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(EmergencyVisit)
class EmergencyVisitAdmin(admin.ModelAdmin):
    list_display = ("visit", "triage_level", "arrival_mode", "injury_type", "treatment_status", "police_case", "total_charges", "payment_status")
    list_filter = ("triage_level", "arrival_mode", "injury_type", "treatment_status", "police_case", "payment_status")
    search_fields = ("visit__visit_number", "ob_number")
    readonly_fields = ("monitoring_hours", "created_at", "updated_at")
    inlines = [EmergencyChargeInline, EmergencyPaymentInline]


# ============================================================
# MATERNITY & MCH
# ============================================================

@admin.register(MaternityVisit)
class MaternityVisitAdmin(admin.ModelAdmin):
    list_display = ("visit", "visit_purpose", "gravida", "para", "is_in_labor", "is_high_risk", "needs_csection")
    list_filter = ("visit_purpose", "is_in_labor", "is_high_risk", "needs_csection", "fetal_distress")
    search_fields = ("visit__visit_number",)
    readonly_fields = ("created_at",)


@admin.register(MCHVisit)
class MCHVisitAdmin(admin.ModelAdmin):
    list_display = ("visit", "visit_type", "child_age_months", "weight_kg", "has_danger_signs", "immunization_due", "mothers_name")
    list_filter = ("visit_type", "has_danger_signs", "immunization_due", "needs_doctor_consultation")
    search_fields = ("visit__visit_number", "mothers_name", "mothers_phone")
    readonly_fields = ("created_at",)


# ============================================================
# PROCUREMENT
# ============================================================

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("supplier_code", "supplier_name", "supplier_type", "contact_person", "phone_number", "status", "city")
    list_filter = ("supplier_type", "status", "county")
    search_fields = ("supplier_code", "supplier_name", "contact_person", "pin_number")
    readonly_fields = ("supplier_code", "created_at", "updated_at")


class PurchaseRequestItemInline(admin.TabularInline):
    model = PurchaseRequestItem
    extra = 0
    readonly_fields = ("estimated_total", "created_at")


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ("request_number", "requesting_department", "requested_by", "urgency", "status", "estimated_cost", "created_at")
    list_filter = ("status", "urgency", "requesting_department")
    search_fields = ("request_number", "requested_by__username")
    readonly_fields = ("request_number", "created_at", "updated_at")
    date_hierarchy = "created_at"
    inlines = [PurchaseRequestItemInline]


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0
    readonly_fields = ("total_price", "quantity_pending", "created_at")


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ("po_number", "supplier", "po_date", "status", "total_amount", "approved_by")
    list_filter = ("status", "payment_terms")
    search_fields = ("po_number", "supplier__supplier_name")
    readonly_fields = ("po_number", "created_at", "updated_at")
    date_hierarchy = "po_date"
    inlines = [PurchaseOrderItemInline]


class GRNItemInline(admin.TabularInline):
    model = GoodsReceivedNoteItem
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(GoodsReceivedNote)
class GoodsReceivedNoteAdmin(admin.ModelAdmin):
    list_display = ("grn_number", "purchase_order", "delivery_date", "status", "received_by", "has_quality_issues")
    list_filter = ("status", "has_quality_issues")
    search_fields = ("grn_number", "purchase_order__po_number", "delivery_note_number", "invoice_number")
    readonly_fields = ("grn_number", "created_at", "updated_at")
    date_hierarchy = "delivery_date"
    inlines = [GRNItemInline]


# ============================================================
# INSURANCE CLAIMS
# ============================================================

@admin.register(ConsultationInsuranceClaim)
class ConsultationInsuranceClaimAdmin(admin.ModelAdmin):
    list_display = ("claim_number", "patient", "insurance_provider", "consultation_fee", "status", "claims_officer_approved", "payment_confirmed")
    list_filter = ("status", "insurance_provider", "claims_officer_approved", "payment_confirmed", "insurance_payment_received")
    search_fields = ("claim_number", "patient__first_name", "patient__last_name", "member_number")
    readonly_fields = ("claim_number", "created_at", "updated_at")
    date_hierarchy = "created_at"


@admin.register(PharmacyInsuranceClaim)
class PharmacyInsuranceClaimAdmin(admin.ModelAdmin):
    list_display = ("claim_number", "claim_type", "patient", "insurance_provider", "total_amount", "insurance_covered", "patient_copay", "status", "payment_confirmed")
    list_filter = ("status", "claim_type", "insurance_provider", "claims_officer_approved", "payment_confirmed")
    search_fields = ("claim_number", "patient__first_name", "patient__last_name", "member_number")
    readonly_fields = ("claim_number", "created_at", "updated_at")
    date_hierarchy = "created_at"


@admin.register(InpatientInsuranceClaim)
class InpatientInsuranceClaimAdmin(admin.ModelAdmin):
    list_display = ("claim_number", "admission", "insurance_provider", "total_charges", "approved_amount", "status", "payment_confirmed")
    list_filter = ("status", "insurance_provider", "claims_officer_approved", "payment_confirmed")
    search_fields = ("claim_number", "admission__patient__first_name", "admission__patient__last_name", "member_number")
    readonly_fields = ("claim_number", "created_at", "updated_at")
    date_hierarchy = "created_at"


# ============================================================
# SHA
# ============================================================

@admin.register(SHAMember)
class SHAMemberAdmin(admin.ModelAdmin):
    list_display = ("sha_number", "patient", "package_name", "status", "annual_limit", "used_amount", "available_balance", "expiry_date")
    list_filter = ("status",)
    search_fields = ("sha_number", "patient__first_name", "patient__last_name")
    readonly_fields = ("is_valid", "available_balance", "created_at", "updated_at")


@admin.register(SHAClaim)
class SHAClaimAdmin(admin.ModelAdmin):
    list_display = ("claim_number", "sha_member", "claim_type", "claimed_amount", "approved_amount", "status", "service_date")
    list_filter = ("status", "claim_type")
    search_fields = ("claim_number", "sha_member__sha_number", "sha_member__patient__first_name")
    readonly_fields = ("claim_number", "created_at", "updated_at")
    date_hierarchy = "service_date"


# ============================================================
# PAYMENT & BILLING
# ============================================================

@admin.register(PaymentAuditLog)
class PaymentAuditLogAdmin(admin.ModelAdmin):
    list_display = ("transaction_id", "transaction_type", "status", "amount", "payment_method", "processed_by", "created_at")
    list_filter = ("transaction_type", "status", "payment_method")
    search_fields = ("transaction_id", "mpesa_code", "mpesa_phone")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"


@admin.register(CashierSession)
class CashierSessionAdmin(admin.ModelAdmin):
    list_display = ("session_id", "cashier", "status", "opening_balance", "total_cash_amount", "total_mpesa_amount", "cash_variance", "opened_at")
    list_filter = ("status",)
    search_fields = ("session_id", "cashier__username")
    readonly_fields = ("session_id", "opened_at")
    date_hierarchy = "opened_at"


@admin.register(MPesaDuplicateCheck)
class MPesaDuplicateCheckAdmin(admin.ModelAdmin):
    list_display = ("mpesa_code", "medicine_sale", "used_by", "used_at")
    search_fields = ("mpesa_code",)
    readonly_fields = ("used_at",)


# ============================================================
# eTIMS
# ============================================================

@admin.register(eTIMSConfiguration)
class eTIMSConfigurationAdmin(admin.ModelAdmin):
    list_display = ("business_name", "tin_number", "branch_name", "is_active", "test_mode", "last_sync_date")
    readonly_fields = ("created_at", "updated_at")


class eTIMSInvoiceItemInline(admin.TabularInline):
    model = eTIMSInvoiceItem
    extra = 0
    readonly_fields = ("taxable_amount", "tax_amount", "total_amount", "created_at")


@admin.register(eTIMSInvoice)
class eTIMSInvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "invoice_type", "customer_name", "total_amount", "payment_method", "status", "submitted_to_etims", "payment_status", "created_at")
    list_filter = ("invoice_type", "status", "payment_method", "submitted_to_etims", "payment_status", "is_exempt")
    search_fields = ("invoice_number", "etims_invoice_number", "customer_name", "mpesa_code")
    readonly_fields = ("invoice_number", "created_at", "updated_at")
    date_hierarchy = "created_at"
    inlines = [eTIMSInvoiceItemInline]


# ============================================================
# HR — ATTENDANCE & LEAVE
# ============================================================

@admin.register(HospitalWiFiNetwork)
class HospitalWiFiNetworkAdmin(admin.ModelAdmin):
    list_display = ("network_name", "location", "bssid", "ip_range", "is_active")
    list_filter = ("is_active",)
    search_fields = ("network_name", "location", "bssid")


@admin.register(AttendanceQRCode)
class AttendanceQRCodeAdmin(admin.ModelAdmin):
    list_display = ("qr_type", "attendance_date", "location", "valid_from", "valid_until", "is_active", "scan_count", "generated_by")
    list_filter = ("qr_type", "is_active")
    search_fields = ("location", "qr_code")
    readonly_fields = ("qr_code", "scan_count", "created_at")
    date_hierarchy = "attendance_date"


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "status", "check_in_time", "check_out_time", "total_hours", "is_manual")
    list_filter = ("status", "is_manual")
    search_fields = ("user__username", "user__first_name", "user__last_name")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "date"


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "days_allowed_per_year", "is_paid", "requires_attachment", "requires_hr_approval", "is_active")
    list_filter = ("is_paid", "requires_attachment", "is_active")
    search_fields = ("name",)


@admin.register(LeaveApplication)
class LeaveApplicationAdmin(admin.ModelAdmin):
    list_display = ("application_number", "user", "leave_type", "start_date", "end_date", "total_days", "status")
    list_filter = ("status", "leave_type")
    search_fields = ("application_number", "user__username", "user__first_name", "user__last_name")
    readonly_fields = ("application_number", "total_days", "created_at", "updated_at")
    date_hierarchy = "start_date"


# ============================================================
# ASSETS
# ============================================================

class AssetMaintenanceLogInline(admin.TabularInline):
    model = AssetMaintenanceLog
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(HospitalAsset)
class HospitalAssetAdmin(admin.ModelAdmin):
    list_display = ("asset_id", "asset_name", "category", "location", "status", "condition", "requires_maintenance", "is_maintenance_overdue")
    list_filter = ("category", "status", "condition", "requires_maintenance", "requires_calibration", "needs_replacement")
    search_fields = ("asset_id", "asset_name", "serial_number", "barcode")
    readonly_fields = ("is_maintenance_overdue", "created_at", "updated_at")
    date_hierarchy = "created_at"
    inlines = [AssetMaintenanceLogInline]
    fieldsets = (
        ("Identification", {"fields": ("asset_id", "asset_name", "category", "description", "manufacturer", "model_number", "serial_number", "barcode", "asset_image")}),
        ("Acquisition", {"fields": ("purchase_date", "purchase_cost", "supplier", "warranty_expiry")}),
        ("Location & Status", {"fields": ("location", "assigned_to", "status", "condition")}),
        ("Maintenance", {"fields": ("requires_maintenance", "last_maintenance_date", "next_maintenance_date", "maintenance_notes")}),
        ("Calibration", {"fields": ("requires_calibration", "last_calibration_date", "next_calibration_date")}),
        ("Audit", {"fields": ("last_audit_date", "next_audit_date")}),
        ("Replacement", {"fields": ("needs_replacement", "replacement_reason", "estimated_replacement_cost")}),
        ("Meta", {"fields": ("created_by", "created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(AssetMaintenanceLog)
class AssetMaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ("asset", "maintenance_type", "maintenance_date", "performed_by", "service_provider", "cost", "is_completed")
    list_filter = ("maintenance_type", "is_completed")
    search_fields = ("asset__asset_id", "asset__asset_name", "performed_by", "invoice_number")
    readonly_fields = ("created_at",)
    date_hierarchy = "maintenance_date"


# ============================================================
# AUDIT, SECURITY & NOTIFICATIONS
# ============================================================

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "table_affected", "record_id", "ip_address", "timestamp")
    list_filter = ("action", "table_affected")
    search_fields = ("user__username", "table_affected", "record_id", "ip_address")
    readonly_fields = ("timestamp",)
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SecurityThreat)
class SecurityThreatAdmin(admin.ModelAdmin):
    list_display = ("threat_type", "severity", "ip_address", "blocked", "resolved", "detected_at")
    list_filter = ("threat_type", "severity", "blocked", "resolved")
    search_fields = ("ip_address", "request_path", "user__username")
    readonly_fields = ("detected_at",)
    date_hierarchy = "detected_at"


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("notification_type", "recipient", "title", "is_read", "is_urgent", "created_at")
    list_filter = ("notification_type", "is_read", "is_urgent")
    search_fields = ("recipient__username", "title", "message")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("timestamp",)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("participant1", "participant2", "patient", "created_at")
    search_fields = ("participant1__username", "participant2__username")
    readonly_fields = ("created_at", "updated_at")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("conversation", "sender", "is_read", "timestamp")
    list_filter = ("is_read",)
    search_fields = ("sender__username", "content")
    readonly_fields = ("timestamp",)
    date_hierarchy = "timestamp"