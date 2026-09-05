import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserTTSProvider, ttsService } from '../js/services/ttsService.js';

describe('MediKiosk TTS Service & Voice Selection Test Suite (Phase 4 Pass)', () => {
  let provider;

  beforeEach(() => {
    provider = new BrowserTTSProvider();
  });

  describe('Language-Specific Voice Selection & Prioritization (Section 12, 13)', () => {
    it('prioritizes en-IN (Indian English) over en-US or default voices', () => {
      provider.voices = [
        { name: 'Microsoft David Desktop', lang: 'en-US', default: true },
        { name: 'Microsoft Zira Desktop', lang: 'en-US', default: false },
        { name: 'Microsoft Heera - English (India)', lang: 'en-IN', default: false },
        { name: 'Microsoft Ravi - English (India)', lang: 'en-IN', default: false },
      ];

      const bestVoice = provider.getBestVoice('en');
      expect(bestVoice).toBeDefined();
      expect(bestVoice.lang).toBe('en-IN');
      expect(bestVoice.name).toContain('Heera');
    });

    it('selects native Hindi voice when available', () => {
      provider.voices = [
        { name: 'Microsoft David Desktop', lang: 'en-US' },
        { name: 'Microsoft Kalpana - Hindi (India)', lang: 'hi-IN' },
        { name: 'Microsoft Heera', lang: 'en-IN' },
      ];

      const nativeVoice = provider.getNativeVoice('hi');
      expect(nativeVoice).toBeDefined();
      expect(nativeVoice.lang).toBe('hi-IN');
      expect(nativeVoice.name).toContain('Kalpana');

      const status = provider.getVoiceStatus('hi');
      expect(status.supported).toBe(true);
      expect(status.status).toBe('natively_supported');
      expect(status.isFallback).toBe(false);
    });

    it('reports fallback when native Hindi voice is missing but fallback voice exists', () => {
      provider.voices = [
        { name: 'Microsoft David Desktop', lang: 'en-US' },
        { name: 'Microsoft Heera', lang: 'en-IN' },
      ];

      const nativeVoice = provider.getNativeVoice('hi');
      expect(nativeVoice).toBeNull();

      const bestVoice = provider.getBestVoice('hi', true);
      expect(bestVoice).toBeDefined();
      expect(bestVoice.name).toContain('Heera');

      const status = provider.getVoiceStatus('hi');
      expect(status.supported).toBe(true);
      expect(status.status).toBe('fallback');
      expect(status.isFallback).toBe(true);
    });
  });

  describe('Marathi TTS Support Honesty & Fallback Chain (Section 14, 23)', () => {
    it('selects native Marathi voice when available', () => {
      provider.voices = [
        { name: 'Microsoft David Desktop', lang: 'en-US' },
        { name: 'Microsoft Kalpana', lang: 'hi-IN' },
        { name: 'Google मराठी', lang: 'mr-IN' },
      ];

      const nativeVoice = provider.getNativeVoice('mr');
      expect(nativeVoice).toBeDefined();
      expect(nativeVoice.lang).toBe('mr-IN');

      const status = provider.getVoiceStatus('mr');
      expect(status.supported).toBe(true);
      expect(status.status).toBe('natively_supported');
      expect(status.isFallback).toBe(false);
    });

    it('identifies lack of native Marathi voice and uses fallback without falsifying support', () => {
      provider.voices = [
        { name: 'Microsoft David Desktop', lang: 'en-US', default: true },
        { name: 'Microsoft Heera', lang: 'en-IN' },
        { name: 'Microsoft Kalpana', lang: 'hi-IN' },
      ];

      // 1. Native check must be null
      const nativeVoice = provider.getNativeVoice('mr');
      expect(nativeVoice).toBeNull();

      // 2. Fallback check must resolve Devanagari Hindi or Indian English, NOT pretend it is native Marathi
      const fallbackVoice = provider.getBestVoice('mr', true);
      expect(fallbackVoice).toBeDefined();
      expect(fallbackVoice.name).toBe('Microsoft Kalpana');

      // 3. Status must honestly report 'fallback'
      const status = provider.getVoiceStatus('mr');
      expect(status.status).toBe('fallback');
      expect(status.isFallback).toBe(true);
      expect(status.message).toContain('Marathi TTS: fallback');
      expect(status.message).toContain('Host OS lacks native mr-IN voice');
    });

    it('reports unavailable when absolutely no synthesizer voices exist', () => {
      provider.voices = [];

      const status = provider.getVoiceStatus('mr');
      expect(status.supported).toBe(false);
      expect(status.status).toBe('unavailable');
    });
  });

  describe('Sentence Processing & Natural Utterance Chunking (Section 20)', () => {
    it('chunks sentences by Hindi/Marathi Purnaviram danda (।)', () => {
      const text = 'मला तीन दिवसांपासून छातीत दुखत आहे। हे दुखणे डाव्या हाताकडे पसरत आहे का?';
      const chunks = provider.processUtterances(text);

      expect(chunks.length).toBe(2);
      expect(chunks[0]).toBe('मला तीन दिवसांपासून छातीत दुखत आहे।');
      expect(chunks[1]).toBe('हे दुखणे डाव्या हाताकडे पसरत आहे का?');
    });

    it('chunks sentences by question marks and periods', () => {
      const text = 'What is your chief complaint today? Please choose from the list below.';
      const chunks = provider.processUtterances(text);

      expect(chunks.length).toBe(2);
      expect(chunks[0]).toBe('What is your chief complaint today?');
      expect(chunks[1]).toBe('Please choose from the list below.');
    });

    it('strips HTML and bracketed markup before utterance generation', () => {
      const text = '<p>How long have you had this pain? <strong>[Select duration]</strong></p>';
      const chunks = provider.processUtterances(text);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).not.toContain('<p>');
      expect(chunks[0]).not.toContain('<strong>');
      expect(chunks[0]).not.toContain('[Select duration]');
      expect(chunks[0]).toContain('How long have you had this pain?');
    });
  });

  describe('TTS Service Abstraction & Resilience (Section 18, 23)', () => {
    it('plays Marathi speech using fallback without muting audio', async () => {
      let spokenUtterance = null;
      const mockSynth = {
        getVoices: () => [
          { name: 'Microsoft Heera', lang: 'en-IN' },
        ],
        speak: vi.fn((utterance) => {
          spokenUtterance = utterance;
          if (utterance.onend) utterance.onend();
        }),
        cancel: vi.fn(),
      };
      provider.synth = mockSynth;
      provider.voices = [{ name: 'Microsoft Heera', lang: 'en-IN' }];

      const result = await provider.speak('मला छातीत दुखत आहे', 'mr');
      expect(result.success).toBe(true);
      expect(mockSynth.speak).toHaveBeenCalled();
      expect(spokenUtterance).toBeDefined();
      expect(spokenUtterance.rate).toBe(0.88); // Paced for fallback clarity
    });

    it('stops speech cleanly and clears utterance queue', () => {
      const mockSynth = {
        getVoices: () => [],
        speak: vi.fn(),
        cancel: vi.fn(),
      };
      provider.synth = mockSynth;
      provider.activeUtterances = [{ text: 'Active' }];

      provider.stop();
      expect(mockSynth.cancel).toHaveBeenCalled();
      expect(provider.activeUtterances.length).toBe(0);
    });

    it('switches TTS locale when language changes', () => {
      provider.voices = [
        { name: 'Microsoft Heera', lang: 'en-IN' },
        { name: 'Microsoft Kalpana', lang: 'hi-IN' },
      ];

      const enVoice = provider.getBestVoice('en');
      const hiVoice = provider.getBestVoice('hi');

      expect(enVoice.lang).toBe('en-IN');
      expect(hiVoice.lang).toBe('hi-IN');
    });
  });
});
