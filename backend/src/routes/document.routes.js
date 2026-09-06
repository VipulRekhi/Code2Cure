/**
 * Medical Document Routes (Phase 7 Section 6, 8, 9)
 */

import { Router } from 'express';
import { documentController } from '../controllers/document.controller.js';

export const documentRouter = Router({ mergeParams: true });

documentRouter.post('/', documentController.uploadDocument);
documentRouter.get('/', documentController.getSessionDocuments);
documentRouter.delete('/:docId', documentController.deleteDocument);
