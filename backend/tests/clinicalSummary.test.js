import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { activeSessions } from '../src/controllers/clinical.controller.js';
import { ClinicalSessionState } from '../src/modules/questionEngine/clinicalState.js';
import { buildCanonicalClinicalSummary } from '../src/modules/questionEngine/clinicalSummaryBuilder.js';

describe('Phase 8 Clinical Summary & Patient-Verified Summary Suite', () => {
  beforeEach(async () => {
    activeSessions.clear();
  });

  // --------------------------------------------------------------------------
  // TEST 1: Knee Pain (Duration 4 days, no chest pain default)
  // --------------------------------------------------------------------------
  it('TEST 1: correctly identifies Knee pain with duration 4 days and NO chest pain default', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-1', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'I have knee pain for four days',
      normalizedValue: 'knee_pain',
      inputMethod: 'VOICE',
      source: 'PATIENT_VOICE',
    });
    state.recordResponse({
      question: { id: 'q.pain.duration', concept: 'symptom.pain.knee', attribute: 'duration' },
      rawResponse: 'four days',
      normalizedValue: { value: 4, unit: 'days' },
      inputMethod: 'VOICE',
      source: 'PATIENT_VOICE',
    });

    const summary = state.getClinicalSummary();

    expect(summary.primaryConcern).toBe('knee_pain');
    expect(summary.primaryConcernDetails.displayName).toBe('Knee Pain');
    expect(summary.duration.value).toBe(4);
    expect(summary.duration.unit).toBe('days');
    expect(summary.primaryConcern).not.toBe('chest_pain');
    expect(summary.primaryConcern).not.toBe('CHEST_PAIN');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Marathi Verbatim ("माझं गुडघं चार दिवसांपासून दुखतंय")
  // --------------------------------------------------------------------------
  it('TEST 2: Marathi verbatim response preserves raw patient statement and duration', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-2', language: 'mr' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'माझं गुडघं चार दिवसांपासून दुखतंय',
      normalizedValue: 'knee_pain',
      inputMethod: 'VOICE',
      source: 'PATIENT_VOICE',
      confidence: 0.96,
    });
    state.collectedFacts['symptom.pain.knee.duration'] = {
      concept: 'symptom.pain.knee',
      attribute: 'duration',
      value: 4,
      unit: 'days',
      status: 'PRESENT',
      source: 'PATIENT_VOICE',
      raw: 'चार दिवस',
      recordedAt: new Date().toISOString(),
    };

    const summary = state.getClinicalSummary([], { language: 'mr' });

    expect(summary.primaryConcern).toBe('knee_pain');
    expect(summary.primaryConcernDetails.originalWording).toBe('माझं गुडघं चार दिवसांपासून दुखतंय');
    expect(summary.primaryConcernDetails.source).toBe('PATIENT_VOICE');
    expect(summary.duration.value).toBe(4);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Hindi Verbatim ("मुझे तीन दिन से बुखार है")
  // --------------------------------------------------------------------------
  it('TEST 3: Hindi verbatim response correctly resolves fever and 3 days duration', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-3', language: 'hi' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.fever', attribute: 'complaint_type' },
      rawResponse: 'मुझे तीन दिन से बुखार है',
      normalizedValue: 'fever',
      inputMethod: 'VOICE',
      source: 'PATIENT_VOICE',
    });
    state.collectedFacts['symptom.fever.duration'] = {
      concept: 'symptom.fever',
      attribute: 'duration',
      value: 3,
      unit: 'days',
      status: 'PRESENT',
      source: 'PATIENT_VOICE',
      raw: 'तीन दिन',
      recordedAt: new Date().toISOString(),
    };

    const summary = state.getClinicalSummary([], { language: 'hi' });

    expect(summary.primaryConcern).toBe('fever');
    expect(summary.primaryConcernDetails.originalWording).toBe('मुझे तीन दिन से बुखार है');
    expect(summary.duration.value).toBe(3);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Primary Concern vs Additional Symptoms Distinction
  // --------------------------------------------------------------------------
  it('TEST 4: separates primary concern from additional symptoms without overwriting chief complaint', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-4', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'I have knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'VOICE',
      source: 'PATIENT_VOICE',
    });
    // Add additional symptom (fatigue)
    state.collectedFacts['symptom.fatigue.presence'] = {
      concept: 'symptom.fatigue',
      attribute: 'presence',
      value: 'present',
      status: 'PRESENT',
      source: 'PATIENT_VOICE',
      raw: 'also feel tired',
      recordedAt: new Date().toISOString(),
    };

    const summary = state.getClinicalSummary();

    expect(summary.primaryConcern).toBe('knee_pain');
    expect(summary.primaryConcernDetails.displayName).toBe('Knee Pain');
    // Verify fatigue is in associatedSymptoms, NOT primaryConcern
    const fatigue = summary.associatedSymptoms.find((s) => s.concept === 'symptom.fatigue');
    expect(fatigue).toBeDefined();
    expect(fatigue.status).toBe('PRESENT');
    expect(summary.primaryConcern).not.toBe('fatigue');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Negative Symptom (ABSENT vs NOT_PROVIDED)
  // --------------------------------------------------------------------------
  it('TEST 5: records explicitly denied symptom as ABSENT, not as "not provided"', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-5', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.cough', attribute: 'complaint_type' },
      rawResponse: 'cough',
      normalizedValue: 'cough',
    });
    state.recordResponse({
      question: { id: 'q.fever.presence', concept: 'symptom.fever', attribute: 'presence' },
      rawResponse: "I don't have fever",
      normalizedValue: 'ABSENT',
      source: 'PATIENT_VOICE',
    });

    const summary = state.getClinicalSummary();

    const fever = summary.associatedSymptoms.find((s) => s.concept.includes('fever'));
    expect(fever).toBeDefined();
    expect(fever.status).toBe('ABSENT');
    expect(fever.status).not.toBe('NOT_PROVIDED');
    expect(fever.status).not.toBe('UNKNOWN');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Unknown Symptom (UNKNOWN distinct from ABSENT)
  // --------------------------------------------------------------------------
  it('TEST 6: records uncertain answer as UNKNOWN, keeping it distinct from ABSENT', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-6', language: 'mr' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.headache', attribute: 'complaint_type' },
      rawResponse: 'डोकेदुखी',
      normalizedValue: 'headache',
    });
    state.recordResponse({
      question: { id: 'q.fever.presence', concept: 'symptom.fever', attribute: 'presence' },
      rawResponse: 'माहित नाही',
      normalizedValue: 'UNKNOWN',
    });

    const summary = state.getClinicalSummary();

    const fever = summary.associatedSymptoms.find((s) => s.concept.includes('fever'));
    expect(fever).toBeDefined();
    expect(fever.status).toBe('UNKNOWN');
    expect(fever.status).not.toBe('ABSENT');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Range Duration Preservation (6-7 days, not 7)
  // --------------------------------------------------------------------------
  it('TEST 7: preserves duration range (6–7 days) without collapsing into single arbitrary 7 days', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-7', language: 'mr' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: '६-७ दिवसांपासून दुखतंय',
      normalizedValue: 'knee_pain',
    });
    state.collectedFacts['symptom.pain.knee.duration'] = {
      concept: 'symptom.pain.knee',
      attribute: 'duration',
      value: { min: 6, max: 7, unit: 'days' },
      status: 'PRESENT',
      source: 'PATIENT_VOICE',
      raw: '६-७ दिवस',
      recordedAt: new Date().toISOString(),
    };

    const summary = state.getClinicalSummary();

    expect(summary.duration).toEqual({ min: 6, max: 7, unit: 'days' });
    expect(summary.durationDetails.min).toBe(6);
    expect(summary.durationDetails.max).toBe(7);
    expect(summary.durationDetails.display).toBe('6–7 days');
    expect(summary.duration.value).not.toBe(7);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Missing Duration -> NOT_PROVIDED
  // --------------------------------------------------------------------------
  it('TEST 8: missing duration returns null and NOT_PROVIDED status, never defaults to 7 days', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-8', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'I have knee pain',
      normalizedValue: 'knee_pain',
    });

    const summary = state.getClinicalSummary();

    expect(summary.duration).toBeNull();
    expect(summary.durationDetails.status).toBe('NOT_PROVIDED');
    expect(summary.durationDetails.display).toBe('Not provided');
  });

  // --------------------------------------------------------------------------
  // TEST 9: Missing Severity -> NOT_PROVIDED (Never defaulted)
  // --------------------------------------------------------------------------
  it('TEST 9: missing severity returns null and NOT_PROVIDED, never defaulting to moderate or mild', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-9', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
    });

    const summary = state.getClinicalSummary();

    expect(summary.severity).toBeNull();
    expect(summary.severityDetails.status).toBe('NOT_PROVIDED');
    expect(summary.severityDetails.display).toBe('Not reported');
  });

  // --------------------------------------------------------------------------
  // TEST 10: Unspecified Laterality (Knee, never guessed left/right)
  // --------------------------------------------------------------------------
  it('TEST 10: knee pain without laterality stays "knee", never guessing left or right knee', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-10', language: 'en' });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
    });
    state.collectedFacts['symptom.pain.knee.location'] = {
      concept: 'symptom.pain.knee',
      attribute: 'location',
      value: 'knee',
      status: 'PRESENT',
      source: 'PATIENT_VOICE',
      recordedAt: new Date().toISOString(),
    };

    const summary = state.getClinicalSummary();

    expect(summary.location).toBe('knee');
    expect(summary.locationDetails.value).toBe('knee');
    expect(summary.locationDetails.laterality).toBeNull();
    expect(summary.locationDetails.value).not.toBe('left knee');
    expect(summary.locationDetails.value).not.toBe('right knee');
  });

  // --------------------------------------------------------------------------
  // TEST 11: Document Medication (Source: DOCUMENT vs PATIENT)
  // --------------------------------------------------------------------------
  it('TEST 11: extracted document medication is strictly tagged with source DOCUMENT', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-11', language: 'en' });
    const docs = [
      {
        id: 'doc-101',
        documentType: 'PRESCRIPTION',
        fileName: 'prescription.jpg',
        confidence: 0.94,
        extractedData: {
          medications: [
            {
              drugName: 'Paracetamol',
              dose: '650 mg',
              frequency: '1-0-1',
              duration: '3 days',
              confidence: 0.95,
            },
          ],
        },
      },
    ];

    const summary = state.getClinicalSummary(docs);

    expect(summary.medications.documentExtracted).toHaveLength(1);
    const med = summary.medications.documentExtracted[0];
    expect(med.drugName).toBe('Paracetamol');
    expect(med.dose).toBe('650 mg');
    expect(med.source).toBe('DOCUMENT');
    expect(summary.medications.patientReported).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // TEST 12: Source Conflict Detection (Patient 500mg vs Doc 650mg)
  // --------------------------------------------------------------------------
  it('TEST 12: flags discrepancy when patient report differs from uploaded prescription without overwriting', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-12', language: 'en' });
    state.collectedFacts['history.medication.medications'] = {
      concept: 'history.medication',
      attribute: 'medications',
      value: ['Paracetamol 500 mg'],
      status: 'PRESENT',
      source: 'PATIENT_REPORTED',
      recordedAt: new Date().toISOString(),
    };

    const docs = [
      {
        id: 'doc-conflict',
        documentType: 'PRESCRIPTION',
        fileName: 'rx.jpg',
        confidence: 0.92,
        extractedData: {
          medications: [
            {
              drugName: 'Paracetamol',
              dose: '650 mg',
              frequency: '1-0-1',
              duration: '5 days',
            },
          ],
        },
      },
    ];

    const summary = state.getClinicalSummary(docs);

    expect(summary.medications.patientReported).toHaveLength(1);
    expect(summary.medications.documentExtracted).toHaveLength(1);
    expect(summary.medications.conflicts).toHaveLength(1);

    const conflict = summary.medications.conflicts[0];
    expect(conflict.drugName).toBe('Paracetamol');
    expect(conflict.patientReported.dose).toBe('500 mg');
    expect(conflict.documentReported.dose).toBe('650 mg');
    expect(conflict.flag).toBe('DISCREPANCY_DETECTED');

    // Also verify it was placed in uncertainItems for human review
    const uncertainMed = summary.uncertainItems.find((u) => u.type === 'MEDICATION_DISCREPANCY');
    expect(uncertainMed).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // TEST 13: Answer Correction Flow & Invalidation of Stale Facts
  // --------------------------------------------------------------------------
  it('TEST 13: patient correction updates summary and invalidates stale facts', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-13', language: 'en' });
    state.recordAskedQuestion({ id: 'q.pain.location', text: 'Where does it hurt?' });

    // Initial answer: chest
    state.recordResponse({
      question: { id: 'q.pain.location', concept: 'symptom.pain.chest', attribute: 'location' },
      rawResponse: 'chest',
      normalizedValue: 'chest',
    });
    state.collectedFacts['symptom.pain.chest.radiation'] = {
      concept: 'symptom.pain.chest',
      attribute: 'radiation',
      value: 'left arm',
      status: 'PRESENT',
    };

    expect(state.collectedFacts['symptom.pain.chest.radiation']).toBeDefined();

    // Patient corrects location to right knee
    state.updateResponse({
      questionId: 'q.pain.location',
      newResponse: 'knee',
      normalizedValue: 'knee',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();

    expect(summary.location).toBe('knee');
    // Stale chest radiation fact must be pruned!
    expect(state.collectedFacts['symptom.pain.chest.radiation']).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // TEST 14: Strict Cross-Session Isolation
  // --------------------------------------------------------------------------
  it('TEST 14: strictly isolates clinical sessions: Patient B summary contains ZERO Patient A facts', () => {
    const sessionA = new ClinicalSessionState({ sessionId: 'patient-A', language: 'mr' });
    sessionA.primaryConcern = 'knee_pain';
    sessionA.collectedFacts['symptom.pain.knee.location'] = {
      concept: 'symptom.pain.knee',
      attribute: 'location',
      value: 'knee',
      status: 'PRESENT',
    };

    const sessionB = new ClinicalSessionState({ sessionId: 'patient-B', language: 'hi' });
    sessionB.primaryConcern = 'diarrhea';
    sessionB.collectedFacts['symptom.diarrhea.duration'] = {
      concept: 'symptom.diarrhea',
      attribute: 'duration',
      value: 2,
      unit: 'days',
      status: 'PRESENT',
    };

    const summaryA = sessionA.getClinicalSummary();
    const summaryB = sessionB.getClinicalSummary();

    expect(summaryA.primaryConcern).toBe('knee_pain');
    expect(summaryB.primaryConcern).toBe('diarrhea');

    // Patient B has ZERO facts from Patient A
    expect(summaryB.symptoms.some((s) => s.concept.includes('knee'))).toBe(false);
    expect(summaryB.location).toBeNull();
  });

  // --------------------------------------------------------------------------
  // TEST 15: Zero Diagnosis Invariant
  // --------------------------------------------------------------------------
  it('TEST 15: strictly enforces zero-diagnosis invariant: cough + fever never produces pneumonia/infection', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-15', language: 'en' });
    state.primaryConcern = 'cough';
    state.collectedFacts['symptom.cough.presence'] = {
      concept: 'symptom.cough',
      attribute: 'presence',
      value: 'present',
      status: 'PRESENT',
    };
    state.collectedFacts['symptom.fever.presence'] = {
      concept: 'symptom.fever',
      attribute: 'presence',
      value: 'present',
      status: 'PRESENT',
    };

    const summary = state.getClinicalSummary();

    const summaryJson = JSON.stringify(summary).toLowerCase();
    expect(summaryJson).not.toContain('pneumonia');
    expect(summaryJson).not.toContain('viral infection');
    expect(summaryJson).not.toContain('bronchitis');
    expect(summaryJson).not.toContain('tuberculosis');
    expect(summary.metadata.safetyInvariants.diagnosisEngine).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST 16: Performance Benchmark (<100ms deterministic construction)
  // --------------------------------------------------------------------------
  it('TEST 16: deterministic summary construction executes in <100ms', () => {
    const state = new ClinicalSessionState({ sessionId: 's-test-perf', language: 'mr' });
    state.primaryConcern = 'knee_pain';
    for (let i = 0; i < 20; i++) {
      state.collectedFacts[`symptom.test_${i}.presence`] = {
        concept: `symptom.test_${i}`,
        attribute: 'presence',
        value: i % 2 === 0 ? 'yes' : 'no',
        status: i % 2 === 0 ? 'PRESENT' : 'ABSENT',
        recordedAt: new Date().toISOString(),
      };
    }

    const t0 = performance.now();
    const summary = state.getClinicalSummary();
    const t1 = performance.now();

    const latency = t1 - t0;
    expect(latency).toBeLessThan(100);
    expect(summary.metadata.generationLatencyMs).toBeLessThan(100);
  });

  // --------------------------------------------------------------------------
  // TEST 17: Full End-to-End MediKiosk Journey (Section 50)
  // --------------------------------------------------------------------------
  it('TEST 17: executes complete End-to-End MediKiosk journey from Marathi complaint to correction and submission', async () => {
    // 1. Initialize session in Marathi (General Medicine)
    const initRes = await request(app)
      .post('/api/clinical/sessions')
      .send({ language: 'mr', opdMode: 'GENERAL' });
    expect(initRes.status).toBe(201);
    const sessionId = initRes.body.data.sessionId;

    // 2. Chief complaint: "माझं गुडघं चार दिवसांपासून दुखतंय"
    const ccRes = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.chief_complaint',
        rawResponse: 'माझं गुडघं चार दिवसांपासून दुखतंय',
        normalizedValue: 'knee_pain',
        inputMethod: 'VOICE',
        language: 'mr',
      });
    expect(ccRes.status).toBe(200);

    // 3. Dynamic duration response: 4 days
    const durRes = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.duration',
        rawResponse: '४ दिवस',
        normalizedValue: { value: 4, unit: 'days' },
        inputMethod: 'TOUCH',
        language: 'mr',
      });
    expect(durRes.status).toBe(200);

    // 4. Upload prescription document with OCR extraction
    await prisma.medicalDocument.create({
      data: {
        sessionId,
        documentType: 'PRESCRIPTION',
        fileName: 'prescription.png',
        mimeType: 'image/png',
        fileSizeBytes: 1024,
        ocrText: 'Paracetamol 650 mg 1-0-1',
        extractedData: {
          documentType: 'PRESCRIPTION',
          medications: [
            { drugName: 'Paracetamol', dose: '650 mg', frequency: '1-0-1' },
          ],
        },
        confidence: 0.95,
        processingStatus: 'PROCESSED',
      },
    });

    // 5. Fetch canonical clinical summary
    const summaryRes1 = await request(app)
      .get(`/api/clinical/sessions/${sessionId}/summary`);
    expect(summaryRes1.status).toBe(200);
    expect(summaryRes1.body.data.primaryConcern).toBe('knee_pain');
    expect(summaryRes1.body.data.primaryConcernDetails.originalWording).toBe('माझं गुडघं चार दिवसांपासून दुखतंय');
    expect(summaryRes1.body.data.duration.value).toBe(4);
    expect(summaryRes1.body.data.medications.documentExtracted).toHaveLength(1);

    // 6. Patient correction: Change duration from 4 days to 6 days
    const patchRes = await request(app)
      .patch(`/api/clinical/sessions/${sessionId}/responses/q.pain.duration`)
      .send({
        newResponse: '६ दिवस',
        normalizedValue: { value: 6, unit: 'days' },
        inputMethod: 'TOUCH',
        language: 'mr',
      });
    expect(patchRes.status).toBe(200);

    // 7. Re-fetch summary to verify refresh and stale fact pruning
    const summaryRes2 = await request(app)
      .get(`/api/clinical/sessions/${sessionId}/summary`);
    expect(summaryRes2.status).toBe(200);
    expect(summaryRes2.body.data.duration.value).toBe(6);
    expect(summaryRes2.body.data.duration.value).not.toBe(4);

    // 8. Final patient review & submission to clinician
    const submitRes = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/submit`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.canonicalSummary).toBeDefined();
    expect(submitRes.body.data.canonicalSummary.primaryConcern).toBe('knee_pain');
    expect(submitRes.body.data.canonicalSummary.duration.value).toBe(6);
  });
});
