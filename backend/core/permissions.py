"""
AFYA1 HMIS — core/permissions.py
Custom DRF permission classes for role-based access control.

Role hierarchy (no inheritance — each role is independent):
    ADMIN        → full system access
    DOCTOR       → clinical: consultations, diagnoses, prescriptions, lab orders
    NURSE        → triage, vitals, inpatient nursing, maternity, MCH
    RECEPTIONIST → patient registration, visit creation, appointments, queue
    PHARMACIST   → dispense prescriptions, OTC sales, stock management
    LAB_TECH     → process lab orders, enter results, imaging
    CASHIER      → payments, cashier sessions, receipts
    PROCUREMENT  → purchase requests, POs, GRNs, suppliers
    ACCOUNTANT   → finance reports, payment logs, eTIMS invoices
    INSURANCE    → insurance claims approval/rejection, SHA
    HR           → QR attendance, leave management, staff records
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


# ── Role string constants ──────────────────────────────────────────────────────

ADMIN         = 'ADMIN'
DOCTOR        = 'DOCTOR'
NURSE         = 'NURSE'
RECEPTIONIST  = 'RECEPTIONIST'
PHARMACIST    = 'PHARMACIST'
LAB_TECH      = 'LAB_TECH'
CASHIER       = 'CASHIER'
PROCUREMENT   = 'PROCUREMENT'
ACCOUNTANT    = 'ACCOUNTANT'
INSURANCE     = 'INSURANCE'
HR            = 'HR'

ALL_ROLES = (ADMIN, DOCTOR, NURSE, RECEPTIONIST, PHARMACIST,
             LAB_TECH, CASHIER, PROCUREMENT, ACCOUNTANT, INSURANCE, HR)

CLINICAL_ROLES  = (ADMIN, DOCTOR, NURSE)
FINANCE_ROLES   = (ADMIN, CASHIER, ACCOUNTANT)
INSURANCE_ROLES = (ADMIN, INSURANCE, ACCOUNTANT)


# ── Internal helper ───────────────────────────────────────────────────────────

def _is(request, *roles):
    """Return True if the authenticated user's user_type is in *roles."""
    return (
        request.user is not None
        and request.user.is_authenticated
        and getattr(request.user, 'user_type', None) in roles
    )


# ════════════════════════════════════════════════════════════════════════════════
# SINGLE-ROLE PERMISSIONS
# ════════════════════════════════════════════════════════════════════════════════

class IsAdmin(BasePermission):
    """Only ADMIN users."""
    message = 'Administrator access required.'

    def has_permission(self, request, view):
        return _is(request, ADMIN)


class IsAdminOrReadOnly(BasePermission):
    """ADMIN: full CRUD. Any authenticated user: read-only."""
    message = 'Administrator access required for write operations.'

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return _is(request, ADMIN)


class IsDoctor(BasePermission):
    message = 'Doctor access required.'

    def has_permission(self, request, view):
        return _is(request, DOCTOR, ADMIN)


class IsNurse(BasePermission):
    message = 'Nurse access required.'

    def has_permission(self, request, view):
        return _is(request, NURSE, ADMIN)


class IsReceptionist(BasePermission):
    message = 'Receptionist access required.'

    def has_permission(self, request, view):
        return _is(request, RECEPTIONIST, ADMIN)


class IsPharmacist(BasePermission):
    message = 'Pharmacist access required.'

    def has_permission(self, request, view):
        return _is(request, PHARMACIST, ADMIN)


class IsLabTechnician(BasePermission):
    message = 'Lab Technician access required.'

    def has_permission(self, request, view):
        return _is(request, LAB_TECH, ADMIN)


class IsCashier(BasePermission):
    message = 'Cashier access required.'

    def has_permission(self, request, view):
        return _is(request, CASHIER, ADMIN)


class IsProcurement(BasePermission):
    message = 'Procurement Officer access required.'

    def has_permission(self, request, view):
        return _is(request, PROCUREMENT, ADMIN)


class IsAccountant(BasePermission):
    message = 'Accountant access required.'

    def has_permission(self, request, view):
        return _is(request, ACCOUNTANT, ADMIN)


