/**
 * Clinical State Management & Revision Engine (Section 20, 21, 22, 23, 25, 47, 48)
 * Explicitly separates raw patient responses from normalized facts, tracks provenance,
 * and handles stale fact invalidation upon response revision.
 */

import { buildCanonicalClinicalSummary } from './clinicalSummaryBuilder.js';
import { getQuestionById } from './questionCatalog.js';

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
    this.questionsAlreadyAsked = []; // Array of asked questions { id, concept, attribute, text, source }
    this.currentQuestionId = null;
    this.primaryConcern = null;
    this.summaryVersion = 1;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Records a question that was asked to the patient for tracking & duplicate avoidance.
   */
  recordAskedQuestion(question) {
    if (!question) return;
    this.currentQuestionId = question.id;
    this.questionsAlreadyAsked.push({
      id: question.id,
      concept: question.concept,
      attribute: question.attribute,
      text: question.text,
      options: question.options || [],
      source: question.source || 'LLM_DYNAMIC',
      timestamp: new Date().toISOString(),
    });
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
    const normStr = String(normalizedValue || '').toUpperCase();
    const rawStr = String(rawResponse || '').toLowerCase();
    if (normStr === 'UNKNOWN' || rawStr === 'unknown' || rawStr.includes('माहित नाही') || rawStr.includes('पता नहीं') || rawStr.includes("don't know")) {
      status = 'UNKNOWN';
    } else if (normStr === 'ABSENT' || normStr === 'NO' || normStr === 'NONE' || normalizedValue === false || rawStr === 'नाही' || rawStr === 'नहीं' || rawStr === 'no' || rawStr === 'कधीच नाही') {
      status = 'ABSENT';
    } else if (normStr === 'DECLINED' || rawStr === 'declined') {
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

    if (question.id === 'q.chief_complaint' && normalizedValue) {
      this.primaryConcern = String(normalizedValue);
    }

    return responseRecord;
  }

  /**
   * When an earlier answer changes, remove derived facts that are no longer valid.
   */
  invalidateStaleFacts(revisedQuestionId, newValue) {
    if (revisedQuestionId === 'q.pain.location' || revisedQuestionId.includes('location')) {
      const valStr = String(newValue || '').toLowerCase();
      if (!valStr.includes('chest')) {
        delete this.collectedFacts['symptom.pain.chest.location'];
        delete this.collectedFacts['symptom.pain.chest.radiation'];
        delete this.collectedFacts['symptom.pain.chest.dyspnea'];
        delete this.collectedFacts['symptom.pain.chest.sweating'];
        this.completedQuestionIds.delete('q.pain.radiation');
        this.completedQuestionIds.delete('q.pain.dyspnea');
        this.completedQuestionIds.delete('q.pain.sweating');
      }
      if (!valStr.includes('knee')) {
        delete this.collectedFacts['symptom.pain.knee.location'];
      }
      if (!valStr.includes('shoulder')) {
        delete this.collectedFacts['symptom.pain.shoulder.location'];
      }
      if (!valStr.includes('abdomen') && !valStr.includes('stomach')) {
        delete this.collectedFacts['symptom.pain.abdominal.location'];
      }
    }
  }

  skipQuestion(questionId) {
    this.skippedQuestionIds.add(questionId);
    this.completedQuestionIds.add(questionId);
  }

  getFact(concept, attribute) {
    return this.collectedFacts[`${concept}.${attribute}`] || null;
  }

  /**
   * Builds structured, validated canonical clinical summary for review and persistence.
   */
  getClinicalSummary(documents = [], options = {}) {
    return buildCanonicalClinicalSummary(this, documents, options);
  }

  /**
   * Generates the complete examination history (Phase 7 Section 10, 11, 12, 13)
   * Correlates every asked question with the patient's actual response, original transcript,
   * normalized clinical interpretation, and input method.
   */
  getExaminationHistory(lang = 'mr') {
    const history = [];

    // 1. Initial Chief Complaint turn if present
    const ccResp = this.responses.find((r) => r.questionId === 'q.chief_complaint');
    if (ccResp || this.primaryConcern) {
      let qText = 'तुम्हाला काय त्रास होतोय?';
      if (lang === 'hi') qText = 'आपको क्या तकलीफ हो रही है?';
      else if (lang === 'en') qText = 'What problem are you experiencing?';

      const rawVal = ccResp?.rawResponse;
      const normVal = ccResp?.normalizedValue || this.primaryConcern;
      const isVoice = ccResp?.inputMethod === 'VOICE';

      history.push({
        questionId: 'q.chief_complaint',
        concept: 'symptom.pain.complaint_type',
        attribute: 'complaint_type',
        questionText: qText,
        patientAnswerRaw: typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal || normVal || ''),
        originalTranscript: isVoice && typeof rawVal === 'string' ? rawVal : null,
        normalizedInterpretation: String(normVal || ''),
        status: 'PRESENT',
        inputMethod: ccResp?.inputMethod || 'TOUCH',
        timestamp: ccResp?.timestamp || new Date().toISOString(),
      });
    }

    // 2. All subsequent dynamic or catalog questions asked
    for (const asked of this.questionsAlreadyAsked) {
      if (asked.id === 'q.chief_complaint') continue;

      const resp = this.responses.find((r) => r.questionId === asked.id);
      if (!resp) continue; // Only include answered questions

      const isVoice = resp.inputMethod === 'VOICE';
      const rawAnswer = resp.rawResponse;
      const normVal = resp.normalizedValue;

      let interpretation = normVal !== null && normVal !== undefined ? normVal : rawAnswer;
      if (resp.status === 'UNKNOWN' || normVal === 'unknown') {
        interpretation = lang === 'mr' ? 'माहित नाही' : lang === 'hi' ? 'पता नहीं' : "Don't know";
      } else if (resp.status === 'ABSENT' || normVal === false || normVal === 'no') {
        interpretation = lang === 'mr' ? 'नाही' : lang === 'hi' ? 'नहीं' : 'No';
      } else if (resp.status === 'PRESENT' && (normVal === true || normVal === 'yes')) {
        interpretation = lang === 'mr' ? 'हो' : lang === 'hi' ? 'हाँ' : 'Yes';
      }

      history.push({
        questionId: asked.id,
        concept: asked.concept,
        attribute: asked.attribute,
        questionText: asked.text,
        patientAnswerRaw: typeof rawAnswer === 'object' ? JSON.stringify(rawAnswer) : String(rawAnswer ?? ''),
        originalResponse: typeof rawAnswer === 'object' ? JSON.stringify(rawAnswer) : String(rawAnswer ?? ''),
        originalTranscript: isVoice && typeof rawAnswer === 'string' ? rawAnswer : null,
        normalizedValue: normVal !== undefined ? normVal : rawAnswer,
        normalizedInterpretation: typeof interpretation === 'object' ? JSON.stringify(interpretation) : String(interpretation ?? ''),
        status: resp.status || 'PRESENT',
        inputMethod: resp.inputMethod || 'TOUCH',
        options: asked.options || [],
        timestamp: resp.timestamp || asked.timestamp,
      });
    }

    return history;
  }

  /**
   * Updates an existing response upon patient correction (Phase 7 Section 18)
   */
  updateResponse({ questionId, newResponse, normalizedValue, inputMethod = 'TOUCH', language = 'mr' }) {
    const asked = this.questionsAlreadyAsked.find((q) => q.id === questionId) || getQuestionById(questionId);
    const concept = asked?.concept || (questionId.includes('duration') ? 'symptom.pain' : (questionId.includes('location') ? 'symptom.pain' : 'clinical'));
    const attribute = asked?.attribute || (questionId.includes('duration') ? 'duration' : (questionId.includes('location') ? 'location' : 'value'));

    let status = 'PRESENT';
    const normStr = String(normalizedValue || '').toUpperCase();
    const rawStr = String(newResponse || '').toLowerCase();
    if (normStr === 'UNKNOWN' || rawStr === 'unknown' || rawStr.includes('माहित नाही') || rawStr.includes('पता नहीं') || rawStr.includes("don't know")) {
      status = 'UNKNOWN';
    } else if (normStr === 'ABSENT' || normStr === 'NO' || normStr === 'NONE' || normalizedValue === false || rawStr === 'नाही' || rawStr === 'नहीं' || rawStr === 'no' || rawStr === 'कधीच नाही') {
      status = 'ABSENT';
    } else if (normStr === 'DECLINED' || rawStr === 'declined') {
      status = 'DECLINED';
    }

    const existingIndex = this.responses.findIndex((r) => r.questionId === questionId);
    const existing = existingIndex !== -1 ? this.responses[existingIndex] : null;
    const correctionHistory = existing?.correctionHistory ? [...existing.correctionHistory] : [];
    if (existing) {
      correctionHistory.push({
        previousResponse: existing.rawResponse || existing.originalResponse,
        previousNormalized: existing.normalizedValue,
        previousStatus: existing.status,
        correctedAt: new Date().toISOString(),
      });
    }

    const updatedRecord = {
      questionId,
      rawResponse: newResponse,
      originalResponse: newResponse,
      normalizedValue: normalizedValue !== undefined ? normalizedValue : newResponse,
      inputMethod,
      language,
      source: inputMethod === 'VOICE' ? 'PATIENT_VOICE' : 'PATIENT_TOUCH',
      status,
      correctionHistory,
      timestamp: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      this.responses[existingIndex] = updatedRecord;
    } else {
      this.responses.push(updatedRecord);
    }

    // Update fact
    const factKey = `${concept}.${attribute}`;
    this.collectedFacts[factKey] = {
      concept,
      attribute,
      value: updatedRecord.normalizedValue,
      status,
      source: updatedRecord.source,
      recordedAt: new Date().toISOString(),
    };

    if (questionId.includes('location') || questionId === 'q.pain.location') {
      const locVal = String(updatedRecord.normalizedValue || '').toLowerCase();
      this.collectedFacts['symptom.pain.location'] = {
        concept: 'symptom.pain',
        attribute: 'location',
        value: updatedRecord.normalizedValue,
        status,
        source: updatedRecord.source,
        recordedAt: new Date().toISOString(),
      };
      if (locVal.includes('knee')) {
        this.collectedFacts['symptom.pain.knee.location'] = {
          concept: 'symptom.pain.knee',
          attribute: 'location',
          value: updatedRecord.normalizedValue,
          status,
          source: updatedRecord.source,
          recordedAt: new Date().toISOString(),
        };
      }
    }

    if (attribute === 'duration' || questionId.includes('duration')) {
      for (const [k, f] of Object.entries(this.collectedFacts)) {
        if (f.attribute === 'duration' || k.endsWith('.duration')) {
          f.value = updatedRecord.normalizedValue;
          f.status = status;
          f.source = updatedRecord.source;
          f.recordedAt = new Date().toISOString();
        }
      }
    }

    this.invalidateStaleFacts(questionId, updatedRecord.normalizedValue);

    this.summaryVersion = (this.summaryVersion || 1) + 1;
    this.updatedAt = new Date().toISOString();

    return updatedRecord;
  }

  toSummary() {
    return this.getClinicalSummary();
  }
}

