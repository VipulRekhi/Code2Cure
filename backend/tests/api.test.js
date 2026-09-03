import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('MediKiosk Phase 3 Backend API Test Suite', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Health Check Endpoints', () => {
    it('GET /api/health should return ok and service name', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.service).toBe('medikiosk-api');
    });

    it('GET /api/health/db should return ok and database connected', async () => {
      const res = await request(app).get('/api/health/db');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.database).toBe('connected');
    });
  });

  describe('Authentication & User Registration', () => {
    const testPatientEmail = `test-patient-${Date.now()}@medikiosk.local`;
    const testDoctorEmail = `test-doctor-${Date.now()}@medikiosk.local`;
    let patientToken = '';

    it('POST /api/auth/register should register a new patient user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testPatientEmail,
          password: 'Password123!',
          role: 'PATIENT',
          patient: {
            firstName: 'Rahul',
            lastName: 'Verma',
            phone: '+919811122233',
            preferredLanguage: 'HI',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testPatientEmail);
      expect(res.body.data.user.role).toBe('PATIENT');
      expect(res.body.data.token).toBeDefined();
      patientToken = res.body.data.token;
    });

    it('POST /api/auth/login should log in successfully with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testPatientEmail,
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('GET /api/auth/me should return authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testPatientEmail);
    });
  });
});
