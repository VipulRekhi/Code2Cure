import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { activeSessions } from '../src/controllers/clinical.controller.js';
import { ClinicalSessionState } from '../src/modules/questionEngine/clinicalState.js';
import { QuestionEngine } from '../src/modules/questionEngine/questionEngine.js';
import { QuestionSelector } from '../src/modules/questionEngine/questionSelector.js';
import { QUESTION_CATALOG, getQuestionById } from '../src/modules/questionEngine/questionCatalog.js';
import { buildCanonicalClinicalSummary, generateVerbalSummary } from '../src/modules/questionEngine/clinicalSummaryBuilder.js';

describe('Phase 9: AYUSH History Mode & Dashavidha Pariksha Test Suite', () => {
  beforeEach(() => {
    activeSessions.clear();
  });

  // --------------------------------------------------------------------------
  // PART 1: CATALOG VERIFICATION
  // --------------------------------------------------------------------------
  it('TEST 1: QUESTION_CATALOG contains all 10 Dashavidha Pariksha questions', () => {
    const dashavidhaIds = [
      'q.ayush.prakriti',
      'q.ayush.vikriti',
      'q.ayush.sara',
      'q.ayush.samhanana',
      'q.ayush.pramana',
      'q.ayush.satmya',
      'q.ayush.sattva',
      'q.ayush.ahara_shakti',
      'q.ayush.vyayama_shakti',
      'q.ayush.vaya',
    ];

    dashavidhaIds.forEach((id) => {
      const q = getQuestionById(id);
      expect(q, `Question ${id} should exist in catalog`).toBeDefined();
      expect(q.concept).toBe('ayush.dashavidha');
      expect(q.text.en).toBeDefined();
      expect(q.text.mr).toBeDefined();
      expect(q.text.hi).toBeDefined();
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('TEST 2: QUESTION_CATALOG contains all 4 Ahara-Vihara questions', () => {
    const aharaViharaIds = [
      'q.ayush.ahara_diet',
      'q.ayush.ahara_bowel',
      'q.ayush.vihara_sleep',
      'q.ayush.vihara_activity',
    ];

    aharaViharaIds.forEach((id) => {
      const q = getQuestionById(id);
      expect(q, `Question ${id} should exist in catalog`).toBeDefined();
      expect(q.concept).toBe('ayush.ahara_vihara');
      expect(q.text.en).toBeDefined();
      expect(q.text.mr).toBeDefined();
      expect(q.text.hi).toBeDefined();
      expect(q.options.length).toBeGreaterThanOrEqual(4);
    });
  });

  // --------------------------------------------------------------------------
  // PART 2: GENERAL VS AYUSH MODE SEPARATION & QUESTION SELECTOR
  // --------------------------------------------------------------------------
  it('TEST 3: In GENERAL mode, zero AYUSH questions are ever eligible or asked', () => {
    const selector = new QuestionSelector();
    const generalSession = new ClinicalSessionState({
      sessionId: 'sess-gen-1',
      opdMode: 'GENERAL',
      language: 'en',
    });

    generalSession.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain', attribute: 'complaint_type' },
      rawResponse: 'Knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });

    const eligibleIds = selector.getEligibleQuestionIds(generalSession);
    const ayushQuestions = Array.from(eligibleIds).filter((id) => id.startsWith('q.ayush.'));
    expect(ayushQuestions.length).toBe(0);
  });

  it('TEST 4: In AYUSH mode, all 14 AYUSH questions become eligible after chief complaint', () => {
    const selector = new QuestionSelector();
    const ayushSession = new ClinicalSessionState({
      sessionId: 'sess-ayush-1',
      opdMode: 'AYUSH',
      language: 'en',
    });

    // Before CC, only CC is eligible
    const initialEligible = selector.getEligibleQuestionIds(ayushSession);
    expect(initialEligible.has('q.chief_complaint')).toBe(true);
    expect(initialEligible.has('q.ayush.prakriti')).toBe(false);

    // After CC answered, AYUSH questions are enabled
    ayushSession.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain', attribute: 'complaint_type' },
      rawResponse: 'Knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });

    const eligibleIds = selector.getEligibleQuestionIds(ayushSession);
    expect(eligibleIds.has('q.ayush.prakriti')).toBe(true);
    expect(eligibleIds.has('q.ayush.vikriti')).toBe(true);
    expect(eligibleIds.has('q.ayush.ahara_shakti')).toBe(true);
    expect(eligibleIds.has('q.ayush.ahara_diet')).toBe(true);
    expect(eligibleIds.has('q.ayush.ahara_bowel')).toBe(true);
    expect(eligibleIds.has('q.ayush.vihara_sleep')).toBe(true);
    expect(eligibleIds.has('q.ayush.vihara_activity')).toBe(true);
  });

  // --------------------------------------------------------------------------
  // PART 3: ENGINE QUESTION SEQUENCING & TRANSITION
  // --------------------------------------------------------------------------
  it('TEST 5: Engine transitions into AYUSH catalog questions when LLM completes intake in AYUSH mode', async () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-seq-1',
      opdMode: 'AYUSH',
      language: 'en',
    });
    const engine = new QuestionEngine(state);

    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });

    // Fill general history questions
    state.recordResponse({
      question: { id: 'q.history.conditions', concept: 'history.past_condition', attribute: 'conditions' },
      rawResponse: 'NONE',
      normalizedValue: 'NONE',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.history.allergies', concept: 'history.allergy', attribute: 'allergies' },
      rawResponse: 'NO_ALLERGIES',
      normalizedValue: 'NO_ALLERGIES',
      inputMethod: 'TOUCH',
    });

    // 1. Acute HPI runs first via dynamic LLM
    const hpiQ = await engine.getNextQuestionDynamic('en');
    expect(hpiQ.status).toBe('question');
    expect(hpiQ.source).toBe('LLM_DYNAMIC');

    // 2. Simulate intake completion by completing dynamic question quota
    for (let i = 0; i < 7; i++) {
      state.completedQuestionIds.add(`dyn.symptom.detail_${i}`);
    }

    // 3. Now next question seamlessly transitions into AYUSH catalog
    const nextQ = await engine.getNextQuestionDynamic('en');
    expect(nextQ.status).toBe('question');
    expect(nextQ.question.id).toMatch(/^q\.ayush\./);
  });

  it('TEST 6: Engine in AYUSH mode walks sequentially through Dashavidha and Ahara-Vihara', async () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-seq-2',
      opdMode: 'AYUSH',
      language: 'en',
    });
    const engine = new QuestionEngine(state);

    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'joint pain',
      normalizedValue: 'pain',
      inputMethod: 'TOUCH',
    });
    state.completedQuestionIds.add('q.history.conditions');
    state.completedQuestionIds.add('q.history.allergies');

    // Fetch next AYUSH question
    const q1 = await engine.getNextQuestionDynamic('en');
    expect(q1.question.id).toBe('q.ayush.prakriti');

    // Answer prakriti
    state.recordResponse({
      question: q1.question,
      rawResponse: 'vata_dominant',
      normalizedValue: 'vata_dominant',
      inputMethod: 'TOUCH',
    });

    // Next must be vikriti
    const q2 = await engine.getNextQuestionDynamic('en');
    expect(q2.question.id).toBe('q.ayush.vikriti');
  });

  // --------------------------------------------------------------------------
  // PART 4: CANONICAL SUMMARY STRUCTURE & INVARIANTS
  // --------------------------------------------------------------------------
  it('TEST 7: Non-AYUSH session produces summary with ayushAssessment as null', () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-summary-gen',
      opdMode: 'GENERAL',
      language: 'en',
    });
    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain.knee', attribute: 'complaint_type' },
      rawResponse: 'knee pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();
    expect(summary.ayushAssessment).toBeNull();
  });

  it('TEST 8: AYUSH session produces rich structured ayushAssessment object with dashavidha and aharaVihara', () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-summary-ayush',
      opdMode: 'AYUSH',
      language: 'en',
    });

    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain', attribute: 'complaint_type' },
      rawResponse: 'stiff joints and lethargy',
      normalizedValue: 'pain',
      inputMethod: 'TOUCH',
    });

    // Record AYUSH answers
    state.recordResponse({
      question: { id: 'q.ayush.prakriti', concept: 'ayush.dashavidha', attribute: 'prakriti' },
      rawResponse: 'vata_dominant',
      normalizedValue: 'vata_dominant',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.vikriti', concept: 'ayush.dashavidha', attribute: 'vikriti' },
      rawResponse: 'dryness_pain_stiffness',
      normalizedValue: 'dryness_pain_stiffness',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.ahara_shakti', concept: 'ayush.dashavidha', attribute: 'ahara_shakti' },
      rawResponse: 'mandagni',
      normalizedValue: 'mandagni',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.ahara_diet', concept: 'ayush.ahara_vihara', attribute: 'diet_pattern' },
      rawResponse: 'vegetarian_fresh',
      normalizedValue: 'vegetarian_fresh',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.ahara_bowel', concept: 'ayush.ahara_vihara', attribute: 'bowel_pattern' },
      rawResponse: 'constipated_hard',
      normalizedValue: 'constipated_hard',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.vihara_sleep', concept: 'ayush.ahara_vihara', attribute: 'sleep_pattern' },
      rawResponse: 'disturbed_insomnia',
      normalizedValue: 'disturbed_insomnia',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();
    expect(summary.ayushAssessment).toBeDefined();
    expect(summary.ayushAssessment.opdMode).toBe('AYUSH');
    expect(summary.ayushAssessment.dashavidha).toBeDefined();
    expect(summary.ayushAssessment.aharaVihara).toBeDefined();

    // Check specific parameters
    expect(summary.ayushAssessment.dashavidha.prakriti.value).toBe('vata_dominant');
    expect(summary.ayushAssessment.dashavidha.prakriti.status).toBe('PRESENT');
    expect(summary.ayushAssessment.dashavidha.vikriti.value).toBe('dryness_pain_stiffness');
    expect(summary.ayushAssessment.dashavidha.ahara_shakti.value).toBe('mandagni');
    expect(summary.ayushAssessment.aharaVihara.diet_pattern.value).toBe('vegetarian_fresh');
    expect(summary.ayushAssessment.aharaVihara.bowel_pattern.value).toBe('constipated_hard');
    expect(summary.ayushAssessment.aharaVihara.sleep_pattern.value).toBe('disturbed_insomnia');
  });

  // --------------------------------------------------------------------------
  // PART 5: CLINICAL SAFETY INVARIANTS (ZERO AUTONOMOUS DOSHA DIAGNOSIS / TREATMENT)
  // --------------------------------------------------------------------------
  it('TEST 9: Enforces safety invariants: zero autonomous diagnosis, zero prescription', () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-safety-1',
      opdMode: 'AYUSH',
      language: 'en',
    });

    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain', attribute: 'complaint_type' },
      rawResponse: 'bodyache',
      normalizedValue: 'pain',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.prakriti', concept: 'ayush.dashavidha', attribute: 'prakriti' },
      rawResponse: 'pitta_dominant',
      normalizedValue: 'pitta_dominant',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();

    // Explicit safety invariant flags
    expect(summary.ayushAssessment.metadata.safetyInvariants.doshaDiagnosisEngine).toBe(false);
    expect(summary.ayushAssessment.metadata.safetyInvariants.autonomousPrescription).toBe(false);
    expect(summary.ayushAssessment.metadata.safetyInvariants.isObservationalIntake).toBe(true);

    // Verbal summary must NOT contain diagnostic or prescription declarations
    const verbal = summary.verbalSummary.toLowerCase();
    expect(verbal).not.toContain('diagnosed with');
    expect(verbal).not.toContain('prescribed');
    expect(verbal).not.toContain('take churn');
    expect(verbal).not.toContain('decoction');
  });

  // --------------------------------------------------------------------------
  // PART 6: TRILINGUAL VERBAL NARRATIVE SYNTHESIS (EN, MR, HI)
  // --------------------------------------------------------------------------
  it('TEST 10: Verbal summary in English synthesizes natural AYUSH narrative without technical leak', () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-verbal-en',
      opdMode: 'AYUSH',
      language: 'en',
    });

    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain', attribute: 'complaint_type' },
      rawResponse: 'joint pain',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.prakriti', concept: 'ayush.dashavidha', attribute: 'prakriti' },
      rawResponse: 'vata_dominant',
      normalizedValue: 'vata_dominant',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.ahara_shakti', concept: 'ayush.dashavidha', attribute: 'ahara_shakti' },
      rawResponse: 'tikshnagni',
      normalizedValue: 'tikshnagni',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.vihara_sleep', concept: 'ayush.ahara_vihara', attribute: 'sleep_pattern' },
      rawResponse: 'sound_restful',
      normalizedValue: 'sound_restful',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();
    const verbal = summary.verbalSummary;

    expect(verbal).toContain('Ayurvedic intake evaluation');
    expect(verbal).toContain('Vata-predominant tendencies');
    expect(verbal).toContain('Tikshnagni');
    expect(verbal).toContain('sound, restful sleep');
    // Ensure raw technical enum strings are NOT leaked
    expect(verbal).not.toContain('vata_dominant');
    expect(verbal).not.toContain('sound_restful');
  });

  it('TEST 11: Verbal summary in Marathi (mr) synthesizes localized narrative without technical leak', () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-verbal-mr',
      opdMode: 'AYUSH',
      language: 'mr',
    });

    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain', attribute: 'complaint_type' },
      rawResponse: 'गुडघेदुखी',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.prakriti', concept: 'ayush.dashavidha', attribute: 'prakriti' },
      rawResponse: 'pitta_dominant',
      normalizedValue: 'pitta_dominant',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.ahara_shakti', concept: 'ayush.dashavidha', attribute: 'ahara_shakti' },
      rawResponse: 'samagni',
      normalizedValue: 'samagni',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.ahara_bowel', concept: 'ayush.ahara_vihara', attribute: 'bowel_pattern' },
      rawResponse: 'regular_clear',
      normalizedValue: 'regular_clear',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();
    const verbal = summary.verbalSummary;

    expect(verbal).toContain('आयुर्वेदिक दशविध परीक्षा व आहार-विहार नोंदीनुसार');
    expect(verbal).toContain('पित्त प्रवृत्ती');
    expect(verbal).toContain('समाग्नि');
    expect(verbal).not.toContain('pitta_dominant');
    expect(verbal).not.toContain('regular_clear');
  });

  it('TEST 12: Verbal summary in Hindi (hi) synthesizes localized narrative without technical leak', () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-verbal-hi',
      opdMode: 'AYUSH',
      language: 'hi',
    });

    state.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain', attribute: 'complaint_type' },
      rawResponse: 'जोड़ों का दर्द',
      normalizedValue: 'knee_pain',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.prakriti', concept: 'ayush.dashavidha', attribute: 'prakriti' },
      rawResponse: 'kapha_dominant',
      normalizedValue: 'kapha_dominant',
      inputMethod: 'TOUCH',
    });
    state.recordResponse({
      question: { id: 'q.ayush.ahara_shakti', concept: 'ayush.dashavidha', attribute: 'ahara_shakti' },
      rawResponse: 'vishamagni',
      normalizedValue: 'vishamagni',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();
    const verbal = summary.verbalSummary;

    expect(verbal).toContain('आयुर्वेदिक दशविध परीक्षा एवं आहार-विहार मूल्यांकन अनुसार');
    expect(verbal).toContain('कफ प्रवृत्ति');
    expect(verbal).toContain('विषमाग्नि');
    expect(verbal).not.toContain('kapha_dominant');
    expect(verbal).not.toContain('vishamagni');
  });

  // --------------------------------------------------------------------------
  // PART 7: PROVENANCE, UNCERTAINTY & EXPLICIT NEGATIVES
  // --------------------------------------------------------------------------
  it('TEST 13: AYUSH parameter preserves provenance (questionId, source, confidence)', () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-prov-1',
      opdMode: 'AYUSH',
      language: 'en',
    });

    state.recordResponse({
      question: { id: 'q.ayush.prakriti', concept: 'ayush.dashavidha', attribute: 'prakriti' },
      rawResponse: 'Lean build, dry skin',
      normalizedValue: 'vata_dominant',
      inputMethod: 'VOICE',
      source: 'PATIENT_VOICE',
      confidence: 0.94,
    });

    const summary = state.getClinicalSummary();
    const prakriti = summary.ayushAssessment.dashavidha.prakriti;

    expect(prakriti.questionId).toBe('q.ayush.prakriti');
    expect(prakriti.source).toBe('PATIENT_VOICE');
    expect(prakriti.confidence).toBe(0.94);
    expect(prakriti.status).toBe('PRESENT');
  });

  it('TEST 14: Handles patient uncertainty (unknown) in AYUSH parameters without guessing', () => {
    const state = new ClinicalSessionState({
      sessionId: 'sess-unk-1',
      opdMode: 'AYUSH',
      language: 'en',
    });

    state.recordResponse({
      question: { id: 'q.ayush.sara', concept: 'ayush.dashavidha', attribute: 'sara' },
      rawResponse: 'Not sure',
      normalizedValue: 'unknown',
      inputMethod: 'TOUCH',
    });

    const summary = state.getClinicalSummary();
    const sara = summary.ayushAssessment.dashavidha.sara;

    expect(sara.status).toBe('UNKNOWN');
    expect(sara.value).toBe('unknown');
  });

  // --------------------------------------------------------------------------
  // PART 8: API ENDPOINTS & DOCTOR SUBMISSION
  // --------------------------------------------------------------------------
  it('TEST 15: POST /api/clinical/sessions creates session with opdMode=AYUSH', async () => {
    const res = await request(app)
      .post('/api/clinical/sessions')
      .send({
        language: 'en',
        opdMode: 'AYUSH',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.opdMode).toBe('AYUSH');
    expect(res.body.data.next.question.id).toBe('q.chief_complaint');

    // Clean up
    await prisma.clinicalSession.delete({ where: { id: res.body.data.sessionId } }).catch(() => {});
  });

  it('TEST 16: POST /api/clinical/sessions/:id/submit contains ayushAssessment in doctor payload', async () => {
    // 1. Create AYUSH session
    const createRes = await request(app)
      .post('/api/clinical/sessions')
      .send({ language: 'en', opdMode: 'AYUSH' });

    const sessionId = createRes.body.data.sessionId;

    // 2. Answer Chief Complaint
    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.chief_complaint',
        rawResponse: 'Chronic knee joint pain',
        normalizedValue: 'knee_pain',
        inputMethod: 'TOUCH',
        language: 'en',
      });

    // 3. Answer an AYUSH question
    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.ayush.prakriti',
        rawResponse: 'Vata tendencies',
        normalizedValue: 'vata_dominant',
        inputMethod: 'TOUCH',
        language: 'en',
      });

    // 4. Submit to Doctor
    const submitRes = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/submit`)
      .send({});

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.doctorPayload.ayushAssessment).toBeDefined();
    expect(submitRes.body.data.doctorPayload.ayushAssessment.opdMode).toBe('AYUSH');
    expect(submitRes.body.data.doctorPayload.ayushAssessment.dashavidha.prakriti.value).toBe('vata_dominant');

    // Clean up
    await prisma.questionResponse.deleteMany({ where: { sessionId } }).catch(() => {});
    await prisma.clinicalSession.delete({ where: { id: sessionId } }).catch(() => {});
  });

  it('TEST 17: Consecutive sessions between GENERAL and AYUSH modes do not cross-contaminate', async () => {
    // Session 1: AYUSH
    const sAyush = new ClinicalSessionState({ sessionId: 's-iso-ayush', opdMode: 'AYUSH' });
    sAyush.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.pain', attribute: 'complaint_type' },
      rawResponse: 'pain',
      normalizedValue: 'pain',
      inputMethod: 'TOUCH',
    });
    sAyush.recordResponse({
      question: { id: 'q.ayush.prakriti', concept: 'ayush.dashavidha', attribute: 'prakriti' },
      rawResponse: 'vata_dominant',
      normalizedValue: 'vata_dominant',
      inputMethod: 'TOUCH',
    });

    // Session 2: GENERAL
    const sGeneral = new ClinicalSessionState({ sessionId: 's-iso-gen', opdMode: 'GENERAL' });
    sGeneral.recordResponse({
      question: { id: 'q.chief_complaint', concept: 'symptom.fever', attribute: 'complaint_type' },
      rawResponse: 'fever',
      normalizedValue: 'fever',
      inputMethod: 'TOUCH',
    });

    const sumAyush = sAyush.getClinicalSummary();
    const sumGen = sGeneral.getClinicalSummary();

    expect(sumAyush.ayushAssessment).not.toBeNull();
    expect(sumGen.ayushAssessment).toBeNull();
    expect(sumGen.completedQuestions).not.toContain('q.ayush.prakriti');
  });
});
