/**
 * Dynamic Question Service (Section 1, 7, 8, 10, 11, 12, 17, 18, 36)
 * Orchestrates LLM-driven clinical intake question generation with deterministic guardrails.
 */

import { aiConfig } from './aiConfig.js';
import { qwenProvider } from './providers/qwenProvider.js';
import { mockProvider } from './providers/mockProvider.js';
import { buildDynamicQuestionPrompt } from './prompts/dynamicQuestionPrompt.js';
import { dynamicQuestionSchema } from './schemas/dynamicQuestionSchema.js';
import { questionGuardrails } from '../questionEngine/questionGuardrails.js';

class DynamicQuestionService {
  constructor() {
    this.config = aiConfig;
  }

  /**
   * Generates the next most clinically relevant question based on ClinicalState.
   * Interface:
   *   dynamicQuestionService.generateNextQuestion({
   *     sessionState,
   *     currentResponse,
   *     language
   *   })
   */
  async generateNextQuestion({
    sessionState,
    currentResponse = '',
    language = 'mr',
  }) {
    const lang = language || sessionState?.language || 'mr';

    // 1. Compile facts and history from session state
    const knownFactsList = Object.values(sessionState?.collectedFacts || {});
    const questionsAlreadyAsked = sessionState?.questionsAlreadyAsked || [];

    // Derive primary concern for prompt
    const chiefComplaintFact = sessionState?.collectedFacts?.['symptom.pain.complaint_type'] ||
      sessionState?.collectedFacts?.['symptom.diarrhea.presence'] ||
      sessionState?.collectedFacts?.['symptom.pain.chest.location'] ||
      sessionState?.collectedFacts?.['symptom.pain.knee.location'] ||
      sessionState?.collectedFacts?.['symptom.pain.abdominal.location'];

    let primaryConcernStr = null;
    const concern = sessionState?.primaryConcern;
    const locationVal = sessionState?.collectedFacts?.['symptom.pain.location']?.value;

    // If primary concern is generic unlocalized pain without any known location, delegate to catalog to ask location
    if (concern === 'pain' && !locationVal && !sessionState?.collectedFacts?.['symptom.pain.knee.location'] && !sessionState?.collectedFacts?.['symptom.pain.chest.location']) {
      return {
        source: 'DETERMINISTIC_FALLBACK',
        shouldAskQuestion: true,
      };
    }

    if (concern === 'knee_pain' || locationVal === 'knee' || sessionState?.collectedFacts?.['symptom.pain.knee.location']) {
      primaryConcernStr = 'Knee Pain / Trauma / Joint discomfort';
    } else if (concern === 'chest_pain' || locationVal === 'chest' || sessionState?.collectedFacts?.['symptom.pain.chest.location']) {
      primaryConcernStr = 'Chest Pain / Discomfort';
    } else if (concern === 'stomach' || locationVal === 'abdomen' || sessionState?.collectedFacts?.['symptom.pain.abdominal.location']) {
      primaryConcernStr = 'Abdominal Pain / Stomach / GI';
    } else if (concern === 'diarrhea' || sessionState?.collectedFacts?.['symptom.diarrhea.presence']) {
      primaryConcernStr = 'Diarrhea / Loose Stools';
    } else if (concern === 'fever' || sessionState?.collectedFacts?.['symptom.fever.presence']) {
      primaryConcernStr = 'Fever / High Temperature';
    } else if (concern === 'cough' || sessionState?.collectedFacts?.['symptom.cough.presence']) {
      primaryConcernStr = 'Cough / Respiratory';
    } else if (concern === 'breathing' || sessionState?.collectedFacts?.['symptom.dyspnea.presence']) {
      primaryConcernStr = 'Shortness of Breath / Dyspnea';
    } else if (concern === 'headache' || locationVal === 'head') {
      primaryConcernStr = 'Headache';
    } else if (concern === 'pain') {
      primaryConcernStr = 'Pain / Discomfort';
    } else if (concern) {
      primaryConcernStr = String(concern);
    } else if (chiefComplaintFact?.value) {
      primaryConcernStr = String(chiefComplaintFact.value);
    }

    const { systemPrompt, userPrompt } = buildDynamicQuestionPrompt({
      primaryConcern: primaryConcernStr,
      knownFacts: knownFactsList,
      questionsAlreadyAsked,
      currentResponse,
      language: lang,
    });

    const activeProvider = this.config.mode === 'qwen' ? qwenProvider : mockProvider;

    try {
      // 2. Request Candidate Question from LLM Provider
      const result = await activeProvider.generateDynamicQuestion(systemPrompt, userPrompt);

      if (!result.success || !result.rawOutput) {
        console.warn(`[DynamicQuestionService] Provider ${activeProvider.name} failed: ${result.error}. Tagging for fallback.`);
        return {
          source: 'DETERMINISTIC_FALLBACK',
          shouldAskQuestion: true,
          error: result.error,
        };
      }

      // 3. Parse JSON Output
      let parsed = null;
      try {
        parsed = JSON.parse(result.rawOutput);
      } catch (e) {
        const jsonMatch = result.rawOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse JSON from model output');
        }
      }

      // 4. Validate Schema (Section 10)
      const schemaValidation = dynamicQuestionSchema.safeParse(parsed);
      if (!schemaValidation.success) {
        console.warn(`[DynamicQuestionService] Schema validation failed:`, schemaValidation.error.format());
        return {
          source: 'DETERMINISTIC_FALLBACK',
          shouldAskQuestion: true,
          error: 'SCHEMA_VALIDATION_FAILED',
        };
      }

      const candidate = schemaValidation.data;

      // 5. Check if LLM indicates intake is complete (Section 17)
      if (!candidate.shouldAskQuestion) {
        return {
          source: 'LLM_DYNAMIC',
          shouldAskQuestion: false,
          reason: candidate.reason || 'Clinical intake deemed complete by LLM',
        };
      }

      // 6. Evaluate Deterministic Guardrails (Section 2, 11, 12, 18, 19, 20)
      const guardrailResult = questionGuardrails.validateCandidateQuestion({
        candidate,
        sessionState,
        language: lang,
      });

      if (!guardrailResult.valid) {
        console.warn(`[DynamicQuestionService] Guardrail rejected question: ${guardrailResult.reason}`);
        // If max questions limit exceeded, cleanly stop
        if (guardrailResult.shouldStop) {
          return {
            source: 'LLM_DYNAMIC',
            shouldAskQuestion: false,
            reason: guardrailResult.reason,
          };
        }
        // Fallback to deterministic catalog on invalid candidate
        return {
          source: 'DETERMINISTIC_FALLBACK',
          shouldAskQuestion: true,
          error: guardrailResult.reason,
        };
      }

      // 7. Question Approved: Structure normalized question for client delivery
      const questionId = `dyn.${candidate.targetConcept || 'gen'}.${candidate.targetAttribute || Date.now()}`;
      const finalQuestion = {
        id: questionId,
        concept: candidate.targetConcept || 'symptom.general',
        attribute: candidate.targetAttribute || 'detail',
        inputType: candidate.options && candidate.options.length > 0 ? 'single-choice' : 'voice-or-text',
        priority: candidate.priority || 'high',
        text: candidate.questionText,
        options: (candidate.options || []).map((opt) => ({
          value: opt,
          label: opt,
          icon: '👉',
        })),
        source: 'LLM_DYNAMIC',
        reason: candidate.reason || null,
        triggerEmergency: guardrailResult.triggerEmergency || false,
      };

      // SECTION E: Temporary Development Trace Logging
      console.log('\n================== [PHASE 6 DYNAMIC QUESTION TRACE] ==================');
      console.log('1. Current sessionId:', sessionState?.sessionId);
      console.log('2. Current ClinicalState BEFORE Qwen:', JSON.stringify(sessionState?.collectedFacts, null, 2));
      console.log('3. Patient latest utterance:', currentResponse || '(initial chief complaint)');
      console.log('4. Previous questions:', JSON.stringify(questionsAlreadyAsked));
      console.log('5. Qwen prompt/context:\n', userPrompt);
      console.log('6. Raw Qwen response:\n', result.rawOutput);
      console.log('7. Parsed candidate question:', JSON.stringify(candidate, null, 2));
      console.log('8. Guardrail decision:', JSON.stringify(guardrailResult, null, 2));
      console.log('9. Final question:', JSON.stringify(finalQuestion, null, 2));
      console.log('10. Question source:', 'LLM_DYNAMIC');
      console.log('======================================================================\n');

      return {
        source: 'LLM_DYNAMIC',
        shouldAskQuestion: true,
        question: finalQuestion,
      };
    } catch (err) {
      console.warn(`[DynamicQuestionService] Exception in dynamic questioning: ${err.message}`);
      return {
        source: 'DETERMINISTIC_FALLBACK',
        shouldAskQuestion: true,
        error: err.message,
      };
    }
  }
}

export const dynamicQuestionService = new DynamicQuestionService();
