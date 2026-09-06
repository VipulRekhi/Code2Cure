/**
 * Generalized Semantic Severity Normalization & Option Mapping Unit Tests
 * Verifies colloquial/rural natural language severity interpretation across Marathi, Hindi, Hinglish, and Code-mixed phrases.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { clinicalExtractionService, mapExtractionToUiOption } from '../src/modules/ai/clinicalExtractionService.js';
import { getOrCreateEngine } from '../src/controllers/clinical.controller.js';

describe('Generalized Severity Semantic Extraction & Option Mapping', () => {
  const activeSeverityQuestion = {
    id: 'dyn.symptom.pain.severity',
    concept: 'symptom.pain',
    attribute: 'severity',
    targetConcept: 'symptom.pain',
    targetAttribute: 'severity',
    text: 'तुमच्या वेदनेची तीव्रता किती आहे?',
    options: ['कमी', 'मध्यम', 'खूप जास्त'],
    source: 'LLM_DYNAMIC',
  };

  const objectOptionsQuestion = {
    id: 'dyn.symptom.pain.severity',
    concept: 'symptom.pain',
    attribute: 'severity',
    targetConcept: 'symptom.pain',
    targetAttribute: 'severity',
    text: 'तुमच्या वेदनेची तीव्रता किती आहे?',
    options: [
      { id: 'mild', value: 'mild', label: 'कमी' },
      { id: 'moderate', value: 'moderate', label: 'मध्यम' },
      { id: 'severe', value: 'severe', label: 'खूप जास्त' },
    ],
    source: 'LLM_DYNAMIC',
  };

  describe('Core 12 Test Requirements from Specification', () => {
    it('1. Question: severity, Input: "जास्त नाही पण मध्यम" -> MODERATE, selected option = "मध्यम"', async () => {
      const res = await clinicalExtractionService.extract('जास्त नाही पण मध्यम', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
      expect(res.mappedOptionId).toBe('मध्यम');
    });

    it('2. "कमी नाही, मध्यम आहे" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('कमी नाही, मध्यम आहे', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('3. "ना कमी ना जास्त" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('ना कमी ना जास्त', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('4. "बराच त्रास आहे पण सहन होतोय" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('बराच त्रास आहे पण सहन होतोय', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('5. "फार जास्त नाही" -> must NOT become HIGH/SEVERE', async () => {
      const res = await clinicalExtractionService.extract('फार जास्त नाही', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(res.value).not.toBe('SEVERE');
      expect(res.value).not.toBe('HIGH');
      expect(['MODERATE', 'MILD']).toContain(res.value);
    });

    it('6. "खूप त्रास होतोय" -> HIGH/SEVERE', async () => {
      const res = await clinicalExtractionService.extract('खूप त्रास होतोय', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(['SEVERE', 'HIGH']).toContain(res.value);
      expect(res.mappedOption).toBe('खूप जास्त');
    });

    it('7. "थोडा त्रास आहे" -> LOW/MILD', async () => {
      const res = await clinicalExtractionService.extract('थोडा त्रास आहे', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(['MILD', 'LOW']).toContain(res.value);
      expect(res.mappedOption).toBe('कमी');
    });

    it('8. Hindi: "ज्यादा नहीं लेकिन मध्यम है" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('ज्यादा नहीं लेकिन मध्यम है', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('9. Hinglish: "zyada nahi but medium" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('zyada nahi but medium', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('10. Code-mixed: "जास्त नाही, पण pain moderate आहे" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('जास्त नाही, पण pain moderate आहे', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('11. Ensure: "जास्त आहे" -> HIGH/SEVERE', async () => {
      const res = await clinicalExtractionService.extract('जास्त आहे', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(['SEVERE', 'HIGH']).toContain(res.value);
      expect(res.mappedOption).toBe('खूप जास्त');
    });

    it('12. Ensure: "खूप जास्त आहे" -> HIGH/SEVERE', async () => {
      const res = await clinicalExtractionService.extract('खूप जास्त आहे', activeSeverityQuestion);
      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(['SEVERE', 'HIGH']).toContain(res.value);
      expect(res.mappedOption).toBe('खूप जास्त');
    });
  });

  describe('Additional Rural, Colloquial & Contrast Variations', () => {
    it('handles "न कम न ज्यादा" (Hindi balanced) -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('न कम न ज्यादा', activeSeverityQuestion);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('handles "काफी तकलीफ है लेकिन सहने लायक है" (Hindi tolerable contrast) -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('काफी तकलीफ है लेकिन सहने लायक है', activeSeverityQuestion);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('handles "जास्त आहे पण सहन होतंय" (Marathi tolerable contrast) -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('जास्त आहे पण सहन होतंय', activeSeverityQuestion);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('handles "फार नाही पण बराच त्रास होतोय" (contrast) -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('फार नाही पण बराच त्रास होतोय', activeSeverityQuestion);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('handles "साधारण आहे" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('साधारण आहे', activeSeverityQuestion);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('handles "ठीकठाक आहे" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('ठीकठाक आहे', activeSeverityQuestion);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('handles "manageable hai" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('manageable hai', activeSeverityQuestion);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('handles "not too much but medium" -> MODERATE', async () => {
      const res = await clinicalExtractionService.extract('not too much but medium', activeSeverityQuestion);
      expect(res.value).toBe('MODERATE');
      expect(res.mappedOption).toBe('मध्यम');
    });

    it('handles "सहन होत नाही" / "असह्य आहे" -> UNBEARABLE', async () => {
      const res = await clinicalExtractionService.extract('सहन होत नाही', activeSeverityQuestion);
      expect(['UNBEARABLE', 'SEVERE']).toContain(res.value);
    });

    it('handles "बहुत ज्यादा नहीं है" -> must not be SEVERE', async () => {
      const res = await clinicalExtractionService.extract('बहुत ज्यादा नहीं है', activeSeverityQuestion);
      expect(res.value).not.toBe('SEVERE');
      expect(['MODERATE', 'MILD']).toContain(res.value);
    });

    it('handles "bahut zyada nahi hai" -> must not be SEVERE', async () => {
      const res = await clinicalExtractionService.extract('bahut zyada nahi hai', activeSeverityQuestion);
      expect(res.value).not.toBe('SEVERE');
      expect(['MODERATE', 'MILD']).toContain(res.value);
    });

    it('handles "एवढं काही जास्त नाही" -> must not be SEVERE', async () => {
      const res = await clinicalExtractionService.extract('एवढं काही जास्त नाही', activeSeverityQuestion);
      expect(res.value).not.toBe('SEVERE');
      expect(['MODERATE', 'MILD']).toContain(res.value);
    });
  });

  describe('UI Option Mapping Layer (mapExtractionToUiOption)', () => {
    it('maps MODERATE to plain string "मध्यम"', () => {
      const extraction = { attribute: 'severity', value: 'MODERATE', confidence: 0.94 };
      const mapping = mapExtractionToUiOption(extraction, activeSeverityQuestion);
      expect(mapping.mappedOption).toBe('मध्यम');
      expect(mapping.confidence).toBeGreaterThanOrEqual(0.9);
      expect(mapping.needsClarification).toBe(false);
    });

    it('maps MODERATE to object option { value: "moderate", label: "मध्यम" }', () => {
      const extraction = { attribute: 'severity', value: 'MODERATE', confidence: 0.94 };
      const mapping = mapExtractionToUiOption(extraction, objectOptionsQuestion);
      expect(mapping.mappedOption).toBe('moderate');
      expect(mapping.needsClarification).toBe(false);
    });

    it('maps SEVERE to plain string "खूप जास्त"', () => {
      const extraction = { attribute: 'severity', value: 'SEVERE', confidence: 0.96 };
      const mapping = mapExtractionToUiOption(extraction, activeSeverityQuestion);
      expect(mapping.mappedOption).toBe('खूप जास्त');
    });

    it('maps MILD to plain string "कमी"', () => {
      const extraction = { attribute: 'severity', value: 'MILD', confidence: 0.92 };
      const mapping = mapExtractionToUiOption(extraction, activeSeverityQuestion);
      expect(mapping.mappedOption).toBe('कमी');
    });

    it('maps Hindi options ["कम", "मध्यम", "बहुत ज्यादा"] correctly', () => {
      const hindiQuestion = {
        id: 'dyn.symptom.pain.severity',
        concept: 'symptom.pain',
        attribute: 'severity',
        options: ['कम', 'मध्यम', 'बहुत ज्यादा'],
      };
      const extraction = { attribute: 'severity', value: 'MODERATE', confidence: 0.95 };
      const mapping = mapExtractionToUiOption(extraction, hindiQuestion);
      expect(mapping.mappedOption).toBe('मध्यम');
    });

    it('maps English options ["Mild", "Moderate", "Severe"] correctly', () => {
      const enQuestion = {
        id: 'dyn.symptom.pain.severity',
        concept: 'symptom.pain',
        attribute: 'severity',
        options: ['Mild', 'Moderate', 'Severe'],
      };
      const extraction = { attribute: 'severity', value: 'MODERATE', confidence: 0.95 };
      const mapping = mapExtractionToUiOption(extraction, enQuestion);
      expect(mapping.mappedOption).toBe('Moderate');
    });
  });

  describe('End-to-End API Integration: POST /api/clinical/sessions/:id/responses', () => {
    let sessionId = '';

    beforeAll(async () => {
      await prisma.$connect();
      const sessionRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'mr', opdMode: 'GENERAL' });
      sessionId = sessionRes.body.data.sessionId;

      // Start chief complaint as knee pain
      await request(app)
        .post(`/api/clinical/sessions/${sessionId}/responses`)
        .send({
          questionId: 'q.chief_complaint',
          rawResponse: 'माझा गुडघा दुखतोय',
          inputMethod: 'VOICE',
          language: 'mr',
        });
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('successfully processes "जास्त नाही पण मध्यम" for dyn.symptom.pain.severity with selectedOption "मध्यम"', async () => {
      // Seed dynamic question into engine
      const dbSession = await prisma.clinicalSession.findUnique({ where: { id: sessionId } });
      const engine = getOrCreateEngine(dbSession);
      engine.sessionState.recordAskedQuestion(activeSeverityQuestion);
      engine.sessionState.currentQuestionId = 'dyn.symptom.pain.severity';

      const response = await request(app)
        .post(`/api/clinical/sessions/${sessionId}/responses`)
        .send({
          questionId: 'dyn.symptom.pain.severity',
          rawResponse: 'जास्त नाही पण मध्यम',
          normalizedValue: null,
          inputMethod: 'VOICE',
          language: 'mr',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedOption).toBe('मध्यम');
      expect(response.body.data.recorded.normalizedValue).toBe('MODERATE');
      expect(response.body.data.clinicalSummary.severity).toBe('MODERATE');
      expect(response.body.data.answersCurrentQuestion).not.toBe(false);
    });
  });
});

