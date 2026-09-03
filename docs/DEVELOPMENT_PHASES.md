# Development Phases & Roadmap — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**SIH Problem Statement ID:** SIH26047  
**Date:** September 2026  

---

## 1. Project Roadmap Overview (15 Sequential Phases)

The complete MediKiosk project lifecycle is divided into 15 structured, modular phases designed to deliver a robust, clinically verified, and production-ready solution for the Smart India Hackathon (SIH 2026).

```
Phase 0  : Requirements, Architecture & Technical Foundation [CURRENT]
Phase 1  : Repository, Infrastructure & Base Application
Phase 2  : Patient Multimodal UI/UX (Touch, Voice UI, Accessibility)
Phase 3  : Deterministic Clinical Question Engine (5 MVP Flows)
Phase 4  : Qwen2.5-7B LLM Integration & Slot Extraction
Phase 5  : IndicConformer ASR & IndicF5 TTS Multilingual Speech
Phase 6  : PaddleOCR & Medical Document Entity Pipeline
Phase 7  : Deterministic Red-Flag & Emergency Triage Engine
Phase 8  : Clinical Summary Generation & Timeline Synthesizer
Phase 9  : AYUSH & Ayurvedic Dashavidha Pariksha Module
Phase 10 : Doctor Review, Verification & Sign-off Dashboard
Phase 11 : FHIR R4 & ABDM Integration Adapter Layer
Phase 12 : Security, Privacy & DPDP/ABDM Consent Hardening
Phase 13 : Comprehensive Testing, Golden Dataset Benchmarking
Phase 14 : SIH Final Demonstration, Packaging & Optimization
```

---

## 2. Phase-by-Phase Technical Specifications

### Phase 0: Requirements, Architecture & Technical Foundation *(Current)*
- **Goal:** Establish complete architectural specifications, clinical data schemas, AI integration contracts, and security standards without writing premature application code.
- **Deliverables:** Complete `docs/` technical documentation suite, `.env.example`, `.gitignore`, `README.md`.
- **Exit Gate:** Architectural review and alignment before starting codebase scaffolding.

---

### Phase 1: Repository, Infrastructure & Base Application
- **Goal:** Initialize project repository structure, Express.js + TypeScript backend foundation, PostgreSQL + Prisma ORM setup, Docker Compose environment, and linting/formatting rules.
- **Deliverables:**
  - `backend/` scaffolding with TypeScript, Express, Prisma client, and modular folder structure.
  - `frontend/` scaffolding with React 18, Vite, TypeScript, and Tailwind CSS.
  - `docker-compose.yml` for PostgreSQL and development environment.
  - Health check endpoints (`/api/v1/health`), basic logging (Winston), and global error middleware.
- **Exit Gate:** `npm run dev` boots backend and frontend; database migrations execute cleanly.

---

### Phase 2: Patient Multimodal UI/UX
- **Goal:** Build the high-contrast, accessible patient-facing kiosk frontend with voice and touch interaction modes.
- **Deliverables:**
  - Multilingual Language Selection Screen (`en`, `hi`, `mr`).
  - Audio-visual Consent Capture UI.
  - Dynamic Question Renderer (Single choice, Multi choice, Body map selector, 1–10 slider, large touch buttons $\ge 48\text{px}$).
  - Audio recording animation widget with real-time waveform feedback.
  - Auto-inactivity countdown timer and session reset modal.
- **Exit Gate:** Complete interactive kiosk mock flow navigable entirely via touch in English, Hindi, and Marathi.

---

### Phase 3: Clinical Question Engine
- **Goal:** Implement the deterministic state machine and DAG for the 5 initial MVP clinical complaints.
- **Deliverables:**
  - Question Engine State Machine (`QuestionEngineService`).
  - Complaint Flows: *Chest Pain*, *Abdominal Pain*, *Fever*, *Cough*, and *Headache*.
  - Zod validation schemas for every question node.
  - REST endpoints: `GET /current-node`, `POST /submit-answer`, `POST /skip-node`.
- **Exit Gate:** 100% passing unit tests for all 5 question graphs, state transitions, and skip logic.

---

### Phase 4: Qwen2.5-7B LLM Integration
- **Goal:** Build the LLM provider abstraction and integrate Qwen2.5-7B-Instruct for zero-shot clinical slot extraction and JSON conversion.
- **Deliverables:**
  - `ILLMProvider` interface and `QwenLocalProvider` implementation (vLLM / Ollama wrapper).
  - Deterministic `MockLLMProvider` for zero-GPU CI testing.
  - Structured prompt templates for vernacular transcript slot extraction.
  - Automated JSON repair and schema validation middleware.
- **Exit Gate:** Accurate slot extraction from patient speech transcripts into typed JSON structures.

---

### Phase 5: IndicConformer ASR & IndicF5 TTS Integration
- **Goal:** Integrate open-source speech recognition and text-to-speech for seamless vernacular voice conversation.
- **Deliverables:**
  - `IASRProvider` with `IndicConformerProvider` (FastAPI / ONNX sidecar wrapper) for Hindi, Marathi, and English.
  - `ITTSProvider` with `IndicF5Provider` for natural audio prompt synthesis.
  - Web Audio chunk streaming and server-side transcription pipeline (`POST /api/v1/speech/transcribe`).
  - Audio caching layer for common static question prompts to minimize TTS latency.
- **Exit Gate:** Real-time spoken answers transcribed and synthesized into voice prompts with $< 1.5\text{s}$ turnaround.

---

