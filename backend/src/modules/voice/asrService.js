/**
 * Centralized ASR Orchestration Service (Section 5, 6, 7, 8, 9, 14, 15, 16)
 * Handles input validation, provider selection, latency tracking, and error recovery.
 */

import { voiceConfig } from './voiceConfig.js';
import { indicConformerProvider } from './providers/indicConformerProvider.js';
import { mockVoiceProvider } from './providers/mockVoiceProvider.js';

class ASRService {
  constructor() {
    this.config = voiceConfig.asr;
  }

  get activeProvider() {
    return this.config.mode === 'indicconformer' ? indicConformerProvider : mockVoiceProvider;
  }

  /**
   * Main transcription orchestrator.
   */
  async transcribe({ audioBuffer, base64Audio, language = 'mr', activeQuestion = null, requestId = null, sessionId = null }) {
    // 1. Audio presence validation
    if (!audioBuffer && !base64Audio) {
      return {
        success: false,
        fallbackToTouch: true,
        error: 'NO_AUDIO_PROVIDED',
        message: 'No audio data received. Please select an option on screen or speak again.',
        transcript: '',
        requestId,
        sessionId,
      };
    }

    const provider = this.activeProvider;
    const result = await provider.transcribe({
      audioBuffer,
      base64Audio,
      language,
      activeQuestion,
      requestId,
      sessionId,
    });

    // 2. Safe Failure Fallback: Do not manufacture facts if ASR fails (Section 15)
    if (!result.success) {
      return {
        success: false,
        fallbackToTouch: true,
        error: result.error,
        message: result.message || 'Speech recognition unavailable. Please select an option on screen.',
        transcript: '',
        requestId: result.requestId || requestId,
        sessionId: result.sessionId || sessionId,
        latency: result.latency || 0,
      };
    }

    return {
      success: true,
      provider: result.provider,
      transcript: result.transcript.trim(),
      language: result.language,
      confidence: result.confidence,
      requestId: result.requestId || requestId,
      sessionId: result.sessionId || sessionId,
      latency: result.latency,
    };
  }
}

export const asrService = new ASRService();
