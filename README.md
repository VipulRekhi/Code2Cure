# MediKiosk — Smart Multilingual Patient Case-Taking & Clinical Triage Platform

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://www.sih.gov.in/)
[![Ministry of Ayush](https://img.shields.io/badge/Ministry-Ayush-green.svg)](https://ayush.gov.in/)
[![All India Institute of Ayurveda](https://img.shields.io/badge/Department-AIIA-blue.svg)](https://aiia.gov.in/)
[![Problem Statement](https://img.shields.io/badge/Problem%20Statement-SIH26047-red.svg)](https://www.sih.gov.in/)
[![License](https://img.shields.io/badge/License-Apache%202.0-lightgrey.svg)](LICENSE)
[![OCR Engine](https://img.shields.io/badge/OCR-PaddleOCR%20Devanagari%20PP--OCRv5-blueviolet.svg)]()
[![Voice Pipeline](https://img.shields.io/badge/Voice-Multilingual%20Neural%20TTS%20%2B%20ASR-teal.svg)]()

> **SIH 2026 Problem Statement ID:** SIH26047  
> **Title:** Patient Case-Taking Software  
> **Organization:** Ministry of Ayush | **Department:** All India Institute of Ayurveda (AIIA)  
> **Theme:** MedTech / BioTech / HealthTech  

---

## 1. Overview

**MediKiosk** is a sovereign, patient-facing, multimodal clinical intake kiosk and digital case-taking platform engineered for high-volume outpatient departments (OPDs) in Indian tertiary hospitals and Ayurvedic institutes.

MediKiosk empowers patients—regardless of literacy level or technical background—to independently complete a comprehensive clinical history intake, digitize physical medical documents via on-device OCR, and undergo automated red-flag triage screening before entering the doctor's consultation room.

```
IDENTIFY → LANGUAGE → CONSENT → CLINICAL HISTORY → DOCUMENTS & OCR → REVIEW → SUMMARY → TRIAGE/ROUTE → DOCTOR DASHBOARD
```

> [!IMPORTANT]
> **Safety & Zero-Hallucination Baseline:** MediKiosk is **strictly an assistive clinical intake, structuring, and triage-assistive tool**. It is **NOT** an autonomous diagnostic system. All AI-extracted clinical concepts, OCR extractions, and medical document summaries are treated as provisional drafts subject to mandatory physician verification and sign-off. When an OCR document has unreadable fields, the system strictly outputs `"Not detected"` rather than inferring or hallucinating medication dosages.

---

## 2. System Architecture

MediKiosk is designed as a high-performance modular system combining an ultra-responsive kiosk UI, a deterministic clinical backend, and a dedicated sovereign Python runtime for voice and OCR:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Patient Kiosk Frontend (Port 5173)                       │
│      Vanilla HTML5 + Modern CSS3 + Native ES Modules (Zero React/TS)        │
│          Touch-first UI (>= 64px tap targets), Audio Waveforms, OCR         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (JSON / Multipart)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     Node.js Express Backend (Port 5000)                     │
│    • Clinical Session State Machine        • Zero-Hallucination Extractor   │
│    • Cross-Session Data Isolation          • 25 MB Payload Support          │
│    • Prisma ORM Data Layer                 • JWT Auth & Triage Engine       │
└──────────────────┬───────────────────────────────────────────┬──────────────┘
                   │ Prisma Client                             │ HTTP / Subprocess
┌──────────────────▼──────────────────┐     ┌──────────────────▼──────────────┐
│       Supabase / PostgreSQL         │     │ Sovereign Voice & OCR Runtime   │
│ • ClinicalSession & MedicalDocument │     │         (Port 8001)             │
│ • Patient, Doctor & Audit Logs      │     │ • Edge-TTS / Meta MMS VITS      │
│ • Strict Session-Scoped Records     │     │ • Vernacular ASR (mr, hi, en)   │
└─────────────────────────────────────┘     │ • PaddleOCR Devanagari Engine   │
                                            │ • PDF multi-page rendering      │
                                            └─────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend (Vanilla Kiosk UI)
- **Core:** HTML5, CSS3, Vanilla JavaScript (ES Modules) — *Zero React / Zero TypeScript overhead for instant kiosk cold boots*
- **Typography:** Google Fonts (Noto Sans & Noto Sans Devanagari)
- **Languages:** Marathi (मराठी), Hindi (हिन्दी), English
- **Kiosk Target:** 16:9 Landscape touch displays (1920×1080, 1366×768)
- **Touch Metrics:** Minimum touch targets $\ge 48\text{px}$, primary actions 64–100px+
- **Voice UX:** Native MediaRecorder + Web Audio API visualizer

### Backend (Clinical REST API)
- **Runtime:** Node.js (v18+) ES Modules
- **Framework:** Express.js 4 (configured with 25 MB body parser for high-res medical scans)
- **Database & ORM:** PostgreSQL / Supabase with Prisma ORM 5
- **Clinical Engine:** Schema-driven deterministic Question Engine & Negation/Severity extraction
- **Security:** JWT authentication, Bcrypt password hashing, session isolation middleware

### Sovereign Voice & OCR Runtime (Python)
- **Voice Synthesis (TTS):** Edge-TTS (Primary Indian neural voices: `mr-IN-AarohiNeural`, `hi-IN-SwaraNeural`, `en-IN-NeerjaNeural`) with local Meta MMS-TTS VITS fallback on GPU/CPU.
- **Speech Recognition (ASR):** Vernacular acoustic speech recognition with FFmpeg loudness normalization.
- **Medical Document OCR:** PaddleOCR 3.x using `devanagari_PP-OCRv5_mobile_rec` for authentic Devanagari (Marathi/Hindi) and English prescription recognition.
- **PDF Processing:** Multi-page PDF page rendering via `pypdfium2`.

---

## 4. Repository Structure

```text
SIH/
├── backend/                        # Express.js REST API & Database Layer
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma schema (ClinicalSession, MedicalDocument, etc.)
│   │   └── seed.js                 # Database seed script for development
│   ├── src/
│   │   ├── app.js                  # Express middleware & route bindings
│   │   ├── server.js               # HTTP server entry point
│   │   ├── controllers/            # Clinical, Document, Voice, Auth controllers
│   │   ├── modules/
│   │   │   ├── ai/                 # Dynamic clinical extraction & LLM prompts
│   │   │   ├── document/           # OCR service & clinical extraction service
│   │   │   ├── questionEngine/     # Deterministic clinical questioning engine
│   │   │   └── voice/              # ASR & TTS routing services
│   │   └── routes/                 # Express API routes (/api/clinical, /api/voice, etc.)
│   ├── tests/                      # Vitest backend integration test suites
│   ├── .env.example                # Backend environment template
│   └── package.json
│
├── frontend/                       # Vanilla Kiosk Client
│   ├── index.html                  # Kiosk single-page container
│   ├── css/                        # Responsive kiosk design system
│   ├── js/
│   │   ├── app.js                  # Kiosk bootstrap
│   │   ├── router.js               # Vanilla hash router
│   │   ├── state.js                # Central kiosk application state
│   │   ├── api.js                  # Backend API client
│   │   ├── i18n.js                 # Multilingual translation dictionary
│   │   ├── screens/                # Screen controllers (Welcome, Language, Consent, History, DocumentReview, etc.)
│   │   └── services/               # Voice recording & document services
│   ├── package.json
│   └── vite.config.js
│
├── voice_runtime/                  # Sovereign Python Voice & OCR Microservice
│   ├── server.py                   # Threaded HTTP server on port 8001 (/asr, /tts, /ocr, /health)
│   ├── ocr_runtime.py              # PaddleOCR layout analysis & pypdfium2 PDF renderer
│   └── requirements.txt            # Python dependencies
│
├── package.json                    # Workspace root scripts
└── README.md                       # Documentation
```

---

## 5. Prerequisites

Before setting up MediKiosk on your machine, ensure you have the following installed:

1. **Node.js**: `v18.x` or later (`node -v`)
2. **npm**: `v9.x` or later (`npm -v`)
3. **Python**: `3.10` to `3.12` (`python --version`)
4. **FFmpeg**: Required for audio transcoding and loudness normalization.
   - **Windows:** `winget install Gyan.FFmpeg` or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and add to `PATH`.
   - **Linux / macOS:** `sudo apt install ffmpeg` or `brew install ffmpeg`
5. **Git**: (`git --version`)
6. **PostgreSQL / Supabase**: A local PostgreSQL database or free cloud database from [Supabase](https://supabase.com).

---

## 6. Step-by-Step Installation & Local Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/VipulRekhi/Code2Cure.git
cd Code2Cure
```

---

### Step 2: Install Node.js Dependencies

Install dependencies for root, backend, and frontend:

```bash
# Install root and workspace dependencies
npm install

# Or install manually per directory:
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

---

### Step 3: Configure Environment Variables

Create `.env` in the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and update your database credentials:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# PostgreSQL / Supabase Database Connection
# If using Supabase, paste your transaction pooler URL (DATABASE_URL) and direct URL (DIRECT_URL):
DATABASE_URL="postgresql://postgres.[your-project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[your-project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

JWT_SECRET="medikiosk_super_secure_development_secret_key_12345"
JWT_EXPIRES_IN=7d

# Voice Pipeline (Port 8001)
VOICE_RUNTIME_HOST=127.0.0.1
VOICE_RUNTIME_PORT=8001
ASR_ENDPOINT=http://127.0.0.1:8001/asr
TTS_ENDPOINT=http://127.0.0.1:8001/tts

# AI Extraction Mode
AI_PROVIDER=mock
AI_MODE=mock
```

---

### Step 4: Initialize the Database

Push the Prisma schema to your database and seed initial demo data:

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Synchronize database schema
npx prisma db push

# Seed demo doctors and initial clinical entities
npm run db:seed

cd ..
```

---

### Step 5: Setup Python Voice & OCR Runtime

Open a terminal to install Python dependencies:

```bash
# Optional but recommended: create a virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux / macOS:
source .venv/bin/activate

# Install Python requirements
pip install -r voice_runtime/requirements.txt
```

---

## 7. Running the Application

To run MediKiosk locally, open three terminal windows:

### Terminal 1: Start Sovereign Voice & OCR Runtime (Port 8001)

```bash
python voice_runtime/server.py
```
*You will see:*
```text
[Voice Runtime] CUDA GPU detected / Running on CPU
[Voice Runtime] Pre-warming PaddleOCR Devanagari engine...
[Voice Runtime] PaddleOCR engine pre-warmed and ready.
[Voice Runtime] Sovereign Voice Service active at http://127.0.0.1:8001
[Voice Runtime] Neural TTS & Vernacular ASR Ready on port 8001
```

---

### Terminal 2: Start Express.js Backend (Port 5000)

```bash
# From repository root:
npm run dev:backend

# Or from backend/ directory:
cd backend
npm run dev
```
*Backend runs at `http://localhost:5000`.*

---

### Terminal 3: Start Vanilla Kiosk Frontend (Port 5173)

```bash
# From repository root:
npm run dev:frontend

# Or from frontend/ directory:
cd frontend
npm run dev
```
*Frontend opens at `http://localhost:5173`.*

---

## 8. Verifying the Full OCR & Voice Pipeline

Once all three services are running, test the complete workflow:

1. Open `http://localhost:5173` in Chrome / Edge.
2. Select **Marathi (मराठी)**, **Hindi (हिन्दी)**, or **English**.
3. Choose **New Patient** or use the quick **Demo Patient (आरव शर्मा)**.
4. Accept Consent and select a Department (e.g. *General Medicine*).
5. Select a symptom or use the **Microphone** to speak in Marathi/Hindi.
6. When prompted for past medical records, click **होय, मागील अहवाल / कागदपत्रे आहेत (Yes, I have documents)**.
7. Upload any prescription image (`.jpg`, `.png`) or medical report (`.pdf`) up to **15 MB**.
8. The kiosk will display `🔍 कागद तपासत आहे... (Analyzing Document)`.
9. The extracted text will be displayed with `✓ Scanned by PaddleOCR`, exact Devanagari preservation, and extracted medications.

---

## 9. Automated Regression Testing

Run the full automated test suites to verify that OCR, voice, and database layers work cleanly:

```bash
# Run all backend integration tests
npm run test:backend

# Run dedicated Real-World Medical Document OCR Suite:
cd backend
npx vitest run tests/realMedicalDocumentOcr.test.js

# Run Devanagari Unicode preservation tests:
npx vitest run tests/paddleOcrDevanagari.test.js

# Run Voice Input End-to-End Suite:
npx vitest run tests/voiceInputEndToEnd.test.js
```

### Verified Test Matrix
| Test Suite | Purpose | Status |
|---|---|---|
| `tests/realMedicalDocumentOcr.test.js` | Real JPG, PNG, multi-page PDF upload, Express API, zero hallucination | **PASS (7/7)** |
| `tests/paddleOcrDevanagari.test.js` | PaddleOCR inference, Devanagari Unicode (`\u0900`–`\u097F`) round-trip | **PASS (3/3)** |
| `tests/medicalDocumentOcr.test.js` | Layout parsing, dosage detection, cross-session isolation | **PASS (9/9)** |
| `tests/voiceInputEndToEnd.test.js` | Edge-TTS synthesis & acoustic vernacular ASR transcription | **PASS (4/4)** |

---

## 10. Document OCR & Zero-Hallucination Rules

1. **Accepted MIME Types:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
2. **File Size Limit:** Up to **15 MB** per document. Backend Express parser supports up to **25 MB** payloads to safely accommodate base64 transport overhead.
3. **PDF Page Rendering:** Multi-page PDFs are automatically rasterized page-by-page using `pypdfium2` before feeding to PaddleOCR.
4. **Zero-Hallucination Extraction:**
   - If a prescription mentions a medication without a clear dosage, `dose` is recorded strictly as `"Not detected"`.
   - The engine never fabricates `"1 tablet twice daily"` or `"500mg"` unless explicitly written on the document.
   - Raw OCR text is permanently preserved alongside structured extractions for physician audit.

---

## 11. Troubleshooting & Common Issues

### 1. Python Server (Port 8001) Shows "Connection Refused"
- **Solution:** Ensure `python voice_runtime/server.py` is running in Terminal 1. Verify health check at `http://127.0.0.1:8001/health`.

### 2. PaddleOCR Cold-Start Delay on First Run
- On the very first run, PaddleOCR downloads its models to `~/.paddlex/official_models/`. Subsequent runs use pre-warmed memory caching and complete recognition within seconds.

### 3. Audio / Microphone ASR Failure
- Ensure FFmpeg is accessible in your system `PATH` (`ffmpeg -version`).
- When testing in the browser, allow microphone permissions for `http://localhost:5173`.

### 4. Database Connection Errors
- Verify that `DATABASE_URL` in `backend/.env` has the correct password and pooler parameters (`?pgbouncer=true` for Supabase pooler). Run `npx prisma db push` to verify connectivity.

---

## 12. Contributing & License

Developed for the **Smart India Hackathon (SIH 2026)** under the Ministry of Ayush & All India Institute of Ayurveda (AIIA).

Licensed under the [Apache License 2.0](LICENSE).
