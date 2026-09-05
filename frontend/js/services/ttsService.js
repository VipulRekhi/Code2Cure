/**
 * MediKiosk TTS Service & Provider Abstraction (Section 10 - 25)
 * Solves voice quality bottleneck, provides clean provider abstraction ready for Phase 5 (IndicF5),
 * selects language-specific voices (en-IN, hi-IN, mr-IN), chunks utterances naturally,
 * and gracefully falls back to Indian synthesizer voices when native voices are missing.
 */

export class BrowserTTSProvider {
  constructor() {
    this.name = 'browser-speech-synthesis';
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.audioCtx = null;
    this.voices = [];
    this.activeUtterances = [];
    this._initVoices();
  }

  _initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices() || [];
    if (typeof this.synth.onvoiceschanged !== 'undefined') {
      this.synth.onvoiceschanged = () => {
        const updated = this.synth.getVoices();
        if (updated && updated.length > 0) {
          this.voices = updated;
        }
      };
    }
  }

  getVoices() {
    if (!this.synth) return this.voices || [];
    const current = this.synth.getVoices();
    if (current && current.length > 0) {
      this.voices = current;
    }
    return this.voices || [];
  }

  /**
   * Identifies if an authentic, native voice exists for the target language.
   */
  getNativeVoice(lang) {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;
    const normalized = (lang || 'en').toLowerCase().trim();

    if (normalized.startsWith('mr')) {
      return (
        voices.find((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('mr')) ||
        voices.find((v) => v.name && (v.name.toLowerCase().includes('marathi') || v.name.includes('मराठी'))) ||
        null
      );
    }

    if (normalized.startsWith('hi')) {
      return (
        voices.find((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('hi')) ||
        voices.find(
          (v) =>
            v.name &&
            (v.name.toLowerCase().includes('hindi') ||
              v.name.includes('हिन्दी') ||
              v.name.toLowerCase().includes('kalpana') ||
              v.name.toLowerCase().includes('hemant'))
        ) ||
        null
      );
    }

    if (normalized.startsWith('en')) {
      return (
        voices.find(
          (v) => v.lang && (v.lang.toLowerCase() === 'en-in' || v.lang.toLowerCase().replace('_', '-') === 'en-in')
        ) ||
        voices.find(
          (v) =>
            v.lang &&
            v.lang.toLowerCase().startsWith('en') &&
            (v.name.toLowerCase().includes('india') ||
              v.name.toLowerCase().includes('heera') ||
              v.name.toLowerCase().includes('ravi'))
        ) ||
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en')) ||
        null
      );
    }

    return voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(normalized)) || null;
  }

  /**
   * Prioritized language-specific voice discovery & fallback chain (Section 12, 13, 14, 23)
   * Selection Priority:
   * 1. Exact native locale voice (mr-IN, hi-IN, en-IN)
   * 2. If allowFallback is true:
   *    - For Marathi: Native Hindi voice -> Indian English (Heera/Ravi) -> Default
   *    - For Hindi: Indian English (Heera/Ravi) -> Default
   *    - For English: Indian English -> Any English -> Default
   */
  getBestVoice(lang = 'en', allowFallback = true) {
    const native = this.getNativeVoice(lang);
    if (native) return native;
    if (!allowFallback) return null;

    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    const normalized = (lang || 'en').toLowerCase().trim();

    // 1. Marathi Fallback Chain (Section 23)
    if (normalized.startsWith('mr')) {
      // 1a. Native Hindi voice reads Devanagari phonetically closest
      const hiVoice = this.getNativeVoice('hi');
      if (hiVoice) return hiVoice;

      // 1b. Indian English voice (Heera / Ravi) with Indian phonological cadence
      const indianVoice = voices.find(
        (v) =>
          v.lang &&
          v.lang.toLowerCase().startsWith('en') &&
          (v.lang.toLowerCase().includes('in') ||
            v.name.toLowerCase().includes('india') ||
            v.name.toLowerCase().includes('heera') ||
            v.name.toLowerCase().includes('ravi'))
      );
      if (indianVoice) return indianVoice;

      return voices.find((v) => v.default) || voices[0] || null;
    }

    // 2. Hindi Fallback Chain
    if (normalized.startsWith('hi')) {
      const indianVoice = voices.find(
        (v) =>
          v.lang &&
          v.lang.toLowerCase().startsWith('en') &&
          (v.lang.toLowerCase().includes('in') ||
            v.name.toLowerCase().includes('india') ||
            v.name.toLowerCase().includes('heera') ||
            v.name.toLowerCase().includes('ravi'))
      );
      if (indianVoice) return indianVoice;

      return voices.find((v) => v.default) || voices[0] || null;
    }

    // 3. English Fallback Chain
    if (normalized.startsWith('en')) {
      const indianVoice = voices.find(
        (v) =>
          v.lang &&
          v.lang.toLowerCase().startsWith('en') &&
          (v.lang.toLowerCase().includes('in') ||
            v.name.toLowerCase().includes('india') ||
            v.name.toLowerCase().includes('heera') ||
            v.name.toLowerCase().includes('ravi'))
      );
      if (indianVoice) return indianVoice;

      const anyEnglish = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
      if (anyEnglish) return anyEnglish;

      return voices.find((v) => v.default) || voices[0] || null;
    }

    return (
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(normalized)) ||
      voices.find((v) => v.default) ||
      voices[0] ||
      null
    );
  }

  /**
   * Honest voice status inspection (Section 14 & 25)
   * Clearly distinguishes:
   * - 'natively_supported'
   * - 'fallback'
   * - 'unavailable'
   */
  getVoiceStatus(lang = 'en') {
    const native = this.getNativeVoice(lang);
    const fallback = this.getBestVoice(lang, true);
    const normalized = (lang || 'en').toLowerCase().trim();

    if (normalized.startsWith('mr')) {
      if (native) {
        return {
          supported: true,
          status: 'natively_supported',
          isFallback: false,
          voiceName: native.name,
          locale: native.lang,
          message: `Marathi TTS: Supported natively (${native.name})`,
        };
      }
      return {
        supported: Boolean(fallback),
        status: fallback ? 'fallback' : 'unavailable',
        isFallback: true,
        voiceName: fallback?.name || null,
        locale: 'mr-IN',
        fallbackLocale: fallback?.lang || null,
        message: fallback
          ? `Marathi TTS: fallback (${fallback.name} - Host OS lacks native mr-IN voice)`
          : 'Marathi TTS: unavailable (No speech synthesizer voices found on device)',
      };
    }

    if (normalized.startsWith('hi')) {
      if (native) {
        return {
          supported: true,
          status: 'natively_supported',
          isFallback: false,
          voiceName: native.name,
          locale: native.lang,
          message: `Hindi TTS: Supported natively (${native.name})`,
        };
      }
      return {
        supported: Boolean(fallback),
        status: fallback ? 'fallback' : 'unavailable',
        isFallback: true,
        voiceName: fallback?.name || null,
        locale: 'hi-IN',
        fallbackLocale: fallback?.lang || null,
        message: fallback
          ? `Hindi TTS: fallback (${fallback.name} - Host OS lacks native hi-IN voice)`
          : 'Hindi TTS: unavailable (No speech synthesizer voices found on device)',
      };
    }

    if (native) {
      const isIndian = native.lang?.toLowerCase().includes('in') || native.name?.toLowerCase().includes('india');
      return {
        supported: true,
        status: isIndian ? 'natively_supported' : 'fallback',
        isFallback: !isIndian,
        voiceName: native.name,
        locale: native.lang,
        message: `English TTS: Supported (${native.name})`,
      };
    }

    return {
      supported: Boolean(fallback),
      status: fallback ? 'fallback' : 'unavailable',
      isFallback: true,
      voiceName: fallback?.name || null,
      locale: 'en-IN',
      message: fallback ? `English TTS: fallback (${fallback.name})` : 'English TTS: unavailable',
    };
  }

  /**
   * Sentence Processing & Natural Chunking (Section 20)
   * Breaks compound/complex sentences into natural conversational utterances.
   */
  processUtterances(text) {
    if (!text || typeof text !== 'string') return [];

    // 1. Strip HTML tags, markdown symbols, and bracketed hints
    let cleaned = text
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 2. Split on natural punctuation boundaries: Danda (।), Question Mark (?), Exclamation (!), Period (.)
    const sentenceDelimiters = /([।?!.])/;
    const parts = cleaned.split(sentenceDelimiters);

    const chunks = [];
    for (let i = 0; i < parts.length; i += 2) {
      const sentence = parts[i]?.trim();
      const punct = parts[i + 1] || '';
      if (sentence) {
        if (sentence.length > 80 && /[,;]/.test(sentence)) {
          const subClauses = sentence.split(/[,;]/);
          subClauses.forEach((sc, idx) => {
            const scTrimmed = sc.trim();
            if (scTrimmed) {
              chunks.push(idx === subClauses.length - 1 ? `${scTrimmed}${punct}` : `${scTrimmed},`);
            }
          });
        } else {
          chunks.push(`${sentence}${punct}`);
        }
      }
    }

    return chunks.length > 0 ? chunks : [cleaned];
  }

  /**
   * Soft harmonic hospital chime (tactile feedback)
   */
  playChime() {
    try {
      const AudioContextClass = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
      if (!AudioContextClass) return;
      if (!this.audioCtx) this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.31);
    } catch (e) {
      // AudioContext warning suppressed
    }
  }

  /**
   * Speak text with natural speech tuning, multi-utterance queueing, and fallback voice handling (Section 19, 20, 23)
   */
  speak(text, lang = 'en', options = {}) {
    return new Promise((resolve) => {
      if (!this.synth) {
        console.warn('[TTS] SpeechSynthesis API unavailable in current environment');
        resolve({ success: false, reason: 'synth_unavailable' });
        return;
      }

      this.stop();

      const status = this.getVoiceStatus(lang);
      const voice = this.getBestVoice(lang, true);

      if (!voice) {
        console.warn(`[TTS] No synthesizer voices available for language: "${lang}". Preserving touch UI.`);
        resolve({ success: false, reason: 'no_voice_available', status });
        return;
      }

      if (status.isFallback) {
        console.info(`[TTS] ${status.message}`);
      }

      const chunks = this.processUtterances(text);
      if (chunks.length === 0) {
        resolve({ success: true, chunks: 0 });
        return;
      }

      // Natural Pacing Parameters (Section 19)
      // If using fallback voice for Marathi/Hindi, rate 0.88 gives deliberate, clear syllable pronunciation
      const defaultRate = status.isFallback ? 0.88 : (lang === 'en' ? 0.95 : 0.92);
      const rate = options.rate || defaultRate;
      const pitch = options.pitch || 1.0;
      const volume = options.volume || 1.0;

      let currentIndex = 0;

      const speakNextChunk = () => {
        if (currentIndex >= chunks.length) {
          resolve({ success: true, chunks: chunks.length, voice: voice.name });
          return;
        }

        const chunkText = chunks[currentIndex++];
        const UtteranceClass =
          typeof SpeechSynthesisUtterance !== 'undefined'
            ? SpeechSynthesisUtterance
            : typeof window !== 'undefined' && window.SpeechSynthesisUtterance
            ? window.SpeechSynthesisUtterance
            : class MockUtterance {
                constructor(t) {
                  this.text = t;
                  this.voice = null;
                  this.lang = 'en';
                  this.rate = 1.0;
                  this.pitch = 1.0;
                  this.volume = 1.0;
                  this.onend = null;
                  this.onerror = null;
                }
              };
        const utterance = new UtteranceClass(chunkText);

        if (voice) {
          utterance.voice = voice;
          utterance.lang = status.isFallback
            ? (lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : voice.lang)
            : voice.lang;
        } else {
          utterance.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        // Retain reference to prevent Chromium garbage collection bug
        this.activeUtterances.push(utterance);

        utterance.onend = () => {
          this.activeUtterances = this.activeUtterances.filter((u) => u !== utterance);
          // 80ms natural pause between clauses
          setTimeout(speakNextChunk, 80);
        };

        utterance.onerror = (e) => {
          console.warn('[TTS] Utterance playback warning:', e.error);
          this.activeUtterances = this.activeUtterances.filter((u) => u !== utterance);
          resolve({ success: false, error: e.error });
        };

        try {
          this.synth.speak(utterance);
        } catch (err) {
          console.warn('[TTS] Synth speak error:', err);
          resolve({ success: false, error: err.message });
        }
      };

      speakNextChunk();
    });
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.activeUtterances = [];
  }
}

