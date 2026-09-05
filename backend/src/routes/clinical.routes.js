/**
 * Clinical Session API Routes (Section 38)
 */

import { Router } from 'express';
import { clinicalController } from '../controllers/clinical.controller.js';

export const clinicalRouter = Router();

clinicalRouter.post('/sessions', clinicalController.createSession);
clinicalRouter.get('/sessions/:id', clinicalController.getSession);
clinicalRouter.get('/sessions/:id/summary', clinicalController.getSummary);
clinicalRouter.get('/sessions/:id/next-question', clinicalController.getNextQuestion);
clinicalRouter.post('/sessions/:id/responses', clinicalController.recordResponse);
clinicalRouter.post('/sessions/:id/extract', clinicalController.extractSlots);
clinicalRouter.get('/sessions/:id/progress', clinicalController.getProgress);

