# Security, Privacy & Consent Architecture — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Date:** September 2026  

---

## 1. Governance & Regulatory Framework

MediKiosk is engineered to comply with Indian data protection legislation and health data standards:
- **Digital Personal Data Protection Act (DPDP Act 2023):** Principles of purpose limitation, data minimization, explicit consent, verifiable parental consent for minors, and right to grievance redressal.
- **Ayushman Bharat Digital Mission (ABDM) Health Data Management Policy (HDMP):** Electronic consent architecture, non-custodial health information exchange, and decentralized identity linking.

> [!WARNING]
> **Legal Disclaimer:**  
> While MediKiosk implements robust technical controls aligned with DPDP 2023 and ABDM guidelines, software architecture alone does not constitute certified legal compliance. Full institutional deployment requires formal legal review and Data Protection Officer (DPO) sign-off.

---

## 2. Authentication & Role-Based Access Control (RBAC)

MediKiosk defines four distinct roles with strictly isolated operational capabilities:

| Role | Auth Mechanism | Session Lifetime | Permitted Operations |
| :--- | :--- | :--- | :--- |
| `PATIENT_KIOSK_SESSION` | Ephemeral Kiosk Session Token (JWT) | 20 minutes (or 60s idle) | Answering active questionnaire, uploading documents, listening to audio prompts. No access to other patient records. |
| `TRIAGE_STAFF` | Hardware PIN / RFID Badge + JWT | 8-hour shift token | Viewing OPD queue, receiving real-time red-flag alerts, triaging walk-in patients, overriding kiosk locks. |
| `DOCTOR` | Hospital Staff Credentials (MFA + JWT) | 8-hour shift token | Inspecting patient histories, reviewing timeline & OCR bounding boxes, verifying/editing clinical draft, signing clinical records. |
| `SYSTEM_ADMIN` | Secure MFA + SSH/Admin Portal | 1-hour session token | Managing kiosk booths, configuring question trees, reviewing audit logs, database maintenance. No direct PHI snooping. |

---

## 3. Data Protection & Cryptographic Standards

### 3.1 Encryption in Transit
- Mandatory **TLS 1.3** across all public and intranet network endpoints (HTTPS, WSS).
- Legacy SSLv3, TLS 1.0, and TLS 1.1 are explicitly disabled at reverse proxy and application level.
- Strict Transport Security (HSTS) headers enforced.

### 3.2 Encryption at Rest
- **Database:** PostgreSQL volume encrypted using **AES-256-XTS** at OS/filesystem level.
- **Document & Audio Storage:** Uploaded scans and voice clips stored with **AES-256-GCM** encryption. Encryption keys managed via environment variables and external KMS in production.
- **Field-Level Encryption:** Highly sensitive demographic identifiers (Aadhaar / ABHA token hash) are hashed using salted Argon2id / HMAC-SHA256.

---

## 4. Kiosk Ephemeral Session & Privacy Hygiene

Public hospital kiosks present distinct privacy challenges—subsequent patients must never access previous patient data:
1. **Automated Inactivity Timeout:** If no touch or voice input is detected for 60 seconds, an audio-visual 15-second countdown warning is triggered. Upon expiry, the session terminates immediately.
2. **Zero Client-Side PHI Persistence:** The Kiosk React SPA stores all state in ephemeral React memory (Context/Zustand); `localStorage` and `sessionStorage` are strictly prohibited for storing patient clinical data.
3. **Frontend Memory Purging:** On session end, all audio buffers, uploaded image canvases, and state objects are overwritten and garbage collected.
4. **Session Token Invalidation:** Express backend immediately blacklists the session JWT upon completion or timeout.

---

## 5. File Upload Sanitization & Security

```
[ Uploaded File (Image/PDF) ]
              ↓
[ 1. Size Limit Gate ] (Max 15MB per file, Max 5 files per session)
              ↓
[ 2. Magic Bytes Inspection ] (Verify true MIME type: JPEG `FF D8 FF`, PNG `89 50 4E`, PDF `%PDF`)
              ↓
[ 3. Extension & Name Sanitization ] (Replace original filename with random UUIDv4)
              ↓
[ 4. ClamAV / Malware Scanner Integration ] (Check for embedded scripts or malformed PDF exploits)
              ↓
[ 5. Secure Encrypted File Storage ] (Stored outside web root in dedicated protected directory)
```

---

## 6. Audit Logging & Zero-PHI Log Sinks

To prevent accidental data leakage in observability systems (Datadog, Grafana, CloudWatch):
1. **Zero PHI in Logs:** Standard application logs (Winston / Pino) automatically scrub patient names, phone numbers, addresses, and clinical narratives using regex filters before outputting.
2. **Tamper-Evident Audit Trail:** Dedicated `AuditLog` database table records:
   - Patient consent capture timestamp and signature hash.
   - Every file access or download event.
   - Doctor verification and edits.
   - Red-flag rule triggers and staff acknowledgments.

---

## 7. Secrets Management & Hygiene Rules

- **Zero Secrets in Codebase:** No passwords, JWT secrets, database connection strings, or API tokens permitted in Git repositories.
- **Template Configuration:** `.env.example` provides documentation and mock placeholders for all necessary environment variables.
- **CI/CD Secret Scanning:** Automated Git pre-commit hooks and GitHub Actions workflows run Gitleaks to block accidental commits of credential artifacts.
