/**
 * Text-To-Speech (TTS) Service Abstraction (Section 17 & 40)
 * Prepares the boundary for Phase 5 (AI4Bharat IndicF5).
 */

import { audioController } from '../audio.js';

class TTSService {
  async playPrompt(text, lang = 'mr') {
    try {
      await audioController.speak(text, lang);
    } catch (e) {
      console.warn('[TTS] Failed to play prompt:', e);
    }
  }

  stop() {
    audioController.stop();
  }
}

export const ttsService = new TTSService();
