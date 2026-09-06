import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appState, resetSession, resetClinicalSession, registerResetCallback } from '../js/state.js';
import { speechService } from '../js/services/speechService.js';
import { documentService } from '../js/services/documentService.js';

describe('Phase 7 Frontend Integration & Session Isolation Suite', () => {
  beforeEach(() => {
    resetSession();
  });

  describe('Speech Service Microphone Constraints & Diagnostics (Section 1, 2, 4)', () => {
    it('requests microphone with mandatory autoGainControl, echoCancellation, and noiseSuppression', async () => {
      let requestedConstraints = null;
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockImplementation(async (constraints) => {
          requestedConstraints = constraints;
          const fakeTrack = {
            stop: vi.fn(),
            kind: 'audio',
            label: 'HD Rural Microphone',
            getSettings: () => ({ deviceId: 'mic-01', autoGainControl: true }),
          };
          return {
            getTracks: () => [fakeTrack],
            getAudioTracks: () => [fakeTrack],
          };
        }),
      };

      global.MediaRecorder = class {
        constructor(stream, opts) {
          this.stream = stream;
          this.opts = opts;
          this.state = 'inactive';
          this.ondataavailable = null;
          this.onstop = null;
        }
        start() {
          this.state = 'recording';
        }
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob(['pcm-audio-test-data'], { type: 'audio/webm' }) });
          }
          if (this.onstop) this.onstop();
        }
      };
      global.MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);

      const stateUpdates = [];
      await speechService.startListening('mr', (update) => {
        stateUpdates.push(update);
      });

      expect(requestedConstraints).toBeDefined();
      expect(requestedConstraints.audio.autoGainControl).toBe(true);
      expect(requestedConstraints.audio.echoCancellation).toBe(true);
      expect(requestedConstraints.audio.noiseSuppression).toBe(true);

      // Verify diagnostics
      const diag = speechService.getDiagnostics();
      expect(diag.autoGainControl).toBe(true);
      expect(diag.noiseSuppression).toBe(true);

      speechService.stopListening();
    });
  });

  describe('Session Isolation & Synchronous State Reset (Section 5)', () => {
    it('completely purges session state and executes registered reset callbacks', () => {
      let resetCallbackTriggered = false;
      registerResetCallback(() => {
        resetCallbackTriggered = true;
      });

      // Populate dummy patient state
      appState.backendSessionId = 'test-session-1234';
      appState.complaint.id = 'CHEST_PAIN';
      appState.conversationHistory = [
        { role: 'ai', text: 'छातीत जड वाटतंय का?' },
        { role: 'user', text: 'होय' },
      ];
      appState.documents = [{ id: 'doc-1', fileName: 'prescription.png' }];
      appState.voice.status = 'LISTENING';

      // Reset
      resetClinicalSession();

      expect(resetCallbackTriggered).toBe(true);
      expect(appState.backendSessionId).toBeNull();
      expect(appState.complaint.id).toBeNull();
      expect(appState.conversationHistory).toHaveLength(0);
      expect(appState.documents).toHaveLength(0);
      expect(appState.voice.status).toBe('IDLE');
    });
  });

  describe('Document Service Integration (Section 6, 9)', () => {
    it('encodes file to base64 and posts to session documents endpoint', async () => {
      appState.backendSessionId = 'sess-abc-789';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'doc-999',
            fileName: 'blood_test.txt',
            ocrText: 'Fasting Sugar: 120 mg/dL',
            extractedData: {
              documentType: 'LAB_REPORT',
              medications: [],
              labResults: [{ testName: 'Fasting Sugar', resultValue: '120 mg/dL' }],
            },
          },
        }),
      });
      global.fetch = mockFetch;

      const fileInfo = {
        name: 'blood_test.txt',
        base64: Buffer.from('Dr. Test\nRx: None').toString('base64'),
        type: 'LAB_REPORT',
        size: 1024,
      };
      const uploaded = await documentService.processDocument(fileInfo);

      expect(mockFetch).toHaveBeenCalled();
      expect(uploaded.id).toBe('doc-999');
      expect(uploaded.extractedData.documentType).toBe('LAB_REPORT');
    });
  });
});
