import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { activeSessions } from '../src/controllers/clinical.controller.js';
import { ClinicalSessionState } from '../src/modules/questionEngine/clinicalState.js';
import { buildCanonicalClinicalSummary, generateVerbalSummary } from '../src/modules/questionEngine/clinicalSummaryBuilder.js';

describe('Phase 8.1 Verbal Clinical Summary Suite', () => {
  beforeEach(async () => {
    activeSessions.clear();
  });

  // TEST 1: Knee pain case produces coherent summary
  it('TEST 1: produces a coherent natural-language verbal summary for Knee Pain', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-1', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'I have severe pain in my right knee',
      normalizedValue: 'knee_pain',
      inputMethod: 'VOICE',
      source: 'PATIENT_VOICE',
    });
    state.collectedFacts['symptom.pain.knee.location'] = {
      concept: 'symptom.pain.knee',
      attribute: 'location',
      value: 'knee',
      status: 'PRESENT',
      source: 'PATIENT_VOICE',
    };
    state.recordResponse({
      question: { id: 'q.pain.duration', concept: 'symptom.pain.knee', attribute: 'duration' },
      rawResponse: '4 days',
      normalizedValue: { value: 4, unit: 'days' },
      inputMethod: 'TOUCH',
      source: 'PATIENT_TOUCH',
    });

    const summary = state.getClinicalSummary();

    expect(summary.verbalSummary).toBeDefined();
    expect(typeof summary.verbalSummary).toBe('string');
    expect(summary.verbalSummary.toLowerCase()).toContain('knee');
    expect(summary.verbalSummary).toContain('4 days');
    expect(summary.verbalSummaryDetails.wordCount).toBeGreaterThan(25);
  });

  // TEST 2: Duration included accurately
  it('TEST 2: accurately reflects range-based duration in verbal summary', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-2', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
      source: 'PATIENT_TOUCH',
    });
    state.collectedFacts['symptom.pain.duration'] = {
      concept: 'symptom.pain',
      attribute: 'duration',
      value: { min: 3, max: 5, unit: 'days' },
      status: 'PRESENT',
      source: 'PATIENT_TOUCH',
    };

    const summary = state.getClinicalSummary();
    expect(summary.verbalSummary).toContain('3–5 days');
  });

  // TEST 3: Severity included when verified
  it('TEST 3: includes verified severity level in the verbal summary', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-3', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain', attribute: 'complaint_type' },
      rawResponse: 'chest discomfort',
      normalizedValue: 'chest_pain',
      inputMethod: 'TOUCH',
    });
    state.collectedFacts['symptom.pain.severity'] = {
      concept: 'symptom.pain',
      attribute: 'severity',
      value: { level: 'moderate', score: 5 },
      status: 'PRESENT',
      source: 'PATIENT_TOUCH',
    };

    const summary = state.getClinicalSummary();
    expect(summary.verbalSummary).toContain('moderate severity');
  });

  // TEST 4: Associated symptoms included when present
  it('TEST 4: mentions present associated symptoms', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-4', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });
    state.collectedFacts['symptom.swelling.joint'] = {
      concept: 'symptom.swelling',
      attribute: 'presence',
      value: true,
      status: 'PRESENT',
      source: 'PATIENT_TOUCH',
    };

    const summary = state.getClinicalSummary();
    expect(summary.verbalSummary.toLowerCase()).toContain('swelling');
  });

  // TEST 5: Explicit negative preserved
  it('TEST 5: explicitly mentions denied symptoms as negative, not as absent facts', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-5', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.dyspnea.presence', concept: 'symptom.dyspnea', attribute: 'presence' },
      rawResponse: 'No, I can breathe fine',
      normalizedValue: 'no',
      inputMethod: 'VOICE',
      status: 'ABSENT',
    });

    const summary = state.getClinicalSummary();
    expect(summary.verbalSummary.toLowerCase()).toContain('no breathing difficulty was reported');
  });

  // TEST 6: UNKNOWN remains unknown (not converted to negative)
  it('TEST 6: preserves UNKNOWN uncertainty and marks for clinician clarification', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-6', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.pain.radiation', concept: 'symptom.pain', attribute: 'radiation' },
      rawResponse: "I don't know",
      normalizedValue: 'unknown',
      status: 'UNKNOWN',
      inputMethod: 'VOICE',
    });

    const summary = state.getClinicalSummary();
    expect(summary.uncertainItems.length).toBeGreaterThan(0);
    expect(summary.verbalSummary).toContain('highlighted for doctor clarification');
    expect(summary.verbalSummary).not.toContain('No radiation was reported');
  });

  // TEST 7: NOT_PROVIDED remains not provided (unasked allergies is NOT "no known allergies")
  it('TEST 7: states that allergy details were not reported when question was never asked', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-7', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();
    expect(summary.allergies.status).toBe('NOT_PROVIDED');
    expect(summary.verbalSummary).not.toContain('No known drug allergies were reported');
    expect(summary.verbalSummary).toContain('No known allergies or current medications were provided');
  });

  // TEST 8: ZERO DIAGNOSIS GENERATED
  it('TEST 8: ENFORCES SAFETY INVARIANT: summary contains ZERO disease diagnoses', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-8', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'swollen red painful knee for 4 days',
      normalizedValue: 'knee_pain',
      inputMethod: 'VOICE',
    });

    const summary = state.getClinicalSummary();
    const forbidden = [
      'osteoarthritis',
      'septic arthritis',
      'rheumatoid arthritis',
      'pneumonia',
      'gastritis',
      'appendicitis',
      'viral infection',
      'bacterial infection',
      'ligament tear',
      'meniscus tear',
      'fracture',
    ];

    for (const term of forbidden) {
      expect(summary.verbalSummary.toLowerCase()).not.toContain(term);
    }
  });

  // TEST 9: ZERO PRESCRIPTION OR MEDICATION RECOMMENDATION
  it('TEST 9: ENFORCES SAFETY INVARIANT: summary contains ZERO prescriptions or drug recommendations', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-9', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'severe knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();
    const forbidden = [
      'should take',
      'take paracetamol',
      'prescribed',
      'recommend ibuprofen',
      'dose recommended',
      'suggest taking',
      'treatment plan',
    ];

    for (const term of forbidden) {
      expect(summary.verbalSummary.toLowerCase()).not.toContain(term);
    }
  });

  // TEST 10: ZERO TRIAGE OR CLINICAL DECISION RECOMMENDATIONS
  it('TEST 10: ENFORCES SAFETY INVARIANT: summary contains ZERO triage decisions', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-10', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.chest', attribute: 'complaint_type' },
      rawResponse: 'chest discomfort',
      normalizedValue: 'chest_pain',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();
    const forbidden = [
      'admit to icu',
      'emergency triage',
      'high priority triage',
      'immediate hospitalization',
      'needs surgery',
    ];

    for (const term of forbidden) {
      expect(summary.verbalSummary.toLowerCase()).not.toContain(term);
    }
  });

  // TEST 11: Patient correction updates the verbal summary paragraph
  it('TEST 11: updates the verbal summary paragraph when patient corrects an answer', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-11', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.pain.duration', concept: 'symptom.pain.knee', attribute: 'duration' },
      rawResponse: '4 days',
      normalizedValue: { value: 4, unit: 'days' },
      inputMethod: 'TOUCH',
    });

    const summary1 = state.getClinicalSummary();
    expect(summary1.verbalSummary).toContain('4 days');

    // Patient corrects to 7 days
    state.updateResponse({
      questionId: 'q.pain.duration',
      newResponse: '7 days',
      normalizedValue: { value: 7, unit: 'days' },
      inputMethod: 'TOUCH',
      language: 'en',
    });

    const summary2 = state.getClinicalSummary();
    expect(summary2.verbalSummary).toContain('7 days');
    expect(summary2.verbalSummary).not.toContain('4 days');
    expect(summary2.summaryVersion).toBe(2);
  });

  // TEST 12: Multilingual rendering (en, hi, mr)
  it('TEST 12: generates natural, idiomatically accurate verbal summaries in mr, hi, and en', () => {
    const stateMr = new ClinicalSessionState({ sessionId: 's-verbal-12-mr', language: 'mr' });
    stateMr.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'माझे गुडघे दुखत आहेत',
      normalizedValue: 'knee_pain',
      inputMethod: 'VOICE',
    });
    stateMr.recordResponse({
      question: { id: 'q.pain.duration', concept: 'symptom.pain.knee', attribute: 'duration' },
      rawResponse: '४ दिवस',
      normalizedValue: { value: 4, unit: 'days' },
      inputMethod: 'TOUCH',
    });

    const summaryMr = stateMr.getClinicalSummary([], { language: 'mr' });
    expect(summaryMr.verbalSummary).toContain('रुग्णाने');
    expect(summaryMr.verbalSummary).toContain('४ दिवस');
    expect(summaryMr.verbalSummary).toContain('गुडघेदुखी');
    expect(summaryMr.verbalSummaryDetails.language).toBe('mr');

    const stateHi = new ClinicalSessionState({ sessionId: 's-verbal-12-hi', language: 'hi' });
    stateHi.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'घुटने में दर्द है',
      normalizedValue: 'knee_pain',
      inputMethod: 'VOICE',
    });
    stateHi.recordResponse({
      question: { id: 'q.pain.duration', concept: 'symptom.pain.knee', attribute: 'duration' },
      rawResponse: '4 दिन',
      normalizedValue: { value: 4, unit: 'days' },
      inputMethod: 'TOUCH',
    });

    const summaryHi = stateHi.getClinicalSummary([], { language: 'hi' });
    expect(summaryHi.verbalSummary).toContain('मरीज ने');
    expect(summaryHi.verbalSummary).toContain('घुटने के दर्द');
    expect(summaryHi.verbalSummaryDetails.language).toBe('hi');
  });

  // TEST 13: Same summary included in submit payload
  it('TEST 13: ensures doctor submission payload contains the exact same verbal summary', async () => {
    const sessionRes = await request(app)
      .post('/api/clinical/sessions')
      .send({ language: 'en', opdMode: 'GENERAL' });
    const sessionId = sessionRes.body.data.sessionId;

    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.chief_complaint',
        rawResponse: 'Knee pain',
        normalizedValue: 'knee_pain',
        inputMethod: 'TOUCH',
        language: 'en',
      });

    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.duration',
        rawResponse: '5 days',
        normalizedValue: { value: 5, unit: 'days' },
        inputMethod: 'TOUCH',
        language: 'en',
      });

    const summaryRes = await request(app)
      .get(`/api/clinical/sessions/${sessionId}/summary`);
    expect(summaryRes.status).toBe(200);
    const expectedVerbal = summaryRes.body.data.verbalSummary;
    expect(expectedVerbal).toBeDefined();

    const submitRes = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/submit`)
      .send({ verifiedByPatient: true, method: 'TOUCH_CHECKBOX' });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.verbalSummary).toBe(expectedVerbal);
    expect(submitRes.body.data.canonicalSummary.verbalSummary).toBe(expectedVerbal);
  });

  // TEST 14: Deterministic output
  it('TEST 14: produces 100% deterministic output given identical session state', () => {
    const state = new ClinicalSessionState({ sessionId: 's-verbal-14', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });
    state.collectedFacts['symptom.pain.duration'] = {
      concept: 'symptom.pain',
      attribute: 'duration',
      value: { value: 4, unit: 'days' },
      status: 'PRESENT',
      source: 'PATIENT_TOUCH',
    };

    const summaryA = state.getClinicalSummary();
    const summaryB = state.getClinicalSummary();

    expect(summaryA.verbalSummary).toBe(summaryB.verbalSummary);
    expect(summaryA.verbalSummaryDetails.wordCount).toBe(summaryB.verbalSummaryDetails.wordCount);
  });

  // TEST 15: Session isolation
  it('TEST 15: prevents any data from previous sessions from leaking into new verbal summaries', () => {
    const stateOld = new ClinicalSessionState({ sessionId: 's-old', language: 'en' });
    stateOld.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.chest', attribute: 'complaint_type' },
      rawResponse: 'chest pain',
      normalizedValue: 'chest_pain',
      inputMethod: 'TOUCH',
    });

    const stateNew = new ClinicalSessionState({ sessionId: 's-new', language: 'mr' });
    stateNew.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'माझे गुडघे दुखत आहेत',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });

    const summaryNew = stateNew.getClinicalSummary([], { language: 'mr' });
    expect(summaryNew.verbalSummary).not.toContain('chest');
    expect(summaryNew.verbalSummary).not.toContain('छातीत');
    expect(summaryNew.verbalSummary).toContain('गुडघेदुखी');
  });
});
