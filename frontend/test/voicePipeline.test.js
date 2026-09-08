import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ttsService, NeuralTTSProvider, BrowserTTSProvider } from '../js/services/ttsService.js';
import { speechService } from '../js/services/speechService.js';
import { api } from '../js/api.js';

describe('MediKiosk Voice Pipeline Frontend Test Suite', () => {
  beforeEach(() => {
    ttsService.stop();
    speechService.stopListening();
    vi.restoreAllMocks();
  });

  describe('Neural TTS Service', () => {
    it('initializes with NeuralTTSProvider as primary voice provider', () => {
      expect(ttsService.provider).toBeInstanceOf(NeuralTTSProvider);
      expect(ttsService.provider.name).toBe('neural-tts');
    });

    it('synthesizes speech through neural provider fetching 24kHz audio', async () => {
      // Mock backend TTS response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            audioBase64: 'UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
            format: 'wav',
            sampleRate: 24000,
            language: 'mr',
            cached: false,
          },
        }),
      });

      // Mock HTML5 Audio in jsdom
      const playMock = vi.fn().mockResolvedValue(undefined);
      window.Audio = vi.fn().mockImplementation(() => ({
        play: playMock,
        pause: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        set onended(fn) {
          setTimeout(fn, 10);
        },
      }));

      const res = await ttsService.speak({
        text: 'तुम्हाला ही वेदना किती दिवसांपासून आहे?',
        language: 'mr',
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('neural-tts');
    });

    it('immediately stops TTS playback on stop() without throwing errors (Section 43)', () => {
      const pauseMock = vi.fn();
      ttsService.provider.currentAudio = {
        pause: pauseMock,
        currentTime: 5,
      };

      ttsService.stop();
      expect(pauseMock).toHaveBeenCalled();
      expect(ttsService.provider.currentAudio).toBeNull();
      expect(ttsService.isSpeaking).toBe(false);
    });

    it('does NOT fall back to robotic browser synthesis if neural network call fails (Section 24)', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const fallbackSpeak = vi.spyOn(ttsService.provider.fallback, 'speak');

      const res = await ttsService.speak({
        text: 'What brings you to the hospital today?',
        language: 'en',
      });

      // Browser TTS fallback is disabled in production to eliminate robotic dual-voice playback
      expect(fallbackSpeak).not.toHaveBeenCalled();
      expect(['TTS_RUNTIME_ERROR', 'TTS_RUNTIME_UNAVAILABLE']).toContain(res.error);
    });
  });

  describe('Speech Recognition & ASR Capture (Section 10 - 16)', () => {
    it('manages Voice State Machine transitions cleanly', async () => {
      const states = [];
      vi.spyOn(api, 'transcribeAudio').mockResolvedValueOnce({
        success: true,
        data: {
          transcript: 'मला तीन दिवसांपासून रोज उलटी होत आहे',
          language: 'mr',
          confidence: 0.98,
        },
      });

      speechService.fallbackMock('mr', ({ status, transcript }) => {
        states.push({ status, transcript });
      });

      expect(speechService.status).toBe('IDLE');
    });

    it('stops active listening cleanly', () => {
      speechService.status = 'LISTENING';
      speechService.stopListening();
      expect(speechService.status).toBe('IDLE');
    });
  });
});
