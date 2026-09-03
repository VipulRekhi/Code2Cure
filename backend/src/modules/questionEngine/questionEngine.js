/**
 * Clinical Question Engine Facade (Section 11, 36, 37, 50, 51)
 * Clean, programmatic interface isolating clinical reasoning from HTTP & UI layers.
 */

import { QuestionSelector } from './questionSelector.js';
import { getQuestionById } from './questionCatalog.js';
import { parseDemoVoiceResponse } from './demoParser.js';

export class QuestionEngine {
  constructor(sessionState) {
    this.sessionState = sessionState;
    this.selector = new QuestionSelector();
  }

  /**
   * Returns the next eligible question formatted for the requested language.
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
      question: localizedQuestion,
      progress: this.getProgress(),
    };
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
    const question = getQuestionById(questionId);
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
