import { describe, it, expect } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MediKiosk Phase 5 Voice Pipeline API Test Suite', () => {
  describe('GET /api/voice/status', () => {
    it('returns health and configuration for IndicConformer ASR and Neural TTS', async () => {
      const res = await request(app).get('/api/voice/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.asr.provider).toBe('indicconformer');
      expect(res.body.data.asr.supportedLanguages).toEqual(['en', 'hi', 'mr']);
      expect(res.body.data.tts.provider).toBe('neural-tts');
      expect(res.body.data.tts.sampleRate).toBe(24000);
    });
  });

  describe('POST /api/voice/asr (Real Acoustic Audio ASR Transcription)', () => {
    it('transcribes real Marathi acoustic voice audio ("मला तीन दिवसांपासून उलटी होत आहे") with zero hints', { timeout: 25000 }, async () => {
      const audioPath = path.resolve(__dirname, 'fixtures/mr_vomiting_exact.wav');
      const realAudioBase64 = fs.readFileSync(audioPath).toString('base64');

      const res = await request(app)
        .post('/api/voice/asr')
        .send({
          audioBase64: realAudioBase64,
          language: 'mr',
          questionId: 'q.chief_complaint',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transcript).toBe('मला तीन दिवसांपासून उलटी होत आहे');
      expect(res.body.data.language).toBe('mr');
      expect(res.body.data.confidence).toBeGreaterThan(0.9);
      expect(res.body.data.questionId).toBe('q.chief_complaint');
    });

    it('transcribes real Hindi acoustic voice audio ("मुझे 3 दिन से सीने में दर्द है") with zero hints', { timeout: 25000 }, async () => {
      const audioPath = path.resolve(__dirname, 'fixtures/hi_chest_pain.wav');
      const realAudioBase64 = fs.readFileSync(audioPath).toString('base64');

      const res = await request(app)
        .post('/api/voice/asr')
        .send({
          audioBase64: realAudioBase64,
          language: 'hi',
          questionId: 'q.pain.location',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transcript).toContain('सीने में दर्द');
      expect(res.body.data.language).toBe('hi');
    });

    it('transcribes real English acoustic voice audio ("I have chest pain for 3 days") with zero hints', { timeout: 25000 }, async () => {
      const audioPath = path.resolve(__dirname, 'fixtures/en_chest_pain.wav');
      const realAudioBase64 = fs.readFileSync(audioPath).toString('base64');

      const res = await request(app)
        .post('/api/voice/asr')
        .send({
          audioBase64: realAudioBase64,
          language: 'en',
          questionId: 'q.pain.duration',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transcript).toContain('chest pain');
      expect(res.body.data.language).toBe('en');
    });

    it('handles empty/short audio safely with touch fallback and no manufactured facts (Section 14)', async () => {
      const res = await request(app)
        .post('/api/voice/asr')
        .send({
          audioBase64: '', // Empty audio
          language: 'mr',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.fallbackToTouch).toBe(true);
      expect(res.body.data.transcript).toBe('');
    });
  });

  describe('POST /api/voice/tts (IndicF5 Natural Speech Synthesis)', () => {
    it('synthesizes Marathi question text returning 24kHz WAV audio stream (Section 19, 29)', { timeout: 25000 }, async () => {
      const questionText = 'तुम्हाला ही वेदना किती दिवसांपासून आहे?';

      const res = await request(app)
        .post('/api/voice/tts')
        .send({
          text: questionText,
          language: 'mr',
          questionId: 'q.pain.duration',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.audioBase64).toBeDefined();
      expect(res.body.data.sampleRate).toBe(24000);
      expect(res.body.data.format).toBe('wav');

      // Verify returned base64 decodes to valid WAV buffer with 'RIFF' and 'WAVE'
      const wavBuffer = Buffer.from(res.body.data.audioBase64, 'base64');
      expect(wavBuffer.toString('utf8', 0, 4)).toBe('RIFF');
      expect(wavBuffer.toString('utf8', 8, 12)).toBe('WAVE');
    });

    it('caches repeated static questions for low latency kiosk playback (Section 31)', async () => {
      const questionText = 'तुम्हाला ही वेदना किती दिवसांपासून आहे?';

      // First call synthesizes
      await request(app).post('/api/voice/tts').send({
        text: questionText,
        language: 'mr',
        questionId: 'q.pain.duration',
      });

      // Second call retrieves from in-memory cache
      const res2 = await request(app).post('/api/voice/tts').send({
        text: questionText,
        language: 'mr',
        questionId: 'q.pain.duration',
      });

      expect(res2.status).toBe(200);
      expect(res2.body.data.cached).toBe(true);
      expect(res2.body.data.latency).toBeLessThan(10);
    });

    it('supports direct audio streaming via Accept header (Section 30)', async () => {
      const res = await request(app)
        .post('/api/voice/tts')
        .set('Accept', 'audio/wav')
        .send({
          text: 'हे दुखणे नेमके कुठे आहे?',
          language: 'mr',
          questionId: 'q.pain.location',
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('audio/wav');
      expect(res.body.length).toBeGreaterThan(44); // Greater than WAV header
    });

    it('rejects empty text safely without crashing (Section 33)', async () => {
      const res = await request(app)
        .post('/api/voice/tts')
        .send({
          text: '',
          language: 'mr',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('MISSING_TEXT');
    });
  });

  describe('End-to-End Voice Regression: IndicConformer -> Qwen -> ClinicalState -> Summary (Section 52, 71)', () => {
    it('executes full voice flow for vomiting without CHEST_PAIN or undefined days', async () => {
      // 1. Initialize session
      const sessionRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'mr', opdMode: 'GENERAL' });
      const sessionId = sessionRes.body.data.sessionId;

      // 2. Transcribe voice utterance via ASR with real acoustic audio
      const audioPath = path.resolve(__dirname, 'fixtures/mr_vomiting.wav');
      const realAudioBase64 = fs.readFileSync(audioPath).toString('base64');

      const asrRes = await request(app)
        .post('/api/voice/asr')
        .send({
          audioBase64: realAudioBase64,
          language: 'mr',
          questionId: 'q.chief_complaint',
          sessionId,
        });

      expect(asrRes.body.data.transcript).toBe('मला तीन दिवसांपासून रोज उलटी होत आहे');

      // 3. Submit transcript to Qwen clinical extraction
      const recordRes = await request(app)
        .post(`/api/clinical/sessions/${sessionId}/responses`)
        .send({
          questionId: 'q.chief_complaint',
          rawResponse: asrRes.body.data.transcript,
          inputMethod: 'VOICE',
          language: 'mr',
        });

      expect(recordRes.status).toBe(200);

      // 4. Retrieve final summary
      const summaryRes = await request(app).get(`/api/clinical/sessions/${sessionId}/summary`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.primaryConcern).toBe('stomach');
      expect(summaryRes.body.data.duration).toEqual({ value: 3, unit: 'days' });
      expect(summaryRes.body.data.location).toBeNull(); // No chest pain!
    });

    it('Phase 5.1 Acceptance Test: Knee Pain ("माझा गुडघा दुखतोय") produces knee pain without vomiting or manufactured duration', async () => {
      // 1. Initialize session
      const sessionRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'mr', opdMode: 'GENERAL' });
      const sessionId = sessionRes.body.data.sessionId;

      // 2. Transcribe knee pain voice utterance with real acoustic audio & request correlation (ZERO HINTS)
      const clientReqId = 'req_knee_12345';
      const audioPath = path.resolve(__dirname, 'fixtures/mr_knee_pain.wav');
      const realKneeAudioBase64 = fs.readFileSync(audioPath).toString('base64');

      const asrRes = await request(app)
        .post('/api/voice/asr')
        .send({
          audioBase64: realKneeAudioBase64,
          language: 'mr',
          questionId: 'q.chief_complaint',
          sessionId,
          requestId: clientReqId,
        });

      expect(asrRes.body.data.transcript).toBe('माझा गुडघा दुखतोय');
      expect(asrRes.body.data.requestId).toBe(clientReqId);

      // 3. Submit transcript to clinical extraction
      const recordRes = await request(app)
        .post(`/api/clinical/sessions/${sessionId}/responses`)
        .send({
          questionId: 'q.chief_complaint',
          rawResponse: asrRes.body.data.transcript,
          inputMethod: 'VOICE',
          language: 'mr',
        });

      expect(recordRes.status).toBe(200);
      expect(recordRes.body.data.recorded.normalizedValue).toBe('pain');

      // 4. Next question should be clinical follow-up (duration or dynamic mechanism)
      expect(['duration', 'mechanism']).toContain(recordRes.body.data.next.question.attribute);

      // 5. Retrieve final summary
      const summaryRes = await request(app).get(`/api/clinical/sessions/${sessionId}/summary`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.primaryConcern).toBe('pain');
      expect(summaryRes.body.data.location).toBe('knee');
      // Must NOT manufacture vomiting or 3-day duration
      expect(summaryRes.body.data.duration).toBeNull();
      const hasVomiting = summaryRes.body.data.symptoms.some((s) => s.concept.includes('vomit'));
      expect(hasVomiting).toBe(false);
    });

    it('Phase 5.1 Cross-Session Test: Session A (Vomiting) -> Session B (Knee Pain) has zero leakage', async () => {
      // Session A: Vomiting
      const sessionARes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'mr', opdMode: 'GENERAL' });
      const sessionAId = sessionARes.body.data.sessionId;

      await request(app)
        .post(`/api/clinical/sessions/${sessionAId}/responses`)
        .send({
          questionId: 'q.chief_complaint',
          rawResponse: 'मला तीन दिवसांपासून रोज उलटी होत आहे',
          inputMethod: 'VOICE',
          language: 'mr',
        });

      // Session B: Knee Pain
      const sessionBRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'mr', opdMode: 'GENERAL' });
      const sessionBId = sessionBRes.body.data.sessionId;

      await request(app)
        .post(`/api/clinical/sessions/${sessionBId}/responses`)
        .send({
          questionId: 'q.chief_complaint',
          rawResponse: 'माझा गुडघा दुखतोय',
          inputMethod: 'VOICE',
          language: 'mr',
        });

      const summaryB = await request(app).get(`/api/clinical/sessions/${sessionBId}/summary`);
      expect(summaryB.body.data.primaryConcern).toBe('pain');
      expect(summaryB.body.data.location).toBe('knee');
      expect(summaryB.body.data.duration).toBeNull();
      const vomitInB = summaryB.body.data.symptoms.some((s) => s.concept.includes('vomit'));
      expect(vomitInB).toBe(false);
    });
  });
});
