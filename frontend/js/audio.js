/**
 * Audio Synthesis & Playback Controller (Section 17)
 * Uses browser Web Speech API SpeechSynthesis or simulated audio prompt.
 */

class AudioController {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isSpeaking = false;
  }

  speak(text, lang = 'mr') {
    return new Promise((resolve) => {
      if (!this.synth) {
        console.log(`[Audio] Simulated TTS playback for: "${text}" (${lang})`);
        setTimeout(resolve, 1500);
        return;
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      // Set appropriate BCP-47 tag
      if (lang === 'mr') utterance.lang = 'mr-IN';
      else if (lang === 'hi') utterance.lang = 'hi-IN';
      else utterance.lang = 'en-IN';

      utterance.rate = 0.9; // Slightly slower for elderly/kiosk clarity

      this.isSpeaking = true;

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('[Audio] Speech synthesis warning:', e);
        this.isSpeaking = false;
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}

export const audioController = new AudioController();
