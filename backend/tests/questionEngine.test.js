import { describe, it, expect, beforeEach } from 'vitest';
import {
  ClinicalSessionState,
  QuestionEngine,
  createQuestionEngine,
  QUESTION_CATALOG,
  CLINICAL_CONCEPTS,
  parseDemoVoiceResponse,
} from '../src/modules/questionEngine/index.js';

describe('MediKiosk Phase 3 Clinical Question Engine Test Suite', () => {
  let sessionState;
  let engine;

  beforeEach(() => {
    sessionState = new ClinicalSessionState({
      sessionId: `test-sess-${Date.now()}`,
      language: 'mr',
      opdMode: 'GENERAL',
    });
    engine = createQuestionEngine(sessionState);
  });

  describe('Clinical Ontology & Question Catalog (Sections 5, 6, 7, 8)', () => {
    it('has language-neutral concept identifiers with labels in en, hi, mr', () => {
      expect(CLINICAL_CONCEPTS['symptom.pain.chest']).toBeDefined();
      const labels = CLINICAL_CONCEPTS['symptom.pain.chest'].labels;
      expect(labels.en).toBe('Chest Pain / Discomfort');
      expect(labels.hi).toContain('सीने में दर्द');
      expect(labels.mr).toContain('छातीत दुखणे');
    });

    it('contains schema-driven questions with standard input types', () => {
      const q = QUESTION_CATALOG.find((x) => x.id === 'q.pain.duration');
      expect(q).toBeDefined();
      expect(q.inputType).toBe('duration');
      expect(q.required).toBe(true);
      expect(q.priority).toBe('high');
      expect(q.text.en).toBeDefined();
      expect(q.text.hi).toBeDefined();
      expect(q.text.mr).toBeDefined();
    });
  });

  describe('Deterministic Flow & Initial Question (Section 53)', () => {
    it('returns q.chief_complaint as the first question', () => {
      const result = engine.getNextQuestion('mr');
      expect(result.status).toBe('question');
      expect(result.question.id).toBe('q.chief_complaint');
      expect(result.question.text).toContain('त्रास');
    });

    it('preserves the same question ID across languages', () => {
      const mrQ = engine.getNextQuestion('mr');
      const hiQ = engine.getNextQuestion('hi');
      const enQ = engine.getNextQuestion('en');

      expect(mrQ.question.id).toBe('q.chief_complaint');
      expect(hiQ.question.id).toBe('q.chief_complaint');
      expect(enQ.question.id).toBe('q.chief_complaint');

      expect(mrQ.question.text).not.toBe(enQ.question.text);
    });
  });

  describe('Conditional Flow & Adaptive Branching (Section 14, 15, 31, 53)', () => {
    it('enables chest-specific questions when location is chest', () => {
      // 1. Answer chief complaint = pain
      engine.recordResponse({
        questionId: 'q.chief_complaint',
        rawResponse: 'pain',
        normalizedValue: 'pain',
        inputMethod: 'TOUCH',
      });

      // Next question should be location
      const q2 = engine.getNextQuestion('mr');
      expect(q2.question.id).toBe('q.pain.location');

      // 2. Answer location = chest
      engine.recordResponse({
        questionId: 'q.pain.location',
        rawResponse: 'chest',
        normalizedValue: 'chest',
        inputMethod: 'TOUCH',
      });

      // Answering duration, severity, character
      engine.recordResponse({
        questionId: 'q.pain.duration',
        normalizedValue: { amount: 3, unit: 'days' },
      });
      engine.recordResponse({
        questionId: 'q.pain.severity',
        normalizedValue: 'SEVERE',
      });
      engine.recordResponse({
        questionId: 'q.pain.character',
        normalizedValue: 'PRESSURE',
      });

      // Adaptive follow-up should now be radiation to arm/jaw
      const followUp = engine.getNextQuestion('mr');
      expect(['q.pain.radiation', 'q.pain.dyspnea', 'q.pain.sweating']).toContain(followUp.question.id);
    });

    it('does NOT ask chest-specific questions when location is knee (negative condition)', () => {
      engine.recordResponse({
        questionId: 'q.chief_complaint',
        normalizedValue: 'pain',
      });

      // Answer location = knee
      engine.recordResponse({
        questionId: 'q.pain.location',
        normalizedValue: 'knee',
      });

      engine.recordResponse({
        questionId: 'q.pain.duration',
        normalizedValue: { amount: 7, unit: 'days' },
      });
      engine.recordResponse({
        questionId: 'q.pain.severity',
        normalizedValue: 'MODERATE',
      });
      engine.recordResponse({
        questionId: 'q.pain.character',
        normalizedValue: 'DULL',
      });

      // Next question should proceed directly to medical history, bypassing chest questions
      const nextQ = engine.getNextQuestion('mr');
      expect(nextQ.question.id).not.toBe('q.pain.radiation');
      expect(nextQ.question.id).not.toBe('q.pain.dyspnea');
      expect(nextQ.question.id).not.toBe('q.pain.sweating');
      expect(nextQ.question.id).toBe('q.history.conditions');
    });
  });

  describe('Unknown vs Negative Semantics (Section 19 & 20)', () => {
    it('records unknown as distinct from negative', () => {
      engine.recordResponse({
        questionId: 'q.chief_complaint',
        normalizedValue: 'pain',
      });

      engine.recordResponse({
        questionId: 'q.pain.location',
        rawResponse: "I'm not sure",
        normalizedValue: 'unknown',
      });

      const fact = sessionState.getFact('symptom.pain', 'location');
      expect(fact.status).toBe('UNKNOWN');
      expect(fact.value).toBe('unknown');
    });

    it('records no/negative with status ABSENT', () => {
      engine.recordResponse({
        questionId: 'q.chief_complaint',
        normalizedValue: 'pain',
      });
      engine.recordResponse({
        questionId: 'q.pain.location',
        normalizedValue: 'chest',
      });
      engine.recordResponse({
        questionId: 'q.pain.dyspnea',
        normalizedValue: 'no',
      });

      const fact = sessionState.getFact('symptom.pain.chest', 'dyspnea');
      expect(fact.status).toBe('ABSENT');
    });
  });

  describe('Response Revision & Stale Fact Invalidation (Section 47 & 53)', () => {
    it('recalculates dependent questions when pain location changes from chest to knee', () => {
      engine.recordResponse({
        questionId: 'q.chief_complaint',
        normalizedValue: 'pain',
      });
      engine.recordResponse({
        questionId: 'q.pain.location',
        normalizedValue: 'chest',
      });
      engine.recordResponse({
        questionId: 'q.pain.radiation',
        normalizedValue: 'LEFT_ARM',
      });

      expect(sessionState.getFact('symptom.pain.chest', 'radiation')).toBeDefined();

      // REVISE location to knee
      engine.recordResponse({
        questionId: 'q.pain.location',
        normalizedValue: 'knee',
      });

      // Radiation fact must be purged!
      expect(sessionState.getFact('symptom.pain.chest', 'radiation')).toBeNull();
      expect(sessionState.completedQuestionIds.has('q.pain.radiation')).toBe(false);
    });
  });

  describe('Deterministic Demo Voice Parser (Section 42 & 43)', () => {
    it('maps Marathi, Hindi, and English durations to structured values', () => {
      const q = QUESTION_CATALOG.find((x) => x.id === 'q.pain.duration');
      expect(parseDemoVoiceResponse('मला तीन दिवसांपासून त्रास आहे', q)).toEqual({ amount: 3, unit: 'days' });
      expect(parseDemoVoiceResponse('मुझे तीन दिन से दर्द है', q)).toEqual({ amount: 3, unit: 'days' });
      expect(parseDemoVoiceResponse('I have had this for three days', q)).toEqual({ amount: 3, unit: 'days' });
    });
  });

  describe('Interview Completion (Section 53)', () => {
    it('returns status complete when all required questions are answered', () => {
      engine.recordResponse({ questionId: 'q.chief_complaint', normalizedValue: 'fever' });
      engine.recordResponse({ questionId: 'q.fever.duration', normalizedValue: { amount: 3, unit: 'days' } });
      engine.recordResponse({ questionId: 'q.fever.pattern', normalizedValue: 'CONTINUOUS' });
      engine.recordResponse({ questionId: 'q.fever.associated', normalizedValue: ['cough'] });
      engine.recordResponse({ questionId: 'q.history.conditions', normalizedValue: ['NONE'] });
      engine.recordResponse({ questionId: 'q.history.allergies', normalizedValue: 'NO_ALLERGIES' });

      const finalStatus = engine.getNextQuestion();
      expect(finalStatus.status).toBe('complete');
      expect(engine.isComplete()).toBe(true);
    });
  });
});
