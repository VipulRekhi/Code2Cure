import { ttsService } from './services/ttsService.js';

class AudioController {
  constructor() {
    this.audioCtx = null;
    this.listeners = new Set();
  }

  get isSpeaking() {
    return ttsService.isSpeaking;
  }

  /**
   * Play a subtle, warm kiosk chime via Web Audio API.
   * Gentle Hospital Chime (soft harmonic sine wave).
   */
  playChime() {
    try {
      const AudioContextClass = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Soft harmonic chime (C5 523Hz -> E5 659Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

      // Low volume (0.04) so it's a pleasant tactile cue, not a loud beep
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.31);
    } catch (err) {
      // AudioContext not allowed before user gesture
    }
  }

  getBestVoice(lang) {
    return ttsService.getBestVoice(lang);
  }

  getVoiceStatus(lang) {
    return ttsService.getVoiceStatus(lang);
  }

  /**
   * Delegates speech synthesis to centralized ttsService with natural sentence processing.
   */
  async speak(text, lang = 'mr') {
    return await ttsService.speak({ text, language: lang });
  }

  stop() {
    ttsService.stop();
  }

  onSpeakingChange(callback) {
    return ttsService.onSpeakingChange(callback);
  }
}

export const audioController = new AudioController();

