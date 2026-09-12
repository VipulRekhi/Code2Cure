import { Router } from 'express';
import { doctorController } from '../controllers/doctor.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export const doctorRouter = Router();

// Public Doctor Authentication (supports demo evaluation access)
doctorRouter.post('/auth/login', doctorController.login);

// Protected Clinician Endpoints (Require valid Doctor JWT)
doctorRouter.get('/dashboard', authenticateToken, requireRole('DOCTOR'), doctorController.getDashboard);
doctorRouter.get('/queue', authenticateToken, requireRole('DOCTOR'), doctorController.getQueue);
doctorRouter.get('/alerts', authenticateToken, requireRole('DOCTOR'), doctorController.getAlerts);
doctorRouter.get('/patients', authenticateToken, requireRole('DOCTOR'), doctorController.getPatients);
doctorRouter.get('/patients/:id/workspace', authenticateToken, requireRole('DOCTOR'), doctorController.getWorkspace);
doctorRouter.post('/patients/:id/notes', authenticateToken, requireRole('DOCTOR'), doctorController.saveNotes);
doctorRouter.post('/patients/:id/status', authenticateToken, requireRole('DOCTOR'), doctorController.updateStatus);
doctorRouter.post('/patients/:id/review', authenticateToken, requireRole('DOCTOR'), doctorController.confirmReview);
doctorRouter.get('/reports', authenticateToken, requireRole('DOCTOR'), doctorController.getReports);
doctorRouter.get('/settings', authenticateToken, requireRole('DOCTOR'), doctorController.getSettings);
doctorRouter.post('/settings', authenticateToken, requireRole('DOCTOR'), doctorController.updateSettings);
