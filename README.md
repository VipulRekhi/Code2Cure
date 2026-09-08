# MediKiosk — Smart Multilingual Patient Case-Taking & Clinical Intake Platform

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://www.sih.gov.in/)
[![Ministry of Ayush](https://img.shields.io/badge/Ministry-Ayush-green.svg)](https://ayush.gov.in/)
[![All India Institute of Ayurveda](https://img.shields.io/badge/Department-AIIA-blue.svg)](https://aiia.gov.in/)
[![Problem Statement](https://img.shields.io/badge/Problem%20Statement-SIH26047-red.svg)](https://www.sih.gov.in/)
[![License](https://img.shields.io/badge/License-Apache%202.0-lightgrey.svg)](LICENSE)
[![OCR Engine](https://img.shields.io/badge/OCR-PaddleOCR%20Devanagari%20PP--OCRv5-blueviolet.svg)]()
[![Voice Pipeline](https://img.shields.io/badge/Voice-Sovereign%20ASR%20%2B%20Neural%20TTS-teal.svg)]()
[![Clinical Summary](https://img.shields.io/badge/Clinical%20Summary-Deterministic%20Verbal%20Synthesis-success.svg)]()

> **SIH 2026 Problem Statement ID:** SIH26047  
> **Title:** Patient Case-Taking Software  
> **Organization:** Ministry of Ayush | **Department:** All India Institute of Ayurveda (AIIA)  
> **Theme:** MedTech / BioTech / HealthTech  

---

## ⚡ Quickstart for Antigravity / AI Agent

If you just cloned this repository and are using **Antigravity** (or another AI pair programmer), copy and paste this exact prompt to get the entire platform configured, migrated, verified, and running:

```text
Please bootstrap and launch the MediKiosk application:
1. Verify Node.js (v18+), Python (3.10-3.12), and FFmpeg are available.
2. Install dependencies: run `npm install` in root, and `pip install -r voice_runtime/requirements.txt`.
3. Set up backend environment: if `backend/.env` does not exist, copy from `backend/.env.example`.
4. In `backend/`, run `npx prisma generate`, `npx prisma db push`, and `npm run db:seed`.
5. Start all 3 sovereign services using the root command: `npm run dev` (this concurrently starts the Python Voice/OCR runtime on ports 8001/8002/8003, Express backend on port 5000, and Vite frontend on port 5173).
6. Verify platform health by running tests: `npm run test:backend` and `npm run test:frontend`.
```

---

## 1. Overview

**MediKiosk** is a sovereign, multimodal clinical case-taking kiosk engineered for high-volume outpatient departments (OPDs) in Indian tertiary hospitals and Ayurvedic institutes.

MediKiosk empowers patients—regardless of literacy level or technical background—to independently complete a comprehensive clinical history intake in their native vernacular language, digitize physical medical documents via on-device OCR, review a verified clinical summary, and submit structured intake data directly to the physician before entering the consultation room.

```text
IDENTIFY → LANGUAGE → CONSENT → CHIEF COMPLAINT → DYNAMIC CLINICAL Q&A → DOCUMENTS & OCR → PATIENT REVIEW → DOCTOR SUMMARY → SUBMIT
```

> [!IMPORTANT]
> **Safety & Clinical Intake Invariants:** MediKiosk is **strictly an intake, structuring, and assistive synthesis platform**. It is **NOT** an autonomous diagnostic engine.
> - **Zero Diagnoses:** The system never infers or asserts diseases (e.g. `pneumonia`, `osteoarthritis`, `appendicitis`).
> - **Zero Prescriptions:** The system never suggests medications, dosages, or treatments.
> - **Zero Hallucination:** Omitted or unreadable OCR fields are typed strictly as `"Not detected"` or `"NOT_PROVIDED"`, never fabricated.
> - **Five-Way Status Typing:** Every clinical fact is explicitly typed: `PRESENT` (confirmed), `ABSENT` (patient explicitly denied), `UNKNOWN` (patient was unsure), `NOT_PROVIDED` (unasked), or `NOT_DETECTED` (absent from document).

---

## 2. System Architecture & Microservices

MediKiosk combines a zero-framework touch-first kiosk frontend, an authoritative Node.js/Express clinical engine, and a sovereign Python runtime partitioned across isolated local ports:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Patient Kiosk Frontend (Port 5173)                       │
│        Vanilla HTML5 + Modern CSS3 + Native ES Modules (Zero React)         │
│          Touch-first UI (>= 64px tap targets), Audio Waveforms, OCR         │
│          Discrete Voice State Machine: IDLE → LISTENING → TRANSCRIBING      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (JSON / Multipart, up to 25 MB)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     Node.js Express Backend (Port 5000)                     │
│    • Clinical Session State Machine        • Deterministic Verbal Summary   │
│    • Cross-Session Data Isolation          • Provenance & Verbatim Quotes   │
│    • Prisma ORM Data Layer                 • Medication Reconciliation      │
└──────────────────┬───────────────────────────────────────────┬──────────────┘
                   │ Prisma Client                             │ HTTP REST
┌──────────────────▼──────────────────┐     ┌──────────────────▼──────────────┐
│       Supabase / PostgreSQL         │     │ Sovereign Python Microservices  │
│ • ClinicalSession & MedicalDocument │     │                                 │
│ • Patient, Doctor & Audit Logs      │     │  • Port 8001: IndicConformer ASR│
│ • Strict Session-Scoped Records     │     │  • Port 8002: PaddleOCR Engine  │
└─────────────────────────────────────┘     │  • Port 8003: Neural TTS Engine │
                                            └─────────────────────────────────┘
```

### Dedicated Service Ports
| Service | Technology | Port | Primary Endpoints |
|---|---|---|---|
| **Frontend Kiosk** | Vanilla JS / Vite | `5173` | UI Interface |
| **Backend REST API** | Express.js / Prisma | `5000` | `/api/clinical/*`, `/api/voice/*` |
| **ASR Voice Service** | IndicConformer / Python | `8001` | `POST /asr`, `GET /health` |
| **OCR Document Engine** | PaddleOCR Devanagari | `8002` | `POST /ocr`, `GET /health` |
| **TTS Speech Synthesis** | Multilingual Neural TTS | `8003` | `POST /tts`, `GET /health` |

---

## 3. Technology Stack

### Frontend (Touch-First Kiosk Client)
- **Core:** HTML5, Modern CSS3, Native Vanilla JavaScript (ES Modules) — *Zero React / Zero TypeScript overhead for instant kiosk cold boots*
- **Typography:** Google Fonts (Noto Sans & Noto Sans Devanagari)
- **Languages:** Marathi (मराठी), Hindi (हिन्दी), English (en)
- **Kiosk Target:** 16:9 Landscape touch displays (1920×1080, 1366×768) with touch targets $\ge 64\text{px}$
- **Audio:** Web Audio API visualizer, discrete state transitions, and browser audio context auto-unlocking

### Backend (Clinical Engine & Data Layer)
- **Runtime:** Node.js (v18+) ES Modules
- **Framework:** Express.js 4 (configured with 25 MB body parser for high-res prescription scans)
- **Database & ORM:** PostgreSQL / Supabase with Prisma ORM 5
- **Summary Builder:** Deterministic canonical summary builder with dual representation for backward compatibility
- **Security:** JWT authentication, Bcrypt password hashing, session-scoped document isolation

### Sovereign Voice & OCR Runtime (Python)
- **Speech Recognition (ASR):** Vernacular acoustic speech recognition via IndicConformer on port `8001`.
- **Medical Document OCR:** PaddleOCR 3.x using `devanagari_PP-OCRv5_mobile_rec` for authentic Devanagari (Marathi/Hindi) and English prescription recognition on port `8002`.
- **Voice Synthesis (TTS):** 24kHz studio-quality Neural TTS (`mr-IN-AarohiNeural`, `hi-IN-SwaraNeural`, `en-IN-NeerjaNeural`) with local MMS-TTS fallback on port `8003`.
- **PDF Processing:** Multi-page PDF rasterization via `pypdfium2`.

---

## 4. Key Clinical Features (Phase 8 & 8.1)

### 1. 60–70 Word Patient-Verified Verbal Clinical Summary
- **Deterministic Synthesis:** Derived strictly from verified `ClinicalFact`, `QuestionResponse`, and `MedicalDocument` records via [`clinicalSummaryBuilder.js`](backend/src/modules/questionEngine/clinicalSummaryBuilder.js).
- **Trilingual:** Generated in the patient's selected language (Marathi, Hindi, or English).
- **Clinical Invariants:** Zero diagnoses, zero prescriptions, zero treatment suggestions.
- **Doctor Handover:** Included in the doctor submission payload as `canonicalSummary.verbalSummary` and top-level `verbalSummary`.
- **Patient Review:** Displayed under Section 6.5 *"Summary for Doctor"* (*"डॉक्टरसाठी सारांश"* / *"डॉक्टर के लिए सारांश"*) with confirmation prompt before submission.

### 2. Patient-Reported vs. Document-Extracted Medication Reconciliation
- Reconciles medications reported verbally/by touch with medications extracted by PaddleOCR from physical prescriptions.
- Flags dosage and frequency conflicts automatically with alert banners for the clinician.

### 3. Voice & Sound Resilience
- **Discrete State Machine:** `IDLE` $\rightarrow$ `LISTENING` $\rightarrow$ `PROCESSING` $\rightarrow$ `TRANSCRIBING` $\rightarrow$ `SUCCESS` or `ERROR`.
- **Granular Error Codes:** `NO_AUDIO_PROVIDED`, `EMPTY_AUDIO`, `MIC_PERMISSION_DENIED`, `ASR_RUNTIME_UNAVAILABLE`, `ASR_TIMEOUT`, `ASR_FAILED`, `TTS_RUNTIME_UNAVAILABLE`, `AUDIO_PLAYBACK_FAILED`.
- **Audio Context Unlocking:** Automatically unlocks suspended browser `AudioContext` on initial user interaction to bypass kiosk autoplay restrictions.
- **Fast Utterance Cancellation:** Calling `stop()` immediately cancels active audio playback to prevent voice overlaps during rapid navigation.

---

## 5. Repository Structure

```text
SIH/
├── backend/                        # Express.js REST API & Database Layer
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma schema (ClinicalSession, MedicalDocument, etc.)
│   │   └── seed.js                 # Demo data seed script
│   ├── src/
│   │   ├── app.js                  # Express app & route middleware
│   │   ├── server.js               # Server entry point (Port 5000)
│   │   ├── controllers/            # Clinical, Document, Voice, Auth controllers
│   │   ├── modules/
│   │   │   ├── ai/                 # Clinical extraction & slot mapping
│   │   │   ├── document/           # OCR service & entity extraction
│   │   │   ├── questionEngine/     # Summary builder & state machine
│   │   │   └── voice/              # ASR, TTS, and socket probes
│   │   └── routes/                 # Express API routes
│   ├── tests/                      # Automated Vitest integration test suites
│   ├── .env.example                # Environment variables template
│   └── package.json
│
├── frontend/                       # Vanilla Touch Kiosk Frontend
│   ├── index.html                  # Kiosk single-page shell
│   ├── css/                        # Responsive CSS3 styles
│   ├── js/
│   │   ├── app.js                  # Kiosk bootstrap
│   │   ├── router.js               # Vanilla hash router
│   │   ├── state.js                # Reactive kiosk state
│   │   ├── api.js                  # Backend API client
│   │   ├── i18n.js                 # Multilingual dictionary (en, mr, hi)
│   │   ├── screens/                # Kiosk screen controllers
│   │   ├── components/             # Reusable UI components (VoiceButton, etc.)
│   │   └── services/               # SpeechService, TTSService, OCRService
│   ├── test/                       # Frontend Vitest unit test suites
│   ├── package.json
│   └── vite.config.js
│
├── voice_runtime/                  # Sovereign Python Voice & OCR Microservices
│   ├── server.py                   # Multi-port orchestrator (8001, 8002, 8003)
│   ├── asr_server.py               # IndicConformer ASR service
│   ├── ocr_server.py               # PaddleOCR HTTP service
│   ├── tts_server.py               # Multilingual Neural TTS service
│   ├── ocr_runtime.py              # Standalone OCR & PDF pipeline
│   ├── test_real_asr.py            # Real acoustic audio verification script
│   └── requirements.txt            # Python dependencies
│
├── package.json                    # Monorepo orchestration scripts
└── README.md                       # Documentation
```

---

## 6. Manual Prerequisites

1. **Node.js**: `v18.x` or later (`node -v`)
2. **npm**: `v9.x` or later (`npm -v`)
3. **Python**: `3.10` to `3.12` (`python --version`)
4. **FFmpeg**: Required for audio normalization and transcoding.
   - **Windows:** `winget install Gyan.FFmpeg` or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and add to system `PATH`.
   - **Linux / macOS:** `sudo apt install ffmpeg` or `brew install ffmpeg`
5. **PostgreSQL / Supabase**: A local PostgreSQL instance or a free database from [Supabase](https://supabase.com).

---

## 7. Step-by-Step Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/VipulRekhi/Code2Cure.git
cd Code2Cure
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

### Step 3: Install Python Dependencies
```bash
# Recommended: create a virtual environment
python -m venv .venv

# Activate virtual environment:
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies:
pip install -r voice_runtime/requirements.txt
```

### Step 4: Configure Backend Environment Variables
```bash
# Copy example environment file
cp backend/.env.example backend/.env
```

Open `backend/.env` and ensure your database connection string is configured:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database Connection (Supabase or Local PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/medikiosk_db?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/medikiosk_db?schema=public"

JWT_SECRET="medikiosk_super_secure_development_secret_key_12345"
JWT_EXPIRES_IN=7d

# Microservice Ports (Port Isolation)
ASR_URL=http://127.0.0.1:8001
ASR_ENDPOINT=http://127.0.0.1:8001/asr
OCR_URL=http://127.0.0.1:8002
OCR_ENDPOINT=http://127.0.0.1:8002/ocr
TTS_URL=http://127.0.0.1:8003
TTS_ENDPOINT=http://127.0.0.1:8003/tts
```

### Step 5: Initialize the Database
```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
```

---

## 8. Running the Application

### Option A: Single Command (Recommended)
From the repository root, start all 3 services concurrently:
```bash
npm run dev
```
*This launches:*
- **Voice/OCR Microservices** on ports `8001`, `8002`, and `8003`
- **Express Backend API** on `http://localhost:5000`
- **Vite Kiosk Frontend** on `http://localhost:5173`

---

### Option B: Separate Terminals

#### Terminal 1: Sovereign Voice & OCR Runtime
```bash
python voice_runtime/server.py
```
*Output:*
```text
======================================================================
  MediKiosk Sovereign Voice & OCR Multi-Service Orchestrator
======================================================================
  • ASR Service:  http://127.0.0.1:8001 (/asr, /health)
  • OCR Service:  http://127.0.0.1:8002 (/ocr, /health)
  • TTS Service:  http://127.0.0.1:8003 (/tts, /health)
======================================================================
```

#### Terminal 2: Node.js Express Backend
```bash
npm run dev:backend
```
*Runs on `http://localhost:5000`.*

#### Terminal 3: Vanilla Kiosk Frontend
```bash
npm run dev:frontend
```
*Opens at `http://localhost:5173`.*

---

## 9. Verification & Automated Testing

### Run All Backend Tests (25+ tests)
```bash
npm run test:backend
```
*Runs:*
- `tests/clinicalVerbalSummary.test.js` — 15/15 tests passing (verbal summary bounds, determinism, language synthesis, zero diagnosis/prescription invariants)
- `tests/voiceRegression.test.js` — 10/10 tests passing (empty audio rejection, offline failover, conversational speech transcription)

### Run All Frontend Tests (49 tests)
```bash
npm run test:frontend
```
*Runs:*
- `test/voiceRegression.test.js` — 8/8 tests passing (discrete state transitions, error recovery, audio context unlocking)
- `test/voicePipeline.test.js` — 6/6 tests passing
- `test/tts.test.js` — 12/12 tests passing
- `test/clinicalSummary.test.js` — 7/7 tests passing
- `test/kiosk.test.js` — 10/10 tests passing
- `test/phase7Verification.test.js` — 3/3 tests passing
- `test/severityMapping.test.js` — 3/3 tests passing

### Real Acoustic Audio End-to-End Test (Zero Hints)
With the backend and voice runtime running, execute:
```bash
python voice_runtime/test_real_asr.py
```
*Verifies genuine acoustic speech transcription for Marathi, Hindi, and English without any mocks or predefined hints.*

---

## 10. Document OCR & Zero-Hallucination Rules

1. **Supported Formats:** JPEG, PNG, WEBP, and multi-page PDF documents.
2. **File Size Limit:** Up to **15 MB** per document (Express body parser configured for **25 MB** payloads to handle base64 encoding overhead).
3. **Multi-Page PDFs:** Rasterized page-by-page using `pypdfium2` before feeding to PaddleOCR.
4. **Zero-Hallucination Guardrails:**
   - Missing dosages or frequencies are stored as `"Not detected"`.
   - Never hallucinates instructions (e.g. `"1 tablet twice daily"`) unless explicitly written on the prescription.
   - Raw OCR text is permanently preserved alongside structured extractions for physician audit.

---

## 11. Troubleshooting

### 1. Python Microservices Offline
- Verify that `python voice_runtime/server.py` is running. Check health endpoints:
  - `http://127.0.0.1:8001/health` (ASR)
  - `http://127.0.0.1:8002/health` (OCR)
  - `http://127.0.0.1:8003/health` (TTS)

### 2. Microphone or Audio Playback Blocked
- In your browser, allow microphone access for `http://localhost:5173`.
- Tap or click anywhere on the kiosk screen on initial load to allow `unlockAudioContext()` to resume the Web Audio context.

### 3. Database Connection Error
- Ensure `DATABASE_URL` in `backend/.env` is correct.
- If using Supabase transaction pooler, ensure `?pgbouncer=true` is appended to the connection string.
- Run `npx prisma db push` inside `backend/` to verify connection and schema synchronization.

---

## 12. Contributing & License

Developed for the **Smart India Hackathon (SIH 2026)** under the Ministry of Ayush & All India Institute of Ayurveda (AIIA).

Licensed under the [Apache License 2.0](LICENSE).
