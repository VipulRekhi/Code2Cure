/**
 * Medical Document & OCR Pipeline Test Suite (Phase 7 Section 6, 7, 8, 9, 22)
 * Tests OCR layout text extraction, zero-hallucination structured entity parsing,
 * Supabase persistence, and cross-session document isolation.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { ocrService } from '../src/modules/document/ocrService.js';
import { documentExtractionService } from '../src/modules/document/documentExtractionService.js';

describe('Phase 7 Medical Document & OCR Pipeline Suite', () => {
  // 1. OCR Text Extraction & Layout Preservation (Section 6)
  describe('OCR Text Extraction & Quality Handling', () => {
    it('preserves raw extracted OCR text and recognizes medical layout', async () => {
      const samplePrescription = `Dr. A. Sharma, MD\nDate: 04/08/2026\nRx:\n1. Tab. Pantoprazole 40mg - 1-0-0 - Before food - 14 days\n2. Tab. Paracetamol 650mg - 1-0-1 - After food - 5 days`;
      const res = await ocrService.processDocument({
        fileBuffer: Buffer.from(samplePrescription, 'utf8'),
        fileName: 'prescription_sharma.txt',
        mimeType: 'text/plain',
      });

      expect(res.success).toBe(true);
      expect(res.ocrText).toContain('Dr. A. Sharma');
      expect(res.ocrText).toContain('Pantoprazole 40mg');
      expect(res.confidence).toBeGreaterThan(0.9);
      expect(res.processingStatus).toBe('PROCESSED');
    });

    it('rejects poor-quality / blurred documents gracefully without crashing', async () => {
      const res = await ocrService.processDocument({
        fileBuffer: Buffer.from('unreadable blurred artifact noise', 'utf8'),
        fileName: 'poor_quality_scan.jpg',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('UNREADABLE_DOCUMENT');
      expect(res.message).toContain("couldn't read this document clearly");
    });

    it('rejects empty or corrupt file payloads (< 32 bytes)', async () => {
      const res = await ocrService.processDocument({
        fileBuffer: Buffer.from('tiny', 'utf8'),
        fileName: 'corrupt.jpg',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('EMPTY_OR_CORRUPT_FILE');
    });

    it('supports multilingual Devanagari / Marathi medical documents', async () => {
      const marathiDoc = `डॉ. देशपांडे क्लिनिक\nतारीख: ०५/०८/२०२६\nरुग्ण तपासणी अहवाल\n१. औषध: पॅरासिटामॉल ५००mg - १ गोळी दिवसातून दोनदा\n२. पँटोप्राझोल ४०mg - उपाशीपोटी`;
      const res = await ocrService.processDocument({
        fileBuffer: Buffer.from(marathiDoc, 'utf8'),
        fileName: 'marathi_prescription.txt',
      });

      expect(res.success).toBe(true);
      expect(res.ocrText).toContain('डॉ. देशपांडे क्लिनिक');
      expect(res.ocrText).toContain('पॅरासिटामॉल');
    });
  });

  // 2. Strict Zero-Hallucination Verification (Section 7)
  describe('Zero Hallucination Clinical Extraction (Section 7)', () => {
    it('sets dosage to "Not detected" when prescription lacks clear dosage, NEVER invents "1 tablet twice daily"', () => {
      const textWithoutDosage = `City Clinic\nRx:\nTab. Paracetamol\nTake when needed`;
      const extracted = documentExtractionService.extract(textWithoutDosage, 'PRESCRIPTION');

      expect(extracted.medications.length).toBeGreaterThan(0);
      const paracetamol = extracted.medications.find((m) => m.drugName.toLowerCase().includes('paracetamol'));
      expect(paracetamol).toBeDefined();
      expect(paracetamol.dose).toBe('Not detected');
      expect(paracetamol.dose).not.toBe('1 tablet twice daily');
      expect(paracetamol.dose).not.toBe('500mg');
    });

    it('never fabricates unmentioned medicines or diagnoses', () => {
      const labText = `METROPOLIS LABS\nINVESTIGATION | RESULT | REFERENCE\nFasting Blood Glucose: 115 mg/dL (70-99)\nHbA1c: 6.2 % (< 5.7)`;
      const extracted = documentExtractionService.extract(labText, 'LAB_REPORT');

      expect(extracted.documentType).toBe('LAB_REPORT');
      expect(extracted.medications).toHaveLength(0); // MUST NOT invent medicines for lab report
      expect(extracted.labResults.length).toBeGreaterThanOrEqual(1);

      const glucose = extracted.labResults.find((r) => r.testName.toLowerCase().includes('glucose'));
      expect(glucose).toBeDefined();
      expect(glucose.resultValue).toContain('115');
    });

    it('extracts complete medications when dosage, frequency, and duration are present', () => {
      const fullText = `Rx:\n1. Tab. Amoxicillin 500mg - TDS - 7 days - After food`;
      const extracted = documentExtractionService.extract(fullText, 'PRESCRIPTION');

      expect(extracted.medications).toHaveLength(1);
      const amox = extracted.medications[0];
      expect(amox.drugName).toContain('Amoxicillin');
      expect(amox.dose).toBe('500mg');
      expect(amox.frequency).toBe('TDS');
      expect(amox.duration).toBe('7 days');
      expect(amox.instructions).toBe('After food');
    });
  });

  // 3. Supabase Integration & Document Session Isolation (Section 8 & 9)
  describe('Supabase Persistence & Strict Session Isolation', () => {
    it('persists medical document in Supabase scoped strictly to current session', async () => {
      // 1. Create clinical session
      const sessionRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'mr' });
      const sessionId = sessionRes.body.data.sessionId;

      // 2. Upload document
      const sampleText = `Dr. Patil\nRx:\nTab. Pantoprazole 40mg - OD - 7 days`;
      const uploadRes = await request(app)
        .post(`/api/clinical/sessions/${sessionId}/documents`)
        .send({
          fileBase64: Buffer.from(sampleText).toString('base64'),
          fileName: 'rx_patil.txt',
          mimeType: 'text/plain',
          documentType: 'PRESCRIPTION',
        });

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.data.sessionId).toBe(sessionId);
      expect(uploadRes.body.data.ocrText).toContain('Pantoprazole');
      expect(uploadRes.body.data.extractedData.medications[0].dose).toBe('40mg');

      // 3. Verify in database via Prisma
      const dbDoc = await prisma.medicalDocument.findUnique({
        where: { id: uploadRes.body.data.id },
      });
      expect(dbDoc).toBeDefined();
      expect(dbDoc.sessionId).toBe(sessionId);

      // 4. Retrieve session documents
      const listRes = await request(app)
        .get(`/api/clinical/sessions/${sessionId}/documents`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(listRes.body.data[0].id).toBe(uploadRes.body.data.id);
    });

    it('strictly isolates documents: Session A document can NEVER be accessed in Session B', async () => {
      // Session A
      const sessionARes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'mr' });
      const sessionAId = sessionARes.body.data.sessionId;

      const docARes = await request(app)
        .post(`/api/clinical/sessions/${sessionAId}/documents`)
        .send({
          fileBase64: Buffer.from('Dr. Secret A Prescription\nTab. CardiologyDrug 10mg').toString('base64'),
          fileName: 'session_A_doc.txt',
          documentType: 'PRESCRIPTION',
        });
      const docAId = docARes.body.data.id;

      // Session B (Different patient)
      const sessionBRes = await request(app)
        .post('/api/clinical/sessions')
        .send({ language: 'hi' });
      const sessionBId = sessionBRes.body.data.sessionId;

      // Retrieve Session B documents
      const sessionBDocsRes = await request(app)
        .get(`/api/clinical/sessions/${sessionBId}/documents`);
      expect(sessionBDocsRes.status).toBe(200);
      expect(sessionBDocsRes.body.data).toHaveLength(0); // Session B has 0 documents

      // Ensure Session B cannot delete or access Session A's document
      const unauthorizedDeleteRes = await request(app)
        .delete(`/api/clinical/sessions/${sessionBId}/documents/${docAId}`);
      expect(unauthorizedDeleteRes.status).toBe(404);
    });
  });
});
