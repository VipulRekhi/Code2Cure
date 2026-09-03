# Product Requirements Document (PRD) — MediKiosk

**SIH Problem Statement ID:** SIH26047  
**Project Title:** Patient Case-Taking Software  
**Organization:** Ministry of Ayush  
**Department:** All India Institute of Ayurveda (AIIA)  
**Category:** Software | **Theme:** MedTech / BioTech / HealthTech  
**Product Name:** MediKiosk (Smart Multimodal Patient Intake & Triage System)  
**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Date:** September 2026  

---

## 1. Executive Summary & Problem Context

Outpatient departments (OPDs) in major Indian tertiary hospitals and Ayurvedic institutes—such as the All India Institute of Ayurveda (AIIA)—face immense patient footfall. High patient-to-physician ratios often constrain doctor consultation times to 3–5 minutes per patient. During this brief window, doctors must manually capture demographic data, chief complaints, timeline of present illness, past history, lifestyle parameters, and scrutinize thick physical files containing disorganized legacy prescriptions and laboratory reports.

**MediKiosk** is an accessible, patient-facing, multimodal clinical case-taking kiosk and digital intake station. Situated in the hospital waiting/intake area, MediKiosk empowers patients—regardless of literacy level or technical background—to independently complete a comprehensive, voice-assisted, touchscreen-guided clinical history intake, digitize historical medical documents, and undergo automated, deterministic red-flag screening before seeing the physician.

> [!IMPORTANT]
> **Safety Baseline:** MediKiosk is **strictly an intake, structuring, and triage-assistive tool**. It is **NOT** an autonomous diagnostic system. All AI-extracted insights, medical document summaries, and clinical notes are treated as provisional drafts subject to mandatory physician review, verification, and sign-off.

---

## 2. Target Users & Personas

### Persona 1: Rural / Low-Literacy Patient (e.g., Ramesh, 58)
- **Background:** Native Hindi speaker with mild visual impairment and low tech familiarity; visiting AIIA for chronic joint pain and gastrointestinal issues.
- **Needs:** Large touchscreen buttons, vernacular voice prompts, ability to speak naturally in Hindi or tap simple pictorial options, physical document feeder/scanner for previous paper prescriptions.
- **Pain Points:** Inability to fill long English paper forms; anxiety around complex medical terminology.

### Persona 2: Working Professional / Multilingual Patient (e.g., Priya, 32)
- **Background:** Bilingual (Marathi/English) presenting with acute fever and headache; carries smartphone with PDF lab reports.
- **Needs:** Rapid intake flow, ability to switch language dynamically, QR code / USB / camera document upload, clear timeline preview.
- **Pain Points:** Long waiting times, repeating medical history multiple times across departments.

### Persona 3: OPD Physician / Ayurvedic Vaidya (e.g., Dr. Ananya, MD Ayur)
- **Background:** High-volume clinician examining 80+ patients per shift; needs structured Allopathic and Ayurvedic (Dashavidha Pariksha) intake.
- **Needs:** 30-second glanceable clinical summary, chronological medical timeline, highlighted red flags, 1-click verification of AI-extracted entities against original document crops, export to HIS/ABDM.
- **Pain Points:** Illegible handwritten paper records from other clinics; missing historical timeline data; cognitive fatigue from repetitive data entry.

### Persona 4: Triage Nurse / Kiosk Operator (e.g., Sister Sunita)
- **Background:** Responsible for intake floor management and urgent triage routing.
- **Needs:** Real-time dashboard of active kiosk sessions, immediate alerts for critical red flags (e.g., chest pain with diaphoresis), override capability.

---

## 3. End-to-End Core Workflow

