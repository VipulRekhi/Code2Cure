/**
 * Phase 6 Dynamic Clinical Questioning Test Suite
 * Validates dynamic question branching, multi-turn follow-ups, contextual duration,
 * and zero default fact leakage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClinicalSessionState, QuestionEngine } from '../src/modules/questionEngine/index.js';
import { clinicalExtractionService } from '../src/modules/ai/clinicalExtractionService.js';
import { dynamicQuestionService } from '../src/modules/ai/dynamicQuestionService.js';
import { questionGuardrails } from '../src/modules/questionEngine/questionGuardrails.js';

describe('Phase 6: Dynamic Clinical Questioning & Adaptive Intake', () => {
  let sessionState;
  let engine;

  beforeEach(() => {
    sessionState = new ClinicalSessionState({
      sessionId: `test-dyn-${Date.now()}`,
      language: 'mr',
    });
    engine = new QuestionEngine(sessionState);
  });

  it('Criteria 28, 29, 30: Different complaints produce distinct, non-generic dynamic questions', async () => {
    // 1. CHEST PAIN presentation
    const chestSession = new ClinicalSessionState({ sessionId: 'chest-sess', language: 'mr' });
    chestSession.collectedFacts['symptom.pain.chest.location'] = {
      concept: 'symptom.pain.chest',
      attribute: 'location',
      value: 'chest',
      status: 'PRESENT',
    };
    chestSession.primaryConcern = 'chest_pain';
    const chestEngine = new QuestionEngine(chestSession);

    const chestQ = await chestEngine.getNextQuestionDynamic('mr');
    expect(chestQ.status).toBe('question');
    expect(chestQ.source).toBe('LLM_DYNAMIC');
    // Chest pain must NOT ask generic duration
    expect(chestQ.question.concept).toContain('symptom.pain.chest');
    expect(chestQ.question.attribute).toBe('radiation');
    expect(chestQ.question.text).toContain('पसरते');

    // 2. KNEE PAIN presentation
    const kneeSession = new ClinicalSessionState({ sessionId: 'knee-sess', language: 'mr' });
    kneeSession.collectedFacts['symptom.pain.knee.location'] = {
      concept: 'symptom.pain.knee',
      attribute: 'location',
      value: 'knee',
      status: 'PRESENT',
    };
    kneeSession.primaryConcern = 'knee_pain';
    const kneeEngine = new QuestionEngine(kneeSession);

    const kneeQ = await kneeEngine.getNextQuestionDynamic('mr');
    expect(kneeQ.status).toBe('question');
    expect(kneeQ.source).toBe('LLM_DYNAMIC');
    // Knee pain must NOT ask radiation or generic duration; it asks injury/trauma
    expect(kneeQ.question.concept).toBe('symptom.injury');
    expect(kneeQ.question.attribute).toBe('mechanism');
    expect(kneeQ.question.text).toContain('दुखापत');

    // 3. ABDOMINAL PAIN presentation
    const stomachSession = new ClinicalSessionState({ sessionId: 'stomach-sess', language: 'mr' });
    stomachSession.collectedFacts['symptom.pain.abdominal.location'] = {
      concept: 'symptom.pain.abdominal',
      attribute: 'location',
      value: 'abdomen',
      status: 'PRESENT',
    };
    stomachSession.primaryConcern = 'stomach';
    const stomachEngine = new QuestionEngine(stomachSession);

    const stomachQ = await stomachEngine.getNextQuestionDynamic('mr');
    expect(stomachQ.status).toBe('question');
    expect(stomachQ.source).toBe('LLM_DYNAMIC');
    // Abdominal pain asks food relationship or GI symptoms
    expect(stomachQ.question.concept).toBe('symptom.pain.abdominal');
    expect(stomachQ.question.attribute).toBe('foodRelation');
    expect(stomachQ.question.text).toContain('जेवण');

    // Verify chest and knee questions are completely different
    expect(chestQ.question.text).not.toBe(kneeQ.question.text);
    expect(stomachQ.question.text).not.toBe(kneeQ.question.text);
  });

  it('Criteria 31, 32, 33: Multi-turn dynamic follow-up adapts to new information (fall trauma -> swelling)', async () => {
    // Initial: Knee pain
    sessionState.primaryConcern = 'knee_pain';
    sessionState.collectedFacts['symptom.pain.knee.location'] = {
      concept: 'symptom.pain.knee',
      attribute: 'location',
      value: 'knee',
      status: 'PRESENT',
    };

    // First question: asks about injury
    const firstQ = await engine.getNextQuestionDynamic('mr');
    expect(firstQ.question.attribute).toBe('mechanism');

    // Patient answers: "हो, काल पडलो होतो" (fall trauma)
    const extraction = await clinicalExtractionService.extract('हो, काल पडलो होतो', firstQ.question, sessionState);
    expect(extraction.success).toBe(true);
    const fallFact = extraction.extractions.find((e) => e.concept === 'symptom.injury');
    expect(fallFact.value).toBe('fall_trauma');

    // Record this into state
    sessionState.collectedFacts['symptom.injury.mechanism'] = {
      concept: 'symptom.injury',
      attribute: 'mechanism',
      value: 'fall_trauma',
      status: 'PRESENT',
    };

    // Next question MUST adapt to the fall/trauma and ask about swelling / weight-bearing
    const secondQ = await engine.getNextQuestionDynamic('mr', 'हो, काल पडलो होतो');
    expect(secondQ.status).toBe('question');
    expect(secondQ.question.concept).toBe('symptom.injury');
    expect(secondQ.question.attribute).toBe('swelling');
    expect(secondQ.question.text).toContain('सूज');
  });

  it('Criterion 12: Already-known information is not asked again', async () => {
    // Patient says "माझ्या गुडघ्याला कालपासून दुखतंय" -> location = knee, duration = 1 day already known
    sessionState.collectedFacts['symptom.pain.knee.location'] = {
      concept: 'symptom.pain.knee',
      attribute: 'location',
      value: 'knee',
      status: 'PRESENT',
    };
    sessionState.collectedFacts['symptom.pain.knee.duration'] = {
      concept: 'symptom.pain.knee',
      attribute: 'duration',
      value: 1,
      unit: 'days',
      status: 'PRESENT',
    };
    sessionState.primaryConcern = 'knee_pain';

    const nextQ = await engine.getNextQuestionDynamic('mr');
    expect(nextQ.question.attribute).not.toBe('location');
    expect(nextQ.question.attribute).not.toBe('duration');
    expect(nextQ.question.text).not.toContain('कधीपासून');
    expect(nextQ.question.text).not.toContain('कुठे दुखत');
  });

  it('Criterion 11: Guardrail rejects duplicate questions', () => {
    sessionState.questionsAlreadyAsked.push({
      id: 'q.prev',
      concept: 'symptom.pain.chest',
      attribute: 'radiation',
      text: 'हे दुखणे हात, जबडा किंवा पाठीकडे पसरते का?',
    });

    const candidate = {
      shouldAskQuestion: true,
      questionText: 'हे दुखणे हात, जबडा किंवा पाठीकडे पसरते का?',
      targetConcept: 'symptom.pain.chest',
      targetAttribute: 'radiation',
      priority: 'high',
    };

    const result = questionGuardrails.validateCandidateQuestion({
      candidate,
      sessionState,
      language: 'mr',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('DUPLICATE_QUESTION');
  });

  it('Criteria 13, 14, 43: Contextual duration extraction binds "६-७ दिवसांपासून दुखतंय" to knee pain', async () => {
    sessionState.primaryConcern = 'knee_pain';
    const mockQuestion = {
      id: 'q.pain.duration',
      concept: 'symptom.pain.knee',
      attribute: 'duration',
      text: { en: 'How long have you had this knee pain?' },
    };

    const extraction = await clinicalExtractionService.extract('६-७ दिवसांपासून दुखतंय', mockQuestion, sessionState);
    expect(extraction.success).toBe(true);

    const durExtraction = extraction.extractions.find((e) => e.attribute === 'duration');
    expect(durExtraction).toBeDefined();
    expect(durExtraction.concept).toBe('symptom.pain.knee');
    expect(durExtraction.value).toEqual({ min: 6, max: 7, unit: 'days' });

    // Update clinical state with this fact
    sessionState.collectedFacts['symptom.pain.knee.duration'] = {
      concept: 'symptom.pain.knee',
      attribute: 'duration',
      value: { min: 6, max: 7, unit: 'days' },
      status: 'PRESENT',
    };

    const summary = sessionState.getClinicalSummary();
    expect(summary.duration).toEqual({ min: 6, max: 7, unit: 'days' });
  });

  it('Screenshot Bug Fix (Criteria 15, 44): "मला चार दिवसांपासून जुलाब होत आहेत" has zero chest pain and zero abdomen', async () => {
    const extraction = await clinicalExtractionService.extract('मला चार दिवसांपासून जुलाब होत आहेत');
    expect(extraction.success).toBe(true);

    // Assert diarrhea present
    const diarrheaFact = extraction.extractions.find((e) => e.concept === 'symptom.diarrhea');
    expect(diarrheaFact).toBeDefined();
    expect(diarrheaFact.status).toBe('PRESENT');

    // Assert duration is 4 days
    const durFact = extraction.extractions.find((e) => e.attribute === 'duration');
    expect(durFact).toBeDefined();
    expect(durFact.value).toBe(4);

    // Populate into state
    sessionState.collectedFacts['symptom.diarrhea.presence'] = diarrheaFact;
    sessionState.collectedFacts['symptom.diarrhea.duration'] = durFact;
    sessionState.primaryConcern = 'diarrhea';

    const summary = sessionState.getClinicalSummary();
    expect(summary.primaryConcern).toBe('diarrhea');
    expect(summary.duration.value).toBe(4);
    expect(summary.duration.value).not.toBe(7);
    expect(summary.location).toBeNull(); // NOT abdomen!
    expect(summary.collectedFacts?.['symptom.pain.chest.presence']).toBeUndefined();
  });

  it('Criteria 2, 19, 20: Guardrail safety rejects medical advice/prescriptions and detects emergency red flags', () => {
    // 1. Prohibited prescription candidate question
    const badCandidate = {
      shouldAskQuestion: true,
      questionText: 'तुम्ही हे औषध घ्या आणि गोळी खाल्ली आहे का?',
      targetConcept: 'symptom.medication',
      targetAttribute: 'prescription',
      priority: 'high',
    };

    const badResult = questionGuardrails.validateCandidateQuestion({
      candidate: badCandidate,
      sessionState,
      language: 'mr',
    });

    expect(badResult.valid).toBe(false);
    expect(badResult.reason).toContain('MEDICAL_SAFETY_VIOLATION');

    // 2. Emergency Red Flag Detection: Chest pain radiating to left arm
    const emergencySession = new ClinicalSessionState({ sessionId: 'er-sess', language: 'mr' });
    emergencySession.collectedFacts['symptom.pain.location'] = {
      concept: 'symptom.pain',
      attribute: 'location',
      value: 'chest',
      status: 'PRESENT',
    };
    emergencySession.collectedFacts['symptom.pain.chest.radiation'] = {
      concept: 'symptom.pain.chest',
      attribute: 'radiation',
      value: 'LEFT_ARM',
      status: 'PRESENT',
    };

    const normalCandidate = {
      shouldAskQuestion: true,
      questionText: 'श्वास घेण्यास त्रास होतोय का?',
      targetConcept: 'symptom.pain.chest',
      targetAttribute: 'dyspnea',
      priority: 'high',
    };

    const erResult = questionGuardrails.validateCandidateQuestion({
      candidate: normalCandidate,
      sessionState: emergencySession,
      language: 'mr',
    });

    expect(erResult.valid).toBe(true);
    expect(erResult.triggerEmergency).toBe(true);
    expect(erResult.emergencyReason).toBe('ACUTE_CHEST_PAIN_RED_FLAG');
  });

  it('Criteria 24, 25, 40: Spoken question never creates facts in state, and source provenance is preserved', async () => {
    sessionState.primaryConcern = 'knee_pain';
    sessionState.collectedFacts['symptom.pain.knee.location'] = {
      concept: 'symptom.pain.knee',
      attribute: 'location',
      value: 'knee',
      status: 'PRESENT',
    };

    const factsCountBefore = Object.keys(sessionState.collectedFacts).length;
    const questionsAskedBefore = sessionState.questionsAlreadyAsked.length;

    // Generate dynamic question
    const qResult = await engine.getNextQuestionDynamic('mr');
    expect(qResult.status).toBe('question');
    expect(qResult.source).toBe('LLM_DYNAMIC');
    expect(qResult.question.source).toBe('LLM_DYNAMIC');

    // Asking the question MUST record question history but NEVER inject clinical facts
    const factsCountAfter = Object.keys(sessionState.collectedFacts).length;
    const questionsAskedAfter = sessionState.questionsAlreadyAsked.length;

    expect(factsCountAfter).toBe(factsCountBefore); // No new fact injected!
    expect(questionsAskedAfter).toBe(questionsAskedBefore + 1); // Question provenance tracked
    expect(sessionState.questionsAlreadyAsked[0].source).toBe('LLM_DYNAMIC');
  });

  it('Section F: Real Dynamic Multi-Turn Test (Turn 1 Knee -> Turn 2 Fall Trauma -> Turn 3 Joint Swelling & Motion)', async () => {
    // TURN 1: Initial Presentation "माझा गुडघा दुखतोय"
    sessionState.primaryConcern = 'knee_pain';
    sessionState.collectedFacts['symptom.pain.knee.location'] = {
      concept: 'symptom.pain.knee',
      attribute: 'location',
      value: 'knee',
      status: 'PRESENT',
    };

    const turn1Result = await engine.getNextQuestionDynamic('mr', 'माझा गुडघा दुखतोय');
    expect(turn1Result.status).toBe('question');
    expect(turn1Result.source).toBe('LLM_DYNAMIC');
    expect(turn1Result.question.concept).toBe('symptom.injury');
    expect(turn1Result.question.attribute).toBe('mechanism');
    expect(turn1Result.question.text).toContain('दुखापत');

    // TURN 2: Patient answers dynamic question with a new fact: "हो, पडलो होतो" (Fall confirmed)
    sessionState.collectedFacts['symptom.injury.mechanism'] = {
      concept: 'symptom.injury',
      attribute: 'mechanism',
      value: 'fall_trauma',
      status: 'PRESENT',
    };

    const turn2Result = await engine.getNextQuestionDynamic('mr', 'हो, पडलो होतो');
    expect(turn2Result.status).toBe('question');
    expect(turn2Result.source).toBe('LLM_DYNAMIC');
    // Next question MUST dynamically evolve based on fall trauma to check swelling/weight-bearing
    expect(turn2Result.question.attribute).toBe('swelling');
    expect(turn2Result.question.text).toContain('सूज');

    // TURN 3: Patient confirms swelling: "हो, खूप सूज आली आहे"
    sessionState.collectedFacts['symptom.injury.swelling'] = {
      concept: 'symptom.injury',
      attribute: 'swelling',
      value: true,
      status: 'PRESENT',
    };

    const turn3Result = await engine.getNextQuestionDynamic('mr', 'हो, खूप सूज आली आहे');
    expect(turn3Result.status).toBe('question');
    expect(turn3Result.source).toBe('LLM_DYNAMIC');
    // Turn 3 question MUST change to joint locking/range of motion
    expect(turn3Result.question.attribute).toBe('rangeOfMotion');
    expect(turn3Result.question.text).toContain('वाकवता');
  });

  it('Section F: Cross-Session Isolation (Session A Vomiting -> Session B Knee Pain)', async () => {
    // Session A: Vomiting Presentation
    const sessionA = new ClinicalSessionState({ sessionId: 'session-A-vomit', language: 'mr' });
    sessionA.primaryConcern = 'stomach';
    sessionA.collectedFacts['symptom.vomiting.presence'] = {
      concept: 'symptom.vomiting',
      attribute: 'presence',
      value: true,
      status: 'PRESENT',
    };
    sessionA.collectedFacts['symptom.pain.abdominal.location'] = {
      concept: 'symptom.pain.abdominal',
      attribute: 'location',
      value: 'abdomen',
      status: 'PRESENT',
    };
    sessionA.collectedFacts['symptom.vomiting.duration'] = {
      concept: 'symptom.vomiting',
      attribute: 'duration',
      value: 3,
      unit: 'days',
      status: 'PRESENT',
    };

    const summaryA = sessionA.getClinicalSummary();
    expect(summaryA.primaryConcern).toBe('stomach');
    expect(summaryA.location).toBe('abdomen');
    expect(summaryA.duration.value).toBe(3);

    // Session B: Fresh Knee Presentation
    const sessionB = new ClinicalSessionState({ sessionId: 'session-B-knee', language: 'mr' });
    sessionB.primaryConcern = 'knee_pain';
    sessionB.collectedFacts['symptom.pain.knee.location'] = {
      concept: 'symptom.pain.knee',
      attribute: 'location',
      value: 'knee',
      status: 'PRESENT',
    };

    const summaryB = sessionB.getClinicalSummary();
    expect(summaryB.primaryConcern).toBe('knee_pain');
    expect(summaryB.location).toBe('knee');
    expect(summaryB.duration).toBeNull(); // ZERO 3-day duration leakage

    // Verify 0% vomiting or stomach leakage
    const hasVomit = summaryB.symptoms.some((s) => s.concept.includes('vomit') || s.concept.includes('abdominal'));
    expect(hasVomit).toBe(false);

    // Dynamic question in Session B must be knee-related, NEVER food-related or stomach
    const engineB = new QuestionEngine(sessionB);
    const questionB = await engineB.getNextQuestionDynamic('mr', 'माझा गुडघा दुखतोय');
    expect(questionB.question.concept).toBe('symptom.injury');
    expect(questionB.question.text).not.toContain('जेवण');
    expect(questionB.question.text).not.toContain('उलटी');
  });

  it('SECTION 18 & 19: Transcript isolation and state progression from Turn 1 (Complaint) to Turn 2 (Answer)', async () => {
    // Turn 1: Patient complains of chest pain
    const chestSession = new ClinicalSessionState({ sessionId: 'turn-isolation-test', language: 'en' });
    const testEngine = new QuestionEngine(chestSession);

    // Initial Complaint recorded
    const turn1Complaint = 'experiencing sharp chest pain';
    chestSession.collectedFacts['symptom.pain.chest.location'] = {
      concept: 'symptom.pain.chest',
      attribute: 'location',
      value: 'chest',
      status: 'PRESENT',
      source: 'PATIENT_VOICE',
      raw: turn1Complaint,
    };
    chestSession.primaryConcern = 'chest_pain';

    // Engine asks radiation question
    const qResult = await testEngine.getNextQuestionDynamic('en', turn1Complaint);
    expect(qResult.question.attribute).toBe('radiation');

    // Turn 2: Patient answers radiation question
    const turn2Response = "yes it's spreads a little";
    const turn2Extraction = await clinicalExtractionService.extract(turn2Response, qResult.question, chestSession);

    // Verify Turn 2 extracted radiation, NOT re-extracting complaint
    expect(turn2Extraction.answersCurrentQuestion).toBe(true);
    expect(turn2Extraction.targetAttribute).toBe('radiation');
    expect(turn2Extraction.value).toBe(true);
    expect(turn2Extraction.rawTranscript).toBe(turn2Response);
    expect(turn2Extraction.rawTranscript).not.toBe(turn1Complaint);

    // Record radiation fact into clinical state
    chestSession.collectedFacts['symptom.pain.chest.radiation'] = {
      concept: 'symptom.pain.chest',
      attribute: 'radiation',
      value: true,
      status: 'PRESENT',
      source: 'PATIENT_VOICE',
      raw: turn2Response,
    };

    // Next dynamic question must receive radiation=true and generate shortness of breath / diaphoresis
    const nextQResult = await testEngine.getNextQuestionDynamic('en', turn2Response);
    expect(nextQResult.question.attribute).toBe('dyspnea');
    expect(nextQResult.question.text).toContain('shortness of breath');
  });
});