/**
 * AI4Bharat IndicF5 TTS Provider (Phase 5 Sovereign Voice Pipeline)
 * Fetches high-quality 24kHz natural Indian language speech from the backend IndicF5 service
 * and plays via HTML5 Audio / Web Audio API with instant stop/cancellation.
 */
export class IndicF5TTSProvider {
  constructor(fallbackProvider = null) {
    this.name = 'indicf5-tts';
    this.fallback = fallbackProvider || new BrowserTTSProvider();
    this.currentAudio = null;
  }

  async speak(text, language = 'mr', options = {}) {
    try {
      this.stop();

      // Request IndicF5 synthesized audio from backend
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          questionId: options.questionId || null,
        }),
      });

      if (!res.ok) {
        throw new Error(`TTS API returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success || !data.data?.audioBase64) {
        throw new Error(data.error || 'No audio payload in TTS response');
      }

      const format = data.data.format || 'wav';
      const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
      const audioSrc = `data:${mime};base64,${data.data.audioBase64}`;
      const audio = new Audio(audioSrc);
      this.currentAudio = audio;

      console.log(`[TTS] Playing authentic neural speech via ${data.data.provider || 'indicf5'} (${language}, ${data.data.audioBase64.length} b64 chars)`);

      return new Promise((resolve) => {
        audio.onended = () => {
          this.currentAudio = null;
          resolve({ success: true, provider: 'indicf5-tts', cached: data.data?.cached || false });
        };

        audio.onerror = (err) => {
          console.warn('[IndicF5 Provider] Audio playback error, engaging browser speech synthesis fallback:', err);
          this.currentAudio = null;
          this.fallback.speak(text, language, options).then(resolve);
        };

        audio.play().catch((playErr) => {
          console.warn('[IndicF5 Provider] Play error (autoplay blocked or audio error), engaging browser speech synthesis fallback:', playErr);
          this.currentAudio = null;
          this.fallback.speak(text, language, options).then(resolve);
        });
      });
    } catch (err) {
      console.info('[IndicF5 Provider] IndicF5 server speech unavailable, using browser speech synthesis:', err.message);
      return await this.fallback.speak(text, language, options);
    }
  }

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.fallback) {
      this.fallback.stop();
    }
  }

  getVoiceStatus(language = 'mr') {
    return {
      supported: true,
      status: 'optimal',
      provider: 'indicf5',
      model: 'ai4bharat/indicf5',
      sampleRate: 24000,
    };
  }

  getNativeVoice(language = 'mr') {
    return { name: `IndicF5 ${language.toUpperCase()} Neural Voice`, lang: `${language}-IN` };
  }

  getBestVoice(language = 'mr', allowFallback = true) {
    return { name: `IndicF5 ${language.toUpperCase()} Voice`, lang: `${language}-IN`, quality: 'natural' };
  }

  processUtterances(text) {
    return [text];
  }
}

/**
 * Centralized TTS Service Abstraction (Section 18 & Phase 5 IndicF5)
 */
class TTSService {
  constructor() {
    const browserFallback = new BrowserTTSProvider();
    // Default to IndicF5 neural synthesis with browser synthesis fallback
    this.provider = new IndicF5TTSProvider(browserFallback);
    this.isSpeaking = false;
    this.listeners = new Set();
  }

  /**
   * Plug an alternative TTS provider (e.g. BrowserTTSProvider)
   */
  setProvider(provider) {
    if (this.isSpeaking) {
      this.stop();
    }
    this.provider = provider;
  }

  /**
   * Main speech entrypoint (Section 18)
   */
  async speak({ text, language = 'mr', options = {} }) {
    if (!text) return { success: false, reason: 'empty_text' };

    this.isSpeaking = true;
    this._notifyListeners(true);

    try {
      const result = await this.provider.speak(text, language, options);
      return result;
    } finally {
      this.isSpeaking = false;
      this._notifyListeners(false);
    }
  }

  stop() {
    if (this.provider) {
      this.provider.stop();
    }
    this.isSpeaking = false;
    this._notifyListeners(false);
  }

  getVoiceStatus(language = 'mr') {
    return this.provider ? this.provider.getVoiceStatus(language) : { supported: false, status: 'unavailable' };
  }

  getNativeVoice(language = 'mr') {
    return this.provider ? this.provider.getNativeVoice(language) : null;
  }

  getBestVoice(language = 'mr', allowFallback = true) {
    return this.provider ? this.provider.getBestVoice(language, allowFallback) : null;
  }

  processUtterances(text) {
    return this.provider ? this.provider.processUtterances(text) : [text];
  }

  onSpeakingChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners(speaking) {
    this.listeners.forEach((fn) => {
      try {
        fn(speaking);
      } catch (err) {
        console.error('[TTS] Listener error:', err);
      }
    });
  }
}

export const ttsService = new TTSService();