```
[ IDENTIFY / REGISTER ] (ABHA / Phone / Hospital UHID / New Registration)
        ↓
[ SELECT LANGUAGE ] (English, Hindi, Marathi - extensible to all 22 scheduled languages)
        ↓
[ CONSENT CAPTURE ] (DPDP Act 2023 & ABDM compliant audio-visual informed consent)
        ↓
[ CLINICAL HISTORY ENGINE ] (Adaptive decision tree + Voice/Touch Conversational intake)
        ↓
[ DOCUMENT SCAN / UPLOAD ] (Physical OCR camera / File upload for Rx & Lab reports)
        ↓
[ PATIENT REVIEW ] (Audio-visual summary playback and simple confirmation)
        ↓
[ RED-FLAG & TRIAGE EVALUATION ] (Deterministic rule engine screening)
        ↓
[ CLINICAL STRUCTURING & SUMMARY ] (LLM synthesis with strict provenance tracking)
        ↓
[ DOCTOR QUEUE & DASHBOARD ] (Physician inspects, verifies, edits, or rejects draft)
        ↓
[ CONFIRMATION & HIS / ABDM EXPORT ] (FHIR R4 bundle generation & EMR push)
```

---

## 4. Key Functional Capabilities

### 4.1 Multimodal Patient Interaction
- **Dual Input Modalities:** Seamless concurrent or alternate input via natural voice (ASR) or high-contrast, large-target touch controls.
- **Audio-Visual Feedback:** Every question is read aloud in the chosen language via natural Text-to-Speech (TTS) with synchronised on-screen subtitles and visual icons.
- **Language Support (Phase 0 Baseline):** English, Hindi (`hi-IN`), Marathi (`mr-IN`). Architecture built for seamless extension to Bengali, Tamil, Telugu, Gujarati, Kannada, etc.

### 4.2 Adaptive Clinical Question Engine
- **Separation of "What" vs "How":** Question logic is governed by structured clinical decision graphs, while the LLM handles natural conversational phrasing and semantic extraction from freeform speech.
- **Complaint-Specific Deep Dives (MVP):**
  1. *Chest Pain* (SOCRATES protocol: Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/Relieving, Severity).
  2. *Abdominal Pain* (Quadrant localization, relation to meals, bowel changes).
  3. *Fever* (Pattern, chills/rigors, night sweats, travel history).
  4. *Cough* (Productive/dry, hemoptysis, duration, dyspnea).
  5. *Headache* (Aura, photophobia, neck stiffness, thunderclap onset).
- **AYUSH / Ayurvedic Specialised Track:** Dedicated Dashavidha & Ashtavidha Pariksha, Ahara-Vihara (diet/lifestyle), Agni, and Kostha evaluations.

### 4.3 Medical Document Ingestion & Structuring
- **Document Ingestion:** High-speed camera capture at kiosk desk or direct file upload (JPEG/PNG/PDF).
- **OCR Engine:** Self-hosted PaddleOCR for layout analysis, text block extraction, and table recognition.
- **Entity Extraction & Normalization:** Extraction of diagnoses, medications (drug name, dose, unit, frequency, route), laboratory tests, reference ranges, and procedures.
- **Crop-Linked Provenance:** Every extracted datum links directly to the exact bounding box on the original document for instant doctor verification.

### 4.4 Deterministic Red-Flag & Triage Engine
- **Zero-Hallucination Emergency Gate:** Purely deterministic rule engine evaluating structured symptoms against standard clinical safety protocols (e.g., suspected acute coronary syndrome, stroke, septic shock, acute abdomen).
- **Auditable Alert Levels:** `CRITICAL` (Immediate emergency routing), `URGENT` (Priority doctor queue), `ELEVATED` (Flagged for specific clinical checks), `ROUTINE` (Standard queue).
- **Empathetic, Safe Patient Phrasing:** The kiosk notifies the patient calmly ("A nurse has been alerted to assist you promptly") rather than generating diagnostic panic ("You have a myocardial infarction").

### 4.5 Physician Review & Decision Support Dashboard
- **Rapid Glance Summary:** Structured SOAP-style presentation + Ayurvedic Roga/Rogi Pariksha summary.
- **Interactive Chronological Timeline:** Unified medical timeline merging legacy documents, past hospital visits, and current complaint progression.
- **Verification UI:** Three-state action buttons (`[Confirm]`, `[Edit]`, `[Reject]`) for every AI-extracted entity, converting provisional intake data into signed clinical records.

