# FHIR R4 & ABDM Integration Architecture — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Date:** September 2026  

---

## 1. Ayushman Bharat Digital Mission (ABDM) Overview

The Ayushman Bharat Digital Mission (ABDM) aims to establish a unified digital health infrastructure for India. MediKiosk is designed as an **ABDM-ready Health Information Provider (HIP) and Health Information User (HIU)**:

```
+-----------------------------------------------------------------------------------+
|                        ABDM NATIONAL HEALTH ECOSYSTEM                             |
|                                                                                   |
|  [ABHA Identity Registry] <---> [ABDM Gateway / Bridge] <---> [Unified Consent]   |
+------------------------------------------|----------------------------------------+
                                           | Encrypted FHIR Bundles
                                           v
+-----------------------------------------------------------------------------------+
|                         MEDIKIOSK ABDM ADAPTER MODULE                             |
|                                                                                   |
|  • Milestone 1: ABHA Number / Address verification and patient registration       |
|  • Milestone 2: Health Information Provider (HIP) bundle generation & push       |
|  • Milestone 3: Health Information User (HIU) record retrieval & timeline merge   |
+------------------------------------------|----------------------------------------+
                                           | Internal DTOs
                                           v
+-----------------------------------------------------------------------------------+
|                    MEDIKIOSK CANONICAL CLINICAL SCHEMA STORE                      |
+-----------------------------------------------------------------------------------+
```

> [!NOTE]
> **ABDM Sandbox Notice:**  
> Full live ABDM certification requires access to the National Health Authority (NHA) Sandbox gateway and official cryptographic digital signature keys (X.509). In Phase 0, MediKiosk provides a fully compliant FHIR R4 transformation layer and mock ABDM bridge.

---

## 2. Canonical to HL7 FHIR R4 Resource Mapping

Every MediKiosk clinical intake session, once signed by the physician, maps directly to a standardized `FHIR R4 Bundle (type: "document")`:

| MediKiosk Canonical Entity | FHIR R4 Resource | Key Fields Mapped |
| :--- | :--- | :--- |
| `PatientDemographics` | `Patient` | `identifier` (ABHA / National ID), `name`, `gender`, `birthDate`, `telecom`, `address` |
| `InformedConsentRecord` | `Consent` | `status: "active"`, `scope: "patient-privacy"`, `category`, `dateTime`, `provision` |
| `ChiefComplaintEntry` / `PastMedicalCondition` | `Condition` | `code` (SNOMED-CT / ICD-10 / NAMASTE), `clinicalStatus`, `verificationStatus`, `onsetDateTime`, `severity` |
| `HPIStructure` / `ReviewOfSystems` | `Observation` | `code`, `valueString`, `valueQuantity`, `interpretation`, `component` |
| `MedicationEntry` | `MedicationStatement` / `MedicationRequest` | `medicationCodeableConcept`, `dosage.text`, `dosage.timing`, `status` |
| `AllergyEntry` | `AllergyIntolerance` | `code`, `category`, `criticality`, `reaction.manifestation`, `reaction.severity` |
| `InvestigationResultEntry` | `DiagnosticReport` + `Observation` | `code` (LOINC), `valueQuantity`, `referenceRange`, `status: "final"` |
| `DocumentRecord` (Uploaded Rx) | `DocumentReference` | `type`, `date`, `content.attachment` (MIME, secure URL, hash), `docStatus` |
| `PhysicianSignoffRecord` | `Composition` + `Provenance` | `author` (Practitioner), `title: "OPD Clinical Intake Summary"`, `signature` |

---

## 3. Sample FHIR R4 Output (Encounter & Condition Bundle)

```json
{
  "resourceType": "Bundle",
  "id": "medikiosk-bundle-8f7d6a5c",
  "type": "document",
  "timestamp": "2026-09-01T14:32:00+05:30",
  "entry": [
    {
      "fullUrl": "urn:uuid:patient-001",
      "resource": {
        "resourceType": "Patient",
        "id": "patient-001",
        "identifier": [
          {
            "system": "https://healthid.ndhm.gov.in",
            "value": "91-8888-7777-6666"
          }
        ],
        "name": [{ "text": "Ramesh Kumar" }],
        "gender": "male",
        "birthDate": "1968-05-14"
      }
    },
    {
      "fullUrl": "urn:uuid:condition-001",
      "resource": {
        "resourceType": "Condition",
        "id": "condition-001",
        "clinicalStatus": {
          "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active" }]
        },
        "verificationStatus": {
          "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "confirmed" }]
        },
        "category": [
          {
            "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-category", "code": "encounter-diagnosis" }]
          }
        ],
        "code": {
          "coding": [
            {
              "system": "http://snomed.info/sct",
              "code": "29857009",
              "display": "Chest Pain"
            }
          ],
          "text": "Retrosternal crushing chest pain"
        },
        "subject": { "reference": "urn:uuid:patient-001" },
        "recordedDate": "2026-09-01T14:30:00+05:30"
      }
    }
  ]
}
```

---

## 4. Integration Milestones & Gateway Boundary

1. **M1 (ABHA Onboarding):** Kiosk supports patient authentication via Mobile OTP or ABHA QR code scan via `POST /api/v1/integrations/abdm/abha/verify-otp`.
2. **M2 (Health Information Provider - HIP):** Signed clinical intake summaries are wrapped in encrypted FHIR bundles and queued for dispatch to hospital EMR / ABDM gateway.
3. **M3 (Health Information User - HIU):** Pulling past health records from other hospitals via ABDM consent manager and ingesting them into the MediKiosk timeline synthesizer.
