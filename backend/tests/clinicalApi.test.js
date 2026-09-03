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
});
