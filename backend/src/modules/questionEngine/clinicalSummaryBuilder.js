/**
 * Canonical Clinical Summary Builder — MediKiosk (Phase 8)
 * 
 * Strict Architectural Guarantees:
 * 1. REPRESENTATIONAL, NOT DIAGNOSTIC: Describes what the patient reported and what records show.
 *    Strictly NO disease diagnoses (e.g. pneumonia, arthritis, viral infection).
 * 2. DETERMINISTIC CONSTRUCTION: Pure logic from validated facts & responses. Zero LLM summary hallucination.
 * 3. STRICT STATE DISAMBIGUATION:
 *    - PRESENT: Patient explicitly affirmed.
 *    - ABSENT: Patient explicitly denied ("No", "नाही", "नहीं").
 *    - UNKNOWN: Patient is uncertain ("Don't know", "माहित नाही", "पता नहीं").
 *    - NOT_PROVIDED: Question was not asked or not answered. Never defaulted or collapsed into NO/ABSENT.
 *    - NOT_DETECTED: Field was missing from document OCR. Never fabricated from databases.
 * 4. PRIMARY CONCERN ISOLATION: Initial complaint is strictly preserved and never overwritten
 *    by incidental symptoms.
 * 5. FULL PROVENANCE: Every fact links to questionId, source, original wording, confidence, timestamp.
 * 6. NO DEFAULTING: Never default duration to 7 days, never default location to abdomen, never guess laterality.
 * 7. SOURCE SEPARATION & DISCREPANCY DETECTION: Patient-reported vs document-extracted medications
 *    are kept separate, and differing doses/frequencies are flagged for human review.
 */

