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
    this.questionsAlreadyAsked = []; // Array of asked questions { id, concept, attribute, text, source }
    this.currentQuestionId = null;
    this.primaryConcern = null;
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

  /**
   * Builds structured, validated clinical summary for review and persistence.
   */
  getClinicalSummary() {
    // 1. Resolve Primary Concern (Section 15, 16, 44)
    // Priority: explicitly assigned primaryConcern, or derived from first complaint fact, or null. NEVER default to CHEST_PAIN or pain!
    let primaryConcernVal = this.primaryConcern;

    if (!primaryConcernVal) {
      if (this.collectedFacts['symptom.dyspnea.presence']?.status === 'PRESENT' || this.collectedFacts['symptom.breathing.presence']?.status === 'PRESENT') {
        primaryConcernVal = 'breathing';
      } else if (this.collectedFacts['symptom.diarrhea.presence']?.status === 'PRESENT') {
        primaryConcernVal = 'diarrhea';
      } else if (this.collectedFacts['symptom.pain.shoulder.location']?.value === 'shoulder' || this.collectedFacts['symptom.pain.shoulder.presence']?.status === 'PRESENT') {
        primaryConcernVal = 'shoulder_pain';
      } else if (this.collectedFacts['symptom.pain.chest.location']?.value === 'chest' || this.collectedFacts['symptom.pain.chest.presence']?.status === 'PRESENT') {
        primaryConcernVal = 'chest_pain';
      } else if (this.collectedFacts['symptom.pain.abdominal.location']?.value === 'abdomen' || this.collectedFacts['symptom.pain.abdominal.presence']?.status === 'PRESENT') {
        primaryConcernVal = 'stomach';
      } else if (this.collectedFacts['symptom.pain.knee.location']?.value === 'knee' || this.collectedFacts['symptom.pain.knee.presence']?.status === 'PRESENT') {
        primaryConcernVal = 'knee_pain';
      } else if (this.collectedFacts['symptom.pain.complaint_type']?.value) {
        primaryConcernVal = this.collectedFacts['symptom.pain.complaint_type'].value;
      } else {
        const chiefComplaintResponse = this.responses.find((r) => r.questionId === 'q.chief_complaint');
        if (chiefComplaintResponse?.normalizedValue) {
          primaryConcernVal = chiefComplaintResponse.normalizedValue;
        }
      }
    }

    // 2. Resolve Duration (Dynamic per primary concern; supports range & vague objects)
    let duration = null;
    let durationFact =
      this.collectedFacts['symptom.dyspnea.duration'] ||
      this.collectedFacts['symptom.breathing.duration'] ||
      this.collectedFacts['symptom.diarrhea.duration'] ||
      this.collectedFacts['symptom.pain.knee.duration'] ||
      this.collectedFacts['symptom.pain.shoulder.duration'] ||
      this.collectedFacts['symptom.pain.chest.duration'] ||
      this.collectedFacts['symptom.pain.abdominal.duration'] ||
      this.collectedFacts['symptom.vomiting.duration'] ||
      this.collectedFacts['symptom.fever.duration'] ||
      this.collectedFacts['symptom.pain.duration'] ||
      this.collectedFacts['symptom.cough.duration'] ||
      this.collectedFacts['clinical.duration.duration'] ||
      this.collectedFacts['duration.duration'];

    if (!durationFact) {
      durationFact = Object.values(this.collectedFacts).find((f) => f.attribute === 'duration');
    }

    if (durationFact) {
      if (
        durationFact.precision === 'vague' ||
        durationFact.value === null ||
        (typeof durationFact.value === 'object' && durationFact.value?.precision === 'vague')
      ) {
        duration = {
          value: null,
          raw: durationFact.raw || durationFact.value?.raw || 'vague',
          precision: 'vague',
        };
      } else if (typeof durationFact.value === 'object' && durationFact.value !== null) {
        if (durationFact.value.min !== undefined && durationFact.value.max !== undefined) {
          duration = {
            min: durationFact.value.min,
            max: durationFact.value.max,
            unit: durationFact.value.unit || 'days',
          };
        } else if (durationFact.value.amount !== undefined || durationFact.value.value !== undefined) {
          duration = {
            value: durationFact.value.amount ?? durationFact.value.value,
            unit: durationFact.value.unit || durationFact.unit || 'days',
          };
        } else {
          duration = durationFact.value;
        }
      } else if (typeof durationFact.value === 'number') {
        duration = {
          value: durationFact.value,
          unit: durationFact.unit || 'days',
        };
      }
    }

    // 3. Resolve Severity (Null if not reported, never default to MODERATE)
    let severity = null;
    let severityFact =
      this.collectedFacts['symptom.dyspnea.severity'] ||
      this.collectedFacts['symptom.breathing.severity'] ||
      this.collectedFacts['symptom.pain.severity'] ||
      this.collectedFacts['symptom.pain.chest.severity'] ||
      this.collectedFacts['symptom.pain.knee.severity'] ||
      this.collectedFacts['symptom.pain.abdominal.severity'] ||
      this.collectedFacts['clinical.severity.severity'];

    if (!severityFact) {
      severityFact = Object.values(this.collectedFacts).find((f) => f.attribute === 'severity');
    }

    if (severityFact?.value) {
      const rawSev = String(severityFact.value).toUpperCase();
      if (rawSev.includes('MILD') || rawSev.includes('कमी') || rawSev.includes('हल्का')) severity = 'MILD';
      else if (rawSev.includes('MODERATE') || rawSev.includes('मध्यम')) severity = 'MODERATE';
      else if (rawSev.includes('SEVERE') || rawSev.includes('तीव्र') || rawSev.includes('तेज')) severity = 'SEVERE';
      else if (rawSev.includes('UNBEARABLE') || rawSev.includes('असह्य')) severity = 'UNBEARABLE';
      else severity = rawSev;
    }

    // 4. Resolve Location (Null if not reported, never default to abdomen)
    let location = null;
    const locationFact =
      this.collectedFacts['symptom.headache.location'] ||
      this.collectedFacts['symptom.pain.shoulder.location'] ||
      this.collectedFacts['symptom.pain.knee.location'] ||
      this.collectedFacts['symptom.pain.chest.location'] ||
      this.collectedFacts['symptom.pain.abdominal.location'] ||
      this.collectedFacts['symptom.pain.location'];
    if (locationFact?.value && locationFact.value !== 'unknown') {
      location = locationFact.value;
    }

    // 5. Gather all structured symptoms
    const symptoms = [];
    for (const [key, fact] of Object.entries(this.collectedFacts)) {
      if (fact.concept?.startsWith('symptom.') && fact.status === 'PRESENT') {
        symptoms.push({
          concept: fact.concept,
          attribute: fact.attribute,
          value: fact.value,
          status: fact.status,
          source: fact.source,
          recordedAt: fact.recordedAt,
        });
      }
    }

    return {
      sessionId: this.sessionId,
      patientId: this.patientId,
      language: this.language,
      opdMode: this.opdMode,
      primaryConcern: primaryConcernVal,
      duration,
      severity,
      location,
      symptoms,
      factsCount: Object.keys(this.collectedFacts).length,
      facts: this.collectedFacts,
      completedQuestions: Array.from(this.completedQuestionIds),
      questionsAlreadyAsked: this.questionsAlreadyAsked,
      responsesCount: this.responses.length,
      examinationHistory: this.getExaminationHistory(this.language),
    };
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
    const asked = this.questionsAlreadyAsked.find((q) => q.id === questionId);
    const concept = asked?.concept || 'clinical';
    const attribute = asked?.attribute || 'value';

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

    this.invalidateStaleFacts(questionId, updatedRecord.normalizedValue);

    return updatedRecord;
  }

  toSummary() {
    return this.getClinicalSummary();
  }
}

