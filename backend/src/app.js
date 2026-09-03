import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { patientRouter } from './routes/patient.routes.js';
import { doctorRouter } from './routes/doctor.routes.js';
import { clinicalRouter } from './routes/clinical.routes.js';
import { config } from './config/env.js';

export const app = express();

// Global Middleware
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/patient', patientRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/clinical', clinicalRouter);

// Centralized Error Handling
app.use(errorHandler);
