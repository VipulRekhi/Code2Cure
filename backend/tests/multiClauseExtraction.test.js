/**
 * Multi-Clause Natural Language Extraction & Decision-Routing Test Suite
 * Tests multi-clause speech decomposition, negation, contrast connectors,
 * current question answering, option mapping, and additional clinical fact recording.
 */

import { describe, it, expect } from 'vitest';
import { clinicalExtractionService } from '../src/modules/ai/clinicalExtractionService.js';
import { ClinicalSessionState, QuestionEngine } from '../src/modules/questionEngine/index.js';

describe('Multi-Clause Natural Language Extraction & Decision-Routing', () => {
  const qDyspnea = {
    id: 'q.pain.dyspnea',
    concept: 'symptom.pain.chest',
    attribute: 'dyspnea',
    inputType: 'yes-no',
    text: {
      en: 'Are you experiencing any shortness of breath or breathing difficulty?',
      hi: 'क्या आपको सांस लेने में कोई तकलीफ या सांस फूलना महसूस हो रहा है?',
      mr: 'तुम्हाला श्वास घेण्यास त्रास किंवा दम लागल्यासारखे होत आहे का?',
    },
    options: [
      { value: 'yes', labels: { en: 'Yes, having trouble breathing', hi: 'हां, सांस लेने में तकलीफ है', mr: 'होय, श्वास घेण्यास त्रास आहे' }, icon: '⚠️' },
      { value: 'no', labels: { en: 'No, breathing is normal', hi: 'नहीं, सांस सामान्य है', mr: 'नाही, श्वास सामान्य आहे' }, icon: '✓' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पक्का नहीं पता', mr: 'माहित नाही' }, icon: '❓' },
    ],
  };

  it('1. Hindi: "सांस लेने में तकलीफ नहीं है लेकिन पसीना आ रहा है" -> dyspnea=false, sweating=true, answersCurrentQuestion=true, option=no', async () => {
    const res = await clinicalExtractionService.extract(
      'सांस लेने में तकलीफ नहीं है लेकिन पसीना आ रहा है',
      qDyspnea
    );

    expect(res.success).toBe(true);
    expect(res.answersCurrentQuestion).toBe(true);
    expect(res.value).toBe(false);
    expect(res.mappedOption).toBe('no');

    // Primary concept answers current question
    const dyspneaFact = res.extractions.find(
      (e) => e.attribute === 'dyspnea' || e.concept === 'symptom.dyspnea'
    );
    expect(dyspneaFact).toBeDefined();
    expect(dyspneaFact.value).toBe(false);
    expect(dyspneaFact.status).toBe('ABSENT');

    // Additional fact recorded
    const sweatingFact = res.extractions.find(
      (e) => e.attribute === 'sweating' || e.concept === 'symptom.sweating'
    );
    expect(sweatingFact).toBeDefined();
    expect(sweatingFact.value).toBe(true);
    expect(sweatingFact.status).toBe('PRESENT');
    expect(res.additionalFacts.some((e) => e.attribute === 'sweating')).toBe(true);
  });

  it('2. Marathi: "धाप नाही लागत पण घाम येतोय" -> dyspnea=false, sweating=true, answersCurrentQuestion=true, option=no', async () => {
    const res = await clinicalExtractionService.extract(
      'धाप नाही लागत पण घाम येतोय',
      qDyspnea
    );

    expect(res.success).toBe(true);
    expect(res.answersCurrentQuestion).toBe(true);
    expect(res.value).toBe(false);
    expect(res.mappedOption).toBe('no');

    const dyspneaFact = res.extractions.find(
      (e) => e.attribute === 'dyspnea' || e.concept === 'symptom.dyspnea'
    );
    expect(dyspneaFact).toBeDefined();
    expect(dyspneaFact.value).toBe(false);
    expect(dyspneaFact.status).toBe('ABSENT');

    const sweatingFact = res.extractions.find(
      (e) => e.attribute === 'sweating' || e.concept === 'symptom.sweating'
    );
    expect(sweatingFact).toBeDefined();
    expect(sweatingFact.value).toBe(true);
    expect(sweatingFact.status).toBe('PRESENT');
  });

  it('3. Hindi: "नहीं रे, सांस ठीक है, बस घाम आ रहा है" -> dyspnea=false, sweating=true, answersCurrentQuestion=true, option=no', async () => {
    const res = await clinicalExtractionService.extract(
      'नहीं रे, सांस ठीक है, बस घाम आ रहा है',
      qDyspnea
    );

    expect(res.success).toBe(true);
    expect(res.answersCurrentQuestion).toBe(true);
    expect(res.value).toBe(false);
    expect(res.mappedOption).toBe('no');

    const dyspneaFact = res.extractions.find(
      (e) => e.attribute === 'dyspnea' || e.concept === 'symptom.dyspnea'
    );
    expect(dyspneaFact).toBeDefined();
    expect(dyspneaFact.value).toBe(false);
    expect(dyspneaFact.status).toBe('ABSENT');

    const sweatingFact = res.extractions.find(
      (e) => e.attribute === 'sweating' || e.concept === 'symptom.sweating'
    );
    expect(sweatingFact).toBeDefined();
    expect(sweatingFact.value).toBe(true);
    expect(sweatingFact.status).toBe('PRESENT');
  });

  it('4. Marathi: "श्वास ठीक आहे पण घाम फुटतोय" -> dyspnea=false, sweating=true, answersCurrentQuestion=true, option=no', async () => {
    const res = await clinicalExtractionService.extract(
      'श्वास ठीक आहे पण घाम फुटतोय',
      qDyspnea
    );

    expect(res.success).toBe(true);
    expect(res.answersCurrentQuestion).toBe(true);
    expect(res.value).toBe(false);
    expect(res.mappedOption).toBe('no');

    const dyspneaFact = res.extractions.find(
      (e) => e.attribute === 'dyspnea' || e.concept === 'symptom.dyspnea'
    );
    expect(dyspneaFact).toBeDefined();
    expect(dyspneaFact.value).toBe(false);
    expect(dyspneaFact.status).toBe('ABSENT');

    const sweatingFact = res.extractions.find(
      (e) => e.attribute === 'sweating' || e.concept === 'symptom.sweating'
    );
    expect(sweatingFact).toBeDefined();
    expect(sweatingFact.value).toBe(true);
    expect(sweatingFact.status).toBe('PRESENT');
  });

  it('5. Positive contrast: "धाप लागते पण घाम येत नाही" -> dyspnea=true, sweating=false, answersCurrentQuestion=true, option=yes', async () => {
    const res = await clinicalExtractionService.extract(
      'धाप लागते पण घाम येत नाही',
      qDyspnea
    );

    expect(res.success).toBe(true);
    expect(res.answersCurrentQuestion).toBe(true);
    expect(res.value).toBe(true);
    expect(res.mappedOption).toBe('yes');

    const dyspneaFact = res.extractions.find(
      (e) => e.attribute === 'dyspnea' || e.concept === 'symptom.dyspnea'
    );
    expect(dyspneaFact).toBeDefined();
    expect(dyspneaFact.value).toBe(true);
    expect(dyspneaFact.status).toBe('PRESENT');

    const sweatingFact = res.extractions.find(
      (e) => e.attribute === 'sweating' || e.concept === 'symptom.sweating'
    );
    expect(sweatingFact).toBeDefined();
    expect(sweatingFact.value).toBe(false);
    expect(sweatingFact.status).toBe('ABSENT');
  });

  it('6. Additional unrelated symptom: "सांस लेने में दिक्कत नहीं है लेकिन सीने में दर्द है" -> dyspnea=false, chestPain=true, answersCurrentQuestion=true, option=no', async () => {
    const res = await clinicalExtractionService.extract(
      'सांस लेने में दिक्कत नहीं है लेकिन सीने में दर्द है',
      qDyspnea
    );

    expect(res.success).toBe(true);
    expect(res.answersCurrentQuestion).toBe(true);
    expect(res.value).toBe(false);
    expect(res.mappedOption).toBe('no');

    const dyspneaFact = res.extractions.find(
      (e) => e.attribute === 'dyspnea' || e.concept === 'symptom.dyspnea'
    );
    expect(dyspneaFact).toBeDefined();
    expect(dyspneaFact.value).toBe(false);
    expect(dyspneaFact.status).toBe('ABSENT');

    const chestFact = res.extractions.find(
      (e) => e.concept === 'symptom.pain.chest' && e.attribute === 'presence'
    );
    expect(chestFact).toBeDefined();
    expect(chestFact.value).toBe(true);
    expect(chestFact.status).toBe('PRESENT');
  });

  it('7. Incidental preservation: does not misclassify answering utterance as incidental', async () => {
    const sessionState = new ClinicalSessionState({
      sessionId: 'test-session-multiclause',
      patientId: 'P001',
      language: 'hi',
    });
    const engine = new QuestionEngine(sessionState);

    // Initial chest pain complaint
    engine.recordResponse({
      questionId: 'q.chief_complaint',
      rawResponse: 'सीने में दर्द है',
      normalizedValue: 'pain',
      inputMethod: 'VOICE',
      language: 'hi',
    });

    const res = await clinicalExtractionService.extract(
      'सांस लेने में तकलीफ नहीं है लेकिन पसीना आ रहा है',
      qDyspnea,
      sessionState
    );

    expect(res.answersCurrentQuestion).toBe(true);
    expect(res.mappedOption).toBe('no');

    // Simulate controller fact storage
    for (const extra of res.extractions) {
      sessionState.collectedFacts[`${extra.concept}.${extra.attribute}`] = {
        concept: extra.concept,
        attribute: extra.attribute,
        value: extra.value,
        status: extra.status,
      };
    }

    // Both facts recorded in sessionState
    expect(sessionState.collectedFacts['symptom.pain.chest.dyspnea'].value).toBe(false);
    expect(sessionState.collectedFacts['symptom.pain.chest.dyspnea'].status).toBe('ABSENT');
    expect(sessionState.collectedFacts['symptom.pain.chest.sweating'].value).toBe(true);
    expect(sessionState.collectedFacts['symptom.pain.chest.sweating'].status).toBe('PRESENT');
  });
});
