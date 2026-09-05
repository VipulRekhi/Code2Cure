/**
 * Speech Recognition Service Abstraction (Phase 5.1 Real-Time)
 * Strictly response-driven, request-correlated, and dynamic.
 * Zero hardcoded fallback transcripts.
 */

import { api } from '../api.js';

class SpeechService {
  constructor() {
    this.recognition = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.status = 'IDLE';
    this.timer = null;
    this.activeRequestId = null;
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

  /**
   * Primary entry point for speech listening.
   */
  async startListening(lang = 'mr', onStateChange, context = {}) {
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`;
    this.activeRequestId = requestId;
    this.status = 'LISTENING';

    onStateChange({
      status: this.status,
      requestId,
      transcript: null,
    });

    // 1. Primary: Real Microphone Capture via getUserMedia & Backend ASR
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        this.audioChunks = [];

        // Detect supported MIME type
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        }

        this.mediaRecorder = new MediaRecorder(stream, { mimeType });

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };

        let browserTranscript = '';
        if (this.recognition) {
          try {
            if (lang === 'mr') this.recognition.lang = 'mr-IN';
            else if (lang === 'hi') this.recognition.lang = 'hi-IN';
            else this.recognition.lang = 'en-IN';

            this.recognition.onresult = (e) => {
              const t = e.results[0]?.[0]?.transcript;
              if (t) browserTranscript = t.trim();
            };
            this.recognition.onerror = () => {};
            this.recognition.start();
          } catch (e) {
            // Already started or unsupported in current tab context
          }
        }

        this.mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          if (this.recognition) {
            try {
              this.recognition.stop();
            } catch (e) {}
          }

          if (this.activeRequestId !== requestId) {
            console.warn('[Speech] Discarding recording for stale request:', requestId);
            return;
          }

          this.status = 'PROCESSING';
          onStateChange({ status: this.status, requestId });

          const blob = new Blob(this.audioChunks, { type: mimeType });
          const reader = new FileReader();

          reader.onloadend = async () => {
            if (this.activeRequestId !== requestId) {
              console.warn('[Speech] Discarding base64 conversion for stale request:', requestId);
              return;
            }

            const base64Audio = reader.result ? reader.result.split(',')[1] || '' : '';

            try {
              const res = await api.transcribeAudio({
                audioBase64: base64Audio,
                language: lang,
                questionId: context.questionId || null,
                sessionId: context.sessionId || null,
                requestId,
              });

              if (this.activeRequestId !== requestId) {
                console.warn('[Speech] Discarding ASR result for stale request:', requestId);
                return;
              }

              const resolvedTranscript =
                res.success && res.data?.transcript ? res.data.transcript.trim() : browserTranscript;

              if (resolvedTranscript) {
                this.status = 'RECOGNIZED';
                onStateChange({
                  status: this.status,
                  transcript: resolvedTranscript,
                  confidence: res.data?.confidence || 0.95,
                  provider: res.data?.transcript ? res.data.provider : 'browser-speech-recognition',
                  requestId,
                });
              } else {
                console.warn('[Speech] ASR unrecognized or empty:', res.error || res.message);
                this.status = 'IDLE';
                onStateChange({
                  status: 'IDLE',
                  error: res.error || 'UNRECOGNIZED',
                  message: res.message || 'Speech not recognized. Please tap to speak again or use touch tiles.',
                  transcript: null,
                  requestId,
                });
              }
            } catch (err) {
              if (browserTranscript) {
                this.status = 'RECOGNIZED';
                onStateChange({
                  status: this.status,
                  transcript: browserTranscript,
                  confidence: 0.95,
                  provider: 'browser-speech-recognition',
                  requestId,
                });
                return;
              }

              console.warn('[Speech] ASR network/server error:', err.message);
              this.status = 'IDLE';
              onStateChange({
                status: 'IDLE',
                error: 'NETWORK_ERROR',
                message: 'Speech recognition server unreachable. Please select on screen.',
                transcript: null,
                requestId,
              });
            }
          };

          reader.readAsDataURL(blob);
        };

        this.mediaRecorder.start();

        // Automatically stop recording after 4.5 seconds of active speech
        this.timer = setTimeout(() => {
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
          }
        }, 4500);

        return;
      } catch (err) {
        console.warn('[Speech] MediaRecorder / getUserMedia failed, attempting browser speech:', err);
      }
    }

    // 2. Secondary: Browser Web Speech Recognition
    if (this.recognition) {
      try {
        if (lang === 'mr') this.recognition.lang = 'mr-IN';
        else if (lang === 'hi') this.recognition.lang = 'hi-IN';
        else this.recognition.lang = 'en-IN';

        this.recognition.onresult = (event) => {
          if (this.activeRequestId !== requestId) return;
          this.status = 'PROCESSING';
          onStateChange({ status: this.status, requestId });

          const transcript = event.results[0][0].transcript;
          setTimeout(() => {
            if (this.activeRequestId !== requestId) return;
            this.status = 'RECOGNIZED';
            onStateChange({ status: this.status, transcript, requestId });
          }, 400);
        };

        this.recognition.onerror = (event) => {
          console.warn('[Speech] Browser speech recognition error:', event.error);
          this.status = 'IDLE';
          onStateChange({
            status: 'IDLE',
            error: event.error,
            transcript: null,
            requestId,
          });
        };

        this.recognition.start();

        this.timer = setTimeout(() => {
          if (this.status === 'LISTENING') {
            try { this.recognition.stop(); } catch (e) {}
          }
        }, 5000);

        return;
      } catch (err) {
        console.warn('[Speech] Browser recognition start failed:', err);
      }
    }

    // 3. If no speech input is available:
    this.status = 'IDLE';
    onStateChange({
      status: 'IDLE',
      error: 'NO_SPEECH_HARDWARE',
      message: 'Microphone is not accessible in this environment. Please choose options below.',
      transcript: null,
      requestId,
    });
  }

  stopListening() {
    if (this.timer) clearTimeout(this.timer);
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.status = 'IDLE';
  }

  /**
   * Mock helper for isolated unit tests only (not invoked during real user speech).
   */
  fallbackMock(lang, onStateChange) {
    if (this.timer) clearTimeout(this.timer);
    this.status = 'IDLE';
    onStateChange({ status: 'IDLE', transcript: null });
  }
}

export const speechService = new SpeechService();
