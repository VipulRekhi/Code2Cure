# Medical Document AI Pipeline — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Date:** September 2026  

---

## 1. Document Processing Pipeline Overview

Patients arriving at hospital OPDs frequently carry physical paper documents: handwritten prescriptions from community clinics, typed hospital discharge summaries, printed lab reports (biochemistry, hematology, lipid profiles), and imaging reports.

MediKiosk processes these documents through a rigorous 9-stage pipeline:

```
[ 1. Document Upload / Camera Capture ] (JPEG / PNG / PDF via kiosk scanner or mobile upload)
                     ↓
[ 2. File Validation & Sanitization ] (Magic bytes check, size limit < 15MB, malware check)
                     ↓
[ 3. Pre-Processing & Enhancement ] (Deskewing, contrast enhancement, PDF page rasterization)
                     ↓
[ 4. Layout Analysis & OCR (PaddleOCR) ] (Detection of text blocks, tables, and bounding boxes)
                     ↓
[ 5. Raw Text & Layout Assembly ] (Hierarchical structure: Headers, Tabular rows, Paragraphs)
                     ↓
[ 6. Medical Entity Extraction (Qwen2.5-7B) ] (Diagnoses, Drugs, Doses, Labs, Values, Ranges)
                     ↓
[ 7. Normalization & Code Mapping ] (Unit standardization, date parsing, SNOMED/LOINC mapping)
                     ↓
[ 8. Provenance & Coordinate Tagging ] (Bounding box attachment to every extracted entity)
                     ↓
[ 9. Timeline Synthesis & Doctor Review ] (Interactive side-by-side audit UI on Doctor Dashboard)
```

---

## 2. PaddleOCR Integration & Layout Analysis

PaddleOCR (PP-OCRv4 + PP-Structure) is utilized for local, GPU/CPU-accelerated document analysis:
- **Text Detection (DBNet++):** Locates exact polygonal bounding boxes for printed and clear handwritten lines.
- **Text Recognition (SVTR / LCNet):** Recognizes English and Devanagari characters.
- **Table Structure Recognition:** Extracts tabular laboratory reports preserving row-column associations (e.g., `Test Name | Result | Unit | Biological Reference Interval`).

> [!WARNING]
> **Handwritten Medical OCR Disclaimer:**  
> Indian handwritten doctor prescriptions feature high stylistic variation, abbreviations, and cursive artifacts. MediKiosk **does not claim 100% automated accuracy on handwritten cursive scripts**.  
> If OCR confidence is low ($< 0.65$), the system automatically tags the item with `Status: MANUAL_VERIFICATION_REQUIRED` and directs the doctor to the original document crop in the review dashboard.

---

## 3. LLM Medical Entity Extraction Schema

Once PaddleOCR extracts raw text blocks and layout tables, Qwen2.5-7B-Instruct extracts structured clinical records according to a strict Zod schema:

```typescript
export interface ExtractedDocumentData {
  documentMetadata: {
    documentType: "PRESCRIPTION" | "LAB_REPORT" | "DISCHARGE_SUMMARY" | "RADIOLOGY_REPORT" | "OTHER";
    documentDate?: string;          // ISO Date
    issuingFacilityOrDoctor?: string;
  };
  diagnoses: Array<{
    conditionName: string;
    icd10CodeSuggestion?: string;
    isChronic: boolean;
    confidence: number;
    boundingBoxIndex: number;
  }>;
  medications: Array<{
    drugName: string;
    dose?: string;                  // e.g., "500 mg"
    form?: "TABLET" | "CAPSULE" | "SYRUP" | "INJECTION" | "OINTMENT";
    frequency?: string;             // e.g., "Once daily", "1-0-1"
    duration?: string;              // e.g., "14 days"
    confidence: number;
    boundingBoxIndex: number;
  }>;
  investigations: Array<{
    testName: string;
    resultValue: string;
    unit?: string;
    referenceRange?: string;
    isAbnormal?: boolean;
    confidence: number;
    boundingBoxIndex: number;
  }>;
  procedures: Array<{
    procedureName: string;
    datePerformed?: string;
    confidence: number;
    boundingBoxIndex: number;
  }>;
}
```

---

## 4. Entity-to-Bounding-Box Provenance Mapping

Every structured item extracted from a document retains a coordinate link to the original high-resolution scan:

```
+-------------------------------------------------------------------------------+
| ORIGINAL DOCUMENT SCAN (DOCTOR DASHBOARD VIEW)                                 |
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   |  Dr. S. Sharma, MD                                Date: 12/04/2025    |   |
|   |                                                                       |   |
|   |  Rx:                                                                  |   |
|   |  [ Tab Metformin 500mg BD x 1 month ] <--- Highlight Box (Green)      |   |
|   |                                                                       |   |
|   |  Diagnosis:                                                           |   |
|   |  [ Type 2 Diabetes Mellitus ] <----------- Highlight Box (Blue)       |   |
|   +-----------------------------------------------------------------------+   |
|                                                                               |
|   SIDE-BY-SIDE VERIFICATION PANEL                                             |
|   • Diagnosis: Type 2 Diabetes Mellitus (Conf: 94%) [Confirm] [Edit] [Reject]  |
|   • Drug: Metformin 500mg (Conf: 91%)               [Confirm] [Edit] [Reject]  |
+-------------------------------------------------------------------------------+
```

When the doctor hovers over or clicks an extracted entity in the dashboard, the corresponding bounding box on the original document lights up in real time, enabling instant 2-second visual verification without hunting through physical papers.

---

## 5. Medical Timeline Synthesis

Extracted document entities are automatically aggregated into the patient's master chronological timeline alongside kiosk interview findings:

```typescript
export interface MedicalTimelineEvent {
  id: string;
  patientId: string;
  eventDate: string;               // ISO 8601
  eventType: "DIAGNOSIS" | "MEDICATION_START" | "MEDICATION_STOP" | "LAB_RESULT" | "PROCEDURE" | "ENCOUNTER";
  title: string;                   // e.g., "HbA1c Lab Report (8.4%)"
  description: string;
  sourceType: "UPLOADED_DOCUMENT" | "KIOSK_INTERVIEW" | "ABDM_RECORD";
  sourceDocumentId?: string;
  sourceEntityId?: string;
  verificationStatus: "AI_EXTRACTED" | "PHYSICIAN_VERIFIED" | "PHYSICIAN_REJECTED";
}
```

---

## 6. Secure Document Storage & Retention

- **Storage Location:** Secure local filesystem on hospital server or S3-compatible private object storage (MinIO) encrypted with AES-256.
- **Access Control:** Documents are accessible only via signed, time-limited tokens (TTL 15 mins) generated for authenticated staff.
- **Audit Logging:** Every view, download, or edit of an uploaded document is logged with timestamp, user ID, and IP address.
