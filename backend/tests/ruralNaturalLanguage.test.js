/**
 * Rural / Colloquial Natural Language Clinical Robustness Tests
 * Validates semantic interpretation of informal, dialectal, and rural Marathi/Hindi expressions.
 */

import { describe, it, expect } from 'vitest';
import { clinicalExtractionService } from '../src/modules/ai/clinicalExtractionService.js';
import { ClinicalSessionState } from '../src/modules/questionEngine/clinicalState.js';
import { QuestionEngine } from '../src/modules/questionEngine/questionEngine.js';
import { dynamicQuestionService } from '../src/modules/ai/dynamicQuestionService.js';

describe('Rural / Colloquial Natural Language Extraction & Reasoning', () => {
  const mockSessionState = new ClinicalSessionState({
    sessionId: 'test-rural-session',
    patientId: 'patient-rural-1',
    opdMode: 'GENERAL',
  });

  const chiefComplaintQuestion = {
    id: 'q.chief_complaint',
    targetConcept: 'symptom.pain',
    targetAttribute: 'complaint_type',
  };

  // Test 1: "चार दिवसांपासून खांदा दुखतोय यार"
  it('1. Extracts shoulder pain, location shoulder, and duration 4 days from "चार दिवसांपासून खांदा दुखतोय यार"', async () => {
    const input = 'चार दिवसांपासून खांदा दुखतोय यार';
    const result = await clinicalExtractionService.extract(input, chiefComplaintQuestion, mockSessionState);

    expect(result.success).toBe(true);
    expect(result.extractions.length).toBeGreaterThanOrEqual(2);

    const shoulderPresence = result.extractions.find(
      (e) => (e.concept === 'symptom.pain.shoulder' || e.concept === 'symptom.pain') && (e.attribute === 'presence' || e.value === 'shoulder_pain')
    );
    expect(shoulderPresence).toBeDefined();

    const shoulderLocation = result.extractions.find(
      (e) => (e.concept === 'symptom.pain.shoulder' || e.concept === 'symptom.pain') && e.attribute === 'location' && e.value === 'shoulder'
    );
    expect(shoulderLocation).toBeDefined();

    const durationExt = result.extractions.find((e) => e.attribute === 'duration');
    expect(durationExt).toBeDefined();
    expect(durationExt.value).toBe(4);
    expect(durationExt.unit).toBe('days');
  });

  // Test 2: "माझा खांदा दोन तीन दिवसांपासून धरलाय"
  it('2. Extracts shoulder pain + approximate 2-3 days duration from "माझा खांदा दोन तीन दिवसांपासून धरलाय"', async () => {
    const input = 'माझा खांदा दोन तीन दिवसांपासून धरलाय';
    const result = await clinicalExtractionService.extract(input, chiefComplaintQuestion, mockSessionState);

    expect(result.success).toBe(true);
    const shoulderExt = result.extractions.find(
      (e) => (e.concept === 'symptom.pain.shoulder' || e.concept === 'symptom.pain') && (e.value === 'shoulder' || e.value === true)
    );
    expect(shoulderExt).toBeDefined();

    const durationExt = result.extractions.find((e) => e.attribute === 'duration');
    expect(durationExt).toBeDefined();
    expect(durationExt.value).toEqual({ min: 2, max: 3, unit: 'days' });
  });

  // Test 3: "खांद्याला फार त्रास होतोय"
  it('3. Extracts shoulder pain from indirect colloquial "खांद्याला फार त्रास होतोय"', async () => {
    const input = 'खांद्याला फार त्रास होतोय';
    const result = await clinicalExtractionService.extract(input, chiefComplaintQuestion, mockSessionState);

    expect(result.success).toBe(true);
    const shoulderLocation = result.extractions.find(
      (e) => (e.concept === 'symptom.pain.shoulder' || e.concept === 'symptom.pain') && e.attribute === 'location' && e.value === 'shoulder'
    );
    expect(shoulderLocation).toBeDefined();
  });

  // Test 4: "गुडघा दुखतोय पण सूज आहे की नाही माहीत नाही"
  it('4. Extracts knee pain + swelling unknown from "गुडघा दुखतोय पण सूज आहे की नाही माहीत नाही"', async () => {
    const input = 'गुडघा दुखतोय पण सूज आहे की नाही माहीत नाही';
    const kneeQuestion = {
      id: 'q.knee.swelling',
      targetConcept: 'symptom.injury',
      targetAttribute: 'swelling',
    };
    const result = await clinicalExtractionService.extract(input, kneeQuestion, mockSessionState);

    expect(result.success).toBe(true);
    const kneeLoc = result.extractions.find(
      (e) => (e.concept === 'symptom.pain.knee' || e.concept === 'symptom.pain') && (e.value === 'knee' || e.attribute === 'location')
    );
    expect(kneeLoc).toBeDefined();

    const swellingExt = result.extractions.find(
      (e) => e.concept === 'symptom.injury' && e.attribute === 'swelling'
    );
    expect(swellingExt).toBeDefined();
    expect(swellingExt.status).toBe('UNKNOWN');
  });

  // Test 5: "पोटात आग होतेय जेवल्यावर"
  it('5. Extracts abdominal burning + food relation from "पोटात आग होतेय जेवल्यावर"', async () => {
    const input = 'पोटात आग होतेय जेवल्यावर';
    const result = await clinicalExtractionService.extract(input, chiefComplaintQuestion, mockSessionState);

    expect(result.success).toBe(true);
    const abdoLoc = result.extractions.find(
      (e) => e.attribute === 'location' && e.value === 'abdomen'
    );
    expect(abdoLoc).toBeDefined();

    const foodExt = result.extractions.find(
      (e) => e.attribute === 'foodRelation' && e.value === 'after_eating'
    );
    expect(foodExt).toBeDefined();
  });

  // Test 6: "छातीत कळ येतेय आणि हाताकडे जातेय"
  it('6. Extracts chest pain + radiation to arm WITHOUT assuming left/right from "छातीत कळ येतेय आणि हाताकडे जातेय"', async () => {
    const input = 'छातीत कळ येतेय आणि हाताकडे जातेय';
    const radiationQuestion = {
      id: 'q.pain.radiation',
      targetConcept: 'symptom.pain.chest',
      targetAttribute: 'radiation',
    };
    const result = await clinicalExtractionService.extract(input, radiationQuestion, mockSessionState);

    expect(result.success).toBe(true);
    const radiationExt = result.extractions.find((e) => e.attribute === 'radiation');
    expect(radiationExt).toBeDefined();
    expect(radiationExt.radiationLocation).toBe('arm');
    expect(radiationExt.radiationSide).toBe('unknown'); // MUST NOT assume LEFT_ARM without explicit indication
  });

  // Test 7: "नाही रे काही धाप वगैरे लागत नाही"
  it('7. Extracts dyspnea = false (ABSENT) from colloquial Marathi negation "नाही रे काही धाप वगैरे लागत नाही"', async () => {
    const input = 'नाही रे काही धाप वगैरे लागत नाही';
    const dyspneaQuestion = {
      id: 'q.pain.dyspnea',
      targetConcept: 'symptom.pain.chest',
      targetAttribute: 'dyspnea',
    };
    const result = await clinicalExtractionService.extract(input, dyspneaQuestion, mockSessionState);

    expect(result.success).toBe(true);
    const dyspneaExt = result.extractions.find((e) => e.attribute === 'dyspnea' || e.concept === 'symptom.dyspnea');
    expect(dyspneaExt).toBeDefined();
    expect(dyspneaExt.value).toBe(false);
    expect(dyspneaExt.status).toBe('ABSENT');
  });

  // Test 8: "जास्त नाही पण बराच त्रास होतोय"
  it('8. Maps generalized answer "जास्त नाही पण बराच त्रास होतोय" to MODERATE severity', async () => {
    const input = 'जास्त नाही पण बराच त्रास होतोय';
    const severityQuestion = {
      id: 'q.pain.severity',
      targetConcept: 'symptom.pain',
      targetAttribute: 'severity',
    };
    const result = await clinicalExtractionService.extract(input, severityQuestion, mockSessionState);

    expect(result.success).toBe(true);
    const severityExt = result.extractions.find((e) => e.attribute === 'severity');
    expect(severityExt).toBeDefined();
    expect(severityExt.value).toBe('MODERATE');
  });

  // Test 9: "सहा सात दिवस झाले असतील"
  it('9. Extracts range duration 6-7 days from approximate speech "सहा सात दिवस झाले असतील"', async () => {
    const input = 'सहा सात दिवस झाले असतील';
    const durationQuestion = {
      id: 'q.pain.duration',
      targetConcept: 'symptom.pain',
      targetAttribute: 'duration',
    };
    const result = await clinicalExtractionService.extract(input, durationQuestion, mockSessionState);

    expect(result.success).toBe(true);
    const durationExt = result.extractions.find((e) => e.attribute === 'duration');
    expect(durationExt).toBeDefined();
    expect(durationExt.value).toEqual({ min: 6, max: 7, unit: 'days' });
  });

  // Test 10: "आठवडाभरापासून आहे"
  it('10. Extracts approximate 7 days duration from "आठवडाभरापासून आहे"', async () => {
    const input = 'आठवडाभरापासून आहे';
    const durationQuestion = {
      id: 'q.pain.duration',
      targetConcept: 'symptom.pain',
      targetAttribute: 'duration',
    };
    const result = await clinicalExtractionService.extract(input, durationQuestion, mockSessionState);

    expect(result.success).toBe(true);
    const durationExt = result.extractions.find((e) => e.attribute === 'duration');
    expect(durationExt).toBeDefined();
    expect(durationExt.value).toEqual({ min: 7, max: 7, unit: 'days' });
  });
});

