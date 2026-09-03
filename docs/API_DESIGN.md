# REST API Design Specification — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Backend Framework:** Node.js + Express.js + TypeScript  
**Date:** September 2026  

---

## 1. Standard API Conventions & Response Envelope

All MediKiosk REST endpoints return JSON adhering to a standardized API response envelope:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;                  // e.g., "VALIDATION_FAILED", "UNAUTHORIZED", "NOT_FOUND"
    message: string;               // Human-readable error description
    details?: any;                 // Zod field validation errors or trace info
  };
  metadata?: {
    timestamp: string;
    requestId: string;
  };
}
```

---

## 1.1 Phase 1 Operational Endpoints & Data Models

### Phase 1 Core Endpoints

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System health check (service name, status: "ok", timestamp) |
| `GET` | `/api/health/db` | Public | Database health check confirming PostgreSQL connection via Prisma |
| `POST` | `/api/auth/register` | Public (Dev) | Register new user with role (`PATIENT`, `DOCTOR`, `ADMIN`) and profile |
| `POST` | `/api/auth/login` | Public | Authenticate with email/password; returns signed JWT and user profile |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile based on Bearer token |

#### Request & Response Examples

##### `GET /api/health`
Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "medikiosk-api",
    "timestamp": "2026-09-03T11:45:07.757Z"
  },
  "message": "Service is healthy"
}
```

##### `POST /api/auth/register`
Request:
```json
{
  "email": "patient@medikiosk.local",
  "password": "Password123!",
  "role": "PATIENT",
  "patient": {
    "firstName": "Aarav",
    "lastName": "Sharma",
    "phone": "+919876543210",
    "preferredLanguage": "HI"
  }
}
```
Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "daf614f0-3542-4420-93dc-70f88745af6b",
      "email": "patient@medikiosk.local",
      "role": "PATIENT",
      "patient": {
        "id": "0e49b310-0029-4aef-bc61-6638c62d3d19",
        "patientIdentifier": "DEMO-PAT-001",
        "firstName": "Aarav",
        "lastName": "Sharma",
        "preferredLanguage": "HI"
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  },
  "message": "User registered successfully"
}
```

##### `POST /api/auth/login`
Request:
```json
{
  "email": "patient@medikiosk.local",
  "password": "Password123!"
}
```
Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "daf614f0-3542-4420-93dc-70f88745af6b",
      "email": "patient@medikiosk.local",
      "role": "PATIENT"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  },
  "message": "Login successful"
}
```

##### `GET /api/auth/me`
Header:
```text
Authorization: Bearer <jwt_token>
```
Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "daf614f0-3542-4420-93dc-70f88745af6b",
      "email": "patient@medikiosk.local",
      "role": "PATIENT",
      "patient": {
        "patientIdentifier": "DEMO-PAT-001",
        "firstName": "Aarav",
        "lastName": "Sharma",
        "preferredLanguage": "HI"
      }
    }
  },
  "message": "Profile retrieved successfully"
}
```

### Phase 1 Foundational Data Models

- **`User`**: Account identity supporting secure bcrypt password hashing and role (`PATIENT`, `DOCTOR`, `ADMIN`).
- **`Patient`**: 1-to-1 extension of `User` holding demographics (`firstName`, `lastName`, `dateOfBirth`, `phone`, `preferredLanguage`, unique `patientIdentifier`).
- **`Doctor`**: 1-to-1 extension of `User` holding clinical staff identity (`name`, `specialization`).
- **`Consent`**: 1-to-many relationship with `Patient` for granular DPDP/ABDM consents (`consentType`, `version`, `granted`, `grantedAt`, `revokedAt`).

---

## 2. API Endpoint Directory (Future Phases)

### 2.1 Authentication & Staff Management (`/api/v1/auth`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/staff/login` | Public | Staff login (Doctor / Triage / Admin) with email/password + OTP |
| `POST` | `/api/v1/auth/kiosk/initialize` | Kiosk Hardware | Bootstraps and registers physical kiosk terminal with API key |
| `POST` | `/api/v1/auth/refresh` | Authenticated | Refreshes short-lived JWT access token |
| `POST` | `/api/v1/auth/logout` | Authenticated | Invalidates session and revokes JWT |

---

### 2.2 Patient Identity & Consent (`/api/v1/patients`, `/api/v1/consent`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/patients/lookup` | Kiosk / Staff | Look up patient by phone number, hospital UHID, or ABHA ID |
| `POST` | `/api/v1/patients/register` | Kiosk / Staff | Register new patient demographic record |
| `POST` | `/api/v1/consent/record` | Kiosk Session | Capture explicit DPDP/ABDM audio/touch consent for intake session |
| `GET` | `/api/v1/consent/status/:sessionId`| Staff | Check consent compliance status for a session |

---

### 2.3 Kiosk Intake & Question Engine (`/api/v1/sessions`, `/api/v1/questions`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/sessions/start` | Kiosk Terminal | Start new intake session with chosen language (`en`, `hi`, `mr`) and mode |
| `GET` | `/api/v1/sessions/:sessionId/current-node` | Kiosk Session | Retrieve active question node, localized text, options & audio key |
| `POST` | `/api/v1/sessions/:sessionId/submit-answer` | Kiosk Session | Submit answer (touch option ID, numeric value, or slider) |
| `POST` | `/api/v1/sessions/:sessionId/skip-node` | Kiosk Session | Mark optional question as skipped / not known |
| `POST` | `/api/v1/sessions/:sessionId/finalize` | Kiosk Session | Mark questionnaire complete and trigger final summary generation |
| `POST` | `/api/v1/sessions/:sessionId/abort` | Kiosk Session | Abort session due to timeout or patient cancellation (purges PHI) |

