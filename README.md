# AFYA1 HMIS

> **South B Hospital — Health Management Information System**
> A full-stack hospital management platform supporting role-based clinical operations,
> pharmacy, laboratory, inpatient care, emergency, maternity, insurance, SHA, eTIMS, HR, and assets.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Roles & Access](#roles--access)
- [Project Structure](#project-structure)
- [Backend Architecture](#backend-architecture)
  - [models.py](#modelspy)
  - [serializers.py](#serializerspy)
  - [views.py](#viewspy)
  - [urls.py](#urlspy)
- [Frontend Architecture](#frontend-architecture)
  - [index.html](#indexhtml)
  - [main.jsx](#mainjsx)
  - [App.jsx](#appjsx)
  - [AuthContext.jsx](#authcontextjsx)
  - [services/api.js](#servicesapijs)
  - [Pages](#pages)
  - [Components](#components)
  - [styles/main.css](#stylesmain-css)
- [API Endpoints Reference](#api-endpoints-reference)
- [Authentication Flow](#authentication-flow)
- [Clinical Workflow](#clinical-workflow)
- [SHA & eTIMS Integration](#sha--etims-integration)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)

---

## Overview

AFYA1 HMIS is a comprehensive hospital management information system for South B Hospital (Level 5).
It covers the full patient journey and hospital operations:

- **Role-based access control** — 11 roles with dedicated dashboards and permissions
- **Full OPD workflow** — Registration → Triage → Queue → Consultation → Pharmacy/Lab
- **Inpatient management** — Wards, beds, admissions, daily charges, vitals, medicine requests
- **Emergency & Maternity** — Dedicated workflows with rapid triage and MCH support
- **Pharmacy** — Prescription dispensing, OTC sales, stock management
- **Laboratory & Imaging** — Orders, results, DICOM imaging support
- **Insurance & SHA** — Claims processing for NHIF/private insurers and SHA (Social Health Authority)
- **eTIMS** — Kenya Revenue Authority eTIMS invoice submission
- **Procurement** — PR → PO → GRN pipeline with multi-level approval
- **HR** — QR-code attendance, leave management
- **Assets** — Equipment register, maintenance logs

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | Django 4.2+ |
| API | Django REST Framework (DRF) |
| Auth | JWT via `djangorestframework-simplejwt` |
| Database | PostgreSQL 15+ |
| File Storage | Django media (local) / S3 (prod) |
| CORS | `django-cors-headers` |
| Filtering | `django-filter` |
| Environment | `python-decouple` |
| Background Tasks | `celery` + Redis (optional, for eTIMS/SHA async) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| HTTP Client | Axios |
| State | React Context API (single AuthContext) |
| Styling | Plain CSS (`styles/main.css`) |
| Icons | Lucide React |
| Charts | Recharts |
| Notifications | React Hot Toast |

---

## Roles & Access

| Role Code | Display Name | Key Permissions |
|-----------|-------------|-----------------|
| `ADMIN` | Administrator | Full CRUD, user management, system config |
| `DOCTOR` | Doctor | Consultations, diagnoses, prescriptions, lab orders |
| `NURSE` | Nurse | Triage, vitals, inpatient nursing notes, MCH |
| `RECEPTIONIST` | Receptionist | Patient registration, visit creation, appointments |
| `PHARMACIST` | Pharmacist | Dispense prescriptions, OTC sales, stock view |
| `LAB_TECH` | Lab Technician | Process lab orders, enter results |
| `CASHIER` | Cashier | Payments, cashier sessions, receipts |
| `PROCUREMENT` | Procurement Officer | PRs, POs, GRNs, supplier management |
| `ACCOUNTANT` | Accountant | Finance reports, fee accounts, eTIMS invoices |
| `INSURANCE` | Claims Officer | Insurance claims approval/rejection |
| `HR` | HR Officer | Attendance QR codes, leave management, staff records |

---

## Project Structure

```
afya1-hmis/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   ├── afya1/                        # Django Project Root
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── core/                         # Single Core App
│       ├── __init__.py
│       ├── admin.py
│       ├── apps.py
│       ├── models.py                 # ALL models
│       ├── serializers.py            # ALL serializers
│       ├── views.py                  # ALL viewsets & API views
│       ├── urls.py                   # App-level URL patterns
│       ├── permissions.py            # Custom DRF permission classes
│       ├── filters.py                # django-filter FilterSets
│       ├── signals.py                # Django signals
│       └── utils.py                  # Helpers: billing, SHA, eTIMS helpers
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── context/
        │   └── AuthContext.jsx       # Single context: auth state + helpers
        ├── services/
        │   └── api.js                # Axios instance + ALL API call functions
        ├── components/
        │   ├── Navbar.jsx            # Top nav (role-aware)
        │   └── Sidebar.jsx           # Left sidebar (role-based links)
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx
        │   ├── admin/
        │   ├── receptionist/
        │   ├── nurse/
        │   ├── doctor/
        │   ├── pharmacy/
        │   ├── laboratory/
        │   ├── cashier/
        │   ├── insurance/
        │   ├── procurement/
        │   ├── hr/
        │   └── shared/
        └── styles/
            └── main.css              # Global styles, CSS variables
```

---

## Backend Architecture

### `models.py`

All models in `core/models.py`. Full inventory:

#### Auth & Users
```
User (AbstractUser)
├── user_type: CHOICES [ADMIN, DOCTOR, NURSE, RECEPTIONIST, PHARMACIST,
│                       LAB_TECH, CASHIER, PROCUREMENT, ACCOUNTANT, INSURANCE, HR]
├── phone_number, specialization, license_number, is_active

LoginAttempt       — ip, timestamp, success, user_agent
AccountLock        — user (O2O→User), failed_attempts, unlock_time, is_locked
TwoFactorCode      — user, code (XXX-XXX), expires_at, used, session_key
UserSession        — user, session_key, ip, login_time, last_activity, device info
```

#### Patients & Clinical Staff
```
Patient
├── first_name, last_name, date_of_birth, gender
├── id_number, phone_number, email, address
├── blood_type, allergies, chronic_conditions

Doctor
├── user (O2O→User), first_name, last_name, specialization
├── license_number, license_expiry, department, is_active

Nurse
├── user (O2O→User), nurse_type, license_number
├── department, is_charge_nurse, BCLS/ACLS certs
```

#### Facility & Lookup
```
InsuranceProvider  — name
SpecializedService — name, consultation_fee
Disease            — name, icd_code
ClinicSettings     — clinic_name, logo, address, working_hours
```

#### Visits, Triage & Queue
```
TriageCategory     — priority_level (1-5), color_code, max_wait_time

PatientVisit
├── visit_number (V{YYYYMMDD}{seq}), patient (FK→Patient)
├── visit_type: [EMERGENCY, OUTPATIENT, INPATIENT, FOLLOW_UP,
│               REFERRAL, ANTENATAL, IMMUNIZATION, GENERAL]
├── status: [REGISTERED, TRIAGED, WAITING, IN_CONSULTATION,
│            IN_TREATMENT, COMPLETED, ADMITTED, REFERRED, CANCELLED]
├── assigned_doctor (FK→Doctor), assigned_nurse (FK→Nurse)
├── insurance_provider (FK→InsuranceProvider)

TriageAssessment
├── visit (O2O→PatientVisit), category (FK→TriageCategory)
├── vitals: temp, BP, pulse, RR, SpO2, weight, height
├── consciousness_level, breathing_status, pain_score (0-10)
├── requires_immediate_attention, assessed_by (FK→Nurse)
├── computed property: bmi

QueueManagement
├── visit (FK→PatientVisit)
├── department: [TRIAGE, CONSULTATION, LABORATORY, PHARMACY,
│               RADIOLOGY, PROCEDURE, ADMISSION]
├── queue_number, priority_override
├── joined_queue, called_time, service_start, service_end
├── is_active, is_serving, is_completed, serving_staff (FK→User)
```

#### Consultations & Diagnoses
```
Appointment
├── patient (FK→Patient), doctor (FK→User)
├── scheduled_time, status: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW]

Consultation
├── appointment (O2O→Appointment)
├── diagnosis, diseases (M2M→Disease)
├── consultation_code (R{4alphanum}, unique)
├── follow_up_date
├── on save: auto-creates PatientMedicalHistory

PatientMedicalHistory
├── patient (FK→Patient), consultation (FK→Consultation)
├── record_type, description, recorded_by (FK→User)

ICD10Category      — chapter_number, code_range, category_name
ICD10Code
├── code (regex validated A##.#), category (FK→ICD10Category)
├── short_description, local_name
├── is_notifiable, requires_isolation
├── nhif_eligible, nhif_package_code
├── usage_count (auto-incremented on diagnosis save)

ConsultationDiagnosis
├── consultation (FK→Consultation), icd10_code (FK→ICD10Code)
├── diagnosis_type: [PRIMARY, SECONDARY, DIFFERENTIAL, PROVISIONAL, FINAL]
├── certainty: [CONFIRMED, SUSPECTED, RULED_OUT]
├── treatment_plan, submitted_to_nhif, nhif_claim_number
```

#### Pharmacy & Medicines
```
MedicineCategory   — name, description

Medicine
├── name, category (FK→MedicineCategory), manufacturer
├── unit_type: [TABLET, CAPSULE, SYRUP_ML, INJECTION, CREAM_TUBE, DROPS, SACHET, SUPPOSITORY]
├── units_per_pack, pack_name, quantity_in_stock, reorder_level
├── cost_per_unit_cash, price_per_unit_cash, price_per_unit_insurance
├── expiry_date, batch_number
├── property: is_low_stock
├── method: calculate_price(quantity, is_insured)

StockMovement
├── medicine (FK→Medicine)
├── movement_type: [PURCHASE, SALE, ADJUSTMENT, RETURN, DAMAGE, TRANSFER]
├── quantity, previous_quantity, new_quantity

Prescription
├── consultation (FK→Consultation), medicine (FK→Medicine)
├── quantity, dosage_text, duration, is_insured
├── is_dispensed, dispensed_by (FK→User)
├── method: dispense(user) — deducts stock, creates StockMovement

MedicineSale       — patient, payment_method (CASH/MPESA/INSURANCE/CREDIT)
SoldMedicine       — sale (FK→MedicineSale), medicine, quantity, unit_price

OverTheCounterSale
├── sale_id (OTC-{YYYYMMDD}-{hex}), customer_name
├── payment_status, cashier (FK→User), is_dispensed

OverTheCounterSaleItem
├── sale (FK→OverTheCounterSale), medicine, quantity, unit_price
├── subtotal (auto-computed on save)
```

#### Laboratory & Imaging
```
LabTestCategory    — name, category_type: [HEMATOLOGY, BIOCHEMISTRY, MICROBIOLOGY,
                     SEROLOGY, PARASITOLOGY, HISTOPATHOLOGY, RADIOLOGY, ULTRASOUND,
                     XRAY, CT_SCAN, MRI, OTHER]

LabTest
├── test_code (unique), test_name, category (FK→LabTestCategory)
├── sample_type: [BLOOD, URINE, STOOL, SPUTUM, CSF, SWAB, TISSUE, NONE, OTHER]
├── cost, turnaround_time, nhif_covered, sha_covered

LabOrder
├── order_number (LAB-{YYYYMMDD}-{seq}), patient (FK→Patient)
├── consultation (FK→Consultation), ordered_by (FK→User[DOCTOR])
├── priority: [ROUTINE, URGENT, EMERGENCY, STAT]
├── status: [PENDING, SAMPLE_COLLECTED, IN_PROGRESS, COMPLETED, REPORTED, CANCELLED]
├── assigned_to (FK→User[LAB_TECH]), total_cost, paid

LabOrderItem
├── lab_order (FK→LabOrder), test (FK→LabTest)
├── sample_id, status, result_value, is_abnormal
├── performed_by (FK→User), verified_by (FK→User)

LabResult
├── lab_order (O2O→LabOrder)
├── summary, interpretation, is_critical
├── critical_value_notified, result_document
├── result_by (FK→User[LAB_TECH]), verified_by (FK→User)
├── patient_notified, result_released_to_patient

ImagingStudy
├── lab_order (FK→LabOrder), consultation (FK→Consultation), patient (FK→Patient)
├── modality: [XRAY, CT, MRI, ULTRASOUND, MAMMOGRAPHY, FLUOROSCOPY, ANGIOGRAPHY, OTHER]
├── body_part, clinical_indication, findings, impression
├── image_1/2/3, dicom_file
├── performed_by (FK→User), reported_by (FK→User)
```

#### Inpatient — Wards, Beds, Admissions
```
Ward
├── ward_code, ward_name
├── ward_type: [GENERAL, PRIVATE, ICU, HDU, MATERNITY, PEDIATRIC,
│              SURGICAL, MEDICAL, ISOLATION, EMERGENCY]
├── nurse_in_charge (FK→Nurse), has_oxygen, has_monitoring
├── property: occupied_beds_count, available_beds_count

Bed
├── bed_number, ward (FK→Ward)
├── bed_type: [STANDARD, ICU, ELECTRIC, PEDIATRIC, MATERNITY, ISOLATION]
├── status: [AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE, CLEANING, OUT_OF_SERVICE]
├── has_oxygen, has_monitor, has_ventilator, daily_rate
├── current_admission (FK→InpatientAdmission)
├── method: is_available()

InpatientAdmission
├── admission_number (IPD-{YYYYMMDD}-{seq}), patient (FK→Patient)
├── bed (FK→Bed), admission_type: [EMERGENCY, ELECTIVE, DIRECT, TRANSFER, OBSERVATION]
├── status: [ACTIVE, DISCHARGED, TRANSFERRED, ABSCONDED, DECEASED]
├── admitting_doctor (FK→Doctor), attending_doctor (FK→Doctor)
├── primary_nurse (FK→Nurse)
├── icd10_codes (M2M→ICD10Code)
├── is_insured, insurance_company, insurance_policy_number
├── deposit_amount, total_charges (auto-updated), amount_paid
├── properties: length_of_stay, outstanding_balance
├── method: discharge(discharged_by, summary, diagnosis)
├── on save (new): auto-sets Bed status to OCCUPIED

InpatientDailyCharge
├── admission (FK→InpatientAdmission), charge_date
├── charge_type: [BED, NURSING, DOCTOR_VISIT, PROCEDURE, MEDICINE,
│               LAB_TEST, IMAGING, SURGERY, OXYGEN, MONITORING, MEALS, OTHER]
├── quantity, unit_price, total_amount (auto-computed)
├── on save: updates InpatientAdmission.total_charges

InpatientVitals
├── admission (FK→InpatientAdmission)
├── vitals: temp, BP, pulse, RR, SpO2, weight, pain_score
├── recorded_by (FK→Nurse)

InpatientMedicineRequest
├── request_number (MR-{YYYYMMDD}-{seq}), admission (FK→InpatientAdmission)
├── medicine (FK→Medicine), quantity_requested
├── priority: [ROUTINE, URGENT, EMERGENCY STAT]
├── status: [PENDING, APPROVED, DISPENSED, REJECTED, CANCELLED]
├── requested_by (FK→Nurse), approved_by (FK→User), dispensed_by (FK→User)
```

#### Emergency
```
EmergencyBed       — bed_number, location, status, has_oxygen/monitor/suction

EmergencyVisit
├── visit (O2O→PatientVisit)
├── triage_level: [RED, ORANGE, YELLOW, GREEN, BLUE]
├── arrival_mode: [AMBULANCE, POLICE, PRIVATE, WALK_IN, CARRIED]
├── injury_type: [RTA, ASSAULT, FALL, BURN, POISONING, MEDICAL, OBSTETRIC, OTHER]
├── is_conscious, is_breathing, has_pulse, GCS
├── needs_resuscitation, needs_oxygen, needs_surgery
├── police_case, ob_number
├── treatment_status: [IN_EMERGENCY, STABILIZED, READY_FOR_ADMISSION,
│                     ADMITTED, DISCHARGED, REFERRED, DECEASED]
├── emergency_bed (FK→EmergencyBed)
├── transferred_to_admission (FK→InpatientAdmission)
├── property: monitoring_hours

EmergencyCharge    — emergency_visit, charge_type, quantity, unit_price, total
EmergencyPayment   — emergency_visit, amount, payment_method (CASH/MPESA/CARD/INSURANCE/SHA)
```

#### Maternity & MCH
```
MaternityVisit
├── visit (O2O→PatientVisit)
├── visit_purpose: [LABOR, ANTENATAL, POSTNATAL, EMERGENCY]
├── gravida, para, abortion, gestational_age_weeks, EDD
├── is_in_labor, cervical_dilation, fetal_heart_rate
├── is_high_risk, needs_csection, fetal_distress
├── auto_admission (FK→InpatientAdmission)

MCHVisit
├── visit (O2O→PatientVisit)
├── visit_type: [IMMUNIZATION, GROWTH_MONITORING, SICK_CHILD, NUTRITION, DEVELOPMENTAL, FOLLOW_UP]
├── child_age_months (0-72), weight, height, temperature
├── immunization_due, vaccines_to_administer
├── has_danger_signs, needs_doctor_consultation
├── mothers_name, mothers_phone
```

#### Procurement
```
Supplier
├── supplier_code (SUP-{TYPE}-{seq}), supplier_name
├── supplier_type: [PHARMACEUTICAL, MEDICAL_EQUIPMENT, LABORATORY, SURGICAL,
│                  GENERAL, FOOD, CLEANING, IT, MAINTENANCE, OTHER]
├── pin_number (unique), bank_name, credit_days, credit_limit
├── status: [ACTIVE, INACTIVE, BLACKLISTED, PENDING]

PurchaseRequest
├── request_number (PR-{YYYYMMDD}-{seq})
├── requesting_department: [PHARMACY, LABORATORY, RADIOLOGY, SURGERY,
│                          ICU, WARD, KITCHEN, MAINTENANCE, IT, ADMIN, OTHER]
├── urgency: [ROUTINE, URGENT, EMERGENCY]
├── status: [DRAFT, SUBMITTED, APPROVED, APPROVED_ACCOUNTANT,
│           APPROVED_PROCUREMENT, REJECTED, CONVERTED_TO_PO, CANCELLED]
├── multi-level approval: HOD → Accountant → Procurement

PurchaseRequestItem — item_name, quantity_requested, estimated_unit_price

PurchaseOrder
├── po_number (PO-{YYYYMM}-{seq}), purchase_request (FK→PurchaseRequest)
├── supplier (FK→Supplier), expected_delivery_date
├── subtotal, vat_amount, total_amount
├── status: [DRAFT, SENT, ACKNOWLEDGED, PARTIALLY_RECEIVED, FULLY_RECEIVED, CLOSED, CANCELLED]

PurchaseOrderItem  — item_name, quantity_ordered, quantity_received, unit_price

GoodsReceivedNote
├── grn_number (GRN-{YYYYMMDD}-{seq}), purchase_order (FK→PurchaseOrder)
├── delivery_note_number, invoice_number
├── status: [PENDING, INSPECTED, ACCEPTED, PARTIALLY_ACCEPTED, REJECTED]
├── received_by (FK→User), inspected_by (FK→User)

GoodsReceivedNoteItem
├── grn (FK→GoodsReceivedNote), po_item (FK→PurchaseOrderItem)
├── quantity_received, quantity_accepted, quantity_rejected
├── batch_number, expiry_date
├── on save: updates Medicine.quantity_in_stock if accepted > 0
```

#### Insurance Claims
```
ConsultationInsuranceClaim
├── claim_number (CONS-CLM-{YYYYMMDD}-{seq})
├── patient_visit (FK→PatientVisit), insurance_provider (FK→InsuranceProvider)
├── consultation_fee, service_name, member_number
├── status: [PENDING, APPROVED, REJECTED, PAID]
├── claims_officer (FK→User[INSURANCE])
├── payment_confirmed_by (FK→User[CASHIER])
├── insurance_payment_received, insurance_payment_reference

PharmacyInsuranceClaim
├── claim_number (PHRM-CLM-{YYYYMMDD}-{seq})
├── claim_type: [PRESCRIPTION, OTC]
├── items_breakdown (JSONField)
├── insurance_covered, patient_copay
├── status: [PENDING, APPROVED, REJECTED, PAID]

InpatientInsuranceClaim
├── claim_number (IPD-CLM-{YYYYMMDD}-{seq})
├── admission (O2O→InpatientAdmission)
├── total_charges, charges_breakdown (JSONField)
├── approved_amount, patient_copay
├── status: [DRAFT, SUBMITTED, PENDING, APPROVED, PARTIALLY_APPROVED, REJECTED, PAID]
```

#### SHA (Social Health Authority)
```
SHAMember
├── patient (O2O→Patient), sha_number (unique, indexed)
├── package_name, status: [ACTIVE, INACTIVE, SUSPENDED, PENDING]
├── enrollment_date, expiry_date
├── annual_limit (default 500,000), used_amount
├── last_verified, verification_response (JSONField)
├── properties: is_valid, available_balance

SHAClaim
├── claim_number (SHA-{YYYYMMDD}-{hex}), sha_reference
├── sha_member (FK→SHAMember), consultation (FK→Consultation)
├── claim_type: [OUTPATIENT, INPATIENT, EMERGENCY, PHARMACY, LABORATORY, RADIOLOGY]
├── claimed_amount, approved_amount, patient_copay
├── status: [DRAFT, SUBMITTED, PENDING, APPROVED, PARTIALLY_APPROVED, REJECTED, PAID]
├── submission_response (JSONField)
├── submitted_by (FK→User)
```

#### Payment & Billing
```
PaymentAuditLog
├── transaction_id (unique, indexed)
├── transaction_type: [CONSULTATION_PAYMENT, MEDICINE_SALE, LAB_PAYMENT,
│                     REFUND, ADJUSTMENT, EMERGENCY_PAYMENT, INPATIENT_PAYMENT]
├── status: [SUCCESS, FAILED, PENDING, REVERSED]
├── payment_method, mpesa_code (indexed), mpesa_phone
├── cost_breakdown (JSONField), qr_code_data (JSONField)
├── processed_by (FK→User)

CashierSession
├── session_id (CS-{cashier_id}-{datetime})
├── cashier (FK→User), status: [OPEN, CLOSED, RECONCILED]
├── opening_balance, expected_cash, actual_cash, cash_variance
├── total_cash_amount, total_mpesa_amount
├── reconciled_by (FK→User)

MPesaDuplicateCheck — mpesa_code (unique), medicine_sale (FK→MedicineSale)
```

#### eTIMS
```
eTIMSConfiguration (singleton — only one allowed)
├── tin_number, business_name, branch_name
├── device_serial_number, api_base_url, api_key
├── is_active, test_mode, auto_submit_invoices
├── data_anonymization_enabled, pharmacy_board_license
├── last_sync_date, last_sync_status

eTIMSInvoice
├── invoice_number (INV-{YYYYMMDD}-{seq})
├── etims_invoice_number (from KRA response)
├── invoice_type: [CONSULTATION, PHARMACY, LABORATORY, INPATIENT, OTHER]
├── customer_name, customer_phone, customer_tin
├── patient (FK→Patient), patient_visit (FK→PatientVisit)
├── otc_sale (FK→OverTheCounterSale), lab_order (FK→LabOrder)
├── inpatient_admission (FK→InpatientAdmission)
├── total_amount, taxable_amount, vat_rate, vat_amount
├── is_exempt (medical services default True)
├── payment_method: [CASH, MPESA, CARD, BANK, INSURANCE, OTHER]
├── status: [DRAFT, PENDING, SUBMITTED, APPROVED, REJECTED, CANCELLED]
├── submitted_to_etims, etims_response (JSONField)
├── etims_qr_code, etims_verification_url
├── payment_status: [PAID, PARTIAL, PENDING, INSURANCE_PENDING, WAIVED]

eTIMSInvoiceItem
├── invoice (FK→eTIMSInvoice), item_sequence
├── item_code, item_name
├── tax_type: [A=VAT 16%, B=Exempt, C=Zero Rated, D=Special]
├── quantity, unit_price, discount_amount
├── taxable_amount, tax_amount, total_amount (all auto-computed on save)
```

#### HR — Attendance & Leave
```
HospitalWiFiNetwork — network_name, bssid, location, ip_range

AttendanceQRCode
├── qr_code (ATT-{token}), qr_type: [CHECK_IN, CHECK_OUT]
├── valid_from, valid_until, attendance_date, location
├── generated_by (FK→User[HR])
├── method: is_valid()

Attendance
├── user (FK→User), date — unique_together
├── status: [PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE, HOLIDAY]
├── check_in_time, check_in_qr_code (FK→AttendanceQRCode)
├── check_in_ip, check_in_wifi_network (FK→HospitalWiFiNetwork)
├── check_out_time, check_out_qr_code, check_out_ip
├── total_hours (auto-computed), is_manual, manual_approved_by (FK→User)
├── method: calculate_hours()

LeaveType
├── name (unique), days_allowed_per_year
├── requires_attachment, is_paid, minimum_notice_days

LeaveApplication
├── application_number (LEAVE-{YYYYMMDD}-{seq})
├── user (FK→User), leave_type (FK→LeaveType)
├── start_date, end_date, total_days (auto-computed), reason
├── status: [PENDING, SUPERVISOR_APPROVED, HR_APPROVED, APPROVED, REJECTED, CANCELLED]
├── supervisor_approved_by (FK→User), hr_approved_by (FK→User[HR])
```

#### Assets
```
HospitalAsset
├── asset_id, asset_name
├── category: [MEDICAL_EQUIPMENT, LABORATORY_EQUIPMENT, RADIOLOGY_EQUIPMENT,
│             SURGICAL_EQUIPMENT, IT_EQUIPMENT, FURNITURE, VEHICLE,
│             GENERATOR, HVAC, OTHER]
├── status: [OPERATIONAL, UNDER_MAINTENANCE, OUT_OF_SERVICE, RETIRED]
├── condition: [EXCELLENT, GOOD, FAIR, POOR, CRITICAL]
├── purchase_date, purchase_cost, supplier, warranty_expiry
├── location, assigned_to (FK→User)
├── maintenance schedule: last/next maintenance, calibration, audit dates
├── needs_replacement, estimated_replacement_cost
├── property: is_maintenance_overdue

AssetMaintenanceLog
├── asset (FK→HospitalAsset)
├── maintenance_type: [PREVENTIVE, CORRECTIVE, CALIBRATION, INSPECTION, REPAIR, REPLACEMENT]
├── maintenance_date, performed_by, service_provider
├── cost, downtime_hours, parts_replaced
```

#### Audit, Security & Messaging
```
AuditLog
├── user (FK→User), action: [create, update, delete, view, approve,
│                            reject, login, logout, export, print]
├── table_affected, record_id
├── old_values (JSONField), new_values (JSONField)
├── ip_address, user_agent

SecurityThreat
├── threat_type: [sql_injection, xss, path_traversal, brute_force,
│               suspicious_agent, rate_limit, other]
├── severity: [low, medium, high, critical]
├── ip_address, user (FK→User), blocked, resolved

Notification
├── recipient (FK→User), sender (FK→User), patient (FK→Patient)
├── notification_type: [APPOINTMENT, LOW_STOCK, FOLLOW_UP, GENERAL,
│                      QUEUE_CALL, CONSULTATION, LAB_RESULT, PRESCRIPTION]
├── is_read, is_urgent, action_url, expires_at
├── method: mark_as_read()

Conversation      — participant1 (FK→User), participant2 (FK→User), patient (FK→Patient)
Message           — conversation (FK→Conversation), sender (FK→User), content, is_read
```

---

### `serializers.py`

All serializers in `core/serializers.py`:

```
── AUTH ──────────────────────────────────────────────────────────────────
AuthTokenSerializer          — email + password → JWT tokens
UserSerializer               — full user with role
UserListSerializer           — id, full_name, user_type, is_active (lightweight)

── PATIENTS & STAFF ──────────────────────────────────────────────────────
PatientSerializer            — full patient; computed age
PatientListSerializer        — id, full_name, phone, gender (lightweight)
DoctorSerializer             — nested user, specialization display
NurseSerializer              — nested user, department display

── LOOKUPS ───────────────────────────────────────────────────────────────
InsuranceProviderSerializer
SpecializedServiceSerializer
DiseaseSerializer
ICD10CodeSerializer          — code, short_description, nhif_eligible, sha_covered
ICD10CategorySerializer      — nested codes list

── VISITS & TRIAGE ───────────────────────────────────────────────────────
PatientVisitSerializer       — full visit with nested patient (read)
PatientVisitCreateSerializer — write: patient_id, visit_type, chief_complaint
TriageAssessmentSerializer   — vitals + computed bmi
QueueManagementSerializer    — queue position, wait time, department

── CONSULTATIONS ─────────────────────────────────────────────────────────
AppointmentSerializer
ConsultationSerializer       — nested appointment (read); write by ids
ConsultationDiagnosisSerializer — icd10 code nested; type + certainty
PatientMedicalHistorySerializer

── PHARMACY ──────────────────────────────────────────────────────────────
MedicineCategorySerializer
MedicineSerializer           — stock, price, is_low_stock flag
MedicineListSerializer       — lightweight for search/dropdowns
StockMovementSerializer
PrescriptionSerializer       — medicine nested (read); dispense action
OverTheCounterSaleSerializer — items nested
OverTheCounterSaleItemSerializer

── LABORATORY ────────────────────────────────────────────────────────────
LabTestCategorySerializer
LabTestSerializer
LabOrderSerializer           — items nested, patient name
LabOrderItemSerializer       — result_value, is_abnormal
LabResultSerializer          — summary, interpretation, critical flag
ImagingStudySerializer       — modality, findings, image URLs

── INPATIENT ─────────────────────────────────────────────────────────────
WardSerializer               — bed counts via properties
BedSerializer                — ward nested (read); status display
InpatientAdmissionSerializer — bed + doctor nested (read); full write
InpatientDailyChargeSerializer
InpatientVitalsSerializer
InpatientMedicineRequestSerializer

── EMERGENCY ─────────────────────────────────────────────────────────────
EmergencyBedSerializer
EmergencyVisitSerializer     — visit + triage nested
EmergencyChargeSerializer
EmergencyPaymentSerializer

── MATERNITY & MCH ───────────────────────────────────────────────────────
MaternityVisitSerializer
MCHVisitSerializer

── PROCUREMENT ───────────────────────────────────────────────────────────
SupplierSerializer
PurchaseRequestSerializer    — items nested; approval status display
PurchaseRequestItemSerializer
PurchaseOrderSerializer      — items nested; supplier nested
PurchaseOrderItemSerializer
GoodsReceivedNoteSerializer  — items nested; triggers stock update on accept
GoodsReceivedNoteItemSerializer

── INSURANCE ─────────────────────────────────────────────────────────────
ConsultationInsuranceClaimSerializer
PharmacyInsuranceClaimSerializer — items_breakdown JSONField
InpatientInsuranceClaimSerializer

── SHA ───────────────────────────────────────────────────────────────────
SHAMemberSerializer          — is_valid, available_balance properties
SHAClaimSerializer           — sha_member nested; submission_response

── PAYMENT & BILLING ─────────────────────────────────────────────────────
PaymentAuditLogSerializer    — cost_breakdown display
CashierSessionSerializer     — cash/mpesa totals; variance
MPesaDuplicateCheckSerializer

── eTIMS ─────────────────────────────────────────────────────────────────
eTIMSConfigurationSerializer — api_key write-only
eTIMSInvoiceSerializer       — items nested; etims_qr_code, verification_url
eTIMSInvoiceItemSerializer   — tax amounts auto-computed

── HR ────────────────────────────────────────────────────────────────────
HospitalWiFiNetworkSerializer
AttendanceQRCodeSerializer   — valid window display
AttendanceSerializer         — total_hours display
LeaveTypeSerializer
LeaveApplicationSerializer   — total_days auto-computed

── ASSETS ────────────────────────────────────────────────────────────────
HospitalAssetSerializer      — is_maintenance_overdue property
AssetMaintenanceLogSerializer

── AUDIT & MESSAGING ─────────────────────────────────────────────────────
AuditLogSerializer
NotificationSerializer       — unread count annotation
ConversationSerializer       — last message preview
MessageSerializer

── DASHBOARD ─────────────────────────────────────────────────────────────
DashboardStatsSerializer     — role-specific: today_visits, queue_counts,
                               low_stock_count, pending_claims, revenue_today
```

---

### `views.py`

All views in `core/views.py` using DRF `ModelViewSet` with custom actions:

```
AuthViewSet
├── POST /auth/login/          — obtain JWT pair + user info
├── POST /auth/refresh/        — refresh access token
├── POST /auth/logout/         — blacklist token
└── GET  /auth/me/             — current user profile

UserViewSet                    — ADMIN only: CRUD users, assign roles

PatientViewSet
├── list, retrieve, create, update
├── GET  .../patients/{id}/visits/        — visit history
├── GET  .../patients/{id}/prescriptions/ — prescription history
└── GET  .../patients/{id}/sha-status/    — SHA member details

DoctorViewSet                  — CRUD doctors; filter by specialization
NurseViewSet                   — CRUD nurses; filter by department

PatientVisitViewSet
├── list (filterable by date, status, doctor)
├── create, retrieve, update
├── POST .../visits/{id}/triage/          — create/update triage assessment
├── POST .../visits/{id}/assign-queue/    — add to department queue
└── POST .../visits/{id}/update-status/  — status transitions

QueueManagementViewSet
├── GET  .../queue/?department=CONSULTATION  — live queue by dept
└── POST .../queue/{id}/call/               — call next patient

AppointmentViewSet             — CRUD appointments; filter by doctor/date
ConsultationViewSet
├── list, retrieve, create, update
├── POST .../consultations/{id}/add-diagnosis/
└── GET  .../consultations/{id}/prescriptions/

ICD10CodeViewSet               — search by code or description (autocomplete)

MedicineViewSet
├── list (low_stock filter), retrieve, create, update
└── GET  .../medicines/low-stock/

PrescriptionViewSet
├── list (by consultation), create
└── POST .../prescriptions/{id}/dispense/

OverTheCounterSaleViewSet
├── list (by date/cashier), create
└── POST .../otc-sales/{id}/dispense/

LabOrderViewSet
├── list, create, retrieve
├── POST .../lab-orders/{id}/collect-sample/
├── POST .../lab-orders/{id}/enter-results/
└── POST .../lab-orders/{id}/release-results/

ImagingStudyViewSet            — list, create, update (findings/impression)

WardViewSet                    — list wards with bed counts
BedViewSet                     — list beds; filter by ward/status

InpatientAdmissionViewSet
├── list (active admissions), create, retrieve, update
├── GET  .../admissions/{id}/charges/
├── POST .../admissions/{id}/add-charge/
├── POST .../admissions/{id}/record-vitals/
└── POST .../admissions/{id}/discharge/

InpatientMedicineRequestViewSet
├── list (by admission/status), create
├── POST .../medicine-requests/{id}/approve/
└── POST .../medicine-requests/{id}/dispense/

EmergencyVisitViewSet
├── list (active), create, retrieve, update
├── POST .../emergency/{id}/assign-bed/
└── POST .../emergency/{id}/transfer-to-ward/

ConsultationInsuranceClaimViewSet
├── list (by status/provider), create
├── POST .../cons-claims/{id}/approve/
└── POST .../cons-claims/{id}/reject/

PharmacyInsuranceClaimViewSet  — same approve/reject pattern
InpatientInsuranceClaimViewSet — same approve/reject pattern

SHAMemberViewSet
├── list, retrieve, create, update
└── POST .../sha-members/{id}/verify/   — call SHA API to verify status

SHAClaimViewSet
├── list, create, retrieve
└── POST .../sha-claims/{id}/submit/    — submit to SHA API

eTIMSConfigurationViewSet      — singleton: retrieve + update (ADMIN/ACCOUNTANT)
eTIMSInvoiceViewSet
├── list, create, retrieve
└── POST .../etims-invoices/{id}/submit/ — submit to KRA eTIMS

SupplierViewSet                — CRUD suppliers
PurchaseRequestViewSet
├── list, create, retrieve, update
├── POST .../prs/{id}/submit/
├── POST .../prs/{id}/approve-hod/
├── POST .../prs/{id}/approve-accountant/
├── POST .../prs/{id}/approve-procurement/
└── POST .../prs/{id}/convert-to-po/

PurchaseOrderViewSet
├── list, create, retrieve, update
└── POST .../pos/{id}/send/

GoodsReceivedNoteViewSet
├── list, create, retrieve
└── POST .../grns/{id}/accept/  — triggers stock update

AttendanceQRCodeViewSet
├── list (today's codes), create
└── GET .../qr-codes/today/

AttendanceViewSet
├── list (by user/date), retrieve
├── POST .../attendance/scan-check-in/
├── POST .../attendance/scan-check-out/
└── POST .../attendance/manual-entry/

LeaveApplicationViewSet
├── list, create, retrieve
├── POST .../leaves/{id}/approve-supervisor/
├── POST .../leaves/{id}/approve-hr/
└── POST .../leaves/{id}/reject/

HospitalAssetViewSet
├── list (filter by category/status), create, retrieve, update
└── GET  .../assets/maintenance-due/

AssetMaintenanceLogViewSet     — list (by asset), create

CashierSessionViewSet
├── GET  .../cashier-sessions/active/ — current open session
├── POST .../cashier-sessions/open/
└── POST .../cashier-sessions/{id}/close/

PaymentAuditLogViewSet         — ACCOUNTANT/ADMIN: list, filter by type/date
NotificationViewSet
├── list (recipient=current user), retrieve
└── POST .../notifications/{id}/mark-read/

DashboardView                  — GET /dashboard/ → role-specific stats
ReportsView                    — GET /reports/{type}/ → exports
```

---

### `urls.py`

#### `core/urls.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users',                    views.UserViewSet)
router.register(r'patients',                 views.PatientViewSet)
router.register(r'doctors',                  views.DoctorViewSet)
router.register(r'nurses',                   views.NurseViewSet)
router.register(r'visits',                   views.PatientVisitViewSet)
router.register(r'queue',                    views.QueueManagementViewSet)
router.register(r'appointments',             views.AppointmentViewSet)
router.register(r'consultations',            views.ConsultationViewSet)
router.register(r'icd10-codes',              views.ICD10CodeViewSet)
router.register(r'medicines',                views.MedicineViewSet)
router.register(r'prescriptions',            views.PrescriptionViewSet)
router.register(r'otc-sales',                views.OverTheCounterSaleViewSet)
router.register(r'lab-orders',               views.LabOrderViewSet)
router.register(r'imaging-studies',          views.ImagingStudyViewSet)
router.register(r'wards',                    views.WardViewSet)
router.register(r'beds',                     views.BedViewSet)
router.register(r'admissions',               views.InpatientAdmissionViewSet)
router.register(r'medicine-requests',        views.InpatientMedicineRequestViewSet)
router.register(r'emergency-visits',         views.EmergencyVisitViewSet)
router.register(r'cons-claims',              views.ConsultationInsuranceClaimViewSet)
router.register(r'pharmacy-claims',          views.PharmacyInsuranceClaimViewSet)
router.register(r'inpatient-claims',         views.InpatientInsuranceClaimViewSet)
router.register(r'sha-members',              views.SHAMemberViewSet)
router.register(r'sha-claims',               views.SHAClaimViewSet)
router.register(r'etims-config',             views.eTIMSConfigurationViewSet)
router.register(r'etims-invoices',           views.eTIMSInvoiceViewSet)
router.register(r'suppliers',                views.SupplierViewSet)
router.register(r'purchase-requests',        views.PurchaseRequestViewSet)
router.register(r'purchase-orders',          views.PurchaseOrderViewSet)
router.register(r'goods-received-notes',     views.GoodsReceivedNoteViewSet)
router.register(r'attendance-qr-codes',      views.AttendanceQRCodeViewSet)
router.register(r'attendance',               views.AttendanceViewSet)
router.register(r'leave-applications',       views.LeaveApplicationViewSet)
router.register(r'assets',                   views.HospitalAssetViewSet)
router.register(r'asset-maintenance-logs',   views.AssetMaintenanceLogViewSet)
router.register(r'cashier-sessions',         views.CashierSessionViewSet)
router.register(r'payment-logs',             views.PaymentAuditLogViewSet)
router.register(r'notifications',            views.NotificationViewSet)

urlpatterns = [
    path('auth/login/',   views.AuthViewSet.as_view({'post': 'login'})),
    path('auth/refresh/', views.AuthViewSet.as_view({'post': 'refresh'})),
    path('auth/logout/',  views.AuthViewSet.as_view({'post': 'logout'})),
    path('auth/me/',      views.AuthViewSet.as_view({'get': 'me'})),
    path('dashboard/',    views.DashboardView.as_view()),
    path('reports/<str:report_type>/', views.ReportsView.as_view()),
    path('', include(router.urls)),
]
```

#### `afya1/urls.py`

```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/',   include('core.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## Frontend Architecture

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AFYA1 HMIS — South B Hospital</title>
    <link rel="icon" type="image/svg+xml" href="/afya1-logo.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

### `main.jsx`

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/main.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

---

### `App.jsx`

```jsx
// Root router — layout shell + protected routes by role
// Layout = <Navbar /> + <Sidebar /> + <Outlet />
//
// Role-to-default-dashboard:
//   ADMIN         → /admin/dashboard
//   DOCTOR        → /doctor/dashboard
//   NURSE         → /nurse/dashboard
//   RECEPTIONIST  → /receptionist/dashboard
//   PHARMACIST    → /pharmacy/dashboard
//   LAB_TECH      → /laboratory/dashboard
//   CASHIER       → /cashier/dashboard
//   INSURANCE     → /insurance/dashboard
//   PROCUREMENT   → /procurement/dashboard
//   ACCOUNTANT    → /accountant/dashboard
//   HR            → /hr/dashboard
//
// Routes:
//   /login                        → <Login />
//   /admin/*                      → admin pages
//   /receptionist/*               → receptionist pages
//   /nurse/*                      → nurse pages
//   /doctor/*                     → doctor pages
//   /pharmacy/*                   → pharmacy pages
//   /laboratory/*                 → lab pages
//   /cashier/*                    → cashier pages
//   /insurance/*                  → insurance pages
//   /procurement/*                → procurement pages
//   /accountant/*                 → accountant pages
//   /hr/*                         → HR pages
//   /shared/*                     → shared pages (patient profile, visit detail)
//   *                             → 404 redirect
```

---

### `AuthContext.jsx`

```jsx
// src/context/AuthContext.jsx — SINGLE context for entire app

State:
  user      — { id, username, full_name, user_type, phone_number }
  token     — JWT access token (memory + axios header)
  loading   — boolean (initial auth check on mount)
  isAuth    — boolean

Functions:
  login(username, password)   → POST /auth/login/, store tokens, set user
  logout()                    → blacklist token, clear state, → /login
  refreshToken()              → POST /auth/refresh/, update access token
  hasRole(...roles)           → boolean: user.user_type in roles[]
  updateUser(data)            → partial update of user state

Usage:
  const { user, login, logout, hasRole } = useAuth()
```

---

### `services/api.js`

```javascript
// Axios instance: baseURL = import.meta.env.VITE_API_URL
// Request interceptor: attach Authorization: Bearer {token}
// Response interceptor: 401 → refresh → retry → logout

// ─── AUTH ────────────────────────────────────────────────
export const login(username, password)
export const logout()
export const refreshToken(refresh)
export const getMe()

// ─── PATIENTS ────────────────────────────────────────────
export const getPatients(params)           // search, pagination
export const getPatient(id)
export const createPatient(data)
export const updatePatient(id, data)
export const getPatientVisits(id)
export const getPatientPrescriptions(id)
export const getPatientSHAStatus(id)

// ─── DOCTORS & NURSES ────────────────────────────────────
export const getDoctors(params)
export const getNurses(params)

// ─── VISITS ──────────────────────────────────────────────
export const getVisits(params)             // filter: date, status, doctor
export const createVisit(data)
export const updateVisit(id, data)
export const triageVisit(id, data)
export const assignQueue(id, data)
export const updateVisitStatus(id, data)

// ─── QUEUE ───────────────────────────────────────────────
export const getQueue(department)
export const callNextPatient(id)

// ─── APPOINTMENTS ────────────────────────────────────────
export const getAppointments(params)
export const createAppointment(data)
export const updateAppointment(id, data)

// ─── CONSULTATIONS ───────────────────────────────────────
export const getConsultations(params)
export const getConsultation(id)
export const createConsultation(data)
export const addDiagnosis(consultationId, data)
export const searchICD10(query)

// ─── PHARMACY ────────────────────────────────────────────
export const getMedicines(params)
export const getLowStockMedicines()
export const getPrescriptions(params)
export const createPrescription(data)
export const dispensePrescription(id)
export const getOTCSales(params)
export const createOTCSale(data)
export const dispenseOTCSale(id)

// ─── LABORATORY ──────────────────────────────────────────
export const getLabOrders(params)
export const createLabOrder(data)
export const collectSample(id)
export const enterLabResults(id, data)
export const releaseResults(id)
export const getImagingStudies(params)
export const createImagingStudy(data)
export const updateImagingStudy(id, data)

// ─── INPATIENT ───────────────────────────────────────────
export const getWards()
export const getBeds(params)               // filter: ward, status
export const getAdmissions(params)
export const createAdmission(data)
export const getAdmissionCharges(id)
export const addAdmissionCharge(id, data)
export const recordVitals(id, data)
export const dischargePatient(id, data)
export const getMedicineRequests(params)
export const createMedicineRequest(data)
export const approveMedicineRequest(id)
export const dispenseMedicineRequest(id)

// ─── EMERGENCY ───────────────────────────────────────────
export const getEmergencyVisits(params)
export const createEmergencyVisit(data)
export const assignEmergencyBed(id, data)
export const transferToWard(id, data)

// ─── INSURANCE CLAIMS ────────────────────────────────────
export const getConsultationClaims(params)
export const createConsultationClaim(data)
export const approveConsultationClaim(id)
export const rejectConsultationClaim(id, data)
// (same pattern for pharmacy and inpatient claims)

// ─── SHA ─────────────────────────────────────────────────
export const getSHAMembers(params)
export const getSHAMember(id)
export const createSHAMember(data)
export const verifySHAMember(id)
export const getSHAClaims(params)
export const createSHAClaim(data)
export const submitSHAClaim(id)

// ─── eTIMS ───────────────────────────────────────────────
export const geteTIMSConfig()
export const updateeTIMSConfig(data)
export const geteTIMSInvoices(params)
export const createeTIMSInvoice(data)
export const submiteTIMSInvoice(id)

// ─── PROCUREMENT ─────────────────────────────────────────
export const getSuppliers(params)
export const createSupplier(data)
export const getPurchaseRequests(params)
export const createPurchaseRequest(data)
export const submitPR(id)
export const approveHOD(id)
export const approveAccountant(id)
export const approveProcurement(id)
export const convertToPO(id)
export const getPurchaseOrders(params)
export const createPurchaseOrder(data)
export const getGRNs(params)
export const createGRN(data)
export const acceptGRN(id, data)

// ─── HR ──────────────────────────────────────────────────
export const getAttendanceQRCodes()
export const generateQRCode(data)
export const getAttendance(params)
export const scanCheckIn(data)
export const scanCheckOut(data)
export const manualAttendance(data)
export const getLeaveApplications(params)
export const applyLeave(data)
export const approveSupervisor(id)
export const approveHR(id)
export const rejectLeave(id, data)

// ─── ASSETS ──────────────────────────────────────────────
export const getAssets(params)
export const getMaintenanceDueAssets()
export const createAsset(data)
export const updateAsset(id, data)
export const getMaintenanceLogs(assetId)
export const createMaintenanceLog(data)

// ─── CASHIER ─────────────────────────────────────────────
export const getActiveCashierSession()
export const openCashierSession(data)
export const closeCashierSession(id, data)
export const getPaymentLogs(params)

// ─── NOTIFICATIONS ───────────────────────────────────────
export const getNotifications()
export const markNotificationRead(id)

// ─── DASHBOARD & REPORTS ─────────────────────────────────
export const getDashboardStats()
export const getReport(type, params)
// report types: daily-visits | revenue | stock | claims | lab-turnaround |
//               attendance | admissions | discharge-summary
```

---

### Pages

#### `pages/Login.jsx`
- Username + password form; AFYA1 branding
- Calls `AuthContext.login()` → redirect to role dashboard
- Teal/white medical theme

#### `pages/Dashboard.jsx`
- Reads `user.user_type` → renders correct role dashboard

#### Admin Pages (`pages/admin/`)
| Page | Purpose |
|------|---------|
| `AdminDashboard.jsx` | KPIs: today visits, revenue, beds occupied, pending claims |
| `UserManagement.jsx` | CRUD system users, assign roles, activate/deactivate |
| `SystemSettings.jsx` | Clinic settings, eTIMS config, SHA config |
| `AuditLogs.jsx` | View audit trail, filter by user/action/date |
| `SecurityThreats.jsx` | View and resolve security incidents |
| `AssetRegister.jsx` | Full asset list, maintenance scheduling |
| `Reports.jsx` | All-role reports: revenue, stock, clinical, HR |

#### Receptionist Pages (`pages/receptionist/`)
| Page | Purpose |
|------|---------|
| `ReceptionistDashboard.jsx` | Today's queue summary, pending registrations |
| `RegisterPatient.jsx` | New patient registration form |
| `NewVisit.jsx` | Create visit (type, insurance, service) for existing patient |
| `Appointments.jsx` | Book and manage appointments |
| `PatientSearch.jsx` | Search patients; view visit history |
| `Queue.jsx` | Live queue display for all departments |

#### Nurse Pages (`pages/nurse/`)
| Page | Purpose |
|------|---------|
| `NurseDashboard.jsx` | Triage queue, inpatient vitals due, MCH appointments |
| `TriageQueue.jsx` | List visits awaiting triage; start triage form |
| `TriageForm.jsx` | Full vitals + triage category assignment |
| `InpatientVitals.jsx` | Record vitals for admitted patients by ward |
| `MedicineRequests.jsx` | Submit/track inpatient medicine requests |
| `MaternityAssessment.jsx` | Labor assessment form |
| `MCHClinic.jsx` | Child immunization + growth monitoring |

#### Doctor Pages (`pages/doctor/`)
| Page | Purpose |
|------|---------|
| `DoctorDashboard.jsx` | Consultation queue, today's appointments, pending lab results |
| `ConsultationQueue.jsx` | Patients waiting for consultation |
| `Consult.jsx` | Full consultation: diagnosis (ICD-10 search), prescription, lab orders |
| `MyAppointments.jsx` | Doctor's own appointment list |
| `PatientHistory.jsx` | Full patient medical history view |
| `InpatientRounds.jsx` | Inpatient admission list; add charges/notes |
| `LabResults.jsx` | View released lab results for own patients |

#### Pharmacy Pages (`pages/pharmacy/`)
| Page | Purpose |
|------|---------|
| `PharmacyDashboard.jsx` | Pending prescriptions, OTC queue, low stock alerts |
| `PrescriptionQueue.jsx` | Prescriptions to dispense (with visit context) |
| `OTCSales.jsx` | Walk-in OTC medicine sales |
| `StockManagement.jsx` | Medicine inventory, stock adjustments |
| `StockMovements.jsx` | Full stock movement history |

#### Laboratory Pages (`pages/laboratory/`)
| Page | Purpose |
|------|---------|
| `LabDashboard.jsx` | Pending orders by priority, TAT performance |
| `LabOrders.jsx` | All orders; filter by status/priority |
| `ProcessOrder.jsx` | Sample collection → result entry → verify → release |
| `ImagingStudies.jsx` | Manage imaging orders and findings |
| `LabReports.jsx` | Result history, critical value log |

#### Cashier Pages (`pages/cashier/`)
| Page | Purpose |
|------|---------|
| `CashierDashboard.jsx` | Session summary: cash, M-Pesa, total |
| `SessionManagement.jsx` | Open/close cashier session |
| `Payments.jsx` | Process consultation/lab/pharmacy payments |
| `ReceiptPrint.jsx` | Print/view receipts |
| `CashierReports.jsx` | Session Z-report, payment method breakdown |

#### Insurance Pages (`pages/insurance/`)
| Page | Purpose |
|------|---------|
| `InsuranceDashboard.jsx` | Pending claims count by type and provider |
| `ConsultationClaims.jsx` | Review and approve/reject consultation claims |
| `PharmacyClaims.jsx` | Review pharmacy claims with item breakdown |
| `InpatientClaims.jsx` | Review inpatient claims with charge breakdown |
| `SHAClaims.jsx` | SHA claim management and submission status |
| `ClaimsReports.jsx` | Claims by provider, approval rate, payment received |

#### Procurement Pages (`pages/procurement/`)
| Page | Purpose |
|------|---------|
| `ProcurementDashboard.jsx` | PRs awaiting action, POs in transit, GRNs pending |
| `PurchaseRequests.jsx` | List and manage PRs through approval pipeline |
| `NewPurchaseRequest.jsx` | Create PR with items |
| `PurchaseOrders.jsx` | PO management; send to suppliers |
| `GoodsReceived.jsx` | GRN creation; accept/reject items; auto-stock update |
| `Suppliers.jsx` | Supplier register CRUD |

#### HR Pages (`pages/hr/`)
| Page | Purpose |
|------|---------|
| `HRDashboard.jsx` | Today's attendance summary, pending leaves |
| `AttendanceQR.jsx` | Generate check-in/check-out QR codes |
| `AttendanceReport.jsx` | Staff attendance by date range |
| `LeaveManagement.jsx` | All leave applications; approve/reject |
| `StaffList.jsx` | All staff with roles, leave balance overview |

#### Shared Pages (`pages/shared/`)
| Page | Purpose |
|------|---------|
| `PatientProfile.jsx` | Full patient profile accessible to all clinical roles |
| `VisitDetail.jsx` | Full visit detail: triage, consultation, prescriptions, labs |
| `NotificationsPage.jsx` | All notifications for current user |

---

### Components

#### `components/Navbar.jsx`
```
Reads from AuthContext.
Renders:
  - AFYA1 logo + "South B Hospital" wordmark (left)
  - Date/time + current user role badge (center)
  - Notification bell with unread count (right)
  - User avatar + full name (right) → dropdown: Profile, Logout
  - Hamburger for mobile sidebar toggle
```

#### `components/Sidebar.jsx`
```
Reads from AuthContext. Nav links filtered by user.user_type.

ADMIN:        Dashboard | Users | System Settings | Audit Logs |
              Security | Assets | Reports

RECEPTIONIST: Dashboard | Register Patient | New Visit |
              Appointments | Patient Search | Queue

NURSE:        Dashboard | Triage Queue | Inpatient Vitals |
              Medicine Requests | Maternity | MCH

DOCTOR:       Dashboard | Consultation Queue | My Appointments |
              Inpatient Rounds | Lab Results

PHARMACIST:   Dashboard | Prescriptions | OTC Sales | Stock

LAB_TECH:     Dashboard | Lab Orders | Imaging | Lab Reports

CASHIER:      Dashboard | Session | Payments | Reports

INSURANCE:    Dashboard | Consultation Claims | Pharmacy Claims |
              Inpatient Claims | SHA Claims | Reports

PROCUREMENT:  Dashboard | Purchase Requests | Purchase Orders |
              Goods Received | Suppliers

ACCOUNTANT:   Dashboard | eTIMS Invoices | eTIMS Config |
              Payment Logs | Finance Reports

HR:           Dashboard | Attendance QR | Attendance Report |
              Leave Management | Staff List
```

---

### `styles/main.css`

```css
:root {
  /* AFYA1 Brand Colors */
  --color-primary:        #0a6e6e;   /* Deep medical teal */
  --color-primary-light:  #0d8f8f;
  --color-primary-dark:   #074f4f;
  --color-accent:         #f59e0b;   /* Amber — alerts, badges */
  --color-accent-dark:    #d97706;
  --color-danger:         #dc2626;
  --color-success:        #16a34a;
  --color-warning:        #d97706;
  --color-info:           #0284c7;

  /* Triage Colors */
  --triage-red:           #ef4444;
  --triage-orange:        #f97316;
  --triage-yellow:        #eab308;
  --triage-green:         #22c55e;
  --triage-blue:          #3b82f6;

  /* Neutrals */
  --color-bg:             #f0f4f8;
  --color-surface:        #ffffff;
  --color-surface-alt:    #e8f0ef;
  --color-border:         #d1dbd9;
  --color-text:           #1a2e2e;
  --color-text-muted:     #5f7a7a;
  --color-text-inverse:   #ffffff;

  /* Layout */
  --sidebar-width:        256px;
  --sidebar-collapsed:    68px;
  --navbar-height:        60px;

  /* Typography */
  --font-display:         'Sora', system-ui, sans-serif;
  --font-body:            'DM Sans', system-ui, sans-serif;
  --font-mono:            'JetBrains Mono', monospace;

  /* Spacing */
  --space-xs: 4px;   --space-sm: 8px;   --space-md: 16px;
  --space-lg: 24px;  --space-xl: 32px;  --space-2xl: 48px;

  /* Radius */
  --radius-sm: 4px;  --radius-md: 8px;  --radius-lg: 16px;  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(10,110,110,.08);
  --shadow-md: 0 4px 12px rgba(10,110,110,.10);
  --shadow-lg: 0 8px 24px rgba(10,110,110,.12);

  /* Transitions */
  --transition: 180ms ease;
}

/* Global reset, base typography, layout classes */
/* .layout, .sidebar, .main-content, .navbar */
/* .card, .btn-primary, .btn-secondary, .btn-danger, .btn-ghost */
/* .table, .badge */
/* .badge-triage-{red|orange|yellow|green|blue} */
/* .badge-role-{ADMIN|DOCTOR|NURSE|...} */
/* .form-group, .form-label, .form-input, .form-select, .form-textarea */
/* .stat-card, .page-header, .page-title */
/* .queue-card, .queue-number, .vitals-grid */
/* .spinner, .empty-state, .error-state */
/* @media (max-width: 768px) — responsive sidebar, stack layout */
```

---

## API Endpoints Reference

```
POST   /api/auth/login/
POST   /api/auth/refresh/
POST   /api/auth/logout/
GET    /api/auth/me/
GET    /api/dashboard/

GET/POST   /api/patients/
GET/PUT    /api/patients/{id}/
GET        /api/patients/{id}/visits/
GET        /api/patients/{id}/sha-status/

GET/POST   /api/visits/
GET/PUT    /api/visits/{id}/
POST       /api/visits/{id}/triage/
POST       /api/visits/{id}/assign-queue/
POST       /api/visits/{id}/update-status/

GET        /api/queue/?department={dept}
POST       /api/queue/{id}/call/

GET/POST   /api/consultations/
POST       /api/consultations/{id}/add-diagnosis/
GET        /api/icd10-codes/?search={query}

GET/POST   /api/medicines/
GET        /api/medicines/low-stock/
GET/POST   /api/prescriptions/
POST       /api/prescriptions/{id}/dispense/
GET/POST   /api/otc-sales/
POST       /api/otc-sales/{id}/dispense/

GET/POST   /api/lab-orders/
POST       /api/lab-orders/{id}/collect-sample/
POST       /api/lab-orders/{id}/enter-results/
POST       /api/lab-orders/{id}/release-results/

GET        /api/wards/
GET        /api/beds/?ward={id}&status={status}
GET/POST   /api/admissions/
POST       /api/admissions/{id}/add-charge/
POST       /api/admissions/{id}/record-vitals/
POST       /api/admissions/{id}/discharge/

GET/POST   /api/medicine-requests/
POST       /api/medicine-requests/{id}/approve/
POST       /api/medicine-requests/{id}/dispense/

GET/POST   /api/emergency-visits/
POST       /api/emergency-visits/{id}/assign-bed/
POST       /api/emergency-visits/{id}/transfer-to-ward/

GET/POST   /api/cons-claims/
POST       /api/cons-claims/{id}/approve/
POST       /api/cons-claims/{id}/reject/
GET/POST   /api/pharmacy-claims/
GET/POST   /api/inpatient-claims/

GET/POST   /api/sha-members/
POST       /api/sha-members/{id}/verify/
GET/POST   /api/sha-claims/
POST       /api/sha-claims/{id}/submit/

GET/PUT    /api/etims-config/
GET/POST   /api/etims-invoices/
POST       /api/etims-invoices/{id}/submit/

GET/POST   /api/suppliers/
GET/POST   /api/purchase-requests/
POST       /api/purchase-requests/{id}/submit/
POST       /api/purchase-requests/{id}/approve-hod/
POST       /api/purchase-requests/{id}/approve-accountant/
POST       /api/purchase-requests/{id}/approve-procurement/
POST       /api/purchase-requests/{id}/convert-to-po/
GET/POST   /api/purchase-orders/
GET/POST   /api/goods-received-notes/
POST       /api/goods-received-notes/{id}/accept/

GET/POST   /api/attendance-qr-codes/
GET        /api/attendance-qr-codes/today/
GET/POST   /api/attendance/
POST       /api/attendance/scan-check-in/
POST       /api/attendance/scan-check-out/
GET/POST   /api/leave-applications/
POST       /api/leave-applications/{id}/approve-supervisor/
POST       /api/leave-applications/{id}/approve-hr/
POST       /api/leave-applications/{id}/reject/

GET/POST   /api/assets/
GET        /api/assets/maintenance-due/
GET/POST   /api/asset-maintenance-logs/

GET        /api/cashier-sessions/active/
POST       /api/cashier-sessions/open/
POST       /api/cashier-sessions/{id}/close/
GET        /api/payment-logs/

GET        /api/notifications/
POST       /api/notifications/{id}/mark-read/

GET        /api/reports/{type}/
```

---

## Authentication Flow

```
1. User visits /login
2. Submits username + password
3. POST /api/auth/login/ → { access, refresh, user: { id, full_name, user_type } }
4. Store access in memory (axios default header) + refresh in localStorage
5. AuthContext.user populated → redirect to /{role}/dashboard
6. Every request: Authorization: Bearer {access}
7. On 401: POST /api/auth/refresh/ → new access → retry original request
8. If refresh fails (expired) → logout() → clear all → /login
```

---

## Clinical Workflow

```
REGISTRATION (receptionist)
  Search or create Patient
  Create PatientVisit (type, insurance, specialized service)
  → Visit status: REGISTERED

TRIAGE (nurse)
  Nurse picks visit from triage queue
  Records vitals, assigns TriageCategory (RED→BLUE)
  Sets requires_immediate_attention
  → Visit status: TRIAGED
  → Patient added to CONSULTATION QueueManagement

CONSULTATION (doctor)
  Doctor calls next from queue
  Creates Consultation linked to PatientVisit
  Adds ConsultationDiagnoses (ICD-10 search)
  Issues Prescriptions
  Requests LabOrders
  → Visit status: IN_CONSULTATION → COMPLETED / ADMITTED / REFERRED

PHARMACY (pharmacist)
  Dispenses Prescriptions (deducts stock, creates StockMovement)
  OTC sales for walk-in customers
  Creates PharmacyInsuranceClaim if insured

LABORATORY (lab tech)
  Receives LabOrder → collects sample → enters LabOrderItem results
  Flags is_abnormal, critical values
  Releases LabResult to patient/doctor

INPATIENT (admitting doctor + nurses)
  Creates InpatientAdmission (assigns Bed → auto-marks OCCUPIED)
  Nurses record InpatientVitals (shift-based)
  Nurses submit InpatientMedicineRequests → pharmacist dispenses
  Doctor adds InpatientDailyCharges
  On discharge: Bed → CLEANING, summary + diagnosis recorded

BILLING (cashier)
  Opens CashierSession
  Processes payments (Cash/M-Pesa) → PaymentAuditLog
  Prints receipts
  Confirms insurance payment received
  Closes session → reconciliation

SHA (claims officer / accountant)
  Verify patient SHAMember (call SHA API)
  Create SHAClaim for eligible services
  Submit to SHA → track approval/payment

eTIMS (accountant)
  Create eTIMSInvoice per billable transaction
  Submit to KRA API → receive etims_invoice_number + QR code
  Track submission status
```

---

## SHA & eTIMS Integration

### SHA (Social Health Authority)
- `SHAMember.verify()` → calls SHA verification API, stores `verification_response` (JSON)
- `SHAClaim.submit()` → constructs SHA claim payload, POSTs to SHA API
- Response stored in `submission_response` (JSON); status tracked automatically
- `LabTest.sha_covered` — flag indicates SHA covers this test
- `ICD10Code.nhif_eligible` — used for legacy + SHA claim eligibility checks

### eTIMS (Kenya Revenue Authority)
- Single `eTIMSConfiguration` enforces one active config per installation
- `eTIMSInvoice` covers all billable events: consultations, pharmacy, lab, inpatient
- Medical services default `is_exempt = True` (VAT Exempt under Kenyan law)
- `eTIMSInvoiceItem.tax_type = 'B'` (Exempt) for healthcare goods/services
- On `submit()`: POST to KRA API → store `etims_invoice_number`, `etims_qr_code`, `etims_verification_url`
- `test_mode = True` by default — switch to `False` for live KRA submission

---

## Setup & Installation

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in DB, SHA keys, eTIMS keys
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_data  # optional demo data
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env        # set VITE_API_URL
npm run dev
```

---

## Environment Variables

### Backend (`.env`)
```
SECRET_KEY=your-django-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:pass@localhost:5432/afya1_hmis
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
MEDIA_ROOT=media/

# SHA Integration
SHA_API_BASE_URL=https://api.sha.go.ke/v1
SHA_API_KEY=your-sha-api-key
SHA_FACILITY_CODE=your-facility-code

# eTIMS Integration
ETIMS_API_BASE_URL=https://etims.kra.go.ke/api
ETIMS_TEST_URL=https://etims-dev.kra.go.ke/api
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=AFYA1 HMIS
VITE_HOSPITAL_NAME=South B Hospital
```

---

*AFYA1 HMIS — South B Hospital Management Information System*
*Built with Django REST Framework + React + Vite*