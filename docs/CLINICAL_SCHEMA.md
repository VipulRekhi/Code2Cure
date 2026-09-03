# Canonical Clinical History Schema — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Date:** September 2026  

---

## 1. Schema Design Philosophy

The MediKiosk Clinical Schema is the single source of truth for all patient clinical intake information. It is designed to satisfy four critical requirements:

1. **Clinical Rigor:** Standardized according to universal medical history-taking formats (SOAP, SOCRATES, OPQRST) and traditional Ayurvedic clinical methodology (Rogi & Roga Pariksha).
2. **Strict Provenance & Auditability:** Every single field, array item, or symptom record retains an immutable trace of how it entered the system, its AI extraction confidence (if applicable), and its physician verification state.
3. **Zero-Hallucination Unknown Representation:** Fields are explicitly typed as nullable or tagged with `Status: NOT_ASKED | UNKNOWN | REFUSED | NEGATIVE | POSITIVE` rather than omitted or hallucinated.
4. **Interoperability:** Directly mappable to FHIR R4 resources (`Patient`, `Condition`, `Observation`, `MedicationStatement`, `AllergyIntolerance`, `FamilyMemberHistory`, `Procedure`).

---

## 2. Provenance & Verification Enumerations

```typescript
export enum DataProvenance {
  PATIENT_REPORTED = "PATIENT_REPORTED",     // Direct patient touch input or spoken response
  AI_EXTRACTED = "AI_EXTRACTED",             // Extracted by OCR / LLM from unstructured text/speech
  AI_NORMALIZED = "AI_NORMALIZED",           // Mapped by LLM to standard codes (SNOMED, ICD-10, LOINC)
  PHYSICIAN_VERIFIED = "PHYSICIAN_VERIFIED", // Explicitly confirmed by examining doctor
  PHYSICIAN_EDITED = "PHYSICIAN_EDITED",     // Modified by examining doctor
  PHYSICIAN_REJECTED = "PHYSICIAN_REJECTED"  // Marked incorrect / discarded by doctor
}

export enum ClinicalPresenceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",                         // Pertinent negative
  UNKNOWN = "UNKNOWN",                       // Patient does not know
  NOT_ASKED = "NOT_ASKED",
  REFUSED = "REFUSED"
}

export enum SymptomSeverity {
  MILD = "MILD",
  MODERATE = "MODERATE",
  SEVERE = "SEVERE",
  UNBEARABLE = "UNBEARABLE"
}
```

---

## 3. Metadata & Provenance Envelope

Every granular clinical datum (symptom, allergy, medication, lab value) is encapsulated in a `ClinicalFieldEnvelope<T>`:

```typescript
export interface ProvenanceMetadata {
  provenance: DataProvenance;
  confidenceScore: number;           // 0.0 to 1.0 (1.0 for direct patient touch or doctor edit)
  extractedAt: string;               // ISO 8601 Timestamp
  sourceModel?: string;              // e.g., "qwen2.5-7b-instruct", "paddleocr-v4", "touch-ui"
  sourceDocumentId?: string;         // UUID of uploaded prescription / report if OCR
  sourceBoundingBox?: {              // Normalized coordinates on document image (0-1000 scale)
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    pageNumber: number;
  };
  verifiedByPhysicianId?: string;    // Doctor staff ID upon verification
  verifiedAt?: string;               // ISO 8601 Timestamp of sign-off
}

export interface ClinicalFieldEnvelope<T> {
  value: T;
  status: ClinicalPresenceStatus;
  metadata: ProvenanceMetadata;
}
```

---

## 4. Comprehensive Clinical History Schema Definition

