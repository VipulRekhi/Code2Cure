/**
 * Clinical Question Engine Facade (Section 11, 36, 37, 50, 51)
 * Clean, programmatic interface isolating clinical reasoning from HTTP & UI layers.
 */

import { QuestionSelector } from './questionSelector.js';
import { getQuestionById } from './questionCatalog.js';
import { parseDemoVoiceResponse } from './demoParser.js';
import { dynamicQuestionService } from '../ai/dynamicQuestionService.js';

export class QuestionEngine {
  constructor(sessionState) {
    this.sessionState = sessionState;
    this.selector = new QuestionSelector();
  }

  /**
   * Primary dynamic question generator (Section 7, 8, 36)
   * Uses Qwen LLM to dynamically determine the next question, falling back to deterministic catalog if needed.
   */
  async getNextQuestionDynamic(requestedLanguage = null, currentResponse = '') {
    const lang = requestedLanguage || this.sessionState.language || 'mr';

    // Try dynamic LLM question generation first
    try {
      const dynamicResult = await dynamicQuestionService.generateNextQuestion({
        sessionState: this.sessionState,
        currentResponse,
        language: lang,
      });

      if (dynamicResult.shouldAskQuestion === false) {
        return {
          status: 'complete',
          source: dynamicResult.source || 'LLM_DYNAMIC',
          progress: this.getProgress(),
          reason: dynamicResult.reason,
        };
      }

      if (dynamicResult.source === 'LLM_DYNAMIC' && dynamicResult.question) {
        this.sessionState.recordAskedQuestion(dynamicResult.question);
        return {
          status: 'question',
          source: 'LLM_DYNAMIC',
          question: dynamicResult.question,
          progress: this.getProgress(),
        };
      }
    } catch (e) {
      console.warn('[QuestionEngine] Dynamic generation failed, falling back to deterministic catalog:', e.message);
    }

    // Fallback: Deterministic catalog (Clearly tagged as DETERMINISTIC_FALLBACK per Section 36)
    const fallback = this.getNextQuestion(lang);
    if (fallback.question) {
      fallback.question.source = 'DETERMINISTIC_FALLBACK';
      this.sessionState.recordAskedQuestion(fallback.question);
    }
    fallback.source = 'DETERMINISTIC_FALLBACK';
    return fallback;
  }

  /**
   * Deterministic Catalog Question Retriever (Maintained as fallback & test fixture per Section 35, 36)
   */
  getNextQuestion(requestedLanguage = null) {
    const lang = requestedLanguage || this.sessionState.language || 'mr';
    const nextQ = this.selector.getNextQuestion(this.sessionState);

    if (!nextQ) {
      return {
        status: 'complete',
        progress: this.getProgress(),
      };
    }

    this.sessionState.currentQuestionId = nextQ.id;

    // Localize question presentation for the frontend (Section 64)
    const localizedQuestion = {
      id: nextQ.id,
      concept: nextQ.concept,
      attribute: nextQ.attribute,
      inputType: nextQ.inputType,
      required: nextQ.required,
      priority: nextQ.priority,
      allowVoice: nextQ.allowVoice,
      allowTouch: nextQ.allowTouch,
      source: 'DETERMINISTIC_FALLBACK',
      text: nextQ.text[lang] || nextQ.text.en,
      helpText: nextQ.helpText ? nextQ.helpText[lang] || nextQ.helpText.en : null,
      options: nextQ.options
        ? nextQ.options.map((opt) => ({
            value: opt.value,
            label: opt.labels[lang] || opt.labels.en,
            icon: opt.icon,
          }))
        : [],
    };

    return {
      status: 'question',
      source: 'DETERMINISTIC_FALLBACK',
      question: localizedQuestion,
      progress: this.getProgress(),
    };
  }

  /**
   * Resolves a question by ID from catalog or dynamically asked questions.
   */
  getQuestion(questionId) {
    // 1. Check static catalog
    const catalogQ = getQuestionById(questionId);
    if (catalogQ) return catalogQ;

    // 2. Check dynamic questions asked in this session
    const askedQ = this.sessionState.questionsAlreadyAsked.find((q) => q.id === questionId);
    if (askedQ) {
      return {
        id: askedQ.id,
        concept: askedQ.concept,
        attribute: askedQ.attribute,
        targetConcept: askedQ.concept,
        targetAttribute: askedQ.attribute,
        text: askedQ.text,
        options: askedQ.options || [],
        source: askedQ.source || 'LLM_DYNAMIC',
      };
    }

    // 3. Parse dynamic question ID pattern if present
    if (questionId && questionId.startsWith('dyn.')) {
      const parts = questionId.split('.');
      const concept = parts.slice(1, parts.length - 1).join('.') || 'symptom.general';
      const attribute = parts[parts.length - 1] || 'detail';
      return {
        id: questionId,
        concept,
        attribute,
        targetConcept: concept,
        targetAttribute: attribute,
        text: '',
        options: [],
        source: 'LLM_DYNAMIC',
      };
    }

    return null;
  }

  /**
   * Records an answer from touch or voice and updates clinical state.
   */
  recordResponse({
    questionId,
    rawResponse,
    normalizedValue = null,
    inputMethod = 'TOUCH',
    language = 'mr',
    source = 'PATIENT_TOUCH',
    confidence = null,
  }) {
    const question = this.getQuestion(questionId);
    if (!question) {
      throw new Error(`Question not found: "${questionId}"`);
    }

    // If normalizedValue not explicitly provided and rawResponse is voice transcript:
    let finalNormalized = normalizedValue;
    if (finalNormalized === null && rawResponse) {
      finalNormalized = parseDemoVoiceResponse(rawResponse, question);
    }
    if (finalNormalized === null) {
      finalNormalized = rawResponse;
    }

    const recorded = this.sessionState.recordResponse({
      question,
      rawResponse,
      normalizedValue: finalNormalized,
      inputMethod,
      source,
      language,
      confidence,
    });

    return {
      success: true,
      recorded,
      next: this.getNextQuestion(language),
    };
  }

  skipQuestion(questionId) {
    this.sessionState.skipQuestion(questionId);
    return this.getNextQuestion();
  }

  getProgress() {
    return this.selector.getProgress(this.sessionState);
  }

  isComplete() {
    return this.selector.getNextQuestion(this.sessionState) === null;
  }

  /**
   * Future Safety Engine Integration Boundary (Section 50 & 51)
   * Evaluates state for emergency red flags without executing diagnosis.
   */
  evaluateClinicalState() {
    return {
      status: 'not_evaluated',
      redFlags: [],
      timestamp: new Date().toISOString(),
    };
  }
}

export function createQuestionEngine(sessionState) {
  return new QuestionEngine(sessionState);
}