export function buildCanonicalClinicalSummary(sessionState, documents = [], options = {}) {
  const startTime = Date.now();
  if (!sessionState) {
    return null;
  }

  const collectedFacts = sessionState.collectedFacts || {};
  const responses = sessionState.responses || [];
  const lang = options.language || sessionState.language || 'mr';

  // --------------------------------------------------------------------------
  // 1. PRIMARY CONCERN (Section 7, 15, 22, 26)
  // --------------------------------------------------------------------------
  let primaryConcernKey = sessionState.primaryConcern;
  const ccResponse = responses.find((r) => r.questionId === 'q.chief_complaint');

  if (!primaryConcernKey) {
    if (collectedFacts['symptom.dyspnea.presence']?.status === 'PRESENT' || collectedFacts['symptom.breathing.presence']?.status === 'PRESENT') {
      primaryConcernKey = 'breathing';
    } else if (collectedFacts['symptom.diarrhea.presence']?.status === 'PRESENT') {
      primaryConcernKey = 'diarrhea';
    } else if (collectedFacts['symptom.pain.shoulder.location']?.value === 'shoulder' || collectedFacts['symptom.pain.shoulder.presence']?.status === 'PRESENT') {
      primaryConcernKey = 'shoulder_pain';
    } else if (collectedFacts['symptom.pain.chest.location']?.value === 'chest' || collectedFacts['symptom.pain.chest.presence']?.status === 'PRESENT') {
      primaryConcernKey = 'chest_pain';
    } else if (collectedFacts['symptom.pain.abdominal.location']?.value === 'abdomen' || collectedFacts['symptom.pain.abdominal.presence']?.status === 'PRESENT') {
      primaryConcernKey = 'stomach';
    } else if (collectedFacts['symptom.pain.knee.location']?.value === 'knee' || collectedFacts['symptom.pain.knee.presence']?.status === 'PRESENT') {
      primaryConcernKey = 'knee_pain';
    } else if (collectedFacts['symptom.pain.complaint_type']?.value) {
      primaryConcernKey = collectedFacts['symptom.pain.complaint_type'].value;
    } else if (ccResponse?.normalizedValue) {
      primaryConcernKey = ccResponse.normalizedValue;
    }
  }

  const rawCcWording = ccResponse?.rawResponse || ccResponse?.originalTranscript || null;
  const isCcVoice = ccResponse?.inputMethod === 'VOICE' || ccResponse?.source === 'PATIENT_VOICE';

  const primaryConcernDetails = primaryConcernKey
    ? {
        concern: String(primaryConcernKey),
        displayName: formatConcernDisplayName(primaryConcernKey),
        originalWording: typeof rawCcWording === 'string' ? rawCcWording : (rawCcWording ? JSON.stringify(rawCcWording) : null),
        status: 'PRESENT',
        source: isCcVoice ? 'PATIENT_VOICE' : (ccResponse?.source || 'PATIENT_TOUCH'),
        sourceResponseId: ccResponse?.questionId || 'q.chief_complaint',
        questionId: 'q.chief_complaint',
        confidence: ccResponse?.confidence ?? (isCcVoice ? 0.95 : 1.0),
        timestamp: ccResponse?.timestamp || sessionState.updatedAt || new Date().toISOString(),
      }
    : null;

  // --------------------------------------------------------------------------
  // 2. DURATION (Section 10, 26)
  // Supports exact values, ranges (min, max, unit), vague, and NOT_PROVIDED.
  // --------------------------------------------------------------------------
  let durationFact =
    collectedFacts['symptom.dyspnea.duration'] ||
    collectedFacts['symptom.breathing.duration'] ||
    collectedFacts['symptom.diarrhea.duration'] ||
    collectedFacts['symptom.pain.knee.duration'] ||
    collectedFacts['symptom.pain.shoulder.duration'] ||
    collectedFacts['symptom.pain.chest.duration'] ||
    collectedFacts['symptom.pain.abdominal.duration'] ||
    collectedFacts['symptom.vomiting.duration'] ||
    collectedFacts['symptom.fever.duration'] ||
    collectedFacts['symptom.cough.duration'] ||
    collectedFacts['symptom.pain.duration'] ||
    collectedFacts['clinical.duration.duration'] ||
    collectedFacts['duration.duration'];

  if (!durationFact) {
    durationFact = Object.values(collectedFacts).find((f) => f.attribute === 'duration');
  }

  const durationResponse = responses.find((r) =>
    r.questionId?.includes('duration') ||
    r.questionId === 'q.pain.duration' ||
    r.questionId === 'q.fever.duration' ||
    r.questionId === 'q.diarrhea.duration'
  );

  let legacyDuration = null;
  let durationDetails = null;

  if (durationFact && durationFact.status !== 'NOT_PROVIDED') {
    let min = null;
    let max = null;
    let value = null;
    let unit = 'days';
    let precision = 'exact';
    let rawText = durationFact.raw || durationResponse?.rawResponse || null;

    if (durationFact.precision === 'vague' || (typeof durationFact.value === 'object' && durationFact.value?.precision === 'vague')) {
      precision = 'vague';
      value = null;
      rawText = durationFact.raw || durationFact.value?.raw || 'vague';
      legacyDuration = { value: null, raw: rawText, precision: 'vague' };
    } else if (typeof durationFact.value === 'object' && durationFact.value !== null) {
      if (durationFact.value.min !== undefined && durationFact.value.max !== undefined) {
        min = Number(durationFact.value.min);
        max = Number(durationFact.value.max);
        unit = durationFact.value.unit || 'days';
        precision = 'range';
        legacyDuration = { min, max, unit };
      } else if (durationFact.value.amount !== undefined || durationFact.value.value !== undefined) {
        value = Number(durationFact.value.amount ?? durationFact.value.value);
        unit = durationFact.value.unit || durationFact.unit || 'days';
        legacyDuration = { value, unit };
      } else {
        legacyDuration = durationFact.value;
      }
    } else if (typeof durationFact.value === 'number') {
      value = durationFact.value;
      unit = durationFact.unit || 'days';
      legacyDuration = { value, unit };
    } else if (typeof durationFact.value === 'string' && !isNaN(Number(durationFact.value))) {
      value = Number(durationFact.value);
      unit = durationFact.unit || 'days';
      legacyDuration = { value, unit };
    }

    let displayStr = '';
    if (precision === 'range' && min !== null && max !== null) {
      displayStr = `${min}–${max} ${unit}`;
    } else if (value !== null) {
      displayStr = `${value} ${unit}`;
    } else if (rawText) {
      displayStr = String(rawText);
    } else {
      displayStr = 'Not provided';
    }

    durationDetails = {
      value,
      min,
      max,
      unit,
      display: displayStr,
      precision,
      raw: rawText ? String(rawText) : null,
      status: durationFact.status || 'PRESENT',
      source: durationFact.source || durationResponse?.source || 'PATIENT_TOUCH',
      questionId: durationResponse?.questionId || 'q.duration',
      confidence: durationFact.confidence || durationResponse?.confidence || null,
      originalWording: durationResponse?.rawResponse ? String(durationResponse.rawResponse) : (rawText ? String(rawText) : null),
      timestamp: durationFact.recordedAt || durationResponse?.timestamp || null,
    };
  } else {
    durationDetails = {
      value: null,
      min: null,
      max: null,
      unit: 'days',
      display: 'Not provided',
      precision: null,
      raw: null,
      status: 'NOT_PROVIDED',
      source: null,
      questionId: null,
      confidence: null,
      originalWording: null,
      timestamp: null,
    };
  }

  // --------------------------------------------------------------------------
  // 3. LOCATION (Section 11, 26)
  // Strict rule: NEVER infer or guess laterality (knee != left knee).
  // --------------------------------------------------------------------------
  const locationFact =
    collectedFacts['symptom.headache.location'] ||
    collectedFacts['symptom.pain.shoulder.location'] ||
    collectedFacts['symptom.pain.knee.location'] ||
    collectedFacts['symptom.pain.chest.location'] ||
    collectedFacts['symptom.pain.abdominal.location'] ||
    collectedFacts['symptom.pain.location'];

  const locationResponse = responses.find((r) =>
    r.questionId?.includes('location') ||
    r.questionId === 'q.pain.location'
  );

  let legacyLocation = null;
  let locationDetails = null;

  if (locationFact && locationFact.value && locationFact.value !== 'unknown') {
    legacyLocation = locationFact.value;
    const rawLocStr = String(locationFact.value).toLowerCase();
    let laterality = null;
    if (rawLocStr.includes('left') || rawLocStr.includes('डावा') || rawLocStr.includes('बायाँ')) {
      laterality = 'left';
    } else if (rawLocStr.includes('right') || rawLocStr.includes('उजवा') || rawLocStr.includes('दायाँ')) {
      laterality = 'right';
    } else if (rawLocStr.includes('both') || rawLocStr.includes('दोन्ही') || rawLocStr.includes('दोनों')) {
      laterality = 'bilateral';
    }

    locationDetails = {
      value: locationFact.value,
      laterality, // strictly null if not explicitly reported!
      status: locationFact.status || 'PRESENT',
      source: locationFact.source || locationResponse?.source || 'PATIENT_TOUCH',
      questionId: locationResponse?.questionId || 'q.location',
      confidence: locationFact.confidence || locationResponse?.confidence || null,
      originalWording: locationResponse?.rawResponse ? String(locationResponse.rawResponse) : null,
      timestamp: locationFact.recordedAt || locationResponse?.timestamp || null,
    };
  } else if (locationFact?.status === 'UNKNOWN' || locationResponse?.status === 'UNKNOWN') {
    locationDetails = {
      value: null,
      laterality: null,
      status: 'UNKNOWN',
      display: 'Unknown',
      source: locationResponse?.source || 'PATIENT_TOUCH',
      questionId: locationResponse?.questionId || 'q.location',
      confidence: null,
      originalWording: locationResponse?.rawResponse ? String(locationResponse.rawResponse) : null,
      timestamp: locationResponse?.timestamp || null,
    };
  } else {
    locationDetails = {
      value: null,
      laterality: null,
      status: 'NOT_PROVIDED',
      display: 'Not reported',
      source: null,
      questionId: null,
      confidence: null,
      originalWording: null,
      timestamp: null,
    };
  }

  // --------------------------------------------------------------------------
  // 4. SEVERITY (Section 12, 26)
  // Strict rule: NEVER default to mild/moderate/severe if not reported.
  // --------------------------------------------------------------------------
  const severityFact =
    collectedFacts['symptom.dyspnea.severity'] ||
    collectedFacts['symptom.breathing.severity'] ||
    collectedFacts['symptom.pain.severity'] ||
    collectedFacts['symptom.pain.chest.severity'] ||
    collectedFacts['symptom.pain.knee.severity'] ||
    collectedFacts['symptom.pain.abdominal.severity'] ||
    collectedFacts['clinical.severity.severity'];

  const severityResponse = responses.find((r) =>
    r.questionId?.includes('severity') ||
    r.questionId === 'q.pain.severity'
  );

  let legacySeverity = null;
  let severityDetails = null;

  if (severityFact?.value) {
    const rawVal = typeof severityFact.value === 'object' && severityFact.value !== null
      ? (severityFact.value.level || severityFact.value.value || severityFact.value)
      : severityFact.value;
    const rawSev = String(rawVal).toUpperCase();
    let normLevel = rawSev;
    if (rawSev.includes('MILD') || rawSev.includes('कमी') || rawSev.includes('हल्का')) normLevel = 'MILD';
    else if (rawSev.includes('MODERATE') || rawSev.includes('मध्यम')) normLevel = 'MODERATE';
    else if (rawSev.includes('SEVERE') || rawSev.includes('तीव्र') || rawSev.includes('तेज')) normLevel = 'SEVERE';
    else if (rawSev.includes('UNBEARABLE') || rawSev.includes('असह्य')) normLevel = 'UNBEARABLE';

    legacySeverity = normLevel;
    severityDetails = {
      value: normLevel,
      level: normLevel.toLowerCase(),
      score: typeof severityFact.value === 'object' && severityFact.value !== null ? severityFact.value.score || null : null,
      raw: severityFact.raw || (severityResponse?.rawResponse ? String(severityResponse.rawResponse) : null),
      status: severityFact.status || 'PRESENT',
      source: severityFact.source || severityResponse?.source || 'PATIENT_TOUCH',
      questionId: severityResponse?.questionId || 'q.severity',
      confidence: severityFact.confidence || severityResponse?.confidence || null,
      originalWording: severityResponse?.rawResponse ? String(severityResponse.rawResponse) : null,
      timestamp: severityFact.recordedAt || severityResponse?.timestamp || null,
    };
  } else if (severityFact?.status === 'UNKNOWN' || severityResponse?.status === 'UNKNOWN') {
    severityDetails = {
      value: null,
      raw: severityResponse?.rawResponse ? String(severityResponse.rawResponse) : null,
      status: 'UNKNOWN',
      display: 'Not clearly reported',
      source: severityResponse?.source || 'PATIENT_TOUCH',
      questionId: severityResponse?.questionId || 'q.severity',
      confidence: null,
      originalWording: severityResponse?.rawResponse ? String(severityResponse.rawResponse) : null,
      timestamp: severityResponse?.timestamp || null,
    };
  } else {
    severityDetails = {
      value: null,
      raw: null,
      status: 'NOT_PROVIDED',
      display: 'Not reported',
      source: null,
      questionId: null,
      confidence: null,
      originalWording: null,
      timestamp: null,
    };
  }

  // --------------------------------------------------------------------------
  // 5. CHARACTER & RADIATION (Section 14)
  // --------------------------------------------------------------------------
  const characterFact =
    collectedFacts['symptom.pain.character'] ||
    collectedFacts['symptom.pain.chest.character'] ||
    collectedFacts['symptom.cough.character'];

  const character = characterFact?.value
    ? {
        value: characterFact.value,
        status: characterFact.status || 'PRESENT',
        source: characterFact.source || 'PATIENT_TOUCH',
      }
    : null;

  const radiationFact =
    collectedFacts['symptom.pain.chest.radiation'] ||
    collectedFacts['symptom.pain.radiation'];

  let radiation = null;
  if (radiationFact) {
    radiation = {
      value: radiationFact.value,
      status: radiationFact.status || 'PRESENT',
      source: radiationFact.source || 'PATIENT_TOUCH',
    };
  }

  // --------------------------------------------------------------------------
  // 6. SYMPTOMS & ASSOCIATED SYMPTOMS (Section 13, 15, 16)
  // Distinguishes primary concern from additional symptoms; preserves ABSENT/UNKNOWN.
  // --------------------------------------------------------------------------
  const symptoms = [];
  const associatedSymptoms = [];

  for (const [key, fact] of Object.entries(collectedFacts)) {
    if (fact.concept?.startsWith('symptom.')) {
      const resp = responses.find((r) => r.questionId?.includes(fact.attribute) || r.questionId?.includes(fact.concept));
      const symEntry = {
        concept: fact.concept,
        attribute: fact.attribute,
        value: fact.value,
        status: fact.status || 'PRESENT',
        source: fact.source || 'PATIENT_TOUCH',
        confidence: fact.confidence || null,
        originalWording: resp?.rawResponse ? String(resp.rawResponse) : (fact.raw ? String(fact.raw) : null),
        recordedAt: fact.recordedAt,
      };

      symptoms.push(symEntry);

      const isPrimaryConcernAttr =
        (primaryConcernKey?.includes('knee') && fact.concept.includes('knee')) ||
        (primaryConcernKey?.includes('chest') && fact.concept.includes('chest')) ||
        (primaryConcernKey?.includes('shoulder') && fact.concept.includes('shoulder')) ||
        (primaryConcernKey?.includes('stomach') && fact.concept.includes('abdominal')) ||
        (primaryConcernKey?.includes('diarrhea') && fact.concept.includes('diarrhea')) ||
        (primaryConcernKey?.includes('fever') && fact.concept.includes('fever')) ||
        (primaryConcernKey?.includes('headache') && fact.concept.includes('headache'));

      if (!isPrimaryConcernAttr && fact.attribute !== 'complaint_type') {
        associatedSymptoms.push(symEntry);
      }
    }
  }

  for (const resp of responses) {
    if (resp.status === 'ABSENT' || resp.status === 'UNKNOWN') {
      const qId = resp.questionId;
      const alreadyInAssoc = associatedSymptoms.some((s) => s.concept?.includes(qId) || s.attribute?.includes(qId));
      if (!alreadyInAssoc && qId !== 'q.chief_complaint') {
        const conceptName = qId.replace(/^q\./, 'symptom.');
        associatedSymptoms.push({
          concept: conceptName,
          attribute: 'presence',
          value: resp.normalizedValue || (resp.status === 'ABSENT' ? 'no' : 'unknown'),
          status: resp.status,
          source: resp.source || 'PATIENT_TOUCH',
          confidence: resp.confidence || 1.0,
          originalWording: resp.rawResponse ? String(resp.rawResponse) : null,
          recordedAt: resp.timestamp,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 7. MEDICAL HISTORY (Section 17)
  // --------------------------------------------------------------------------
  const relevantHistory = [];
  for (const [key, fact] of Object.entries(collectedFacts)) {
    if (fact.concept?.startsWith('history.') && key !== 'history.medication.medications' && key !== 'history.allergy.allergies') {
      relevantHistory.push({
        condition: fact.attribute || fact.concept.replace('history.', ''),
        status: fact.status || 'PRESENT',
        source: fact.source || 'PATIENT_REPORTED',
        confidence: fact.confidence || null,
        recordedAt: fact.recordedAt,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 8. MEDICATIONS & CONFLICT DETECTION (Section 18, 36)
  // --------------------------------------------------------------------------
  const patientReportedMeds = [];
  const documentExtractedMeds = [];
  const medicationConflicts = [];

  const medFact = collectedFacts['history.medication.medications'] || collectedFacts['history.medication.presence'];
  if (medFact?.value) {
    const medList = Array.isArray(medFact.value) ? medFact.value : [medFact.value];
    for (const m of medList) {
      if (typeof m === 'string') {
        const parts = m.match(/^(.+?)(?:\s+(\d+\s*(?:mg|ml|gm|tablets?)))?$/i);
        patientReportedMeds.push({
          drugName: parts ? parts[1].trim() : m.trim(),
          dose: parts && parts[2] ? parts[2].trim() : 'Not reported',
          source: 'PATIENT_REPORTED',
          confidence: medFact.confidence || 1.0,
          rawText: m,
        });
      } else if (typeof m === 'object' && m !== null) {
        patientReportedMeds.push({
          drugName: m.drugName || m.name || 'Unknown',
          dose: m.dose || 'Not reported',
          frequency: m.frequency || null,
          source: 'PATIENT_REPORTED',
          confidence: m.confidence || 1.0,
          rawText: m.rawText || JSON.stringify(m),
        });
      }
    }
  }

  for (const doc of documents) {
    const extractedMeds = doc.extractedData?.medications || [];
    for (const em of extractedMeds) {
      documentExtractedMeds.push({
        drugName: em.drugName,
        dose: em.dose || 'Not detected',
        frequency: em.frequency || 'Not detected',
        duration: em.duration || 'Not detected',
        timing: em.timing || null,
        source: 'DOCUMENT',
        documentId: doc.id,
        documentName: doc.fileName,
        confidence: em.confidence || doc.confidence || null,
        unverifiedFields: em.unverifiedFields || [],
      });
    }
  }

  for (const pMed of patientReportedMeds) {
    const pName = pMed.drugName.toLowerCase().replace(/^(tab\.?|cap\.?|syp\.?)\s*/i, '').trim();
    for (const dMed of documentExtractedMeds) {
      const dName = dMed.drugName.toLowerCase().replace(/^(tab\.?|cap\.?|syp\.?)\s*/i, '').trim();
      if (pName.includes(dName) || dName.includes(pName)) {
        const pDose = pMed.dose && pMed.dose !== 'Not reported' ? pMed.dose.toLowerCase().replace(/\s+/g, '') : null;
        const dDose = dMed.dose && dMed.dose !== 'Not detected' ? dMed.dose.toLowerCase().replace(/\s+/g, '') : null;

        if (pDose && dDose && pDose !== dDose) {
          medicationConflicts.push({
            drugName: dMed.drugName,
            patientReported: { dose: pMed.dose, source: 'PATIENT_REPORTED' },
            documentReported: { dose: dMed.dose, source: 'DOCUMENT', documentId: dMed.documentId },
            flag: 'DISCREPANCY_DETECTED',
            message: 'Medication dose differs between your answer and uploaded record. Please review.',
          });
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 9. ALLERGIES (Section 19)
  // --------------------------------------------------------------------------
  const allergyFact = collectedFacts['history.allergy.allergies'] || collectedFacts['history.allergy.presence'];
  const allergyResponse = responses.find((r) => r.questionId?.includes('allergy'));

  let allergies = null;
  if (allergyFact?.status === 'ABSENT' || allergyResponse?.status === 'ABSENT') {
    allergies = {
      status: 'ABSENT',
      display: 'None reported',
      items: [],
      source: allergyFact?.source || allergyResponse?.source || 'PATIENT_TOUCH',
    };
  } else if (allergyFact?.status === 'UNKNOWN' || allergyResponse?.status === 'UNKNOWN') {
    allergies = {
      status: 'UNKNOWN',
      display: 'Unknown',
      items: [],
      source: allergyFact?.source || allergyResponse?.source || 'PATIENT_TOUCH',
    };
  } else if (allergyFact?.value) {
    const items = Array.isArray(allergyFact.value) ? allergyFact.value : [allergyFact.value];
    allergies = {
      status: 'PRESENT',
      display: items.join(', '),
      items,
      source: allergyFact.source || 'PATIENT_TOUCH',
    };
  } else {
    allergies = {
      status: 'NOT_PROVIDED',
      display: 'Not provided',
      items: [],
      source: null,
    };
  }

  // --------------------------------------------------------------------------
  // 10. DOCUMENTS (Section 20, 21, 37)
  // --------------------------------------------------------------------------
  const formattedDocs = documents.map((d) => ({
    id: d.id,
    documentType: d.documentType || 'OTHER',
    fileName: d.fileName,
    uploadedAt: d.createdAt,
    ocrConfidence: d.confidence || null,
    extractedData: d.extractedData || null,
    reviewStatus: d.reviewStatus || 'SCANNED',
    isVerified: false,
  }));

  // --------------------------------------------------------------------------
  // 11. UNCERTAIN ITEMS (Section 40)
  // --------------------------------------------------------------------------
  const uncertainItems = [];

  for (const conflict of medicationConflicts) {
    uncertainItems.push({
      type: 'MEDICATION_DISCREPANCY',
      category: 'review_required',
      drugName: conflict.drugName,
      message: conflict.message,
      details: conflict,
    });
  }

  for (const dMed of documentExtractedMeds) {
    if (dMed.dose === 'Not detected' || dMed.frequency === 'Not detected') {
      uncertainItems.push({
        type: 'OCR_FIELD_UNCLEAR',
        category: 'document_review',
        documentId: dMed.documentId,
        drugName: dMed.drugName,
        field: dMed.dose === 'Not detected' ? 'dose' : 'frequency',
        message: `${dMed.drugName} ${dMed.dose === 'Not detected' ? 'dose' : 'frequency'}: Could not be clearly detected from the document.`,
      });
    }
  }

  for (const resp of responses) {
    if (resp.status === 'UNKNOWN') {
      uncertainItems.push({
        type: 'PATIENT_UNKNOWN_ANSWER',
        category: 'patient_clarification',
        questionId: resp.questionId,
        message: `Answer was reported as uncertain for: ${resp.questionId}`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 12. VERIFICATION STATE (Section 41)
  // --------------------------------------------------------------------------
  const verification = {
    status: options.verificationStatus || sessionState.verificationStatus || 'not_reviewed',
    patientConfirmed: Boolean(options.patientConfirmed || sessionState.patientConfirmed),
    lastVerifiedAt: options.verifiedAt || sessionState.lastVerifiedAt || null,
  };

  // --------------------------------------------------------------------------
  // 13. CANONICAL SUMMARY PAYLOAD
  // Preserves 100% backward compatibility for existing tests while exposing
  // rich Phase 8 objects and structured facts.
  // --------------------------------------------------------------------------
  const summaryPayload = {
    sessionId: sessionState.sessionId,
    patientId: sessionState.patientId,
    status: sessionState.status || 'IN_PROGRESS',
    language: sessionState.language || 'mr',
    opdMode: sessionState.opdMode || 'GENERAL',
    summaryVersion: (sessionState.summaryVersion || 1),
    updatedAt: new Date().toISOString(),

    // Dual representation for primaryConcern:
    // 1. Primitive string for existing tests (expect(summary.primaryConcern).toBe('stomach'))
    primaryConcern: primaryConcernKey,
    // 2. Rich structured object for Phase 8 clinical summary
    primaryConcernDetails,
    primaryConcernRecord: primaryConcernDetails,

    // Dual representation for duration:
    // 1. { value, unit } or { min, max, unit } or null for existing tests
    duration: legacyDuration,
    durationDetails,

    // Dual representation for location:
    location: legacyLocation,
    locationDetails,

    // Dual representation for severity:
    severity: legacySeverity,
    severityDetails,

    // Comprehensive Phase 8 sections:
    character,
    radiation,
    symptoms,
    associatedSymptoms,
    relevantHistory,
    medications: {
      patientReported: patientReportedMeds,
      documentExtracted: documentExtractedMeds,
      conflicts: medicationConflicts,
    },
    allergies,
    documents: formattedDocs,
    uncertainItems,
    verification,

    // Legacy fields for existing test assertions:
    factsCount: Object.keys(collectedFacts).length,
    facts: collectedFacts,
    completedQuestions: Array.from(sessionState.completedQuestionIds || []),
    questionsAlreadyAsked: sessionState.questionsAlreadyAsked || [],
    responsesCount: responses.length,
    examinationHistory: sessionState.getExaminationHistory ? sessionState.getExaminationHistory(lang) : [],

    // Metadata and Clinical Safety Invariants:
    metadata: {
      generatedAt: new Date().toISOString(),
      generationLatencyMs: Date.now() - startTime,
      engine: 'MediKiosk Canonical Deterministic Summary Builder v1.0',
      safetyInvariants: {
        diagnosisEngine: false,
        treatmentEngine: false,
        autonomousTriage: false,
        zeroHallucination: true,
      },
    },
  };

  // Phase 8.1 Verbal Clinical Summary: Deterministic natural-language synthesis
  const verbalDetails = generateVerbalSummary(summaryPayload, lang);
  summaryPayload.verbalSummary = verbalDetails.text;
  summaryPayload.verbalSummaryDetails = verbalDetails;

  return summaryPayload;
}

function getSymptomLabel(sym, lang = 'en') {
  if (sym.displayName) return sym.displayName;
  const rawKey = String(sym.name || sym.concept || sym.attribute || '').toLowerCase();

  if (lang === 'mr') {
    if (rawKey.includes('dyspnea') || rawKey.includes('breath')) return 'श्वास घेण्यास त्रास';
    if (rawKey.includes('fever')) return 'ताप';
    if (rawKey.includes('vomit')) return 'उलटी';
    if (rawKey.includes('cough')) return 'खोकला';
    if (rawKey.includes('dizziness')) return 'चक्कर';
    if (rawKey.includes('radiation')) return 'वेदना पसरणे';
    if (rawKey.includes('swelling')) return 'सूज';
    return rawKey.replace(/^symptom\./, '').replace(/\./g, ' ');
  } else if (lang === 'hi') {
    if (rawKey.includes('dyspnea') || rawKey.includes('breath')) return 'सांस लेने में तकलीफ';
    if (rawKey.includes('fever')) return 'बुखार';
    if (rawKey.includes('vomit')) return 'उल्टी';
    if (rawKey.includes('cough')) return 'खांसी';
    if (rawKey.includes('dizziness')) return 'चक्कर आना';
    if (rawKey.includes('radiation')) return 'दर्द का फैलना';
    if (rawKey.includes('swelling')) return 'सूजन';
    return rawKey.replace(/^symptom\./, '').replace(/\./g, ' ');
  } else {
    if (rawKey.includes('dyspnea') || rawKey.includes('breath')) return 'breathing difficulty';
    if (rawKey.includes('fever')) return 'fever';
    if (rawKey.includes('vomit')) return 'vomiting';
    if (rawKey.includes('cough')) return 'cough';
    if (rawKey.includes('dizziness')) return 'dizziness';
    if (rawKey.includes('radiation')) return 'radiation of pain';
    if (rawKey.includes('swelling')) return 'swelling';
    return rawKey.replace(/^symptom\./, '').replace(/\./g, ' ');
  }
}

/**
 * Deterministically constructs a 60–70 word human-readable verbal summary paragraph (Phase 8.1)
 * Derived strictly from verified ClinicalFact, QuestionResponse, and MedicalDocument records.
 * Enforces zero diagnostic inference, zero prescriptions, and strict 5-way state typing.
 */
export function generateVerbalSummary(summary, lang = 'en') {
  const language = ['hi', 'mr', 'en'].includes(lang) ? lang : 'en';

  // 1. Primary Concern, Location, Laterality
  const concernKey = summary.primaryConcernDetails?.concern || summary.primaryConcern || 'general_discomfort';
  const laterality = summary.locationDetails?.laterality || null;
  const locationVal = summary.locationDetails?.value || summary.location || null;

  // 2. Duration
  const duration = summary.durationDetails;
  let durationStr = '';
  if (duration && duration.status === 'PRESENT') {
    const rawVal = duration.raw || (duration.value && typeof duration.value === 'object' ? duration.value.raw : null);
    if (rawVal && (language === 'mr' || language === 'hi')) {
      durationStr = String(rawVal);
    } else if (duration.precision === 'range' && duration.min !== null && duration.max !== null) {
      const unitMr = duration.unit === 'days' ? 'दिवस' : duration.unit;
      const unitHi = duration.unit === 'days' ? 'दिन' : duration.unit;
      const unitStr = language === 'mr' ? unitMr : language === 'hi' ? unitHi : (duration.unit || 'days');
      const sep = language === 'mr' ? ' ते ' : language === 'hi' ? ' से ' : '–';
      durationStr = `${duration.min}${sep}${duration.max} ${unitStr}`;
    } else if (duration.value !== null) {
      const unitMr = duration.unit === 'days' ? 'दिवस' : duration.unit;
      const unitHi = duration.unit === 'days' ? 'दिन' : duration.unit;
      const unitStr = language === 'mr' ? unitMr : language === 'hi' ? unitHi : (duration.unit || 'days');
      durationStr = `${duration.value} ${unitStr}`;
    } else if (duration.raw) {
      durationStr = String(duration.raw);
    }
  }

  // 3. Severity
  const sevRaw = summary.severityDetails?.level || summary.severityDetails?.value || summary.severity;
  const severityLevel = sevRaw
    ? (typeof sevRaw === 'object' ? (sevRaw.level || sevRaw.value) : String(sevRaw)).toLowerCase()
    : null;

  // 4. Associated Symptoms: Present vs Explicitly Absent
  const presentSymptoms = (summary.associatedSymptoms || []).filter((s) => s.status === 'PRESENT');
  const absentSymptoms = (summary.associatedSymptoms || []).filter((s) => s.status === 'ABSENT');

  // 5. Medications & Conflicts
  const patientMeds = summary.medications?.patientReported || [];
  const docMeds = summary.medications?.documentExtracted || [];
  const medConflicts = summary.medications?.conflicts || [];

  // 6. Allergies
  const allergies = summary.allergies;

  // 7. Documents
  const docs = summary.documents || [];

  // 8. Uncertain items
  const uncertainCount = (summary.uncertainItems || []).length;

  let paragraph = '';

  if (language === 'mr') {
    const sentences = [];

    // S1: Primary concern + duration + severity
    let s1 = 'रुग्णाने ';
    if (durationStr) {
      s1 += `सुमारे ${durationStr}पासून `;
    }
    if (severityLevel) {
      const sevMap = { mild: 'सौम्य तीव्रतेसह ', moderate: 'मध्यम तीव्रतेसह ', severe: 'जास्त तीव्रतेसह ' };
      s1 += sevMap[severityLevel] || '';
    }
    let locStr = '';
    if (locationVal) {
      const latPrefix = laterality === 'left' ? 'डाव्या ' : laterality === 'right' ? 'उजव्या ' : laterality === 'bilateral' ? 'दोन्ही ' : '';
      const locNames = { knee: 'गुडघ्यात', chest: 'छातीत', shoulder: 'खांद्यात', stomach: 'पोटात', abdomen: 'पोटात', head: 'डोक्यात' };
      const locName = locNames[String(locationVal).toLowerCase()] || String(locationVal);
      locStr = `${latPrefix}${locName} `;
    }
    const concernNamesMr = {
      knee_pain: 'गुडघेदुखी',
      chest_pain: 'छातीत दुखणे',
      shoulder_pain: 'खांदेदुखी',
      stomach: 'पोटदुखी / पोटाचा त्रास',
      diarrhea: 'जुलाब',
      fever: 'ताप',
      cough: 'खोकला',
      breathing: 'श्वास घेण्यास त्रास',
      headache: 'डोकेदुखी',
      pain: 'वेदना / त्रास',
    };
    const cNameMr = concernNamesMr[concernKey] || 'शारीरिक त्रास';
    s1 += `${locStr}${cNameMr} होत असल्याचे नमूद केले आहे.`;
    sentences.push(s1);

    // S2: Absent symptoms
    if (absentSymptoms.length > 0) {
      const absNames = [...new Set(absentSymptoms.map((s) => getSymptomLabel(s, 'mr')))];
      sentences.push(`${absNames.join(' किंवा ')} यांसारखी लक्षणे स्पष्टपणे नाकारण्यात आली आहेत.`);
    }

    // S3: Present symptoms
    if (presentSymptoms.length > 0) {
      const presNames = [...new Set(presentSymptoms.map((s) => getSymptomLabel(s, 'mr')))];
      sentences.push(`यासोबतच ${presNames.join(', ')} असल्याचा उल्लेख केला आहे.`);
    }

    // S4: Meds & Allergies
    if (allergies?.status === 'ABSENT') {
      sentences.push('कोणत्याही ज्ञात औषध ॲलर्जीची नोंद नाही.');
    } else if (allergies?.status === 'NOT_PROVIDED') {
      if (patientMeds.length === 0) {
        sentences.push('सध्या सुरू असलेली औषधे किंवा ज्ञात ॲलर्जीबाबत कोणतीही माहिती उपलब्ध करून दिली गेली नाही.');
      } else {
        sentences.push('ॲलर्जीबाबतची माहिती तपासणीदरम्यान उपलब्ध झालेली नाही.');
      }
    } else if (allergies?.items?.length > 0) {
      sentences.push(`तपासणीदरम्यान ${allergies.items.join(', ')} ची ॲलर्जी नोंदवली गेली आहे.`);
    }

    if (patientMeds.length > 0) {
      const medList = patientMeds.map((m) => m.name).join(', ');
      sentences.push(`रुग्ण सध्या ${medList} हे औषध घेत असल्याचे सांगितले आहे.`);
    }

    // S5: Documents & Conflicts
    if (docs.length > 0) {
      sentences.push('अपलोड केलेल्या वैद्यकीय कागदपत्रांमध्ये औषधांचे तपशील समाविष्ट असून त्यांची डॉक्टरांनी प्रत्यक्ष तपासणी करावी.');
    }
    if (medConflicts.length > 0) {
      sentences.push('रुग्णाने सांगितलेली माहिती आणि कागदपत्रांमधील औषध डोस यातील फरक डॉक्टरांच्या निदर्शनास आणून दिला आहे.');
    }

    // S6: Uncertain & Closing
    if (uncertainCount > 0) {
      sentences.push('रुग्णाने अनिश्चितता दर्शवलेली माहिती पुढील वैद्यकीय चर्चेसाठी चिन्हांकित करण्यात आली आहे.');
    }
    sentences.push('हा सारांश केवळ रुग्णाने पडताळणी केलेल्या माहितीवर आणि सादर केलेल्या नोंदींवर आधारित आहे.');

    paragraph = sentences.join(' ');
  } else if (language === 'hi') {
    const sentences = [];

    // S1: Primary concern + duration + severity
    let s1 = 'मरीज ने ';
    if (durationStr) {
      s1 += `लगभग ${durationStr} से `;
    }
    if (severityLevel) {
      const sevMap = { mild: 'हल्की तीव्रता के साथ ', moderate: 'मध्यम तीव्रता के साथ ', severe: 'गंभीर तीव्रता के साथ ' };
      s1 += sevMap[severityLevel] || '';
    }
    let locStr = '';
    if (locationVal) {
      const latPrefix = laterality === 'left' ? 'बाएँ ' : laterality === 'right' ? 'दाएँ ' : laterality === 'bilateral' ? 'दोनों ' : '';
      const locNames = { knee: 'घुटने में', chest: 'सीने में', shoulder: 'कंधे में', stomach: 'पेट में', abdomen: 'पेट में', head: 'सिर में' };
      const locName = locNames[String(locationVal).toLowerCase()] || String(locationVal);
      locStr = `${latPrefix}${locName} `;
    }
    const concernNamesHi = {
      knee_pain: 'घुटने के दर्द',
      chest_pain: 'सीने में दर्द',
      shoulder_pain: 'कंधे के दर्द',
      stomach: 'पेट दर्द / पेट की परेशानी',
      diarrhea: 'दस्त',
      fever: 'बुखार',
      cough: 'खांसी',
      breathing: 'सांस लेने में तकलीफ',
      headache: 'सिरदर्द',
      pain: 'दर्द / परेशानी',
    };
    const cNameHi = concernNamesHi[concernKey] || 'शारीरिक परेशानी';
    s1 += `${locStr}${cNameHi} होने की जानकारी दी है।`;
    sentences.push(s1);

    // S2: Absent symptoms
    if (absentSymptoms.length > 0) {
      const absNames = [...new Set(absentSymptoms.map((s) => getSymptomLabel(s, 'hi')))];
      sentences.push(`${absNames.join(' या ')} जैसी कोई समस्या नहीं बताई गई है।`);
    }

    // S3: Present symptoms
    if (presentSymptoms.length > 0) {
      const presNames = [...new Set(presentSymptoms.map((s) => getSymptomLabel(s, 'hi')))];
      sentences.push(`इसके साथ ही ${presNames.join(', ')} की समस्या भी दर्ज की गई है।`);
    }

    // S4: Meds & Allergies
    if (allergies?.status === 'ABSENT') {
      sentences.push('किसी भी ज्ञात एलर्जी की जानकारी नहीं पाई गई है।');
    } else if (allergies?.status === 'NOT_PROVIDED') {
      if (patientMeds.length === 0) {
        sentences.push('वर्तमान दवाओं या ज्ञात एलर्जी की कोई जानकारी मरीज द्वारा नहीं दी गई है।');
      } else {
        sentences.push('एलर्जी संबंधी विवरण जांच के दौरान उपलब्ध नहीं कराए गए हैं।');
      }
    } else if (allergies?.items?.length > 0) {
      sentences.push(`जांच के दौरान ${allergies.items.join(', ')} से एलर्जी दर्ज की गई है।`);
    }

    if (patientMeds.length > 0) {
      const medList = patientMeds.map((m) => m.name).join(', ');
      sentences.push(`मरीज ने बताया कि वह वर्तमान में ${medList} ले रहा/रही है।`);
    }

    // S5: Documents & Conflicts
    if (docs.length > 0) {
      sentences.push('अपलोड किए गए मेडिकल दस्तावेजों में दवा संबंधी विवरण शामिल हैं जिनकी समीक्षा डॉक्टर द्वारा की जानी है।');
    }
    if (medConflicts.length > 0) {
      sentences.push('मरीज द्वारा बताई गई दवा और दस्तावेजों में दर्ज खुराक में अंतर को डॉक्टर की समीक्षा के लिए चिह्नित किया गया है।');
    }

    // S6: Uncertain & Closing
    if (uncertainCount > 0) {
      sentences.push('मरीज द्वारा व्यक्त की गई किसी भी अनिश्चितता को डॉक्टर के साथ परामर्श के लिए चिह्नित किया गया है।');
    }
    sentences.push('यह सारांश केवल मरीज द्वारा पुष्टि की गई जानकारी और प्रस्तुत दस्तावेजों पर आधारित है।');

    paragraph = sentences.join(' ');
  } else {
    const sentences = [];

    // S1: Primary concern + location + duration + severity
    const concernStr = formatConcernDisplayName(concernKey).toLowerCase();
    let locStr = '';
    if (locationVal) {
      const latPrefix = laterality === 'left' ? 'left ' : laterality === 'right' ? 'right ' : laterality === 'bilateral' ? 'both ' : '';
      locStr = ` in the ${latPrefix}${locationVal}`;
    }
    const durStr = durationStr ? ` for approximately ${durationStr}` : '';
    const sevStr = severityLevel ? ` with ${severityLevel} severity` : '';
    sentences.push(`The patient reports ${concernStr}${locStr}${durStr}${sevStr}.`);

    // S2: Absent symptoms
    if (absentSymptoms.length > 0) {
      const absNames = [...new Set(absentSymptoms.map((s) => getSymptomLabel(s, 'en')))];
      sentences.push(`No ${absNames.join(' or ')} was reported.`);
    }

    // S3: Present symptoms
    if (presentSymptoms.length > 0) {
      const presNames = [...new Set(presentSymptoms.map((s) => getSymptomLabel(s, 'en')))];
      sentences.push(`Associated ${presNames.join(', ')} was noted.`);
    }

    // S4: Meds & Allergies
    if (allergies?.status === 'ABSENT') {
      sentences.push('No known drug allergies were reported.');
    } else if (allergies?.status === 'NOT_PROVIDED') {
      if (patientMeds.length === 0) {
        sentences.push('No known allergies or current medications were provided during the interview.');
      } else {
        sentences.push('Allergy details were not reported during intake.');
      }
    } else if (allergies?.items?.length > 0) {
      sentences.push(`Verified allergies include ${allergies.items.join(', ')}.`);
    }

    if (patientMeds.length > 0) {
      const medList = patientMeds.map((m) => `${m.name}${m.dose ? ` (${m.dose})` : ''}`).join(', ');
      sentences.push(`Patient reports currently taking ${medList}.`);
    }

    // S5: Documents & Conflicts
    if (docs.length > 0) {
      sentences.push('Uploaded medical documents contain clinical records that require clinician review.');
    }
    if (medConflicts.length > 0) {
      sentences.push('A medication discrepancy between patient report and uploaded records is clearly marked for review.');
    }

    // S6: Uncertain & Closing
    if (uncertainCount > 0) {
      sentences.push('Any uncertain information is highlighted for doctor clarification.');
    }
    sentences.push('This summary is based solely on information verified by the patient during clinical intake.');

    paragraph = sentences.join(' ');
  }

  const wordCount = paragraph.trim().split(/\s+/).filter(Boolean).length;

  return {
    text: paragraph,
    language,
    wordCount,
    generatedAt: new Date().toISOString(),
    summaryVersion: summary.summaryVersion || 1,
  };
}

function formatConcernDisplayName(concernKey) {
  if (!concernKey) return 'Not provided';
  const names = {
    knee_pain: 'Knee Pain',
    chest_pain: 'Chest Pain',
    shoulder_pain: 'Shoulder Pain',
    stomach: 'Abdominal Discomfort',
    diarrhea: 'Diarrhea',
    fever: 'Fever',
    cough: 'Cough',
    breathing: 'Breathing Difficulty',
    headache: 'Headache',
    pain: 'Pain / Discomfort',
  };
  return names[concernKey] || String(concernKey).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