```typescript
export interface CanonicalClinicalHistory {
  id: string;                                 // UUID
  sessionId: string;                          // Kiosk Intake Session ID
  patientId: string;                          // Patient Master ID
  encounterDate: string;                      // ISO 8601
  workflowMode: "ALLOPATHIC" | "AYUSH" | "HYBRID";
  languageUsed: "en" | "hi" | "mr";
  
  // 1. Consent & Verification
  consent: InformedConsentRecord;
  
  // 2. Demographics & Baseline
  demographics: PatientDemographics;
  
  // 3. Chief Complaints
  chiefComplaints: ChiefComplaintEntry[];
  
  // 4. History of Present Illness (HPI)
  historyOfPresentIllness: HPIStructure;
  
  // 5. Past Medical History (PMHx)
  pastMedicalHistory: PastMedicalCondition[];
  
  // 6. Past Surgical / Procedure History (PSHx)
  pastSurgicalHistory: PastSurgicalProcedure[];
  
  // 7. Drug & Current Medication History
  currentMedications: MedicationEntry[];
  
  // 8. Allergy History
  allergies: AllergyEntry[];
  
  // 9. Family Medical History
  familyHistory: FamilyHistoryEntry[];
  
  // 10. Personal, Social & Occupational History
  personalHistory: PersonalSocialHistory;
  
  // 11. Review of Systems (Pertinent Positives & Negatives)
  reviewOfSystems: ReviewOfSystems;
  
  // 12. Previous Investigations & Lab Reports
  previousInvestigations: InvestigationResultEntry[];
  
  // 13. Red-Flag Alerts Evaluated
  redFlagsEvaluated: RedFlagEvaluationRecord[];
  
  // 14. AYUSH Specific Module (if AYUSH or HYBRID mode)
  ayushRecord?: AyushClinicalRecord;
  
  // 15. Physician Summary & Sign-off
  physicianSignoff?: PhysicianSignoffRecord;
}
```

---

## 5. Detailed Component Schemas

### 5.1 Informed Consent Record
```typescript
export interface InformedConsentRecord {
  consentGranted: boolean;
  timestamp: string;
  consentType: "EXPLICIT_DIGITAL_AUDIO_TOUCH";
  dpdpNoticeAccepted: boolean;
  abdmDataSharingConsent: boolean;
  patientSignatureOrVoiceAckHash: string;   // SHA-256 of voice snippet or touch ACK
  languageVersion: string;
}
```

### 5.2 Chief Complaints & HPI (SOCRATES / OPQRST)
```typescript
export interface ChiefComplaintEntry {
  complaintName: string;                     // e.g., "Chest Pain", "Fever", "Cough"
  standardCode?: {
    system: "SNOMED-CT" | "ICD-10" | "NAMASTE"; // NAMASTE for AYUSH
    code: string;
    display: string;
  };
  durationValue: number;                     // e.g., 3
  durationUnit: "HOURS" | "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
  priorityRank: number;                      // 1 = primary, 2 = secondary
  metadata: ProvenanceMetadata;
}

export interface HPIStructure {
  narrativeSummary: ClinicalFieldEnvelope<string>;
  socratesBreakdown: {
    site: ClinicalFieldEnvelope<string>;                 // e.g., "Retrosternal / Left precordial"
    onset: ClinicalFieldEnvelope<"ACUTE" | "SUBACUTE" | "INSIDIOUS">;
    character: ClinicalFieldEnvelope<string>;            // e.g., "Crushing, pressure-like"
    radiation: ClinicalFieldEnvelope<string[]>;          // e.g., ["Left arm", "Jaw"]
    associations: ClinicalFieldEnvelope<string[]>;       // e.g., ["Diaphoresis", "Nausea", "Dyspnea"]
    timeCoursePattern: ClinicalFieldEnvelope<"CONTINUOUS" | "INTERMITTENT" | "WORSENING" | "IMPROVING">;
    exacerbatingFactors: ClinicalFieldEnvelope<string[]>; // e.g., ["Physical exertion", "Climbing stairs"]
    relievingFactors: ClinicalFieldEnvelope<string[]>;    // e.g., ["Rest", "Sublingual nitrate"]
    severityScore: ClinicalFieldEnvelope<number>;         // 1 to 10 visual analog scale
  };
  pertinentNegatives: string[];                          // e.g., ["No hemoptysis", "No fever", "No trauma"]
}
```

