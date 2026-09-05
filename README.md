# MediKiosk — Smart Multilingual Patient Case-Taking & Triage Platform

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://www.sih.gov.in/)
[![Ministry of Ayush](https://img.shields.io/badge/Ministry-Ayush-green.svg)](https://ayush.gov.in/)
[![All India Institute of Ayurveda](https://img.shields.io/badge/Department-AIIA-blue.svg)](https://aiia.gov.in/)
[![Problem Statement](https://img.shields.io/badge/Problem%20Statement-SIH26047-red.svg)](https://www.sih.gov.in/)
[![Current Implementation](https://img.shields.io/badge/Current%20Status-Phase%204%20Completed-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-Apache%202.0-lightgrey.svg)](LICENSE)

> **SIH 2026 Problem Statement ID:** SIH26047  
> **Title:** Patient Case-Taking Software  
> **Organization:** Ministry of Ayush | **Department:** All India Institute of Ayurveda (AIIA)  
> **Theme:** MedTech / BioTech / HealthTech  
> **Current implementation:** **Phase 4**

---

## 1. Overview

**MediKiosk** is an accessible, patient-facing, multimodal clinical intake kiosk and digital case-taking platform engineered for high-volume outpatient departments (OPDs) in Indian tertiary hospitals and Ayurvedic institutes.

MediKiosk empowers patients—regardless of literacy level or technical background—to independently complete a comprehensive clinical history intake, digitize physical medical documents, and undergo automated red-flag triage screening before entering the doctor's consultation room.

```
IDENTIFY → LANGUAGE → CONSENT → HISTORY → DOCUMENTS → REVIEW → SUMMARY → TRIAGE/ROUTE → DOCTOR REVIEW → CONFIRM
```

> [!IMPORTANT]
> **Safety Baseline:** MediKiosk is **strictly an assistive clinical intake, structuring, and triage-assistive tool**. It is **NOT** an autonomous diagnostic system. All AI-extracted insights, medical document summaries, and clinical notes are treated as provisional drafts subject to mandatory physician verification and sign-off.

---

## 2. Architecture

MediKiosk is structured as a **single monolithic application with modular code organization**, built entirely in standard **JavaScript** across both frontend and backend.

```
Patient Kiosk Frontend (Vanilla HTML5 + CSS3 + JavaScript ES Modules)
               ↓  REST API (JSON Envelope)
Express.js Backend (Node.js + Pure JavaScript ES Modules + Modular Monolith)
               ↓  Prisma Client
Supabase PostgreSQL (Cloud-hosted / deployment-ready via DATABASE_URL & DIRECT_URL)
```

The application runs directly on standard development machines using Node.js and npm without requiring Docker.

---

## 3. Technology Stack

### Frontend (Vanilla Kiosk UI/UX)
- **Core:** HTML5, CSS3, Vanilla JavaScript (ES Modules) — *Zero React / Zero TypeScript / Zero Frontend Frameworks*
- **Typography:** Google Fonts (Noto Sans & Noto Sans Devanagari)
- **Languages:** Marathi (मराठी), Hindi (हिन्दी), English
- **Kiosk Target:** 16:9 Landscape displays (1920×1080, 1366×768)
- **Touch Metrics:** Minimum touch targets $\ge 48\text{px}$, primary actions 64–100px+
- **Testing:** Vitest + JSDOM + Browser Subagent E2E testing

### Backend (Pure JavaScript + Clinical Engine)
- **Runtime:** Node.js (v24+) — *Pure JavaScript (Zero TypeScript)*
- **Framework:** Express.js 4
- **ORM:** Prisma ORM 5
- **Database:** Supabase PostgreSQL (PostgreSQL 16+) with connection pooling (`DATABASE_URL`) and direct migration access (`DIRECT_URL`)
- **Clinical Engine:** Schema-driven deterministic Question Engine (`modules/questionEngine/`)
- **Authentication:** JWT (`jsonwebtoken`) + Password Hashing (`bcryptjs`)
- **Validation:** Zod
- **Testing:** Vitest + Supertest

---

## 4. Project Structure

```text
medikiosk/
├── backend/                        # Express.js REST API & Database Layer
│   ├── prisma/
│   │   ├── migrations/             # SQL baseline migrations
│   │   ├── schema.prisma           # Foundational schema (User, Patient, Doctor, Consent)
│   │   └── seed.ts                 # Safe development demo seed script
│   ├── src/
│   │   ├── config/                 # Env parser (Zod) & Prisma singleton
│   │   ├── controllers/            # Auth & Health controllers
│   │   ├── middleware/             # Auth, role check, logger, error handler
│   │   ├── repositories/           # Database data access layer
│   │   ├── routes/                 # Express routers (/api/health, /api/auth, /api/patient, /api/doctor)
│   │   ├── schemas/                # Zod request validation schemas
│   │   ├── services/               # Auth & business logic
│   │   ├── types/                  # TypeScript interface definitions
│   │   ├── utils/                  # API response & error utilities
│   │   ├── app.ts                  # Express initialization & middleware
│   │   └── server.ts               # HTTP server listener & graceful shutdown
│   ├── tests/                      # API and database integration tests
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                       # React + Vite Web Application
│   ├── src/
│   │   ├── components/             # Reusable UI components (Navbar, HealthBadge)
│   │   ├── contexts/               # AuthContext & Session management
│   │   ├── pages/                  # Page views (Home, Login, Patient, Doctor, NotFound)
│   │   ├── routes/                 # ProtectedRoute role-based guards
│   │   ├── services/               # Centralized API service (api.ts)
│   │   ├── test/                   # Component and routing tests
│   │   ├── types/                  # Frontend TypeScript types
│   │   ├── App.tsx                 # Router & Layout
│   │   ├── main.tsx                # React DOM entrypoint
│   │   └── index.css               # Tailwind CSS directives
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docs/                           # Architecture specifications & Phase 0 ADRs
├── .env.example                    # Monorepo environment reference
├── .gitignore                      # Git ignore rules
├── package.json                    # Monorepo scripts
└── README.md                       # Documentation
```

---

## 5. Prerequisites

- **Node.js:** `v20.x` or `v24.x` (Tested on `v24.18.0`)
- **npm:** `v10.x` or `v11.x` (Tested on `11.16.0`)
- **PostgreSQL:** Local PostgreSQL server running on port `5432`

---

## 6. PostgreSQL Setup

1. Verify PostgreSQL service is running:
   ```powershell
   # Windows PowerShell
   Get-Service *postgres*
   ```
2. Create the MediKiosk database and dedicated development user:
   ```sql
   CREATE USER medikiosk_user WITH PASSWORD 'medikiosk_secure_password' CREATEDB;
   CREATE DATABASE medikiosk_db OWNER medikiosk_user;
   GRANT ALL ON SCHEMA public TO medikiosk_user;
   ALTER SCHEMA public OWNER TO medikiosk_user;
   ```

---

## 7. Environment Variables

### Backend Configuration (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://medikiosk_user:medikiosk_secure_password@localhost:5432/medikiosk_db?schema=public
JWT_SECRET=development_super_secret_jwt_key_min_32_chars_long_medikiosk
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

### Frontend Configuration (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 8. Installation

Install dependencies across the monorepo:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 9. Database Migration & Seed

Generate the Prisma client, deploy migrations, and seed safe demo users:

```bash
# Generate Prisma client
cd backend
npm run prisma:generate

# Apply migrations
npx prisma migrate resolve --applied 20260903000000_init

# Seed demo users
npm run db:seed
```

### Safe Demo Credentials (Development Only)
| Role | Email | Password |
| :--- | :--- | :--- |
| **Patient** | `patient@medikiosk.local` | `Password123!` |
| **Doctor** | `doctor@medikiosk.local` | `Password123!` |
| **Admin** | `admin@medikiosk.local` | `Password123!` |

---

## 10. Running Backend

Start the Express development server with hot-reloading (`tsx`):
```bash
cd backend
npm run dev
```
The server will start on `http://localhost:5000`.  
Verify health: `http://localhost:5000/api/health`

---

## 11. Running Frontend

Start the Vite development server:
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`.  
Open in your browser to interact with the Home, Login, Patient, and Doctor interfaces.

Or run both concurrently from the workspace root:
```bash
npm run dev:backend
npm run dev:frontend
```

---

## 12. Testing

Run automated tests across both layers:

```bash
# Run backend tests (18 tests: health, auth, JWT, RBAC, DB relations)
npm run test:backend

# Run frontend tests (3 tests: app load, login form, protected routing)
npm run test:frontend

# Run all tests
npm test
```

---

## 13. Current Phase
 
**Current implementation: Phase 4**

### Phase 4 Deliverables Completed
- [x] Open-source **Qwen 2.5 7B Instruct** clinical slot extraction module (`backend/src/modules/ai/`)
- [x] Clean AI provider abstraction decoupled from runtime specifics (`qwenProvider.js` for local vLLM/Ollama and `mockProvider.js` for testing)
- [x] Centralized configuration (`aiConfig.js`) with support for `AI_MODE=qwen` and `AI_MODE=mock`
- [x] Strict Zod output schema validation (`clinicalExtractionSchema.js`) and prompt injection defense
- [x] Anti-hallucination safeguards: unstated symptoms are never fabricated
- [x] Strict safety boundaries: zero diagnosis, zero prescription, zero triage classification
- [x] Multilingual extraction parity across Marathi, Hindi, and English into language-neutral concept IDs
- [x] Multi-slot extraction: extracts multiple clinical facts from a single complex utterance
- [x] Explicit negative (`ABSENT`) and unknown (`UNKNOWN`) semantics preserved
- [x] Direct integration into `POST /api/clinical/sessions/:id/responses` and dedicated `POST /api/clinical/sessions/:id/extract`
- [x] Preservation of raw transcripts and source provenance (`PATIENT_VOICE`)
- [x] Seamless deterministic QuestionEngine decision-making (`Qwen extracts. QuestionEngine decides.`)
- [x] 100% passing automated test suite (36 backend tests, 8 frontend tests = 44 tests total)
- [x] End-to-end live browser verification with Marathi voice recognition, slot extraction, and token generation

---

## 14. Future Phases

The upcoming development phases will activate speech sidecars and document intelligence on top of this structured foundation:

- **Phase 5:** IndicConformer ASR & IndicF5 TTS Multilingual Speech Sidecars
- **Phase 6:** PaddleOCR & Medical Document Entity Extraction
- **Phase 7:** Deterministic Red-Flag & Emergency Triage Engine
- **Phase 8:** Clinical Summary Generation & Timeline Synthesizer
- **Phase 9:** AYUSH & Ayurvedic Dashavidha Pariksha Module
- **Phase 10:** Doctor Review, Verification & Sign-off Dashboard
- **Phase 11:** FHIR R4 & ABDM Integration Adapter Layer
- **Phase 12:** Security, Privacy & DPDP/ABDM Consent Hardening
- **Phase 13:** Comprehensive Testing & Golden Dataset Benchmarking
- **Phase 14:** SIH Final Demonstration, Packaging & Optimization
