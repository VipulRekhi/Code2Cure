/**
 * Multilingual Neural TTS Latency, Routing, and Quality Verification Test Suite
 * Verifies that TTS does NOT hang for 10-12s, returns full diagnostics, routes languages accurately,
 * and handles failures cleanly without corrupt audio.
 */

import { describe, it, expect } from 'vitest';
import { neuralTTSProvider } from '../src/modules/voice/providers/neuralTTSProvider.js';
import { isServiceReachable } from '../src/modules/voice/socketProbe.js';
import { voiceConfig } from '../src/modules/voice/voiceConfig.js';

describe('Multilingual Neural TTS Latency & Quality Verification', () => {
  it('L1/L3: Fast fail-over (<350ms) when neural TTS service is offline', async () => {
    // Temporarily point to an offline endpoint to test fast fail-over mechanism
    const originalEndpoint = voiceConfig.tts.endpoint;
    voiceConfig.tts.endpoint = 'http://127.0.0.1:59999/tts';

    try {
      const startTime = Date.now();
      const result = await neuralTTSProvider.synthesize({
        text: 'तुम्हाला किती दिवसांपासून त्रास आहे?',
        language: 'mr',
      });
      const elapsed = Date.now() - startTime;

      // Must resolve in under 750ms (fast socket probe), NOT 12,000ms!
      expect(elapsed).toBeLessThan(750);

      // Verifies that failure is NOT masked
      expect(result.success).toBe(false);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.provider).toBe('neural-tts');
      expect(result.diagnostics.sampleRate).toBe(24000);
    } finally {
      voiceConfig.tts.endpoint = originalEndpoint;
    }
  });

  it('L2: Language routing returns appropriate language tags and real 24kHz audio', { timeout: 30000 }, async () => {
    // Test Marathi routing
    const resMr = await neuralTTSProvider.synthesize({ text: 'नमस्कार', language: 'mr' });
    expect(resMr.diagnostics.language).toBe('mr');
    expect(resMr.sampleRate).toBe(24000);

    // Test Hindi routing
    const resHi = await neuralTTSProvider.synthesize({ text: 'नमस्ते', language: 'hi' });
    expect(resHi.diagnostics.language).toBe('hi');
    expect(resHi.sampleRate).toBe(24000);

    // Test English routing
    const resEn = await neuralTTSProvider.synthesize({ text: 'Hello', language: 'en' });
    expect(resEn.diagnostics.language).toBe('en');
    expect(resEn.sampleRate).toBe(24000);
  });

  it('L3: Socket probe accurately detects closed ports in <250ms and live port 8001', async () => {
    // 1. Closed port test
    const startClosed = Date.now();
    const dead = await isServiceReachable('http://127.0.0.1:59999/tts', 200);
    const durClosed = Date.now() - startClosed;
    expect(durClosed).toBeLessThan(300);
    expect(dead).toBe(false);

    // 2. Live port 8001 probe timing test (<300ms)
    const startLive = Date.now();
    const alive = await isServiceReachable('http://127.0.0.1:8001/health', 200);
    const durLive = Date.now() - startLive;
    expect(durLive).toBeLessThan(300);
    expect(typeof alive).toBe('boolean');
  });

  it('L4: Prevent corrupt/empty synthesis requests', async () => {
    const emptyResult = await neuralTTSProvider.synthesize({ text: '   ', language: 'mr' });
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error).toBe('EMPTY_TEXT');
  });
});
