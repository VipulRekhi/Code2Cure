/**
 * PaddleOCR Devanagari & Unicode Preservation Test Suite (Phase 7.5)
 * Verifies real PaddleOCR image inference, Devanagari Unicode preservation,
 * PostgreSQL persistence round-trip, Express REST API, and zero hallucination.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { ocrService } from '../src/modules/document/ocrService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_DEVANAGARI_IMAGE = path.resolve(__dirname, '../../test_devanagari.png');

describe('Phase 7.5 PaddleOCR Devanagari & Unicode Preservation Suite', () => {
  it('reads test_devanagari.png and extracts authentic Devanagari text without corruption', async () => {
    expect(fs.existsSync(SAMPLE_DEVANAGARI_IMAGE)).toBe(true);
    const imageBuffer = fs.readFileSync(SAMPLE_DEVANAGARI_IMAGE);

    const res = await ocrService.processDocument({
      fileBuffer: imageBuffer,
      fileName: 'devanagari_prescription.png',
      mimeType: 'image/png',
    });

    expect(res.success).toBe(true);
    expect(res.processingStatus).toBe('PROCESSED');
    expect(res.confidence).toBeGreaterThan(0.85);

    // Verify Devanagari Unicode codepoints are intact
    expect(res.ocrText).toContain('माझं गुडघं दुखतंय');
    expect(res.ocrText).toContain('Paracetamol 500mg');
    expect(res.ocrText).toContain('Dr. Sharma Clinic');

    // Strict check: NO byte corruption or Unicode replacement chars
    expect(res.ocrText).not.toContain('\uFFFD');
    expect(res.ocrText).not.toContain('?>');
    expect(res.ocrText).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
  }, 60000);

  it('persists real PaddleOCR Devanagari text in PostgreSQL and retrieves exact codepoints', async () => {
    // 1. Create a clinical session
    const sessionRes = await request(app)
      .post('/api/clinical/sessions')
      .send({ language: 'mr' });
    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.data.sessionId;

    // 2. Upload actual Devanagari image as base64
    const imageBase64 = fs.readFileSync(SAMPLE_DEVANAGARI_IMAGE).toString('base64');
    const uploadRes = await request(app)
      .post(`/api/clinical/sessions/${sessionId}/documents`)
      .send({
        fileBase64: imageBase64,
        fileName: 'marathi_rx.png',
        mimeType: 'image/png',
        documentType: 'PRESCRIPTION',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    const docData = uploadRes.body.data;

    expect(docData.ocrText).toContain('माझं गुडघं दुखतंय');
    expect(docData.ocrText).toContain('Paracetamol 500mg');

    // 3. Directly query PostgreSQL via Prisma
    const dbRecord = await prisma.medicalDocument.findUnique({
      where: { id: docData.id },
    });
    expect(dbRecord).toBeDefined();
    expect(dbRecord.ocrText).toContain('माझं गुडघं दुखतंय');
    expect(dbRecord.ocrText).not.toContain('\uFFFD');

    // 4. Retrieve documents via Express GET API
    const listRes = await request(app)
      .get(`/api/clinical/sessions/${sessionId}/documents`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    const retrievedDoc = listRes.body.data.find((d) => d.id === docData.id);
    expect(retrievedDoc).toBeDefined();
    expect(retrievedDoc.ocrText).toContain('माझं गुडघं दुखतंय');
  }, 60000);

  it('rejects unreadable documents transparently without hallucinating text', async () => {
    // 1x1 transparent PNG / noise
    const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    const res = await ocrService.processDocument({
      fileBuffer: tinyPng,
      fileName: 'tiny_blank.png',
      mimeType: 'image/png',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('UNREADABLE_DOCUMENT');
    expect(res.ocrText).toBe('');
    expect(res.confidence).toBeLessThan(0.25);
  }, 60000);
});
