"""
AFYA1 HMIS — views.py
South B Hospital Management Information System
All ViewSets and API views.
"""

from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    User, Patient, Doctor, Nurse,
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
from .serializers import (
    AuthTokenSerializer,
    UserSerializer, UserCreateSerializer, UserListSerializer,
    PatientSerializer, PatientListSerializer,
    DoctorSerializer, DoctorListSerializer,
    NurseSerializer, NurseListSerializer,
    InsuranceProviderSerializer, SpecializedServiceSerializer,
    DiseaseSerializer, ClinicSettingsSerializer,
    TriageCategorySerializer,
    PatientVisitSerializer, PatientVisitCreateSerializer,
    TriageAssessmentSerializer, QueueManagementSerializer,
    AppointmentSerializer, ConsultationSerializer,
    ConsultationDiagnosisSerializer, PatientMedicalHistorySerializer,
    ICD10CodeSerializer, ICD10CodeSearchSerializer, ICD10CategorySerializer,
    MedicineCategorySerializer, MedicineSerializer, MedicineListSerializer,
    StockMovementSerializer, PrescriptionSerializer,
    OverTheCounterSaleSerializer, OverTheCounterSaleItemSerializer,
    LabTestCategorySerializer, LabTestSerializer,
    LabOrderSerializer, LabOrderItemSerializer, LabResultSerializer,
    ImagingStudySerializer,
    WardSerializer, BedSerializer,
    InpatientAdmissionSerializer, InpatientDailyChargeSerializer,
    InpatientVitalsSerializer, InpatientMedicineRequestSerializer,
    EmergencyBedSerializer, EmergencyVisitSerializer,
    EmergencyChargeSerializer, EmergencyPaymentSerializer,
    MaternityVisitSerializer, MCHVisitSerializer,
    SupplierSerializer,
    PurchaseRequestSerializer, PurchaseRequestItemSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer,
    GoodsReceivedNoteSerializer, GoodsReceivedNoteItemSerializer,
    ConsultationInsuranceClaimSerializer,
    PharmacyInsuranceClaimSerializer,
    InpatientInsuranceClaimSerializer,
    SHAMemberSerializer, SHAClaimSerializer,
    PaymentAuditLogSerializer, CashierSessionSerializer,
    eTIMSConfigurationSerializer, eTIMSInvoiceSerializer, eTIMSInvoiceItemSerializer,
    HospitalWiFiNetworkSerializer, AttendanceQRCodeSerializer,
    AttendanceSerializer, LeaveTypeSerializer, LeaveApplicationSerializer,
    HospitalAssetSerializer, AssetMaintenanceLogSerializer,
    AuditLogSerializer, SecurityThreatSerializer,
    NotificationSerializer, ConversationSerializer, MessageSerializer,
    DashboardStatsSerializer,
)
# ─── Fix: import F for annotation use in low_stock action ─────────────────────
from django.db.models import F as models_F
from .permissions import (
    IsAdmin, IsAdminOrReadOnly,
    IsDoctor, IsNurse, IsClinicalStaff,
    IsReceptionist, IsPharmacist, IsLabTechnician,
    IsCashier, IsProcurement, IsAccountant, IsInsuranceOfficer, IsHR,
    IsPharmacyStaff, IsLabOrDoctor, IsInpatientStaff,
    IsFinanceStaff, IsInsuranceOrFinance,
    IsProcurementOrAdmin, IsHROrAdmin,
    IsAnyAuthenticatedStaff,
    CanApprovePR, CanApproveLeave, CanApproveMedicineRequest,
    CanSubmitSHAClaim, CanManageeTIMS,
    CanReadPatientData, CanWritePatientData,
)

User = get_user_model()


# ============================================================
# AUTH
# ============================================================

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def login(self, request):
        serializer = AuthTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })

    @action(detail=False, methods=['post'])
    def refresh(self, request):
        token = request.data.get('refresh')
        if not token:
            return Response({'detail': 'Refresh token required.'}, status=400)
        try:
            refresh = RefreshToken(token)
            return Response({'access': str(refresh.access_token)})
        except TokenError as e:
            return Response({'detail': str(e)}, status=401)

    @action(detail=False, methods=['post'])
    def logout(self, request):
        token = request.data.get('refresh')
        if token:
            try:
                RefreshToken(token).blacklist()
            except TokenError:
                pass
        return Response({'detail': 'Logged out successfully.'})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user).data)


# ============================================================
# USERS
# ============================================================

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['user_type', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action == 'list':
            return UserListSerializer
        return UserSerializer

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'detail': f'{user.username} deactivated.'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'detail': f'{user.username} activated.'})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password')
        if not password or len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=400)
        user.set_password(password)
        user.save()
        return Response({'detail': 'Password reset successfully.'})


# ============================================================
# PATIENTS
# ============================================================

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated, CanReadPatientData]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['gender']
    search_fields = ['first_name', 'last_name', 'phone_number', 'id_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), CanWritePatientData()]
        if self.action == 'destroy':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), CanReadPatientData()]

    @action(detail=True, methods=['get'])
    def visits(self, request, pk=None):
        patient = self.get_object()
        visits = PatientVisit.objects.filter(patient=patient).order_by('-arrival_time')
        serializer = PatientVisitSerializer(visits, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def prescriptions(self, request, pk=None):
        patient = self.get_object()
        prescriptions = Prescription.objects.filter(
            consultation__appointment__patient=patient
        ).order_by('-prescribed_at')
        serializer = PrescriptionSerializer(prescriptions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def medical_history(self, request, pk=None):
        patient = self.get_object()
        history = PatientMedicalHistory.objects.filter(patient=patient).order_by('-date_recorded')
        serializer = PatientMedicalHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def sha_status(self, request, pk=None):
        patient = self.get_object()
        try:
            member = patient.sha_member
            return Response(SHAMemberSerializer(member).data)
        except SHAMember.DoesNotExist:
            return Response({'detail': 'Patient is not a SHA member.'}, status=404)

    @action(detail=True, methods=['get'])
    def lab_orders(self, request, pk=None):
        patient = self.get_object()
        orders = LabOrder.objects.filter(patient=patient).order_by('-ordered_at')
        serializer = LabOrderSerializer(orders, many=True)
        return Response(serializer.data)


# ============================================================
# DOCTORS & NURSES
# ============================================================

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['specialization', 'is_active', 'department']
    search_fields = ['first_name', 'last_name', 'license_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return DoctorListSerializer
        return DoctorSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsAnyAuthenticatedStaff()]


class NurseViewSet(viewsets.ModelViewSet):
    queryset = Nurse.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['department', 'nurse_type', 'is_active']
    search_fields = ['first_name', 'last_name', 'nurse_id']

    def get_serializer_class(self):
        if self.action == 'list':
            return NurseListSerializer
        return NurseSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsAnyAuthenticatedStaff()]


# ============================================================
# LOOKUPS
# ============================================================

class InsuranceProviderViewSet(viewsets.ModelViewSet):
    queryset = InsuranceProvider.objects.filter(is_active=True)
    serializer_class = InsuranceProviderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]


class SpecializedServiceViewSet(viewsets.ModelViewSet):
    queryset = SpecializedService.objects.all()
    serializer_class = SpecializedServiceSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]


class DiseaseViewSet(viewsets.ModelViewSet):
    queryset = Disease.objects.all()
    serializer_class = DiseaseSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'icd_code']


class ClinicSettingsViewSet(viewsets.ModelViewSet):
    queryset = ClinicSettings.objects.all()
    serializer_class = ClinicSettingsSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self):
        # Singleton pattern — always return first object or 404
        return get_object_or_404(ClinicSettings, pk=1)


class TriageCategoryViewSet(viewsets.ModelViewSet):
    queryset = TriageCategory.objects.filter(is_active=True).order_by('priority_level')
    serializer_class = TriageCategorySerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]


# ============================================================
# ICD-10
# ============================================================

class ICD10CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ICD10Category.objects.filter(is_active=True).order_by('chapter_number')
    serializer_class = ICD10CategorySerializer
    permission_classes = [IsAuthenticated, IsClinicalStaff]
    filter_backends = [filters.SearchFilter]
    search_fields = ['category_name', 'code_range']


