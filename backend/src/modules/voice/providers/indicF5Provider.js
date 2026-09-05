/**
 * AI4Bharat IndicF5 TTS Provider Client (Section 19, 20, 21, 22, 29, 37)
 * Interfaces with local IndicF5 Python runtime via HTTP.
 * Official IndicF5 usage loads reference prompt audio + matching reference text
 * to synthesize natural, 24kHz Indian language speech.
 */

import { voiceConfig } from '../voiceConfig.js';

export const indicF5Provider = {
  name: 'indicf5-tts-provider',

  async synthesize({ text, language = 'mr', referenceVoice = null }) {
    const startTime = Date.now();
    const endpoint = voiceConfig.tts.endpoint;
    const timeoutMs = voiceConfig.tts.timeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (!text || typeof text !== 'string' || !text.trim()) {
        return {
          success: false,
          error: 'EMPTY_TEXT',
          message: 'No text provided for speech synthesis',
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          language: language,
          reference_voice: referenceVoice || `${language}_standard`,
          sample_rate: voiceConfig.tts.sampleRate, // 24000
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IndicF5 server returned ${response.status}: ${errorText}`);
      }

      // Check if response is raw audio stream or JSON payload
      const contentType = response.headers.get('content-type') || '';
      let audioBuffer = null;
      let audioFormat = 'mp3';

      if (contentType.includes('audio') || contentType.includes('octet-stream')) {
        const arrayBuf = await response.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
        audioFormat = contentType.includes('wav') ? 'wav' : 'mp3';
      } else {
        const data = await response.json();
        if (data.audio_base64) {
          audioBuffer = Buffer.from(data.audio_base64, 'base64');
          audioFormat = data.format || 'mp3';
        } else {
          throw new Error('No audio data received in IndicF5 response');
        }
      }

      return {
        success: true,
        provider: 'ai4bharat-indicf5',
        language,
        format: audioFormat,
        sampleRate: 24000,
        channels: 1,
        audioBuffer,
        latency: Date.now() - startTime,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      console.warn(`[IndicF5] Synthesis error (${isTimeout ? 'TIMEOUT' : err.message})`);

      return {
        success: false,
        error: isTimeout ? 'TTS_TIMEOUT' : 'TTS_RUNTIME_ERROR',
        message: 'Speech synthesis runtime is currently unreachable.',
        audioBuffer: null,
        latency: Date.now() - startTime,
      };
    }
  },
};
