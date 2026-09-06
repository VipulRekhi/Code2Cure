/**
 * Neural TTS Provider Client
 * Interfaces with the local Multilingual Neural TTS Python runtime via HTTP (Port 8001).
 * Synthesizes natural, high-fidelity Indian language speech (Marathi, Hindi, English).
 */

import { voiceConfig } from '../voiceConfig.js';
import { isServiceReachable } from '../socketProbe.js';

export const neuralTTSProvider = {
  name: 'neural-tts-provider',

  async synthesize({ text, language = 'mr', referenceVoice = null }) {
    const startTime = Date.now();
    const endpoint = voiceConfig.tts.endpoint;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return {
        success: false,
        error: 'EMPTY_TEXT',
        message: 'No text provided for speech synthesis',
        diagnostics: {
          provider: 'neural-tts',
          language,
          sampleRate: voiceConfig.tts.sampleRate,
          format: 'wav',
          fallback: false,
          fallbackReason: 'EMPTY_TEXT',
        },
      };
    }

    // Fast connectivity probe (<250ms) to prevent long blocking when runtime is offline
    const isReachable = await isServiceReachable(endpoint, 250);
    if (!isReachable) {
      console.warn(`[NeuralTTS] Service offline at ${endpoint}.`);
      return {
        success: false,
        error: 'TTS_SERVICE_OFFLINE',
        message: 'Neural speech runtime is offline at port 8001.',
        audioBuffer: null,
        sampleRate: voiceConfig.tts.sampleRate,
        latency: Date.now() - startTime,
        diagnostics: {
          provider: 'neural-tts',
          endpoint,
          language,
          sampleRate: voiceConfig.tts.sampleRate,
          format: 'wav',
          generationTimeMs: Date.now() - startTime,
          fallback: false,
          fallbackReason: 'SERVICE_OFFLINE',
        },
      };
    }

    const timeoutMs = voiceConfig.tts.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const payloadStr = JSON.stringify({
        text: text.trim(),
        language: language,
        sample_rate: voiceConfig.tts.sampleRate,
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Neural TTS server returned ${response.status}: ${errorText}`);
      }

      // Check if response is raw audio stream or JSON payload
      const contentType = response.headers.get('content-type') || '';
      let audioBuffer = null;
      let audioFormat = 'wav';
      let model = 'neural-tts';

      if (contentType.includes('audio') || contentType.includes('octet-stream')) {
        const arrayBuf = await response.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
        audioFormat = contentType.includes('wav') ? 'wav' : 'mp3';
        model = response.headers.get('X-Provider') || 'neural-tts';
      } else {
        const data = await response.json();
        if (data.audio_base64) {
          audioBuffer = Buffer.from(data.audio_base64, 'base64');
          audioFormat = data.format || 'wav';
          model = data.model || 'neural-tts';
        } else {
          throw new Error('No audio data received in Neural TTS response');
        }
      }

      const generationTimeMs = Date.now() - startTime;
      const durationMs = audioBuffer ? Math.round((audioBuffer.length / (2 * voiceConfig.tts.sampleRate)) * 1000) : 0;

      return {
        success: true,
        provider: 'neural-tts',
        model,
        language,
        format: audioFormat,
        sampleRate: voiceConfig.tts.sampleRate,
        channels: 1,
        audioBuffer,
        latency: generationTimeMs,
        diagnostics: {
          provider: 'neural-tts',
          model,
          language,
          sampleRate: voiceConfig.tts.sampleRate,
          format: audioFormat,
          audioDurationMs: durationMs,
          generationTimeMs,
          fallback: false,
        },
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      console.warn(`[NeuralTTS] Synthesis error (${isTimeout ? 'TIMEOUT' : err.message})`);

      return {
        success: false,
        error: isTimeout ? 'TTS_TIMEOUT' : 'TTS_RUNTIME_ERROR',
        message: isTimeout ? 'Neural speech synthesis timed out.' : `Speech synthesis runtime error: ${err.message}`,
        audioBuffer: null,
        latency: Date.now() - startTime,
        diagnostics: {
          provider: 'neural-tts',
          endpoint,
          language,
          sampleRate: voiceConfig.tts.sampleRate,
          format: 'wav',
          generationTimeMs: Date.now() - startTime,
          fallback: false,
          fallbackReason: isTimeout ? 'TIMEOUT' : 'RUNTIME_ERROR',
        },
      };
    }
  },
};