class ICD10CodeViewSet(viewsets.ModelViewSet):
    queryset = ICD10Code.objects.filter(is_active=True).order_by('code')
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['nhif_eligible', 'sha_covered', 'is_notifiable', 'is_common']
    search_fields = ['code', 'short_description', 'description', 'local_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ICD10CodeSearchSerializer
        return ICD10CodeSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsAnyAuthenticatedStaff()]

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Fast autocomplete endpoint for consultation diagnosis input."""
        query = request.query_params.get('q', '')
        if len(query) < 2:
            return Response([])
        qs = ICD10Code.objects.filter(
            Q(code__icontains=query) | Q(short_description__icontains=query),
            is_active=True
        ).order_by('-is_common', '-usage_count')[:20]
        return Response(ICD10CodeSearchSerializer(qs, many=True).data)


# ============================================================
# VISITS, TRIAGE & QUEUE
# ============================================================

# backend/core/views.py - Complete updated PatientVisitViewSet

# backend/core/views.py - Complete updated PatientVisitViewSet

class PatientVisitViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing patient visits with triage, queue assignment, and status updates.
    
    Features:
    - Auto-saves the nurse who performed triage
    - Auto-creates consultation queue entry after triage
    - Status transition validation
    - Complete visit timeline
    """
    queryset = PatientVisit.objects.select_related(
        'patient', 'assigned_doctor', 'assigned_nurse',
        'insurance_provider', 'specialized_service', 'registered_by'
    ).order_by('-arrival_time')
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'visit_type', 'assigned_doctor']
    search_fields = ['visit_number', 'patient__first_name', 'patient__last_name',
                     'patient__phone_number']

    def get_serializer_class(self):
        if self.action == 'create':
            return PatientVisitCreateSerializer
        return PatientVisitSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(arrival_time__date=date)
        today = self.request.query_params.get('today')
        if today:
            qs = qs.filter(arrival_time__date=timezone.now().date())
        # Filter by triage status
        triaged = self.request.query_params.get('triaged')
        if triaged == 'true':
            qs = qs.filter(triage__isnull=False)
        elif triaged == 'false':
            qs = qs.filter(triage__isnull=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsNurse])
    def triage(self, request, pk=None):
        """
        POST /api/visits/{id}/triage/
        Submit triage assessment for a visit.
        
        This automatically:
        1. Saves the nurse who performed triage (assessed_by)
        2. Updates visit status to 'TRIAGED'
        3. Creates a consultation queue entry for the patient
        4. Updates visit status to 'WAITING' for doctor to see
        """
        visit = self.get_object()
        
        # Prevent duplicate triage
        if hasattr(visit, 'triage'):
            return Response(
                {'detail': 'Triage already completed for this visit.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = request.data.copy()
        data['visit'] = visit.id
        
        # Auto-save the nurse who performed triage
        try:
            nurse_profile = request.user.nurse_profile
            data['assessed_by'] = nurse_profile.id
        except (AttributeError, Nurse.DoesNotExist):
            try:
                nurse = Nurse.objects.get(user=request.user)
                data['assessed_by'] = nurse.id
            except Nurse.DoesNotExist:
                return Response(
                    {'detail': 'Nurse profile not found for this user.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate and save triage assessment
        serializer = TriageAssessmentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        triage = serializer.save()
        
        # Update visit status to TRIAGED
        visit.status = 'TRIAGED'
        visit.triage_time = timezone.now()
        
        # If doctor was assigned in the request, update it
        assigned_doctor = request.data.get('assigned_doctor')
        if assigned_doctor:
            try:
                doctor = Doctor.objects.get(id=assigned_doctor)
                visit.assigned_doctor = doctor
            except Doctor.DoesNotExist:
                pass
        
        visit.save(update_fields=['status', 'triage_time', 'assigned_doctor'])
        
        # --- AUTO-CREATE CONSULTATION QUEUE ENTRY ---
        # Get next queue number for CONSULTATION department today
        today = timezone.now().date()
        last_queue = QueueManagement.objects.filter(
            department='CONSULTATION',
            created_at__date=today
        ).order_by('-queue_number').first()
        
        queue_number = (last_queue.queue_number + 1) if last_queue else 1
        
        # Create queue entry
        queue_entry = QueueManagement.objects.create(
            visit=visit,
            department='CONSULTATION',
            queue_number=queue_number,
            priority_override=request.data.get('requires_immediate_attention', False),
            joined_queue=timezone.now(),
            is_active=True,
            is_serving=False,
            is_completed=False
        )
        
        # Update visit status to WAITING (so doctor can see in queue)
        visit.status = 'WAITING'
        visit.save(update_fields=['status'])
        
        return Response({
            'triage': TriageAssessmentSerializer(triage).data,
            'queue_entry': QueueManagementSerializer(queue_entry).data,
            'message': 'Triage completed. Patient added to consultation queue.'
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyAuthenticatedStaff])
    def assign_queue(self, request, pk=None):
        """
        POST /api/visits/{id}/assign-queue/
        Add patient to a department queue.
        Expected payload: { "department": "CONSULTATION" }
        """
        visit = self.get_object()
        department = request.data.get('department')
        
        if not department:
            return Response(
                {'detail': 'Department is required. Valid options: TRIAGE, CONSULTATION, LABORATORY, PHARMACY, RADIOLOGY, PROCEDURE, ADMISSION'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate department
        valid_departments = ['TRIAGE', 'CONSULTATION', 'LABORATORY', 'PHARMACY', 'RADIOLOGY', 'PROCEDURE', 'ADMISSION']
        if department not in valid_departments:
            return Response(
                {'detail': f'Invalid department. Valid options: {valid_departments}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already in queue for this department
        existing = QueueManagement.objects.filter(
            visit=visit, 
            department=department, 
            is_completed=False
        ).first()
        if existing:
            return Response(
                {'detail': f'Patient already in {department} queue.', 'queue_entry': QueueManagementSerializer(existing).data},
                status=status.HTTP_200_OK
            )
        
        # Get next queue number for this department today
        today = timezone.now().date()
        last = QueueManagement.objects.filter(
            department=department,
            created_at__date=today
        ).order_by('-queue_number').first()
        queue_number = (last.queue_number + 1) if last else 1
        
        # Create queue entry
        queue = QueueManagement.objects.create(
            visit=visit,
            department=department,
            queue_number=queue_number,
            priority_override=request.data.get('priority_override', False),
            joined_queue=timezone.now()
        )
        
        # Update visit status if needed
        if department == 'CONSULTATION' and visit.status == 'TRIAGED':
            visit.status = 'WAITING'
            visit.save(update_fields=['status'])
        
        return Response(
            QueueManagementSerializer(queue).data, 
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyAuthenticatedStaff])
    def update_status(self, request, pk=None):
        """
        POST /api/visits/{id}/update-status/
        Update visit status.
        Expected payload: { "status": "IN_CONSULTATION" }
        """
        visit = self.get_object()
        new_status = request.data.get('status')
        
        valid = [s[0] for s in PatientVisit.STATUS_CHOICES]
        if new_status not in valid:
            return Response(
                {'detail': f'Invalid status. Valid: {valid}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Status transition validation
        current = visit.status
        valid_transitions = {
            'REGISTERED': ['TRIAGED', 'CANCELLED'],
            'TRIAGED': ['WAITING', 'ADMITTED', 'CANCELLED'],
            'WAITING': ['IN_CONSULTATION', 'CANCELLED'],
            'IN_CONSULTATION': ['COMPLETED', 'ADMITTED', 'REFERRED'],
            'IN_TREATMENT': ['COMPLETED', 'ADMITTED'],
            'COMPLETED': [],
            'ADMITTED': ['DISCHARGED'],
            'REFERRED': [],
            'CANCELLED': []
        }
        
        if new_status not in valid_transitions.get(current, []):
            return Response(
                {'detail': f'Cannot transition from {current} to {new_status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update timestamps
        if new_status == 'IN_CONSULTATION':
            visit.consultation_start = timezone.now()
        elif new_status == 'COMPLETED':
            visit.consultation_end = timezone.now()
            visit.discharge_time = timezone.now()
        
        visit.status = new_status
        visit.save()
        
        # If completed, mark queue entries as completed
        if new_status == 'COMPLETED':
            QueueManagement.objects.filter(visit=visit, is_completed=False).update(
                is_completed=True,
                is_active=False,
                service_end=timezone.now()
            )
        
        return Response(PatientVisitSerializer(visit).data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, IsAnyAuthenticatedStaff])
    def queue_status(self, request, pk=None):
        """
        GET /api/visits/{id}/queue-status/
        Get all queue entries for this visit.
        """
        visit = self.get_object()
        queue_entries = QueueManagement.objects.filter(visit=visit).order_by('joined_queue')
        return Response(QueueManagementSerializer(queue_entries, many=True).data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, IsAnyAuthenticatedStaff])
    def timeline(self, request, pk=None):
        """
        GET /api/visits/{id}/timeline/
        Get complete timeline of the visit (registration, triage, consultations, etc.)
        """
        visit = self.get_object()
        
        timeline = []
        
        # Registration
        timeline.append({
            'event': 'Registration',
            'timestamp': visit.created_at.isoformat(),
            'details': f'Registered by {visit.registered_by.get_full_name() if visit.registered_by else "System"}'
        })
        
        # Triage
        if hasattr(visit, 'triage'):
            timeline.append({
                'event': 'Triage',
                'timestamp': visit.triage.assessment_time.isoformat(),
                'details': f'Category: {visit.triage.category.name}, Pain Score: {visit.triage.pain_score}/10'
            })
        
        # Queue entries
        queue_entries = QueueManagement.objects.filter(visit=visit).order_by('joined_queue')
        for queue in queue_entries:
            timeline.append({
                'event': f'Queue Entry - {queue.get_department_display()}',
                'timestamp': queue.joined_queue.isoformat(),
                'details': f'Queue #{queue.queue_number}, Called: {queue.called_time.isoformat() if queue.called_time else "Pending"}'
            })
        
        # Consultation
        if hasattr(visit, 'consultation'):
            timeline.append({
                'event': 'Consultation',
                'timestamp': visit.consultation.created_at.isoformat(),
                'details': f'Diagnosis: {visit.consultation.diagnosis[:100]}...'
            })
        
        # Completion
        if visit.status == 'COMPLETED':
            timeline.append({
                'event': 'Visit Completed',
                'timestamp': visit.discharge_time.isoformat() if visit.discharge_time else timezone.now().isoformat(),
                'details': 'Patient discharged'
            })
        
        return Response(timeline)


class QueueManagementViewSet(viewsets.ModelViewSet):
    queryset = QueueManagement.objects.filter(is_active=True).order_by(
        '-priority_override', 'queue_number'
    )
    serializer_class = QueueManagementSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['department', 'is_active', 'is_serving', 'is_completed']

    def get_queryset(self):
        qs = super().get_queryset()
        department = self.request.query_params.get('department')
        if department:
            qs = qs.filter(department=department, is_completed=False)
        return qs

    @action(detail=True, methods=['post'])
    def call(self, request, pk=None):
        queue_entry = self.get_object()
        queue_entry.called_time = timezone.now()
        queue_entry.is_serving = True
        queue_entry.serving_staff = request.user
        queue_entry.save()
        return Response(QueueManagementSerializer(queue_entry).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        queue_entry = self.get_object()
        queue_entry.service_end = timezone.now()
        queue_entry.is_serving = False
        queue_entry.is_completed = True
        queue_entry.is_active = False
        queue_entry.save()
        return Response(QueueManagementSerializer(queue_entry).data)


# ============================================================
# APPOINTMENTS & CONSULTATIONS
# ============================================================

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related(
        'patient', 'doctor', 'receptionist'
    ).order_by('scheduled_time')
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'doctor']
    search_fields = ['patient__first_name', 'patient__last_name']

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(scheduled_time__date=date)
        today = self.request.query_params.get('today')
        if today:
            qs = qs.filter(scheduled_time__date=timezone.now().date())
        doctor = self.request.query_params.get('my')
        if doctor and self.request.user.user_type == 'DOCTOR':
            qs = qs.filter(doctor=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(receptionist=self.request.user)


class ConsultationViewSet(viewsets.ModelViewSet):
    queryset = Consultation.objects.select_related(
        'appointment__patient', 'appointment__doctor'
    ).order_by('-created_at')
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticated, IsClinicalStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['consultation_code', 'appointment__patient__first_name',
                     'appointment__patient__last_name']

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsDoctor])
    def add_diagnosis(self, request, pk=None):
        consultation = self.get_object()
        data = request.data.copy()
        data['consultation'] = consultation.id
        data['created_by'] = request.user.id
        serializer = ConsultationDiagnosisSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        diagnosis = serializer.save()
        return Response(ConsultationDiagnosisSerializer(diagnosis).data, status=201)

    @action(detail=True, methods=['get'])
    def prescriptions(self, request, pk=None):
        consultation = self.get_object()
        prescriptions = Prescription.objects.filter(consultation=consultation)
        return Response(PrescriptionSerializer(prescriptions, many=True).data)

    @action(detail=True, methods=['get'])
    def lab_orders(self, request, pk=None):
        consultation = self.get_object()
        orders = LabOrder.objects.filter(consultation=consultation)
        return Response(LabOrderSerializer(orders, many=True).data)


class ConsultationDiagnosisViewSet(viewsets.ModelViewSet):
    queryset = ConsultationDiagnosis.objects.all().order_by('-created_at')
    serializer_class = ConsultationDiagnosisSerializer
    permission_classes = [IsAuthenticated, IsDoctor]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['consultation', 'diagnosis_type', 'certainty']


# ============================================================
# PHARMACY & MEDICINES
# ============================================================

class MedicineCategoryViewSet(viewsets.ModelViewSet):
    queryset = MedicineCategory.objects.all()
    serializer_class = MedicineCategorySerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]


class MedicineViewSet(viewsets.ModelViewSet):
    queryset = Medicine.objects.select_related('category').order_by('name')
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['unit_type', 'category']
    search_fields = ['name', 'manufacturer', 'batch_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return MedicineListSerializer
        return MedicineSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsPharmacist()]
        return [IsAuthenticated(), IsAnyAuthenticatedStaff()]

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        medicines = Medicine.objects.filter(
            quantity_in_stock__lte=models_F('reorder_level')
        ).order_by('quantity_in_stock')
        return Response(MedicineSerializer(medicines, many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsPharmacist])
    def adjust_stock(self, request, pk=None):
        medicine = self.get_object()
        qty = request.data.get('quantity')
        reason = request.data.get('reason', '')
        movement_type = request.data.get('movement_type', 'ADJUSTMENT')
        if qty is None:
            return Response({'detail': 'quantity is required.'}, status=400)
        qty = int(qty)
        prev = medicine.quantity_in_stock
        medicine.quantity_in_stock += qty
        if medicine.quantity_in_stock < 0:
            return Response({'detail': 'Stock cannot go negative.'}, status=400)
        medicine.save()
        StockMovement.objects.create(
            medicine=medicine, movement_type=movement_type,
            quantity=qty, previous_quantity=prev,
            new_quantity=medicine.quantity_in_stock,
            reason=reason, performed_by=request.user
        )
        return Response(MedicineSerializer(medicine).data)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.select_related('medicine').order_by('-created_at')
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated, IsPharmacyStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['medicine', 'movement_type']


class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.select_related(
        'consultation__appointment__patient', 'medicine'
    ).order_by('-prescribed_at')
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_dispensed', 'consultation', 'is_insured']

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsDoctor()]
        return [IsAuthenticated(), IsAnyAuthenticatedStaff()]

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsPharmacist])
    def dispense(self, request, pk=None):
        prescription = self.get_object()
        if prescription.is_dispensed:
            return Response({'detail': 'Already dispensed.'}, status=400)
        try:
            prescription.dispense(request.user)
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        return Response(PrescriptionSerializer(prescription).data)


class OverTheCounterSaleViewSet(viewsets.ModelViewSet):
    queryset = OverTheCounterSale.objects.prefetch_related('items').order_by('-created_at')
    serializer_class = OverTheCounterSaleSerializer
    permission_classes = [IsAuthenticated, IsPharmacyStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['payment_status', 'is_dispensed', 'cashier']

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(created_at__date=date)
        today = self.request.query_params.get('today')
        if today:
            qs = qs.filter(created_at__date=timezone.now().date())
        return qs

    def perform_create(self, serializer):
        serializer.save(cashier=self.request.user)

    @action(detail=True, methods=['post'])
    def dispense(self, request, pk=None):
        sale = self.get_object()
        if sale.is_dispensed:
            return Response({'detail': 'Already dispensed.'}, status=400)
        if sale.payment_status != 'completed':
            return Response({'detail': 'Payment must be completed first.'}, status=400)
        # Deduct stock for each item
        for item in sale.items.all():
            if item.quantity > item.medicine.quantity_in_stock:
                return Response(
                    {'detail': f'Insufficient stock for {item.medicine.name}.'},
                    status=400
                )
        for item in sale.items.all():
            prev = item.medicine.quantity_in_stock
            item.medicine.quantity_in_stock -= item.quantity
            item.medicine.save()
            StockMovement.objects.create(
                medicine=item.medicine, movement_type='SALE',
                quantity=-item.quantity, previous_quantity=prev,
                new_quantity=item.medicine.quantity_in_stock,
                reason=f"OTC Sale {sale.sale_id}",
                performed_by=request.user
            )
        sale.is_dispensed = True
        sale.dispensed_at = timezone.now()
        sale.dispensed_by = request.user
        sale.save()
        return Response(OverTheCounterSaleSerializer(sale).data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        sale = self.get_object()
        mpesa_code = request.data.get('mpesa_code', '')
        if mpesa_code and MPesaDuplicateCheck.objects.filter(mpesa_code=mpesa_code).exists():
            return Response({'detail': 'M-Pesa code already used.'}, status=400)
        sale.payment_status = 'completed'
        sale.mpesa_code = mpesa_code or sale.mpesa_code
        sale.save()
        return Response(OverTheCounterSaleSerializer(sale).data)


# ============================================================
# LABORATORY & IMAGING
# ============================================================

class LabTestCategoryViewSet(viewsets.ModelViewSet):
    queryset = LabTestCategory.objects.filter(is_active=True)
    serializer_class = LabTestCategorySerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]


class LabTestViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.filter(is_active=True).order_by('test_name')
    serializer_class = LabTestSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'sample_type', 'nhif_covered', 'sha_covered']
    search_fields = ['test_code', 'test_name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsAnyAuthenticatedStaff()]


class LabOrderViewSet(viewsets.ModelViewSet):
    queryset = LabOrder.objects.select_related(
        'patient', 'consultation', 'ordered_by', 'assigned_to'
    ).prefetch_related('test_items__test').order_by('-ordered_at')
    serializer_class = LabOrderSerializer
    permission_classes = [IsAuthenticated, IsLabOrDoctor]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'priority', 'paid', 'patient']
    search_fields = ['order_number', 'patient__first_name', 'patient__last_name']

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(ordered_at__date=date)
        today = self.request.query_params.get('today')
        if today:
            qs = qs.filter(ordered_at__date=timezone.now().date())
        return qs

    def perform_create(self, serializer):
        serializer.save(ordered_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsLabTechnician])
    def collect_sample(self, request, pk=None):
        order = self.get_object()
        order.status = 'SAMPLE_COLLECTED'
        order.sample_collected_at = timezone.now()
        order.assigned_to = request.user
        order.save()
        # Update all items
        order.test_items.all().update(status='SAMPLE_COLLECTED')
        return Response(LabOrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsLabTechnician])
    def enter_results(self, request, pk=None):
        order = self.get_object()
        items_data = request.data.get('items', [])
        for item_data in items_data:
            item_id = item_data.get('id')
            try:
                item = order.test_items.get(pk=item_id)
                item.result_value = item_data.get('result_value', '')
                item.result_unit = item_data.get('result_unit', '')
                item.is_abnormal = item_data.get('is_abnormal', False)
                item.notes = item_data.get('notes', '')
                item.performed_by = request.user
                item.status = 'COMPLETED'
                item.save()
            except LabOrderItem.DoesNotExist:
                continue
        order.status = 'COMPLETED'
        order.completed_at = timezone.now()
        order.save()
        # Create or update LabResult
        summary_data = request.data.get('summary', '')
        interpretation = request.data.get('interpretation', '')
        is_critical = request.data.get('is_critical', False)
        result, _ = LabResult.objects.get_or_create(lab_order=order)
        result.summary = summary_data
        result.interpretation = interpretation
        result.is_critical = is_critical
        result.result_by = request.user
        result.save()
        return Response(LabOrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsLabTechnician])
    def release_results(self, request, pk=None):
        order = self.get_object()
        if order.status != 'COMPLETED':
            return Response({'detail': 'Results must be completed before release.'}, status=400)
        order.status = 'REPORTED'
        order.reported_at = timezone.now()
        order.save()
        if hasattr(order, 'result'):
            order.result.result_released_to_patient = True
            order.result.released_at = timezone.now()
            order.result.verified_by = request.user
            order.result.verified_at = timezone.now()
            order.result.patient_notified = True
            order.result.save()
        return Response(LabOrderSerializer(order).data)


class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.select_related('lab_order__patient').order_by('-created_at')
    serializer_class = LabResultSerializer
    permission_classes = [IsAuthenticated, IsLabOrDoctor]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_critical', 'patient_notified', 'result_released_to_patient']


class ImagingStudyViewSet(viewsets.ModelViewSet):
    queryset = ImagingStudy.objects.select_related(
        'patient', 'ordered_by'
    ).order_by('-created_at')
    serializer_class = ImagingStudySerializer
    permission_classes = [IsAuthenticated, IsLabOrDoctor]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['modality', 'status', 'is_urgent', 'patient']
    search_fields = ['study_description', 'body_part']

    def perform_create(self, serializer):
        serializer.save(ordered_by=self.request.user)


# ============================================================
# INPATIENT — WARDS, BEDS, ADMISSIONS
# ============================================================

class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.filter(is_active=True).prefetch_related('beds')
    serializer_class = WardSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ward_type', 'is_active']

    @action(detail=True, methods=['get'])
    def beds(self, request, pk=None):
        ward = self.get_object()
        beds = Bed.objects.filter(ward=ward)
        status_filter = request.query_params.get('status')
        if status_filter:
            beds = beds.filter(status=status_filter)
        return Response(BedSerializer(beds, many=True).data)


class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.select_related('ward').order_by('ward', 'bed_number')
    serializer_class = BedSerializer
    permission_classes = [IsAuthenticated, IsInpatientStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ward', 'status', 'bed_type', 'is_active']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsInpatientStaff()]


class InpatientAdmissionViewSet(viewsets.ModelViewSet):
    queryset = InpatientAdmission.objects.select_related(
        'patient', 'bed__ward', 'admitting_doctor', 'attending_doctor', 'primary_nurse'
    ).prefetch_related('icd10_codes', 'vital_signs', 'daily_charges').order_by('-admission_datetime')
    serializer_class = InpatientAdmissionSerializer
    permission_classes = [IsAuthenticated, IsInpatientStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'admission_type', 'is_insured', 'is_critical']
    search_fields = ['admission_number', 'patient__first_name', 'patient__last_name']

    def get_queryset(self):
        qs = super().get_queryset()
        active = self.request.query_params.get('active')
        if active:
            qs = qs.filter(status='ACTIVE')
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def charges(self, request, pk=None):
        admission = self.get_object()
        charges = InpatientDailyCharge.objects.filter(admission=admission).order_by('-charge_date')
        return Response(InpatientDailyChargeSerializer(charges, many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsDoctor])
    def add_charge(self, request, pk=None):
        admission = self.get_object()
        data = request.data.copy()
        data['admission'] = admission.id
        data['created_by'] = request.user.id
        serializer = InpatientDailyChargeSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        charge = serializer.save()
        return Response(InpatientDailyChargeSerializer(charge).data, status=201)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsNurse])
    def record_vitals(self, request, pk=None):
        admission = self.get_object()
        data = request.data.copy()
        data['admission'] = admission.id
        serializer = InpatientVitalsSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        # Get nurse profile
        try:
            nurse = request.user.nurse_profile
        except Exception:
            nurse = None
        vitals = serializer.save(recorded_by=nurse)
        return Response(InpatientVitalsSerializer(vitals).data, status=201)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsDoctor])
    def discharge(self, request, pk=None):
        admission = self.get_object()
        if admission.status == 'DISCHARGED':
            return Response({'detail': 'Patient already discharged.'}, status=400)
        discharge_summary = request.data.get('discharge_summary', '')
        discharge_diagnosis = request.data.get('discharge_diagnosis', '')
        try:
            doctor = request.user.doctor_profile
        except Exception:
            return Response({'detail': 'Doctor profile not found.'}, status=400)
        admission.discharge(doctor, discharge_summary, discharge_diagnosis)
        return Response(InpatientAdmissionSerializer(admission).data)

    @action(detail=True, methods=['get'])
    def vitals(self, request, pk=None):
        admission = self.get_object()
        vitals = InpatientVitals.objects.filter(admission=admission).order_by('-recorded_at')
        return Response(InpatientVitalsSerializer(vitals, many=True).data)


