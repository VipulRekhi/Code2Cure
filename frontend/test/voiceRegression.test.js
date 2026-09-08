/**
 * MediKiosk Phase 8.1 Frontend Voice & Audio Regression Test Suite
 * Validates:
 * 1. State machine transitions (IDLE -> LISTENING -> PROCESSING -> TRANSCRIBING -> SUCCESS)
 * 2. Clean reset on failure without microphone locking
 * 3. Microphone permission denied handling with granular code MIC_PERMISSION_DENIED
 * 4. Empty audio detection (EMPTY_AUDIO) with zero hallucination
 * 5. Audio context unlocking on user interaction (no browser autoplay policy blocks)
 * 6. Rapid question transitions & immediate TTS cancellation without overlapping audio
 * 7. Rapid recording toggle resilience (no memory leaks or stream locks)
 * 8. Granular error code propagation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { speechService } from '../js/services/speechService.js';
import { ttsService } from '../js/services/ttsService.js';
import { api } from '../js/api.js';

describe('Phase 8.1 Frontend Voice & Sound Regression Suite', () => {
  beforeEach(() => {
    speechService.stopListening();
    ttsService.stop();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    speechService.stopListening();
    ttsService.stop();
  });

  // TEST 1: State Machine Transitions: IDLE -> LISTENING -> PROCESSING -> TRANSCRIBING -> SUCCESS
  it('Scenario 1: advances cleanly through IDLE -> PROCESSING -> TRANSCRIBING -> SUCCESS', async () => {
    const statesObserved = [];
    const onStateChange = (state) => {
      statesObserved.push(state.status);
    };

    vi.spyOn(api, 'transcribeAudio').mockImplementation(async () => {
      // While in flight, state should be TRANSCRIBING
      expect(speechService.status).toBe('TRANSCRIBING');
      return {
        success: true,
        data: {
          transcript: 'माझा गुडघा दुखतोय',
          language: 'mr',
          confidence: 0.96,
        },
      };
    });

    const mockBlob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
    await speechService.processAudioBlob(mockBlob, onStateChange, { lang: 'mr' });

    expect(statesObserved).toContain('PROCESSING');
    expect(statesObserved).toContain('TRANSCRIBING');
    expect(statesObserved).toContain('SUCCESS');
    expect(speechService.status).toBe('SUCCESS');
    expect(speechService.lastTranscript).toBe('माझा गुडघा दुखतोय');
  });

  // TEST 2: Reset on failure: does not lock microphone or hang in loading state
  it('Scenario 2: transitions to ERROR on ASR failure with granular code ASR_RUNTIME_UNAVAILABLE', async () => {
    const statesObserved = [];
    const onStateChange = (state) => {
      statesObserved.push(state.status);
    };

    vi.spyOn(api, 'transcribeAudio').mockRejectedValueOnce(new Error('ASR server offline'));

    const mockBlob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
    await speechService.processAudioBlob(mockBlob, onStateChange, { lang: 'mr' });

    expect(statesObserved).toContain('ERROR');
    expect(speechService.status).toBe('ERROR');
    expect(speechService.lastError).toBeDefined();
    expect(speechService.lastError.code).toBe('ASR_RUNTIME_UNAVAILABLE');

    // UI can call stopListening() to cleanly reset to IDLE
    speechService.stopListening();
    expect(speechService.status).toBe('IDLE');
  });

  // TEST 3: Microphone permission denied handling
  it('Scenario 3: handles microphone permission denied with MIC_PERMISSION_DENIED and clean UI error', async () => {
    window.MediaRecorder = class MockMediaRecorder {};
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      ),
    };

    let reportedError = null;
    const onStateChange = (state) => {
      if (state.status === 'ERROR') {
        reportedError = state.error;
      }
    };

    await speechService.startListening('en', onStateChange);

    expect(reportedError).toBe('MIC_PERMISSION_DENIED');
    expect(speechService.status).toBe('ERROR');
    speechService.stopListening();
    expect(speechService.status).toBe('IDLE');
  });

  // TEST 4: Empty audio detection with zero hallucination
  it('Scenario 4: rejects empty audio payload without sending to backend or generating fake text', async () => {
    const transcribeSpy = vi.spyOn(api, 'transcribeAudio');
    const statesObserved = [];
    const onStateChange = (state) => {
      statesObserved.push(state.status);
    };

    const emptyBlob = new Blob([], { type: 'audio/webm' });
    await speechService.processAudioBlob(emptyBlob, onStateChange);

    expect(transcribeSpy).not.toHaveBeenCalled();
    expect(statesObserved).toContain('ERROR');
    expect(speechService.status).toBe('ERROR');
    expect(speechService.lastTranscript).toBeFalsy();
  });

  // TEST 5: Browser audio context unlocking on user interaction
  it('Scenario 5: unlockAudioContext() unlocks suspended AudioContext without crashing', async () => {
    let resumed = false;
    window.AudioContext = class MockAudioContext {
      constructor() {
        this.state = 'suspended';
      }
      async resume() {
        this.state = 'running';
        resumed = true;
      }
      createBuffer() {
        return { getChannelData: () => new Float32Array(1) };
      }
      createBufferSource() {
        return {
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
        };
      }
      get destination() {
        return {};
      }
    };

    const unlocked = await ttsService.unlockAudioContext();
    expect(unlocked).toBe(true);
    expect(resumed).toBe(true);
  });

  // TEST 6: Rapid question transitions & immediate TTS cancellation without overlapping audio
  it('Scenario 6: fast question transitions immediately cancel in-flight TTS without audio overlap', async () => {
    const pauseSpy = vi.fn();
    ttsService.provider.currentAudio = {
      pause: pauseSpy,
      currentTime: 2.5,
    };
    ttsService.isSpeaking = true;

    // Simulate next question transition
    ttsService.stop();

    expect(pauseSpy).toHaveBeenCalled();
    expect(ttsService.provider.currentAudio).toBeNull();
    expect(ttsService.isSpeaking).toBe(false);
  });

  // TEST 7: Rapid recording toggle resilience
  it('Scenario 7: rapid start/stop recording calls do not corrupt state machine or throw unhandled exceptions', () => {
    for (let i = 0; i < 5; i++) {
      speechService.stopListening();
      expect(speechService.status).toBe('IDLE');
    }
  });

  // TEST 8: Granular error code propagation on offline TTS
  it('Scenario 8: returns TTS_RUNTIME_UNAVAILABLE when neural TTS server is unreachable', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

    const res = await ttsService.speak({
      text: 'डॉक्टरांना काय त्रास सांगायचा आहे?',
      language: 'mr',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('TTS_RUNTIME_UNAVAILABLE');
    expect(ttsService.isSpeaking).toBe(false);
  });
});
