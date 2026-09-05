import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('MediKiosk Phase 4 AI Extraction Integration Test Suite', () => {
  let sessionId = '';

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('initializes session and returns first question', async () => {
    const res = await request(app)
      .post('/api/clinical/sessions')
      .send({
        language: 'mr',
        opdMode: 'GENERAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    sessionId = res.body.data.sessionId;

    // Record chief complaint = pain
    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.chief_complaint',
        rawResponse: 'pain',
        normalizedValue: 'pain',
        inputMethod: 'TOUCH',
        language: 'mr',
      });
  });

  it('processes Marathi voice input via clinicalExtractionService and feeds QuestionEngine (Section 49)', async () => {
    // Patient speaks Marathi: "माझ्या छातीत दुखत आहे" (My chest hurts)
    const res = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.location',
        rawResponse: 'माझ्या छातीत दुखत आहे',
        inputMethod: 'VOICE',
        language: 'mr',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // AI extraction metadata present
    expect(res.body.data.aiExtraction).toBeDefined();
    expect(res.body.data.recorded.normalizedValue).toBe('chest');
    expect(res.body.data.recorded.source).toBe('PATIENT_VOICE');

    // Answer duration, severity, character to trigger chest radiation
    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.duration',
        normalizedValue: { amount: 3, unit: 'days' },
        inputMethod: 'TOUCH',
      });
    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.severity',
        normalizedValue: 'SEVERE',
        inputMethod: 'TOUCH',
      });
    const charRes = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.character',
        normalizedValue: 'PRESSURE',
        inputMethod: 'TOUCH',
      });

    // The deterministic QuestionEngine must now present chest radiation!
    expect(charRes.body.data.next.question.id).toBe('q.pain.radiation');
  });

  it('supports direct slot extraction endpoint (Section 40)', async () => {
    const res = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/extract`)
      .send({
        rawTranscript: 'मला तीन दिवसांपासून ताप आहे',
        questionId: 'q.pain.duration',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.extractions.length).toBeGreaterThan(0);
    expect(res.body.data.extractions[0].value).toBe(3);
  });

  it('invalidates stale facts when location is revised from chest to knee (Section 27)', async () => {
    // 1. Answer radiation
    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.radiation',
        normalizedValue: 'LEFT_ARM',
        inputMethod: 'TOUCH',
      });

    // 2. Revise location to knee
    const revisedRes = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.location',
        rawResponse: 'माझ्या गुडघ्यात दुखत आहे',
        inputMethod: 'VOICE',
        language: 'mr',
      });

    expect(revisedRes.status).toBe(200);
    expect(revisedRes.body.data.recorded.normalizedValue).toBe('knee');

    // Next question must bypass chest questions and proceed to history or dynamic knee inquiry
    expect(['q.history.conditions', 'dyn.symptom.injury.mechanism']).toContain(revisedRes.body.data.next.question.id);
  });
});