class InpatientDailyChargeViewSet(viewsets.ModelViewSet):
    queryset = InpatientDailyCharge.objects.select_related('admission__patient').order_by('-created_at')
    serializer_class = InpatientDailyChargeSerializer
    permission_classes = [IsAuthenticated, IsInpatientStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['admission', 'charge_type', 'is_billed', 'is_paid']


class InpatientVitalsViewSet(viewsets.ModelViewSet):
    queryset = InpatientVitals.objects.select_related(
        'admission__patient', 'recorded_by'
    ).order_by('-recorded_at')
    serializer_class = InpatientVitalsSerializer
    permission_classes = [IsAuthenticated, IsInpatientStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['admission']


class InpatientMedicineRequestViewSet(viewsets.ModelViewSet):
    queryset = InpatientMedicineRequest.objects.select_related(
        'admission__patient', 'medicine', 'requested_by'
    ).order_by('-requested_at')
    serializer_class = InpatientMedicineRequestSerializer
    permission_classes = [IsAuthenticated, IsInpatientStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'priority', 'admission']

    def perform_create(self, serializer):
        try:
            nurse = self.request.user.nurse_profile
        except Exception:
            nurse = None
        serializer.save(requested_by=nurse)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveMedicineRequest])
    def approve(self, request, pk=None):
        req = self.get_object()
        if req.status != 'PENDING':
            return Response({'detail': 'Request is not pending.'}, status=400)
        qty_approved = request.data.get('quantity_approved', req.quantity_requested)
        req.status = 'APPROVED'
        req.approved_by = request.user
        req.approved_at = timezone.now()
        req.quantity_approved = qty_approved
        req.save()
        return Response(InpatientMedicineRequestSerializer(req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsPharmacist])
    def dispense(self, request, pk=None):
        req = self.get_object()
        if req.status != 'APPROVED':
            return Response({'detail': 'Request must be approved first.'}, status=400)
        qty = req.quantity_approved or req.quantity_requested
        if qty > req.medicine.quantity_in_stock:
            return Response({'detail': 'Insufficient stock.'}, status=400)
        prev = req.medicine.quantity_in_stock
        req.medicine.quantity_in_stock -= qty
        req.medicine.save()
        price = req.medicine.price_per_unit_cash
        req.unit_price = price
        req.total_cost = price * qty
        req.status = 'DISPENSED'
        req.dispensed_by = request.user
        req.dispensed_at = timezone.now()
        req.save()
        StockMovement.objects.create(
            medicine=req.medicine, movement_type='SALE',
            quantity=-qty, previous_quantity=prev,
            new_quantity=req.medicine.quantity_in_stock,
            reason=f"Inpatient request {req.request_number}",
            performed_by=request.user
        )
        return Response(InpatientMedicineRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req = self.get_object()
        reason = request.data.get('reason', '')
        req.status = 'REJECTED'
        req.rejection_reason = reason
        req.save()
        return Response(InpatientMedicineRequestSerializer(req).data)


# ============================================================
# EMERGENCY
# ============================================================

class EmergencyBedViewSet(viewsets.ModelViewSet):
    queryset = EmergencyBed.objects.filter(is_active=True).order_by('bed_number')
    serializer_class = EmergencyBedSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsAnyAuthenticatedStaff()]


