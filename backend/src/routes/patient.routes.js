import { Router } from 'express';
import { patientController } from '../controllers/patient.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export const patientRouter = Router();

// Public / Kiosk Patient Onboarding & Search Endpoints
patientRouter.post('/', patientController.registerOrUpdatePatient);
patientRouter.get('/search', patientController.searchPatients);
patientRouter.get('/:id', patientController.getPatientById);

// Protected Patient Dashboard (Legacy Backward Compatibility)
patientRouter.get('/dashboard', authenticateToken, requireRole('PATIENT'), (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Welcome to Patient Dashboard',
      patientId: req.user.patientId,
    },
  });
});
