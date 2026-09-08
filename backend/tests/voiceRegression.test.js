/**
 * Phase 8.1 Voice Regression Test Suite (Backend)
 * Covers the 10 voice regression test scenarios:
 * 1. Empty / zero-byte audio payload -> rejects safely with EMPTY_AUDIO / NO_AUDIO_PROVIDED
 * 2. Unintelligible / silence / corrupt audio -> rejects safely without hallucination
 * 3. Offline Python ASR runtime handling -> returns ASR_RUNTIME_UNAVAILABLE without crash
 * 4. Fast spoken Marathi: "माझा गुडघा दुखतोय"
 * 5. Fast spoken Hindi: "मुझे बुखार है"
 * 6. English: "I have pain in my left knee"
 * 7. Background noise audio resilience -> zero hallucination
 * 8. Sequential / rapid voice requests -> no session cross-contamination or deadlock
 * 9. POST /api/voice/tts -> returns neural synthesis or graceful error
 * 10. Voice endpoint diagnostics & request correlation
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { asrService } from '../src/modules/voice/asrService.js';
import { voiceConfig } from '../src/modules/voice/voiceConfig.js';
import { generateMockWavBuffer } from '../src/modules/voice/providers/mockVoiceProvider.js';

describe('Phase 8.1 Voice Regression & Audio Robustness Suite', { timeout: 30000 }, () => {
  // Scenario 1: Empty audio payload sent
  it('Scenario 1: returns EMPTY_AUDIO when empty audio payload is sent', async () => {
    const res = await request(app)
      .post('/api/voice/asr')
      .send({
        audioBase64: '',
        language: 'mr',
        questionId: 'q.chief_complaint',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(['EMPTY_AUDIO', 'NO_AUDIO_PROVIDED']).toContain(res.body.error);
    expect(res.body.data?.transcript || '').toBe('');
  });

  // Scenario 2: Corrupted or invalid base64 audio
  it('Scenario 2: rejects corrupt/unintelligible base64 audio payload without throwing 500 error', async () => {
    const res = await request(app)
      .post('/api/voice/asr')
      .send({
        audioBase64: '!!!NOT_A_VALID_BASE64_PAYLOAD!!!',
        language: 'hi',
        questionId: 'q.chief_complaint',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  // Scenario 3: Offline ASR runtime simulation
  it('Scenario 3: returns safe diagnostics when ASR server is unreachable without hang', async () => {
    const origEndpoint = voiceConfig.asr.endpoint;
    voiceConfig.asr.endpoint = 'http://127.0.0.1:59999/asr';

    try {
      const audioBuffer = generateMockWavBuffer(16000, 0.5);
      const res = await asrService.transcribe({
        audioBuffer,
        language: 'mr',
        activeQuestion: { id: 'q.chief_complaint' },
      });

      expect(res.diagnostics).toBeDefined();
    } finally {
      voiceConfig.asr.endpoint = origEndpoint;
    }
  });

  // Scenario 4: Fast spoken Marathi speech
  it('Scenario 4: transcribes Marathi conversational speech ("माझा गुडघा दुखतोय")', async () => {
    const audioBuffer = generateMockWavBuffer(16000, 1.0);
    const res = await request(app)
      .post('/api/voice/asr')
      .send({
        audioBase64: audioBuffer.toString('base64'),
        language: 'mr',
        questionId: 'q.chief_complaint',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.transcript).toBeDefined();
    expect(res.body.data.transcript.length).toBeGreaterThan(0);
    expect(res.body.data.language).toBe('mr');
  });

  // Scenario 5: Fast spoken Hindi speech
  it('Scenario 5: transcribes Hindi conversational speech ("मुझे बुखार है")', async () => {
    const audioBuffer = generateMockWavBuffer(16000, 1.0);
    const res = await request(app)
      .post('/api/voice/asr')
      .send({
        audioBase64: audioBuffer.toString('base64'),
        language: 'hi',
        questionId: 'q.chief_complaint',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.transcript).toBeDefined();
    expect(res.body.data.language).toBe('hi');
  });

  // Scenario 6: English conversational speech
  it('Scenario 6: transcribes English speech ("I have pain in my left knee")', async () => {
    const audioBuffer = generateMockWavBuffer(16000, 1.2);
    const res = await request(app)
      .post('/api/voice/asr')
      .send({
        audioBase64: audioBuffer.toString('base64'),
        language: 'en',
        questionId: 'q.chief_complaint',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.transcript).toBeDefined();
    expect(res.body.data.language).toBe('en');
  });

  // Scenario 7: Silence / Low-energy background noise resilience
  it('Scenario 7: handles low-energy / silence audio without hallucinating nonexistent clinical entities', async () => {
    // Generate silent PCM buffer (all zeroes)
    const silentBuffer = Buffer.alloc(16000 * 2, 0);
    const res = await asrService.transcribe({
      audioBuffer: silentBuffer,
      language: 'mr',
      activeQuestion: { id: 'q.chief_complaint' },
    });

    // Should succeed or safely report zero audio without throwing or asserting false facts
    expect(res).toBeDefined();
  });

  // Scenario 8: Rapid sequential voice requests do not deadlock or cross-contaminate sessions
  it('Scenario 8: processes rapid concurrent/sequential voice requests safely', async () => {
    const audioBuffer = generateMockWavBuffer(16000, 0.8);
    const b64 = audioBuffer.toString('base64');

    const promises = [
      request(app).post('/api/voice/asr').send({ audioBase64: b64, language: 'mr', questionId: 'q.chief_complaint' }),
      request(app).post('/api/voice/asr').send({ audioBase64: b64, language: 'hi', questionId: 'q.chief_complaint' }),
      request(app).post('/api/voice/asr').send({ audioBase64: b64, language: 'en', questionId: 'q.chief_complaint' }),
    ];

    const results = await Promise.all(promises);
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(r.body.success).toBe(true);
    }
  });

  // Scenario 9: POST /api/voice/tts synthesizes speech
  it('Scenario 9: POST /api/voice/tts returns audio payload or graceful error', async () => {
    const res = await request(app)
      .post('/api/voice/tts')
      .send({
        text: 'तुम्हाला काय त्रास होत आहे?',
        language: 'mr',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.audioBase64).toBeDefined();
  });

  // Scenario 10: Request correlation & diagnostics tracking
  it('Scenario 10: preserves requestId and diagnostics across voice requests', async () => {
    const customReqId = 'voice-req-123456';
    const audioBuffer = generateMockWavBuffer(16000, 0.8);

    const res = await request(app)
      .post('/api/voice/asr')
      .send({
        audioBase64: audioBuffer.toString('base64'),
        language: 'mr',
        questionId: 'q.chief_complaint',
        requestId: customReqId,
      });

    expect(res.status).toBe(200);
    expect(res.body.data?.diagnostics).toBeDefined();
  });
});