class EmergencyVisitViewSet(viewsets.ModelViewSet):
    queryset = EmergencyVisit.objects.select_related(
        'visit__patient', 'emergency_bed', 'assessed_by'
    ).prefetch_related('charges', 'payments').order_by('-created_at')
    serializer_class = EmergencyVisitSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['triage_level', 'treatment_status', 'injury_type', 'police_case']

    def get_queryset(self):
        qs = super().get_queryset()
        active = self.request.query_params.get('active')
        if active:
            qs = qs.exclude(treatment_status__in=['DISCHARGED', 'REFERRED', 'DECEASED'])
        return qs

    @action(detail=True, methods=['post'])
    def assign_bed(self, request, pk=None):
        ev = self.get_object()
        bed_id = request.data.get('emergency_bed_id')
        bed = get_object_or_404(EmergencyBed, pk=bed_id)
        if bed.status != 'AVAILABLE':
            return Response({'detail': 'Bed is not available.'}, status=400)
        ev.emergency_bed = bed
        ev.save()
        bed.status = 'OCCUPIED'
        bed.current_emergency_visit = ev
        bed.save()
        return Response(EmergencyVisitSerializer(ev).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsDoctor])
    def transfer_to_ward(self, request, pk=None):
        ev = self.get_object()
        admission_id = request.data.get('admission_id')
        admission = get_object_or_404(InpatientAdmission, pk=admission_id)
        ev.transferred_to_admission = admission
        ev.transferred_at = timezone.now()
        ev.treatment_status = 'ADMITTED'
        ev.save()
        # Free emergency bed
        if ev.emergency_bed:
            ev.emergency_bed.status = 'CLEANING'
            ev.emergency_bed.current_emergency_visit = None
            ev.emergency_bed.save()
        return Response(EmergencyVisitSerializer(ev).data)

    @action(detail=True, methods=['post'])
    def add_charge(self, request, pk=None):
        ev = self.get_object()
        data = request.data.copy()
        data['emergency_visit'] = ev.id
        data['charged_by'] = request.user.id
        serializer = EmergencyChargeSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        charge = serializer.save()
        # Update total_charges
        total = EmergencyCharge.objects.filter(
            emergency_visit=ev
        ).aggregate(t=Sum('total_amount'))['t'] or 0
        ev.total_charges = total
        ev.save(update_fields=['total_charges'])
        return Response(EmergencyChargeSerializer(charge).data, status=201)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsCashier])
    def record_payment(self, request, pk=None):
        ev = self.get_object()
        data = request.data.copy()
        data['emergency_visit'] = ev.id
        data['processed_by'] = request.user.id
        serializer = EmergencyPaymentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        total_paid = EmergencyPayment.objects.filter(
            emergency_visit=ev
        ).aggregate(t=Sum('amount'))['t'] or 0
        if total_paid >= ev.total_charges:
            ev.payment_status = 'PAID'
        elif total_paid > 0:
            ev.payment_status = 'PARTIAL'
        ev.save(update_fields=['payment_status'])
        return Response(EmergencyPaymentSerializer(payment).data, status=201)