class IsInsuranceOfficer(BasePermission):
    message = 'Claims Officer access required.'

    def has_permission(self, request, view):
        return _is(request, INSURANCE, ADMIN)


class IsHR(BasePermission):
    message = 'HR Officer access required.'

    def has_permission(self, request, view):
        return _is(request, HR, ADMIN)


# ════════════════════════════════════════════════════════════════════════════════
# COMPOSITE PERMISSIONS
# ════════════════════════════════════════════════════════════════════════════════

class IsAnyAuthenticatedStaff(BasePermission):
    """Any hospital staff member with a valid user_type."""
    message = 'Hospital staff authentication required.'

    def has_permission(self, request, view):
        return _is(request, *ALL_ROLES)


class IsClinicalStaff(BasePermission):
    """DOCTOR, NURSE, or ADMIN."""
    message = 'Clinical staff access required.'

    def has_permission(self, request, view):
        return _is(request, DOCTOR, NURSE, ADMIN)


class IsInpatientStaff(BasePermission):
    """DOCTOR, NURSE, or ADMIN — inpatient ward management."""
    message = 'Inpatient clinical staff access required.'

    def has_permission(self, request, view):
        return _is(request, DOCTOR, NURSE, ADMIN)


class IsPharmacyStaff(BasePermission):
    """PHARMACIST, CASHIER (OTC counter), or ADMIN."""
    message = 'Pharmacy staff access required.'

    def has_permission(self, request, view):
        return _is(request, PHARMACIST, CASHIER, ADMIN)


class IsLabOrDoctor(BasePermission):
    """LAB_TECH (process), DOCTOR (order/read), or ADMIN."""
    message = 'Laboratory staff or Doctor access required.'

    def has_permission(self, request, view):
        return _is(request, LAB_TECH, DOCTOR, ADMIN)


class IsFinanceStaff(BasePermission):
    """CASHIER, ACCOUNTANT, or ADMIN."""
    message = 'Finance staff access required.'

    def has_permission(self, request, view):
        return _is(request, CASHIER, ACCOUNTANT, ADMIN)


class IsInsuranceOrFinance(BasePermission):
    """INSURANCE, CASHIER, ACCOUNTANT, or ADMIN."""
    message = 'Insurance or Finance staff access required.'

    def has_permission(self, request, view):
        return _is(request, INSURANCE, CASHIER, ACCOUNTANT, ADMIN)


class IsProcurementOrAdmin(BasePermission):
    """PROCUREMENT or ADMIN."""
    message = 'Procurement staff access required.'

    def has_permission(self, request, view):
        return _is(request, PROCUREMENT, ADMIN)


class IsHROrAdmin(BasePermission):
    """HR or ADMIN."""
    message = 'HR staff access required.'

    def has_permission(self, request, view):
        return _is(request, HR, ADMIN)


class IsRegistrationStaff(BasePermission):
    """RECEPTIONIST or ADMIN."""
    message = 'Registration staff access required.'

    def has_permission(self, request, view):
        return _is(request, RECEPTIONIST, ADMIN)


# ════════════════════════════════════════════════════════════════════════════════
# READ / WRITE SPLIT PERMISSIONS
# ════════════════════════════════════════════════════════════════════════════════

class CanReadPatientData(BasePermission):
    """
    Clinical, pharmacy, lab, and finance roles can read patient records.
    HR and procurement staff cannot access patient data.
    """
    message = 'You do not have read access to patient records.'

    _readers = (ADMIN, DOCTOR, NURSE, RECEPTIONIST,
                PHARMACIST, LAB_TECH, CASHIER, ACCOUNTANT, INSURANCE)

    def has_permission(self, request, view):
        return _is(request, *self._readers)


class CanWritePatientData(BasePermission):
    """
    Safe methods  → CanReadPatientData roles.
    Write methods → clinical and registration staff only.
    """
    message = 'You do not have write access to patient records.'

    _readers = (ADMIN, DOCTOR, NURSE, RECEPTIONIST,
                PHARMACIST, LAB_TECH, CASHIER, ACCOUNTANT, INSURANCE)
    _writers = (ADMIN, DOCTOR, NURSE, RECEPTIONIST)

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return _is(request, *self._readers)
        return _is(request, *self._writers)


