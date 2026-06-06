"""
AFYA1 HMIS — models.py
South B Hospital Management Information System (Level 5)
Covers: Auth, Patients, Consultations, Pharmacy, Lab, Inpatient,
        Emergency, Maternity, Procurement, Insurance, SHA, eTIMS, HR, Assets
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from datetime import timedelta
from decimal import Decimal
import uuid
import random
import string
import secrets


# ============================================================
# AUTHENTICATION & USERS
# ============================================================

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('ADMIN', 'Administrator'),
        ('DOCTOR', 'Doctor'),
        ('NURSE', 'Nurse'),
        ('RECEPTIONIST', 'Receptionist'),
        ('PHARMACIST', 'Pharmacist'),
        ('LAB_TECH', 'Lab Technician'),
        ('CASHIER', 'Cashier'),
        ('PROCUREMENT', 'Procurement Officer'),
        ('ACCOUNTANT', 'Accountant'),
        ('INSURANCE', 'Claims Officer'),
        ('HR', 'Human Resource Officer'),
    )
    user_type = models.CharField(max_length=15, choices=USER_TYPE_CHOICES)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    specialization = models.CharField(max_length=100, blank=True, null=True)
    license_number = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.get_full_name()} ({self.user_type})"


class LoginAttempt(models.Model):
    username = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField()
    timestamp = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)
    user_agent = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Login attempt: {self.username} @ {self.timestamp}"


class AccountLock(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='account_lock')
    locked_at = models.DateTimeField(auto_now_add=True)
    failed_attempts = models.PositiveIntegerField(default=0)
    last_attempt_ip = models.GenericIPAddressField(null=True, blank=True)
    unlock_time = models.DateTimeField(null=True, blank=True)
    is_locked = models.BooleanField(default=True)

    def is_account_locked(self):
        if not self.is_locked:
            return False
        if self.unlock_time and timezone.now() > self.unlock_time:
            self.is_locked = False
            self.save()
            return False
        return True

    def __str__(self):
        return f"Lock: {self.user.username}"


class TwoFactorCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tfa_codes')
    code = models.CharField(max_length=7)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    session_key = models.CharField(max_length=40)

    def save(self, *args, **kwargs):
        if not self.code:
            digits = ''.join(random.choices(string.digits, k=6))
            self.code = f"{digits[:3]}-{digits[3:]}"
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=2)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.used and timezone.now() <= self.expires_at

    def mark_as_used(self):
        self.used = True
        self.used_at = timezone.now()
        self.save()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"2FA: {self.user.username}"


class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)
    login_time = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    device_type = models.CharField(max_length=50, blank=True, null=True)
    browser = models.CharField(max_length=100, blank=True, null=True)
    os = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['-last_activity']

    def __str__(self):
        return f"{self.user.username} — {self.ip_address}"


# ============================================================
# CORE CLINICAL — PATIENTS, DOCTORS, NURSES
# ============================================================

class Patient(models.Model):
    GENDER_CHOICES = (('M', 'Male'), ('F', 'Female'), ('O', 'Other'))

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    id_number = models.CharField(max_length=20, blank=True, null=True)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    blood_type = models.CharField(max_length=5, blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    chronic_conditions = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Doctor(models.Model):
    SPECIALIZATION_CHOICES = (
        ('GP', 'General Practitioner'), ('CAR', 'Cardiologist'),
        ('DER', 'Dermatologist'), ('PED', 'Pediatrician'),
        ('ORT', 'Orthopedic Surgeon'), ('NEU', 'Neurologist'),
        ('PSY', 'Psychiatrist'), ('ONC', 'Oncologist'),
        ('RAD', 'Radiologist'), ('EM', 'Emergency Medicine'),
        ('ANES', 'Anesthesiologist'), ('OBGYN', 'Obstetrician/Gynecologist'),
        ('ENT', 'ENT Specialist'), ('SURG', 'General Surgeon'),
    )
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='doctor_profile'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=(('M', 'Male'), ('F', 'Female'), ('O', 'Other')))
    id_number = models.CharField(max_length=20, unique=True)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)
    specialization = models.CharField(max_length=10, choices=SPECIALIZATION_CHOICES)
    license_number = models.CharField(max_length=50, unique=True)
    license_expiry = models.DateField(blank=True, null=True)
    years_of_experience = models.PositiveIntegerField(default=0)
    qualifications = models.TextField(blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    joining_date = models.DateField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='doctors/photos/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name} ({self.get_specialization_display()})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Nurse(models.Model):
    NURSE_TYPE_CHOICES = (
        ('RN', 'Registered Nurse'), ('LPN', 'Licensed Practical Nurse'),
        ('NP', 'Nurse Practitioner'), ('CNS', 'Clinical Nurse Specialist'),
        ('SN', 'Student Nurse'),
    )
    DEPARTMENT_CHOICES = (
        ('ER', 'Emergency Room'), ('ICU', 'ICU'), ('OR', 'Operating Room'),
        ('PED', 'Pediatrics'), ('OB', 'Obstetrics'), ('ONC', 'Oncology'),
        ('GEN', 'General Ward'), ('OPD', 'Outpatient'), ('MCH', 'MCH'),
    )
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='nurse_profile'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=(('M', 'Male'), ('F', 'Female'), ('O', 'Other')))
    nurse_id = models.CharField(max_length=20, unique=True)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)
    nurse_type = models.CharField(max_length=5, choices=NURSE_TYPE_CHOICES)
    license_number = models.CharField(max_length=50, unique=True)
    license_expiry = models.DateField(blank=True, null=True)
    department = models.CharField(max_length=5, choices=DEPARTMENT_CHOICES)
    years_of_experience = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    joining_date = models.DateField(blank=True, null=True)
    is_charge_nurse = models.BooleanField(default=False)
    is_bcls_certified = models.BooleanField(default=False)
    is_acls_certified = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='nurses/photos/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Nurse {self.first_name} {self.last_name} ({self.get_nurse_type_display()})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


# ============================================================
# FACILITY & LOOKUP MODELS
# ============================================================

class InsuranceProvider(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class SpecializedService(models.Model):
    name = models.CharField(max_length=100, unique=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} — KES {self.consultation_fee}"


class Disease(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    icd_code = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.name


class ClinicSettings(models.Model):
    clinic_name = models.CharField(max_length=200)
    clinic_logo = models.ImageField(upload_to='clinic/', blank=True, null=True)
    address = models.TextField()
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    working_hours = models.TextField()
    appointment_duration = models.PositiveIntegerField(default=30)
    max_patients_per_day = models.PositiveIntegerField(default=200)

    class Meta:
        verbose_name_plural = "Clinic Settings"

    def __str__(self):
        return self.clinic_name


# ============================================================
# VISITS, TRIAGE & QUEUE
# ============================================================

class TriageCategory(models.Model):
    PRIORITY_CHOICES = (
        (1, 'Red — Immediate'), (2, 'Orange — 10 mins'),
        (3, 'Yellow — 30 mins'), (4, 'Green — 60 mins'), (5, 'Blue — 120 mins'),
    )
    COLOR_CHOICES = (
        ('RED', 'Red'), ('ORANGE', 'Orange'), ('YELLOW', 'Yellow'),
        ('GREEN', 'Green'), ('BLUE', 'Blue'),
    )
    priority_level = models.IntegerField(choices=PRIORITY_CHOICES, unique=True)
    color_code = models.CharField(max_length=10, choices=COLOR_CHOICES)
    name = models.CharField(max_length=100)
    description = models.TextField()
    max_wait_time = models.IntegerField(help_text="Minutes")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['priority_level']

    def __str__(self):
        return f"{self.color_code} — {self.name}"


class PatientVisit(models.Model):
    VISIT_TYPE_CHOICES = (
        ('EMERGENCY', 'Emergency'), ('OUTPATIENT', 'Outpatient'),
        ('INPATIENT', 'Inpatient'), ('FOLLOW_UP', 'Follow-up'),
        ('REFERRAL', 'Referral'), ('ANTENATAL', 'Antenatal'),
        ('IMMUNIZATION', 'Immunization'), ('GENERAL', 'General'),
    )
    STATUS_CHOICES = (
        ('REGISTERED', 'Registered'), ('TRIAGED', 'Triaged'),
        ('WAITING', 'Waiting'), ('IN_CONSULTATION', 'In Consultation'),
        ('IN_TREATMENT', 'In Treatment'), ('COMPLETED', 'Completed'),
        ('ADMITTED', 'Admitted'), ('REFERRED', 'Referred'), ('CANCELLED', 'Cancelled'),
    )
    visit_number = models.CharField(max_length=20, unique=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='hospital_visits')
    visit_type = models.CharField(max_length=20, choices=VISIT_TYPE_CHOICES)
    arrival_time = models.DateTimeField(default=timezone.now)
    chief_complaint = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REGISTERED')
    registered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='registered_visits',
        limit_choices_to={'user_type': 'RECEPTIONIST'}
    )
    assigned_doctor = models.ForeignKey(
        Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='patient_visits'
    )
    assigned_nurse = models.ForeignKey(
        Nurse, on_delete=models.SET_NULL, null=True, blank=True, related_name='patient_visits'
    )
    specialized_service = models.ForeignKey(
        SpecializedService, on_delete=models.SET_NULL, null=True, blank=True, related_name='visits'
    )
    insurance_provider = models.ForeignKey(
        InsuranceProvider, on_delete=models.SET_NULL, null=True, blank=True, related_name='insured_visits'
    )
    triage_time = models.DateTimeField(null=True, blank=True)
    consultation_start = models.DateTimeField(null=True, blank=True)
    consultation_end = models.DateTimeField(null=True, blank=True)
    discharge_time = models.DateTimeField(null=True, blank=True)
    referral_from = models.CharField(max_length=200, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-arrival_time']

    def save(self, *args, **kwargs):
        if not self.visit_number:
            today = timezone.now()
            count = PatientVisit.objects.filter(created_at__date=today.date()).count() + 1
            self.visit_number = f"V{today.strftime('%Y%m%d')}{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.visit_number} — {self.patient}"


class TriageAssessment(models.Model):
    CONSCIOUSNESS_CHOICES = (
        ('ALERT', 'Alert'), ('VERBAL', 'Verbal'), ('PAIN', 'Pain'), ('UNRESPONSIVE', 'Unresponsive'),
    )
    BREATHING_CHOICES = (
        ('NORMAL', 'Normal'), ('LABORED', 'Labored'), ('SHALLOW', 'Shallow'), ('ABSENT', 'Absent'),
    )
    visit = models.OneToOneField(PatientVisit, on_delete=models.CASCADE, related_name='triage')
    category = models.ForeignKey(TriageCategory, on_delete=models.PROTECT)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    blood_pressure_systolic = models.IntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.IntegerField(null=True, blank=True)
    pulse_rate = models.IntegerField(null=True, blank=True)
    respiratory_rate = models.IntegerField(null=True, blank=True)
    oxygen_saturation = models.IntegerField(null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    consciousness_level = models.CharField(max_length=20, choices=CONSCIOUSNESS_CHOICES)
    breathing_status = models.CharField(max_length=20, choices=BREATHING_CHOICES)
    pain_score = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(10)]
    )
    presenting_symptoms = models.TextField()
    allergies_noted = models.TextField(blank=True, null=True)
    current_medications = models.TextField(blank=True, null=True)
    triage_notes = models.TextField()
    requires_immediate_attention = models.BooleanField(default=False)
    assessed_by = models.ForeignKey(
        Nurse, on_delete=models.SET_NULL, null=True, related_name='triage_assessments'
    )
    assessment_time = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Triage {self.visit.visit_number} — {self.category.color_code}"

    @property
    def bmi(self):
        if self.weight and self.height:
            h = float(self.height) / 100
            return round(float(self.weight) / (h ** 2), 2)
        return None


class QueueManagement(models.Model):
    DEPARTMENT_CHOICES = (
        ('TRIAGE', 'Triage'), ('CONSULTATION', 'Consultation'),
        ('LABORATORY', 'Laboratory'), ('PHARMACY', 'Pharmacy'),
        ('RADIOLOGY', 'Radiology'), ('PROCEDURE', 'Procedure'),
        ('ADMISSION', 'Admission'),
    )
    visit = models.ForeignKey(PatientVisit, on_delete=models.CASCADE, related_name='queue_entries')
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES)
    queue_number = models.IntegerField()
    priority_override = models.BooleanField(default=False)
    joined_queue = models.DateTimeField(default=timezone.now)
    called_time = models.DateTimeField(null=True, blank=True)
    service_start = models.DateTimeField(null=True, blank=True)
    service_end = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_serving = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    serving_staff = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='queue_services'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['priority_override', 'queue_number', 'joined_queue']

    def __str__(self):
        return f"{self.department} #{self.queue_number} — {self.visit.visit_number}"


# ============================================================
# CONSULTATIONS & DIAGNOSES
# ============================================================

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'), ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled'), ('NO_SHOW', 'No Show'),
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(
        User, on_delete=models.CASCADE, limit_choices_to={'user_type': 'DOCTOR'}
    )
    receptionist = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='booked_appointments', limit_choices_to={'user_type': 'RECEPTIONIST'}
    )
    scheduled_time = models.DateTimeField()
    end_time = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    reason = models.TextField()
    symptoms = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_time']

    def __str__(self):
        return f"{self.patient} with {self.doctor.last_name} at {self.scheduled_time}"


class Consultation(models.Model):
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE)
    diagnosis = models.TextField()
    diseases = models.ManyToManyField(Disease, blank=True)
    notes = models.TextField(blank=True, null=True)
    follow_up_date = models.DateField(blank=True, null=True)
    follow_up_notes = models.TextField(blank=True, null=True)
    consultation_code = models.CharField(max_length=10, blank=True, null=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Consult {self.consultation_code} — {self.appointment.patient}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not self.consultation_code:
            while True:
                code = 'R' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
                if not Consultation.objects.filter(consultation_code=code).exists():
                    self.consultation_code = code
                    break
        super().save(*args, **kwargs)
        if is_new:
            PatientMedicalHistory.objects.create(
                patient=self.appointment.patient,
                consultation=self,
                record_type="Consultation Record",
                description=(
                    f"Diagnosis: {self.diagnosis}" +
                    (f" | Notes: {self.notes}" if self.notes else "")
                ),
                recorded_by=self.appointment.doctor,
            )


class PatientMedicalHistory(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    consultation = models.ForeignKey(
        Consultation, on_delete=models.CASCADE, blank=True, null=True
    )
    record_type = models.CharField(max_length=100)
    description = models.TextField()
    date_recorded = models.DateField(auto_now_add=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        unique_together = ['patient', 'consultation', 'record_type']

    def __str__(self):
        return f"{self.record_type} — {self.patient}"


class ICD10Category(models.Model):
    chapter_number = models.CharField(max_length=10)
    code_range = models.CharField(max_length=20)
    category_name = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['chapter_number']

    def __str__(self):
        return f"Ch.{self.chapter_number}: {self.category_name} ({self.code_range})"


class ICD10Code(models.Model):
    code = models.CharField(
        max_length=10, unique=True, db_index=True,
        validators=[RegexValidator(
            regex=r'^[A-Z]\d{2}(\.\d{1,2})?$',
            message='Invalid ICD-10 code format'
        )]
    )
    category = models.ForeignKey(ICD10Category, on_delete=models.CASCADE, related_name='codes')
    description = models.TextField()
    short_description = models.CharField(max_length=200)
    local_name = models.CharField(max_length=200, blank=True, null=True)
    is_notifiable = models.BooleanField(default=False)
    requires_isolation = models.BooleanField(default=False)
    nhif_eligible = models.BooleanField(default=False)
    nhif_package_code = models.CharField(max_length=50, blank=True, null=True)
    sha_covered = models.BooleanField(default=False)
    suggested_lab_tests = models.TextField(blank=True, null=True)
    treatment_guidelines = models.TextField(blank=True, null=True)
    usage_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_common = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} — {self.short_description}"


class ConsultationDiagnosis(models.Model):
    DIAGNOSIS_TYPE_CHOICES = (
        ('PRIMARY', 'Primary'), ('SECONDARY', 'Secondary'),
        ('DIFFERENTIAL', 'Differential'), ('PROVISIONAL', 'Provisional'), ('FINAL', 'Final'),
    )
    CERTAINTY_CHOICES = (
        ('CONFIRMED', 'Confirmed'), ('SUSPECTED', 'Suspected'), ('RULED_OUT', 'Ruled Out'),
    )
    consultation = models.ForeignKey(
        Consultation, on_delete=models.CASCADE, related_name='icd10_diagnoses'
    )
    icd10_code = models.ForeignKey(
        ICD10Code, on_delete=models.PROTECT, related_name='diagnoses'
    )
    diagnosis_type = models.CharField(
        max_length=20, choices=DIAGNOSIS_TYPE_CHOICES, default='PRIMARY'
    )
    certainty = models.CharField(max_length=20, choices=CERTAINTY_CHOICES, default='CONFIRMED')
    clinical_notes = models.TextField(blank=True, null=True)
    treatment_plan = models.TextField(blank=True, null=True)
    onset_date = models.DateField(blank=True, null=True)
    diagnosed_date = models.DateField(auto_now_add=True)
    submitted_to_nhif = models.BooleanField(default=False)
    nhif_claim_number = models.CharField(max_length=100, blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='diagnoses_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        ICD10Code.objects.filter(pk=self.icd10_code_id).update(
            usage_count=models.F('usage_count') + 1
        )

    def __str__(self):
        return f"{self.icd10_code.code} — {self.consultation}"


# ============================================================
# PHARMACY & MEDICINES
# ============================================================

class MedicineCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Medicine(models.Model):
    UNIT_TYPE_CHOICES = (
        ('TABLET', 'Tablet'), ('CAPSULE', 'Capsule'), ('SYRUP_ML', 'Syrup (ML)'),
        ('INJECTION', 'Injection'), ('CREAM_TUBE', 'Cream/Ointment (Tube)'),
        ('DROPS', 'Drops'), ('SACHET', 'Sachet'), ('SUPPOSITORY', 'Suppository'),
    )
    name = models.CharField(max_length=200)
    category = models.ForeignKey(
        MedicineCategory, on_delete=models.SET_NULL, null=True, blank=True
    )
    description = models.TextField(blank=True, null=True)
    manufacturer = models.CharField(max_length=200, blank=True, null=True)
    unit_type = models.CharField(max_length=20, choices=UNIT_TYPE_CHOICES)
    units_per_pack = models.IntegerField(default=10)
    pack_name = models.CharField(max_length=50, default='Strip')
    quantity_in_stock = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=100)
    cost_per_unit_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_per_unit_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_per_unit_insurance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expiry_date = models.DateField(blank=True, null=True)
    batch_number = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to='medicines/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.units_per_pack} {self.get_unit_type_display()}/{self.pack_name})"

    @property
    def is_low_stock(self):
        return self.quantity_in_stock <= self.reorder_level

    def calculate_price(self, quantity_units, is_insured=False):
        if quantity_units > self.quantity_in_stock:
            return {'error': f'Insufficient stock. Available: {self.quantity_in_stock}'}
        price = self.price_per_unit_insurance if is_insured else self.price_per_unit_cash
        return {
            'medicine_name': self.name,
            'quantity': quantity_units,
            'price_per_unit': float(price),
            'total_price': float(quantity_units * price),
            'payment_type': 'Insurance' if is_insured else 'Cash',
        }


class StockMovement(models.Model):
    MOVEMENT_TYPE_CHOICES = (
        ('PURCHASE', 'Purchase'), ('SALE', 'Sale'), ('ADJUSTMENT', 'Adjustment'),
        ('RETURN', 'Return'), ('DAMAGE', 'Damage/Expired'), ('TRANSFER', 'Transfer'),
    )
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='stock_movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity = models.IntegerField()
    previous_quantity = models.IntegerField()
    new_quantity = models.IntegerField()
    reason = models.TextField(blank=True, null=True)
    batch_number = models.CharField(max_length=100, blank=True, null=True)
    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='stock_movements_performed'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_movement_type_display()} — {self.medicine.name} ({self.quantity})"


class Prescription(models.Model):
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    dosage_text = models.CharField(max_length=200)
    duration = models.CharField(max_length=100)
    instructions = models.TextField(blank=True, null=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_insured = models.BooleanField(default=False)
    insurance_provider = models.ForeignKey(
        InsuranceProvider, on_delete=models.SET_NULL, null=True, blank=True
    )
    is_dispensed = models.BooleanField(default=False)
    dispensed_at = models.DateTimeField(blank=True, null=True)
    dispensed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='dispensed_prescriptions'
    )
    prescribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-prescribed_at']

    def __str__(self):
        return f"{self.medicine.name} x{self.quantity} — {self.consultation.appointment.patient}"

    def dispense(self, user):
        if self.quantity > self.medicine.quantity_in_stock:
            raise ValueError(f"Insufficient stock. Available: {self.medicine.quantity_in_stock}")
        pricing = self.medicine.calculate_price(self.quantity, self.is_insured)
        if 'error' in pricing:
            raise ValueError(pricing['error'])
        self.unit_price = Decimal(str(pricing['price_per_unit']))
        self.total_price = Decimal(str(pricing['total_price']))
        prev = self.medicine.quantity_in_stock
        self.medicine.quantity_in_stock -= self.quantity
        self.medicine.save()
        self.is_dispensed = True
        self.dispensed_at = timezone.now()
        self.dispensed_by = user
        self.save()
        StockMovement.objects.create(
            medicine=self.medicine, movement_type='SALE',
            quantity=-self.quantity, previous_quantity=prev,
            new_quantity=self.medicine.quantity_in_stock,
            reason=f"Prescription for {self.consultation.appointment.patient}",
            performed_by=user
        )


class MedicineSale(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ('CASH', 'Cash'), ('MPESA', 'M-Pesa'),
        ('INSURANCE', 'Insurance'), ('CREDIT', 'Credit'),
    )
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True)
    receptionist = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        limit_choices_to={'user_type': 'RECEPTIONIST'}
    )
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    mpesa_number = models.CharField(max_length=15, blank=True, null=True)
    mpesa_code = models.CharField(max_length=50, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    sale_date = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-sale_date']

    def __str__(self):
        return f"Sale #{self.id} — {self.total_amount}"


class SoldMedicine(models.Model):
    sale = models.ForeignKey(MedicineSale, on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def total_price(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.quantity}x {self.medicine.name}"


class OverTheCounterSale(models.Model):
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed'),
    )
    sale_id = models.CharField(max_length=50, unique=True, editable=False)
    customer_name = models.CharField(max_length=100)
    mpesa_code = models.CharField(max_length=20, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending'
    )
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='otc_sales')
    notes = models.TextField(blank=True, null=True)
    is_dispensed = models.BooleanField(default=False)
    dispensed_at = models.DateTimeField(blank=True, null=True)
    dispensed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispensed_otc_sales'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.sale_id:
            self.sale_id = f"OTC-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sale_id} — {self.customer_name}"


class OverTheCounterSaleItem(models.Model):
    sale = models.ForeignKey(
        OverTheCounterSale, on_delete=models.CASCADE, related_name='items'
    )
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity}x {self.medicine.name}"


# ============================================================
# LABORATORY & IMAGING
# ============================================================

class LabTestCategory(models.Model):
    CATEGORY_TYPE_CHOICES = (
        ('HEMATOLOGY', 'Hematology'), ('BIOCHEMISTRY', 'Biochemistry'),
        ('MICROBIOLOGY', 'Microbiology'), ('SEROLOGY', 'Serology'),
        ('PARASITOLOGY', 'Parasitology'), ('HISTOPATHOLOGY', 'Histopathology'),
        ('RADIOLOGY', 'Radiology'), ('ULTRASOUND', 'Ultrasound'),
        ('XRAY', 'X-Ray'), ('CT_SCAN', 'CT Scan'), ('MRI', 'MRI'), ('OTHER', 'Other'),
    )
    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPE_CHOICES)
    description = models.TextField(blank=True, null=True)
    department = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


class LabTest(models.Model):
    SAMPLE_TYPE_CHOICES = (
        ('BLOOD', 'Blood'), ('URINE', 'Urine'), ('STOOL', 'Stool'),
        ('SPUTUM', 'Sputum'), ('CSF', 'CSF'), ('SWAB', 'Swab'),
        ('TISSUE', 'Tissue'), ('NONE', 'No Sample (Imaging)'), ('OTHER', 'Other'),
    )
    test_code = models.CharField(max_length=20, unique=True)
    test_name = models.CharField(max_length=200)
    category = models.ForeignKey(LabTestCategory, on_delete=models.CASCADE, related_name='tests')
    description = models.TextField(blank=True, null=True)
    sample_type = models.CharField(max_length=20, choices=SAMPLE_TYPE_CHOICES)
    preparation_instructions = models.TextField(blank=True, null=True)
    normal_range = models.CharField(max_length=200, blank=True, null=True)
    turnaround_time = models.IntegerField(default=24, help_text="Hours")
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    nhif_covered = models.BooleanField(default=False)
    sha_covered = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    usage_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['test_name']

    def __str__(self):
        return f"{self.test_code} — {self.test_name}"


class LabOrder(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('SAMPLE_COLLECTED', 'Sample Collected'),
        ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'),
        ('REPORTED', 'Reported'), ('CANCELLED', 'Cancelled'),
    )
    PRIORITY_CHOICES = (
        ('ROUTINE', 'Routine'), ('URGENT', 'Urgent'),
        ('EMERGENCY', 'Emergency'), ('STAT', 'STAT'),
    )
    order_number = models.CharField(max_length=50, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_orders')
    consultation = models.ForeignKey(
        Consultation, on_delete=models.CASCADE, related_name='lab_orders', null=True, blank=True
    )
    ordered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='lab_orders_created', limit_choices_to={'user_type': 'DOCTOR'}
    )
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='ROUTINE')
    clinical_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    ordered_at = models.DateTimeField(auto_now_add=True)
    sample_collected_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    reported_at = models.DateTimeField(blank=True, null=True)
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_lab_orders', limit_choices_to={'user_type': 'LAB_TECH'}
    )
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-ordered_at']

    def save(self, *args, **kwargs):
        if not self.order_number:
            today = timezone.now()
            count = LabOrder.objects.filter(created_at__date=today.date()).count() + 1
            self.order_number = f"LAB-{today.strftime('%Y%m%d')}-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_number} — {self.patient}"


class LabOrderItem(models.Model):
    lab_order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name='test_items')
    test = models.ForeignKey(LabTest, on_delete=models.PROTECT, related_name='order_items')
    sample_id = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=LabOrder.STATUS_CHOICES, default='PENDING')
    result_value = models.TextField(blank=True, null=True)
    result_unit = models.CharField(max_length=50, blank=True, null=True)
    is_abnormal = models.BooleanField(default=False)
    method_used = models.CharField(max_length=200, blank=True, null=True)
    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='lab_tests_performed'
    )
    verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='lab_tests_verified'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.test.test_name} — {self.lab_order.order_number}"


class LabResult(models.Model):
    lab_order = models.OneToOneField(LabOrder, on_delete=models.CASCADE, related_name='result')
    summary = models.TextField()
    interpretation = models.TextField(blank=True, null=True)
    recommendations = models.TextField(blank=True, null=True)
    is_critical = models.BooleanField(default=False)
    critical_value_notified = models.BooleanField(default=False)
    notified_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='critical_results_received'
    )
    notified_at = models.DateTimeField(blank=True, null=True)
    result_document = models.FileField(upload_to='lab_results/', blank=True, null=True)
    quality_control_passed = models.BooleanField(default=True)
    result_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='lab_results_entered', limit_choices_to={'user_type': 'LAB_TECH'}
    )
    verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='lab_results_verified'
    )
    verified_at = models.DateTimeField(blank=True, null=True)
    patient_notified = models.BooleanField(default=False)
    result_released_to_patient = models.BooleanField(default=False)
    released_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result for {self.lab_order.order_number}"


class ImagingStudy(models.Model):
    MODALITY_CHOICES = (
        ('XRAY', 'X-Ray'), ('CT', 'CT Scan'), ('MRI', 'MRI'),
        ('ULTRASOUND', 'Ultrasound'), ('MAMMOGRAPHY', 'Mammography'),
        ('FLUOROSCOPY', 'Fluoroscopy'), ('ANGIOGRAPHY', 'Angiography'), ('OTHER', 'Other'),
    )
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'), ('REPORTED', 'Reported'), ('CANCELLED', 'Cancelled'),
    )
    lab_order = models.ForeignKey(
        LabOrder, on_delete=models.CASCADE, related_name='imaging_studies',
        null=True, blank=True
    )
    consultation = models.ForeignKey(
        Consultation, on_delete=models.CASCADE, related_name='imaging_studies',
        null=True, blank=True
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='imaging_studies',
        null=True, blank=True
    )
    ordered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='imaging_studies_ordered', limit_choices_to={'user_type': 'DOCTOR'}
    )
    modality = models.CharField(max_length=20, choices=MODALITY_CHOICES)
    body_part = models.CharField(max_length=50)
    study_description = models.CharField(max_length=500)
    clinical_indication = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    is_urgent = models.BooleanField(default=False)
    contrast_used = models.BooleanField(default=False)
    findings = models.TextField(blank=True, null=True)
    impression = models.TextField(blank=True, null=True)
    image_1 = models.ImageField(upload_to='imaging/', blank=True, null=True)
    image_2 = models.ImageField(upload_to='imaging/', blank=True, null=True)
    image_3 = models.ImageField(upload_to='imaging/', blank=True, null=True)
    dicom_file = models.FileField(upload_to='imaging/dicom/', blank=True, null=True)
    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='imaging_performed'
    )
    reported_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='imaging_reported'
    )
    ordered_at = models.DateTimeField(auto_now_add=True)
    performed_at = models.DateTimeField(blank=True, null=True)
    reported_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.patient_id:
            if self.consultation:
                self.patient = self.consultation.appointment.patient
                self.ordered_by = self.consultation.appointment.doctor
            elif self.lab_order:
                self.patient = self.lab_order.patient
                self.ordered_by = self.lab_order.ordered_by
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_modality_display()} — {self.study_description} — {self.patient}"


# ============================================================
# INPATIENT — WARDS, BEDS, ADMISSIONS
# ============================================================

class Ward(models.Model):
    WARD_TYPE_CHOICES = (
        ('GENERAL', 'General'), ('PRIVATE', 'Private'), ('ICU', 'ICU'),
        ('HDU', 'HDU'), ('MATERNITY', 'Maternity'), ('PEDIATRIC', 'Pediatric'),
        ('SURGICAL', 'Surgical'), ('MEDICAL', 'Medical'),
        ('ISOLATION', 'Isolation'), ('EMERGENCY', 'Emergency'),
    )
    ward_code = models.CharField(max_length=20, unique=True)
    ward_name = models.CharField(max_length=100)
    ward_type = models.CharField(max_length=20, choices=WARD_TYPE_CHOICES)
    floor_number = models.CharField(max_length=10, blank=True, null=True)
    building = models.CharField(max_length=100, blank=True, null=True)
    total_beds = models.PositiveIntegerField(default=0)
    nurse_in_charge = models.ForeignKey(
        Nurse, on_delete=models.SET_NULL, null=True, blank=True, related_name='wards_in_charge'
    )
    has_oxygen = models.BooleanField(default=False)
    has_monitoring = models.BooleanField(default=False)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ward_code} — {self.ward_name}"

    @property
    def occupied_beds_count(self):
        return self.beds.filter(status='OCCUPIED').count()

    @property
    def available_beds_count(self):
        return self.beds.filter(status='AVAILABLE').count()


class Bed(models.Model):
    BED_STATUS_CHOICES = (
        ('AVAILABLE', 'Available'), ('OCCUPIED', 'Occupied'),
        ('RESERVED', 'Reserved'), ('MAINTENANCE', 'Maintenance'),
        ('CLEANING', 'Cleaning'), ('OUT_OF_SERVICE', 'Out of Service'),
    )
    BED_TYPE_CHOICES = (
        ('STANDARD', 'Standard'), ('ICU', 'ICU'), ('ELECTRIC', 'Electric'),
        ('PEDIATRIC', 'Pediatric'), ('MATERNITY', 'Maternity'), ('ISOLATION', 'Isolation'),
    )
    bed_number = models.CharField(max_length=20, unique=True)
    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='beds')
    bed_type = models.CharField(max_length=20, choices=BED_TYPE_CHOICES, default='STANDARD')
    status = models.CharField(max_length=20, choices=BED_STATUS_CHOICES, default='AVAILABLE')
    has_oxygen = models.BooleanField(default=False)
    has_monitor = models.BooleanField(default=False)
    has_ventilator = models.BooleanField(default=False)
    is_window_side = models.BooleanField(default=False)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    current_admission = models.ForeignKey(
        'InpatientAdmission', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='current_bed'
    )
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['ward', 'bed_number']

    def __str__(self):
        return f"{self.bed_number} ({self.ward.ward_code}) — {self.get_status_display()}"

    def is_available(self):
        return self.status == 'AVAILABLE' and self.is_active


class InpatientAdmission(models.Model):
    ADMISSION_STATUS_CHOICES = (
        ('ACTIVE', 'Active'), ('DISCHARGED', 'Discharged'),
        ('TRANSFERRED', 'Transferred'), ('ABSCONDED', 'Absconded'), ('DECEASED', 'Deceased'),
    )
    ADMISSION_TYPE_CHOICES = (
        ('EMERGENCY', 'Emergency'), ('ELECTIVE', 'Elective'),
        ('DIRECT', 'Direct'), ('TRANSFER', 'Transfer'), ('OBSERVATION', 'Observation'),
    )
    admission_number = models.CharField(max_length=50, unique=True, editable=False)
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='inpatient_admissions'
    )
    consultation = models.ForeignKey(
        Consultation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inpatient_admissions'
    )
    bed = models.ForeignKey(Bed, on_delete=models.SET_NULL, null=True, related_name='admissions')
    admission_type = models.CharField(
        max_length=20, choices=ADMISSION_TYPE_CHOICES, default='DIRECT'
    )
    status = models.CharField(
        max_length=20, choices=ADMISSION_STATUS_CHOICES, default='ACTIVE'
    )
    admitting_diagnosis = models.TextField()
    icd10_codes = models.ManyToManyField(
        ICD10Code, blank=True, related_name='inpatient_admissions'
    )
    clinical_summary = models.TextField(blank=True, null=True)
    admitting_doctor = models.ForeignKey(
        Doctor, on_delete=models.SET_NULL, null=True, related_name='admitted_patients'
    )
    attending_doctor = models.ForeignKey(
        Doctor, on_delete=models.SET_NULL, null=True, related_name='attending_inpatients'
    )
    primary_nurse = models.ForeignKey(
        Nurse, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_inpatients'
    )
    admission_datetime = models.DateTimeField(default=timezone.now)
    expected_discharge_date = models.DateField(blank=True, null=True)
    discharge_datetime = models.DateTimeField(blank=True, null=True)
    discharge_summary = models.TextField(blank=True, null=True)
    discharge_diagnosis = models.TextField(blank=True, null=True)
    discharge_instructions = models.TextField(blank=True, null=True)
    discharged_by = models.ForeignKey(
        Doctor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='discharged_patients'
    )
    requires_isolation = models.BooleanField(default=False)
    is_critical = models.BooleanField(default=False)
    is_insured = models.BooleanField(default=False)
    insurance_company = models.CharField(max_length=200, blank=True, null=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_charges = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    emergency_contact_name = models.CharField(max_length=200, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='admissions_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-admission_datetime']

    def save(self, *args, **kwargs):
        if not self.admission_number:
            today = timezone.now()
            count = InpatientAdmission.objects.filter(created_at__date=today.date()).count() + 1
            self.admission_number = f"IPD-{today.strftime('%Y%m%d')}-{count:05d}"
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and self.bed and self.bed.status == 'AVAILABLE':
            Bed.objects.filter(pk=self.bed_id).update(status='OCCUPIED', current_admission=self)

    def __str__(self):
        return f"{self.admission_number} — {self.patient}"

    @property
    def length_of_stay(self):
        end = self.discharge_datetime or timezone.now()
        return (end - self.admission_datetime).days + 1

    @property
    def outstanding_balance(self):
        return self.total_charges - self.amount_paid

    def discharge(self, discharged_by, discharge_summary, discharge_diagnosis):
        self.status = 'DISCHARGED'
        self.discharge_datetime = timezone.now()
        self.discharged_by = discharged_by
        self.discharge_summary = discharge_summary
        self.discharge_diagnosis = discharge_diagnosis
        if self.bed:
            Bed.objects.filter(pk=self.bed_id).update(status='CLEANING', current_admission=None)
        self.save()


class InpatientDailyCharge(models.Model):
    CHARGE_TYPE_CHOICES = (
        ('BED', 'Bed'), ('NURSING', 'Nursing'), ('DOCTOR_VISIT', 'Doctor Visit'),
        ('CONSULTATION', 'Consultation'), ('PROCEDURE', 'Procedure'),
        ('MEDICINE', 'Medicine'), ('LAB_TEST', 'Lab Test'),
        ('IMAGING', 'Imaging'), ('SURGERY', 'Surgery'),
        ('OXYGEN', 'Oxygen'), ('MONITORING', 'Monitoring'),
        ('MEALS', 'Meals'), ('OTHER', 'Other'),
    )
    admission = models.ForeignKey(
        InpatientAdmission, on_delete=models.CASCADE, related_name='daily_charges'
    )
    charge_date = models.DateField(default=timezone.now)
    charge_type = models.CharField(max_length=20, choices=CHARGE_TYPE_CHOICES)
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_billed = models.BooleanField(default=False)
    is_paid = models.BooleanField(default=False)
    rendered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='services_rendered'
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='charges_created'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.total_amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        total = InpatientDailyCharge.objects.filter(admission=self.admission).aggregate(
            t=models.Sum('total_amount')
        )['t'] or 0
        InpatientAdmission.objects.filter(pk=self.admission_id).update(total_charges=total)

    def __str__(self):
        return f"{self.get_charge_type_display()} {self.charge_date} — KSh {self.total_amount}"


class InpatientVitals(models.Model):
    admission = models.ForeignKey(
        InpatientAdmission, on_delete=models.CASCADE, related_name='vital_signs'
    )
    recorded_at = models.DateTimeField(default=timezone.now)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    blood_pressure_systolic = models.IntegerField(blank=True, null=True)
    blood_pressure_diastolic = models.IntegerField(blank=True, null=True)
    pulse_rate = models.IntegerField(blank=True, null=True)
    respiratory_rate = models.IntegerField(blank=True, null=True)
    oxygen_saturation = models.IntegerField(blank=True, null=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    pain_score = models.IntegerField(blank=True, null=True)
    consciousness_level = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(
        Nurse, on_delete=models.SET_NULL, null=True, related_name='recorded_vitals'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"Vitals {self.admission.patient} — {self.recorded_at}"


class InpatientMedicineRequest(models.Model):
    REQUEST_STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('APPROVED', 'Approved'),
        ('DISPENSED', 'Dispensed'), ('REJECTED', 'Rejected'), ('CANCELLED', 'Cancelled'),
    )
    PRIORITY_CHOICES = (
        ('ROUTINE', 'Routine'), ('URGENT', 'Urgent'), ('EMERGENCY', 'Emergency STAT'),
    )
    request_number = models.CharField(max_length=50, unique=True, editable=False)
    admission = models.ForeignKey(
        InpatientAdmission, on_delete=models.CASCADE, related_name='medicine_requests'
    )
    medicine = models.ForeignKey(
        Medicine, on_delete=models.CASCADE, related_name='inpatient_requests'
    )
    quantity_requested = models.PositiveIntegerField()
    dosage = models.CharField(max_length=200)
    route = models.CharField(max_length=50, default='Oral')
    frequency = models.CharField(max_length=200, blank=True, null=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='ROUTINE')
    status = models.CharField(max_length=20, choices=REQUEST_STATUS_CHOICES, default='PENDING')
    clinical_notes = models.TextField(blank=True, null=True)
    requested_by = models.ForeignKey(
        Nurse, on_delete=models.SET_NULL, null=True, related_name='medicine_requests_made'
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='medicine_requests_approved'
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    quantity_approved = models.PositiveIntegerField(blank=True, null=True)
    dispensed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='medicine_requests_dispensed'
    )
    dispensed_at = models.DateTimeField(blank=True, null=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rejection_reason = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.request_number:
            today = timezone.now()
            count = InpatientMedicineRequest.objects.filter(
                requested_at__date=today.date()
            ).count() + 1
            self.request_number = f"MR-{today.strftime('%Y%m%d')}-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.request_number} — {self.medicine.name} ({self.get_status_display()})"


# ============================================================
# EMERGENCY
# ============================================================

class EmergencyBed(models.Model):
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'), ('OCCUPIED', 'Occupied'), ('MAINTENANCE', 'Maintenance')
    )
    bed_number = models.CharField(max_length=20, unique=True)
    location = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    has_oxygen = models.BooleanField(default=True)
    has_monitor = models.BooleanField(default=True)
    has_suction = models.BooleanField(default=True)
    current_emergency_visit = models.ForeignKey(
        'EmergencyVisit', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='current_bed_assignment'
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.bed_number} — {self.get_status_display()}"


class EmergencyVisit(models.Model):
    TRIAGE_LEVEL_CHOICES = (
        ('RED', 'Red — Life Threatening'), ('ORANGE', 'Orange — Emergency'),
        ('YELLOW', 'Yellow — Urgent'), ('GREEN', 'Green — Less Urgent'),
        ('BLUE', 'Blue — Non-Urgent'),
    )
    ARRIVAL_MODE_CHOICES = (
        ('AMBULANCE', 'Ambulance'), ('POLICE', 'Police'), ('PRIVATE', 'Private'),
        ('WALK_IN', 'Walk In'), ('CARRIED', 'Stretcher'),
    )
    INJURY_TYPE_CHOICES = (
        ('RTA', 'Road Traffic Accident'), ('ASSAULT', 'Assault'), ('FALL', 'Fall'),
        ('BURN', 'Burn'), ('POISONING', 'Poisoning'), ('MEDICAL', 'Medical Emergency'),
        ('OBSTETRIC', 'Obstetric Emergency'), ('OTHER', 'Other'),
    )
    TREATMENT_STATUS_CHOICES = (
        ('IN_EMERGENCY', 'In Emergency'), ('STABILIZED', 'Stabilized'),
        ('READY_FOR_ADMISSION', 'Ready for Admission'), ('ADMITTED', 'Admitted'),
        ('DISCHARGED', 'Discharged'), ('REFERRED', 'Referred'), ('DECEASED', 'Deceased'),
    )
    visit = models.OneToOneField(
        PatientVisit, on_delete=models.CASCADE, related_name='emergency_details'
    )
    triage_level = models.CharField(
        max_length=10, choices=TRIAGE_LEVEL_CHOICES, default='YELLOW'
    )
    arrival_mode = models.CharField(max_length=20, choices=ARRIVAL_MODE_CHOICES)
    injury_type = models.CharField(max_length=20, choices=INJURY_TYPE_CHOICES)
    is_conscious = models.BooleanField(default=True)
    is_breathing = models.BooleanField(default=True)
    has_pulse = models.BooleanField(default=True)
    glasgow_coma_scale = models.IntegerField(blank=True, null=True)
    needs_resuscitation = models.BooleanField(default=False)
    needs_oxygen = models.BooleanField(default=False)
    needs_surgery = models.BooleanField(default=False)
    police_case = models.BooleanField(default=False)
    police_station = models.CharField(max_length=200, blank=True, null=True)
    ob_number = models.CharField(max_length=100, blank=True, null=True)
    initial_assessment = models.TextField()
    immediate_treatment_given = models.TextField(blank=True, null=True)
    emergency_bed = models.ForeignKey(
        EmergencyBed, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='emergency_visits'
    )
    treatment_status = models.CharField(
        max_length=30, choices=TREATMENT_STATUS_CHOICES, default='IN_EMERGENCY'
    )
    monitoring_started = models.DateTimeField(default=timezone.now)
    monitoring_ended = models.DateTimeField(null=True, blank=True)
    total_charges = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=20,
        choices=(('UNPAID', 'Unpaid'), ('PARTIAL', 'Partial'), ('PAID', 'Paid')),
        default='UNPAID'
    )
    assessed_by = models.ForeignKey(
        Nurse, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='emergency_assessments'
    )
    transferred_to_admission = models.ForeignKey(
        InpatientAdmission, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='emergency_transfers'
    )
    transferred_at = models.DateTimeField(null=True, blank=True)
    discharge_summary = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def monitoring_hours(self):
        end = self.monitoring_ended or timezone.now()
        return int((end - self.monitoring_started).total_seconds() / 3600)

    def __str__(self):
        return f"Emergency — {self.visit.visit_number}"


class EmergencyCharge(models.Model):
    CHARGE_TYPE_CHOICES = (
        ('TREATMENT', 'Treatment'), ('MEDICINE', 'Medicine'), ('PROCEDURE', 'Procedure'),
        ('SUPPLIES', 'Supplies'), ('OXYGEN', 'Oxygen'), ('MONITORING', 'Monitoring'),
        ('XRAY', 'X-Ray'), ('LAB_TEST', 'Lab Test'), ('SUTURING', 'Suturing'),
        ('DRESSING', 'Dressing'), ('IV_FLUIDS', 'IV Fluids'), ('OTHER', 'Other'),
    )
    emergency_visit = models.ForeignKey(
        EmergencyVisit, on_delete=models.CASCADE, related_name='charges'
    )
    charge_type = models.CharField(max_length=20, choices=CHARGE_TYPE_CHOICES)
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    charged_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='emergency_charges_created'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.total_amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_charge_type_display()} — KSh {self.total_amount}"


class EmergencyPayment(models.Model):
    emergency_visit = models.ForeignKey(
        EmergencyVisit, on_delete=models.CASCADE, related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=(
        ('CASH', 'Cash'), ('MPESA', 'M-Pesa'), ('CARD', 'Card'),
        ('INSURANCE', 'Insurance'), ('SHA', 'SHA'),
    ))
    mpesa_code = models.CharField(max_length=50, blank=True, null=True)
    processed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='emergency_payments_processed'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.id} — KSh {self.amount}"


# ============================================================
# MATERNITY & MCH
# ============================================================

class MaternityVisit(models.Model):
    VISIT_PURPOSE_CHOICES = (
        ('LABOR', 'Labor & Delivery'), ('ANTENATAL', 'Antenatal'),
        ('POSTNATAL', 'Postnatal'), ('EMERGENCY', 'Obstetric Emergency'),
    )
    visit = models.OneToOneField(
        PatientVisit, on_delete=models.CASCADE, related_name='maternity_details'
    )
    visit_purpose = models.CharField(
        max_length=20, choices=VISIT_PURPOSE_CHOICES, default='LABOR'
    )
    gravida = models.IntegerField()
    para = models.IntegerField()
    abortion = models.IntegerField(default=0)
    gestational_age_weeks = models.IntegerField(blank=True, null=True)
    expected_delivery_date = models.DateField(blank=True, null=True)
    is_in_labor = models.BooleanField(default=False)
    contractions_frequency = models.CharField(max_length=100, blank=True, null=True)
    membranes_ruptured = models.BooleanField(default=False)
    cervical_dilation = models.IntegerField(blank=True, null=True)
    fetal_heart_rate = models.IntegerField(blank=True, null=True)
    is_high_risk = models.BooleanField(default=False)
    risk_factors = models.TextField(blank=True, null=True)
    needs_csection = models.BooleanField(default=False)
    fetal_distress = models.BooleanField(default=False)
    auto_admission = models.ForeignKey(
        InpatientAdmission, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='maternity_visits'
    )
    initial_assessment = models.TextField()
    assessed_by = models.ForeignKey(
        Nurse, on_delete=models.SET_NULL, null=True, related_name='maternity_assessments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Maternity {self.visit.visit_number} — G{self.gravida}P{self.para}"


class MCHVisit(models.Model):
    VISIT_TYPE_CHOICES = (
        ('IMMUNIZATION', 'Immunization'), ('GROWTH_MONITORING', 'Growth Monitoring'),
        ('SICK_CHILD', 'Sick Child'), ('NUTRITION', 'Nutrition'),
        ('DEVELOPMENTAL', 'Developmental'), ('FOLLOW_UP', 'Follow-up'),
    )
    visit = models.OneToOneField(
        PatientVisit, on_delete=models.CASCADE, related_name='mch_details'
    )
    visit_type = models.CharField(max_length=20, choices=VISIT_TYPE_CHOICES)
    child_age_months = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(72)]
    )
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    immunization_due = models.BooleanField(default=False)
    vaccines_to_administer = models.TextField(blank=True, null=True)
    has_danger_signs = models.BooleanField(default=False)
    danger_signs = models.TextField(blank=True, null=True)
    needs_doctor_consultation = models.BooleanField(default=False)
    consultation_reason = models.TextField(blank=True, null=True)
    mothers_name = models.CharField(max_length=200)
    mothers_phone = models.CharField(max_length=15)
    assessment_notes = models.TextField()
    assessed_by = models.ForeignKey(
        Nurse, on_delete=models.SET_NULL, null=True, related_name='mch_assessments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"MCH {self.visit.visit_number} — {self.child_age_months}mo"


# ============================================================
# PROCUREMENT
# ============================================================

class Supplier(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'), ('INACTIVE', 'Inactive'),
        ('BLACKLISTED', 'Blacklisted'), ('PENDING', 'Pending'),
    )
    SUPPLIER_TYPE_CHOICES = (
        ('PHARMACEUTICAL', 'Pharmaceutical'), ('MEDICAL_EQUIPMENT', 'Medical Equipment'),
        ('LABORATORY', 'Laboratory'), ('SURGICAL', 'Surgical'),
        ('GENERAL', 'General'), ('FOOD', 'Food & Catering'),
        ('CLEANING', 'Cleaning'), ('IT', 'IT'), ('MAINTENANCE', 'Maintenance'), ('OTHER', 'Other'),
    )
    supplier_code = models.CharField(max_length=50, unique=True, editable=False)
    supplier_name = models.CharField(max_length=200)
    supplier_type = models.CharField(max_length=30, choices=SUPPLIER_TYPE_CHOICES)
    contact_person = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField()
    physical_address = models.TextField()
    city = models.CharField(max_length=100)
    county = models.CharField(max_length=100)
    pin_number = models.CharField(max_length=20, unique=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    credit_days = models.IntegerField(default=30)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='suppliers_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.supplier_code:
            prefix = self.supplier_type[:3].upper()
            count = Supplier.objects.filter(supplier_type=self.supplier_type).count() + 1
            self.supplier_code = f"SUP-{prefix}-{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.supplier_code} — {self.supplier_name}"


class PurchaseRequest(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'), ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved by HOD'),
        ('APPROVED_ACCOUNTANT', 'Approved by Accountant'),
        ('APPROVED_PROCUREMENT', 'Approved by Procurement'),
        ('REJECTED', 'Rejected'), ('CONVERTED_TO_PO', 'Converted to PO'),
        ('CANCELLED', 'Cancelled'),
    )
    URGENCY_CHOICES = (
        ('ROUTINE', 'Routine'), ('URGENT', 'Urgent'), ('EMERGENCY', 'Emergency')
    )
    DEPARTMENT_CHOICES = (
        ('PHARMACY', 'Pharmacy'), ('LABORATORY', 'Laboratory'), ('RADIOLOGY', 'Radiology'),
        ('SURGERY', 'Surgery'), ('ICU', 'ICU'), ('WARD', 'Ward'), ('KITCHEN', 'Kitchen'),
        ('MAINTENANCE', 'Maintenance'), ('IT', 'IT'), ('ADMIN', 'Administration'),
        ('OTHER', 'Other'),
    )
    request_number = models.CharField(max_length=50, unique=True, editable=False)
    requesting_department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES)
    requested_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='purchase_requests'
    )
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='ROUTINE')
    purpose = models.TextField()
    expected_delivery_date = models.DateField()
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='DRAFT')
    hod_approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='pr_hod_approvals'
    )
    hod_approved_at = models.DateTimeField(blank=True, null=True)
    hod_comments = models.TextField(blank=True, null=True)
    accountant_approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pr_accountant_approvals'
    )
    accountant_approved_at = models.DateTimeField(blank=True, null=True)
    procurement_approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pr_procurement_approvals'
    )
    procurement_approved_at = models.DateTimeField(blank=True, null=True)
    rejected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='pr_rejections'
    )
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.request_number:
            today = timezone.now()
            count = PurchaseRequest.objects.filter(created_at__date=today.date()).count() + 1
            self.request_number = f"PR-{today.strftime('%Y%m%d')}-{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.request_number} — {self.requesting_department}"


class PurchaseRequestItem(models.Model):
    purchase_request = models.ForeignKey(
        PurchaseRequest, on_delete=models.CASCADE, related_name='items'
    )
    medicine = models.ForeignKey(
        Medicine, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_request_items'
    )
    item_name = models.CharField(max_length=200)
    item_description = models.TextField(blank=True, null=True)
    quantity_requested = models.IntegerField(validators=[MinValueValidator(1)])
    unit_of_measure = models.CharField(max_length=50, default='Units')
    estimated_unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estimated_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.medicine and not self.item_name:
            self.item_name = self.medicine.name
        self.estimated_total = self.quantity_requested * self.estimated_unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} — {self.quantity_requested}"


class PurchaseOrder(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'), ('SENT', 'Sent'), ('ACKNOWLEDGED', 'Acknowledged'),
        ('PARTIALLY_RECEIVED', 'Partially Received'), ('FULLY_RECEIVED', 'Fully Received'),
        ('CLOSED', 'Closed'), ('CANCELLED', 'Cancelled'),
    )
    po_number = models.CharField(max_length=50, unique=True, editable=False)
    purchase_request = models.ForeignKey(
        PurchaseRequest, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_orders'
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name='purchase_orders'
    )
    po_date = models.DateField(default=timezone.now)
    expected_delivery_date = models.DateField()
    delivery_address = models.TextField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_terms = models.CharField(max_length=20, default='CREDIT_30')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='DRAFT')
    special_instructions = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='purchase_orders_created'
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_orders_approved'
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.po_number:
            today = timezone.now()
            count = PurchaseOrder.objects.filter(
                created_at__year=today.year, created_at__month=today.month
            ).count() + 1
            self.po_number = f"PO-{today.strftime('%Y%m')}-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.po_number} — {self.supplier.supplier_name}"


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name='items'
    )
    medicine = models.ForeignKey(
        Medicine, on_delete=models.SET_NULL, null=True, blank=True, related_name='po_items'
    )
    item_name = models.CharField(max_length=200)
    quantity_ordered = models.IntegerField(validators=[MinValueValidator(1)])
    quantity_received = models.IntegerField(default=0)
    unit_of_measure = models.CharField(max_length=50, default='Units')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.medicine and not self.item_name:
            self.item_name = self.medicine.name
        self.total_price = self.quantity_ordered * self.unit_price
        super().save(*args, **kwargs)

    @property
    def quantity_pending(self):
        return self.quantity_ordered - self.quantity_received

    def __str__(self):
        return f"{self.item_name} — {self.quantity_ordered}"


class GoodsReceivedNote(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('INSPECTED', 'Inspected'),
        ('ACCEPTED', 'Accepted'), ('PARTIALLY_ACCEPTED', 'Partially Accepted'),
        ('REJECTED', 'Rejected'),
    )
    grn_number = models.CharField(max_length=50, unique=True, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name='goods_received_notes'
    )
    delivery_date = models.DateField(default=timezone.now)
    delivery_note_number = models.CharField(max_length=100)
    invoice_number = models.CharField(max_length=100, blank=True, null=True)
    received_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='goods_received'
    )
    inspected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='goods_inspected'
    )
    inspected_at = models.DateTimeField(blank=True, null=True)
    inspection_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING')
    has_quality_issues = models.BooleanField(default=False)
    quality_issues_description = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.grn_number:
            today = timezone.now()
            count = GoodsReceivedNote.objects.filter(created_at__date=today.date()).count() + 1
            self.grn_number = f"GRN-{today.strftime('%Y%m%d')}-{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.grn_number} — {self.purchase_order.po_number}"


class GoodsReceivedNoteItem(models.Model):
    grn = models.ForeignKey(GoodsReceivedNote, on_delete=models.CASCADE, related_name='items')
    po_item = models.ForeignKey(
        PurchaseOrderItem, on_delete=models.CASCADE, related_name='grn_items'
    )
    quantity_received = models.IntegerField(validators=[MinValueValidator(0)])
    quantity_accepted = models.IntegerField(default=0)
    quantity_rejected = models.IntegerField(default=0)
    batch_number = models.CharField(max_length=100, blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    manufacturer = models.CharField(max_length=200, blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.quantity_accepted > 0 and self.po_item.medicine:
            medicine = self.po_item.medicine
            medicine.quantity_in_stock += self.quantity_accepted
            if self.batch_number:
                medicine.batch_number = self.batch_number
            if self.expiry_date:
                medicine.expiry_date = self.expiry_date
            medicine.save()
        PurchaseOrderItem.objects.filter(pk=self.po_item_id).update(
            quantity_received=models.F('quantity_received') + self.quantity_received
        )

    def __str__(self):
        return f"{self.po_item.item_name} — Received: {self.quantity_received}"


# ============================================================
# INSURANCE CLAIMS
# ============================================================

class ConsultationInsuranceClaim(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'), ('PAID', 'Paid'),
    )
    claim_number = models.CharField(max_length=50, unique=True, editable=False)
    patient_visit = models.ForeignKey(
        PatientVisit, on_delete=models.CASCADE, related_name='insurance_claims'
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='consultation_insurance_claims'
    )
    insurance_provider = models.ForeignKey(
        InsuranceProvider, on_delete=models.PROTECT, related_name='consultation_claims'
    )
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    service_name = models.CharField(max_length=200)
    member_number = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    claims_officer_approved = models.BooleanField(default=False)
    claims_officer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_consultation_claims',
        limit_choices_to={'user_type': 'INSURANCE'}
    )
    claims_officer_approved_at = models.DateTimeField(blank=True, null=True)
    claims_officer_comments = models.TextField(blank=True, null=True)
    rejected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rejected_consultation_claims'
    )
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    payment_confirmed = models.BooleanField(default=False)
    payment_confirmed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='confirmed_consultation_payments',
        limit_choices_to={'user_type': 'CASHIER'}
    )
    payment_confirmed_at = models.DateTimeField(blank=True, null=True)
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='submitted_consultation_claims'
    )
    insurance_payment_received = models.BooleanField(default=False)
    insurance_payment_date = models.DateTimeField(blank=True, null=True)
    insurance_payment_reference = models.CharField(max_length=200, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.claim_number:
            today = timezone.now()
            count = ConsultationInsuranceClaim.objects.filter(
                created_at__date=today.date()
            ).count() + 1
            self.claim_number = f"CONS-CLM-{today.strftime('%Y%m%d')}-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.claim_number} — {self.patient} ({self.status})"


class PharmacyInsuranceClaim(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'), ('PAID', 'Paid'),
    )
    claim_number = models.CharField(max_length=50, unique=True, editable=False)
    claim_type = models.CharField(
        max_length=20, choices=(('PRESCRIPTION', 'Prescription'), ('OTC', 'OTC'))
    )
    consultation = models.ForeignKey(
        Consultation, on_delete=models.CASCADE, null=True, blank=True,
        related_name='pharmacy_insurance_claims'
    )
    otc_sale = models.ForeignKey(
        OverTheCounterSale, on_delete=models.CASCADE, null=True, blank=True,
        related_name='insurance_claims'
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='pharmacy_insurance_claims'
    )
    insurance_provider = models.ForeignKey(
        InsuranceProvider, on_delete=models.PROTECT, related_name='pharmacy_claims'
    )
    member_number = models.CharField(max_length=100)
    member_name = models.CharField(max_length=200)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    insurance_covered = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    patient_copay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    items_breakdown = models.JSONField(help_text="List of medicines and prices")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    claims_officer_approved = models.BooleanField(default=False)
    claims_officer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_pharmacy_claims', limit_choices_to={'user_type': 'INSURANCE'}
    )
    claims_approved_at = models.DateTimeField(blank=True, null=True)
    rejected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rejected_pharmacy_claims'
    )
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    payment_confirmed = models.BooleanField(default=False)
    payment_confirmed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='confirmed_pharmacy_payments', limit_choices_to={'user_type': 'CASHIER'}
    )
    payment_confirmed_at = models.DateTimeField(blank=True, null=True)
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='submitted_pharmacy_claims'
    )
    insurance_payment_received = models.BooleanField(default=False)
    insurance_payment_date = models.DateTimeField(blank=True, null=True)
    insurance_payment_reference = models.CharField(max_length=200, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.claim_number:
            today = timezone.now()
            count = PharmacyInsuranceClaim.objects.filter(
                created_at__date=today.date()
            ).count() + 1
            self.claim_number = f"PHRM-CLM-{today.strftime('%Y%m%d')}-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.claim_number} — {self.patient} ({self.status})"


class InpatientInsuranceClaim(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'), ('SUBMITTED', 'Submitted'), ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'), ('PARTIALLY_APPROVED', 'Partially Approved'),
        ('REJECTED', 'Rejected'), ('PAID', 'Paid'),
    )
    claim_number = models.CharField(max_length=50, unique=True, editable=False)
    admission = models.OneToOneField(
        InpatientAdmission, on_delete=models.CASCADE, related_name='insurance_claim'
    )
    insurance_provider = models.ForeignKey(
        InsuranceProvider, on_delete=models.PROTECT, related_name='inpatient_claims'
    )
    member_number = models.CharField(max_length=100)
    member_name = models.CharField(max_length=200)
    total_charges = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    charges_breakdown = models.JSONField(default=dict)
    approved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    patient_copay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='DRAFT')
    claims_officer_approved = models.BooleanField(default=False)
    claims_officer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_inpatient_claims', limit_choices_to={'user_type': 'INSURANCE'}
    )
    claims_approved_at = models.DateTimeField(blank=True, null=True)
    claims_officer_comments = models.TextField(blank=True, null=True)
    rejected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rejected_inpatient_claims'
    )
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    payment_confirmed = models.BooleanField(default=False)
    payment_confirmed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='confirmed_inpatient_payments', limit_choices_to={'user_type': 'CASHIER'}
    )
    payment_confirmed_at = models.DateTimeField(blank=True, null=True)
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='submitted_inpatient_claims'
    )
    submitted_at = models.DateTimeField(blank=True, null=True)
    insurance_payment_received = models.BooleanField(default=False)
    insurance_payment_date = models.DateTimeField(blank=True, null=True)
    insurance_payment_reference = models.CharField(max_length=200, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.claim_number:
            today = timezone.now()
            count = InpatientInsuranceClaim.objects.filter(
                created_at__date=today.date()
            ).count() + 1
            self.claim_number = f"IPD-CLM-{today.strftime('%Y%m%d')}-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.claim_number} — {self.admission.patient} ({self.status})"


# ============================================================
# SHA — SOCIAL HEALTH AUTHORITY
# ============================================================

class SHAMember(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'), ('INACTIVE', 'Inactive'),
        ('SUSPENDED', 'Suspended'), ('PENDING', 'Pending'),
    )
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='sha_member')
    sha_number = models.CharField(max_length=50, unique=True, db_index=True)
    package_name = models.CharField(max_length=200, default='Standard Package')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    enrollment_date = models.DateField(default=timezone.now)
    expiry_date = models.DateField(blank=True, null=True)
    annual_limit = models.DecimalField(max_digits=12, decimal_places=2, default=500000)
    used_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    last_verified = models.DateTimeField(blank=True, null=True)
    verification_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_valid(self):
        if self.status != 'ACTIVE':
            return False
        if self.expiry_date and self.expiry_date < timezone.now().date():
            return False
        return True

    @property
    def available_balance(self):
        return self.annual_limit - self.used_amount

    def __str__(self):
        return f"{self.sha_number} — {self.patient}"


class SHAClaim(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'), ('SUBMITTED', 'Submitted'), ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'), ('PARTIALLY_APPROVED', 'Partially Approved'),
        ('REJECTED', 'Rejected'), ('PAID', 'Paid'),
    )
    CLAIM_TYPE_CHOICES = (
        ('OUTPATIENT', 'Outpatient'), ('INPATIENT', 'Inpatient'),
        ('EMERGENCY', 'Emergency'), ('PHARMACY', 'Pharmacy'),
        ('LABORATORY', 'Laboratory'), ('RADIOLOGY', 'Radiology'),
    )
    claim_number = models.CharField(max_length=50, unique=True, editable=False)
    sha_reference = models.CharField(max_length=100, blank=True, null=True)
    sha_member = models.ForeignKey(SHAMember, on_delete=models.CASCADE, related_name='claims')
    consultation = models.ForeignKey(
        Consultation, on_delete=models.CASCADE, related_name='sha_claims',
        blank=True, null=True
    )
    claim_type = models.CharField(
        max_length=20, choices=CLAIM_TYPE_CHOICES, default='OUTPATIENT'
    )
    service_date = models.DateField(default=timezone.now)
    claimed_amount = models.DecimalField(max_digits=10, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    patient_copay = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='DRAFT')
    submitted_at = models.DateTimeField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    submission_response = models.JSONField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='sha_claims_submitted'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.claim_number:
            today = timezone.now()
            random_str = uuid.uuid4().hex[:6].upper()
            self.claim_number = f"SHA-{today.strftime('%Y%m%d')}-{random_str}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.claim_number} — {self.sha_member.patient} ({self.status})"


# ============================================================
# PAYMENT & BILLING
# ============================================================

class PaymentAuditLog(models.Model):
    TRANSACTION_TYPE_CHOICES = (
        ('CONSULTATION_PAYMENT', 'Consultation Payment'),
        ('MEDICINE_SALE', 'Medicine Sale'), ('LAB_PAYMENT', 'Lab Payment'),
        ('REFUND', 'Refund'), ('ADJUSTMENT', 'Adjustment'),
        ('EMERGENCY_PAYMENT', 'Emergency Payment'),
        ('INPATIENT_PAYMENT', 'Inpatient Payment'),
    )
    STATUS_CHOICES = (
        ('SUCCESS', 'Success'), ('FAILED', 'Failed'),
        ('PENDING', 'Pending'), ('REVERSED', 'Reversed'),
    )
    transaction_id = models.CharField(max_length=100, unique=True, db_index=True)
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUCCESS')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20)
    mpesa_code = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    mpesa_phone = models.CharField(max_length=15, blank=True, null=True)
    medicine_sale = models.ForeignKey(
        MedicineSale, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_logs'
    )
    consultation = models.ForeignKey(
        Consultation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payment_audits'
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payment_audits'
    )
    cost_breakdown = models.JSONField(blank=True, null=True)
    qr_code = models.ImageField(upload_to='payment_qrcodes/', blank=True, null=True)
    qr_code_data = models.JSONField(blank=True, null=True)
    processed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='processed_payments'
    )
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_id} — KSh {self.amount} ({self.status})"


class CashierSession(models.Model):
    SESSION_STATUS_CHOICES = (
        ('OPEN', 'Open'), ('CLOSED', 'Closed'), ('RECONCILED', 'Reconciled'),
    )
    session_id = models.CharField(max_length=50, unique=True, editable=False)
    cashier = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='cashier_sessions'
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=SESSION_STATUS_CHOICES, default='OPEN')
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_cash = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, blank=True, null=True
    )
    cash_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cash_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_mpesa_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reconciled_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reconciled_sessions'
    )
    reconciled_at = models.DateTimeField(blank=True, null=True)
    reconciliation_notes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.session_id:
            self.session_id = f"CS-{self.cashier_id}-{timezone.now().strftime('%Y%m%d%H%M')}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.session_id} — {self.cashier.get_full_name()} ({self.status})"


class MPesaDuplicateCheck(models.Model):
    mpesa_code = models.CharField(max_length=50, unique=True, db_index=True)
    medicine_sale = models.ForeignKey(
        MedicineSale, on_delete=models.CASCADE, related_name='mpesa_checks'
    )
    used_at = models.DateTimeField(auto_now_add=True)
    used_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.mpesa_code} — {self.used_at}"


# ============================================================
# eTIMS — KRA ELECTRONIC TAX INVOICE MANAGEMENT SYSTEM
# ============================================================

class eTIMSConfiguration(models.Model):
    """
    Singleton model — only one active eTIMS configuration per installation.
    Medical services in Kenya are VAT-exempt by default (Finance Act).
    """
    tin_number = models.CharField(max_length=20, unique=True)
    business_name = models.CharField(max_length=200)
    branch_name = models.CharField(max_length=200)
    device_serial_number = models.CharField(max_length=100, blank=True, null=True)
    api_base_url = models.URLField(blank=True, null=True)
    api_key = models.CharField(max_length=500, blank=True, null=True)
    is_active = models.BooleanField(default=False)
    test_mode = models.BooleanField(default=True)
    auto_submit_invoices = models.BooleanField(default=False)
    data_anonymization_enabled = models.BooleanField(default=True)
    county = models.CharField(max_length=100, blank=True)
    pharmacy_board_license = models.CharField(max_length=100, blank=True)
    last_sync_date = models.DateTimeField(blank=True, null=True)
    last_sync_status = models.CharField(max_length=200, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"eTIMS — {self.business_name} (TIN: {self.tin_number})"

    def save(self, *args, **kwargs):
        if not self.pk and eTIMSConfiguration.objects.exists():
            raise ValueError("Only one eTIMS configuration is allowed.")
        super().save(*args, **kwargs)


class eTIMSInvoice(models.Model):
    INVOICE_TYPE_CHOICES = (
        ('CONSULTATION', 'Consultation'), ('PHARMACY', 'Pharmacy'),
        ('LABORATORY', 'Laboratory'), ('INPATIENT', 'Inpatient'), ('OTHER', 'Other'),
    )
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'), ('PENDING', 'Pending'), ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('CANCELLED', 'Cancelled'),
    )
    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    etims_invoice_number = models.CharField(
        max_length=100, blank=True, null=True, unique=True
    )
    invoice_type = models.CharField(max_length=20, choices=INVOICE_TYPE_CHOICES)
    invoice_date = models.DateTimeField(default=timezone.now)
    customer_name = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=15, blank=True, null=True)
    customer_tin = models.CharField(max_length=20, blank=True, null=True)
    patient = models.ForeignKey(
        Patient, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='etims_invoices'
    )
    patient_visit = models.ForeignKey(
        PatientVisit, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='etims_invoices'
    )
    otc_sale = models.ForeignKey(
        OverTheCounterSale, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='etims_invoices'
    )
    lab_order = models.ForeignKey(
        LabOrder, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='etims_invoices'
    )
    inpatient_admission = models.ForeignKey(
        InpatientAdmission, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='etims_invoices'
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=16.00)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Medical services in Kenya are VAT-exempt under the Finance Act
    is_exempt = models.BooleanField(default=True)
    exemption_reason = models.CharField(max_length=200, blank=True)
    payment_method = models.CharField(max_length=20, choices=(
        ('CASH', 'Cash'), ('MPESA', 'M-Pesa'), ('CARD', 'Card'),
        ('BANK', 'Bank'), ('INSURANCE', 'Insurance'), ('OTHER', 'Other'),
    ))
    mpesa_code = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    submitted_to_etims = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(blank=True, null=True)
    etims_response = models.JSONField(blank=True, null=True)
    etims_qr_code = models.TextField(blank=True, null=True)
    etims_verification_url = models.URLField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=(
        ('PAID', 'Paid'), ('PARTIAL', 'Partial'), ('PENDING', 'Pending'),
        ('INSURANCE_PENDING', 'Insurance Pending'), ('WAIVED', 'Waived'),
    ), default='PENDING')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='etims_invoices_created'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            today = timezone.now()
            count = eTIMSInvoice.objects.filter(created_at__date=today.date()).count() + 1
            self.invoice_number = f"INV-{today.strftime('%Y%m%d')}-{count:06d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} — {self.customer_name} (KSh {self.total_amount})"


class eTIMSInvoiceItem(models.Model):
    TAX_TYPE_CHOICES = (
        ('A', 'VAT Standard 16%'),
        ('B', 'VAT Exempt'),      # Default for medical services
        ('C', 'Zero Rated'),
        ('D', 'Special Rate'),
    )
    invoice = models.ForeignKey(
        eTIMSInvoice, on_delete=models.CASCADE, related_name='items'
    )
    item_sequence = models.IntegerField()
    item_code = models.CharField(max_length=100)
    item_name = models.CharField(max_length=200)
    tax_type = models.CharField(max_length=1, choices=TAX_TYPE_CHOICES, default='B')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_of_measure = models.CharField(max_length=50, default='Units')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['invoice', 'item_sequence']

    def save(self, *args, **kwargs):
        subtotal = (self.quantity * self.unit_price) - self.discount_amount
        if self.tax_type == 'A':
            self.taxable_amount = subtotal
            self.tax_amount = (subtotal * Decimal('16')) / Decimal('100')
        elif self.tax_type == 'B':
            self.taxable_amount = Decimal('0')
            self.tax_amount = Decimal('0')
        elif self.tax_type == 'C':
            self.taxable_amount = subtotal
            self.tax_amount = Decimal('0')
        self.total_amount = subtotal + self.tax_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} — {self.quantity}x KSh {self.unit_price}"


# ============================================================
# HR — ATTENDANCE & LEAVE
# ============================================================

class HospitalWiFiNetwork(models.Model):
    network_name = models.CharField(max_length=200)
    bssid = models.CharField(max_length=17, blank=True, null=True)
    location = models.CharField(max_length=200)
    ip_range = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.network_name} — {self.location}"


class AttendanceQRCode(models.Model):
    QR_TYPE_CHOICES = (('CHECK_IN', 'Check In'), ('CHECK_OUT', 'Check Out'))
    qr_code = models.CharField(max_length=100, unique=True, editable=False)
    qr_type = models.CharField(max_length=10, choices=QR_TYPE_CHOICES)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    attendance_date = models.DateField()
    location = models.CharField(max_length=200)
    generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='generated_qr_codes', limit_choices_to={'user_type': 'HR'}
    )
    is_active = models.BooleanField(default=True)
    scan_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.qr_code:
            self.qr_code = f"ATT-{secrets.token_urlsafe(32)}"
        super().save(*args, **kwargs)

    def is_valid(self):
        now = timezone.now()
        return self.is_active and self.valid_from <= now <= self.valid_until

    def __str__(self):
        return f"{self.get_qr_type_display()} — {self.attendance_date}"


class Attendance(models.Model):
    STATUS_CHOICES = (
        ('PRESENT', 'Present'), ('ABSENT', 'Absent'), ('LATE', 'Late'),
        ('HALF_DAY', 'Half Day'), ('ON_LEAVE', 'On Leave'), ('HOLIDAY', 'Holiday'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ABSENT')
    check_in_time = models.DateTimeField(blank=True, null=True)
    check_in_qr_code = models.ForeignKey(
        AttendanceQRCode, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='check_in_scans'
    )
    check_in_location = models.CharField(max_length=200, blank=True, null=True)
    check_in_ip = models.GenericIPAddressField(blank=True, null=True)
    check_in_wifi_network = models.ForeignKey(
        HospitalWiFiNetwork, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='check_in_records'
    )
    check_out_time = models.DateTimeField(blank=True, null=True)
    check_out_qr_code = models.ForeignKey(
        AttendanceQRCode, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='check_out_scans'
    )
    check_out_ip = models.GenericIPAddressField(blank=True, null=True)
    check_out_wifi_network = models.ForeignKey(
        HospitalWiFiNetwork, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='check_out_records'
    )
    total_hours = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, blank=True, null=True
    )
    is_manual = models.BooleanField(default=False)
    manual_reason = models.TextField(blank=True, null=True)
    manual_approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_manual_attendance'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date', 'user']

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.date} ({self.get_status_display()})"

    def calculate_hours(self):
        if self.check_in_time and self.check_out_time:
            delta = self.check_out_time - self.check_in_time
            self.total_hours = round(delta.total_seconds() / 3600, 2)
            self.save(update_fields=['total_hours'])


class LeaveType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    days_allowed_per_year = models.IntegerField(default=0)
    requires_attachment = models.BooleanField(default=False)
    is_paid = models.BooleanField(default=True)
    requires_hr_approval = models.BooleanField(default=True)
    minimum_notice_days = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class LeaveApplication(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('SUPERVISOR_APPROVED', 'Supervisor Approved'),
        ('HR_APPROVED', 'HR Approved'), ('APPROVED', 'Fully Approved'),
        ('REJECTED', 'Rejected'), ('CANCELLED', 'Cancelled'),
    )
    application_number = models.CharField(max_length=50, unique=True, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leave_applications')
    leave_type = models.ForeignKey(
        LeaveType, on_delete=models.PROTECT, related_name='applications'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    total_days = models.IntegerField(default=0)
    reason = models.TextField()
    attachment = models.FileField(upload_to='leave_applications/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    supervisor_approved = models.BooleanField(default=False)
    supervisor_approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='supervised_leave_approvals'
    )
    supervisor_approved_at = models.DateTimeField(blank=True, null=True)
    supervisor_comments = models.TextField(blank=True, null=True)
    hr_approved = models.BooleanField(default=False)
    hr_approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='hr_leave_approvals', limit_choices_to={'user_type': 'HR'}
    )
    hr_approved_at = models.DateTimeField(blank=True, null=True)
    hr_comments = models.TextField(blank=True, null=True)
    rejected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rejected_leave_applications'
    )
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.application_number:
            today = timezone.now()
            count = LeaveApplication.objects.filter(created_at__date=today.date()).count() + 1
            self.application_number = f"LEAVE-{today.strftime('%Y%m%d')}-{count:04d}"
        if self.start_date and self.end_date:
            self.total_days = (self.end_date - self.start_date).days + 1
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.application_number} — {self.user.get_full_name()} ({self.leave_type.name})"


# ============================================================
# ASSETS
# ============================================================

class HospitalAsset(models.Model):
    ASSET_CATEGORY_CHOICES = (
        ('MEDICAL_EQUIPMENT', 'Medical Equipment'),
        ('LABORATORY_EQUIPMENT', 'Laboratory Equipment'),
        ('RADIOLOGY_EQUIPMENT', 'Radiology Equipment'),
        ('SURGICAL_EQUIPMENT', 'Surgical Equipment'),
        ('IT_EQUIPMENT', 'IT Equipment'),
        ('FURNITURE', 'Furniture'),
        ('VEHICLE', 'Vehicle'),
        ('GENERATOR', 'Generator'),
        ('HVAC', 'HVAC'),
        ('OTHER', 'Other'),
    )
    ASSET_STATUS_CHOICES = (
        ('OPERATIONAL', 'Operational'), ('UNDER_MAINTENANCE', 'Under Maintenance'),
        ('OUT_OF_SERVICE', 'Out of Service'), ('RETIRED', 'Retired'),
    )
    CONDITION_CHOICES = (
        ('EXCELLENT', 'Excellent'), ('GOOD', 'Good'), ('FAIR', 'Fair'),
        ('POOR', 'Poor'), ('CRITICAL', 'Critical'),
    )
    asset_id = models.CharField(max_length=50, unique=True)
    asset_name = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=ASSET_CATEGORY_CHOICES)
    description = models.TextField(blank=True, null=True)
    manufacturer = models.CharField(max_length=200, blank=True, null=True)
    model_number = models.CharField(max_length=100, blank=True, null=True)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    purchase_date = models.DateField(blank=True, null=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    supplier = models.CharField(max_length=200, blank=True, null=True)
    warranty_expiry = models.DateField(blank=True, null=True)
    location = models.CharField(max_length=200)
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_assets'
    )
    status = models.CharField(
        max_length=20, choices=ASSET_STATUS_CHOICES, default='OPERATIONAL'
    )
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='GOOD')
    requires_maintenance = models.BooleanField(default=False)
    last_maintenance_date = models.DateField(blank=True, null=True)
    next_maintenance_date = models.DateField(blank=True, null=True)
    maintenance_notes = models.TextField(blank=True, null=True)
    requires_calibration = models.BooleanField(default=False)
    last_calibration_date = models.DateField(blank=True, null=True)
    next_calibration_date = models.DateField(blank=True, null=True)
    last_audit_date = models.DateField(blank=True, null=True)
    next_audit_date = models.DateField(blank=True, null=True)
    needs_replacement = models.BooleanField(default=False)
    replacement_reason = models.TextField(blank=True, null=True)
    estimated_replacement_cost = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )
    asset_image = models.ImageField(upload_to='assets/', blank=True, null=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='assets_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.asset_id} — {self.asset_name}"

    @property
    def is_maintenance_overdue(self):
        return (
            self.next_maintenance_date is not None and
            self.next_maintenance_date < timezone.now().date()
        )


class AssetMaintenanceLog(models.Model):
    MAINTENANCE_TYPE_CHOICES = (
        ('PREVENTIVE', 'Preventive'), ('CORRECTIVE', 'Corrective'),
        ('CALIBRATION', 'Calibration'), ('INSPECTION', 'Inspection'),
        ('REPAIR', 'Repair'), ('REPLACEMENT', 'Part Replacement'),
    )
    asset = models.ForeignKey(
        HospitalAsset, on_delete=models.CASCADE, related_name='maintenance_logs'
    )
    maintenance_type = models.CharField(max_length=20, choices=MAINTENANCE_TYPE_CHOICES)
    maintenance_date = models.DateField()
    performed_by = models.CharField(max_length=200)
    service_provider = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField()
    parts_replaced = models.TextField(blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    downtime_hours = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    is_completed = models.BooleanField(default=True)
    invoice_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    logged_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='maintenance_logs_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-maintenance_date']

    def __str__(self):
        return (
            f"{self.asset.asset_id} — "
            f"{self.get_maintenance_type_display()} on {self.maintenance_date}"
        )


# ============================================================
# AUDIT, SECURITY & NOTIFICATIONS
# ============================================================

class AuditLog(models.Model):
    ACTION_TYPES = (
        ('create', 'Create'), ('update', 'Update'), ('delete', 'Delete'),
        ('view', 'View'), ('approve', 'Approve'), ('reject', 'Reject'),
        ('login', 'Login'), ('logout', 'Logout'), ('export', 'Export'), ('print', 'Print'),
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    table_affected = models.CharField(max_length=100)
    record_id = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)
    old_values = models.JSONField(blank=True, null=True)
    new_values = models.JSONField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"


class SecurityThreat(models.Model):
    THREAT_TYPES = (
        ('sql_injection', 'SQL Injection'), ('xss', 'XSS'),
        ('path_traversal', 'Path Traversal'), ('brute_force', 'Brute Force'),
        ('suspicious_agent', 'Suspicious Agent'), ('rate_limit', 'Rate Limit'),
        ('other', 'Other'),
    )
    SEVERITY_LEVELS = (
        ('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')
    )
    threat_type = models.CharField(max_length=30, choices=THREAT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='medium')
    ip_address = models.GenericIPAddressField()
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='security_threats'
    )
    description = models.TextField()
    request_path = models.CharField(max_length=500)
    request_method = models.CharField(max_length=10)
    user_agent = models.TextField(blank=True, null=True)
    blocked = models.BooleanField(default=False)
    resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resolved_threats'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True, null=True)
    detected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-detected_at']

    def __str__(self):
        return f"{self.get_threat_type_display()} — {self.severity} ({self.detected_at})"


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('APPOINTMENT', 'Appointment'), ('LOW_STOCK', 'Low Stock'),
        ('FOLLOW_UP', 'Follow Up'), ('GENERAL', 'General'),
        ('QUEUE_CALL', 'Queue Call'), ('CONSULTATION', 'Consultation'),
        ('LAB_RESULT', 'Lab Result'), ('PRESCRIPTION', 'Prescription'),
        ('CRITICAL_VALUE', 'Critical Lab Value'), ('ADMISSION', 'Admission'),
    )
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='received_notifications'
    )
    sender = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sent_notifications'
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, null=True, blank=True,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200, blank=True, null=True)
    message = models.TextField()
    related_object_id = models.PositiveIntegerField(blank=True, null=True)
    related_object_type = models.CharField(max_length=50, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    is_urgent = models.BooleanField(default=False)
    action_url = models.CharField(max_length=500, blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def mark_as_read(self):
        self.is_read = True
        self.save()

    def __str__(self):
        return f"{self.notification_type} → {self.recipient.get_full_name()}"


class Conversation(models.Model):
    participant1 = models.ForeignKey(
        User, related_name='conversations_as_participant1', on_delete=models.CASCADE
    )
    participant2 = models.ForeignKey(
        User, related_name='conversations_as_participant2', on_delete=models.CASCADE
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('participant1', 'participant2', 'patient')

    def __str__(self):
        return f"Chat: {self.participant1} ↔ {self.participant2}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, related_name='messages', on_delete=models.CASCADE
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender} @ {self.timestamp}"