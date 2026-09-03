/**
 * Clinical Session & Question Engine Controller (Section 38, 39, 40)
 */

import { prisma } from '../config/prisma.js';
import { ClinicalSessionState, QuestionEngine } from '../modules/questionEngine/index.js';
import { AppError } from '../middleware/errorHandler.js';

// In-memory active clinical session cache (backed by PostgreSQL / Prisma)
const activeSessions = new Map();

function getOrCreateEngine(sessionRecord) {
  let sessionState = activeSessions.get(sessionRecord.id);

  if (!sessionState) {
    sessionState = new ClinicalSessionState({
      sessionId: sessionRecord.id,
      patientId: sessionRecord.patientId,
      language: sessionRecord.language,
      opdMode: sessionRecord.opdMode,
    });
    activeSessions.set(sessionRecord.id, sessionState);
  }

  return new QuestionEngine(sessionState);
}

export const clinicalController = {
  /**
   * POST /api/clinical/sessions (Section 39)
   */
  async createSession(req, res, next) {
    try {
      const { patientId = null, language = 'mr', opdMode = 'GENERAL' } = req.body;

      // Check if patient exists in DB, otherwise allow anonymous/walk-in session
      let resolvedPatientId = null;
      if (patientId) {
        try {
          const existingPatient = await prisma.patient.findUnique({ where: { id: patientId } });
          if (existingPatient) resolvedPatientId = existingPatient.id;
        } catch (e) {
          // Keep null for walk-in client IDs
        }
      }

      // Persist session to database (Supabase / PostgreSQL)
      const dbSession = await prisma.clinicalSession.create({
        data: {
          patientId: resolvedPatientId,
          language,
          opdMode,
          status: 'IN_PROGRESS',
        },
      });

      const engine = getOrCreateEngine(dbSession);
      const firstQuestion = engine.getNextQuestion(language);

      res.status(201).json({
        success: true,
        data: {
          sessionId: dbSession.id,
          language: dbSession.language,
          opdMode: dbSession.opdMode,
          status: dbSession.status,
          next: firstQuestion,
        },
        message: 'Clinical session initialized',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/clinical/sessions/:id
   */
  async getSession(req, res, next) {
    try {
      const { id } = req.params;
      const dbSession = await prisma.clinicalSession.findUnique({
        where: { id },
        include: {
          responses: true,
          facts: true,
        },
      });

      if (!dbSession) {
        throw new AppError(404, 'Clinical session not found', 'SESSION_NOT_FOUND');
      }

      const engine = getOrCreateEngine(dbSession);

      res.status(200).json({
        success: true,
        data: {
          session: dbSession,
          progress: engine.getProgress(),
          isComplete: engine.isComplete(),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/clinical/sessions/:id/next-question (Section 37)
   */
  async getNextQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const lang = req.query.lang || undefined;

      const dbSession = await prisma.clinicalSession.findUnique({ where: { id } });
      if (!dbSession) {
        throw new AppError(404, 'Clinical session not found', 'SESSION_NOT_FOUND');
      }

      const engine = getOrCreateEngine(dbSession);
      const nextResult = engine.getNextQuestion(lang);

      // Update current question in DB
      if (nextResult.question) {
        await prisma.clinicalSession.update({
          where: { id },
          data: { currentQuestionId: nextResult.question.id },
        });
      } else if (nextResult.status === 'complete') {
        await prisma.clinicalSession.update({
          where: { id },
          data: { status: 'COMPLETED' },
        });
      }

      res.status(200).json({
        success: true,
        data: nextResult,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/clinical/sessions/:id/responses (Section 40)
   */
  async recordResponse(req, res, next) {
    try {
      const { id } = req.params;
      const {
        questionId,
        rawResponse,
        normalizedValue = null,
        inputMethod = 'TOUCH',
        language = 'mr',
        source = 'PATIENT_TOUCH',
      } = req.body;

      if (!questionId) {
        throw new AppError(400, 'questionId is required', 'MISSING_QUESTION_ID');
      }

      const dbSession = await prisma.clinicalSession.findUnique({ where: { id } });
      if (!dbSession) {
        throw new AppError(404, 'Clinical session not found', 'SESSION_NOT_FOUND');
      }

      const engine = getOrCreateEngine(dbSession);
      const recordResult = engine.recordResponse({
        questionId,
        rawResponse,
        normalizedValue,
        inputMethod,
        language,
        source,
      });

      // Persist response to database (Section 21, 23)
      await prisma.questionResponse.create({
        data: {
          sessionId: id,
          questionId,
          rawResponse: rawResponse ? JSON.parse(JSON.stringify(rawResponse)) : null,
          normalizedValue: recordResult.recorded.normalizedValue
            ? JSON.parse(JSON.stringify(recordResult.recorded.normalizedValue))
            : null,
          inputMethod: inputMethod.toUpperCase(),
          language,
          source: source.toUpperCase(),
          status: recordResult.recorded.status,
        },
      });

      // Update session status if complete
      if (recordResult.next.status === 'complete') {
        await prisma.clinicalSession.update({
          where: { id },
          data: { status: 'COMPLETED' },
        });
      }

      res.status(200).json({
        success: true,
        data: recordResult,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/clinical/sessions/:id/progress (Section 45)
   */
  async getProgress(req, res, next) {
    try {
      const { id } = req.params;
      const dbSession = await prisma.clinicalSession.findUnique({ where: { id } });
      if (!dbSession) {
        throw new AppError(404, 'Clinical session not found', 'SESSION_NOT_FOUND');
      }

      const engine = getOrCreateEngine(dbSession);
      res.status(200).json({
        success: true,
        data: engine.getProgress(),
      });
    } catch (error) {
      next(error);
    }
  },
};
