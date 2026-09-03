# Database Design & Prisma Schema — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Database:** PostgreSQL 16+  
**ORM:** Prisma ORM  
**Date:** September 2026  

---

## 1. Database Architecture & Hybrid Schema Strategy

MediKiosk employs a **hybrid relational + JSONB design** in PostgreSQL:
- **Relational Integrity:** Core operational entities (Patients, Staff, Kiosk Sessions, Documents, Audit Logs, Red-Flag Alerts) are strictly normalized with foreign key constraints, unique indexes, and cascading rules.
- **Dynamic Semi-Structured Storage (JSONB):** Flexible clinical sub-trees (adaptive HPI slots, Review of Systems, Dashavidha Pariksha) utilize PostgreSQL JSONB columns with **GIN (Generalized Inverted Index)** indexing, enabling schema evolution across medical specialties without requiring database migration downtime.

---

## 2. Complete Prisma Schema Model

```prisma
// ==========================================
// Prisma Schema Definition for MediKiosk
// ==========================================

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ------------------------------------------
// Enums
// ------------------------------------------

enum StaffRole {
  DOCTOR
  TRIAGE_STAFF
  SYSTEM_ADMIN
  KIOSK_OPERATOR
}

enum LanguageCode {
  EN
  HI
  MR
}

enum WorkflowMode {
  ALLOPATHIC
  AYUSH
  HYBRID
}

enum SessionStatus {
  IN_PROGRESS
  COMPLETED
  EMERGENCY_LOCKED
  ABORTED_TIMEOUT
  ABORTED_USER
}

enum DataProvenance {
  PATIENT_REPORTED
  AI_EXTRACTED
  AI_NORMALIZED
  PHYSICIAN_VERIFIED
  PHYSICIAN_EDITED
  PHYSICIAN_REJECTED
}

enum AlertSeverity {
  CRITICAL
  URGENT
  ELEVATED
  INFO
}

enum DocumentType {
  PRESCRIPTION
  LAB_REPORT
  DISCHARGE_SUMMARY
  RADIOLOGY_REPORT
  OTHER
}

// ------------------------------------------
// 1. Staff & System Users
// ------------------------------------------

model StaffUser {
  id               String       @id @default(uuid())
  email            String       @unique
  passwordHash     String
  fullName         String
  role             StaffRole
  registrationNo   String?      // Medical Council / Board Registration ID
  department       String?      // e.g., "General Medicine", "Kayachikitsa"
  isActive         boolean      @default(true)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  verifiedEntities ExtractedEntity[]
  signedHistories  ClinicalHistory[]
  clearedAlerts    RedFlagAlert[]
  auditLogs        AuditLog[]

  @@map("staff_users")
}

// ------------------------------------------
// 2. Kiosk Terminal Registration
// ------------------------------------------

model KioskTerminal {
  id             String          @id @default(uuid())
  kioskCode      String          @unique // e.g., "KIOSK-OPD-01"
  location       String          // e.g., "Block A Ground Floor Waiting Area"
  apiKeyHash     String
  isActive       Boolean         @default(true)
  lastHeartbeat  DateTime?
  createdAt      DateTime        @default(now())

  sessions       IntakeSession[]

  @@map("kiosk_terminals")
}

// ------------------------------------------
// 3. Patient Demographics & Identity
// ------------------------------------------

model Patient {
  id                 String             @id @default(uuid())
  abhaId             String?            @unique // Ayushman Bharat Health Account
  abhaAddress        String?            @unique // e.g., "ramesh.kumar@abdm"
  hospitalUhid       String?            @unique // Hospital Unique Health ID
  fullName           String
  dateOfBirth        DateTime?
  ageYears           Int?
  gender             String             // "MALE", "FEMALE", "OTHER"
  phoneNumberHash    String?            // SHA-256 for privacy-preserving lookup
  primaryLanguage    LanguageCode       @default(HI)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  sessions           IntakeSession[]
  clinicalHistories  ClinicalHistory[]
  documents          DocumentRecord[]
  timelineEvents     MedicalTimelineEvent[]

  @@index([phoneNumberHash])
  @@map("patients")
}

// ------------------------------------------
// 4. Kiosk Intake Sessions
// ------------------------------------------

model IntakeSession {
  id               String             @id @default(uuid())
  kioskTerminalId  String
  patientId        String?
  language         LanguageCode       @default(HI)
  workflowMode     WorkflowMode       @default(ALLOPATHIC)
  status           SessionStatus      @default(IN_PROGRESS)
  currentNodeId    String?
  startedAt        DateTime           @default(now())
  completedAt      DateTime?
  lastActiveAt     DateTime           @default(now())

  kioskTerminal    KioskTerminal      @relation(fields: [kioskTerminalId], references: [id])
  patient          Patient?           @relation(fields: [patientId], references: [id])
  consent          ConsentRecord?
  clinicalHistory  ClinicalHistory?
  documents        DocumentRecord[]
  redFlagAlerts    RedFlagAlert[]

  @@map("intake_sessions")
}

// ------------------------------------------
// 5. Consent Records (DPDP / ABDM)
// ------------------------------------------

model ConsentRecord {
  id                    String        @id @default(uuid())
  sessionId             String        @unique
  consentGranted        Boolean       @default(false)
  dpdpNoticeAccepted    Boolean       @default(false)
  abdmSharingConsent    Boolean       @default(false)
  signatureOrVoiceHash  String
  timestamp             DateTime      @default(now())

  intakeSession         IntakeSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@map("consent_records")
}

// ------------------------------------------
// 6. Clinical History Master Record
// ------------------------------------------

model ClinicalHistory {
  id                     String           @id @default(uuid())
  sessionId              String           @unique
  patientId              String
  hpiData                Json             // Structured HPI slots (SOCRATES/OPQRST)
  pmhxData               Json?            // Past medical conditions array
  pshxData               Json?            // Past surgical procedures array
  medicationsData        Json?            // Active drug history
  allergiesData          Json?            // Documented allergies
  familyHistoryData      Json?            // Family health risks
  personalHistoryData    Json?            // Diet, sleep, bowel, habits
  reviewOfSystemsData    Json?            // ROS positive/negative findings
  aiGeneratedSummary     String?          // Generated SOAP narrative draft
  physicianNotes         String?          // Doctor manual additions
  isVerified             Boolean          @default(false)
  verifiedAt             DateTime?
  verifiedByDoctorId     String?
  createdAt              DateTime         @default(now())
  updatedAt              DateTime         @updatedAt

  intakeSession          IntakeSession    @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  patient                Patient          @relation(fields: [patientId], references: [id])
  verifiedByDoctor       StaffUser?       @relation(fields: [verifiedByDoctorId], references: [id])
  chiefComplaints        ChiefComplaint[]
  ayushRecord            AyushRecord?

  @@index([patientId])
  @@map("clinical_histories")
}

model ChiefComplaint {
  id                 String           @id @default(uuid())
  clinicalHistoryId  String
  complaintName      String           // e.g., "Chest Pain"
  standardCode       String?          // SNOMED or ICD-10 code
  durationValue      Int
  durationUnit       String           // "DAYS", "WEEKS", "MONTHS"
  priorityRank       Int              @default(1)
  provenance         DataProvenance   @default(PATIENT_REPORTED)

  clinicalHistory    ClinicalHistory  @relation(fields: [clinicalHistoryId], references: [id], onDelete: Cascade)

  @@map("chief_complaints")
}

// ------------------------------------------
// 7. Medical Documents & Extracted Entities
// ------------------------------------------

model DocumentRecord {
  id               String            @id @default(uuid())
  sessionId        String
  patientId        String
  documentType     DocumentType      @default(PRESCRIPTION)
  filePath         String            // Encrypted storage path
  mimeType         String            // "image/jpeg", "image/png", "application/pdf"
  fileSizeBytes    Int
  ocrRawText       String?           // Extracted PaddleOCR text
  ocrConfidence    Float?
  isProcessed      Boolean           @default(false)
  createdAt        DateTime          @default(now())

  intakeSession    IntakeSession     @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  patient          Patient           @relation(fields: [patientId], references: [id])
  extractedEntities ExtractedEntity[]

  @@map("document_records")
}

model ExtractedEntity {
  id                   String          @id @default(uuid())
  documentRecordId     String
  entityType           String          // "DIAGNOSIS", "MEDICATION", "LAB_TEST", "PROCEDURE"
  entityName           String          // e.g., "Metformin", "HbA1c"
  entityValue          String?         // e.g., "500mg", "8.4%"
  standardCode         String?         // ICD-10, LOINC, SNOMED
  boundingBoxCoords    Json?           // { xMin, yMin, xMax, yMax, pageNumber }
  confidenceScore      Float           @default(0.0)
  provenance           DataProvenance  @default(AI_EXTRACTED)
  verifiedByStaffId    String?
  verifiedAt           DateTime?
  createdAt            DateTime        @default(now())

  documentRecord       DocumentRecord  @relation(fields: [documentRecordId], references: [id], onDelete: Cascade)
  verifiedByStaff      StaffUser?      @relation(fields: [verifiedByStaffId], references: [id])

  @@map("extracted_entities")
}

// ------------------------------------------
// 8. Deterministic Red-Flag Alerts
// ------------------------------------------

model RedFlagAlert {
  id                   String          @id @default(uuid())
  sessionId            String
  ruleId               String          // e.g., "RULE_ACS_001"
  ruleName             String
  severity             AlertSeverity   @default(CRITICAL)
  triggerContext       Json            // Snapshot of slots causing the trigger
  isAcknowledged       Boolean         @default(false)
  acknowledgedByStaffId String?
  acknowledgedAt       DateTime?
  createdAt            DateTime        @default(now())

  intakeSession        IntakeSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  acknowledgedByStaff  StaffUser?      @relation(fields: [acknowledgedByStaffId], references: [id])

  @@map("red_flag_alerts")
}

// ------------------------------------------
// 9. Chronological Medical Timeline
// ------------------------------------------

model MedicalTimelineEvent {
  id                  String          @id @default(uuid())
  patientId           String
  eventDate           DateTime
  eventType           String          // "DIAGNOSIS", "MEDICATION_START", "LAB_RESULT", "SURGERY"
  title               String
  description         String?
  sourceType          String          // "DOCUMENT_OCR", "KIOSK_INTAKE", "ABDM_RECORD"
  provenance          DataProvenance  @default(AI_EXTRACTED)
  createdAt           DateTime        @default(now())

  patient             Patient         @relation(fields: [patientId], references: [id])

  @@index([patientId, eventDate])
  @@map("medical_timeline_events")
}

// ------------------------------------------
// 10. AYUSH Clinical Record
// ------------------------------------------

model AyushRecord {
  id                   String          @id @default(uuid())
  clinicalHistoryId    String          @unique
  prakritiAssessment   Json            // Vata, Pitta, Kapha scores
  vikritiData          Json            // Current doshic vitiation
  dashavidhaData       Json            // Sara, Samhanana, Pramana, Satmya, Sattva, Ahara/Vyayama Shakti
  ashtavidhaSelfReport Json            // Mutra, Mala, Kostha, Jihva self-report
  aharaViharaData      Json            // Diet, sleep, circadian habits
  createdAt            DateTime        @default(now())

  clinicalHistory      ClinicalHistory @relation(fields: [clinicalHistoryId], references: [id], onDelete: Cascade)

  @@map("ayush_records")
}

// ------------------------------------------
// 11. Security Audit Trail
// ------------------------------------------

model AuditLog {
  id             String       @id @default(uuid())
  staffUserId    String?
  action         String       // "CONSENT_RECORDED", "DOCUMENT_VIEWED", "ENTITY_VERIFIED", "RED_FLAG_CLEARED"
  resourceType   String       // "PATIENT", "DOCUMENT", "CLINICAL_HISTORY", "RED_FLAG"
  resourceId     String
  ipAddress      String?
  userAgent      String?
  details        Json?
  timestamp      DateTime     @default(now())

  staffUser      StaffUser?   @relation(fields: [staffUserId], references: [id])

  @@index([timestamp])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}
```
