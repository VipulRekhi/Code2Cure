# Quality Assurance & Testing Strategy — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Testing Frameworks:** Vitest / Jest, Supertest, Playwright  
**Date:** September 2026  

---

## 1. Testing Philosophy & Quality Gates

In clinical healthcare software, bugs in triage or data structuring can directly impact patient safety. MediKiosk enforces a multi-tiered testing strategy:

1. **100% Deterministic Rule Coverage:** All emergency red-flag evaluation rules must have 100% branch and unit test coverage with exhaustive combinatorial test matrices.
2. **Zero-GPU CI/CD Test Pipeline:** All AI interfaces (`ILLMProvider`, `IASRProvider`, `ITTSProvider`, `IOCRProvider`) have deterministic mock implementations so complete backend and frontend test suites run in standard CI environments without requiring physical GPUs.
3. **Strict Type & Schema Contracts:** Every request, response, and JSONB database payload is validated at boundary points using Zod schemas.

---

## 2. Testing Pyramid & Layer Distribution

```
                / \
               /   \      E2E & Kiosk UX Tests (Playwright)
              /  5% \     - Multimodal touch/audio flows, session timeouts
             /-------\
            /         \   Integration & API Tests (Supertest + TestContainers)
           /    25%    \  - Express routes, Prisma queries, file uploads, auth
          /-------------\
         /               \  Unit & Domain Logic Tests (Vitest)
        /       70%       \ - Question engine state transitions, Red-flag rules,
       /                   \  Zod schemas, FHIR mappers, AYUSH scoring
      +---------------------+
```

---

## 3. Test Suites & Focus Areas

### 3.1 Unit Testing: Red-Flag Rule Engine (`tests/unit/red-flags/`)
- **Objective:** Verify that every clinical red-flag rule triggers if and only if specified clinical condition clauses are satisfied.
- **Test Cases:**
  - `RULE_ACS_001`: Crushing chest pain + left arm radiation → MUST return `SEVERITY: CRITICAL`.
  - `RULE_ACS_001`: Sharp localized chest pain without sweating or radiation → MUST NOT trigger `RULE_ACS_001`.
  - Combinations of missing fields, partial inputs, and nulls must evaluate safely to `false` without throwing runtime exceptions.

### 3.2 Unit Testing: Question Engine State Machine (`tests/unit/question-engine/`)
- **Objective:** Ensure question node transitions follow clinical paths accurately and handle invalid or skipped inputs gracefully.
- **Test Cases:**
  - Chest pain flow transitions from `Site` → `Onset` → `Character` → `Radiation` → `Associated Symptoms`.
  - Fast-forward branching when a patient denies a chief complaint category.
  - Recovery from low-confidence speech extractions with touch fallback triggers.

### 3.3 Integration Testing: Express REST APIs (`tests/integration/api/`)
- **Objective:** Verify HTTP status codes, Zod validation, JWT authentication, and database transactions using Supertest with an ephemeral test database.
- **Key Suites:**
  - `POST /api/v1/sessions/start` → Session lifecycle and language binding.
  - `POST /api/v1/consent/record` → Consent timestamping and audit logging.
  - `POST /api/v1/documents/upload` → File MIME validation, size caps, and OCR worker queueing.
  - `PATCH /api/v1/doctor/entities/:id/verify` → Provenance promotion to `PHYSICIAN_VERIFIED`.

### 3.4 AI Mocking & Golden Dataset Evaluation (`tests/unit/ai/`)
- **Mock AI Providers:** Configurable mock adapters returning deterministic transcripts, JSON slots, and OCR bounding boxes.
- **Evaluation Benchmark:** Golden dataset of 50 anonymized Indian prescription scans and 100 audio samples to evaluate ASR Word Error Rate (WER) and LLM entity extraction Precision/Recall in Phase 13.

### 3.5 Security & Vulnerability Tests (`tests/security/`)
- **Payload Sanitization:** Testing malicious file uploads (e.g., `.php` or polyglot files disguised as `.png`).
- **Session Isolation:** Verifying that a kiosk session token cannot read another session's history or documents.
- **Rate Limiting & DoS:** Stress testing public endpoints against burst request floods.

---

## 4. Test Execution Commands & CI/CD Scripts

```bash
# Run all fast unit tests (Zero GPU required)
npm run test:unit

# Run deterministic red-flag emergency rule test suite with coverage
npm run test:red-flags -- --coverage

# Run API integration tests against ephemeral PostgreSQL test container
npm run test:integration

# Run full end-to-end kiosk flow simulations
npm run test:e2e
```
