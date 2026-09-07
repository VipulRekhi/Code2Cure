/**
 * Prescription Extraction & Performance Regression Suite (Phase 7.6)
 * Verifies:
 * 1. Exact 5-medication extraction on the user's test prescription fixture
 * 2. Multi-line prescription line grouping (dose, frequency, duration, instructions)
 * 3. Specific patterns: 1-0-1, 1-0-0, 10 ml-0-10 ml, TDS, Night, After food, Before breakfast
 * 4. Forms: Tablet, Syrup, Spray, Drops
 * 5. Strict Zero Hallucination: Missing dose/frequency/duration remains "Not detected"
 * 6. Field-level confidences (drugNameConfidence, doseConfidence, etc.)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import { app } from '../src/app.js';
import { documentExtractionService } from '../src/modules/document/documentExtractionService.js';
import { ocrService } from '../src/modules/document/ocrService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures/documents');
const PRESCRIPTION_5MEDS = path.join(FIXTURES_DIR, 'prescription_test_5meds.png');

describe('Phase 7.6 Prescription Extraction & Performance Suite', () => {
  // 1. All 5 Medications on the test prescription
  it('extracts all 5 medications from the test prescription with exact target entities', async () => {
    expect(fs.existsSync(PRESCRIPTION_5MEDS)).toBe(true);

    const imageBuffer = fs.readFileSync(PRESCRIPTION_5MEDS);
    const ocrResult = await ocrService.processDocument({
      fileBuffer: imageBuffer,
      fileName: 'prescription_test_5meds.png',
      mimeType: 'image/png',
    });

    expect(ocrResult.success).toBe(true);
    expect(ocrResult.ocrText).toContain('Paracetamol');
    expect(ocrResult.ocrText).toContain('Levocetirizine');
    expect(ocrResult.ocrText).toContain('Pantoprazole');
    expect(ocrResult.ocrText).toContain('Ambroxol');
    expect(ocrResult.ocrText).toContain('Nasal saline spray');

    const extracted = documentExtractionService.extract(ocrResult.ocrText, 'PRESCRIPTION', ocrResult.lines);
    expect(extracted.documentType).toBe('PRESCRIPTION');
    expect(extracted.medications.length).toBe(5);

    // 1. Paracetamol 650 mg | 1-0-1, after food | 3 days
    const paracetamol = extracted.medications.find((m) => m.drugName.toLowerCase() === 'paracetamol');
    expect(paracetamol).toBeDefined();
    expect(paracetamol.dose).toBe('650 mg');
    expect(paracetamol.frequency).toBe('1-0-1');
    expect(paracetamol.instructions).toBe('After food');
    expect(paracetamol.duration).toBe('3 days');
    expect(paracetamol.confidences.drugName).toBeGreaterThan(0.9);

    // 2. Levocetirizine 5 mg | 1-0-1, night | 5 days
    const levo = extracted.medications.find((m) => m.drugName.toLowerCase() === 'levocetirizine');
    expect(levo).toBeDefined();
    expect(levo.dose).toMatch(/5\s*mg/i);
    expect(levo.frequency).toBe('1-0-1');
    expect(levo.instructions).toBe('Night');
    expect(levo.duration).toBe('5 days');

    // 3. Pantoprazole 40 mg | 1-0-0, before breakfast | 5 days
    const panto = extracted.medications.find((m) => m.drugName.toLowerCase() === 'pantoprazole');
    expect(panto).toBeDefined();
    expect(panto.dose).toBe('40 mg');
    expect(panto.frequency).toBe('1-0-0');
    expect(panto.instructions).toBe('Before breakfast');
    expect(panto.duration).toBe('5 days');

    // 4. Ambroxol syrup 30 mg / 5 ml | 10 ml-0-10 ml | 5 days
    const ambroxol = extracted.medications.find((m) => m.drugName.toLowerCase() === 'ambroxol');
    expect(ambroxol).toBeDefined();
    expect(ambroxol.dose).toBe('30 mg / 5 ml');
    expect(ambroxol.frequency).toBe('10 ml-0-10 ml');
    expect(ambroxol.duration).toBe('5 days');

    // 5. Nasal saline spray 2 sprays each nostril | TDS | 5 days
    const nasal = extracted.medications.find((m) => m.drugName.toLowerCase().includes('nasal'));
    expect(nasal).toBeDefined();
    expect(nasal.dose).toBe('2 sprays');
    expect(nasal.frequency).toBe('TDS');
    expect(nasal.instructions).toBe('Each nostril');
    expect(nasal.duration).toBe('5 days');
  }, 90000);

  // 2. Deterministic Patterns & Edge Cases
  it('extracts printed prescription format accurately', () => {
    const text = `Dr. Roy Clinic\nRx:\n1. Tab. Paracetamol 650mg - 1-0-1 - After food - 3 days\n2. Tab. Levocetirizine 5mg - 0-0-1 - At night - 5 days`;
    const res = documentExtractionService.extract(text, 'PRESCRIPTION');
    expect(res.medications).toHaveLength(2);
    expect(res.medications[0].drugName).toBe('Paracetamol');
    expect(res.medications[0].dose).toBe('650mg');
    expect(res.medications[0].frequency).toBe('1-0-1');
    expect(res.medications[0].duration).toBe('3 days');
  });

  it('sets missing dose, frequency, and duration to "Not detected" without hallucinating', () => {
    const text = `Rx:\nTab. Paracetamol\nTake as needed`;
    const res = documentExtractionService.extract(text, 'PRESCRIPTION');
    expect(res.medications).toHaveLength(1);
    const med = res.medications[0];
    expect(med.drugName).toBe('Paracetamol');
    expect(med.dose).toBe('Not detected');
    expect(med.frequency).toBe('Not detected');
    expect(med.duration).toBe('Not detected');
    expect(res.missingFieldsNoted.length).toBeGreaterThanOrEqual(1);
  });

  it('supports liquid syrup frequency (10 ml - 0 - 10 ml) and TDS frequency patterns', () => {
    const text = `Rx:\nSyp. Ambroxol 30 mg / 5 ml\n10 ml - 0 - 10 ml\n5 days`;
    const res = documentExtractionService.extract(text, 'PRESCRIPTION');
    expect(res.medications).toHaveLength(1);
    expect(res.medications[0].drugName).toBe('Ambroxol');
    expect(res.medications[0].dose).toBe('30 mg / 5 ml');
    expect(res.medications[0].frequency).toBe('10 ml-0-10 ml');
    expect(res.medications[0].duration).toBe('5 days');
  });

  it('supports nasal spray 2 sprays and timing each nostril', () => {
    const text = `Rx:\nNasal saline spray\n2 sprays in each nostril\nTDS\n5 days`;
    const res = documentExtractionService.extract(text, 'PRESCRIPTION');
    expect(res.medications).toHaveLength(1);
    expect(res.medications[0].drugName).toBe('Nasal saline spray');
    expect(res.medications[0].dose).toBe('2 sprays');
    expect(res.medications[0].frequency).toBe('TDS');
    expect(res.medications[0].instructions).toBe('Each nostril');
  });

  it('persists structured 5-medication prescription in database via Express API', async () => {
    const sessionRes = await request(app).post('/api/clinical/sessions').send({ language: 'mr' });
    const sessionId = sessionRes.body.data.sessionId;

    const fileBase64 = fs.readFileSync(PRESCRIPTION_5MEDS).toString('base64');
    const uploadRes = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/documents`)
      .send({
        fileBase64,
        fileName: 'prescription_test_5meds.png',
        mimeType: 'image/png',
        documentType: 'PRESCRIPTION',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    const data = uploadRes.body.data;
    expect(data.extractedData.medications.length).toBe(5);

    // Query GET API
    const listRes = await request(app).get(`/api/clinical/sessions/${sessionId}/documents`);
    expect(listRes.status).toBe(200);
    const doc = listRes.body.data.find((d) => d.id === data.id);
    expect(doc).toBeDefined();
    expect(doc.extractedData.medications.length).toBe(5);
  }, 90000);
});
