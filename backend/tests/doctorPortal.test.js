import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('MediKiosk Phase 10 Doctor Clinical Portal Backend Test Suite', () => {
  let doctorToken = '';
  let generalSessionId = '';
  let ayushSessionId = '';
  let criticalSessionId = '';

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Create a sample General Patient Session
    const generalSession = await prisma.clinicalSession.create({
      data: {
        language: 'mr',
        opdMode: 'GENERAL',
        status: 'COMPLETED',
      },
    });
    generalSessionId = generalSession.id;

    // Add chief complaint and facts
    await prisma.questionResponse.create({
      data: {
        sessionId: generalSessionId,
        questionId: 'q.chief_complaint',
        rawResponse: 'knee_pain',
        normalizedValue: 'knee_pain',
        inputMethod: 'TOUCH',
        language: 'mr',
        source: 'PATIENT_TOUCH',
      },
    });
    await prisma.clinicalFact.create({
      data: {
        sessionId: generalSessionId,
        concept: 'symptom.pain.knee.location',
        attribute: 'location',
        value: 'knee',
        status: 'PRESENT',
        source: 'PATIENT_TOUCH',
      },
    });
    await prisma.clinicalFact.create({
      data: {
        sessionId: generalSessionId,
        concept: 'symptom.pain.knee.duration',
        attribute: 'duration',
        value: { min: 4, max: 4, unit: 'days' },
        unit: 'days',
        status: 'PRESENT',
        source: 'PATIENT_TOUCH',
      },
    });

    // 2. Create a sample AYUSH Patient Session
    const ayushSession = await prisma.clinicalSession.create({
      data: {
        language: 'mr',
        opdMode: 'AYUSH',
        status: 'COMPLETED',
      },
    });
    ayushSessionId = ayushSession.id;

    await prisma.questionResponse.create({
      data: {
        sessionId: ayushSessionId,
        questionId: 'q.chief_complaint',
        rawResponse: 'joint_pain',
        normalizedValue: 'joint_pain',
        inputMethod: 'TOUCH',
        language: 'mr',
        source: 'PATIENT_TOUCH',
      },
    });
    // Add Dashavidha Pariksha facts
    await prisma.clinicalFact.create({
      data: {
        sessionId: ayushSessionId,
        concept: 'ayush.dashavidha.prakriti',
        attribute: 'prakriti',
        value: 'Vata-predominant (Dry skin, light build, quick activity)',
        status: 'PRESENT',
        source: 'PATIENT_TOUCH',
      },
    });
    await prisma.clinicalFact.create({
      data: {
        sessionId: ayushSessionId,
        concept: 'ayush.dashavidha.ahara_shakti',
        attribute: 'ahara_shakti',
        value: 'Tikshnagni (Strong / fast digestion)',
        status: 'PRESENT',
        source: 'PATIENT_TOUCH',
      },
    });

    // 3. Create a Critical Red-Flag Patient Session
    const criticalSession = await prisma.clinicalSession.create({
      data: {
        language: 'en',
        opdMode: 'GENERAL',
        status: 'IN_PROGRESS',
      },
    });
    criticalSessionId = criticalSession.id;

    await prisma.questionResponse.create({
      data: {
        sessionId: criticalSessionId,
        questionId: 'q.chief_complaint',
        rawResponse: 'Severe chest pain radiating to left arm with sweating',
        normalizedValue: 'chest_pain',
        inputMethod: 'VOICE',
        language: 'en',
        source: 'PATIENT_VOICE',
      },
    });
    await prisma.clinicalFact.create({
      data: {
        sessionId: criticalSessionId,
        concept: 'symptom.pain.chest.presence',
        attribute: 'presence',
        value: 'PRESENT',
        status: 'PRESENT',
        source: 'PATIENT_VOICE',
      },
    });
    await prisma.clinicalFact.create({
      data: {
        sessionId: criticalSessionId,
        concept: 'symptom.pain.chest.radiation',
        attribute: 'radiation',
        value: 'LEFT_ARM',
        status: 'PRESENT',
        source: 'PATIENT_VOICE',
      },
    });
    await prisma.clinicalFact.create({
      data: {
        sessionId: criticalSessionId,
        concept: 'symptom.pain.chest.sweating',
        attribute: 'sweating',
        value: 'PRESENT',
        status: 'PRESENT',
        source: 'PATIENT_VOICE',
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test sessions
    try {
      if (generalSessionId) {
        await prisma.clinicalFact.deleteMany({ where: { sessionId: generalSessionId } });
        await prisma.questionResponse.deleteMany({ where: { sessionId: generalSessionId } });
        await prisma.clinicalSession.delete({ where: { id: generalSessionId } });
      }
      if (ayushSessionId) {
        await prisma.clinicalFact.deleteMany({ where: { sessionId: ayushSessionId } });
        await prisma.questionResponse.deleteMany({ where: { sessionId: ayushSessionId } });
        await prisma.clinicalSession.delete({ where: { id: ayushSessionId } });
      }
      if (criticalSessionId) {
        await prisma.clinicalFact.deleteMany({ where: { sessionId: criticalSessionId } });
        await prisma.questionResponse.deleteMany({ where: { sessionId: criticalSessionId } });
        await prisma.clinicalSession.delete({ where: { id: criticalSessionId } });
      }
    } catch (e) {
      console.warn('Test cleanup notice:', e.message);
    }
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------
  // 1. Authentication & Protected Endpoints
  // -------------------------------------------------------------
  it('POST /api/doctor/auth/login should authenticate demo physician with token', async () => {
    const res = await request(app)
      .post('/api/doctor/auth/login')
      .send({
        employeeId: 'DOC-8942',
        password: 'Password123!',
        department: 'General Medicine / OPD-3',
      });

    if (res.status !== 200) {
      console.error('LOGIN FAILED:', res.status, res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.doctor.employeeId).toBe('DOC-8942');
    expect(res.body.data.doctor.name).toBe('Dr. Priya Deshmukh');

    doctorToken = res.body.data.token;
  });

  it('GET /api/doctor/dashboard should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/doctor/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/doctor/dashboard should return live OPD metrics when authenticated', async () => {
    const res = await request(app)
      .get('/api/doctor/dashboard')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics.todayQueue).toBeGreaterThanOrEqual(1);
    expect(res.body.data.metrics.criticalRedFlags).toBeGreaterThanOrEqual(1);
    expect(res.body.data.recentQueue).toBeInstanceOf(Array);
  });

  // -------------------------------------------------------------
  // 2. Queue & Priority Alerts
  // -------------------------------------------------------------
  it('GET /api/doctor/queue should return OPD consultation queue', async () => {
    const res = await request(app)
      .get('/api/doctor/queue')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.queue.length).toBeGreaterThanOrEqual(1);

    const firstItem = res.body.data.queue[0];
    expect(firstItem.sessionId).toBeDefined();
    expect(firstItem.token).toBeDefined();
    expect(firstItem.patient).toBeDefined();
    expect(firstItem.triageTier).toBeDefined();
  });

  it('GET /api/doctor/alerts should identify the critical red-flag patient', async () => {
    const res = await request(app)
      .get('/api/doctor/alerts')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alerts.length).toBeGreaterThanOrEqual(1);

    const acuteAlert = res.body.data.alerts.find((a) => a.sessionId === criticalSessionId);
    expect(acuteAlert).toBeDefined();
    expect(acuteAlert.severity).toBe('CRITICAL');
    expect(acuteAlert.code).toBe('ACUTE_CHEST_PAIN_RED_FLAG');
    expect(acuteAlert.reason).toContain('chest pain with left arm radiation');
  });

  // -------------------------------------------------------------
  // 3. Patient Registry & Search
  // -------------------------------------------------------------
  it('GET /api/doctor/patients should return patients with multi-field search', async () => {
    const res = await request(app)
      .get('/api/doctor/patients?search=knee')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const kneeMatch = res.body.data.patients.find((p) => p.sessionId === generalSessionId);
    expect(kneeMatch).toBeDefined();
  });

  // -------------------------------------------------------------
  // 4. Patient Workspace (Core Feature)
  // -------------------------------------------------------------
  it('GET /api/doctor/patients/:id/workspace should return complete intake for General OPD', async () => {
    const res = await request(app)
      .get(`/api/doctor/patients/${generalSessionId}/workspace`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const ws = res.body.data;
    expect(ws.sessionId).toBe(generalSessionId);
    expect(ws.patient).toBeDefined();
    expect(ws.verbalSummary).toBeDefined();
    expect(typeof ws.verbalSummary).toBe('string');
    expect(ws.structuredSummary.primaryConcern).toBe('knee_pain');
    expect(ws.isAyushMode).toBe(false);
    expect(ws.ayushAssessment).toBeNull();
    expect(ws.questionResponses).toBeInstanceOf(Array);
    expect(ws.questionResponses.length).toBeGreaterThanOrEqual(1);
    expect(ws.medications.patientReported).toBeInstanceOf(Array);
    expect(ws.medications.documentExtracted).toBeInstanceOf(Array);
  });

  it('GET /api/doctor/patients/:id/workspace should return AYUSH assessment for AYUSH OPD', async () => {
    const res = await request(app)
      .get(`/api/doctor/patients/${ayushSessionId}/workspace`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const ws = res.body.data;
    expect(ws.sessionId).toBe(ayushSessionId);
    expect(ws.isAyushMode).toBe(true);
    expect(ws.ayushAssessment).toBeDefined();
    expect(ws.ayushAssessment.dashavidhaPariksha).toBeDefined();
    expect(ws.ayushAssessment.dashavidhaPariksha.prakriti.status).toBe('PRESENT');
    expect(ws.ayushAssessment.dashavidhaPariksha.prakriti.value).toContain('Vata');
  });

  it('GET /api/doctor/patients/:id/workspace should prominently flag red-flags in critical cases without hallucinating diagnoses', async () => {
    const res = await request(app)
      .get(`/api/doctor/patients/${criticalSessionId}/workspace`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const ws = res.body.data;
    expect(ws.triage.hasRedFlag).toBe(true);
    expect(ws.triage.tier).toBe('CRITICAL');
    expect(ws.triage.redFlags[0].code).toBe('ACUTE_CHEST_PAIN_RED_FLAG');

    // Safety Invariant: Summary must not diagnose acute myocardial infarction or prescribe
    expect(ws.verbalSummary.toLowerCase()).not.toContain('myocardial infarction');
    expect(ws.verbalSummary.toLowerCase()).not.toContain('prescribe');
  });

  // -------------------------------------------------------------
  // 5. Physician Notes & Status & Sign-Off
  // -------------------------------------------------------------
  it('POST /api/doctor/patients/:id/notes should save clinician consultation notes with audit provenance', async () => {
    const res = await request(app)
      .post(`/api/doctor/patients/${generalSessionId}/notes`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        noteText: 'Patient shows mild tenderness on right patella. Recommended X-ray AP/lateral view.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.text).toContain('mild tenderness');
    expect(res.body.data.author).toBe('Dr. Priya Deshmukh');

    // Confirm it appears in workspace
    const wsRes = await request(app)
      .get(`/api/doctor/patients/${generalSessionId}/workspace`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(wsRes.body.data.physicianNotes.length).toBeGreaterThanOrEqual(1);
    expect(wsRes.body.data.physicianNotes[0].text).toContain('mild tenderness');
  });

  it('POST /api/doctor/patients/:id/status should update consultation status', async () => {
    const res = await request(app)
      .post(`/api/doctor/patients/${generalSessionId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: 'IN_CONSULTATION' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('IN_CONSULTATION');
  });

  it('POST /api/doctor/patients/:id/review should record clinician sign-off', async () => {
    const res = await request(app)
      .post(`/api/doctor/patients/${generalSessionId}/review`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ comments: 'Intake validated. Patient examined.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.confirmed).toBe(true);
    expect(res.body.data.reviewedBy).toBe('Dr. Priya Deshmukh');
  });

  // -------------------------------------------------------------
  // 6. Reports & Settings
  // -------------------------------------------------------------
  it('GET /api/doctor/reports should return real clinical throughput statistics', async () => {
    const res = await request(app)
      .get('/api/doctor/reports')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalSessions).toBeGreaterThanOrEqual(2);
    expect(res.body.data.generalOpdCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.ayushOpdCount).toBeGreaterThanOrEqual(1);
  });

  it('GET and POST /api/doctor/settings should manage physician preferences', async () => {
    const updateRes = await request(app)
      .post('/api/doctor/settings')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        audioAlertEnabled: true,
        highContrastMode: false,
        theme: 'CLINICAL_LIGHT',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.theme).toBe('CLINICAL_LIGHT');

    const getRes = await request(app)
      .get('/api/doctor/settings')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.theme).toBe('CLINICAL_LIGHT');
  });
});
