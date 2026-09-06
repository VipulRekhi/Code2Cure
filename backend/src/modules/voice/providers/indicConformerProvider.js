/**
 * AI4Bharat IndicConformer ASR Provider Client (Section 6, 7, 8, 9, 37)
 * Interfaces with local/internal IndicConformer Python runtime via HTTP.
 */

import { voiceConfig } from '../voiceConfig.js';
import { isServiceReachable } from '../socketProbe.js';

export const indicConformerProvider = {
  name: 'indicconformer-asr-provider',

  async transcribe({ audioBuffer, base64Audio, language = 'mr', activeQuestion = null, requestId = null, sessionId = null }) {
    const startTime = Date.now();
    const endpoint = voiceConfig.asr.endpoint;

    let payloadBase64 = base64Audio;
    if (!payloadBase64 && audioBuffer) {
      payloadBase64 = audioBuffer.toString('base64');
    }

    if (!payloadBase64 || payloadBase64.length < 16) {
      return {
        success: false,
        error: 'EMPTY_AUDIO',
        message: "I couldn't hear you. Please try speaking again.",
        transcript: '',
        confidence: 0,
        latency: Date.now() - startTime,
        requestId,
        sessionId,
      };
    }

    // Fast connectivity probe (<250ms) to prevent 10-second blocking when runtime is offline
    const isReachable = await isServiceReachable(endpoint, 250);
    if (!isReachable) {
      console.warn(`[IndicConformer] ASR service offline at ${endpoint}. Fast fail-over to client speech recognition (<10ms).`);
      return {
        success: false,
        error: 'ASR_SERVICE_OFFLINE',
        message: 'IndicConformer speech recognition runtime is offline at port 8001. Engaging client speech recognition.',
        transcript: '',
        requestId,
        sessionId,
        latency: Date.now() - startTime,
      };
    }

    const timeoutMs = voiceConfig.asr.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const payloadStr = JSON.stringify({
        audio_base64: payloadBase64,
        language: language,
        sample_rate: voiceConfig.asr.sampleRate,
        question_context: activeQuestion ? activeQuestion.id : null,
        requestId,
        sessionId,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(payloadStr)),
        },
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `ASR_SERVER_ERROR_${response.status}`,
          message: data.message || 'Speech recognition did not recognize spoken words.',
          transcript: '',
          requestId: data.requestId || requestId,
          sessionId: data.sessionId || sessionId,
          latency: Date.now() - startTime,
        };
      }

      return {
        success: true,
        provider: data.provider || 'indicconformer-runtime',
        transcript: data.transcript || '',
        language: data.language || language,
        confidence: data.confidence || 0.95,
        requestId: data.requestId || requestId,
        sessionId: data.sessionId || sessionId,
        latency: Date.now() - startTime,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      console.warn(`[IndicConformer] Transcription error (${isTimeout ? 'TIMEOUT' : err.message})`);

      return {
        success: false,
        error: isTimeout ? 'ASR_TIMEOUT' : 'ASR_RUNTIME_ERROR',
        message: 'Speech recognition runtime is currently unreachable.',
        transcript: '',
        requestId,
        sessionId,
        latency: Date.now() - startTime,
      };
    }
  },
};
