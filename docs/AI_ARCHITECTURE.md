# AI Architecture & Model Strategy — MediKiosk

**Document Version:** 3.0.0 (Phase 5 Multilingual Voice Pipeline)  
**Date:** September 2026  

---

## 1. Sovereign Open-Source AI Strategy

MediKiosk is architected around **sovereign, open-weight, self-hostable AI models**. No patient-identifiable healthcare data is transmitted to external commercial cloud APIs.

| AI Domain | Selected Open-Source Model | Hosting / Runtime Technology | Primary Clinical & System Tasks |
| :--- | :--- | :--- | :--- |
| **Speech-to-Text (ASR)** | **AI4Bharat IndicConformer** | PyTorch / Python Model Runtime (`voice_runtime/server.py`) or Mock Provider | • End-to-end vernacular speech transcription<br>• Supported: Marathi (`mr`), Hindi (`hi`), English (`en`)<br>• 16kHz mono PCM WAV capture<br>• Preserves verbatim spoken vernacular transcript |
| **Large Language Model (LLM)** | **Qwen 2.5 7B Instruct** (Alibaba Cloud / Open Weights) | vLLM / Ollama (4-bit/8-bit AWQ/GGUF) or High-Fidelity Mock Provider | • Structured clinical slot extraction<br>• Vernacular interpretation (Marathi, Hindi, English)<br>• Normalization into language-neutral clinical ontology |
| **Adaptive Clinical Reasoning** | **Deterministic QuestionEngine** (Section 11, 36) | Pure Node.js / Express Foundation | • Rule-based conditional questioning<br>• Complete immunity from LLM hallucinations<br>• Clinical protocol adherence |
| **Text-to-Speech (TTS)** | **AI4Bharat IndicF5** | PyTorch / Python Model Runtime (`voice_runtime/server.py`) or Mock Provider | • High-fidelity natural Indian language speech output<br>• 24kHz audio synthesis using matched reference voice prompts<br>• Eliminates computerized robotic speech artifacts |
| **Optical Character Recognition (OCR)** | **PaddleOCR (PP-OCRv4 / PP-Structure)** | PaddlePaddle Python API / ONNX (Phase 6) | • Layout analysis and entity extraction on medical records |

---

## 2. End-to-End Multilingual Voice Pipeline Architecture

The foundational operational rule governing MediKiosk is:

```text
IndicConformer transcribes.
Qwen extracts.
QuestionEngine decides.
IndicF5 synthesizes.
```

```text
PATIENT SPEECH
      │
      ▼ Microphone (Web Audio API / MediaRecorder)
Audio Capture (WAV / 16kHz mono PCM)
      │
      ▼ POST /api/voice/asr
Express Voice Service (backend/src/modules/voice/)
      │
      ├─► IndicConformer ASR Provider (voice_runtime/ or mockVoiceProvider)
      │
Raw Vernacular Transcript (mr / hi / en)
      │
      ▼ POST /api/clinical/sessions/:id/responses
clinicalExtractionService ──► Qwen 2.5 7B Instruct
      │
Structured Clinical Slots ({ concept, attribute, value, unit, status })
      │
      ▼
ClinicalState (Language-Neutral Session Store & Stale Fact Invalidator)
      │
      ▼
Deterministic QuestionEngine (Selects Next Question ID)
      │
Localized Question Text (i18n: mr / hi / en)
      │
      ▼ POST /api/voice/tts
Express Voice Service (backend/src/modules/voice/)
      │
      ├─► IndicF5 TTS Provider (24kHz WAV with Language Reference Voice)
      │
Synthesized Natural Speech Audio (WAV Stream / Base64)
      │
      ▼
Kiosk Speaker Playback (Audio Controller with Instant Cut-off & Echo Gate)
```

---

## 3. Strict Safety & Ethical Boundaries

1. **Information Extraction Only:**
   - Qwen is strictly an **information extractor**.
   - Qwen **MUST NOT** diagnose medical conditions, recommend treatments, prescribe medication, or determine emergency triage levels.
2. **ASR & TTS Non-Interference:**
   - IndicConformer only performs `speech -> text`. It does not normalize clinical concepts or diagnose.
   - IndicF5 only performs `text -> speech`. It does not translate or alter question content.
3. **Anti-Hallucination Safeguards:**
   - Unstated attributes are never fabricated. If a patient states "I have pain", the extractor produces `concept: 'symptom.pain', attribute: 'complaint_type', value: 'pain'` without guessing chest or severe.
4. **Negative & Unknown Distinction:**
   - Explicit denials ("नाही" / "नहीं" / "no") are captured as `ABSENT`.
   - Expressed uncertainty ("माहित नाही" / "पता नहीं" / "don't know") is captured as `UNKNOWN`.
5. **Prompt Injection Defense:**
   - Patient transcripts are enclosed within untrusted XML boundaries (`<PATIENT_INPUT>...</PATIENT_INPUT>`) and cannot override the system prompt.
6. **Ontology Validation:**
   - All extracted concepts must match `CLINICAL_CONCEPTS`. Unknown concept keys are immediately filtered out.
7. **Acoustic Feedback & Echo Gate:**
   - While TTS is playing, microphone capture is strictly disabled in the frontend voice state machine, preventing the kiosk from transcribing its own audio.

---

## 4. Voice Service & Model Runtime Interface

The AI & voice layers are cleanly modularized:

- **`backend/src/modules/voice/`**:
  - `voiceConfig.js`: Configures providers, endpoints, timeouts, and sample rates.
  - `asrService.js`: Validates incoming audio, handles short/empty audio fallbacks, routes to IndicConformer or mock.
  - `ttsService.js`: Manages audio synthesis, in-memory question caching (`questionId` + `lang`), routes to IndicF5 or mock.
  - `providers/indicConformerProvider.js`: HTTP client talking to the IndicConformer inference runtime.
  - `providers/indicF5Provider.js`: HTTP client talking to the IndicF5 inference runtime (24kHz WAV stream).
  - `providers/mockVoiceProvider.js`: Deterministic provider for CI, testing, and offline environments.
- **`voice_runtime/server.py`**:
  - Standalone, lightweight Python service providing `/asr` and `/tts` endpoints.
  - Keeps models loaded in memory on startup.
  - Automatic hardware detection: NVIDIA CUDA GPU acceleration (e.g. RTX 4050) with graceful CPU fallback.
  - Matched reference voice prompts for Marathi, Hindi, and Indian English.

---

## 5. Provenance & Clinical Integrity

- Every voice response preserves both the exact vernacular transcript (`rawResponse`, `source: 'PATIENT_VOICE'`, `inputMethod: 'VOICE'`) and the validated normalized clinical fact (`prisma.clinicalFact`).
- All facts remain linked to `sessionId`, `questionId`, and `responseId`.
- Cross-session contamination is strictly prevented through session isolation and state clearing.