# ============================================================
# MATERNITY & MCH
# ============================================================

class MaternityVisitViewSet(viewsets.ModelViewSet):
    queryset = MaternityVisit.objects.select_related('visit__patient', 'assessed_by').order_by('-created_at')
    serializer_class = MaternityVisitSerializer
    permission_classes = [IsAuthenticated, IsNurse]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['visit_purpose', 'is_in_labor', 'is_high_risk', 'needs_csection']


class MCHVisitViewSet(viewsets.ModelViewSet):
    queryset = MCHVisit.objects.select_related('visit__patient', 'assessed_by').order_by('-created_at')
    serializer_class = MCHVisitSerializer
    permission_classes = [IsAuthenticated, IsNurse]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['visit_type', 'immunization_due', 'has_danger_signs']


# ============================================================
# PROCUREMENT
# ============================================================

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated, IsProcurementOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['supplier_type', 'status']
    search_fields = ['supplier_name', 'supplier_code', 'contact_person', 'pin_number']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    queryset = PurchaseRequest.objects.prefetch_related('items').order_by('-created_at')
    serializer_class = PurchaseRequestSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'urgency', 'requesting_department']

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'DRAFT':
            return Response({'detail': 'Only DRAFT requests can be submitted.'}, status=400)
        pr.status = 'SUBMITTED'
        pr.save()
        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def approve_hod(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'SUBMITTED':
            return Response({'detail': 'PR must be SUBMITTED first.'}, status=400)
        pr.status = 'APPROVED'
        pr.hod_approved_by = request.user
        pr.hod_approved_at = timezone.now()
        pr.hod_comments = request.data.get('comments', '')
        pr.save()
        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAccountant])
    def approve_accountant(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'APPROVED':
            return Response({'detail': 'PR must have HOD approval first.'}, status=400)
        pr.status = 'APPROVED_ACCOUNTANT'
        pr.accountant_approved_by = request.user
        pr.accountant_approved_at = timezone.now()
        pr.save()
        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProcurement])
    def approve_procurement(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'APPROVED_ACCOUNTANT':
            return Response({'detail': 'PR must have Accountant approval first.'}, status=400)
        pr.status = 'APPROVED_PROCUREMENT'
        pr.procurement_approved_by = request.user
        pr.procurement_approved_at = timezone.now()
        pr.save()
        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProcurementOrAdmin])
    def convert_to_po(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'APPROVED_PROCUREMENT':
            return Response({'detail': 'PR must be fully approved before converting to PO.'}, status=400)
        pr.status = 'CONVERTED_TO_PO'
        pr.save()
        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        pr = self.get_object()
        pr.status = 'REJECTED'
        pr.rejected_by = request.user
        pr.rejected_at = timezone.now()
        pr.rejection_reason = request.data.get('reason', '')
        pr.save()
        return Response(PurchaseRequestSerializer(pr).data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related(
        'supplier', 'purchase_request'
    ).prefetch_related('items').order_by('-created_at')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated, IsProcurementOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'supplier']
    search_fields = ['po_number', 'supplier__supplier_name']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        po = self.get_object()
        if po.status != 'DRAFT':
            return Response({'detail': 'Only DRAFT POs can be sent.'}, status=400)
        po.status = 'SENT'
        po.approved_by = request.user
        po.approved_at = timezone.now()
        po.save()
        return Response(PurchaseOrderSerializer(po).data)


class GoodsReceivedNoteViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceivedNote.objects.prefetch_related('items').order_by('-created_at')
    serializer_class = GoodsReceivedNoteSerializer
    permission_classes = [IsAuthenticated, IsProcurementOrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'purchase_order']

    def perform_create(self, serializer):
        serializer.save(received_by=self.request.user)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        grn = self.get_object()
        if grn.status not in ['PENDING', 'INSPECTED']:
            return Response({'detail': 'GRN must be PENDING or INSPECTED to accept.'}, status=400)
        has_rejection = grn.items.filter(quantity_rejected__gt=0).exists()
        grn.status = 'PARTIALLY_ACCEPTED' if has_rejection else 'ACCEPTED'
        grn.inspected_by = request.user
        grn.inspected_at = timezone.now()
        grn.inspection_notes = request.data.get('inspection_notes', '')
        grn.save()
        # Update PO status
        po = grn.purchase_order
        total_ordered = sum(i.quantity_ordered for i in po.items.all())
        total_received = sum(i.quantity_received for i in po.items.all())
        if total_received >= total_ordered:
            po.status = 'FULLY_RECEIVED'
        elif total_received > 0:
            po.status = 'PARTIALLY_RECEIVED'
        po.save()
        return Response(GoodsReceivedNoteSerializer(grn).data)


# ============================================================
# INSURANCE CLAIMS
# ============================================================

class ConsultationInsuranceClaimViewSet(viewsets.ModelViewSet):
    queryset = ConsultationInsuranceClaim.objects.select_related(
        'patient', 'insurance_provider'
    ).order_by('-created_at')
    serializer_class = ConsultationInsuranceClaimSerializer
    permission_classes = [IsAuthenticated, IsInsuranceOrFinance]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'insurance_provider', 'claims_officer_approved']

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsInsuranceOfficer])
    def approve(self, request, pk=None):
        claim = self.get_object()
        claim.status = 'APPROVED'
        claim.claims_officer_approved = True
        claim.claims_officer = request.user
        claim.claims_officer_approved_at = timezone.now()
        claim.claims_officer_comments = request.data.get('comments', '')
        claim.save()
        return Response(ConsultationInsuranceClaimSerializer(claim).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsInsuranceOfficer])
    def reject(self, request, pk=None):
        claim = self.get_object()
        claim.status = 'REJECTED'
        claim.rejected_by = request.user
        claim.rejected_at = timezone.now()
        claim.rejection_reason = request.data.get('reason', '')
        claim.save()
        return Response(ConsultationInsuranceClaimSerializer(claim).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsCashier])
    def confirm_payment(self, request, pk=None):
        claim = self.get_object()
        claim.payment_confirmed = True
        claim.payment_confirmed_by = request.user
        claim.payment_confirmed_at = timezone.now()
        claim.insurance_payment_received = True
        claim.insurance_payment_date = timezone.now()
        claim.insurance_payment_reference = request.data.get('reference', '')
        claim.status = 'PAID'
        claim.save()
        return Response(ConsultationInsuranceClaimSerializer(claim).data)


class PharmacyInsuranceClaimViewSet(viewsets.ModelViewSet):
    queryset = PharmacyInsuranceClaim.objects.select_related(
        'patient', 'insurance_provider'
    ).order_by('-created_at')
    serializer_class = PharmacyInsuranceClaimSerializer
    permission_classes = [IsAuthenticated, IsInsuranceOrFinance]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'insurance_provider', 'claim_type']

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsInsuranceOfficer])
    def approve(self, request, pk=None):
        claim = self.get_object()
        claim.status = 'APPROVED'
        claim.claims_officer_approved = True
        claim.claims_officer = request.user
        claim.claims_approved_at = timezone.now()
        claim.save()
        return Response(PharmacyInsuranceClaimSerializer(claim).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsInsuranceOfficer])
    def reject(self, request, pk=None):
        claim = self.get_object()
        claim.status = 'REJECTED'
        claim.rejected_by = request.user
        claim.rejected_at = timezone.now()
        claim.rejection_reason = request.data.get('reason', '')
        claim.save()
        return Response(PharmacyInsuranceClaimSerializer(claim).data)


