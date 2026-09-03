/**
 * Clinical State Management & Revision Engine (Section 20, 21, 22, 23, 25, 47, 48)
 * Explicitly separates raw patient responses from normalized facts, tracks provenance,
 * and handles stale fact invalidation upon response revision.
 */

export class ClinicalSessionState {
  constructor({ sessionId, patientId = null, language = 'mr', opdMode = 'GENERAL' }) {
    this.sessionId = sessionId;
    this.patientId = patientId;
    this.language = language;
    this.opdMode = opdMode;

    this.collectedFacts = {};      // factKey -> ClinicalFact
    this.responses = [];           // Array of QuestionResponse
    this.completedQuestionIds = new Set();
    this.skippedQuestionIds = new Set();
    this.currentQuestionId = null;
  }

  /**
   * Records a response with full provenance and derives normalized clinical facts.
   */
  recordResponse({
    question,
    rawResponse,
    normalizedValue,
    inputMethod = 'TOUCH',
    source = 'PATIENT_TOUCH',
    language = 'mr',
    confidence = null,
  }) {
    // 1. Determine presence status (Section 20)
    let status = 'PRESENT';
    if (normalizedValue === 'unknown' || rawResponse === 'unknown') {
      status = 'UNKNOWN';
    } else if (normalizedValue === 'no' || normalizedValue === 'NONE' || normalizedValue === false) {
      status = 'ABSENT';
    } else if (normalizedValue === 'declined') {
      status = 'DECLINED';
    }

    // 2. Add or update question response record (Section 21)
    const existingIndex = this.responses.findIndex((r) => r.questionId === question.id);
    const responseRecord = {
      questionId: question.id,
      rawResponse,
      normalizedValue,
      inputMethod,
      language,
      source,
      confidence,
      status,
      timestamp: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      this.responses[existingIndex] = responseRecord;
    } else {
      this.responses.push(responseRecord);
    }

    this.completedQuestionIds.add(question.id);

    // 3. Populate structured fact in language-neutral state (Section 23, 27)
    const factKey = `${question.concept}.${question.attribute}`;
    this.collectedFacts[factKey] = {
      concept: question.concept,
      attribute: question.attribute,
      value: normalizedValue,
      status,
      source,
      confidence,
      recordedAt: new Date().toISOString(),
    };

    // 4. Invalidate stale dependent facts if revision occurred (Section 47)
    this.invalidateStaleFacts(question.id, normalizedValue);

    return responseRecord;
  }

  /**
   * When an earlier answer changes, remove derived facts that are no longer valid.
   */
  invalidateStaleFacts(revisedQuestionId, newValue) {
    // If pain location is revised to something other than chest, clear chest-specific radiation/sweating facts
    if (revisedQuestionId === 'q.pain.location' && newValue !== 'chest') {
      delete this.collectedFacts['symptom.pain.chest.radiation'];
      delete this.collectedFacts['symptom.pain.chest.dyspnea'];
      delete this.collectedFacts['symptom.pain.chest.sweating'];
      this.completedQuestionIds.delete('q.pain.radiation');
      this.completedQuestionIds.delete('q.pain.dyspnea');
      this.completedQuestionIds.delete('q.pain.sweating');
    }
  }

  skipQuestion(questionId) {
    this.skippedQuestionIds.add(questionId);
    this.completedQuestionIds.add(questionId);
  }

  getFact(concept, attribute) {
    return this.collectedFacts[`${concept}.${attribute}`] || null;
  }

  toSummary() {
    return {
      sessionId: this.sessionId,
      patientId: this.patientId,
      language: this.language,
      opdMode: this.opdMode,
      factsCount: Object.keys(this.collectedFacts).length,
      facts: this.collectedFacts,
      completedQuestions: Array.from(this.completedQuestionIds),
      responsesCount: this.responses.length,
    };
  }
}
