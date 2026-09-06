import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { activeSessions } from '../src/controllers/clinical.controller.js';
import { ClinicalSessionState } from '../src/modules/questionEngine/clinicalState.js';

describe('Phase 7 Complete Examination Review & Doctor Submission Suite', () => {
  beforeEach(async () => {
    activeSessions.clear();
  });

  describe('Dynamic Question History & Normalized Interpretation', () => {
    it('records dynamic questions and retains both original patient words and normalized interpretation', async () => {
      // 1. Create a session
      const createRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'mr' });
      expect(createRes.status).toBe(201);
      const sessionId = createRes.body.data.sessionId;

      let state = activeSessions.get(sessionId);
      if (!state) {
        state = new ClinicalSessionState({ sessionId, language: 'mr' });
        activeSessions.set(sessionId, state);
      }
      state.primaryConcern = 'डोकेदुखी';

      // Simulate 8 dynamic questions asked and answered
      const dynamicQuestions = [
        { id: 'dq_1', text: 'डोकेदुखी कधीपासून सुरू झाली आहे?', answer: '३ दिवसांपासून', norm: '3_DAYS' },
        { id: 'dq_2', text: 'वेदना तीव्र आहेत का सौम्य?', answer: 'फार तीव्र वेदना आहेत', norm: 'SEVERE' },
        { id: 'dq_3', text: 'उलटी किंवा मळमळ होत आहे का?', answer: 'नाही', norm: 'ABSENT' },
        { id: 'dq_4', text: 'ताप आला होता का?', answer: 'माहित नाही', norm: 'UNKNOWN' },
        { id: 'dq_5', text: 'डोळ्यांसमोर अंधारी येते का?', answer: 'नाही', norm: 'ABSENT' },
        { id: 'dq_6', text: 'यापूर्वी असा त्रास झाला होता का?', answer: 'कधीच नाही', norm: 'ABSENT' },
        { id: 'dq_7', text: 'कोणते औषध घेतले आहे का?', answer: 'पॅरासिटामॉल घेतली', norm: 'PARACETAMOL_TAKEN' },
        { id: 'dq_8', text: 'गर्दीत किंवा आवाजात त्रास वाढतो का?', answer: 'होय, खूप त्रास होतो', norm: 'PRESENT' },
      ];

      for (const q of dynamicQuestions) {
        state.recordAskedQuestion({
          id: q.id,
          concept: 'headache',
          attribute: q.id,
          text: q.text,
          type: 'BOOLEAN_WITH_UNKNOWN',
        });
        state.recordResponse({
          question: { id: q.id, concept: 'headache', attribute: q.id },
          rawResponse: q.answer,
          normalizedValue: q.norm,
        });
      }

      // 2. Fetch examination history via API
      const historyRes = await request(app)
        .get(`/api/clinical/sessions/${sessionId}/examination-history`)
        .query({ language: 'mr' });

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.success).toBe(true);

      const history = historyRes.body.data.examinationHistory;
      // 1 chief complaint question + 8 dynamic questions = 9 questions
      expect(history).toHaveLength(9);

      // Verify dq_1 retains original spoken answer and normalized interpretation
      const dq1 = history.find((h) => h.questionId === 'dq_1');
      expect(dq1).toBeDefined();
      expect(dq1.originalResponse).toBe('३ दिवसांपासून');
      expect(dq1.normalizedValue).toBe('3_DAYS');

      // Verify Negation vs Uncertainty: dq_3 (नाही -> ABSENT) vs dq_4 (माहित नाही -> UNKNOWN)
      const q3 = history.find((h) => h.questionId === 'dq_3');
      const q4 = history.find((h) => h.questionId === 'dq_4');

      expect(q3.originalResponse).toBe('नाही');
      expect(q3.status).toBe('ABSENT');

      expect(q4.originalResponse).toBe('माहित नाही');
      expect(q4.status).toBe('UNKNOWN');
      expect(q4.status).not.toBe(q3.status); // UNKNOWN != ABSENT
    });
  });

  describe('Patient Correction Flow & Downstream Audit Trail', () => {
    it('allows correcting an answer, updates clinical state and logs audit trail', async () => {
      const createRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'hi' });
      const sessionId = createRes.body.data.sessionId;

      let state = activeSessions.get(sessionId);
      if (!state) {
        state = new ClinicalSessionState({ sessionId, language: 'hi' });
        activeSessions.set(sessionId, state);
      }
      state.recordAskedQuestion({
        id: 'q_fever',
        concept: 'fever',
        attribute: 'presence',
        text: 'क्या आपको बुखार है?',
        type: 'BOOLEAN',
      });
      // Initial answer: "नहीं" (ABSENT)
      state.recordResponse({
        question: { id: 'q_fever', concept: 'fever', attribute: 'presence' },
        rawResponse: 'नहीं',
        normalizedValue: 'ABSENT',
      });

      const initialResp = state.responses.find((r) => r.questionId === 'q_fever');
      expect(initialResp.status).toBe('ABSENT');

      // Patient realizes in Review screen that they actually had fever and corrects it to "हाँ, कल रात से" (PRESENT)
      const patchRes = await request(app)
        .patch(`/api/clinical/sessions/${sessionId}/responses/q_fever`)
        .send({
          newResponse: 'हाँ, कल रात से',
          normalizedValue: 'PRESENT',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.updatedResponse.originalResponse).toBe('हाँ, कल रात से');
      expect(patchRes.body.data.updatedResponse.normalizedValue).toBe('PRESENT');

      // Audit trail must record the correction
      expect(patchRes.body.data.updatedResponse.correctionHistory).toHaveLength(1);
      expect(patchRes.body.data.updatedResponse.correctionHistory[0].previousResponse).toBe('नहीं');
      expect(patchRes.body.data.updatedResponse.correctionHistory[0].previousNormalized).toBe('ABSENT');

      // Check examination history reflects correction
      const historyRes = await request(app)
        .get(`/api/clinical/sessions/${sessionId}/examination-history`)
        .query({ language: 'hi' });

      const updatedHistory = historyRes.body.data.examinationHistory.find((h) => h.questionId === 'q_fever');
      expect(updatedHistory.originalResponse).toBe('हाँ, कल रात से');
      expect(updatedHistory.normalizedValue).toBe('PRESENT');
      expect(updatedHistory.status).toBe('PRESENT');
    });
  });

  describe('Comprehensive Doctor Payload Submission', () => {
    it('generates a complete doctor payload containing demographics, full Q&A, documents, and audit trail', async () => {
      const createRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'en' });
      const sessionId = createRes.body.data.sessionId;

      // Add a document to the session
      const docRes = await request(app)
        .post(`/api/clinical/sessions/${sessionId}/documents`)
        .send({
          fileBase64: Buffer.from('Dr. Joshi\nRx:\nTab. Metformin 500mg - BD - 30 days').toString('base64'),
          fileName: 'metformin_rx.txt',
          mimeType: 'text/plain',
          documentType: 'PRESCRIPTION',
        });
      expect(docRes.status).toBe(201);

      // Set up clinical state
      let state = activeSessions.get(sessionId);
      if (!state) {
        state = new ClinicalSessionState({ sessionId, language: 'en' });
        activeSessions.set(sessionId, state);
      }
      state.primaryConcern = 'Chest tightness';
      state.recordAskedQuestion({
        id: 'q_pain_loc',
        concept: 'chest_pain',
        attribute: 'location',
        text: 'Where is the pain located?',
      });
      state.recordResponse({
        question: { id: 'q_pain_loc', concept: 'chest_pain', attribute: 'location' },
        rawResponse: 'Left side of chest radiating to arm',
        normalizedValue: 'LEFT_CHEST_ARM_RADIATION',
      });

      // Submit session to doctor
      const submitRes = await request(app)
        .post(`/api/clinical/sessions/${sessionId}/submit`)
        .send({
          patientFeedback: 'Easy to use',
          reviewConfirmedAt: new Date().toISOString(),
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);

      const payload = submitRes.body.data.doctorPayload;
      expect(payload).toBeDefined();

      // Verify all required sections exist in the doctor payload
      expect(payload.sessionId).toBe(sessionId);
      expect(payload.sessionMetadata).toBeDefined();
      expect(payload.sessionMetadata.status).toBe('COMPLETED');
      expect(payload.sessionMetadata.language).toBe('en');

      // Examination History
      expect(payload.examinationHistory).toBeDefined();
      expect(payload.examinationHistory).toHaveLength(2);
      expect(payload.examinationHistory[0].questionId).toBe('q.chief_complaint');
      expect(payload.examinationHistory[1].questionId).toBe('q_pain_loc');
      expect(payload.examinationHistory[1].originalResponse).toBe('Left side of chest radiating to arm');

      // Clinical Synthesis
      expect(payload.clinicalSummary).toBeDefined();

      // Documents
      expect(payload.documents).toBeDefined();
      expect(payload.documents).toHaveLength(1);
      expect(payload.documents[0].fileName).toBe('metformin_rx.txt');
      expect(payload.documents[0].extractedData.medications[0].drugName).toBe('Metformin');

      // System Audit Trail
      expect(payload.auditTrail).toBeDefined();
      expect(payload.auditTrail.submissionTimestamp).toBeDefined();
    });
  });

  describe('Strict Multi-Session Isolation', () => {
    it('ensures Session A facts, questions, and documents never leak into Session B', async () => {
      // Patient A: Chest Pain
      const resA = await request(app).post('/api/clinical/sessions').send({ language: 'mr' });
      const idA = resA.body.data.sessionId;

      let stateA = activeSessions.get(idA);
      if (!stateA) {
        stateA = new ClinicalSessionState({ sessionId: idA, language: 'mr' });
        activeSessions.set(idA, stateA);
      }
      stateA.primaryConcern = 'छातीत दुखणे';
      stateA.recordAskedQuestion({ id: 'q_cardiac', concept: 'cardiac', attribute: 'pressure', text: 'छातीत जड वाटत आहे का?' });
      stateA.recordResponse({
        question: { id: 'q_cardiac', concept: 'cardiac', attribute: 'pressure' },
        rawResponse: 'होय खूप जड',
        normalizedValue: 'PRESENT',
      });

      await request(app)
        .post(`/api/clinical/sessions/${idA}/documents`)
        .send({
          fileBase64: Buffer.from('ECG Report: ST Elevation').toString('base64'),
          fileName: 'ecg_report.txt',
          mimeType: 'text/plain',
          documentType: 'LAB_REPORT',
        });

      // Complete Patient A
      await request(app).post(`/api/clinical/sessions/${idA}/submit`).send();

      // Patient B: Knee Pain (Fresh Session)
      const resB = await request(app).post('/api/clinical/sessions').send({ language: 'hi' });
      const idB = resB.body.data.sessionId;

      let stateB = activeSessions.get(idB);
      if (!stateB) {
        stateB = new ClinicalSessionState({ sessionId: idB, language: 'hi' });
        activeSessions.set(idB, stateB);
      }
      stateB.primaryConcern = 'घुटने में दर्द';

      // Verify State B has 0 Patient A questions or responses
      expect(stateB.questionsAlreadyAsked).toHaveLength(0);
      expect(stateB.responses).toHaveLength(0);
      expect(stateB.primaryConcern).toBe('घुटने में दर्द');
      expect(stateB.primaryConcern).not.toContain('छातीत');

      // Verify Session B documents endpoint returns 0 documents
      const docsB = await request(app).get(`/api/clinical/sessions/${idB}/documents`);
      expect(docsB.status).toBe(200);
      const docsList = Array.isArray(docsB.body.data) ? docsB.body.data : (docsB.body.data?.documents || []);
      expect(docsList).toHaveLength(0);

      // Verify Session B examination history contains 0 Session A questions
      const historyB = await request(app).get(`/api/clinical/sessions/${idB}/examination-history`);
      expect(historyB.status).toBe(200);
      const cardiacQ = historyB.body.data.examinationHistory.find((h) => h.questionId === 'q_cardiac');
      expect(cardiacQ).toBeUndefined(); // Zero leakage from Session A
      expect(historyB.body.data.examinationHistory).toHaveLength(1); // Only its own chief complaint
      expect(historyB.body.data.examinationHistory[0].patientAnswerRaw).toBe('घुटने में दर्द');
    });

    it('purges memory cache and marks session ABORTED on explicit reset', async () => {
      const res = await request(app).post('/api/clinical/sessions').send({ language: 'mr' });
      const sessionId = res.body.data.sessionId;

      let state = activeSessions.get(sessionId);
      if (!state) {
        state = new ClinicalSessionState({ sessionId, language: 'mr' });
        activeSessions.set(sessionId, state);
      }
      state.primaryConcern = 'उलटी होत आहे';
      expect(activeSessions.has(sessionId)).toBe(true);

      // Patient clicks "Back" to restart kiosk: POST /api/clinical/sessions/:id/reset
      const resetRes = await request(app).post(`/api/clinical/sessions/${sessionId}/reset`);
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // In-memory cache must be deleted
      expect(activeSessions.has(sessionId)).toBe(false);

      // Database session status must be ABORTED
      const dbSession = await prisma.clinicalSession.findUnique({ where: { id: sessionId } });
      expect(dbSession.status).toBe('ABORTED');
    });
  });
});