---

## 5. Non-Functional Requirements (NFRs)

| Category | Requirement | Target Metric |
| :--- | :--- | :--- |
| **Latency** | Touch-to-response UI latency | $< 100 \text{ ms}$ |
| **Latency** | Speech-to-Text (ASR) turnaround | $< 1.2 \text{ s}$ for 5s audio chunk |
| **Latency** | LLM Conversational Turn turnaround | $< 1.5 \text{ s}$ time-to-first-token |
| **Latency** | Full Document OCR & Structuring | $< 8 \text{ s}$ for a standard single-page prescription |
| **Availability** | Kiosk backend uptime | $99.9\%$ during OPD hours |
| **Security** | Data at rest & in transit encryption | AES-256 (Disk), TLS 1.3 (Transport) |
| **Compliance** | Privacy & Data Protection | DPDP Act 2023 principles & ABDM Health Data Management Policy |
| **Accessibility** | Usability for disabled / low-literacy | WCAG 2.1 AA compliant UI, $\ge 48\text{px}$ touch targets, minimum 4.5:1 color contrast |
| **Extensibility** | Modular AI & Clinical flows | Plug-and-play providers via TypeScript interfaces |

---

## 6. Scope Boundaries & Anti-Goals

### In Scope
- Self-service and nurse-assisted multimodal kiosk intake.
- Vernacular speech recognition, conversational turn management, and natural voice synthesis.
- Deterministic symptom triage and emergency staff notifications.
- Optical character recognition and structured entity extraction from legacy medical papers.
- Full Allopathic and Ayurvedic (Dashavidha Pariksha) intake flows.
- Doctor dashboard for verification, editing, and timeline visualization.
- ABDM / FHIR R4 schema compatibility.

### Explicitly Out of Scope (Anti-Goals)
- ❌ **Autonomous Clinical Diagnosis:** The system will never output a definitive medical diagnosis to the patient or prescribe medication.
- ❌ **Replacement of Clinical Judgement:** The system is an intake assistant; the examining physician bears 100% legal and clinical responsibility.
- ❌ **Direct Pharmacy Dispensation / Tele-Prescribing:** MediKiosk does not auto-order drugs or issue unverified e-prescriptions.
- ❌ **Unconstrained Autonomous LLM Conversation:** The LLM does not decide the clinical questions freely; it operates strictly within boundaries established by the structured question graph.
- ❌ **Third-Party Proprietary Cloud AI Vendor Lock-in:** No mandatory dependencies on OpenAI, Anthropic, or Google cloud APIs for core clinical data processing in the base self-hosted deployment.

---

## 7. Assumptions, Dependencies & Risks

### Assumptions
1. Kiosks are equipped with a high-resolution document scanner/camera, directional noise-cancelling microphone, and stereo speakers.
2. Hospital OPD local network (LAN) provides reliable low-latency connectivity to the on-premise hospital edge server.
3. Patients or attending relatives have basic cognitive capability to respond to simple audio/visual prompts.

### Dependencies
1. **Self-Hosted AI Infrastructure:** On-premise or sovereign private cloud GPU nodes capable of serving Qwen2.5-7B-Instruct, IndicConformer, IndicF5, and PaddleOCR.
2. **Clinical Validation Board:** AIIA clinical and Ayurvedic experts to sign off on specific question trees, Dashavidha parameters, and red-flag rules before live OPD trials.

### Risks & Mitigations
- **Acoustic Noise in Crowded OPDs:** Directional USB array microphones with hardware noise cancellation, supplemented by visual touch prompts on screen at every stage.
- **OCR Inaccuracies on Cursive/Messy Handwritten Prescriptions:** Mandatory side-by-side verification UI showing original document crops; transparent confidence scoring; classification of unreadable text as `UNVERIFIED_MANUAL_REVIEW_NEEDED`.
- **Hallucination Risk in Clinical Summaries:** Constrained decoding, deterministic JSON extraction schema, zero ungrounded clinical claim policy, and strict provenance tagging.
