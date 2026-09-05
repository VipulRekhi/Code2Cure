import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('MediKiosk Phase 3 Clinical REST API Test Suite', () => {
  let sessionId = '';

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /api/clinical/sessions should initialize session and return first question', async () => {
    const res = await request(app)
      .post('/api/clinical/sessions')
      .send({
        language: 'mr',
        opdMode: 'GENERAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.next.status).toBe('question');
    expect(res.body.data.next.question.id).toBe('q.chief_complaint');
    sessionId = res.body.data.sessionId;
  });

  it('GET /api/clinical/sessions/:id should return session details', async () => {
    const res = await request(app).get(`/api/clinical/sessions/${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.id).toBe(sessionId);
    expect(res.body.data.progress).toBeDefined();
  });

  it('POST /api/clinical/sessions/:id/responses should record answer and return next question', async () => {
    const res = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.chief_complaint',
        rawResponse: 'pain',
        normalizedValue: 'pain',
        inputMethod: 'TOUCH',
        language: 'mr',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recorded.questionId).toBe('q.chief_complaint');
    expect(res.body.data.next.question.id).toBe('q.pain.location');
  });

  it('GET /api/clinical/sessions/:id/next-question should return current next question in requested language', async () => {
    const res = await request(app).get(`/api/clinical/sessions/${sessionId}/next-question?lang=hi`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.question.id).toBe('q.pain.location');
    expect(res.body.data.question.text).toContain('दर्द');
  });

  it('GET /api/clinical/sessions/:id/progress should return progress metrics', async () => {
    const res = await request(app).get(`/api/clinical/sessions/${sessionId}/progress`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.completed).toBeGreaterThan(0);
    expect(res.body.data.percentage).toBeGreaterThan(0);
  });

  it('GET /api/clinical/sessions/:id/summary should return normalized summary and persist clinical facts', async () => {
    // Record location and duration
    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.location',
        rawResponse: 'chest',
        normalizedValue: 'chest',
        inputMethod: 'TOUCH',
        language: 'mr',
      });

    await request(app)
      .post(`/api/clinical/sessions/${sessionId}/responses`)
      .send({
        questionId: 'q.pain.duration',
        rawResponse: { amount: 3, unit: 'days' },
        normalizedValue: { amount: 3, unit: 'days' },
        inputMethod: 'TOUCH',
        language: 'mr',
      });

    const res = await request(app).get(`/api/clinical/sessions/${sessionId}/summary`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBe(sessionId);
    expect(res.body.data.primaryConcern).toBe('pain');
    expect(res.body.data.location).toBe('chest');
    expect(res.body.data.duration).toEqual({ value: 3, unit: 'days' });
  });

  it('verifies strict session isolation: Session A chest pain does NOT leak into Session B vomiting summary', async () => {
    // Initialize Session B
    const sessionBInit = await request(app)
      .post('/api/clinical/sessions')
      .send({ language: 'mr', opdMode: 'GENERAL' });
    const sessionBId = sessionBInit.body.data.sessionId;

    // Session B records stomach complaint
    await request(app)
      .post(`/api/clinical/sessions/${sessionBId}/responses`)
      .send({
        questionId: 'q.chief_complaint',
        rawResponse: 'stomach',
        normalizedValue: 'stomach',
        inputMethod: 'TOUCH',
        language: 'mr',
      });

    // Session B records voice response for vomiting
    await request(app)
      .post(`/api/clinical/sessions/${sessionBId}/responses`)
      .send({
        questionId: 'q.chief_complaint',
        rawResponse: 'मला तीन दिवसांपासून रोज उलटी होत आहे',
        inputMethod: 'VOICE',
        language: 'mr',
      });

    const summaryB = await request(app).get(`/api/clinical/sessions/${sessionBId}/summary`);
    expect(summaryB.status).toBe(200);
    expect(summaryB.body.success).toBe(true);

    // Session B must have stomach/vomiting, NOT chest pain from Session A
    expect(summaryB.body.data.primaryConcern).toBe('stomach');
    expect(summaryB.body.data.location).toBeNull();
    expect(summaryB.body.data.duration).toEqual({ value: 3, unit: 'days' });

    // Ensure Session A still has its own distinct chest data
    const summaryA = await request(app).get(`/api/clinical/sessions/${sessionId}/summary`);
    expect(summaryA.body.data.location).toBe('chest');
  });
});

