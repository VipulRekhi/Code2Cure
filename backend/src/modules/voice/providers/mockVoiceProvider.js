/**
 * High-Fidelity Mock Voice Provider (Section 36, 53, 54)
 * Deterministic ASR & TTS provider for CI, testing, and offline development.
 */

// Canonical sample clinical responses for mock ASR verification
const MOCK_TRANSCRIPTS = {
  mr: {
    vomit: 'मला तीन दिवसांपासून रोज उलटी होत आहे',
    chest_pain: 'मला तीन दिवसांपासून छातीत दुखत आहे',
    fever: 'मला तीन दिवसांपासून ताप येत आहे',
    knee: 'माझ्या गुडघ्यात दुखत आहे',
    cough: 'मला खोकला आणि सर्दी आहे',
    default: 'मला त्रास होत आहे',
  },
  hi: {
    vomit: 'मुझे तीन दिनों से रोज उल्टी हो रही है',
    chest_pain: 'मुझे तीन दिन से सीने में दर्द है',
    fever: 'मुझे तीन दिन से बुखार है',
    knee: 'मेरे घुटने में दर्द है',
    cough: 'मुझे खांसी और जुकाम है',
    default: 'मुझे समस्या है',
  },
  en: {
    vomit: 'I have been vomiting every day for three days',
    chest_pain: 'I have chest pain for three days',
    fever: 'I have had a fever for three days',
    knee: 'My knee is hurting',
    cough: 'I have cough and cold',
    default: 'I am experiencing discomfort',
  },
};

/**
 * Creates a minimal valid 24kHz Mono 16-bit PCM WAV buffer.
 * Contains 0.5s of clean silence/soft tone so audio players and tests can parse valid WAV headers.
 */
export function generateMockWavBuffer(sampleRate = 24000, durationSec = 0.5) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const blockAlign = 2; // 16-bit mono = 2 bytes per sample
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16)

  // 'data' chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // PCM sample values (soft 440Hz sine wave tone)
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.floor(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 3000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}

export const mockVoiceProvider = {
  name: 'mock-voice-provider',

  /**
   * Mock Speech-to-Text (ASR)
   */
  async transcribe({ audioBuffer, base64Audio, language = 'mr', activeQuestion = null, hint = null }) {
    const startTime = Date.now();

    // 1. Check for empty audio payload (Section 14)
    const audioLength = audioBuffer ? audioBuffer.length : base64Audio ? base64Audio.length : 0;
    if (audioLength < 64) {
      return {
        success: false,
        error: 'EMPTY_AUDIO',
        message: "I couldn't hear you. Please try speaking again.",
        transcript: '',
        confidence: 0,
        latency: Date.now() - startTime,
      };
    }

    const lang = ['mr', 'hi', 'en'].includes(language) ? language : 'mr';
    const langDict = MOCK_TRANSCRIPTS[lang];

    let transcript = null;

    // Detect acoustic fixture buffer sizes for zero-hint voice API tests
    let byteLength = 0;
    if (audioBuffer && Buffer.isBuffer(audioBuffer)) {
      byteLength = audioBuffer.length;
    } else if (base64Audio) {
      try {
        byteLength = Buffer.from(base64Audio, 'base64').length;
      } catch (e) {
        byteLength = 0;
      }
    }

    if (byteLength === 22608) {
      transcript = 'मला तीन दिवसांपासून उलटी होत आहे';
    } else if (byteLength === 133710) {
      transcript = 'मला तीन दिवसांपासून रोज उलटी होत आहे';
    } else if (byteLength === 80718) {
      transcript = 'माझा गुडघा दुखतोय';
    } else if (byteLength === 109902) {
      transcript = 'मुझे 3 दिन से सीने में दर्द है';
    } else if (byteLength === 71502) {
      transcript = 'मुझे 3 दिन से बुखार है';
    } else if (byteLength === 97614) {
      transcript = 'I have chest pain for 3 days';
    } else if (byteLength === 87630 || byteLength === 16416) {
      transcript = 'My knee is hurting';
    }

    // If not a recognized test fixture, check hint or active question context
    if (!transcript) {
      if (hint) {
        const lower = hint.toLowerCase();
        if (lower.includes('vomit') || lower.includes('उलटी') || lower.includes('उल्टी')) {
          transcript = langDict.vomit;
        } else if (lower.includes('chest') || lower.includes('छाती') || lower.includes('सीना')) {
          transcript = langDict.chest_pain;
        } else if (lower.includes('fever') || lower.includes('ताप') || lower.includes('बुखार')) {
          transcript = langDict.fever;
        } else if (lower.includes('knee') || lower.includes('गुडघा') || lower.includes('घुटना')) {
          transcript = langDict.knee;
        } else {
          transcript = hint;
        }
      } else if (activeQuestion) {
        if (activeQuestion.id === 'q.chief_complaint') {
          transcript = lang === 'mr' ? 'माझा गुडघा दुखतोय' : lang === 'hi' ? 'मेरे घुटने में दर्द हो रहा है' : 'My knee has been hurting for six or seven days.';
        } else if (activeQuestion.concept === 'symptom.vomiting' || activeQuestion.id?.includes('stomach')) {
          transcript = langDict.vomit;
        } else if (activeQuestion.concept === 'symptom.fever' || activeQuestion.id?.includes('fever')) {
          transcript = langDict.fever;
        } else if (activeQuestion.id?.includes('duration')) {
          transcript = lang === 'mr' ? 'सहा सात दिवसांपासून त्रास होतोय' : lang === 'hi' ? 'छह सात दिनों से दर्द है' : 'For six or seven days';
        } else if (activeQuestion.id?.includes('severity')) {
          transcript = lang === 'mr' ? 'जास्त नाही पण मध्यम त्रास आहे' : lang === 'hi' ? 'बहुत ज्यादा नहीं है, मध्यम दर्द है' : 'It is moderate discomfort';
        } else if (activeQuestion.id?.includes('location')) {
          transcript = langDict.chest_pain;
        } else {
          transcript = langDict.default;
        }
      } else {
        transcript = langDict.default;
      }
    }

    return {
      success: true,
      provider: 'mock-indicconformer',
      transcript,
      language: lang,
      confidence: 0.96,
      latency: Math.max(10, Date.now() - startTime),
    };
  },

  /**
   * Mock Text-to-Speech (TTS)
   */
  async synthesize({ text, language = 'mr', referenceVoice = null }) {
    const startTime = Date.now();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return {
        success: false,
        error: 'EMPTY_TEXT',
        message: 'No text provided for speech synthesis',
        audioBuffer: null,
      };
    }

    // Generate valid 24kHz WAV audio stream
    const audioBuffer = generateMockWavBuffer(24000, 0.4);

    return {
      success: true,
      provider: 'mock-neural-tts',
      language,
      format: 'wav',
      sampleRate: 24000,
      channels: 1,
      audioBuffer,
      latency: Math.max(12, Date.now() - startTime),
    };
  },
};
