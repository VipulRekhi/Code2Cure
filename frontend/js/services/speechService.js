/**
 * Speech Recognition Service Abstraction (Phase 5 & 8 Sovereign Voice)
 * Strictly response-driven, request-correlated, and dynamic.
 * Zero browser SpeechRecognition production fallback.
 * Discrete states: IDLE | LISTENING | PROCESSING | RECOGNIZED | ERROR | SERVICE_UNAVAILABLE
 */

import { api } from '../api.js';

class SpeechService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.status = 'IDLE';
    this.timer = null;
    this.activeRequestId = null;
  }

  /**
   * Primary entry point for speech listening.
   * Captures raw acoustic microphone stream and submits to sovereign IndicConformer ASR.
   * Never falls back to browser speech recognition.
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

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      console.warn('[Speech] Microphone capture hardware or MediaRecorder API unavailable.');
      this.status = 'SERVICE_UNAVAILABLE';
      onStateChange({
        status: 'SERVICE_UNAVAILABLE',
        error: 'NO_SPEECH_HARDWARE',
        message: 'Voice service is temporarily unavailable. Please try again or use the buttons below.',
        transcript: null,
        requestId,
      });
      return;
    }

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

          // Diagnostic logging for development & troubleshooting (Section 8)
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
              const errorCode = res.error || 'UNRECOGNIZED';
              const isOffline =
                errorCode === 'ASR_SERVICE_OFFLINE' ||
                errorCode === 'ASR_CLIENT_TIMEOUT' ||
                errorCode === 'ASR_TIMEOUT' ||
                errorCode === 'ASR_RUNTIME_ERROR';

              if (isOffline) {
                console.warn('[Speech] IndicConformer runtime offline or unreachable:', errorCode);
                this.status = 'SERVICE_UNAVAILABLE';
                onStateChange({
                  status: 'SERVICE_UNAVAILABLE',
                  error: errorCode,
                  message: 'Voice service is temporarily unavailable. Please try again or use the buttons below.',
                  transcript: null,
                  requestId,
                });
              } else {
                console.warn('[Speech] ASR unrecognized:', errorCode);
                this.status = 'ERROR';
                onStateChange({
                  status: 'ERROR',
                  error: errorCode,
                  message: res.message || 'Speech not recognized. Please tap to speak again or choose below.',
                  transcript: null,
                  requestId,
                });
              }
            }
          } catch (err) {
            console.warn('[Speech] ASR communication error:', err.message);
            this.status = 'SERVICE_UNAVAILABLE';
            onStateChange({
              status: 'SERVICE_UNAVAILABLE',
              error: 'SERVICE_UNAVAILABLE',
              message: 'Voice service is temporarily unavailable. Please try again or use the buttons below.',
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

    } catch (err) {
      console.warn('[Speech] getUserMedia failed:', err);
      this.status = 'SERVICE_UNAVAILABLE';
      onStateChange({
        status: 'SERVICE_UNAVAILABLE',
        error: 'MIC_PERMISSION_OR_DEVICE_ERROR',
        message: 'Voice service is temporarily unavailable. Please try again or use the buttons below.',
        transcript: null,
        requestId,
      });
    }
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
   * Test helper for unit test suites
   */
  fallbackMock(lang, onStateChange) {
    if (this.timer) clearTimeout(this.timer);
    this.status = 'IDLE';
    onStateChange({ status: 'IDLE', transcript: null });
  }
}

export const speechService = new SpeechService();
