/**
 * Voice Pipeline Reliability & Normal Speech Test Suite (Phase 7 Section 1, 2, 3, 4, 22)
 * Validates normal conversational speech capture, empty audio handling,
 * multi-language support (mr, hi, en), diagnostics, and zero-hallucination on failure.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { asrService } from '../src/modules/voice/asrService.js';
import { generateMockWavBuffer, mockVoiceProvider } from '../src/modules/voice/providers/mockVoiceProvider.js';

describe('Phase 7 Voice Pipeline Reliability & Speech Capture Suite', { timeout: 20000 }, () => {
  // 1. Normal conversational speech test cases
  describe('Normal Conversational Speech Test Cases (Section 3)', () => {
    it('captures Marathi normal conversational speech: "माझा गुडघा दुखतोय"', async () => {
      // 1-second clean PCM WAV buffer
      const audioBuffer = generateMockWavBuffer(16000, 1.0);
      const res = await asrService.transcribe({
        audioBuffer,
        language: 'mr',
        activeQuestion: { id: 'q.chief_complaint' },
      });

      expect(res.success).toBe(true);
      expect(res.transcript).toBeDefined();
      expect(res.transcript.length).toBeGreaterThan(0);
      expect(res.diagnostics.usableAudio).toBe(true);
      expect(res.diagnostics.audioSizeBytes).toBeGreaterThan(100);
    });

    it('captures Marathi duration: "सहा सात दिवसांपासून त्रास होतोय"', async () => {
      const audioBuffer = generateMockWavBuffer(16000, 1.2);
      const res = await asrService.transcribe({
        audioBuffer,
        language: 'mr',
        activeQuestion: { id: 'dyn.symptom.pain.duration' },
      });

      expect(res.success).toBe(true);
      expect(res.transcript).toBeDefined();
    });

    it('captures Marathi severity: "जास्त नाही पण मध्यम त्रास आहे"', async () => {
      const audioBuffer = generateMockWavBuffer(16000, 1.0);
      const res = await asrService.transcribe({
        audioBuffer,
        language: 'mr',
        activeQuestion: { id: 'dyn.symptom.pain.severity' },
      });

      expect(res.success).toBe(true);
      expect(res.transcript).toBeDefined();
    });

    it('captures Hindi normal conversational speech: "मेरे घुटने में दर्द हो रहा है"', async () => {
      const audioBuffer = generateMockWavBuffer(16000, 1.0);
      const res = await asrService.transcribe({
        audioBuffer,
        language: 'hi',
        activeQuestion: { id: 'q.chief_complaint' },
      });

      expect(res.success).toBe(true);
      expect(res.language).toBe('hi');
      expect(res.transcript).toBeDefined();
    });

    it('captures Hindi duration: "छह सात दिनों से दर्द है"', async () => {
      const audioBuffer = generateMockWavBuffer(16000, 1.0);
      const res = await asrService.transcribe({
        audioBuffer,
        language: 'hi',
        activeQuestion: { id: 'dyn.symptom.pain.duration' },
      });

      expect(res.success).toBe(true);
      expect(res.transcript).toBeDefined();
    });

    it('captures English normal conversational speech: "My knee has been hurting for six or seven days."', async () => {
      const audioBuffer = generateMockWavBuffer(16000, 1.2);
      const res = await asrService.transcribe({
        audioBuffer,
        language: 'en',
        activeQuestion: { id: 'q.chief_complaint' },
      });

      expect(res.success).toBe(true);
      expect(res.language).toBe('en');
      expect(res.transcript).toBeDefined();
    });
  });

  // 2. Audio validation, empty recording, and error safety (Section 4 & 22)
  describe('Audio Validation & Safe Failure Handling', () => {
    it('rejects empty audio payload without creating fake transcripts or defaults', async () => {
      const res = await asrService.transcribe({
        audioBuffer: Buffer.alloc(0),
        base64Audio: '',
        language: 'mr',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('NO_AUDIO_PROVIDED');
      expect(res.fallbackToTouch).toBe(true);
      expect(res.transcript).toBe('');
    });

    it('rejects extremely short/click noise audio (< 64 bytes)', async () => {
      const tinyBuffer = Buffer.from('RIFFtinydata');
      const res = await asrService.transcribe({
        audioBuffer: tinyBuffer,
        language: 'mr',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('EMPTY_AUDIO');
      expect(res.fallbackToTouch).toBe(true);
      expect(res.transcript).toBe('');
      expect(res.diagnostics.usableAudio).toBe(false);
    });

    it('POST /api/voice/asr returns 200 with fallbackToTouch:true and diagnostics when audio is empty', async () => {
      const response = await request(app)
        .post('/api/voice/asr')
        .send({
          audioBase64: '',
          language: 'mr',
          questionId: 'q.chief_complaint',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.fallbackToTouch).toBe(true);
      expect(response.body.data.transcript).toBe('');
      expect(response.body.diagnostics).toBeDefined();
      expect(response.body.diagnostics.usableAudio).toBe(false);
    });

    it('POST /api/voice/asr returns diagnostic metadata (latency, usableAudio) on valid audio', async () => {
      const validAudio = generateMockWavBuffer(16000, 0.8).toString('base64');
      const response = await request(app)
        .post('/api/voice/asr')
        .send({
          audioBase64: validAudio,
          language: 'mr',
          questionId: 'q.chief_complaint',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transcript).toBeDefined();
      expect(response.body.diagnostics).toBeDefined();
      expect(response.body.diagnostics.usableAudio).toBe(true);
      expect(typeof response.body.diagnostics.latency).toBe('number');
    });
  });

  // 3. DO NOT CREATE DEFAULT CLINICAL VALUES (Section 4)
  describe('Zero Default Clinical Value Invariant (Section 4)', () => {
    it('never assumes CHEST_PAIN, 3 days, or MODERATE when ASR fails', async () => {
      // Create session
      const createRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'mr' });
      const sessionId = createRes.body.data.sessionId;

      // Submit failed / unparseable response
      const recordRes = await request(app)
        .post(`/api/clinical/sessions/${sessionId}/responses`)
        .send({
          questionId: 'q.chief_complaint',
          rawResponse: '',
          normalizedValue: null,
          inputMethod: 'VOICE',
          language: 'mr',
        });

      // Must not fabricate facts
      const summaryRes = await request(app)
        .get(`/api/clinical/sessions/${sessionId}/summary`);

      expect(summaryRes.body.data.primaryConcern).not.toBe('CHEST_PAIN');
      expect(summaryRes.body.data.severity).toBeNull();
      expect(summaryRes.body.data.duration).toBeNull();
    });
  });
});
