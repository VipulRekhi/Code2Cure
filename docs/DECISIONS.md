# Architecture Decision Records (ADRs) — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Date:** September 2026  

---

## Index of Architectural Decisions

- [ADR-001: Backend Framework Selection (Node.js + Express.js + TypeScript)](#adr-001-backend-framework-selection)
- [ADR-002: Sovereign Open-Source AI Strategy vs Cloud APIs](#adr-002-sovereign-open-source-ai-strategy-vs-cloud-apis)
- [ADR-003: Deterministic Rule Engine for Red-Flag Triage vs Generative LLM](#adr-003-deterministic-rule-engine-for-red-flag-triage)
- [ADR-004: Modular Separation of AYUSH and Allopathic Clinical Workflows](#adr-004-modular-separation-of-ayush-and-allopathic-workflows)
- [ADR-005: Canonical Clinical Schema & Four-Tier Provenance Tracking](#adr-005-canonical-clinical-schema--provenance-tracking)
- [ADR-006: AI Service Abstraction Layer with Zero-GPU Mocking](#adr-006-ai-service-abstraction-layer)
- [ADR-007: Hybrid Relational + JSONB Storage Model in PostgreSQL](#adr-007-hybrid-relational--jsonb-storage-model)
- [ADR-008: Ephemeral Kiosk Client State for Public Terminal Privacy](#adr-008-ephemeral-kiosk-client-state)

---

### ADR-001: Backend Framework Selection
- **Status:** Accepted
- **Context:** The system requires a high-concurrency, type-safe, lightweight, and extensible backend to coordinate asynchronous kiosk sessions, streaming audio pipelines, OCR processing, and doctor dashboard events.
- **Decision:** Use **Node.js with Express.js and TypeScript**.
- **Rationale:** Node.js offers excellent asynchronous I/O performance for handling concurrent WebSockets, REST APIs, and file uploads. Express.js is battle-tested, modular, and provides minimal overhead. TypeScript ensures strict compile-time type safety across complex clinical schemas and Zod validation payloads.
- **Consequences:** Heavy CPU/GPU AI inference (e.g., PyTorch, PaddleOCR) must run in isolated sidecar processes rather than inside the Node.js event loop to prevent event-loop blocking.

---

### ADR-002: Sovereign Open-Source AI Strategy vs Cloud APIs
- **Status:** Accepted
- **Context:** Clinical intake involves Protected Health Information (PHI) in an Indian public healthcare environment (AIIA). Reliance on proprietary commercial cloud APIs (OpenAI, Anthropic) risks data sovereignty violations under DPDP Act 2023, high per-token operating costs, and cloud connectivity dependency.
- **Decision:** Standardize on **sovereign, open-weight, self-hostable AI models**:
  - LLM: **Qwen2.5-7B-Instruct**
  - ASR: **AI4Bharat IndicConformer**
  - TTS: **AI4Bharat IndicF5**
  - OCR: **PaddleOCR (PP-OCRv4)**
- **Rationale:** Enables 100% on-premise hospital edge deployment, zero third-party data leakage, high vernacular accuracy for Indian languages, and predictable infrastructure costs.

---

### ADR-003: Deterministic Rule Engine for Red-Flag Triage
- **Status:** Accepted
- **Context:** Detecting life-threatening emergency symptoms (e.g., Acute Coronary Syndrome, Stroke FAST signs, Anaphylaxis) is critical. LLMs are non-deterministic, susceptible to prompt injection, and prone to hallucinations or omissions.
- **Decision:** Emergency red-flag detection and triage severity gating must be executed by a **deterministic, rule-based clinical engine** operating on structured symptom slots.
- **Rationale:** Guarantees 100% auditable, reproducible, and explainable safety decisions. LLMs are never permitted to make autonomous triage decisions.

---

### ADR-004: Modular Separation of AYUSH and Allopathic Workflows
- **Status:** Accepted
- **Context:** Ministry of Ayush and AIIA require comprehensive Ayurvedic intake (Dashavidha Pariksha, Prakriti, Agni, Kostha, Ahara-Vihara). Forcing Ayurvedic concepts into conventional allopathic schemas or vice-versa creates clinical inaccuracy and data corruption.
- **Decision:** Implement a **modular clinical architecture** where core intake infrastructure (kiosk UI, voice, OCR, auth) is shared, but Allopathic and AYUSH clinical question trees and data models remain cleanly isolated in dedicated submodules.
- **Rationale:** Preserves classical Ayurvedic clinical integrity while enabling unified presentation in the physician review dashboard and FHIR R4 / NAMASTE cross-mapping.

---

### ADR-005: Canonical Clinical Schema & Provenance Tracking
- **Status:** Accepted
- **Context:** Mixing patient-reported statements, AI-extracted text, and doctor-verified facts without attribution risks clinical errors and legal liability.
- **Decision:** Enforce an immutable four-tier provenance model (`PATIENT_REPORTED`, `AI_EXTRACTED`, `AI_NORMALIZED`, `PHYSICIAN_VERIFIED`) on every clinical datum.
- **Rationale:** Eliminates ambiguity. AI outputs remain explicitly labeled as provisional drafts until confirmed by a licensed doctor.

---

### ADR-006: AI Service Abstraction Layer
- **Status:** Accepted
- **Context:** Tightly coupling backend business logic to specific AI frameworks (e.g., vLLM or Python scripts) complicates testing, portability, and future model upgrades.
- **Decision:** Place all AI capabilities behind TypeScript interfaces (`ILLMProvider`, `IASRProvider`, `ITTSProvider`, `IOCRProvider`) with built-in mock implementations.
- **Rationale:** Enables full CI/CD test execution on standard zero-GPU runners and allows seamless swapping of underlying AI models (e.g., upgrading to future AI4Bharat models) without altering backend controllers.

---

### ADR-007: Hybrid Relational + JSONB Storage Model
- **Status:** Accepted
- **Context:** Core intake sessions, patient records, staff accounts, and audit logs require strict ACID relational guarantees, while clinical questionnaires vary widely across specialties and evolving complaint flows.
- **Decision:** Use **PostgreSQL with Prisma ORM**, combining relational tables with indexed JSONB columns (GIN indexes) for flexible clinical sub-trees.
- **Rationale:** Provides the best of both worlds: strict referential integrity for identity, security, and auditing alongside dynamic flexibility for adaptive clinical question graphs.

---

### ADR-008: Ephemeral Kiosk Client State
- **Status:** Accepted
- **Context:** Public hospital kiosks are shared by dozens of patients daily. Any residual client-side state could expose sensitive health records to subsequent patients.
- **Decision:** The Kiosk React frontend must maintain **zero persistent storage of PHI** in `localStorage` or `sessionStorage`. State resides solely in ephemeral React memory and is purged on completion or 60-second inactivity timeout.
- **Rationale:** Adheres to DPDP Act 2023 privacy-by-design principles and prevents cross-patient data leakage at public terminals.
