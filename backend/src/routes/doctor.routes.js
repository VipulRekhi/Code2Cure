import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export const doctorRouter = Router();

doctorRouter.get('/dashboard', authenticateToken, requireRole('DOCTOR'), (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Welcome to Doctor Dashboard',
      doctorId: req.user.doctorId,
    },
  });
});
