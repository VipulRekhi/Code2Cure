/**
 * Speech Recognition Service Abstraction (Section 20 & 40)
 * Manages the Voice State Machine:
 * IDLE -> LISTENING -> PROCESSING -> RECOGNIZED -> CONFIRMATION
 * Prepares the boundary for Phase 5 (AI4Bharat IndicConformer).
 */

import { MOCK_VOICE_TRANSCRIPTS } from '../mock/mockResponses.js';

class SpeechService {
  constructor() {
    this.recognition = null;
    this.status = 'IDLE';
    this.timer = null;
    this.initBrowserSpeech();
  }

  initBrowserSpeech() {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
  }

  startListening(lang = 'mr', onStateChange) {
    this.status = 'LISTENING';
    onStateChange({ status: this.status });

    // 1. If Browser SpeechRecognition is supported, attempt live recognition
    if (this.recognition) {
      try {
        if (lang === 'mr') this.recognition.lang = 'mr-IN';
        else if (lang === 'hi') this.recognition.lang = 'hi-IN';
        else this.recognition.lang = 'en-IN';

        this.recognition.onresult = (event) => {
          this.status = 'PROCESSING';
          onStateChange({ status: this.status });

          const transcript = event.results[0][0].transcript;
          setTimeout(() => {
            this.status = 'RECOGNIZED';
            onStateChange({ status: this.status, transcript });
          }, 600);
        };

        this.recognition.onerror = (event) => {
          console.warn('[Speech] Browser speech recognition error:', event.error);
          this.fallbackMock(lang, onStateChange);
        };

        this.recognition.start();

        // Safety timeout in case user stays quiet
        this.timer = setTimeout(() => {
          if (this.status === 'LISTENING') {
            try { this.recognition.stop(); } catch (e) {}
            this.fallbackMock(lang, onStateChange);
          }
        }, 5000);

        return;
      } catch (err) {
        console.warn('[Speech] Recognition start failed, using fallback:', err);
      }
    }

    // 2. Fallback: Simulated recognition with realistic delay
    this.fallbackMock(lang, onStateChange);
  }

  fallbackMock(lang, onStateChange) {
    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      this.status = 'PROCESSING';
      onStateChange({ status: this.status });

      setTimeout(() => {
        this.status = 'RECOGNIZED';
        const transcript = MOCK_VOICE_TRANSCRIPTS[lang] || MOCK_VOICE_TRANSCRIPTS.en;
        onStateChange({ status: this.status, transcript });
      }, 1000);
    }, 2500);
  }

  stopListening() {
    if (this.timer) clearTimeout(this.timer);
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.status = 'IDLE';
  }
}

export const speechService = new SpeechService();
