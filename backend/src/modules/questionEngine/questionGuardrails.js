/**
 * Deterministic Question Guardrail Layer (Section 2, 11, 12, 18, 19, 20)
 * Acts strictly as a safety and validation guardrail for LLM-generated questions.
 * Does NOT generate questions; validates, filters duplicates, enforces medical safety,
 * detects already-known facts, and enforces boundaries.
 */

export const MEDICAL_ADVICE_BLACKLIST = [
  'औषध घ्या', 'गोळी घ्या', 'औषध देतो', 'दवा लें', 'दवाई खाइए', 'take this medicine',
  'तुम्हाला हृदयविकार झाला आहे', 'तुम्हाला कॅन्सर आहे', 'you have a heart attack',
  'you have cancer', 'डायग्नोसिस', 'निदान असे आहे', 'you are suffering from',
];

export class QuestionGuardrails {
  constructor(config = {}) {
    this.maxIntakeQuestions = config.maxIntakeQuestions || 7;
    this.maxQuestionsPerSymptom = config.maxQuestionsPerSymptom || 5;
  }

  /**
   * Evaluates candidate LLM question against deterministic safety and integrity rules.
   * Returns: { valid: boolean, reason?: string, triggerEmergency?: boolean }
   */
  validateCandidateQuestion({
    candidate,
    sessionState,
    language = 'mr',
  }) {
    // 1. Check if LLM signaled completion
    if (!candidate || candidate.shouldAskQuestion === false) {
      return { valid: true, shouldAskQuestion: false };
    }

    // 2. Question Text Non-empty Check (Section 20.1)
    const text = candidate.questionText ? candidate.questionText.trim() : '';
    if (!text) {
      return { valid: false, reason: 'EMPTY_QUESTION_TEXT' };
    }

    // 3. Intake Question Limit Check (Section 18)
    const completedCount = sessionState.completedQuestionIds ? sessionState.completedQuestionIds.size : 0;
    if (completedCount >= this.maxIntakeQuestions) {
      return { valid: false, reason: 'MAX_QUESTIONS_LIMIT_EXCEEDED', shouldStop: true };
    }

    // 4. Duplicate Question Check (Section 11, 20.5)
    // Compare concept + attribute and question text with questionsAlreadyAsked
    const targetKey = `${candidate.targetConcept}.${candidate.targetAttribute}`;
    if (sessionState.questionsAlreadyAsked && Array.isArray(sessionState.questionsAlreadyAsked)) {
      const isDuplicate = sessionState.questionsAlreadyAsked.some((q) => {
        const qKey = `${q.concept}.${q.attribute}`;
        return qKey === targetKey || q.text?.trim().toLowerCase() === text.toLowerCase();
      });
      if (isDuplicate) {
        return { valid: false, reason: `DUPLICATE_QUESTION: ${targetKey}` };
      }
    }

    // 5. Already-Known Information Check (Section 12, 20.4)
    // The LLM must not ask for facts already collected in ClinicalState
    if (sessionState.collectedFacts && candidate.targetConcept && candidate.targetAttribute) {
      const existingFact = sessionState.collectedFacts[targetKey];
      if (
        existingFact &&
        existingFact.value !== undefined &&
        existingFact.value !== null &&
        existingFact.status === 'PRESENT'
      ) {
        return { valid: false, reason: `ALREADY_KNOWN_INFORMATION: ${targetKey}` };
      }
    }

    // 6. Medical Guardrails (Section 2, 20.6, 20.7, 20.8)
    // Question must NOT diagnose, prescribe, or give medical advice
    const lowerText = text.toLowerCase();
    for (const term of MEDICAL_ADVICE_BLACKLIST) {
      if (lowerText.includes(term.toLowerCase())) {
        return { valid: false, reason: `MEDICAL_SAFETY_VIOLATION: prohibited term "${term}"` };
      }
    }

    // 7. Check for Emergency Red-Flags (Section 19)
    // Chest pain radiating to left arm + sweating or severe onset -> trigger emergency disposition
    const isChestPain = sessionState.collectedFacts?.['symptom.pain.chest.presence'] ||
      sessionState.collectedFacts?.['symptom.pain.location']?.value === 'chest';
    const hasRadiation = sessionState.collectedFacts?.['symptom.pain.chest.radiation']?.value === 'LEFT_ARM';
    const hasSweating = sessionState.collectedFacts?.['symptom.pain.chest.sweating']?.status === 'PRESENT';

    if (isChestPain && (hasRadiation || hasSweating)) {
      return {
        valid: true,
        candidate,
        triggerEmergency: true,
        emergencyReason: 'ACUTE_CHEST_PAIN_RED_FLAG',
      };
    }

    return {
      valid: true,
      shouldAskQuestion: true,
      candidate,
    };
  }
}

export const questionGuardrails = new QuestionGuardrails();
