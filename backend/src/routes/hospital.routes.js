import { Router } from 'express';
import { hospitalController } from '../controllers/hospital.controller.js';

export const hospitalRouter = Router();

hospitalRouter.get('/', hospitalController.getHospitals);
hospitalRouter.get('/:hospitalId/departments', hospitalController.getDepartments);
hospitalRouter.get('/departments/:departmentId/doctors', hospitalController.getDoctors);
