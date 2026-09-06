/**
 * Clinical Session API Routes (Section 38)
 */

import { Router } from 'express';
import { clinicalController } from '../controllers/clinical.controller.js';
import { documentRouter } from './document.routes.js';

export const clinicalRouter = Router();

clinicalRouter.post('/sessions', clinicalController.createSession);
clinicalRouter.get('/sessions/:id', clinicalController.getSession);
clinicalRouter.get('/sessions/:id/summary', clinicalController.getSummary);
clinicalRouter.get('/sessions/:id/examination-history', clinicalController.getExaminationHistory);
clinicalRouter.get('/sessions/:id/next-question', clinicalController.getNextQuestion);
clinicalRouter.post('/sessions/:id/responses', clinicalController.recordResponse);
clinicalRouter.patch('/sessions/:id/responses/:questionId', clinicalController.updateResponse);
clinicalRouter.post('/sessions/:id/submit', clinicalController.submitToDoctor);
clinicalRouter.post('/sessions/:id/reset', clinicalController.resetSession);
clinicalRouter.post('/sessions/:id/extract', clinicalController.extractSlots);
clinicalRouter.get('/sessions/:id/progress', clinicalController.getProgress);

// Mount medical documents sub-router
clinicalRouter.use('/sessions/:id/documents', documentRouter);


