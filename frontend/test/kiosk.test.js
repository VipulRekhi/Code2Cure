import { describe, it, expect, beforeEach } from 'vitest';
import { translations, t, supportedLanguages } from '../js/i18n.js';
import { appState, setLanguage, resetSession } from '../js/state.js';
import { MOCK_QUESTION_FLOW } from '../js/mock/mockQuestions.js';
import { documentService } from '../js/services/documentService.js';
import { renderPatientReviewScreen } from '../js/screens/patientReview.js';

describe('MediKiosk Phase 2 Vanilla Frontend Test Suite', () => {
  beforeEach(() => {
    resetSession();
  });

  describe('Localization & Languages (Section 12 & 13)', () => {
    it('supports Marathi, Hindi, and English', () => {
      const codes = supportedLanguages.map((l) => l.code);
      expect(codes).toContain('mr');
      expect(codes).toContain('hi');
      expect(codes).toContain('en');
    });

    it('has translation key parity across all 3 languages', () => {
      const enKeys = Object.keys(translations.en);
      const hiKeys = Object.keys(translations.hi);
      const mrKeys = Object.keys(translations.mr);

      // Verify core critical keys exist across all languages
      const criticalKeys = [
        'welcomeTitle',
        'selectLanguage',
        'identifyTitle',
        'consentTitle',
        'opdTitle',
        'complaintTitle',
        'docQuestionTitle',
        'reviewTitle',
        'completeTitle',
        'start',
        'back',
        'continue',
        'help',
      ];

      criticalKeys.forEach((key) => {
        expect(enKeys).toContain(key);
        expect(hiKeys).toContain(key);
        expect(mrKeys).toContain(key);
      });
    });

    it('correctly translates keys based on selected language', () => {
      expect(t('start', 'en')).toBe('START');
      expect(t('start', 'hi')).toBe('शुरू करें');
      expect(t('start', 'mr')).toBe('सुरू करा');
    });
  });

  describe('State Management & Language-Neutral Clinical State (Section 14 & 27)', () => {
    it('initializes with clean session state', () => {
      expect(appState.patient.id).toBeNull();
      expect(appState.consent.granted).toBe(false);
      expect(appState.complaint.id).toBeNull();
      expect(appState.documents).toEqual([]);
    });

    it('updates language and retains clinical state', () => {
      setLanguage('hi');
      expect(appState.language).toBe('hi');

      appState.complaint.id = 'CHEST_PAIN';
      appState.complaint.duration = { value: 3, unit: 'days' };
      appState.complaint.severity = 'MODERATE';

      setLanguage('mr');
      expect(appState.complaint.id).toBe('CHEST_PAIN');
      expect(appState.complaint.duration.value).toBe(3);
    });

    it('resets session memory cleanly', () => {
      appState.patient.name = 'Test Patient';
      appState.documents.push({ id: 'doc-1', name: 'Prescription.pdf' });

      resetSession();
      expect(appState.patient.name).toBeNull();
      expect(appState.documents.length).toBe(0);
      expect(appState.currentScreen).toBe('welcome');
    });
  });

  describe('Question Flow Definition (Section 22)', () => {
    it('has valid DAG question nodes', () => {
      expect(MOCK_QUESTION_FLOW.length).toBeGreaterThanOrEqual(3);
      MOCK_QUESTION_FLOW.forEach((node) => {
        expect(node.id).toBeDefined();
        expect(node.slotKey).toBeDefined();
        expect(node.options.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Document Service Abstraction (Section 31 & 40)', () => {
    it('simulates document processing pipeline without errors', async () => {
      const stages = [];
      const result = await documentService.processDocument(
        { name: 'test_prescription.pdf', type: 'PRESCRIPTION', size: 1024 },
        (stage) => stages.push(stage)
      );

      expect(stages).toContain('readingDoc');
      expect(stages).toContain('extractingDoc');
      expect(stages).toContain('organizingDoc');
      expect(result.id).toBeDefined();
      expect(result.type).toBe('PRESCRIPTION');
    });
  });

  describe('Phase 4 Clinical Data Mapping & Review UI Fixes (Section 32)', () => {
    it('renders Marathi vomiting statement without chest pain or undefined days', () => {
      setLanguage('mr');

      // Patient responded with vomiting for 3 days
      appState.complaint.id = 'STOMACH';
      appState.complaint.textPatientSpoken = 'मला तीन दिवसांपासून रोज उलटी होत आहे';
      appState.complaint.duration = { value: 3, unit: 'days' };
      appState.complaint.severity = 'MODERATE';

      const rendered = renderPatientReviewScreen();

      expect(rendered.html).toContain('पोटदुखी / मळमळ / उलटी');
      expect(rendered.html).not.toContain('CHEST_PAIN');
      expect(rendered.html).not.toContain('undefined days');
      expect(rendered.html).not.toContain('null days');
      expect(rendered.html).not.toContain('NaN');
      expect(rendered.html).toContain('3 days');
      expect(rendered.html).toContain('मध्यम'); // localized severity
      // Must not contain arbitrary "Type:" field with unrelated string
      expect(rendered.html).not.toContain('Type:');
    });

    it('handles missing duration or severity safely without displaying undefined or null', () => {
      setLanguage('en');

      appState.complaint.id = 'STOMACH';
      appState.complaint.duration = null;
      appState.complaint.severity = null;

      const rendered = renderPatientReviewScreen();

      expect(rendered.html).not.toContain('undefined');
      expect(rendered.html).not.toContain('null');
      expect(rendered.html).toContain('Not provided');
    });
  });
});