# ════════════════════════════════════════════════════════════════════════════════
# WORKFLOW / ACTION-SPECIFIC PERMISSIONS
# ════════════════════════════════════════════════════════════════════════════════

class CanApprovePR(BasePermission):
    """
    Purchase Request approval pipeline guard.
    Step validation (HOD / Accountant / Procurement) is enforced in the view.
    This class ensures only relevant roles reach the endpoint.
    """
    message = 'You are not authorised to approve purchase requests.'

    def has_permission(self, request, view):
        return _is(request, ADMIN, ACCOUNTANT, PROCUREMENT)


class CanApproveLeave(BasePermission):
    """HR or ADMIN for final leave approval."""
    message = 'You are not authorised to approve leave applications.'

    def has_permission(self, request, view):
        return _is(request, HR, ADMIN)


class CanApproveMedicineRequest(BasePermission):
    """DOCTOR or PHARMACIST approves inpatient medicine requests."""
    message = 'Only Doctors or Pharmacists can approve medicine requests.'

    def has_permission(self, request, view):
        return _is(request, DOCTOR, PHARMACIST, ADMIN)


class CanSubmitSHAClaim(BasePermission):
    """INSURANCE or ACCOUNTANT can submit/verify SHA claims."""
    message = 'SHA claim submission requires Insurance Officer or Accountant role.'

    def has_permission(self, request, view):
        return _is(request, INSURANCE, ACCOUNTANT, ADMIN)


class CanManageeTIMS(BasePermission):
    """Only ACCOUNTANT and ADMIN can manage eTIMS invoices and configuration."""
    message = 'eTIMS management requires Accountant or Administrator role.'

    def has_permission(self, request, view):
        return _is(request, ACCOUNTANT, ADMIN)


# ════════════════════════════════════════════════════════════════════════════════
# OBJECT-LEVEL PERMISSIONS
# ════════════════════════════════════════════════════════════════════════════════

class IsOwnerOrAdmin(BasePermission):
    """
    Object-level: user can only access their own records, or ADMIN can access all.
    Looks for a 'user' or 'cashier' FK on the model instance.
    Used for: Attendance, LeaveApplication, CashierSession, UserSession.
    """
    message = 'You can only access your own records.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if _is(request, ADMIN):
            return True
        owner = getattr(obj, 'user', None) or getattr(obj, 'cashier', None)
        return owner == request.user


class IsOwnerOrClinical(BasePermission):
    """
    Object-level: owner or any clinical staff member.
    Used for patient-facing records.
    """
    message = 'Access restricted to the record owner or clinical staff.'

    _clinical = (ADMIN, DOCTOR, NURSE, RECEPTIONIST)

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if _is(request, *self._clinical):
            return True
        owner = getattr(obj, 'user', None)
        return owner == request.user


class IsAssignedDoctorOrAdmin(BasePermission):
    """
    Object-level: only the doctor assigned to a visit/consultation can modify it.
    Read access is granted to all clinical staff.
    Used for: PatientVisit, Consultation.
    """
    message = 'Only the assigned doctor or an administrator can modify this record.'

    def has_permission(self, request, view):
        return _is(request, DOCTOR, NURSE, ADMIN, RECEPTIONIST)

    def has_object_permission(self, request, view, obj):
        # Safe methods — any clinical staff
        if request.method in SAFE_METHODS:
            return _is(request, DOCTOR, NURSE, ADMIN, RECEPTIONIST)
        # Write methods — admin override
        if _is(request, ADMIN):
            return True
        # Resolve the assigned doctor from PatientVisit or Consultation
        assigned = (
            getattr(obj, 'assigned_doctor', None)
            or getattr(getattr(obj, 'appointment', None), 'doctor', None)
        )
        if assigned is None:
            return _is(request, DOCTOR)
        # Doctor model has a 'user' OneToOne; User assigned directly is also valid
        doctor_user = getattr(assigned, 'user', None)
        return doctor_user == request.user or assigned == request.user