---

### 2.4 Multilingual Speech & Voice (`/api/v1/speech`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/speech/transcribe` | Kiosk Session | Upload recorded audio buffer (PCM/WAV) → returns vernacular transcript & extracted slot |
| `POST` | `/api/v1/speech/synthesize` | Kiosk Session | Synthesize speech for dynamic text prompt → returns streaming WAV/MP3 audio |

---

### 2.5 Medical Document Upload & OCR (`/api/v1/documents`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/documents/upload` | Kiosk Session | Upload document scan (JPEG/PNG/PDF) → runs validation & triggers async OCR |
| `GET` | `/api/v1/documents/:docId/status` | Kiosk / Staff | Poll status of OCR & entity extraction pipeline |
| `GET` | `/api/v1/documents/:docId/file` | Doctor / Staff | Retrieve secure temporary signed URL for original document image |
| `GET` | `/api/v1/documents/session/:sessionId` | Staff | List all uploaded documents and extracted entity sets for a session |

---

### 2.6 Deterministic Red-Flags & Triage (`/api/v1/triage`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/triage/queue` | Triage / Doctor | List active OPD intake queue with real-time triage priority badges |
| `GET` | `/api/v1/triage/alerts` | Triage Staff | Fetch real-time active critical red-flag alerts requiring intervention |
| `POST` | `/api/v1/triage/alerts/:alertId/acknowledge` | Triage Staff | Nurse/staff acknowledges and takes clinical ownership of red flag |
| `POST` | `/api/v1/triage/alerts/:alertId/clear` | Triage Staff | Clears alert and unlocks kiosk booth |

---

### 2.7 Doctor Review, Timeline & Sign-off (`/api/v1/doctor`, `/api/v1/timeline`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/doctor/patients/:patientId/case-summary` | Doctor | Get full draft clinical intake summary (Allopathic + AYUSH) |
| `GET` | `/api/v1/timeline/:patientId` | Doctor | Get unified chronological medical timeline events |
| `PATCH` | `/api/v1/doctor/entities/:entityId/verify` | Doctor | Update entity verification status (`PHYSICIAN_VERIFIED`, `EDITED`, `REJECTED`) |
| `POST` | `/api/v1/doctor/sessions/:sessionId/sign-off` | Doctor | Submit physician clinical sign-off, notes, prescription & lock case |

---

### 2.8 AYUSH Specialised Module (`/api/v1/ayush`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ayush/prakriti-quiz` | Kiosk / Doctor | Retrieve standardized Prakriti assessment questionnaire nodes |
| `POST` | `/api/v1/ayush/sessions/:sessionId/dashavidha` | Kiosk / Doctor | Record Dashavidha Pariksha parameters |
| `GET` | `/api/v1/ayush/sessions/:sessionId/summary` | Doctor | Generate specialized Ayurvedic Rogi & Roga Pariksha summary |

---

### 2.9 Integrations & FHIR / ABDM (`/api/v1/integrations`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/integrations/fhir/bundle/:sessionId` | Doctor / EMR | Export full signed clinical intake record as FHIR R4 Bundle |
| `POST` | `/api/v1/integrations/abdm/link-care-context` | Doctor / System | Register encounter care context with ABDM Gateway |

---

## 3. Detailed Request/Response Payloads (Representative Samples)

### 3.1 `POST /api/v1/sessions/:sessionId/submit-answer`
**Request Payload:**
```json
{
  "nodeId": "CP_03_CHARACTER",
  "value": "CRUSHING_HEAVY",
  "inputModality": "TOUCH",
  "confidence": 1.0
}
```
**Response Payload:**
```json
{
  "success": true,
  "data": {
    "nextNode": {
      "id": "CP_04_RADIATION",
      "category": "HPI",
      "nodeType": "MULTI_CHOICE",
      "promptText": {
        "en": "Does the pain travel or radiate anywhere else?",
        "hi": "क्या यह दर्द शरीर के किसी अन्य हिस्से में जा रहा है?",
        "mr": "हा त्रास किंवा वेदना इतर कोणत्याही भागात पसरत आहे का?"
      },
      "options": [
        { "id": "RAD_LEFT_ARM", "value": "LEFT_ARM", "label": { "en": "Left Arm / Shoulder", "hi": "बायां हाथ / कंधा", "mr": "डावा हात / खांदा" } },
        { "id": "RAD_JAW", "value": "JAW_NECK", "label": { "en": "Jaw / Neck", "hi": "जबड़ा / गर्दन", "mr": "जबडा / मान" } },
        { "id": "RAD_BACK", "value": "BACK", "label": { "en": "Back between shoulder blades", "hi": "पीठ में", "mr": "पाठीत" } },
        { "id": "RAD_NONE", "value": "NONE", "label": { "en": "No, stays in chest", "hi": "नहीं, केवल सीने में", "mr": "नाही, फक्त छातीत" } }
      ]
    },
    "redFlagStatus": {
      "alertTriggered": false
    }
  }
}
```