### Phase 6: PaddleOCR & Medical Document Entity Pipeline
- **Goal:** Ingest patient paper records, run OCR layout analysis, and extract structured clinical entities.
- **Deliverables:**
  - `IOCRProvider` with `PaddleOCRProvider` (PP-OCRv4 Python sidecar).
  - Secure file upload endpoint with MIME validation and image pre-processing (deskew, contrast).
  - LLM Medical Entity Extraction pipeline parsing diagnoses, medications, dosages, lab tests, and reference ranges.
  - Bounding box coordinate calculator linking extracted entities to original document scan coordinates.
- **Exit Gate:** Uploaded sample prescription extracts structured medications with visual bounding box overlays.

---

### Phase 7: Deterministic Red-Flag & Emergency Triage Engine
- **Goal:** Implement the zero-hallucination emergency rule evaluation engine.
- **Deliverables:**
  - Pure TypeScript rule evaluator executing against structured clinical slots.
  - Baseline rules library: Suspected ACS, Stroke (FAST), Meningism, GI Bleeding, Acute Respiratory Distress, Anaphylaxis, Sepsis.
  - WebSocket event broadcaster notifying triage nurse workstation in real time.
  - Non-diagnostic, reassuring patient guidance screen and kiosk lock mechanism.
- **Exit Gate:** 100% unit test coverage for red-flag rules; sub-50ms rule evaluation latency.

---

### Phase 8: Clinical Summary Generation & Timeline Synthesizer
- **Goal:** Synthesize comprehensive SOAP clinical intake summaries and build the chronological medical timeline.
- **Deliverables:**
  - SOAP summary generator assembling Demographics, HPI, PMHx, Meds, Allergies, and Pertinent Negatives.
  - Strict provenance attribution (`PATIENT_REPORTED`, `AI_EXTRACTED`, `AI_NORMALIZED`).
  - Chronological medical timeline aggregator merging legacy document dates and current encounter symptoms.
- **Exit Gate:** Formatted, physician-ready clinical summary generated automatically upon questionnaire completion.

---

### Phase 9: AYUSH & Ayurvedic Dashavidha Pariksha Module
- **Goal:** Implement the specialized Ayurvedic case-taking workflow.
- **Deliverables:**
  - Prakriti assessment questionnaire and dosha scoring engine.
  - Dashavidha Pariksha schema and clinical recording endpoints.
  - Ashtavidha self-reported parameters (Mutra, Mala, Kostha, Jihva).
  - Ahara-Vihara (dietary & lifestyle habits) conversational inquiry flow.
  - Specialized Ayurvedic Rogi & Roga Pariksha summary generator.
- **Exit Gate:** Complete Ayurvedic intake session executed and summarized using authentic terminology and NAMASTE codes.

---

### Phase 10: Doctor Review, Verification & Sign-off Dashboard
- **Goal:** Build the clinical workstation interface for examining physicians.
- **Deliverables:**
  - Real-time OPD patient queue with triage urgency badges.
  - Glanceable SOAP + AYUSH clinical summary review card.
  - Dual-pane document verifier with interactive bounding-box highlights.
  - 3-state entity verification controls (`[Confirm]`, `[Edit]`, `[Reject]`).
  - Physician sign-off, digital note-taking, and clinical record locking.
- **Exit Gate:** Doctor can review, edit, and sign off an intake record in $< 60$ seconds.

---

### Phase 11: FHIR R4 & ABDM Integration Adapter Layer
- **Goal:** Map canonical clinical data into HL7 FHIR R4 resources and simulate ABDM integration milestones.
- **Deliverables:**
  - FHIR R4 document bundle generator (`Patient`, `Encounter`, `Condition`, `Observation`, `MedicationStatement`, `Consent`).
  - Mock ABDM Gateway for ABHA lookup and Care Context registration.
  - Validation test suite ensuring FHIR JSON bundles pass standard HL7 R4 schema validation.
- **Exit Gate:** Valid FHIR R4 bundle exported and downloadable for any signed clinical session.

---

### Phase 12: Security, Privacy & DPDP/ABDM Consent Hardening
- **Goal:** Implement enterprise security controls, consent auditing, and session privacy safeguards.
- **Deliverables:**
  - DPDP/ABDM audio-visual consent capture and cryptographic hashing.
  - Inactivity auto-timeout (60s) with automated frontend memory purge.
  - PII/PHI redaction filter in application logger sinks (Winston/Pino).
  - Encrypted file storage for uploaded scans and voice clips.
  - Comprehensive `AuditLog` table capturing all sensitive staff actions.
- **Exit Gate:** Security scan clean; automated session purge verified; no PII in log outputs.

---

### Phase 13: Comprehensive Testing & Golden Dataset Evaluation
- **Goal:** Rigorous quality assurance, latency benchmarking, and clinical accuracy validation.
- **Deliverables:**
  - Automated test suite covering Unit, Integration, Red-Flag, and E2E flows.
  - Evaluation of OCR & entity extraction on 50 golden sample Indian prescriptions.
  - Latency stress testing under simulated concurrent kiosk loads.
- **Exit Gate:** All test suites passing; zero critical bugs; performance benchmarks met.

---

### Phase 14: SIH Final Demonstration, Packaging & Optimization
- **Goal:** Package the application for seamless, high-impact demonstration at SIH 2026.
- **Deliverables:**
  - Single-command Docker Compose deployment (`docker-compose up -d`).
  - Built-in Demo Mode with preloaded realistic patient personas (Chest pain emergency, Ayurvedic chronic patient, Pediatric fever).
  - High-impact visual slides, architecture poster, and video walkthrough.
- **Exit Gate:** Flawless live demonstration ready for Ministry of Ayush & AIIA hackathon jury evaluation.
