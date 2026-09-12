import { Router } from 'express';
import { hospitalController } from '../controllers/hospital.controller.js';

export const departmentRouter = Router();

departmentRouter.get('/:departmentId/doctors', hospitalController.getDoctors);
