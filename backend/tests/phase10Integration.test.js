import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('MediKiosk Phase 10 Full Integration Test Suite', () => {
  let doctorToken = '';
  let hospitalId = '';
  let departmentId = '';
  let ayushDeptId = '';
  let doctorId = '';

  let createdPatientA = null;
  let createdPatientB = null;
  let encounterGeneral = null;
  let encounterAyush = null;
  let sessionGeneral = null;
  let sessionAyush = null;

  beforeAll(async () => {
    await prisma.$connect();

    // Authenticate doctor
    const loginRes = await request(app)
      .post('/api/doctor/auth/login')
      .send({
        employeeId: 'DOC-8942',
        password: 'Password123!',
      });
    doctorToken = loginRes.body.data?.token;

    // Retrieve or seed test hospital
    let hospital = await prisma.hospital.findFirst({ where: { code: 'HOSP-PUNE-01' } });
    if (!hospital) {
      hospital = await prisma.hospital.create({
        data: {
          code: 'HOSP-PUNE-01',
          name: 'District Civil Hospital, Pune',
          city: 'Pune',
          state: 'Maharashtra',
        },
      });
    }
    hospitalId = hospital.id;

    // Retrieve or seed General and AYUSH departments
    let genDept = await prisma.department.findFirst({ where: { hospitalId, code: 'GEN-MED-01' } });
    if (!genDept) {
      genDept = await prisma.department.create({
        data: {
          hospitalId,
          code: 'GEN-MED-01',
          name: 'General Medicine',
          opdType: 'GENERAL',
        },
      });
    }
    departmentId = genDept.id;

    let ayuDept = await prisma.department.findFirst({ where: { hospitalId, code: 'AYU-KAYA-01' } });
    if (!ayuDept) {
      ayuDept = await prisma.department.create({
        data: {
          hospitalId,
          code: 'AYU-KAYA-01',
          name: 'Ayurvedic OPD / Kayachikitsa',
          opdType: 'AYUSH',
        },
      });
    }
    ayushDeptId = ayuDept.id;

    // Retrieve or seed Doctor
    let doc = await prisma.doctor.findFirst({ where: { hospitalId, departmentId } });
    if (!doc) {
      doc = await prisma.doctor.create({
        data: {
          hospitalId,
          departmentId,
          name: 'Dr. Priya Deshmukh',
          registrationNo: 'MCI-18492',
          specialization: 'General Medicine',
          qualification: 'MBBS, MD',
        },
      });
    }
    doctorId = doc.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --------------------------------------------------------------------------
  // 1. Hospital, Department & Doctor Retrieval
  // --------------------------------------------------------------------------
  it('1. GET /api/hospitals should return list of active facilities', async () => {
    const res = await request(app).get('/api/hospitals');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((h) => h.id === hospitalId)).toBe(true);
  });

  it('2. GET /api/hospitals/:id/departments should return active departments for hospital', async () => {
    const res = await request(app).get(`/api/hospitals/${hospitalId}/departments`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((d) => d.id === departmentId)).toBe(true);
    expect(res.body.data.some((d) => d.id === ayushDeptId)).toBe(true);
  });

  it('3. GET /api/departments/:id/doctors should return doctors belonging to department', async () => {
    const res = await request(app).get(`/api/departments/${departmentId}/doctors`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((d) => d.id === doctorId)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 2. Patient Creation & Lookup
  // --------------------------------------------------------------------------
  it('4. POST /api/patients should persist a new patient record in database', async () => {
    const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const uniqueAbha = `rahul.${Date.now()}@abdm`;
    const res = await request(app)
      .post('/api/patients')
      .send({
        fullName: 'Rahul Suresh Patil',
        ageYears: 42,
        gender: 'MALE',
        phone: uniquePhone,
        abhaId: uniqueAbha,
        address: 'Pune, Maharashtra',
        preferredLanguage: 'MR',
        medicalHistory: ['HYPERTENSION'],
        surgicalHistory: ['NONE'],
        familyHistory: 'DIABETES',
        personalHistory: 'NONE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.fullName).toBe('Rahul Suresh Patil');
    expect(res.body.data.ageYears).toBe(42);
    expect(res.body.data.patientCode).toMatch(/^PAT-/);

    createdPatientA = res.body.data;
    createdPatientA.phone = uniquePhone;
  });

  it('5. GET /api/patients/search should find existing patient by phone or patient code', async () => {
    const searchRes = await request(app)
      .get(`/api/patients/search?q=${createdPatientA.patientCode}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.body.data[0].id).toBe(createdPatientA.id);
  });

  // --------------------------------------------------------------------------
  // 3. Encounter Creation & Token Sequencing
  // --------------------------------------------------------------------------
  it('6 & 9. POST /api/encounters should create Encounter and generate institutional token', async () => {
    const res = await request(app)
      .post('/api/encounters')
      .send({
        patientId: createdPatientA.id,
        hospitalId,
        departmentId,
        doctorId,
        opdMode: 'GENERAL',
        appointmentType: 'WALK_IN',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.tokenNumber).toMatch(/^(GM|GEN)-/);
    expect(res.body.data.status).toBe('REGISTERED');

    encounterGeneral = res.body.data;
  });

  it('7 & 8. Relational validation: Rejects invalid hospital/department combination', async () => {
    const res = await request(app)
      .post('/api/encounters')
      .send({
        patientId: createdPatientA.id,
        hospitalId: '00000000-0000-0000-0000-000000000000', // non-existent
        departmentId,
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 4. Clinical Session Linked to Encounter
  // --------------------------------------------------------------------------
  it('10. POST /api/clinical/sessions should link ClinicalSession to Encounter', async () => {
    const res = await request(app)
      .post('/api/clinical/sessions')
      .send({
        patientId: createdPatientA.id,
        encounterId: encounterGeneral.id,
        language: 'mr',
        opdMode: 'GENERAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.encounterId).toBe(encounterGeneral.id);

    sessionGeneral = res.body.data;
  });

  // --------------------------------------------------------------------------
  // 5. Patient Intake & Submission Updates Encounter
  // --------------------------------------------------------------------------
  it('11 & 27. Record responses and submit: Encounter status updates to WAITING', async () => {
    // Record chief complaint
    await request(app)
      .post(`/api/clinical/sessions/${sessionGeneral.sessionId}/responses`)
      .send({
        questionId: 'q.chief_complaint',
        rawResponse: 'chest_pain',
        normalizedValue: 'chest_pain',
        inputMethod: 'TOUCH',
        language: 'mr',
      });

    // Record radiation fact to trigger red-flag
    await prisma.clinicalFact.create({
      data: {
        sessionId: sessionGeneral.sessionId,
        concept: 'symptom.pain.chest.radiation',
        attribute: 'radiation',
        value: 'LEFT_ARM',
        status: 'PRESENT',
        source: 'PATIENT_TOUCH',
      },
    });

    // Record verified patient submission
    const submitRes = await request(app)
      .post(`/api/clinical/sessions/${sessionGeneral.sessionId}/submit`)
      .send({
        verified: true,
        verificationMethod: 'ON_SCREEN_TOUCH',
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);

    // Verify database: Encounter is now WAITING
    const updatedEnc = await prisma.encounter.findUnique({
      where: { id: encounterGeneral.id },
    });
    expect(updatedEnc.status).toBe('WAITING');
  });

  // --------------------------------------------------------------------------
  // 6. Doctor Queue & Workspace Integration
  // --------------------------------------------------------------------------
  it('12. GET /api/doctor/queue should show the submitted patient in queue', async () => {
    const res = await request(app)
      .get('/api/doctor/queue')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const queueItem = res.body.data.queue.find((q) => q.encounterId === encounterGeneral.id);
    expect(queueItem).toBeDefined();
    expect(queueItem.token).toBe(encounterGeneral.tokenNumber);
    expect(queueItem.patient.name).toBe('Rahul Suresh Patil');
  });

  it('13 & 23. GET /api/doctor/patients/:id/workspace should load complete verified intake with alerts', async () => {
    const res = await request(app)
      .get(`/api/doctor/patients/${encounterGeneral.id}/workspace`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const ws = res.body.data;
    expect(ws.patient.name).toBe('Rahul Suresh Patil');
    expect(ws.token).toBe(encounterGeneral.tokenNumber);
    expect(ws.verbalSummary).toBeDefined();
    expect(ws.questionResponses.length).toBeGreaterThanOrEqual(1);
    expect(ws.triage.hasRedFlag).toBe(true); // Chest pain + left arm radiation
  });

  // --------------------------------------------------------------------------
  // 7. Doctor Notes, Status & Review Sign-off
  // --------------------------------------------------------------------------
  it('20. POST /api/doctor/patients/:id/notes should save doctor note to doctor_notes', async () => {
    const res = await request(app)
      .post(`/api/doctor/patients/${encounterGeneral.id}/notes`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ noteText: 'ECG ordered immediately. Troponin-I test stat.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.text).toContain('ECG ordered');

    const dbNote = await prisma.doctorNote.findFirst({
      where: { encounterId: encounterGeneral.id },
    });
    expect(dbNote).toBeDefined();
    expect(dbNote.noteText).toContain('ECG ordered');
  });

  it('22. POST /api/doctor/patients/:id/status should update encounter status', async () => {
    const res = await request(app)
      .post(`/api/doctor/patients/${encounterGeneral.id}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: 'IN_CONSULTATION' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const dbEnc = await prisma.encounter.findUnique({ where: { id: encounterGeneral.id } });
    expect(dbEnc.status).toBe('IN_CONSULTATION');
  });

  it('21. POST /api/doctor/patients/:id/review should record review sign-off', async () => {
    const res = await request(app)
      .post(`/api/doctor/patients/${encounterGeneral.id}/review`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ comments: 'Emergency cardiac protocol initiated.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.confirmed).toBe(true);

    const dbReview = await prisma.doctorReview.findFirst({
      where: { encounterId: encounterGeneral.id },
    });
    expect(dbReview).toBeDefined();
    expect(dbReview.status).toBe('CONFIRMED');

    const dbEnc = await prisma.encounter.findUnique({ where: { id: encounterGeneral.id } });
    expect(dbEnc.status).toBe('COMPLETED');
  });

  // --------------------------------------------------------------------------
  // 8. AYUSH Encounter & Session Isolation
  // --------------------------------------------------------------------------
  it('16 & 18. AYUSH Encounter creation and strict session isolation from General', async () => {
    // Create Patient B
    const patRes = await request(app)
      .post('/api/patients')
      .send({
        fullName: 'Sunita Vijay Deshmukh',
        ageYears: 50,
        gender: 'FEMALE',
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        preferredLanguage: 'MR',
      });
    createdPatientB = patRes.body.data;

    // Create AYUSH Encounter
    const encRes = await request(app)
      .post('/api/encounters')
      .send({
        patientId: createdPatientB.id,
        hospitalId,
        departmentId: ayushDeptId,
        doctorId: null, // Pooled department queue
        opdMode: 'AYUSH',
      });
    expect(encRes.status).toBe(201);
    expect(encRes.body.data.opdMode).toBe('AYUSH');
    expect(encRes.body.data.tokenNumber).toMatch(/^(AYU|AYUSH)-/);
    encounterAyush = encRes.body.data;

    // Create AYUSH ClinicalSession
    const sessRes = await request(app)
      .post('/api/clinical/sessions')
      .send({
        patientId: createdPatientB.id,
        encounterId: encounterAyush.id,
        language: 'mr',
        opdMode: 'AYUSH',
      });
    expect(sessRes.status).toBe(201);
    expect(sessRes.body.data.opdMode).toBe('AYUSH');
    sessionAyush = sessRes.body.data;

    // Record AYUSH facts
    await prisma.clinicalFact.create({
      data: {
        sessionId: sessionAyush.sessionId,
        concept: 'ayush.dashavidha.prakriti',
        attribute: 'prakriti',
        value: 'VATA_PITTA',
        status: 'PRESENT',
        source: 'PATIENT_TOUCH',
      },
    });

    // Verify workspace of Patient B contains AYUSH
    const wsB = await request(app)
      .get(`/api/doctor/patients/${encounterAyush.id}/workspace`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(wsB.status).toBe(200);
    expect(wsB.body.data.isAyushMode).toBe(true);
    expect(wsB.body.data.patient.name).toBe('Sunita Vijay Deshmukh');

    // Verify workspace of Patient A does NOT contain AYUSH or Patient B data
    const wsA = await request(app)
      .get(`/api/doctor/patients/${encounterGeneral.id}/workspace`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(wsA.status).toBe(200);
    expect(wsA.body.data.isAyushMode).toBe(false);
    expect(wsA.body.data.patient.name).toBe('Rahul Suresh Patil');
    expect(wsA.body.data.ayushAssessment).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 9. Unauthorized Cross-Hospital Access Rejection
  // --------------------------------------------------------------------------
  it('14. Unauthorized doctor cannot access unrelated hospital patient encounter', async () => {
    // Create another hospital
    const otherHospital = await prisma.hospital.create({
      data: {
        code: `HOSP-MUMBAI-${Date.now().toString().slice(-4)}`,
        name: 'KEM Hospital, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });

    const otherEnc = await prisma.encounter.create({
      data: {
        patientId: createdPatientA.id,
        hospitalId: otherHospital.id,
        departmentId,
        tokenNumber: 'KEM-999',
        opdMode: 'GENERAL',
      },
    });

    // Authenticated doctor from Pune hospital attempts to access KEM hospital patient
    const res = await request(app)
      .get(`/api/doctor/patients/${otherEnc.id}/workspace`)
      .set('Authorization', `Bearer ${doctorToken}`);

    // Expect 403 Forbidden
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.message || res.body.error).toContain('Unauthorized');
  });
});
