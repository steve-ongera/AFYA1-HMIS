"""
core/management/commands/seed_data.py
AFYA1 HMIS — Development seed data
Run: python manage.py seed_data
"""

import random
import string
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import (
    User, Patient, Doctor, Nurse,
    InsuranceProvider, SpecializedService, Disease, ClinicSettings,
    TriageCategory,
    ICD10Category, ICD10Code,
    MedicineCategory, Medicine,
    LabTestCategory, LabTest,
    Ward, Bed,
    EmergencyBed,
    Supplier,
    LeaveType,
    HospitalWiFiNetwork,
    HospitalAsset,
    SHAMember,
)


class Command(BaseCommand):
    help = "Seed the database with realistic development data for AFYA1 HMIS."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing seed data before re-seeding (keeps superusers).",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write(self.style.WARNING("Flushing existing seed data…"))
            self._flush()

        self.stdout.write("Seeding AFYA1 HMIS…")
        self._clinic_settings()
        self._users()
        self._insurance_providers()
        self._specialized_services()
        self._diseases()
        self._triage_categories()
        self._icd10()
        self._medicine_categories()
        self._medicines()
        self._lab_test_categories()
        self._lab_tests()
        self._wards_and_beds()
        self._emergency_beds()
        self._suppliers()
        self._leave_types()
        self._wifi_networks()
        self._assets()
        self._patients_with_sha()
        self.stdout.write(self.style.SUCCESS("✔  Seed complete."))

    # ------------------------------------------------------------------
    def _flush(self):
        models_to_clear = [
            HospitalAsset, Bed, Ward, EmergencyBed,
            LabTest, LabTestCategory,
            Medicine, MedicineCategory,
            ICD10Code, ICD10Category,
            TriageCategory, Disease, SpecializedService,
            InsuranceProvider, ClinicSettings,
            SHAMember, Patient,
            Nurse, Doctor,
        ]
        for m in models_to_clear:
            m.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    # ------------------------------------------------------------------
    def _clinic_settings(self):
        ClinicSettings.objects.get_or_create(
            clinic_name="South B Hospital",
            defaults=dict(
                address="South B, Nairobi, Kenya",
                phone_number="+254 20 555 0100",
                email="info@southbhospital.co.ke",
                working_hours="Mon–Fri 08:00–20:00 | Sat 08:00–14:00",
                appointment_duration=30,
                max_patients_per_day=300,
            ),
        )
        self.stdout.write("  ✓ ClinicSettings")

    # ------------------------------------------------------------------
    def _users(self):
        accounts = [
            dict(username="admin",        password="Admin@1234",  first_name="System",    last_name="Admin",      user_type="ADMIN",        is_staff=True, is_superuser=True),
            dict(username="dr_kamau",     password="Doctor@1234", first_name="James",     last_name="Kamau",      user_type="DOCTOR",       specialization="General Practitioner",   license_number="KMPDC-001"),
            dict(username="dr_wanjiru",   password="Doctor@1234", first_name="Grace",     last_name="Wanjiru",    user_type="DOCTOR",       specialization="Pediatrician",            license_number="KMPDC-002"),
            dict(username="dr_otieno",    password="Doctor@1234", first_name="Peter",     last_name="Otieno",     user_type="DOCTOR",       specialization="Emergency Medicine",      license_number="KMPDC-003"),
            dict(username="dr_muthoni",   password="Doctor@1234", first_name="Alice",     last_name="Muthoni",    user_type="DOCTOR",       specialization="Obstetrician/Gynecologist", license_number="KMPDC-004"),
            dict(username="nurse_akinyi", password="Nurse@1234",  first_name="Akinyi",    last_name="Odhiambo",   user_type="NURSE"),
            dict(username="nurse_njeri",  password="Nurse@1234",  first_name="Njeri",     last_name="Karanja",    user_type="NURSE"),
            dict(username="receptionist", password="Recep@1234",  first_name="Mary",      last_name="Mutua",      user_type="RECEPTIONIST"),
            dict(username="pharmacist",   password="Pharm@1234",  first_name="Joseph",    last_name="Mwangi",     user_type="PHARMACIST"),
            dict(username="lab_tech",     password="Lab@12345",   first_name="Samuel",    last_name="Kipchoge",   user_type="LAB_TECH"),
            dict(username="cashier",      password="Cash@1234",   first_name="Beatrice",  last_name="Wairimu",    user_type="CASHIER"),
            dict(username="procurement",  password="Proc@1234",   first_name="David",     last_name="Ndung'u",    user_type="PROCUREMENT"),
            dict(username="accountant",   password="Acct@1234",   first_name="Sarah",     last_name="Chebet",     user_type="ACCOUNTANT"),
            dict(username="claims_officer", password="Claim@1234", first_name="Kevin",   last_name="Omondi",     user_type="INSURANCE"),
            dict(username="hr_officer",   password="Hr@123456",   first_name="Lilian",   last_name="Wambua",     user_type="HR"),
        ]
        for a in accounts:
            extra = {k: v for k, v in a.items() if k not in ("username", "password")}
            u, created = User.objects.get_or_create(username=a["username"], defaults={**extra, "password": make_password(a["password"])})
            if not created:
                for k, v in extra.items():
                    setattr(u, k, v)
                u.save()
        self.stdout.write("  ✓ Users (15)")

        # Doctor profiles
        dr_user_map = [
            ("dr_kamau",   "James",  "Kamau",   "GP",    "KMPDC-001", "General"),
            ("dr_wanjiru", "Grace",  "Wanjiru", "PED",   "KMPDC-002", "Pediatrics"),
            ("dr_otieno",  "Peter",  "Otieno",  "EM",    "KMPDC-003", "Emergency"),
            ("dr_muthoni", "Alice",  "Muthoni", "OBGYN", "KMPDC-004", "Maternity"),
        ]
        for uname, fn, ln, spec, lic, dept in dr_user_map:
            u = User.objects.get(username=uname)
            Doctor.objects.get_or_create(
                license_number=lic,
                defaults=dict(
                    user=u, first_name=fn, last_name=ln, date_of_birth=date(1980, 1, 1),
                    gender="M" if fn in ("James", "Peter") else "F",
                    id_number=f"3{lic[-3:]}00000",
                    phone_number=f"+2547{random.randint(10000000, 99999999)}",
                    specialization=spec, department=dept,
                    license_expiry=date(2026, 12, 31),
                    years_of_experience=random.randint(3, 20),
                    joining_date=date(2020, 1, 15),
                ),
            )

        # Nurse profiles
        nurse_map = [
            ("nurse_akinyi", "Akinyi", "Odhiambo", "RN", "NB-001", "ER"),
            ("nurse_njeri",  "Njeri",  "Karanja",   "RN", "NB-002", "GEN"),
        ]
        for uname, fn, ln, ntype, nid, dept in nurse_map:
            u = User.objects.get(username=uname)
            Nurse.objects.get_or_create(
                nurse_id=nid,
                defaults=dict(
                    user=u, first_name=fn, last_name=ln, date_of_birth=date(1990, 6, 1),
                    gender="F", phone_number=f"+2547{random.randint(10000000, 99999999)}",
                    nurse_type=ntype, license_number=f"NCK-{nid}",
                    license_expiry=date(2026, 12, 31),
                    department=dept, years_of_experience=random.randint(1, 10),
                    joining_date=date(2021, 3, 1), is_bcls_certified=True,
                ),
            )
        self.stdout.write("  ✓ Doctor & Nurse profiles")

    # ------------------------------------------------------------------
    def _insurance_providers(self):
        providers = [
            ("AAR Healthcare", "AAR"),
            ("Jubilee Health Insurance", "JUB"),
            ("NHIF", "NHIF"),
            ("CIC Insurance", "CIC"),
            ("Resolution Health", "RES"),
            ("Madison Insurance", "MAD"),
            ("UAP Old Mutual", "UAP"),
            ("Britam", "BRI"),
        ]
        for name, code in providers:
            InsuranceProvider.objects.get_or_create(name=name, defaults=dict(code=code, is_active=True))
        self.stdout.write(f"  ✓ InsuranceProviders ({len(providers)})")

    # ------------------------------------------------------------------
    def _specialized_services(self):
        services = [
            ("General Consultation", 500),
            ("Specialist Consultation", 1500),
            ("Pediatric Consultation", 800),
            ("Antenatal Visit", 600),
            ("Emergency Consultation", 2000),
            ("Dental Consultation", 700),
            ("Optical Consultation", 600),
            ("Physiotherapy Session", 900),
        ]
        for name, fee in services:
            SpecializedService.objects.get_or_create(name=name, defaults=dict(consultation_fee=Decimal(str(fee))))
        self.stdout.write(f"  ✓ SpecializedServices ({len(services)})")

    # ------------------------------------------------------------------
    def _diseases(self):
        diseases = [
            ("Malaria", "P01.9"), ("Typhoid Fever", "A01.0"), ("HIV/AIDS", "B24"),
            ("Tuberculosis", "A15.9"), ("Diabetes Mellitus Type 2", "E11"),
            ("Hypertension", "I10"), ("Pneumonia", "J18.9"), ("Anaemia", "D64.9"),
            ("Cholera", "A00.9"), ("COVID-19", "U07.1"),
        ]
        for name, icd in diseases:
            Disease.objects.get_or_create(name=name, defaults=dict(icd_code=icd))
        self.stdout.write(f"  ✓ Diseases ({len(diseases)})")

    # ------------------------------------------------------------------
    def _triage_categories(self):
        categories = [
            (1, "RED",    "Immediate Life Threat",  0),
            (2, "ORANGE", "Emergency",              10),
            (3, "YELLOW", "Urgent",                 30),
            (4, "GREEN",  "Semi-Urgent",            60),
            (5, "BLUE",   "Non-Urgent",            120),
        ]
        for priority, color, name, wait in categories:
            TriageCategory.objects.get_or_create(
                priority_level=priority,
                defaults=dict(color_code=color, name=name, description=name, max_wait_time=wait),
            )
        self.stdout.write("  ✓ TriageCategories (5)")

    # ------------------------------------------------------------------
    def _icd10(self):
        chapters = [
            ("I",   "A00–B99", "Certain infectious and parasitic diseases"),
            ("II",  "C00–D49", "Neoplasms"),
            ("III", "D50–D89", "Diseases of the blood and blood-forming organs"),
            ("IV",  "E00–E89", "Endocrine, nutritional and metabolic diseases"),
            ("V",   "F01–F99", "Mental, behavioural and neurodevelopmental disorders"),
            ("IX",  "I00–I99", "Diseases of the circulatory system"),
            ("X",   "J00–J99", "Diseases of the respiratory system"),
            ("XI",  "K00–K95", "Diseases of the digestive system"),
            ("XIV", "N00–N99", "Diseases of the genitourinary system"),
            ("XV",  "O00–O9A", "Pregnancy, childbirth and the puerperium"),
        ]
        icd_codes = [
            # (code, chapter_number, short_desc, common, nhif, sha)
            ("A00.9", "I",   "Cholera, unspecified",                False, True,  True),
            ("A01.0", "I",   "Typhoid fever",                       True,  True,  True),
            ("A09",   "I",   "Infectious gastroenteritis",          True,  True,  True),
            ("A15.9", "I",   "Tuberculosis, unspecified",           True,  True,  True),
            ("B24",   "I",   "Human immunodeficiency virus disease", True,  True,  True),
            ("C50.9", "II",  "Malignant neoplasm of breast",        False, True,  True),
            ("D64.9", "III", "Anaemia, unspecified",                True,  True,  True),
            ("E11",   "IV",  "Type 2 diabetes mellitus",            True,  True,  True),
            ("E11.9", "IV",  "Type 2 diabetes without complications", True, True,  True),
            ("F32.9", "V",   "Major depressive disorder",           False, False, True),
            ("I10",   "IX",  "Essential hypertension",              True,  True,  True),
            ("I21.9", "IX",  "Acute myocardial infarction",         False, True,  True),
            ("J06.9", "X",   "Upper respiratory infection",         True,  True,  True),
            ("J18.9", "X",   "Pneumonia, unspecified",              True,  True,  True),
            ("K29.7", "XI",  "Gastritis, unspecified",              True,  True,  True),
            ("K92.1", "XI",  "Melaena",                             False, True,  True),
            ("N39.0", "XIV", "Urinary tract infection",             True,  True,  True),
            ("O80",   "XV",  "Spontaneous vertex delivery",         True,  True,  True),
            ("O82",   "XV",  "Caesarean section",                   False, True,  True),
            ("P01.9", "I",   "Malaria, unspecified",                True,  True,  True),
            ("U07.1", "I",   "COVID-19",                            True,  True,  True),
        ]

        cat_map = {}
        for ch, code_range, name in chapters:
            cat, _ = ICD10Category.objects.get_or_create(
                chapter_number=ch,
                defaults=dict(code_range=code_range, category_name=name),
            )
            cat_map[ch] = cat

        for code, ch, short_desc, common, nhif, sha in icd_codes:
            ICD10Code.objects.get_or_create(
                code=code,
                defaults=dict(
                    category=cat_map[ch], description=short_desc, short_description=short_desc,
                    is_common=common, nhif_eligible=nhif, sha_covered=sha,
                ),
            )
        self.stdout.write(f"  ✓ ICD-10 categories ({len(chapters)}) & codes ({len(icd_codes)})")

    # ------------------------------------------------------------------
    def _medicine_categories(self):
        cats = [
            "Antibiotics", "Analgesics", "Antihypertensives", "Antidiabetics",
            "Antimalarials", "Antiretrovirals", "IV Fluids", "Vitamins & Supplements",
            "Antihistamines", "Antifungals", "Dermatologicals", "Ophthalmics",
        ]
        for name in cats:
            MedicineCategory.objects.get_or_create(name=name)
        self.stdout.write(f"  ✓ MedicineCategories ({len(cats)})")

    # ------------------------------------------------------------------
    def _medicines(self):
        cat = {c.name: c for c in MedicineCategory.objects.all()}

        medicines = [
            # (name, category, unit_type, units_per_pack, pack_name, qty, reorder, cost_cash, price_cash, price_ins)
            ("Amoxicillin 500mg",        "Antibiotics",           "TABLET",    30, "Bottle",  500, 100, 8,   15,  12),
            ("Azithromycin 250mg",       "Antibiotics",           "TABLET",    6,  "Pack",    200, 50,  35,  70,  55),
            ("Metronidazole 400mg",      "Antibiotics",           "TABLET",    21, "Strip",   400, 80,  5,   10,  8),
            ("Ciprofloxacin 500mg",      "Antibiotics",           "TABLET",    10, "Strip",   300, 60,  18,  35,  28),
            ("Paracetamol 500mg",        "Analgesics",            "TABLET",    100,"Bottle",  1000, 200, 2,  5,   4),
            ("Ibuprofen 400mg",          "Analgesics",            "TABLET",    30, "Bottle",  500, 100, 4,   10,  8),
            ("Diclofenac 50mg",          "Analgesics",            "TABLET",    30, "Bottle",  400, 80,  5,   12,  10),
            ("Tramadol 50mg",            "Analgesics",            "TABLET",    10, "Strip",   200, 40,  15,  35,  28),
            ("Amlodipine 5mg",           "Antihypertensives",     "TABLET",    30, "Bottle",  300, 60,  10,  25,  20),
            ("Enalapril 10mg",           "Antihypertensives",     "TABLET",    30, "Bottle",  300, 60,  8,   20,  16),
            ("Hydrochlorothiazide 25mg", "Antihypertensives",     "TABLET",    28, "Pack",    250, 50,  5,   15,  12),
            ("Metformin 500mg",          "Antidiabetics",         "TABLET",    30, "Bottle",  400, 80,  6,   18,  14),
            ("Glibenclamide 5mg",        "Antidiabetics",         "TABLET",    28, "Pack",    250, 50,  4,   12,  10),
            ("Artemether-Lumefantrine",  "Antimalarials",         "TABLET",    24, "Pack",    600, 120, 120, 250, 200),
            ("Chloroquine 250mg",        "Antimalarials",         "TABLET",    30, "Bottle",  200, 40,  5,   15,  12),
            ("Quinine 300mg",            "Antimalarials",         "TABLET",    30, "Bottle",  150, 30,  10,  25,  20),
            ("Cotrimoxazole 480mg",      "Antiretrovirals",       "TABLET",    100,"Bottle",  500, 100, 3,   8,   6),
            ("Tenofovir/Lamivudine/DTG", "Antiretrovirals",       "TABLET",    30, "Bottle",  300, 60,  80,  200, 160),
            ("Normal Saline 500ml",      "IV Fluids",             "INJECTION", 1,  "Bag",     200, 40,  120, 280, 250),
            ("Ringer's Lactate 500ml",   "IV Fluids",             "INJECTION", 1,  "Bag",     150, 30,  130, 300, 270),
            ("Dextrose 5% 500ml",        "IV Fluids",             "INJECTION", 1,  "Bag",     150, 30,  130, 300, 270),
            ("Folic Acid 5mg",           "Vitamins & Supplements","TABLET",    30, "Bottle",  500, 100, 2,   5,   4),
            ("Ferrous Sulphate 200mg",   "Vitamins & Supplements","TABLET",    30, "Bottle",  400, 80,  3,   8,   6),
            ("Vitamin C 500mg",          "Vitamins & Supplements","TABLET",    30, "Bottle",  300, 60,  3,   8,   6),
            ("Cetirizine 10mg",          "Antihistamines",        "TABLET",    10, "Strip",   300, 60,  8,   20,  16),
            ("Loratadine 10mg",          "Antihistamines",        "TABLET",    10, "Strip",   300, 60,  8,   20,  16),
            ("Clotrimazole 500mg",       "Antifungals",           "TABLET",    1,  "Pessary", 100, 20,  45,  100, 80),
            ("Fluconazole 150mg",        "Antifungals",           "CAPSULE",   1,  "Capsule", 150, 30,  50,  120, 96),
            ("Betamethasone Cream",      "Dermatologicals",       "CREAM_TUBE",1,  "Tube",    100, 20,  80,  200, 160),
            ("Hydrocortisone Cream 1%",  "Dermatologicals",       "CREAM_TUBE",1,  "Tube",    80,  20,  60,  150, 120),
            ("Chloramphenicol Eye Drops","Ophthalmics",           "DROPS",     1,  "Bottle",  80,  20,  60,  150, 120),
            ("Gentamicin Eye Drops",     "Ophthalmics",           "DROPS",     1,  "Bottle",  80,  20,  70,  170, 136),
            ("ORS Sachet",               "IV Fluids",             "SACHET",    1,  "Sachet",  500, 100, 10,  25,  20),
            ("Morphine 10mg",            "Analgesics",            "INJECTION", 1,  "Ampoule", 50,  10,  200, 450, 360),
            ("Oxytocin 10IU",            "Vitamins & Supplements","INJECTION", 1,  "Ampoule", 100, 20,  80,  200, 160),
        ]

        expiry = date.today() + timedelta(days=365 * 2)
        for row in medicines:
            name, cat_name, unit_type, upack, pack_name, qty, reorder, cost, price, price_ins = row
            Medicine.objects.get_or_create(
                name=name,
                defaults=dict(
                    category=cat.get(cat_name), unit_type=unit_type,
                    units_per_pack=upack, pack_name=pack_name,
                    quantity_in_stock=qty, reorder_level=reorder,
                    cost_per_unit_cash=Decimal(str(cost)),
                    price_per_unit_cash=Decimal(str(price)),
                    price_per_unit_insurance=Decimal(str(price_ins)),
                    expiry_date=expiry, manufacturer="KNH Pharmaceuticals",
                ),
            )
        self.stdout.write(f"  ✓ Medicines ({len(medicines)})")

    # ------------------------------------------------------------------
    def _lab_test_categories(self):
        cats = [
            ("Full Blood Count",          "HEMATOLOGY",    "Haematology Lab"),
            ("Blood Chemistry",           "BIOCHEMISTRY",  "Biochemistry Lab"),
            ("Microbiology & Cultures",   "MICROBIOLOGY",  "Microbiology Lab"),
            ("Serology & Immunology",     "SEROLOGY",      "Serology Lab"),
            ("Parasitology",              "PARASITOLOGY",  "Parasitology Lab"),
            ("Histopathology",            "HISTOPATHOLOGY","Histopathology Lab"),
            ("Plain Radiography",         "XRAY",          "Radiology"),
            ("Ultrasound",                "ULTRASOUND",    "Radiology"),
            ("CT Scan",                   "CT_SCAN",       "Radiology"),
            ("MRI",                       "MRI",           "Radiology"),
        ]
        for name, cat_type, dept in cats:
            LabTestCategory.objects.get_or_create(
                name=name, defaults=dict(category_type=cat_type, department=dept)
            )
        self.stdout.write(f"  ✓ LabTestCategories ({len(cats)})")

    # ------------------------------------------------------------------
    def _lab_tests(self):
        cat_map = {c.name: c for c in LabTestCategory.objects.all()}

        tests = [
            # (code, name, category_name, sample, cost, nhif, sha)
            ("FBC",   "Full Blood Count",               "Full Blood Count",        "BLOOD", 350, True,  True),
            ("ESR",   "Erythrocyte Sedimentation Rate", "Full Blood Count",        "BLOOD", 200, True,  True),
            ("BG",    "Blood Group & Rhesus",           "Full Blood Count",        "BLOOD", 300, True,  True),
            ("PT",    "Prothrombin Time",                "Full Blood Count",        "BLOOD", 400, True,  True),
            ("BS",    "Blood Sugar (Random)",            "Blood Chemistry",         "BLOOD", 200, True,  True),
            ("HbA1c", "Glycated Haemoglobin",            "Blood Chemistry",         "BLOOD", 900, True,  True),
            ("LFT",   "Liver Function Tests",            "Blood Chemistry",         "BLOOD", 900, True,  True),
            ("RFT",   "Renal Function Tests",            "Blood Chemistry",         "BLOOD", 900, True,  True),
            ("LIP",   "Lipid Profile",                   "Blood Chemistry",         "BLOOD", 1000, True, True),
            ("THY",   "Thyroid Function Tests",          "Blood Chemistry",         "BLOOD", 1500, True, True),
            ("CS",    "Culture & Sensitivity",           "Microbiology & Cultures", "BLOOD", 1200, True, True),
            ("UC",    "Urine Culture",                   "Microbiology & Cultures", "URINE", 1000, True, True),
            ("URNE",  "Urinalysis",                      "Parasitology",            "URINE", 200, True,  True),
            ("STOL",  "Stool Microscopy",                "Parasitology",            "STOOL", 300, True,  True),
            ("MALA",  "Malaria RDT",                     "Parasitology",            "BLOOD", 200, True,  True),
            ("MPCRDT","Malaria Film",                    "Parasitology",            "BLOOD", 350, True,  True),
            ("HIV",   "HIV Rapid Test",                  "Serology & Immunology",   "BLOOD", 300, True,  True),
            ("VDRL",  "VDRL (Syphilis)",                 "Serology & Immunology",   "BLOOD", 400, True,  True),
            ("HBsAg", "Hepatitis B Surface Antigen",     "Serology & Immunology",   "BLOOD", 500, True,  True),
            ("WIDAL", "Widal Test",                      "Serology & Immunology",   "BLOOD", 400, True,  True),
            ("ECG",   "Electrocardiogram",               "Plain Radiography",       "NONE",  500, True,  True),
            ("CXR",   "Chest X-Ray",                     "Plain Radiography",       "NONE",  800, True,  True),
            ("ABD-US","Abdominal Ultrasound",            "Ultrasound",              "NONE",  1500, True, True),
            ("OBS-US","Obstetric Ultrasound",            "Ultrasound",              "NONE",  1500, True, True),
            ("CT-HEAD","CT Head",                        "CT Scan",                 "NONE",  8000, True, True),
            ("CT-ABD","CT Abdomen & Pelvis",             "CT Scan",                 "NONE",  10000, True, True),
            ("MRI-BRAIN","MRI Brain",                   "MRI",                     "NONE",  15000, True, True),
        ]
        for code, name, cat_name, sample, cost, nhif, sha in tests:
            cat = cat_map.get(cat_name)
            LabTest.objects.get_or_create(
                test_code=code,
                defaults=dict(
                    test_name=name, category=cat, sample_type=sample,
                    cost=Decimal(str(cost)), nhif_covered=nhif, sha_covered=sha,
                    turnaround_time=4 if sample != "NONE" else 2,
                ),
            )
        self.stdout.write(f"  ✓ LabTests ({len(tests)})")

    # ------------------------------------------------------------------
    def _wards_and_beds(self):
        wards_data = [
            ("GW-01", "General Male Ward",       "GENERAL",   "Ground", 20),
            ("GW-02", "General Female Ward",     "GENERAL",   "Ground", 20),
            ("PW-01", "Private Ward",            "PRIVATE",   "1st",    10),
            ("ICU-01","Intensive Care Unit",      "ICU",       "2nd",     6),
            ("HDU-01","High Dependency Unit",     "HDU",       "2nd",     8),
            ("MAT-01","Maternity Ward",           "MATERNITY", "1st",    15),
            ("PED-01","Paediatric Ward",          "PEDIATRIC", "Ground", 12),
            ("SRG-01","Surgical Ward",            "SURGICAL",  "1st",    10),
            ("ISO-01","Isolation Ward",           "ISOLATION", "3rd",     4),
        ]

        for code, name, wtype, floor, bed_count in wards_data:
            ward, _ = Ward.objects.get_or_create(
                ward_code=code,
                defaults=dict(ward_name=name, ward_type=wtype, floor_number=floor, total_beds=bed_count),
            )
            existing_beds = Bed.objects.filter(ward=ward).count()
            for i in range(existing_beds + 1, bed_count + 1):
                bed_type = "ICU" if wtype == "ICU" else ("MATERNITY" if wtype == "MATERNITY" else ("ISOLATION" if wtype == "ISOLATION" else "STANDARD"))
                Bed.objects.get_or_create(
                    bed_number=f"{code}-B{i:02d}",
                    defaults=dict(
                        ward=ward, bed_type=bed_type,
                        status="AVAILABLE",
                        has_oxygen=(wtype in ("ICU", "HDU", "ISOLATION")),
                        has_monitor=(wtype in ("ICU", "HDU")),
                        daily_rate=Decimal("3000" if wtype == "ICU" else ("2000" if wtype == "HDU" else ("5000" if wtype == "PRIVATE" else "1200"))),
                    ),
                )
        self.stdout.write(f"  ✓ Wards ({len(wards_data)}) & Beds")

    # ------------------------------------------------------------------
    def _emergency_beds(self):
        em_beds = [
            ("ER-B01", "Bay 1 — Resuscitation"),
            ("ER-B02", "Bay 2 — Resuscitation"),
            ("ER-B03", "Bay 3 — Acute"),
            ("ER-B04", "Bay 4 — Acute"),
            ("ER-B05", "Bay 5 — Acute"),
            ("ER-B06", "Bay 6 — Minor"),
            ("ER-B07", "Bay 7 — Minor"),
            ("ER-B08", "Bay 8 — Observation"),
        ]
        for bed_number, location in em_beds:
            EmergencyBed.objects.get_or_create(
                bed_number=bed_number,
                defaults=dict(location=location, has_oxygen=True, has_monitor=True, has_suction=True),
            )
        self.stdout.write(f"  ✓ EmergencyBeds ({len(em_beds)})")

    # ------------------------------------------------------------------
    def _suppliers(self):
        suppliers = [
            ("Cosmos Pharmaceuticals", "PHARMACEUTICAL", "Jane Waweru",   "+254711111001", "jane@cosmos.co.ke",   "Industrial Area, Nairobi", "Nairobi",  "Nairobi",  "P0001234567A"),
            ("Medisel Kenya",          "PHARMACEUTICAL", "Tom Mwenda",    "+254711111002", "tom@medisel.co.ke",   "Enterprise Rd, Nairobi",   "Nairobi",  "Nairobi",  "P0001234568B"),
            ("Surgipharm Ltd",         "SURGICAL",       "Ann Kamotho",   "+254711111003", "ann@surgipharm.co.ke","Westlands, Nairobi",        "Nairobi",  "Nairobi",  "P0001234569C"),
            ("BioLab Supplies",        "LABORATORY",     "Mike Osei",     "+254711111004", "mike@biolab.co.ke",   "South C, Nairobi",          "Nairobi",  "Nairobi",  "P0001234570D"),
            ("TechMed Equipment",      "MEDICAL_EQUIPMENT","Sue Ndegwa",  "+254711111005", "sue@techmed.co.ke",   "Upperhill, Nairobi",        "Nairobi",  "Nairobi",  "P0001234571E"),
        ]
        for sname, stype, contact, phone, email, address, city, county, pin in suppliers:
            Supplier.objects.get_or_create(
                pin_number=pin,
                defaults=dict(
                    supplier_name=sname, supplier_type=stype, contact_person=contact,
                    phone_number=phone, email=email, physical_address=address,
                    city=city, county=county, status="ACTIVE", credit_days=30,
                    credit_limit=Decimal("500000"),
                ),
            )
        self.stdout.write(f"  ✓ Suppliers ({len(suppliers)})")

    # ------------------------------------------------------------------
    def _leave_types(self):
        types = [
            ("Annual Leave",        21, False, True,  0),
            ("Sick Leave",          14, True,  True,  0),
            ("Maternity Leave",     90, True,  True,  7),
            ("Paternity Leave",     14, False, True,  7),
            ("Study Leave",         10, True,  True,  14),
            ("Compassionate Leave",  5, False, True,  0),
            ("Unpaid Leave",         0, False, False, 14),
        ]
        for name, days, attach, paid, notice in types:
            LeaveType.objects.get_or_create(
                name=name,
                defaults=dict(days_allowed_per_year=days, requires_attachment=attach, is_paid=paid, minimum_notice_days=notice),
            )
        self.stdout.write(f"  ✓ LeaveTypes ({len(types)})")

    # ------------------------------------------------------------------
    def _wifi_networks(self):
        networks = [
            ("SouthB-Staff",    "AA:BB:CC:DD:EE:01", "Main Building"),
            ("SouthB-Staff-2",  "AA:BB:CC:DD:EE:02", "Maternity Block"),
            ("SouthB-Staff-3",  "AA:BB:CC:DD:EE:03", "Emergency Wing"),
        ]
        for name, bssid, loc in networks:
            HospitalWiFiNetwork.objects.get_or_create(
                network_name=name, defaults=dict(bssid=bssid, location=loc, ip_range="192.168.10.0/24")
            )
        self.stdout.write(f"  ✓ WiFiNetworks ({len(networks)})")

    # ------------------------------------------------------------------
    def _assets(self):
        assets = [
            ("ASSET-001", "Ventilator — Hamilton G5",         "MEDICAL_EQUIPMENT",    "ICU",         180000, "2026-12-31"),
            ("ASSET-002", "Patient Monitor — Mindray",        "MEDICAL_EQUIPMENT",    "ICU",          85000, "2027-06-30"),
            ("ASSET-003", "Ultrasound Machine — GE LOGIQ",    "RADIOLOGY_EQUIPMENT",  "Radiology",   350000, "2027-12-31"),
            ("ASSET-004", "Portable X-Ray Unit",              "RADIOLOGY_EQUIPMENT",  "Radiology",   500000, "2028-01-01"),
            ("ASSET-005", "Haematology Analyser — Sysmex",   "LABORATORY_EQUIPMENT", "Lab",          200000, "2027-06-30"),
            ("ASSET-006", "Biochemistry Analyser",            "LABORATORY_EQUIPMENT", "Lab",          250000, "2027-06-30"),
            ("ASSET-007", "Autoclave — 50L",                  "SURGICAL_EQUIPMENT",   "CSSD",          60000, "2028-01-01"),
            ("ASSET-008", "Server — Dell PowerEdge R540",     "IT_EQUIPMENT",         "Server Room",   250000, "2028-12-31"),
            ("ASSET-009", "Generator — 100KVA Perkins",       "GENERATOR",            "Compound",     1800000, "2030-01-01"),
            ("ASSET-010", "Ambulance — Toyota HiAce",         "VEHICLE",              "Parking",      4500000, "2030-01-01"),
        ]
        admin_user = User.objects.filter(is_superuser=True).first()
        for asset_id, name, cat, loc, cost, warranty in assets:
            HospitalAsset.objects.get_or_create(
                asset_id=asset_id,
                defaults=dict(
                    asset_name=name, category=cat, location=loc,
                    purchase_cost=Decimal(str(cost)),
                    purchase_date=date(2022, 1, 1),
                    warranty_expiry=date.fromisoformat(warranty),
                    status="OPERATIONAL", condition="GOOD",
                    next_maintenance_date=date.today() + timedelta(days=90),
                    created_by=admin_user,
                ),
            )
        self.stdout.write(f"  ✓ HospitalAssets ({len(assets)})")

    # ------------------------------------------------------------------
    def _patients_with_sha(self):
        first_names = ["John", "Mary", "Peter", "Grace", "James", "Agnes", "David",
                       "Ruth", "Joseph", "Faith", "Samuel", "Esther", "Daniel", "Lydia"]
        last_names  = ["Kamau", "Wanjiku", "Otieno", "Muthoni", "Kariuki", "Akinyi",
                       "Ndung'u", "Njeri", "Odhiambo", "Waweru", "Mutua", "Chebet",
                       "Kirui", "Wairimu"]

        sha_patients = [
            f"{fn} {ln}" for fn, ln in zip(first_names, last_names)
        ]

        created = 0
        for full_name in sha_patients:
            fn, ln = full_name.split(" ", 1)
            dob = date(random.randint(1960, 2000), random.randint(1, 12), random.randint(1, 28))
            patient, new = Patient.objects.get_or_create(
                phone_number=f"+2547{random.randint(10000000, 99999999)}",
                defaults=dict(
                    first_name=fn, last_name=ln, date_of_birth=dob,
                    gender=random.choice(["M", "F"]),
                    blood_type=random.choice(["A+", "B+", "O+", "AB+", "A-", "B-", "O-"]),
                ),
            )
            if new:
                created += 1
                sha_number = f"SHA-{random.randint(100000000, 999999999)}"
                SHAMember.objects.get_or_create(
                    patient=patient,
                    defaults=dict(
                        sha_number=sha_number, status="ACTIVE",
                        package_name="Standard Package",
                        annual_limit=Decimal("500000"),
                        expiry_date=date(2025, 12, 31),
                    ),
                )

        self.stdout.write(f"  ✓ Patients ({created} new) with SHA members")