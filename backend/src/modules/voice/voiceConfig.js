/**
 * Voice Pipeline Configuration (Section 38, 61, 64)
 * Centralized settings for AI4Bharat IndicConformer ASR & IndicF5 TTS runtimes.
 */

import dotenv from 'dotenv';
dotenv.config();

export const voiceConfig = {
  // ASR Configuration (IndicConformer)
  asr: {
    provider: process.env.ASR_PROVIDER || 'indicconformer',
    mode: process.env.ASR_MODE || 'mock', // 'indicconformer' | 'mock'
    endpoint: process.env.ASR_ENDPOINT || 'http://127.0.0.1:8001/asr',
    timeoutMs: parseInt(process.env.ASR_TIMEOUT_MS || '10000', 10),
    sampleRate: 16000,
    channels: 1, // Mono
    encoding: 'LINEAR16', // 16-bit PCM WAV
    supportedLanguages: ['en', 'hi', 'mr'],
    minAudioDurationSec: 0.4, // Reject empty or click noises
  },

  // TTS Configuration (IndicF5)
  tts: {
    provider: process.env.TTS_PROVIDER || 'indicf5',
    mode: process.env.TTS_MODE || 'mock', // 'indicf5' | 'mock'
    endpoint: process.env.TTS_ENDPOINT || 'http://127.0.0.1:8001/tts',
    timeoutMs: parseInt(process.env.TTS_TIMEOUT_MS || '12000', 10),
    sampleRate: 24000, // IndicF5 official output rate
    channels: 1,
    supportedLanguages: ['en', 'hi', 'mr'],
    cacheEnabled: true, // Application-level caching for static question IDs
  },
};