### 5.3 Medications, Allergies & Investigations
```typescript
export interface MedicationEntry {
  id: string;
  drugName: string;                          // e.g., "Tab Metformin"
  brandName?: string;
  genericName?: string;
  dose: string;                              // e.g., "500 mg"
  frequency: string;                         // e.g., "1-0-1 (BID, Twice daily)"
  route: "ORAL" | "SUBCUTANEOUS" | "INHALATION" | "TOPICAL" | "IV" | "IM";
  startDate?: string;
  duration?: string;                         // e.g., "Ongoing since 3 years"
  adherenceStatus: "REGULAR" | "IRREGULAR" | "STOPPED_BY_SELF" | "UNKNOWN";
  reasonForDiscontinuation?: string;
  metadata: ProvenanceMetadata;
}

export interface AllergyEntry {
  id: string;
  allergen: string;                          // e.g., "Penicillin", "Sulfa drugs", "Peanuts"
  allergyCategory: "MEDICATION" | "FOOD" | "ENVIRONMENTAL" | "OTHER";
  reactionDescription: string;               // e.g., "Urticaria and facial angioedema"
  severity: "MILD" | "MODERATE" | "SEVERE_ANAPHYLAXIS";
  metadata: ProvenanceMetadata;
}

export interface InvestigationResultEntry {
  id: string;
  testName: string;                          // e.g., "HbA1c", "Serum Creatinine", "ECG"
  testCategory: "BIOCHEMISTRY" | "HEMATOLOGY" | "RADIOLOGY" | "CARDIOLOGY" | "OTHER";
  resultValue: string;                       // e.g., "8.4"
  unit: string;                              // e.g., "%", "mg/dL"
  referenceRange?: string;                   // e.g., "4.0 - 5.6 %"
  isAbnormal: boolean;
  testDate?: string;                         // ISO Date
  labName?: string;
  metadata: ProvenanceMetadata;
}
```

### 5.4 Personal & Social History
```typescript
export interface PersonalSocialHistory {
  dietaryHabit: ClinicalFieldEnvelope<"VEGETARIAN" | "VEGAN" | "NON_VEGETARIAN" | "EGGETARIAN">;
  tobaccoUse: {
    status: ClinicalFieldEnvelope<"NEVER" | "FORMER" | "CURRENT">;
    type?: "SMOKING_CIGARETTE" | "BIDI" | "CHEWING_GUTKHA" | "KHAINI";
    frequencyPackYears?: string;
  };
  alcoholUse: {
    status: ClinicalFieldEnvelope<"NEVER" | "OCCASIONAL" | "REGULAR_HEAVY">;
    details?: string;
  };
  sleepPatternHours: ClinicalFieldEnvelope<number>;
  physicalActivityLevel: ClinicalFieldEnvelope<"SEDENTARY" | "MODERATE" | "ATHLETIC">;
  bowelHabit: ClinicalFieldEnvelope<"REGULAR" | "CONSTIPATED" | "DIARRHEA" | "ALTERNATING">;
  appetiteStatus: ClinicalFieldEnvelope<"NORMAL" | "REDUCED" | "INCREASED">;
}
```

### 5.5 Physician Review & Sign-Off Record
```typescript
export interface PhysicianSignoffRecord {
  physicianId: string;
  physicianName: string;
  registrationNumber: string;
  signoffTimestamp: string;
  doctorNotes: string;
  clinicalImpressionDraft: string;           // Entered or verified by physician
  prescribedPlan: string;
  disposition: "DISCHARGED_HOME" | "ADMITTED_IPD" | "REFERRED_SPECIALIST" | "EMERGENCY_TRANSFER";
  signatureCryptographicHash: string;        // Non-repudiation audit hash
}
```