class InpatientInsuranceClaimViewSet(viewsets.ModelViewSet):
    queryset = InpatientInsuranceClaim.objects.select_related(
        'admission__patient', 'insurance_provider'
    ).order_by('-created_at')
    serializer_class = InpatientInsuranceClaimSerializer
    permission_classes = [IsAuthenticated, IsInsuranceOrFinance]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'insurance_provider']

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsInsuranceOfficer])
    def approve(self, request, pk=None):
        claim = self.get_object()
        approved_amount = request.data.get('approved_amount', claim.total_charges)
        claim.approved_amount = approved_amount
        claim.patient_copay = float(claim.total_charges) - float(approved_amount)
        claim.status = 'APPROVED'
        claim.claims_officer_approved = True
        claim.claims_officer = request.user
        claim.claims_approved_at = timezone.now()
        claim.claims_officer_comments = request.data.get('comments', '')
        claim.save()
        return Response(InpatientInsuranceClaimSerializer(claim).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsInsuranceOfficer])
    def reject(self, request, pk=None):
        claim = self.get_object()
        claim.status = 'REJECTED'
        claim.rejected_by = request.user
        claim.rejected_at = timezone.now()
        claim.rejection_reason = request.data.get('reason', '')
        claim.save()
        return Response(InpatientInsuranceClaimSerializer(claim).data)


# ============================================================
# SHA
# ============================================================

class SHAMemberViewSet(viewsets.ModelViewSet):
    queryset = SHAMember.objects.select_related('patient').order_by('-created_at')
    serializer_class = SHAMemberSerializer
    permission_classes = [IsAuthenticated, IsInsuranceOrFinance]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['sha_number', 'patient__first_name', 'patient__last_name',
                     'patient__phone_number']

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanSubmitSHAClaim])
    def verify(self, request, pk=None):
        """
        Calls SHA verification API to check member status.
        In production, replace the stub with actual SHA API call.
        """
        member = self.get_object()
        # --- SHA API integration stub ---
        # import requests
        # resp = requests.post(settings.SHA_API_BASE_URL + '/verify', json={
        #     'sha_number': member.sha_number,
        #     'facility_code': settings.SHA_FACILITY_CODE,
        # }, headers={'Authorization': f'Bearer {settings.SHA_API_KEY}'})
        # data = resp.json()
        # Mock response for development
        data = {
            'status': 'ACTIVE',
            'sha_number': member.sha_number,
            'package_name': member.package_name,
            'annual_limit': str(member.annual_limit),
            'used_amount': str(member.used_amount),
            'verified_at': timezone.now().isoformat(),
        }
        member.last_verified = timezone.now()
        member.verification_response = data
        if data.get('status') == 'ACTIVE':
            member.status = 'ACTIVE'
        member.save()
        return Response(SHAMemberSerializer(member).data)


class SHAClaimViewSet(viewsets.ModelViewSet):
    queryset = SHAClaim.objects.select_related(
        'sha_member__patient', 'consultation'
    ).order_by('-created_at')
    serializer_class = SHAClaimSerializer
    permission_classes = [IsAuthenticated, CanSubmitSHAClaim]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'claim_type', 'sha_member']

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submits claim to SHA API.
        In production, replace stub with actual SHA API call.
        """
        claim = self.get_object()
        if claim.status not in ['DRAFT', 'REJECTED']:
            return Response({'detail': 'Claim cannot be resubmitted in current state.'}, status=400)
        member = claim.sha_member
        if not member.is_valid:
            return Response({'detail': 'SHA member is not active or membership has expired.'}, status=400)

        # --- SHA API integration stub ---
        # payload = {
        #     'facility_code': settings.SHA_FACILITY_CODE,
        #     'sha_number': member.sha_number,
        #     'claim_type': claim.claim_type,
        #     'service_date': str(claim.service_date),
        #     'amount': str(claim.claimed_amount),
        # }
        # resp = requests.post(settings.SHA_API_BASE_URL + '/claims', json=payload, ...)
        # Mock response
        import uuid as _uuid
        response_data = {
            'sha_reference': f'SHA-REF-{_uuid.uuid4().hex[:10].upper()}',
            'status': 'PENDING',
            'received_at': timezone.now().isoformat(),
        }
        claim.status = 'SUBMITTED'
        claim.sha_reference = response_data.get('sha_reference')
        claim.submitted_at = timezone.now()
        claim.submitted_by = request.user
        claim.submission_response = response_data
        claim.save()
        return Response(SHAClaimSerializer(claim).data)


# ============================================================
# PAYMENT & BILLING
# ============================================================

class PaymentAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentAuditLog.objects.select_related('patient', 'processed_by').order_by('-created_at')
    serializer_class = PaymentAuditLogSerializer
    permission_classes = [IsAuthenticated, IsFinanceStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['transaction_type', 'status', 'payment_method']
    search_fields = ['transaction_id', 'mpesa_code', 'patient__first_name']

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(created_at__date=date)
        today = self.request.query_params.get('today')
        if today:
            qs = qs.filter(created_at__date=timezone.now().date())
        return qs


class CashierSessionViewSet(viewsets.ModelViewSet):
    queryset = CashierSession.objects.select_related('cashier').order_by('-opened_at')
    serializer_class = CashierSessionSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'cashier']

    @action(detail=False, methods=['get'])
    def active(self, request):
        session = CashierSession.objects.filter(
            cashier=request.user, status='OPEN'
        ).first()
        if not session:
            return Response({'detail': 'No active session.'}, status=404)
        return Response(CashierSessionSerializer(session).data)

    @action(detail=False, methods=['post'])
    def open(self, request):
        existing = CashierSession.objects.filter(cashier=request.user, status='OPEN').first()
        if existing:
            return Response({'detail': 'You already have an open session.'}, status=400)
        session = CashierSession.objects.create(
            cashier=request.user,
            opening_balance=request.data.get('opening_balance', 0),
        )
        return Response(CashierSessionSerializer(session).data, status=201)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        session = self.get_object()
        if session.status != 'OPEN':
            return Response({'detail': 'Session is not open.'}, status=400)
        actual_cash = request.data.get('actual_cash', 0)
        session.actual_cash = actual_cash
        session.cash_variance = float(session.expected_cash) - float(actual_cash)
        session.status = 'CLOSED'
        session.closed_at = timezone.now()
        session.reconciliation_notes = request.data.get('notes', '')
        session.save()
        return Response(CashierSessionSerializer(session).data)


# ============================================================
# eTIMS
# ============================================================

class eTIMSConfigurationViewSet(viewsets.ModelViewSet):
    queryset = eTIMSConfiguration.objects.all()
    serializer_class = eTIMSConfigurationSerializer
    permission_classes = [IsAuthenticated, CanManageeTIMS]

    def get_object(self):
        # Singleton
        config = eTIMSConfiguration.objects.first()
        if not config:
            from rest_framework.exceptions import NotFound
            raise NotFound("eTIMS configuration not set up.")
        return config

    def list(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)


class eTIMSInvoiceViewSet(viewsets.ModelViewSet):
    queryset = eTIMSInvoice.objects.select_related(
        'patient', 'created_by'
    ).prefetch_related('items').order_by('-created_at')
    serializer_class = eTIMSInvoiceSerializer
    permission_classes = [IsAuthenticated, CanManageeTIMS]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'invoice_type', 'payment_status', 'submitted_to_etims']
    search_fields = ['invoice_number', 'customer_name', 'etims_invoice_number']

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(created_at__date=date)
        today = self.request.query_params.get('today')
        if today:
            qs = qs.filter(created_at__date=timezone.now().date())
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit invoice to KRA eTIMS API.
        In production, replace stub with actual KRA eTIMS API call.
        """
        invoice = self.get_object()
        if invoice.submitted_to_etims:
            return Response({'detail': 'Invoice already submitted to eTIMS.'}, status=400)
        try:
            config = eTIMSConfiguration.objects.get(is_active=True)
        except eTIMSConfiguration.DoesNotExist:
            return Response({'detail': 'eTIMS is not configured or inactive.'}, status=400)

        # --- KRA eTIMS API integration stub ---
        # payload = build_etims_payload(invoice, config)
        # endpoint = config.api_base_url if not config.test_mode else settings.ETIMS_TEST_URL
        # resp = requests.post(endpoint + '/tims/invoice', json=payload, ...)
        # Mock response
        import uuid as _uuid
        etims_number = f'KRA{timezone.now().strftime("%Y%m%d")}{_uuid.uuid4().hex[:8].upper()}'
        qr_data = f'https://etims.kra.go.ke/verify/{etims_number}'
        response_data = {
            'resultCd': '000',
            'resultMsg': 'Success',
            'resultDt': timezone.now().isoformat(),
            'data': {'rcptNo': etims_number, 'vsdcRcptPbctDt': timezone.now().isoformat()},
        }
        invoice.submitted_to_etims = True
        invoice.submitted_at = timezone.now()
        invoice.status = 'SUBMITTED'
        invoice.etims_invoice_number = etims_number
        invoice.etims_qr_code = qr_data
        invoice.etims_verification_url = qr_data
        invoice.etims_response = response_data
        invoice.save()
        return Response(eTIMSInvoiceSerializer(invoice).data)