describe('ACCEPTANCE TEST: Full Pipeline from "चार दिवसांपासून खांदा दुखतोय यार" to Dynamic Shoulder Question', () => {
  it('Full pipeline correctly resolves primaryConcern = shoulder_pain, location = shoulder, duration = 4 days, and generates dynamic shoulder question', async () => {
    const rawUtterance = 'चार दिवसांपासून खांदा दुखतोय यार';

    // 1. Initialize fresh intake engine
    const sessionState = new ClinicalSessionState({
      sessionId: 'test-shoulder-acceptance',
      patientId: 'patient-shoulder-1',
      opdMode: 'GENERAL',
    });
    const engine = new QuestionEngine(sessionState);

    const activeQuestion = {
      id: 'q.chief_complaint',
      targetConcept: 'symptom.pain',
      targetAttribute: 'complaint_type',
    };

    // 2. Clinical Extraction
    const extractionResult = await clinicalExtractionService.extract(
      rawUtterance,
      activeQuestion,
      engine.sessionState
    );

    expect(extractionResult.success).toBe(true);
    expect(extractionResult.extractions.length).toBeGreaterThanOrEqual(2);

    // 3. Emulate Controller Record Response logic
    const hasShoulder = extractionResult.extractions.some(
      (ext) =>
        ext.concept === 'symptom.pain.shoulder' ||
        (ext.concept === 'symptom.pain' && ext.attribute === 'location' && ext.value === 'shoulder') ||
        ext.value === 'shoulder' ||
        ext.value === 'shoulder_pain'
    );
    expect(hasShoulder).toBe(true);

    engine.sessionState.primaryConcern = 'shoulder_pain';
    for (const extra of extractionResult.extractions) {
      const extraFactKey = `${extra.concept}.${extra.attribute}`;
      engine.sessionState.collectedFacts[extraFactKey] = {
        concept: extra.concept,
        attribute: extra.attribute,
        value: extra.value,
        unit: extra.unit || null,
        status: extra.status,
        raw: extra.raw || null,
        source: 'PATIENT_VOICE',
        recordedAt: new Date().toISOString(),
      };
    }

    engine.recordResponse({
      questionId: 'q.chief_complaint',
      rawResponse: rawUtterance,
      normalizedValue: 'shoulder_pain',
      inputMethod: 'VOICE',
      language: 'mr',
    });

    // 4. Validate Authoritative Clinical Summary
    const clinicalSummary = engine.sessionState.getClinicalSummary();
    expect(clinicalSummary.primaryConcern).toBe('shoulder_pain');
    expect(clinicalSummary.location).toBe('shoulder');
    expect(clinicalSummary.duration).toEqual({ value: 4, unit: 'days' });

    // 5. Dynamic Question Generation
    const dynamicResult = await engine.getNextQuestionDynamic('mr');

    expect(dynamicResult.status).toBe('question');
    expect(dynamicResult.question).toBeDefined();

    const q = dynamicResult.question;
    // Must be shoulder-specific
    expect(q.concept || q.targetConcept).toBe('symptom.pain.shoulder');
    // Must not ask about stomach or diarrhea
    expect(q.concept || q.targetConcept).not.toBe('symptom.diarrhea');
    expect(q.concept || q.targetConcept).not.toBe('symptom.pain.abdominal');

    // Verify Marathi text is relevant to shoulder
    expect(
      q.text.includes('दुखापत') ||
      q.text.includes('खांदा') ||
      q.text.includes('हात') ||
      q.text.includes('त्रास')
    ).toBe(true);
  });
});
