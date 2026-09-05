/**
 * Clinical Session & Question Engine Controller (Section 38, 39, 40)
 */

import { prisma } from '../config/prisma.js';
import { ClinicalSessionState, QuestionEngine, getQuestionById } from '../modules/questionEngine/index.js';
import { clinicalExtractionService, mapExtractionToUiOption } from '../modules/ai/index.js';
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

    // Hydrate facts from database if session already has stored facts
    if (sessionRecord.facts && Array.isArray(sessionRecord.facts)) {
      for (const fact of sessionRecord.facts) {
        const factKey = `${fact.concept}.${fact.attribute}`;
        sessionState.collectedFacts[factKey] = {
          concept: fact.concept,
          attribute: fact.attribute,
          value: fact.value,
          unit: fact.unit,
          status: fact.status,
          source: fact.source,
          confidence: fact.confidence,
          recordedAt: fact.recordedAt,
        };
      }
    }

    if (sessionRecord.responses && Array.isArray(sessionRecord.responses)) {
      for (const resp of sessionRecord.responses) {
        sessionState.responses.push(resp);
        sessionState.completedQuestionIds.add(resp.questionId);
      }
    }

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
      const nextResult = await engine.getNextQuestionDynamic(lang);

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
   * POST /api/clinical/sessions/:id/responses (Section 40 & 41)
   * Integrates Qwen 2.5 7B Clinical Slot Extraction for Voice/Text input.
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
      const activeQuestion = engine.getQuestion(questionId) || getQuestionById(questionId);

      if (!activeQuestion) {
        throw new AppError(404, `Question not found: "${questionId}"`, 'QUESTION_NOT_FOUND');
      }

      let finalNormalized = normalizedValue;
      let aiMetadata = null;
      let uiMapping = null;
      const isVoiceOrText = inputMethod.toUpperCase() === 'VOICE' || inputMethod.toUpperCase() === 'TEXT';

      // 1. AI Extraction Layer: Extract structured slots if voice/text statement provided (Section 8, 23)
      if (isVoiceOrText && rawResponse && typeof rawResponse === 'string' && finalNormalized === null) {
        const extractionResult = await clinicalExtractionService.extract(
          rawResponse,
          activeQuestion,
          engine.sessionState
        );

        if (extractionResult.success && extractionResult.extractions.length > 0) {
          aiMetadata = {
            provider: extractionResult.provider,
            latency: extractionResult.latency,
            extractionsCount: extractionResult.extractions.length,
          };

          const targetConcept = activeQuestion.targetConcept || activeQuestion.concept;
          const targetAttribute = activeQuestion.targetAttribute || activeQuestion.attribute;

          // Find extraction matching active question
          const primaryExtraction =
            extractionResult.extractions.find(
              (ext) => ext.concept === targetConcept && ext.attribute === targetAttribute
            ) ||
            extractionResult.extractions.find((ext) => ext.attribute === targetAttribute) ||
            extractionResult.extractions[0];

          uiMapping = mapExtractionToUiOption(primaryExtraction, activeQuestion);

          if (activeQuestion.id === 'q.chief_complaint') {
            // Check for specific anatomical or symptom matches in extractions
            const hasKnee = extractionResult.extractions.some(
              (ext) =>
                ext.concept === 'symptom.pain.knee' ||
                (ext.concept === 'symptom.pain' && ext.attribute === 'location' && ext.value === 'knee') ||
                ext.value === 'knee'
            );
            const hasChest = extractionResult.extractions.some(
              (ext) =>
                ext.concept === 'symptom.pain.chest' ||
                (ext.concept === 'symptom.pain' && ext.attribute === 'location' && ext.value === 'chest') ||
                ext.value === 'chest'
            );
            const hasAbdomen = extractionResult.extractions.some(
              (ext) =>
                ext.concept === 'symptom.pain.abdominal' ||
                ext.concept === 'symptom.vomiting' ||
                (ext.concept === 'symptom.pain' && ext.attribute === 'location' && ext.value === 'abdomen') ||
                ext.value === 'abdomen' ||
                ext.value === 'stomach'
            );
            const hasDiarrhea = extractionResult.extractions.some((ext) => ext.concept === 'symptom.diarrhea');
            const hasFever = extractionResult.extractions.some((ext) => ext.concept === 'symptom.fever');
            const hasCough = extractionResult.extractions.some((ext) => ext.concept === 'symptom.cough');
            const hasDyspnea = extractionResult.extractions.some(
              (ext) => ext.concept === 'symptom.dyspnea' || ext.concept === 'symptom.breathing'
            );
            const hasHeadache = extractionResult.extractions.some((ext) => ext.concept === 'symptom.headache');

            if (hasKnee || hasChest || primaryExtraction.concept === 'symptom.pain') {
              finalNormalized = 'pain';
              engine.sessionState.primaryConcern = 'pain';
            } else if (hasAbdomen) {
              finalNormalized = 'stomach';
              engine.sessionState.primaryConcern = 'stomach';
            } else if (hasDyspnea) {
              finalNormalized = 'breathing';
              engine.sessionState.primaryConcern = 'breathing';
            } else if (hasDiarrhea) {
              finalNormalized = 'diarrhea';
              engine.sessionState.primaryConcern = 'diarrhea';
            } else if (hasFever) {
              finalNormalized = 'fever';
              engine.sessionState.primaryConcern = 'fever';
            } else if (hasCough) {
              finalNormalized = 'cough';
              engine.sessionState.primaryConcern = 'cough';
            } else if (hasHeadache) {
              finalNormalized = 'headache';
              engine.sessionState.primaryConcern = 'headache';
            } else {
              finalNormalized = primaryExtraction.value;
              engine.sessionState.primaryConcern = String(primaryExtraction.value);
            }
          } else {
            finalNormalized = primaryExtraction.value !== null ? primaryExtraction.value : (uiMapping?.mappedOption ?? null);
          }

          // Record all extractions present in the statement as clinical facts
          for (const extra of extractionResult.extractions) {
            const extraFactKey = `${extra.concept}.${extra.attribute}`;
            engine.sessionState.collectedFacts[extraFactKey] = {
              concept: extra.concept,
              attribute: extra.attribute,
              value: extra.value,
              unit: extra.unit || null,
              status: extra.status,
              raw: extra.raw || null,
              precision: extra.precision || null,
              source: 'PATIENT_VOICE',
              confidence: extra.confidence || null,
              recordedAt: new Date().toISOString(),
            };
          }
        } else {
          // Failure Safety (Section 8): Do NOT create an unverified clinical fact.
          return res.status(200).json({
            success: false,
            fallbackToTouch: true,
            error: extractionResult.error || 'Extraction failed to identify valid clinical concepts',
            message: 'Voice input could not be verified. Please select an option on screen.',
            data: {
              currentQuestion: engine.getNextQuestion(language)?.question,
              recorded: null,
            },
          });
        }
      }

      const recordResult = engine.recordResponse({
        questionId,
        rawResponse,
        normalizedValue: finalNormalized,
        inputMethod,
        language,
        source: isVoiceOrText ? 'PATIENT_VOICE' : source,
      });

      if (uiMapping) {
        recordResult.selectedOption = uiMapping.mappedOption;
        recordResult.confidence = uiMapping.confidence;
        recordResult.needsClarification = uiMapping.needsClarification;
      }
      recordResult.rawTranscript = rawResponse;
      recordResult.clinicalSummary = engine.sessionState.getClinicalSummary();

      // Get next question dynamically via LLM planner taking new response into context (Section 1, 7, 31, 32)
      const dynamicNext = await engine.getNextQuestionDynamic(language, rawResponse || String(finalNormalized || ''));
      recordResult.next = dynamicNext;

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
          source: isVoiceOrText ? 'PATIENT_VOICE' : source.toUpperCase(),
          status: recordResult.recorded.status,
        },
      });

      // Persist facts to prisma.clinicalFact table (Section 21, 23)
      const targetFactKey = `${activeQuestion.targetConcept || activeQuestion.concept}.${activeQuestion.targetAttribute || activeQuestion.attribute}`;
      const primaryFact = engine.sessionState.collectedFacts[targetFactKey] || engine.sessionState.collectedFacts[`${activeQuestion.concept}.${activeQuestion.attribute}`];
      if (primaryFact) {
        await prisma.clinicalFact.create({
          data: {
            sessionId: id,
            concept: primaryFact.concept,
            attribute: primaryFact.attribute,
            value: primaryFact.value !== undefined ? JSON.parse(JSON.stringify(primaryFact.value)) : null,
            unit: primaryFact.value?.unit || primaryFact.unit || null,
            status: primaryFact.status || 'PRESENT',
            source: primaryFact.source || 'PATIENT_TOUCH',
            confidence: primaryFact.confidence || null,
          },
        });
      }

      // Also persist any additional facts (e.g. from voice statements)
      if (aiMetadata && aiMetadata.extractionsCount > 1) {
        for (const [factKey, fact] of Object.entries(engine.sessionState.collectedFacts)) {
          if (factKey !== targetFactKey) {
            await prisma.clinicalFact.create({
              data: {
                sessionId: id,
                concept: fact.concept,
                attribute: fact.attribute,
                value: fact.value !== undefined ? JSON.parse(JSON.stringify(fact.value)) : null,
                unit: fact.value?.unit || fact.unit || null,
                status: fact.status || 'PRESENT',
                source: fact.source || 'PATIENT_VOICE',
                confidence: fact.confidence || null,
              },
            });
          }
        }
      }

      // Update session status if complete
      if (recordResult.next.status === 'complete') {
        await prisma.clinicalSession.update({
          where: { id },
          data: { status: 'COMPLETED' },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ...recordResult,
          aiExtraction: aiMetadata,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/clinical/sessions/:id/summary
   * Returns authoritative, normalized clinical summary derived from ClinicalSessionState.
   */
  async getSummary(req, res, next) {
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
      const summary = engine.sessionState.getClinicalSummary();

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/clinical/sessions/:id/extract (Section 40)
   * Direct slot extraction endpoint for testing and verification.
   */
  async extractSlots(req, res, next) {
    try {
      const { id } = req.params;
      const { rawTranscript, questionId = null } = req.body;

      const dbSession = await prisma.clinicalSession.findUnique({ where: { id } });
      if (!dbSession) {
        throw new AppError(404, 'Clinical session not found', 'SESSION_NOT_FOUND');
      }

      const engine = getOrCreateEngine(dbSession);
      const activeQuestion = questionId ? getQuestionById(questionId) : null;

      const extractionResult = await clinicalExtractionService.extract(
        rawTranscript,
        activeQuestion,
        engine.sessionState
      );

      res.status(200).json({
        success: extractionResult.success,
        data: extractionResult,
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