# ============================================================
# HR — ATTENDANCE & LEAVE
# ============================================================

class HospitalWiFiNetworkViewSet(viewsets.ModelViewSet):
    queryset = HospitalWiFiNetwork.objects.filter(is_active=True)
    serializer_class = HospitalWiFiNetworkSerializer
    permission_classes = [IsAuthenticated, IsHROrAdmin]


class AttendanceQRCodeViewSet(viewsets.ModelViewSet):
    queryset = AttendanceQRCode.objects.order_by('-created_at')
    serializer_class = AttendanceQRCodeSerializer
    permission_classes = [IsAuthenticated, IsHROrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['qr_type', 'is_active', 'attendance_date']

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = timezone.now().date()
        codes = AttendanceQRCode.objects.filter(attendance_date=today, is_active=True)
        return Response(AttendanceQRCodeSerializer(codes, many=True).data)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('user').order_by('-date', 'user__last_name')
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated, IsHROrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'date', 'status', 'is_manual']

    def get_queryset(self):
        qs = super().get_queryset()
        # Non-HR users can only see their own attendance
        user = self.request.user
        if user.user_type not in ['HR', 'ADMIN']:
            qs = qs.filter(user=user)
        return qs

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def scan_check_in(self, request):
        qr_code_value = request.data.get('qr_code')
        if not qr_code_value:
            return Response({'detail': 'QR code is required.'}, status=400)
        try:
            qr = AttendanceQRCode.objects.get(qr_code=qr_code_value, qr_type='CHECK_IN')
        except AttendanceQRCode.DoesNotExist:
            return Response({'detail': 'Invalid QR code.'}, status=400)
        if not qr.is_valid():
            return Response({'detail': 'QR code has expired or is inactive.'}, status=400)
        today = timezone.now().date()
        attendance, created = Attendance.objects.get_or_create(
            user=request.user, date=today,
            defaults={'status': 'PRESENT', 'check_in_time': timezone.now()}
        )
        if not created and attendance.check_in_time:
            return Response({'detail': 'Already checked in today.'}, status=400)
        attendance.check_in_time = timezone.now()
        attendance.check_in_qr_code = qr
        attendance.check_in_ip = request.META.get('REMOTE_ADDR')
        attendance.check_in_location = qr.location
        attendance.status = 'PRESENT'
        attendance.save()
        qr.scan_count += 1
        qr.save(update_fields=['scan_count'])
        return Response(AttendanceSerializer(attendance).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def scan_check_out(self, request):
        qr_code_value = request.data.get('qr_code')
        if not qr_code_value:
            return Response({'detail': 'QR code is required.'}, status=400)
        try:
            qr = AttendanceQRCode.objects.get(qr_code=qr_code_value, qr_type='CHECK_OUT')
        except AttendanceQRCode.DoesNotExist:
            return Response({'detail': 'Invalid QR code.'}, status=400)
        if not qr.is_valid():
            return Response({'detail': 'QR code has expired or is inactive.'}, status=400)
        today = timezone.now().date()
        try:
            attendance = Attendance.objects.get(user=request.user, date=today)
        except Attendance.DoesNotExist:
            return Response({'detail': 'No check-in record found for today.'}, status=400)
        if attendance.check_out_time:
            return Response({'detail': 'Already checked out today.'}, status=400)
        attendance.check_out_time = timezone.now()
        attendance.check_out_qr_code = qr
        attendance.check_out_ip = request.META.get('REMOTE_ADDR')
        attendance.save()
        attendance.calculate_hours()
        qr.scan_count += 1
        qr.save(update_fields=['scan_count'])
        return Response(AttendanceSerializer(attendance).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsHROrAdmin])
    def manual_entry(self, request):
        data = request.data.copy()
        data['is_manual'] = True
        data['manual_approved_by'] = request.user.id
        # Get/create attendance record
        user_id = data.get('user')
        date = data.get('date')
        attendance, _ = Attendance.objects.get_or_create(user_id=user_id, date=date)
        serializer = AttendanceSerializer(attendance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        attendance = serializer.save(is_manual=True, manual_approved_by=request.user)
        if attendance.check_in_time and attendance.check_out_time:
            attendance.calculate_hours()
        return Response(AttendanceSerializer(attendance).data)


class LeaveTypeViewSet(viewsets.ModelViewSet):
    queryset = LeaveType.objects.filter(is_active=True)
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated, IsHROrAdmin]


class LeaveApplicationViewSet(viewsets.ModelViewSet):
    queryset = LeaveApplication.objects.select_related(
        'user', 'leave_type'
    ).order_by('-created_at')
    serializer_class = LeaveApplicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'leave_type', 'user']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.user_type not in ['HR', 'ADMIN']:
            qs = qs.filter(user=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def approve_supervisor(self, request, pk=None):
        leave = self.get_object()
        if leave.status != 'PENDING':
            return Response({'detail': 'Leave must be PENDING.'}, status=400)
        leave.status = 'SUPERVISOR_APPROVED'
        leave.supervisor_approved = True
        leave.supervisor_approved_by = request.user
        leave.supervisor_approved_at = timezone.now()
        leave.supervisor_comments = request.data.get('comments', '')
        leave.save()
        return Response(LeaveApplicationSerializer(leave).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHROrAdmin])
    def approve_hr(self, request, pk=None):
        leave = self.get_object()
        if leave.status not in ['PENDING', 'SUPERVISOR_APPROVED']:
            return Response({'detail': 'Leave must be PENDING or SUPERVISOR_APPROVED.'}, status=400)
        leave.status = 'APPROVED'
        leave.hr_approved = True
        leave.hr_approved_by = request.user
        leave.hr_approved_at = timezone.now()
        leave.hr_comments = request.data.get('comments', '')
        leave.save()
        return Response(LeaveApplicationSerializer(leave).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'REJECTED'
        leave.rejected_by = request.user
        leave.rejected_at = timezone.now()
        leave.rejection_reason = request.data.get('reason', '')
        leave.save()
        return Response(LeaveApplicationSerializer(leave).data)


# ============================================================
# ASSETS
# ============================================================

class HospitalAssetViewSet(viewsets.ModelViewSet):
    queryset = HospitalAsset.objects.prefetch_related(
        'maintenance_logs'
    ).order_by('-created_at')
    serializer_class = HospitalAssetSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'status', 'condition', 'needs_replacement']
    search_fields = ['asset_id', 'asset_name', 'serial_number', 'location']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsAnyAuthenticatedStaff()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def maintenance_due(self, request):
        today = timezone.now().date()
        assets = HospitalAsset.objects.filter(
            Q(next_maintenance_date__lte=today) | Q(requires_maintenance=True),
            status='OPERATIONAL'
        ).order_by('next_maintenance_date')
        return Response(HospitalAssetSerializer(assets, many=True).data)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category = request.query_params.get('category')
        if not category:
            return Response({'detail': 'category param required.'}, status=400)
        assets = HospitalAsset.objects.filter(category=category)
        return Response(HospitalAssetSerializer(assets, many=True).data)


class AssetMaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = AssetMaintenanceLog.objects.select_related('asset').order_by('-maintenance_date')
    serializer_class = AssetMaintenanceLogSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['asset', 'maintenance_type', 'is_completed']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsAnyAuthenticatedStaff()]

    def perform_create(self, serializer):
        serializer.save(logged_by=self.request.user)


# ============================================================
# AUDIT & SECURITY
# ============================================================

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['action', 'table_affected', 'user']
    search_fields = ['description', 'record_id', 'ip_address']

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(timestamp__date=date)
        return qs


class SecurityThreatViewSet(viewsets.ModelViewSet):
    queryset = SecurityThreat.objects.order_by('-detected_at')
    serializer_class = SecurityThreatSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['threat_type', 'severity', 'resolved', 'blocked']

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        threat = self.get_object()
        threat.resolved = True
        threat.resolved_by = request.user
        threat.resolved_at = timezone.now()
        threat.resolution_notes = request.data.get('notes', '')
        threat.save()
        return Response(SecurityThreatSerializer(threat).data)


# ============================================================
# NOTIFICATIONS & MESSAGING
# ============================================================

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.select_related('recipient', 'sender', 'patient').order_by('-created_at')
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read', 'notification_type', 'is_urgent']

    def get_queryset(self):
        return super().get_queryset().filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_as_read()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'detail': 'All notifications marked as read.'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})


class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.select_related(
        'participant1', 'participant2', 'patient'
    ).prefetch_related('messages').order_by('-updated_at')
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]

    def get_queryset(self):
        user = self.request.user
        return super().get_queryset().filter(
            Q(participant1=user) | Q(participant2=user)
        )

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        msgs = conversation.messages.order_by('timestamp')
        # Mark as read
        msgs.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response(MessageSerializer(msgs, many=True).data)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'detail': 'Message content is required.'}, status=400)
        msg = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content
        )
        return Response(MessageSerializer(msg).data, status=201)


# ============================================================
# DASHBOARD
# ============================================================

class DashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        stats = {
            'today_date': today,
            'user_name': user.get_full_name() or user.username,
            'user_type': user.user_type,
        }

        if user.user_type in ['ADMIN', 'RECEPTIONIST']:
            today_visits = PatientVisit.objects.filter(arrival_time__date=today)
            stats.update({
                'today_visits': today_visits.count(),
                'waiting_triage': today_visits.filter(status='REGISTERED').count(),
                'waiting_consultation': QueueManagement.objects.filter(
                    department='CONSULTATION', is_completed=False,
                    created_at__date=today
                ).count(),
                'in_consultation': today_visits.filter(status='IN_CONSULTATION').count(),
                'completed_today': today_visits.filter(status='COMPLETED').count(),
            })

        if user.user_type == 'DOCTOR':
            stats.update({
                'my_queue_count': QueueManagement.objects.filter(
                    department='CONSULTATION', is_completed=False,
                    created_at__date=today
                ).count(),
                'today_appointments': Appointment.objects.filter(
                    doctor=user, scheduled_time__date=today
                ).count(),
                'pending_lab_results': LabOrder.objects.filter(
                    ordered_by=user, status='REPORTED'
                ).count(),
            })

        if user.user_type == 'NURSE':
            stats.update({
                'waiting_triage': PatientVisit.objects.filter(
                    status='REGISTERED', arrival_time__date=today
                ).count(),
                'total_admitted': InpatientAdmission.objects.filter(status='ACTIVE').count(),
            })

        if user.user_type == 'PHARMACIST':
            stats.update({
                'pending_prescriptions': Prescription.objects.filter(is_dispensed=False).count(),
                'low_stock_count': Medicine.objects.filter(
                    quantity_in_stock__lte=100
                ).count(),
                'today_otc_sales': OverTheCounterSale.objects.filter(
                    created_at__date=today
                ).count(),
            })

        if user.user_type == 'LAB_TECH':
            stats.update({
                'pending_lab_orders': LabOrder.objects.filter(
                    status__in=['PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS']
                ).count(),
                'urgent_orders': LabOrder.objects.filter(
                    priority__in=['URGENT', 'STAT', 'EMERGENCY'], status='PENDING'
                ).count(),
                'critical_results': LabResult.objects.filter(
                    is_critical=True, critical_value_notified=False
                ).count(),
            })

        if user.user_type == 'CASHIER':
            from django.db.models import Sum
            session = CashierSession.objects.filter(cashier=user, status='OPEN').first()
            today_logs = PaymentAuditLog.objects.filter(
                processed_by=user, status='SUCCESS', created_at__date=today
            )
            stats.update({
                'today_revenue': today_logs.aggregate(
                    t=Sum('amount')
                )['t'] or 0,
                'today_cash': today_logs.filter(
                    payment_method='CASH'
                ).aggregate(t=Sum('amount'))['t'] or 0,
                'today_mpesa': today_logs.filter(
                    payment_method='MPESA'
                ).aggregate(t=Sum('amount'))['t'] or 0,
                'session_status': session.status if session else 'CLOSED',
            })

        if user.user_type == 'INSURANCE':
            stats.update({
                'pending_consultation_claims': ConsultationInsuranceClaim.objects.filter(
                    status='PENDING'
                ).count(),
                'pending_pharmacy_claims': PharmacyInsuranceClaim.objects.filter(
                    status='PENDING'
                ).count(),
                'pending_inpatient_claims': InpatientInsuranceClaim.objects.filter(
                    status='PENDING'
                ).count(),
                'pending_sha_claims': SHAClaim.objects.filter(
                    status__in=['DRAFT', 'SUBMITTED', 'PENDING']
                ).count(),
            })

        if user.user_type == 'PROCUREMENT':
            stats.update({
                'pending_prs': PurchaseRequest.objects.filter(
                    status__in=['SUBMITTED', 'APPROVED', 'APPROVED_ACCOUNTANT']
                ).count(),
                'pos_in_transit': PurchaseOrder.objects.filter(
                    status__in=['SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED']
                ).count(),
                'pending_grns': GoodsReceivedNote.objects.filter(status='PENDING').count(),
            })

        if user.user_type == 'ACCOUNTANT':
            stats.update({
                'pending_etims_invoices': eTIMSInvoice.objects.filter(
                    status='DRAFT'
                ).count(),
                'submitted_today': eTIMSInvoice.objects.filter(
                    submitted_at__date=today
                ).count(),
            })

        if user.user_type == 'HR':
            stats.update({
                'present_today': Attendance.objects.filter(
                    date=today, status='PRESENT'
                ).count(),
                'absent_today': Attendance.objects.filter(
                    date=today, status='ABSENT'
                ).count(),
                'pending_leaves': LeaveApplication.objects.filter(
                    status='PENDING'
                ).count(),
                'total_staff': User.objects.filter(is_active=True).count(),
            })

        if user.user_type == 'ADMIN':
            stats.update({
                'total_patients': Patient.objects.count(),
                'total_doctors': Doctor.objects.filter(is_active=True).count(),
                'total_nurses': Nurse.objects.filter(is_active=True).count(),
                'total_admitted': InpatientAdmission.objects.filter(status='ACTIVE').count(),
                'available_beds': Bed.objects.filter(status='AVAILABLE').count(),
                'occupied_beds': Bed.objects.filter(status='OCCUPIED').count(),
                'assets_maintenance_due': HospitalAsset.objects.filter(
                    next_maintenance_date__lte=today
                ).count(),
                'active_emergency': EmergencyVisit.objects.exclude(
                    treatment_status__in=['DISCHARGED', 'REFERRED', 'DECEASED']
                ).count(),
            })

        return Response(stats)


# ============================================================
# REPORTS
# ============================================================

class ReportsView(APIView):
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]

    def get(self, request, report_type):
        today = timezone.now().date()
        date_from = request.query_params.get('from', str(today))
        date_to = request.query_params.get('to', str(today))

        if report_type == 'daily-visits':
            data = PatientVisit.objects.filter(
                arrival_time__date__range=[date_from, date_to]
            ).values('visit_type', 'status').annotate(count=Count('id'))
            return Response({'report': 'daily-visits', 'data': list(data)})

        elif report_type == 'revenue':
            if not request.user.user_type in ['ADMIN', 'ACCOUNTANT', 'CASHIER']:
                return Response({'detail': 'Permission denied.'}, status=403)
            data = PaymentAuditLog.objects.filter(
                created_at__date__range=[date_from, date_to],
                status='SUCCESS'
            ).values('payment_method').annotate(
                count=Count('id'), total=Sum('amount')
            )
            return Response({'report': 'revenue', 'data': list(data)})

        elif report_type == 'stock':
            if not request.user.user_type in ['ADMIN', 'PHARMACIST', 'PROCUREMENT']:
                return Response({'detail': 'Permission denied.'}, status=403)
            low_stock = Medicine.objects.filter(
                quantity_in_stock__lte=100
            ).values('id', 'name', 'quantity_in_stock', 'reorder_level')
            return Response({'report': 'stock', 'low_stock': list(low_stock)})

        elif report_type == 'claims':
            if not request.user.user_type in ['ADMIN', 'INSURANCE', 'ACCOUNTANT']:
                return Response({'detail': 'Permission denied.'}, status=403)
            data = {
                'consultation': ConsultationInsuranceClaim.objects.filter(
                    created_at__date__range=[date_from, date_to]
                ).values('status').annotate(count=Count('id')),
                'pharmacy': PharmacyInsuranceClaim.objects.filter(
                    created_at__date__range=[date_from, date_to]
                ).values('status').annotate(count=Count('id')),
                'inpatient': InpatientInsuranceClaim.objects.filter(
                    created_at__date__range=[date_from, date_to]
                ).values('status').annotate(count=Count('id')),
            }
            return Response({'report': 'claims', 'data': {
                k: list(v) for k, v in data.items()
            }})

        elif report_type == 'lab-turnaround':
            data = LabOrder.objects.filter(
                ordered_at__date__range=[date_from, date_to],
                status='REPORTED'
            ).values('priority').annotate(count=Count('id'))
            return Response({'report': 'lab-turnaround', 'data': list(data)})

        elif report_type == 'attendance':
            if not request.user.user_type in ['ADMIN', 'HR']:
                return Response({'detail': 'Permission denied.'}, status=403)
            data = Attendance.objects.filter(
                date__range=[date_from, date_to]
            ).values('status').annotate(count=Count('id'))
            return Response({'report': 'attendance', 'data': list(data)})

        elif report_type == 'admissions':
            data = InpatientAdmission.objects.filter(
                admission_datetime__date__range=[date_from, date_to]
            ).values('admission_type', 'status').annotate(count=Count('id'))
            return Response({'report': 'admissions', 'data': list(data)})

        elif report_type == 'discharge-summary':
            data = InpatientAdmission.objects.filter(
                discharge_datetime__date__range=[date_from, date_to],
                status='DISCHARGED'
            ).values('discharge_diagnosis').annotate(count=Count('id'))
            return Response({'report': 'discharge-summary', 'data': list(data)})

        else:
            return Response(
                {'detail': f'Unknown report type: {report_type}. Valid types: '
                           'daily-visits, revenue, stock, claims, lab-turnaround, '
                           'attendance, admissions, discharge-summary'},
                status=400
            )



# Add to backend/core/views.py

class TriageAssessmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing triage assessments.
    """
    queryset = TriageAssessment.objects.select_related(
        'visit__patient', 'category', 'assessed_by'
    ).order_by('-assessment_time')
    serializer_class = TriageAssessmentSerializer
    permission_classes = [IsAuthenticated, IsAnyAuthenticatedStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'requires_immediate_attention']

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(assessment_time__date=date)
        return qs
    
    
    

