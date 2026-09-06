/**
 * Medical Document Controller (Phase 7 Section 6, 7, 8, 9)
 * Handles document upload, OCR processing, clinical information extraction,
 * and Supabase persistence strictly scoped by patient session.
 */

import { prisma } from '../config/prisma.js';
import { ocrService } from '../modules/document/ocrService.js';
import { documentExtractionService } from '../modules/document/documentExtractionService.js';
import { AppError } from '../middleware/errorHandler.js';

export const documentController = {
  /**
   * POST /api/clinical/sessions/:id/documents
   * Ingests a document image or PDF, runs OCR, extracts entities, and stores in Supabase.
   */
  async uploadDocument(req, res, next) {
    try {
      const { id: sessionId } = req.params;
      const {
        fileBase64,
        fileName = 'document.jpg',
        mimeType = 'image/jpeg',
        fileSizeBytes = 0,
        documentType = 'OTHER',
      } = req.body;

      // 1. Verify session exists in Supabase
      const dbSession = await prisma.clinicalSession.findUnique({
        where: { id: sessionId },
      });

      if (!dbSession) {
        throw new AppError(404, 'Clinical session not found', 'SESSION_NOT_FOUND');
      }

      // 2. Perform OCR layout and raw text extraction
      const ocrResult = await ocrService.processDocument({
        base64File: fileBase64,
        mimeType,
        fileName,
      });

      if (!ocrResult.success) {
        return res.status(200).json({
          success: false,
          error: ocrResult.error,
          message: ocrResult.message || "We couldn't read this document clearly. Please try another image.",
          data: {
            processingStatus: 'FAILED',
            sessionId,
            fileName,
          },
        });
      }

      // 3. Extract structured medical entities with zero-hallucination rules
      const extractedInfo = documentExtractionService.extract(
        ocrResult.ocrText,
        documentType
      );

      // 4. Persist structured record in Supabase (PostgreSQL)
      const docRecord = await prisma.medicalDocument.create({
        data: {
          sessionId,
          documentType: extractedInfo.documentType || documentType || 'OTHER',
          fileName,
          fileSizeBytes: fileSizeBytes || ocrResult.fileSizeBytes || 0,
          mimeType,
          ocrText: ocrResult.ocrText,
          extractedData: extractedInfo,
          confidence: ocrResult.confidence || 0.95,
          processingStatus: 'PROCESSED',
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: docRecord.id,
          sessionId: docRecord.sessionId,
          documentType: docRecord.documentType,
          fileName: docRecord.fileName,
          fileSizeBytes: docRecord.fileSizeBytes,
          mimeType: docRecord.mimeType,
          ocrText: docRecord.ocrText,
          extractedData: docRecord.extractedData,
          confidence: docRecord.confidence,
          processingStatus: docRecord.processingStatus,
          createdAt: docRecord.createdAt,
        },
        message: 'Medical document processed and structured successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/clinical/sessions/:id/documents
   * Lists all medical documents associated with the given patient session.
   * Guarantees strict session isolation.
   */
  async getSessionDocuments(req, res, next) {
    try {
      const { id: sessionId } = req.params;

      const dbSession = await prisma.clinicalSession.findUnique({
        where: { id: sessionId },
      });

      if (!dbSession) {
        throw new AppError(404, 'Clinical session not found', 'SESSION_NOT_FOUND');
      }

      const docs = await prisma.medicalDocument.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: docs,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/clinical/sessions/:id/documents/:docId
   * Deletes a document from the given session.
   */
  async deleteDocument(req, res, next) {
    try {
      const { id: sessionId, docId } = req.params;

      const deleteResult = await prisma.medicalDocument.deleteMany({
        where: {
          id: docId,
          sessionId,
        },
      });

      if (deleteResult.count === 0) {
        throw new AppError(404, 'Document not found in this session', 'DOCUMENT_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        message: 'Document deleted from session',
      });
    } catch (error) {
      next(error);
    }
  },
};
