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
            autoGainControl: true,
          },
        });

        const activeTrack = stream.getAudioTracks()[0];
        const deviceSettings = activeTrack?.getSettings?.() || {};
        const startTime = Date.now();

        this.audioChunks = [];

        // Detect supported MIME type
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }

        this.mediaRecorder = new MediaRecorder(stream, { mimeType });

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstop = async () => {
          const durationMs = Date.now() - startTime;
          stream.getTracks().forEach((track) => track.stop());

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

            // Diagnostic logging for development & troubleshooting
            console.info('[Speech Diagnostic]', {
              requestId,
              mimeType,
              sizeBytes: blob.size,
              durationMs,
              deviceId: deviceSettings.deviceId || 'default',
              autoGainControl: deviceSettings.autoGainControl ?? true,
              hasUsableAudio: blob.size > 500,
            });

            if (!base64Audio || blob.size < 200) {
              this.status = 'IDLE';
              onStateChange({
                status: 'IDLE',
                error: 'EMPTY_AUDIO',
                message: 'No speech detected. Please speak clearly at normal volume or select an option below.',
                transcript: null,
                requestId,
              });
              return;
            }

            try {
              // 8-second realistic timeout for backend ASR inference
              const asrPromise = api.transcribeAudio({
                audioBase64: base64Audio,
                language: lang,
                questionId: context.questionId || null,
                sessionId: context.sessionId || null,
                requestId,
              });

              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('ASR_CLIENT_TIMEOUT')), 8000)
              );

              const asrStartTime = Date.now();
              let res;
              try {
                res = await Promise.race([asrPromise, timeoutPromise]);
              } catch (raceErr) {
                console.warn('[Speech] ASR network timeout or failure:', raceErr.message);
                res = { success: false, error: raceErr.message };
              }

              const asrLatency = Date.now() - asrStartTime;
              console.info('[Speech ASR Latency]', `${asrLatency}ms`, 'Success:', res?.success);

              if (this.activeRequestId !== requestId) {
                console.warn('[Speech] Discarding ASR result for stale request:', requestId);
                return;
              }

              const resolvedTranscript = res.success && res.data?.transcript ? res.data.transcript.trim() : '';

              if (resolvedTranscript) {
                this.status = 'RECOGNIZED';
                onStateChange({
                  status: this.status,
                  transcript: resolvedTranscript,
                  confidence: res.data?.confidence || 0.95,
                  provider: res.data?.provider || 'indicconformer-runtime',
                  latency: asrLatency,
                  requestId,
                });
              } else {
                console.warn('[Speech] ASR unrecognized:', res.error || res.message);
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
              console.warn('[Speech] ASR communication error:', err.message);
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

        // Collect audio chunks every 250ms for reliable streaming buffer
        this.mediaRecorder.start(250);

        // Automatically stop recording after 8.0 seconds of active speech capture
        this.timer = setTimeout(() => {
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
          }
        }, 8000);

        return;
      } catch (err) {
        console.warn('[Speech] MediaRecorder / getUserMedia failed, attempting browser speech fallback:', err);
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
        }, 6000);

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

  isListening() {
    return this.status === 'LISTENING' || (this.mediaRecorder && this.mediaRecorder.state === 'recording');
  }

  stopListening() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('[Speech] Error stopping mediaRecorder:', e);
      }
      return;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      return;
    }
    this.status = 'IDLE';
  }

  getDiagnostics() {
    return {
      status: this.status,
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000,
      activeRequestId: this.activeRequestId,
    };
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
