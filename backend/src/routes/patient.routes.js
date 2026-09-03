import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export const patientRouter = Router();

patientRouter.get('/dashboard', authenticateToken, requireRole('PATIENT'), (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Welcome to Patient Dashboard',
      patientId: req.user.patientId,
    },
  });
});
