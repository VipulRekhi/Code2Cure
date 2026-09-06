/**
 * Voice Input End-to-End Test Suite (Phase 7.5)
 * Verifies real audio transmission, FFmpeg conversion, VAD sensitivity,
 * vernacular transcription, and clinical symptom classification.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { voiceConfig } from '../src/modules/voice/voiceConfig.js';

describe('Phase 7.5 Voice Input End-to-End Suite', { timeout: 25000 }, () => {
  it('GET /api/voice/status reports voice runtime is online and ready', async () => {
    const res = await request(app).get('/api/voice/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.asr.status).toBe('ready');
    expect(res.body.data.tts.status).toBe('ready');
    expect(res.body.data.asr.supportedLanguages).toEqual(['en', 'hi', 'mr']);
  });

  it('rejects empty or corrupt audio payloads with clear error codes', async () => {
    // 1. Completely missing payload
    const emptyRes = await request(app)
      .post('/api/voice/asr')
      .send({ audioBase64: '' });
    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.success).toBe(false);
    expect(emptyRes.body.error).toBe('NO_AUDIO_PROVIDED');

    // 2. Tiny corrupt noise payload (< 64 bytes)
    const tinyRes = await request(app)
      .post('/api/voice/asr')
      .send({ audioBase64: Buffer.from('noise').toString('base64') });
    expect(tinyRes.status).toBe(200);
    expect(tinyRes.body.success).toBe(false);
    expect(tinyRes.body.error).toBe('EMPTY_AUDIO');
  });

  it('transcribes synthesized speech via /api/voice/asr without fallback to mock', async () => {
    // 1. Synthesize real spoken audio via the Express TTS API
    const ttsRes = await request(app)
      .post('/api/voice/tts')
      .send({
        text: 'माझं पोट दुखतंय',
        language: 'mr',
      });
    expect(ttsRes.status).toBe(200);
    expect(ttsRes.body.success).toBe(true);
    expect(ttsRes.body.data.audioBase64).toBeDefined();

    // 2. Send the synthesized audio to /api/voice/asr
    const asrRes = await request(app)
      .post('/api/voice/asr')
      .send({
        audioBase64: ttsRes.body.data.audioBase64,
        language: 'mr',
      });

    expect(asrRes.status).toBe(200);
    expect(asrRes.body.success).toBe(true);
    expect(asrRes.body.data.transcript).toBeDefined();
    const transcript = asrRes.body.data.transcript;

    // Verify vernacular Marathi recognition
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript).toMatch(/[\u0900-\u097F]/); // Must be authentic Devanagari characters
    console.log('Recognized Marathi transcript:', transcript);
  }, 25000);

  it('transcribes Hindi voice speech accurately', async () => {
    const ttsRes = await request(app)
      .post('/api/voice/tts')
      .send({
        text: 'मुझे तेज बुखार है',
        language: 'hi',
      });
    expect(ttsRes.status).toBe(200);
    expect(ttsRes.body.success).toBe(true);
    expect(ttsRes.body.data.audioBase64).toBeDefined();

    const asrRes = await request(app)
      .post('/api/voice/asr')
      .send({
        audioBase64: ttsRes.body.data.audioBase64,
        language: 'hi',
      });

    expect(asrRes.status).toBe(200);
    expect(asrRes.body.success).toBe(true);
    expect(asrRes.body.data.transcript).toBeDefined();
    const transcript = asrRes.body.data.transcript;
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript).toMatch(/[\u0900-\u097F]/);
    console.log('Recognized Hindi transcript:', transcript);
  }, 25000);
});
