"""
AFYA1 HMIS — serializers.py
South B Hospital Management Information System
All serializers for the core app.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
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
    Supplier, PurchaseRequest, PurchaseRequestItem,
    PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GoodsReceivedNoteItem,
    ConsultationInsuranceClaim, PharmacyInsuranceClaim, InpatientInsuranceClaim,
    SHAMember, SHAClaim,
    PaymentAuditLog, CashierSession, MPesaDuplicateCheck,
    eTIMSConfiguration, eTIMSInvoice, eTIMSInvoiceItem,
    HospitalWiFiNetwork, AttendanceQRCode, Attendance, LeaveType, LeaveApplication,
    HospitalAsset, AssetMaintenanceLog,
    AuditLog, SecurityThreat, Notification, Conversation, Message,
)


# ============================================================
# AUTH
# ============================================================

class AuthTokenSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError("Account is inactive.")
        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'user_type', 'phone_number', 'specialization', 'license_number', 'is_active',
        ]
        read_only_fields = ['id', 'full_name']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'user_type', 'phone_number', 'specialization', 'license_number',
            'password', 'password_confirm',
        ]

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns and references."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'full_name', 'user_type', 'is_active']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


# ============================================================
# PATIENTS & STAFF
# ============================================================

class PatientSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    has_sha = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'date_of_birth', 'age',
            'gender', 'id_number', 'phone_number', 'email', 'address',
            'blood_type', 'allergies', 'chronic_conditions',
            'has_sha', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'full_name', 'age', 'has_sha', 'created_at', 'updated_at']

    def get_age(self, obj):
        today = timezone.now().date()
        dob = obj.date_of_birth
        return (
            today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        )

    def get_full_name(self, obj):
        return obj.full_name

    def get_has_sha(self, obj):
        return hasattr(obj, 'sha_member') and obj.sha_member is not None


class PatientListSerializer(serializers.ModelSerializer):
    """Lightweight for search results and dropdowns."""
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = ['id', 'full_name', 'phone_number', 'gender', 'age', 'id_number']

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        today = timezone.now().date()
        dob = obj.date_of_birth
        return (
            today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        )


class DoctorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    specialization_display = serializers.CharField(
        source='get_specialization_display', read_only=True
    )
    user_info = UserListSerializer(source='user', read_only=True)

    class Meta:
        model = Doctor
        fields = [
            'id', 'user', 'user_info', 'first_name', 'last_name', 'full_name',
            'date_of_birth', 'gender', 'id_number', 'phone_number', 'email',
            'specialization', 'specialization_display', 'license_number', 'license_expiry',
            'years_of_experience', 'qualifications', 'department',
            'is_active', 'joining_date', 'profile_picture',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'full_name', 'specialization_display', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return f"Dr. {obj.full_name}"


class DoctorListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    specialization_display = serializers.CharField(
        source='get_specialization_display', read_only=True
    )

    class Meta:
        model = Doctor
        fields = ['id', 'full_name', 'specialization', 'specialization_display', 'department']

    def get_full_name(self, obj):
        return f"Dr. {obj.full_name}"


class NurseSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    nurse_type_display = serializers.CharField(source='get_nurse_type_display', read_only=True)
    department_display = serializers.CharField(source='get_department_display', read_only=True)
    user_info = UserListSerializer(source='user', read_only=True)

    class Meta:
        model = Nurse
        fields = [
            'id', 'user', 'user_info', 'first_name', 'last_name', 'full_name',
            'date_of_birth', 'gender', 'nurse_id', 'phone_number', 'email',
            'nurse_type', 'nurse_type_display', 'license_number', 'license_expiry',
            'department', 'department_display', 'years_of_experience',
            'is_active', 'joining_date', 'is_charge_nurse',
            'is_bcls_certified', 'is_acls_certified',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'full_name', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.full_name


class NurseListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    department_display = serializers.CharField(source='get_department_display', read_only=True)

    class Meta:
        model = Nurse
        fields = ['id', 'full_name', 'department', 'department_display', 'nurse_type']

    def get_full_name(self, obj):
        return obj.full_name


# ============================================================
# LOOKUPS
# ============================================================

class InsuranceProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceProvider
        fields = ['id', 'name', 'code', 'is_active']


class SpecializedServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecializedService
        fields = ['id', 'name', 'consultation_fee', 'description']


class DiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = ['id', 'name', 'description', 'icd_code']


class ClinicSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicSettings
        fields = '__all__'


class TriageCategorySerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source='get_priority_level_display', read_only=True)

    class Meta:
        model = TriageCategory
        fields = [
            'id', 'priority_level', 'priority_display', 'color_code',
            'name', 'description', 'max_wait_time', 'is_active',
        ]


# ============================================================
# ICD-10
# ============================================================

class ICD10CodeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)

    class Meta:
        model = ICD10Code
        fields = [
            'id', 'code', 'short_description', 'description', 'local_name',
            'category', 'category_name',
            'is_notifiable', 'requires_isolation',
            'nhif_eligible', 'nhif_package_code',
            'sha_covered',
            'suggested_lab_tests', 'treatment_guidelines',
            'usage_count', 'is_active', 'is_common',
        ]
        read_only_fields = ['id', 'usage_count']


class ICD10CodeSearchSerializer(serializers.ModelSerializer):
    """Minimal for autocomplete search."""
    class Meta:
        model = ICD10Code
        fields = ['id', 'code', 'short_description', 'nhif_eligible', 'sha_covered']


class ICD10CategorySerializer(serializers.ModelSerializer):
    codes = ICD10CodeSearchSerializer(many=True, read_only=True)

    class Meta:
        model = ICD10Category
        fields = [
            'id', 'chapter_number', 'code_range', 'category_name',
            'description', 'is_active', 'codes',
        ]


# ============================================================
# VISITS & TRIAGE
# ============================================================

class PatientVisitSerializer(serializers.ModelSerializer):
    patient_info = PatientListSerializer(source='patient', read_only=True)
    doctor_info = DoctorListSerializer(source='assigned_doctor', read_only=True)
    nurse_info = NurseListSerializer(source='assigned_nurse', read_only=True)
    insurance_provider_name = serializers.CharField(
        source='insurance_provider.name', read_only=True
    )
    specialized_service_name = serializers.CharField(
        source='specialized_service.name', read_only=True
    )
    visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    has_triage = serializers.SerializerMethodField()

    class Meta:
        model = PatientVisit
        fields = [
            'id', 'visit_number', 'patient', 'patient_info',
            'visit_type', 'visit_type_display', 'arrival_time', 'chief_complaint',
            'status', 'status_display',
            'registered_by',
            'assigned_doctor', 'doctor_info',
            'assigned_nurse', 'nurse_info',
            'specialized_service', 'specialized_service_name',
            'insurance_provider', 'insurance_provider_name',
            'triage_time', 'consultation_start', 'consultation_end', 'discharge_time',
            'referral_from', 'notes', 'has_triage',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'visit_number', 'created_at', 'updated_at',
            'patient_info', 'doctor_info', 'nurse_info',
        ]

    def get_has_triage(self, obj):
        return hasattr(obj, 'triage') and obj.triage is not None


class PatientVisitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientVisit
        fields = [
            'patient', 'visit_type', 'chief_complaint',
            'assigned_doctor', 'assigned_nurse',
            'specialized_service', 'insurance_provider',
            'referral_from', 'notes',
        ]


class TriageAssessmentSerializer(serializers.ModelSerializer):
    bmi = serializers.FloatField(read_only=True)
    category_info = TriageCategorySerializer(source='category', read_only=True)
    assessed_by_name = serializers.CharField(source='assessed_by.full_name', read_only=True)
    consciousness_display = serializers.CharField(
        source='get_consciousness_level_display', read_only=True
    )
    breathing_display = serializers.CharField(
        source='get_breathing_status_display', read_only=True
    )

    class Meta:
        model = TriageAssessment
        fields = [
            'id', 'visit',
            'category', 'category_info',
            'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic',
            'pulse_rate', 'respiratory_rate', 'oxygen_saturation',
            'weight', 'height', 'bmi',
            'consciousness_level', 'consciousness_display',
            'breathing_status', 'breathing_display',
            'pain_score', 'presenting_symptoms', 'allergies_noted', 'current_medications',
            'triage_notes', 'requires_immediate_attention',
            'assessed_by', 'assessed_by_name', 'assessment_time', 'created_at',
        ]
        read_only_fields = ['id', 'bmi', 'created_at']


class QueueManagementSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_visit_number = serializers.CharField(source='visit.visit_number', read_only=True)
    triage_color = serializers.SerializerMethodField()
    department_display = serializers.CharField(source='get_department_display', read_only=True)
    wait_minutes = serializers.SerializerMethodField()

    class Meta:
        model = QueueManagement
        fields = [
            'id', 'visit', 'patient_visit_number', 'patient_name',
            'department', 'department_display',
            'queue_number', 'priority_override', 'triage_color',
            'joined_queue', 'called_time', 'service_start', 'service_end',
            'is_active', 'is_serving', 'is_completed',
            'serving_staff', 'notes', 'wait_minutes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_patient_name(self, obj):
        return obj.visit.patient.full_name

    def get_triage_color(self, obj):
        try:
            return obj.visit.triage.category.color_code
        except Exception:
            return None

    def get_wait_minutes(self, obj):
        if obj.is_completed or obj.called_time:
            return None
        delta = timezone.now() - obj.joined_queue
        return int(delta.total_seconds() / 60)


# ============================================================
# CONSULTATIONS
# ============================================================

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    doctor_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name',
            'doctor', 'doctor_name',
            'receptionist',
            'scheduled_time', 'end_time',
            'status', 'status_display',
            'reason', 'symptoms',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name()


class ConsultationDiagnosisSerializer(serializers.ModelSerializer):
    icd10_info = ICD10CodeSearchSerializer(source='icd10_code', read_only=True)
    diagnosis_type_display = serializers.CharField(
        source='get_diagnosis_type_display', read_only=True
    )
    certainty_display = serializers.CharField(source='get_certainty_display', read_only=True)

    class Meta:
        model = ConsultationDiagnosis
        fields = [
            'id', 'consultation', 'icd10_code', 'icd10_info',
            'diagnosis_type', 'diagnosis_type_display',
            'certainty', 'certainty_display',
            'clinical_notes', 'treatment_plan', 'onset_date', 'diagnosed_date',
            'submitted_to_nhif', 'nhif_claim_number',
            'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'diagnosed_date', 'created_at']


class ConsultationSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    scheduled_time = serializers.DateTimeField(
        source='appointment.scheduled_time', read_only=True
    )
    icd10_diagnoses = ConsultationDiagnosisSerializer(many=True, read_only=True)
    diseases_info = DiseaseSerializer(source='diseases', many=True, read_only=True)

    class Meta:
        model = Consultation
        fields = [
            'id', 'appointment', 'patient_name', 'doctor_name', 'scheduled_time',
            'consultation_code', 'diagnosis', 'diseases', 'diseases_info',
            'notes', 'follow_up_date', 'follow_up_notes',
            'icd10_diagnoses',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'consultation_code', 'created_at', 'updated_at']

    def get_patient_name(self, obj):
        return obj.appointment.patient.full_name

    def get_doctor_name(self, obj):
        return obj.appointment.doctor.get_full_name()


class PatientMedicalHistorySerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model = PatientMedicalHistory
        fields = [
            'id', 'patient', 'consultation', 'record_type', 'description',
            'date_recorded', 'recorded_by', 'recorded_by_name',
        ]
        read_only_fields = ['id', 'date_recorded']


# ============================================================
# PHARMACY
# ============================================================

class MedicineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineCategory
        fields = ['id', 'name', 'description']


class MedicineSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    unit_type_display = serializers.CharField(source='get_unit_type_display', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'category', 'category_name', 'description', 'manufacturer',
            'unit_type', 'unit_type_display', 'units_per_pack', 'pack_name',
            'quantity_in_stock', 'reorder_level', 'is_low_stock',
            'cost_per_unit_cash', 'price_per_unit_cash', 'price_per_unit_insurance',
            'expiry_date', 'batch_number', 'image',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_low_stock', 'created_at', 'updated_at']


class MedicineListSerializer(serializers.ModelSerializer):
    """Lightweight for prescription and OTC dropdowns."""
    unit_type_display = serializers.CharField(source='get_unit_type_display', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'unit_type', 'unit_type_display',
            'quantity_in_stock', 'price_per_unit_cash', 'price_per_unit_insurance',
            'is_low_stock',
        ]


class StockMovementSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    movement_type_display = serializers.CharField(
        source='get_movement_type_display', read_only=True
    )
    performed_by_name = serializers.CharField(
        source='performed_by.get_full_name', read_only=True
    )

    class Meta:
        model = StockMovement
        fields = [
            'id', 'medicine', 'medicine_name',
            'movement_type', 'movement_type_display',
            'quantity', 'previous_quantity', 'new_quantity',
            'reason', 'batch_number',
            'performed_by', 'performed_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PrescriptionSerializer(serializers.ModelSerializer):
    medicine_info = MedicineListSerializer(source='medicine', read_only=True)
    patient_name = serializers.SerializerMethodField()
    dispensed_by_name = serializers.CharField(
        source='dispensed_by.get_full_name', read_only=True
    )
    insurance_provider_name = serializers.CharField(
        source='insurance_provider.name', read_only=True
    )

    class Meta:
        model = Prescription
        fields = [
            'id', 'consultation', 'patient_name',
            'medicine', 'medicine_info',
            'quantity', 'dosage_text', 'duration', 'instructions',
            'unit_price', 'total_price',
            'is_insured', 'insurance_provider', 'insurance_provider_name',
            'is_dispensed', 'dispensed_at', 'dispensed_by', 'dispensed_by_name',
            'prescribed_at',
        ]
        read_only_fields = [
            'id', 'unit_price', 'total_price',
            'is_dispensed', 'dispensed_at', 'dispensed_by',
            'prescribed_at',
        ]

    def get_patient_name(self, obj):
        return obj.consultation.appointment.patient.full_name


class OverTheCounterSaleItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)

    class Meta:
        model = OverTheCounterSaleItem
        fields = [
            'id', 'sale', 'medicine', 'medicine_name',
            'quantity', 'unit_price', 'subtotal', 'created_at',
        ]
        read_only_fields = ['id', 'subtotal', 'created_at']


class OverTheCounterSaleSerializer(serializers.ModelSerializer):
    items = OverTheCounterSaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    payment_status_display = serializers.CharField(
        source='get_payment_status_display', read_only=True
    )

    class Meta:
        model = OverTheCounterSale
        fields = [
            'id', 'sale_id', 'customer_name', 'mpesa_code',
            'total_amount', 'payment_status', 'payment_status_display',
            'cashier', 'cashier_name', 'notes',
            'is_dispensed', 'dispensed_at', 'dispensed_by',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'sale_id', 'created_at', 'updated_at']


# ============================================================
# LABORATORY
# ============================================================

class LabTestCategorySerializer(serializers.ModelSerializer):
    category_type_display = serializers.CharField(
        source='get_category_type_display', read_only=True
    )

    class Meta:
        model = LabTestCategory
        fields = [
            'id', 'name', 'category_type', 'category_type_display',
            'description', 'department', 'is_active',
        ]


class LabTestSerializer(serializers.ModelSerializer):
    category_info = LabTestCategorySerializer(source='category', read_only=True)
    sample_type_display = serializers.CharField(source='get_sample_type_display', read_only=True)

    class Meta:
        model = LabTest
        fields = [
            'id', 'test_code', 'test_name', 'category', 'category_info',
            'description', 'sample_type', 'sample_type_display',
            'preparation_instructions', 'normal_range', 'turnaround_time',
            'cost', 'nhif_covered', 'sha_covered', 'is_active', 'usage_count',
        ]
        read_only_fields = ['id', 'usage_count']


class LabOrderItemSerializer(serializers.ModelSerializer):
    test_info = LabTestSerializer(source='test', read_only=True)
    performed_by_name = serializers.CharField(
        source='performed_by.get_full_name', read_only=True
    )
    verified_by_name = serializers.CharField(
        source='verified_by.get_full_name', read_only=True
    )

    class Meta:
        model = LabOrderItem
        fields = [
            'id', 'lab_order', 'test', 'test_info',
            'sample_id', 'status',
            'result_value', 'result_unit', 'is_abnormal',
            'method_used',
            'performed_by', 'performed_by_name',
            'verified_by', 'verified_by_name',
            'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class LabOrderSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    ordered_by_name = serializers.CharField(source='ordered_by.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    test_items = LabOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = LabOrder
        fields = [
            'id', 'order_number', 'patient', 'patient_name',
            'consultation', 'ordered_by', 'ordered_by_name',
            'priority', 'priority_display', 'clinical_notes',
            'status', 'status_display',
            'ordered_at', 'sample_collected_at', 'completed_at', 'reported_at',
            'assigned_to', 'assigned_to_name',
            'total_cost', 'paid',
            'test_items', 'created_at',
        ]
        read_only_fields = ['id', 'order_number', 'created_at']


class LabResultSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='lab_order.order_number', read_only=True)
    patient_name = serializers.CharField(source='lab_order.patient.full_name', read_only=True)
    result_by_name = serializers.CharField(source='result_by.get_full_name', read_only=True)
    verified_by_name = serializers.CharField(
        source='verified_by.get_full_name', read_only=True
    )
    notified_to_name = serializers.CharField(
        source='notified_to.get_full_name', read_only=True
    )

    class Meta:
        model = LabResult
        fields = [
            'id', 'lab_order', 'order_number', 'patient_name',
            'summary', 'interpretation', 'recommendations',
            'is_critical', 'critical_value_notified',
            'notified_to', 'notified_to_name', 'notified_at',
            'result_document', 'quality_control_passed',
            'result_by', 'result_by_name',
            'verified_by', 'verified_by_name', 'verified_at',
            'patient_notified', 'result_released_to_patient', 'released_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ImagingStudySerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    ordered_by_name = serializers.CharField(source='ordered_by.get_full_name', read_only=True)
    modality_display = serializers.CharField(source='get_modality_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ImagingStudy
        fields = [
            'id', 'lab_order', 'consultation',
            'patient', 'patient_name',
            'ordered_by', 'ordered_by_name',
            'modality', 'modality_display', 'body_part',
            'study_description', 'clinical_indication',
            'status', 'status_display', 'is_urgent', 'contrast_used',
            'findings', 'impression',
            'image_1', 'image_2', 'image_3', 'dicom_file',
            'performed_by', 'reported_by',
            'ordered_at', 'performed_at', 'reported_at', 'created_at',
        ]
        read_only_fields = ['id', 'ordered_at', 'created_at']


# ============================================================
# INPATIENT
# ============================================================

class WardSerializer(serializers.ModelSerializer):
    ward_type_display = serializers.CharField(source='get_ward_type_display', read_only=True)
    occupied_beds_count = serializers.IntegerField(read_only=True)
    available_beds_count = serializers.IntegerField(read_only=True)
    nurse_in_charge_name = serializers.CharField(
        source='nurse_in_charge.full_name', read_only=True
    )

    class Meta:
        model = Ward
        fields = [
            'id', 'ward_code', 'ward_name', 'ward_type', 'ward_type_display',
            'floor_number', 'building', 'total_beds',
            'occupied_beds_count', 'available_beds_count',
            'nurse_in_charge', 'nurse_in_charge_name',
            'has_oxygen', 'has_monitoring', 'description', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'occupied_beds_count', 'available_beds_count', 'created_at']


class BedSerializer(serializers.ModelSerializer):
    ward_info = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    bed_type_display = serializers.CharField(source='get_bed_type_display', read_only=True)

    class Meta:
        model = Bed
        fields = [
            'id', 'bed_number', 'ward', 'ward_info',
            'bed_type', 'bed_type_display',
            'status', 'status_display',
            'has_oxygen', 'has_monitor', 'has_ventilator', 'is_window_side',
            'daily_rate', 'current_admission',
            'notes', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_ward_info(self, obj):
        return {'id': obj.ward.id, 'code': obj.ward.ward_code, 'name': obj.ward.ward_name}


class InpatientDailyChargeSerializer(serializers.ModelSerializer):
    charge_type_display = serializers.CharField(source='get_charge_type_display', read_only=True)
    rendered_by_name = serializers.CharField(
        source='rendered_by.get_full_name', read_only=True
    )

    class Meta:
        model = InpatientDailyCharge
        fields = [
            'id', 'admission', 'charge_date',
            'charge_type', 'charge_type_display', 'description',
            'quantity', 'unit_price', 'total_amount',
            'is_billed', 'is_paid',
            'rendered_by', 'rendered_by_name',
            'notes', 'created_at',
        ]
        read_only_fields = ['id', 'total_amount', 'created_at']


class InpatientVitalsSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)

    class Meta:
        model = InpatientVitals
        fields = [
            'id', 'admission', 'recorded_at',
            'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic',
            'pulse_rate', 'respiratory_rate', 'oxygen_saturation',
            'weight', 'pain_score', 'consciousness_level',
            'notes', 'recorded_by', 'recorded_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class InpatientAdmissionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    bed_info = BedSerializer(source='bed', read_only=True)
    admitting_doctor_name = serializers.CharField(
        source='admitting_doctor.full_name', read_only=True
    )
    attending_doctor_name = serializers.CharField(
        source='attending_doctor.full_name', read_only=True
    )
    primary_nurse_name = serializers.CharField(
        source='primary_nurse.full_name', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    admission_type_display = serializers.CharField(
        source='get_admission_type_display', read_only=True
    )
    length_of_stay = serializers.IntegerField(read_only=True)
    outstanding_balance = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    vital_signs = InpatientVitalsSerializer(many=True, read_only=True)
    daily_charges = InpatientDailyChargeSerializer(many=True, read_only=True)

    class Meta:
        model = InpatientAdmission
        fields = [
            'id', 'admission_number', 'patient', 'patient_name',
            'consultation', 'bed', 'bed_info',
            'admission_type', 'admission_type_display',
            'status', 'status_display',
            'admitting_diagnosis', 'icd10_codes', 'clinical_summary',
            'admitting_doctor', 'admitting_doctor_name',
            'attending_doctor', 'attending_doctor_name',
            'primary_nurse', 'primary_nurse_name',
            'admission_datetime', 'expected_discharge_date',
            'discharge_datetime', 'discharge_summary', 'discharge_diagnosis',
            'discharge_instructions', 'discharged_by',
            'requires_isolation', 'is_critical',
            'is_insured', 'insurance_company', 'insurance_policy_number',
            'deposit_amount', 'total_charges', 'amount_paid',
            'outstanding_balance', 'length_of_stay',
            'emergency_contact_name', 'emergency_contact_phone',
            'notes', 'created_by',
            'vital_signs', 'daily_charges',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'admission_number', 'total_charges',
            'length_of_stay', 'outstanding_balance',
            'created_at', 'updated_at',
        ]


class InpatientMedicineRequestSerializer(serializers.ModelSerializer):
    medicine_info = MedicineListSerializer(source='medicine', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = InpatientMedicineRequest
        fields = [
            'id', 'request_number', 'admission',
            'medicine', 'medicine_info',
            'quantity_requested', 'dosage', 'route', 'frequency',
            'priority', 'priority_display', 'status', 'status_display',
            'clinical_notes',
            'requested_by', 'requested_by_name', 'requested_at',
            'approved_by', 'approved_by_name', 'approved_at', 'quantity_approved',
            'dispensed_by', 'dispensed_at',
            'unit_price', 'total_cost', 'rejection_reason', 'updated_at',
        ]
        read_only_fields = [
            'id', 'request_number', 'requested_at', 'updated_at',
            'unit_price', 'total_cost',
        ]


# ============================================================
# EMERGENCY
# ============================================================

class EmergencyBedSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmergencyBed
        fields = [
            'id', 'bed_number', 'location', 'status', 'status_display',
            'has_oxygen', 'has_monitor', 'has_suction',
            'current_emergency_visit', 'is_active', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class EmergencyChargeSerializer(serializers.ModelSerializer):
    charge_type_display = serializers.CharField(source='get_charge_type_display', read_only=True)

    class Meta:
        model = EmergencyCharge
        fields = [
            'id', 'emergency_visit', 'charge_type', 'charge_type_display',
            'description', 'quantity', 'unit_price', 'total_amount',
            'charged_by', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'total_amount', 'created_at']


class EmergencyPaymentSerializer(serializers.ModelSerializer):
    payment_method_display = serializers.CharField(
        source='get_payment_method_display', read_only=True
    )

    class Meta:
        model = EmergencyPayment
        fields = [
            'id', 'emergency_visit', 'amount', 'payment_method', 'payment_method_display',
            'mpesa_code', 'processed_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class EmergencyVisitSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='visit.patient.full_name', read_only=True)
    visit_number = serializers.CharField(source='visit.visit_number', read_only=True)
    triage_level_display = serializers.CharField(
        source='get_triage_level_display', read_only=True
    )
    arrival_mode_display = serializers.CharField(
        source='get_arrival_mode_display', read_only=True
    )
    injury_type_display = serializers.CharField(
        source='get_injury_type_display', read_only=True
    )
    treatment_status_display = serializers.CharField(
        source='get_treatment_status_display', read_only=True
    )
    monitoring_hours = serializers.IntegerField(read_only=True)
    charges = EmergencyChargeSerializer(many=True, read_only=True)
    payments = EmergencyPaymentSerializer(many=True, read_only=True)
    emergency_bed_info = EmergencyBedSerializer(source='emergency_bed', read_only=True)

    class Meta:
        model = EmergencyVisit
        fields = [
            'id', 'visit', 'visit_number', 'patient_name',
            'triage_level', 'triage_level_display',
            'arrival_mode', 'arrival_mode_display',
            'injury_type', 'injury_type_display',
            'is_conscious', 'is_breathing', 'has_pulse', 'glasgow_coma_scale',
            'needs_resuscitation', 'needs_oxygen', 'needs_surgery',
            'police_case', 'police_station', 'ob_number',
            'initial_assessment', 'immediate_treatment_given',
            'emergency_bed', 'emergency_bed_info',
            'treatment_status', 'treatment_status_display',
            'monitoring_started', 'monitoring_ended', 'monitoring_hours',
            'total_charges', 'payment_status',
            'assessed_by',
            'transferred_to_admission', 'transferred_at',
            'discharge_summary',
            'charges', 'payments',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'monitoring_hours', 'total_charges', 'created_at', 'updated_at']


# ============================================================
# MATERNITY & MCH
# ============================================================

class MaternityVisitSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='visit.patient.full_name', read_only=True)
    visit_purpose_display = serializers.CharField(
        source='get_visit_purpose_display', read_only=True
    )
    assessed_by_name = serializers.CharField(source='assessed_by.full_name', read_only=True)

    class Meta:
        model = MaternityVisit
        fields = [
            'id', 'visit', 'patient_name',
            'visit_purpose', 'visit_purpose_display',
            'gravida', 'para', 'abortion', 'gestational_age_weeks', 'expected_delivery_date',
            'is_in_labor', 'contractions_frequency', 'membranes_ruptured',
            'cervical_dilation', 'fetal_heart_rate',
            'is_high_risk', 'risk_factors', 'needs_csection', 'fetal_distress',
            'auto_admission', 'initial_assessment',
            'assessed_by', 'assessed_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class MCHVisitSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='visit.patient.full_name', read_only=True)
    visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)
    assessed_by_name = serializers.CharField(source='assessed_by.full_name', read_only=True)

    class Meta:
        model = MCHVisit
        fields = [
            'id', 'visit', 'patient_name',
            'visit_type', 'visit_type_display',
            'child_age_months', 'weight_kg', 'height_cm', 'temperature',
            'immunization_due', 'vaccines_to_administer',
            'has_danger_signs', 'danger_signs',
            'needs_doctor_consultation', 'consultation_reason',
            'mothers_name', 'mothers_phone', 'assessment_notes',
            'assessed_by', 'assessed_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ============================================================
# PROCUREMENT
# ============================================================

class SupplierSerializer(serializers.ModelSerializer):
    supplier_type_display = serializers.CharField(
        source='get_supplier_type_display', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Supplier
        fields = [
            'id', 'supplier_code', 'supplier_name',
            'supplier_type', 'supplier_type_display',
            'contact_person', 'phone_number', 'email',
            'physical_address', 'city', 'county',
            'pin_number', 'bank_name', 'account_number',
            'credit_days', 'credit_limit',
            'status', 'status_display',
            'notes', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'supplier_code', 'created_at', 'updated_at']


class PurchaseRequestItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)

    class Meta:
        model = PurchaseRequestItem
        fields = [
            'id', 'purchase_request', 'medicine', 'medicine_name',
            'item_name', 'item_description',
            'quantity_requested', 'unit_of_measure',
            'estimated_unit_price', 'estimated_total', 'created_at',
        ]
        read_only_fields = ['id', 'estimated_total', 'created_at']


class PurchaseRequestSerializer(serializers.ModelSerializer):
    items = PurchaseRequestItemSerializer(many=True, read_only=True)
    requested_by_name = serializers.CharField(
        source='requested_by.get_full_name', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    department_display = serializers.CharField(
        source='get_requesting_department_display', read_only=True
    )

    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'request_number', 'requesting_department', 'department_display',
            'requested_by', 'requested_by_name',
            'urgency', 'urgency_display', 'purpose', 'expected_delivery_date',
            'estimated_cost', 'status', 'status_display',
            'hod_approved_by', 'hod_approved_at', 'hod_comments',
            'accountant_approved_by', 'accountant_approved_at',
            'procurement_approved_by', 'procurement_approved_at',
            'rejected_by', 'rejected_at', 'rejection_reason',
            'notes', 'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'request_number', 'created_at', 'updated_at']


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    quantity_pending = serializers.IntegerField(read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'purchase_order', 'medicine', 'medicine_name',
            'item_name', 'quantity_ordered', 'quantity_received', 'quantity_pending',
            'unit_of_measure', 'unit_price', 'total_price', 'created_at',
        ]
        read_only_fields = ['id', 'total_price', 'quantity_pending', 'created_at']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_info = SupplierSerializer(source='supplier', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'purchase_request',
            'supplier', 'supplier_info',
            'po_date', 'expected_delivery_date', 'delivery_address',
            'subtotal', 'vat_amount', 'total_amount',
            'payment_terms', 'status', 'status_display',
            'special_instructions', 'notes',
            'created_by', 'created_by_name',
            'approved_by', 'approved_at',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'po_number', 'created_at', 'updated_at']


class GoodsReceivedNoteItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='po_item.item_name', read_only=True)

    class Meta:
        model = GoodsReceivedNoteItem
        fields = [
            'id', 'grn', 'po_item', 'item_name',
            'quantity_received', 'quantity_accepted', 'quantity_rejected',
            'batch_number', 'expiry_date', 'manufacturer',
            'rejection_reason', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class GoodsReceivedNoteSerializer(serializers.ModelSerializer):
    items = GoodsReceivedNoteItemSerializer(many=True, read_only=True)
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    received_by_name = serializers.CharField(
        source='received_by.get_full_name', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = GoodsReceivedNote
        fields = [
            'id', 'grn_number', 'purchase_order', 'po_number',
            'delivery_date', 'delivery_note_number', 'invoice_number',
            'received_by', 'received_by_name',
            'inspected_by', 'inspected_at', 'inspection_notes',
            'status', 'status_display',
            'has_quality_issues', 'quality_issues_description',
            'notes', 'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'grn_number', 'created_at', 'updated_at']


# ============================================================
# INSURANCE CLAIMS
# ============================================================

class ConsultationInsuranceClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    provider_name = serializers.CharField(source='insurance_provider.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    claims_officer_name = serializers.CharField(
        source='claims_officer.get_full_name', read_only=True
    )

    class Meta:
        model = ConsultationInsuranceClaim
        fields = [
            'id', 'claim_number', 'patient_visit',
            'patient', 'patient_name',
            'insurance_provider', 'provider_name',
            'consultation_fee', 'service_name', 'member_number',
            'status', 'status_display',
            'claims_officer_approved', 'claims_officer', 'claims_officer_name',
            'claims_officer_approved_at', 'claims_officer_comments',
            'rejected_by', 'rejected_at', 'rejection_reason',
            'payment_confirmed', 'payment_confirmed_by', 'payment_confirmed_at',
            'submitted_by',
            'insurance_payment_received', 'insurance_payment_date',
            'insurance_payment_reference',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'claim_number', 'created_at', 'updated_at']


class PharmacyInsuranceClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    provider_name = serializers.CharField(source='insurance_provider.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    claim_type_display = serializers.CharField(source='get_claim_type_display', read_only=True)

    class Meta:
        model = PharmacyInsuranceClaim
        fields = [
            'id', 'claim_number', 'claim_type', 'claim_type_display',
            'consultation', 'otc_sale',
            'patient', 'patient_name',
            'insurance_provider', 'provider_name',
            'member_number', 'member_name',
            'total_amount', 'insurance_covered', 'patient_copay',
            'items_breakdown',
            'status', 'status_display',
            'claims_officer_approved', 'claims_officer', 'claims_approved_at',
            'rejected_by', 'rejected_at', 'rejection_reason',
            'payment_confirmed', 'payment_confirmed_by', 'payment_confirmed_at',
            'submitted_by',
            'insurance_payment_received', 'insurance_payment_date',
            'insurance_payment_reference',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'claim_number', 'created_at', 'updated_at']


class InpatientInsuranceClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source='admission.patient.full_name', read_only=True
    )
    provider_name = serializers.CharField(source='insurance_provider.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    admission_number = serializers.CharField(
        source='admission.admission_number', read_only=True
    )

    class Meta:
        model = InpatientInsuranceClaim
        fields = [
            'id', 'claim_number', 'admission', 'admission_number',
            'patient_name',
            'insurance_provider', 'provider_name',
            'member_number', 'member_name',
            'total_charges', 'charges_breakdown',
            'approved_amount', 'patient_copay',
            'status', 'status_display',
            'claims_officer_approved', 'claims_officer', 'claims_approved_at',
            'claims_officer_comments',
            'rejected_by', 'rejected_at', 'rejection_reason',
            'payment_confirmed', 'payment_confirmed_by', 'payment_confirmed_at',
            'submitted_by', 'submitted_at',
            'insurance_payment_received', 'insurance_payment_date',
            'insurance_payment_reference',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'claim_number', 'created_at', 'updated_at']


# ============================================================
# SHA
# ============================================================

class SHAMemberSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    available_balance = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SHAMember
        fields = [
            'id', 'patient', 'patient_name',
            'sha_number', 'package_name',
            'status', 'status_display', 'is_valid',
            'enrollment_date', 'expiry_date',
            'annual_limit', 'used_amount', 'available_balance',
            'last_verified', 'verification_response',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'is_valid', 'available_balance', 'last_verified',
            'verification_response', 'created_at', 'updated_at',
        ]


class SHAClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source='sha_member.patient.full_name', read_only=True
    )
    sha_number = serializers.CharField(source='sha_member.sha_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    claim_type_display = serializers.CharField(source='get_claim_type_display', read_only=True)
    submitted_by_name = serializers.CharField(
        source='submitted_by.get_full_name', read_only=True
    )

    class Meta:
        model = SHAClaim
        fields = [
            'id', 'claim_number', 'sha_reference',
            'sha_member', 'patient_name', 'sha_number',
            'consultation',
            'claim_type', 'claim_type_display',
            'service_date', 'claimed_amount', 'approved_amount', 'patient_copay',
            'status', 'status_display',
            'submitted_at', 'approved_at', 'paid_at',
            'submission_response', 'rejection_reason',
            'submitted_by', 'submitted_by_name',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'claim_number', 'submission_response',
            'submitted_at', 'approved_at', 'paid_at',
            'created_at', 'updated_at',
        ]


# ============================================================
# PAYMENT & BILLING
# ============================================================

class PaymentAuditLogSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(
        source='get_transaction_type_display', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    processed_by_name = serializers.CharField(
        source='processed_by.get_full_name', read_only=True
    )
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = PaymentAuditLog
        fields = [
            'id', 'transaction_id',
            'transaction_type', 'transaction_type_display',
            'status', 'status_display',
            'amount', 'payment_method',
            'mpesa_code', 'mpesa_phone',
            'medicine_sale', 'consultation', 'patient', 'patient_name',
            'cost_breakdown', 'qr_code_data',
            'processed_by', 'processed_by_name',
            'ip_address', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class CashierSessionSerializer(serializers.ModelSerializer):
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reconciled_by_name = serializers.CharField(
        source='reconciled_by.get_full_name', read_only=True
    )

    class Meta:
        model = CashierSession
        fields = [
            'id', 'session_id', 'cashier', 'cashier_name',
            'opened_at', 'closed_at', 'status', 'status_display',
            'opening_balance', 'expected_cash', 'actual_cash', 'cash_variance',
            'total_cash_amount', 'total_mpesa_amount',
            'reconciled_by', 'reconciled_by_name',
            'reconciled_at', 'reconciliation_notes',
        ]
        read_only_fields = ['id', 'session_id', 'opened_at']


class MPesaDuplicateCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = MPesaDuplicateCheck
        fields = ['id', 'mpesa_code', 'medicine_sale', 'used_at', 'used_by']
        read_only_fields = ['id', 'used_at']


# ============================================================
# eTIMS
# ============================================================

class eTIMSConfigurationSerializer(serializers.ModelSerializer):
    api_key = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = eTIMSConfiguration
        fields = [
            'id', 'tin_number', 'business_name', 'branch_name',
            'device_serial_number', 'api_base_url', 'api_key',
            'is_active', 'test_mode', 'auto_submit_invoices',
            'data_anonymization_enabled', 'county', 'pharmacy_board_license',
            'last_sync_date', 'last_sync_status',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'last_sync_date', 'last_sync_status', 'created_at', 'updated_at']


class eTIMSInvoiceItemSerializer(serializers.ModelSerializer):
    tax_type_display = serializers.CharField(source='get_tax_type_display', read_only=True)

    class Meta:
        model = eTIMSInvoiceItem
        fields = [
            'id', 'invoice', 'item_sequence',
            'item_code', 'item_name',
            'tax_type', 'tax_type_display',
            'quantity', 'unit_of_measure', 'unit_price', 'discount_amount',
            'taxable_amount', 'tax_amount', 'total_amount',
            'created_at',
        ]
        read_only_fields = ['id', 'taxable_amount', 'tax_amount', 'total_amount', 'created_at']


class eTIMSInvoiceSerializer(serializers.ModelSerializer):
    items = eTIMSInvoiceItemSerializer(many=True, read_only=True)
    invoice_type_display = serializers.CharField(
        source='get_invoice_type_display', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(
        source='get_payment_status_display', read_only=True
    )
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = eTIMSInvoice
        fields = [
            'id', 'invoice_number', 'etims_invoice_number',
            'invoice_type', 'invoice_type_display',
            'invoice_date', 'customer_name', 'customer_phone', 'customer_tin',
            'patient', 'patient_name',
            'patient_visit', 'otc_sale', 'lab_order', 'inpatient_admission',
            'total_amount', 'taxable_amount', 'vat_rate', 'vat_amount',
            'is_exempt', 'exemption_reason',
            'payment_method', 'mpesa_code',
            'status', 'status_display',
            'submitted_to_etims', 'submitted_at',
            'etims_response', 'etims_qr_code', 'etims_verification_url',
            'rejection_reason',
            'payment_status', 'payment_status_display', 'amount_paid',
            'created_by', 'created_by_name',
            'notes', 'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'invoice_number', 'etims_invoice_number',
            'submitted_at', 'etims_response', 'etims_qr_code',
            'etims_verification_url', 'created_at', 'updated_at',
        ]


# ============================================================
# HR — ATTENDANCE & LEAVE
# ============================================================

class HospitalWiFiNetworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalWiFiNetwork
        fields = ['id', 'network_name', 'bssid', 'location', 'ip_range', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class AttendanceQRCodeSerializer(serializers.ModelSerializer):
    qr_type_display = serializers.CharField(source='get_qr_type_display', read_only=True)
    generated_by_name = serializers.CharField(
        source='generated_by.get_full_name', read_only=True
    )
    is_currently_valid = serializers.SerializerMethodField()
    valid_window = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceQRCode
        fields = [
            'id', 'qr_code', 'qr_type', 'qr_type_display',
            'valid_from', 'valid_until', 'attendance_date', 'location',
            'generated_by', 'generated_by_name',
            'is_active', 'scan_count',
            'is_currently_valid', 'valid_window',
            'created_at',
        ]
        read_only_fields = ['id', 'qr_code', 'scan_count', 'created_at']

    def get_is_currently_valid(self, obj):
        return obj.is_valid()

    def get_valid_window(self, obj):
        return f"{obj.valid_from.strftime('%H:%M')} – {obj.valid_until.strftime('%H:%M')}"


class AttendanceSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_type = serializers.CharField(source='user.user_type', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    manual_approved_by_name = serializers.CharField(
        source='manual_approved_by.get_full_name', read_only=True
    )
    check_in_wifi = serializers.CharField(
        source='check_in_wifi_network.network_name', read_only=True
    )
    check_out_wifi = serializers.CharField(
        source='check_out_wifi_network.network_name', read_only=True
    )

    class Meta:
        model = Attendance
        fields = [
            'id', 'user', 'user_name', 'user_type', 'date',
            'status', 'status_display',
            'check_in_time', 'check_in_qr_code', 'check_in_location',
            'check_in_ip', 'check_in_wifi',
            'check_out_time', 'check_out_qr_code', 'check_out_ip', 'check_out_wifi',
            'total_hours',
            'is_manual', 'manual_reason', 'manual_approved_by', 'manual_approved_by_name',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'total_hours', 'created_at', 'updated_at']


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = [
            'id', 'name', 'description', 'days_allowed_per_year',
            'requires_attachment', 'is_paid', 'requires_hr_approval',
            'minimum_notice_days', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class LeaveApplicationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_type = serializers.CharField(source='user.user_type', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    is_paid = serializers.BooleanField(source='leave_type.is_paid', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    supervisor_approved_by_name = serializers.CharField(
        source='supervisor_approved_by.get_full_name', read_only=True
    )
    hr_approved_by_name = serializers.CharField(
        source='hr_approved_by.get_full_name', read_only=True
    )

    class Meta:
        model = LeaveApplication
        fields = [
            'id', 'application_number',
            'user', 'user_name', 'user_type',
            'leave_type', 'leave_type_name', 'is_paid',
            'start_date', 'end_date', 'total_days',
            'reason', 'attachment',
            'status', 'status_display',
            'supervisor_approved', 'supervisor_approved_by', 'supervisor_approved_by_name',
            'supervisor_approved_at', 'supervisor_comments',
            'hr_approved', 'hr_approved_by', 'hr_approved_by_name',
            'hr_approved_at', 'hr_comments',
            'rejected_by', 'rejected_at', 'rejection_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'application_number', 'total_days',
            'created_at', 'updated_at',
        ]


# ============================================================
# ASSETS
# ============================================================

class AssetMaintenanceLogSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.asset_name', read_only=True)
    asset_id_display = serializers.CharField(source='asset.asset_id', read_only=True)
    maintenance_type_display = serializers.CharField(
        source='get_maintenance_type_display', read_only=True
    )
    logged_by_name = serializers.CharField(source='logged_by.get_full_name', read_only=True)

    class Meta:
        model = AssetMaintenanceLog
        fields = [
            'id', 'asset', 'asset_name', 'asset_id_display',
            'maintenance_type', 'maintenance_type_display',
            'maintenance_date', 'performed_by', 'service_provider',
            'description', 'parts_replaced',
            'cost', 'downtime_hours', 'is_completed', 'invoice_number',
            'notes', 'logged_by', 'logged_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class HospitalAssetSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', read_only=True
    )
    is_maintenance_overdue = serializers.BooleanField(read_only=True)
    maintenance_logs = AssetMaintenanceLogSerializer(many=True, read_only=True)

    class Meta:
        model = HospitalAsset
        fields = [
            'id', 'asset_id', 'asset_name',
            'category', 'category_display',
            'description', 'manufacturer', 'model_number', 'serial_number',
            'purchase_date', 'purchase_cost', 'supplier', 'warranty_expiry',
            'location', 'assigned_to', 'assigned_to_name',
            'status', 'status_display', 'condition', 'condition_display',
            'requires_maintenance', 'last_maintenance_date', 'next_maintenance_date',
            'maintenance_notes',
            'requires_calibration', 'last_calibration_date', 'next_calibration_date',
            'last_audit_date', 'next_audit_date',
            'needs_replacement', 'replacement_reason', 'estimated_replacement_cost',
            'asset_image', 'barcode', 'remarks',
            'is_maintenance_overdue',
            'created_by', 'created_at', 'updated_at',
            'maintenance_logs',
        ]
        read_only_fields = ['id', 'is_maintenance_overdue', 'created_at', 'updated_at']


# ============================================================
# AUDIT, SECURITY & NOTIFICATIONS
# ============================================================

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'action_display',
            'table_affected', 'record_id', 'description',
            'ip_address', 'user_agent',
            'old_values', 'new_values', 'timestamp',
        ]
        read_only_fields = ['id', 'timestamp']


class SecurityThreatSerializer(serializers.ModelSerializer):
    threat_type_display = serializers.CharField(
        source='get_threat_type_display', read_only=True
    )
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    resolved_by_name = serializers.CharField(
        source='resolved_by.get_full_name', read_only=True
    )

    class Meta:
        model = SecurityThreat
        fields = [
            'id', 'threat_type', 'threat_type_display',
            'severity', 'severity_display',
            'ip_address', 'user', 'description',
            'request_path', 'request_method', 'user_agent',
            'blocked', 'resolved',
            'resolved_by', 'resolved_by_name', 'resolved_at', 'resolution_notes',
            'detected_at',
        ]
        read_only_fields = ['id', 'detected_at']


class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(
        source='get_notification_type_display', read_only=True
    )
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'sender', 'sender_name',
            'patient', 'patient_name',
            'notification_type', 'notification_type_display',
            'title', 'message',
            'related_object_id', 'related_object_type',
            'is_read', 'is_urgent', 'action_url', 'expires_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'content', 'timestamp', 'is_read']
        read_only_fields = ['id', 'timestamp']


class ConversationSerializer(serializers.ModelSerializer):
    participant1_name = serializers.CharField(
        source='participant1.get_full_name', read_only=True
    )
    participant2_name = serializers.CharField(
        source='participant2.get_full_name', read_only=True
    )
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'participant1', 'participant1_name',
            'participant2', 'participant2_name',
            'patient', 'patient_name',
            'last_message', 'unread_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {'content': msg.content[:80], 'timestamp': msg.timestamp, 'sender': msg.sender_id}
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


# ============================================================
# DASHBOARD STATS
# ============================================================

class DashboardStatsSerializer(serializers.Serializer):
    """
    Role-specific dashboard stats — populated in DashboardView.
    Fields present depend on user_type.
    """
    # Common
    today_date = serializers.DateField()
    user_name = serializers.CharField()
    user_type = serializers.CharField()

    # Reception / Clinical
    today_visits = serializers.IntegerField(required=False)
    waiting_triage = serializers.IntegerField(required=False)
    waiting_consultation = serializers.IntegerField(required=False)
    in_consultation = serializers.IntegerField(required=False)
    completed_today = serializers.IntegerField(required=False)

    # Doctor
    my_queue_count = serializers.IntegerField(required=False)
    pending_lab_results = serializers.IntegerField(required=False)
    today_appointments = serializers.IntegerField(required=False)

    # Pharmacy
    pending_prescriptions = serializers.IntegerField(required=False)
    low_stock_count = serializers.IntegerField(required=False)
    today_otc_sales = serializers.IntegerField(required=False)

    # Lab
    pending_lab_orders = serializers.IntegerField(required=False)
    urgent_orders = serializers.IntegerField(required=False)
    critical_results = serializers.IntegerField(required=False)

    # Inpatient
    total_admitted = serializers.IntegerField(required=False)
    available_beds = serializers.IntegerField(required=False)
    occupied_beds = serializers.IntegerField(required=False)
    discharge_today = serializers.IntegerField(required=False)

    # Emergency
    active_emergency = serializers.IntegerField(required=False)
    red_triage = serializers.IntegerField(required=False)

    # Cashier
    today_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    today_cash = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    today_mpesa = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    session_status = serializers.CharField(required=False)

    # Insurance
    pending_consultation_claims = serializers.IntegerField(required=False)
    pending_pharmacy_claims = serializers.IntegerField(required=False)
    pending_inpatient_claims = serializers.IntegerField(required=False)
    pending_sha_claims = serializers.IntegerField(required=False)

    # Procurement
    pending_prs = serializers.IntegerField(required=False)
    pos_in_transit = serializers.IntegerField(required=False)
    pending_grns = serializers.IntegerField(required=False)

    # Accountant / eTIMS
    pending_etims_invoices = serializers.IntegerField(required=False)
    submitted_today = serializers.IntegerField(required=False)

    # HR
    present_today = serializers.IntegerField(required=False)
    absent_today = serializers.IntegerField(required=False)
    pending_leaves = serializers.IntegerField(required=False)
    total_staff = serializers.IntegerField(required=False)

    # Admin
    total_patients = serializers.IntegerField(required=False)
    total_doctors = serializers.IntegerField(required=False)
    total_nurses = serializers.IntegerField(required=False)
    assets_maintenance_due = serializers.IntegerField(required=False)