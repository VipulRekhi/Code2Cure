/**
 * Clinical Slot Extraction Service (Section 8, 23, 24, 25, 28, Phase 6.1)
 * Connects natural patient speech/text to Qwen 2.5 7B Instruct with strict schema validation.
 */

import { aiConfig } from './aiConfig.js';
import { qwenProvider } from './providers/qwenProvider.js';
import { mockProvider } from './providers/mockProvider.js';
import { buildExtractionPrompt } from './prompts/clinicalExtractionPrompt.js';
import { parseAndValidateModelOutput } from './utils/parseModelOutput.js';
import { CLINICAL_CONCEPTS } from '../questionEngine/clinicalConcepts.js';

export function matchesQuestionTarget(ext, activeQuestion) {
  if (!ext || !activeQuestion) return false;

  const targetConcept = activeQuestion.targetConcept || activeQuestion.concept;
  const targetAttribute = activeQuestion.targetAttribute || activeQuestion.attribute;
  const qId = activeQuestion.id || '';
  const qText = typeof activeQuestion.text === 'object'
    ? Object.values(activeQuestion.text).join(' ').toLowerCase()
    : String(activeQuestion.text || '').toLowerCase();

  // 1. Direct exact match
  if (targetAttribute && ext.attribute === targetAttribute) return true;
  if (targetConcept && ext.concept === targetConcept && ext.attribute === targetAttribute) return true;

  // 2. Dyspnea / breathing equivalence
  const isDyspneaTarget =
    targetAttribute === 'dyspnea' ||
    targetConcept === 'symptom.dyspnea' ||
    targetConcept === 'symptom.breathing' ||
    qId === 'q.pain.dyspnea' ||
    qId.includes('dyspnea') ||
    qText.includes('सांस') ||
    qText.includes('श्वास') ||
    qText.includes('breathing') ||
    qText.includes('shortness of breath');
  if (isDyspneaTarget) {
    if (ext.attribute === 'dyspnea') return true;
    if (ext.concept === 'symptom.dyspnea' || ext.concept === 'symptom.breathing') return true;
  }

  // 3. Sweating equivalence
  const isSweatingTarget =
    targetAttribute === 'sweating' ||
    targetConcept === 'symptom.sweating' ||
    qId === 'q.pain.sweating' ||
    qId.includes('sweating') ||
    qText.includes('पसीना') ||
    qText.includes('घाम') ||
    qText.includes('sweat');
  if (isSweatingTarget) {
    if (ext.attribute === 'sweating') return true;
    if (ext.concept === 'symptom.sweating') return true;
  }

  // 4. Radiation equivalence
  const isRadiationTarget =
    targetAttribute === 'radiation' ||
    qId === 'q.pain.radiation' ||
    qId.includes('radiation') ||
    qText.includes('पसर') ||
    qText.includes('फैल') ||
    qText.includes('radiat');
  if (isRadiationTarget && ext.attribute === 'radiation') return true;

  // 5. Swelling equivalence
  const isSwellingTarget =
    targetAttribute === 'swelling' ||
    qId.includes('swelling') ||
    qText.includes('सूजन') ||
    qText.includes('सूज') ||
    qText.includes('swell');
  if (isSwellingTarget && ext.attribute === 'swelling') return true;

  // 6. Mechanism / injury equivalence
  const isMechanismTarget =
    targetAttribute === 'mechanism' ||
    targetConcept === 'symptom.injury' ||
    qId.includes('mechanism') ||
    qId.includes('injury') ||
    qText.includes('दुखापत') ||
    qText.includes('चोट') ||
    qText.includes('पडलो') ||
    qText.includes('fall');
  if (isMechanismTarget && (ext.attribute === 'mechanism' || ext.concept === 'symptom.injury')) return true;

  // 7. Duration equivalence
  const isDurationTarget =
    targetAttribute === 'duration' ||
    targetConcept === 'clinical.duration' ||
    qId.includes('duration') ||
    qText.includes('किती दिवस') ||
    qText.includes('कितने दिन') ||
    qText.includes('how long') ||
    qText.includes('duration');
  if (isDurationTarget && ext.attribute === 'duration') return true;

  // 8. Severity equivalence
  const isSeverityTarget =
    targetAttribute === 'severity' ||
    targetConcept === 'clinical.severity' ||
    qId.includes('severity') ||
    qText.includes('तीव्रता') ||
    qText.includes('severity');
  if (isSeverityTarget && ext.attribute === 'severity') return true;

  // 9. Food relation
  if (targetAttribute === 'foodRelation' && ext.attribute === 'foodRelation') return true;

  // 10. Chief complaint / concept fallback
  if (qId === 'q.chief_complaint') return true;
  if (targetConcept && ext.concept === targetConcept) return true;

  return false;
}

export function mapExtractionToUiOption(extraction, activeQuestion) {
  if (!activeQuestion || !activeQuestion.options || activeQuestion.options.length === 0) {
    return {
      mappedOption: null,
      confidence: extraction?.confidence || 0.8,
      needsClarification: false,
    };
  }

  // 1. Handle UNKNOWN / uncertain status (Section 5, 11, 17)
  if (extraction && (extraction.status === 'UNKNOWN' || extraction.value === 'unknown')) {
    const notSureOpt = activeQuestion.options.find((opt) => {
      const val = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt) : opt;
      const lbl = typeof opt === 'object' ? (opt.label || opt.labels?.en || '') : String(opt);
      const valStr = String(val).toLowerCase();
      const lblStr = String(lbl).toLowerCase();
      return (
        valStr === 'unknown' ||
        valStr === 'not_sure' ||
        valStr === 'unsure' ||
        lblStr.includes('not sure') ||
        lblStr.includes('पता नहीं') ||
        lblStr.includes('माहित नाही') ||
        lblStr.includes("can't describe")
      );
    });

    if (notSureOpt) {
      const optVal = typeof notSureOpt === 'object' ? (notSureOpt.value ?? notSureOpt.id ?? notSureOpt.label ?? notSureOpt) : notSureOpt;
      return {
        mappedOption: optVal,
        confidence: 0.9,
        needsClarification: false,
      };
    }

    return {
      mappedOption: null,
      confidence: 0.3,
      needsClarification: true,
    };
  }

  // Rule: NO DEFAULT SELECTION if confidence < 0.7 or ambiguous or null
  if (!extraction || extraction.value === null || (extraction.confidence !== undefined && extraction.confidence !== null && extraction.confidence < 0.7)) {
    return {
      mappedOption: null,
      confidence: extraction?.confidence || 0.3,
      needsClarification: true,
    };
  }

  const extVal = extraction.value;
  const extValStr = typeof extVal === 'object'
    ? JSON.stringify(extVal).toLowerCase()
    : String(extVal).toLowerCase().trim();

  // 2. Strict Negative Check First (ABSENT or false)
  const isRadiationAttr = extraction.attribute === 'radiation';
  const isNegative =
    extVal === false ||
    extraction.status === 'ABSENT' ||
    (typeof extVal === 'string' &&
      ['NONE', 'NO', 'NO_ONLY_CHEST'].includes(extVal.toUpperCase()));

  if (isNegative) {
    const noOpt = activeQuestion.options.find((opt) => {
      const val = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt) : opt;
      const lbl = typeof opt === 'object' ? (opt.label || opt.labels?.en || opt.labels?.mr || opt.labels?.hi || '') : String(opt);
      const valStr = String(val).toLowerCase();
      const lblStr = String(lbl).toLowerCase();
      return (
        valStr === 'no_only_chest' ||
        valStr === 'none' ||
        valStr === 'no' ||
        valStr === 'false' ||
        lblStr.includes('only') ||
        lblStr.includes('no') ||
        lblStr.includes('नाही') ||
        lblStr.includes('नहीं') ||
        lblStr.includes('फक्त') ||
        lblStr.includes('सिर्फ')
      );
    });

    if (noOpt) {
      const optVal = typeof noOpt === 'object' ? (noOpt.value ?? noOpt.id ?? noOpt.label ?? noOpt) : noOpt;
      return {
        mappedOption: optVal,
        confidence: extraction.confidence || 0.95,
        needsClarification: false,
      };
    }

    // Negative extraction must NEVER map to an affirmative option!
    return {
      mappedOption: null,
      confidence: extraction.confidence || 0.4,
      needsClarification: true,
    };
  }

  // 3. Direct match on option value or string enum
  for (const opt of activeQuestion.options) {
    const optVal = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt) : opt;
    const optValStr = typeof optVal === 'object' ? JSON.stringify(optVal).toLowerCase() : String(optVal).toLowerCase();

    if (extValStr === optValStr) {
      return {
        mappedOption: optVal,
        confidence: extraction.confidence || 0.95,
        needsClarification: false,
      };
    }

    if (typeof optVal === 'string' && optVal.toUpperCase() === String(extVal).toUpperCase()) {
      return {
        mappedOption: optVal,
        confidence: extraction.confidence || 0.95,
        needsClarification: false,
      };
    }
  }

  // 3b. Semantic Severity Level Mapping to UI Options (Marathi, Hindi, English, Hinglish)
  const targetConcept = activeQuestion.targetConcept || activeQuestion.concept;
  const targetAttribute = activeQuestion.targetAttribute || activeQuestion.attribute;
  const isSeverityTarget =
    extraction.attribute === 'severity' ||
    targetAttribute === 'severity' ||
    targetConcept === 'clinical.severity' ||
    (activeQuestion.id && String(activeQuestion.id).includes('severity'));

  if (isSeverityTarget && extVal) {
    const extUpper = String(extVal).toUpperCase().trim();
    const isModerate = extUpper === 'MODERATE' || extUpper === 'MEDIUM' || extUpper === 'AVERAGE' || extUpper === 'MANAGEABLE';
    const isMild = extUpper === 'MILD' || extUpper === 'LOW' || extUpper === 'SLIGHT';
    const isSevere = extUpper === 'SEVERE' || extUpper === 'HIGH' || extUpper === 'EXTREME' || extUpper === 'INTENSE';
    const isUnbearable = extUpper === 'UNBEARABLE';

    const matchedSeverityOpt = activeQuestion.options.find((opt) => {
      const optVal = typeof opt === 'object' && opt !== null ? (opt.value ?? opt.id ?? opt.label ?? opt) : opt;
      const optLbl = typeof opt === 'object' && opt !== null ? (opt.label || opt.labels?.mr || opt.labels?.hi || opt.labels?.en || opt.value || '') : String(opt ?? '');
      const valStr = String(optVal ?? '').toLowerCase().trim();
      const lblStr = String(optLbl ?? '').toLowerCase().trim();

      if (isModerate) {
        return (
          valStr === 'moderate' ||
          valStr === 'medium' ||
          valStr === 'मध्यम' ||
          lblStr.includes('मध्यम') ||
          lblStr.includes('moderate') ||
          lblStr.includes('medium') ||
          lblStr.includes('ठीकठाक') ||
          lblStr.includes('ठीक-ठाक') ||
          lblStr.includes('साधारण') ||
          lblStr.includes('बीच का') ||
          lblStr.includes('manageable')
        );
      }

      if (isMild) {
        return (
          valStr === 'mild' ||
          valStr === 'low' ||
          valStr === 'कमी' ||
          valStr === 'कम' ||
          lblStr.includes('कमी') ||
          lblStr.includes('कम') ||
          lblStr.includes('हल्का') ||
          lblStr.includes('थोडा') ||
          lblStr.includes('थोड़ा') ||
          lblStr.includes('mild') ||
          lblStr.includes('low') ||
          lblStr.includes('slight')
        );
      }

      if (isSevere) {
        return (
          valStr === 'severe' ||
          valStr === 'high' ||
          valStr === 'तीव्र' ||
          valStr === 'खूप जास्त' ||
          lblStr.includes('खूप जास्त') ||
          lblStr.includes('फार जास्त') ||
          lblStr.includes('तीव्र') ||
          lblStr.includes('बहुत ज्यादा') ||
          lblStr.includes('बहुत तेज') ||
          lblStr.includes('काफी तेज') ||
          lblStr.includes('severe') ||
          lblStr.includes('high') ||
          (lblStr.includes('जास्त') && !lblStr.includes('नाही')) ||
          (lblStr.includes('ज्यादा') && !lblStr.includes('नहीं'))
        );
      }

      if (isUnbearable) {
        return (
          valStr === 'unbearable' ||
          valStr === 'असह्य' ||
          lblStr.includes('असहनीय') ||
          lblStr.includes('असह्य') ||
          lblStr.includes('सहन') ||
          lblStr.includes('unbearable')
        );
      }

      return false;
    });

    if (matchedSeverityOpt) {
      const optVal = typeof matchedSeverityOpt === 'object' && matchedSeverityOpt !== null
        ? (matchedSeverityOpt.value ?? matchedSeverityOpt.id ?? matchedSeverityOpt.label ?? matchedSeverityOpt)
        : matchedSeverityOpt;
      return {
        mappedOption: optVal,
        confidence: extraction.confidence || 0.95,
        needsClarification: false,
      };
    }
  }

  // 4. Semantic Affirmative Mapping
  const isAffirmative =
    (extVal === true && extraction.status !== 'ABSENT') ||
    (typeof extVal === 'string' &&
      ['LEFT_ARM', 'JAW_NECK', 'BACK', 'YES', 'SPREADS'].includes(extVal.toUpperCase()));

  if (isRadiationAttr || typeof extVal === 'boolean') {
    if (isAffirmative) {
      if (typeof extVal === 'string' && ['LEFT_ARM', 'JAW_NECK', 'BACK'].includes(extVal.toUpperCase())) {
        const siteOpt = activeQuestion.options.find((opt) => {
          const val = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt) : opt;
          return String(val).toUpperCase() === extVal.toUpperCase();
        });
        if (siteOpt) {
          const optVal = typeof siteOpt === 'object' ? (siteOpt.value ?? siteOpt.id ?? siteOpt.label ?? siteOpt) : siteOpt;
          return {
            mappedOption: optVal,
            confidence: extraction.confidence || 0.95,
            needsClarification: false,
          };
        }
      }

      const yesOpt = activeQuestion.options.find((opt) => {
        const val = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt) : opt;
        const lbl = typeof opt === 'object' ? (opt.label || opt.labels?.en || opt.labels?.mr || opt.labels?.hi || '') : String(opt);
        const valStr = String(val).toLowerCase();
        const lblStr = String(lbl).toLowerCase();
        return (
          valStr === 'yes_spreads' ||
          valStr === 'yes' ||
          valStr === 'left_arm' ||
          valStr === 'jaw_neck' ||
          valStr === 'back' ||
          valStr === 'true' ||
          lblStr.includes('spread') ||
          lblStr.includes('yes') ||
          lblStr.includes('पसर') ||
          lblStr.includes('फैल') ||
          lblStr.includes('हाँ') ||
          lblStr.includes('हो')
        );
      });

      if (yesOpt) {
        const optVal = typeof yesOpt === 'object' ? (yesOpt.value ?? yesOpt.id ?? yesOpt.label ?? yesOpt) : yesOpt;
        return {
          mappedOption: optVal,
          confidence: extraction.confidence || 0.95,
          needsClarification: false,
        };
      }
    }
  }

  // 2. Numeric range duration match against options
  if (typeof extVal === 'object' && extVal.min !== undefined && extVal.max !== undefined) {
    for (const opt of activeQuestion.options) {
      const optVal = typeof opt === 'object' ? (opt.value ?? opt) : opt;
      if (typeof optVal === 'object' && optVal.amount !== undefined) {
        if (optVal.amount >= extVal.min && optVal.amount <= extVal.max) {
          return {
            mappedOption: optVal,
            confidence: extraction.confidence || 0.92,
            needsClarification: false,
          };
        }
      }
    }
  } else if (typeof extVal === 'number') {
    for (const opt of activeQuestion.options) {
      const optVal = typeof opt === 'object' ? (opt.value ?? opt) : opt;
      if (typeof optVal === 'object' && optVal.amount === extVal) {
        return {
          mappedOption: optVal,
          confidence: extraction.confidence || 0.95,
          needsClarification: false,
        };
      }
    }
  }

  // Ambiguous: Do NOT default to first option or random option!
  return {
    mappedOption: null,
    confidence: extraction.confidence ? extraction.confidence * 0.5 : 0.4,
    needsClarification: true,
  };
}

class ClinicalExtractionService {
  constructor() {
    this.config = aiConfig;
  }

  /**
   * Main clinical slot extraction entrypoint.
   */
  async extract(rawTranscript, activeQuestion = null, sessionState = null) {
    if (!rawTranscript || typeof rawTranscript !== 'string' || !rawTranscript.trim()) {
      return {
        success: false,
        error: 'Empty patient transcript provided for extraction',
        fallbackToTouch: true,
        extractions: [],
      };
    }

    const { systemPrompt, userPrompt } = buildExtractionPrompt({
      rawTranscript,
      activeQuestion,
      allowedConcepts: CLINICAL_CONCEPTS,
    });

    let activeProvider = this.config.mode === 'qwen' ? qwenProvider : mockProvider;

    // 1. Execute extraction via active provider
    let result = await activeProvider.generateStructuredExtraction(systemPrompt, userPrompt);

    // 2. Safe Failure Handling: Do not manufacture facts if primary model fails (Section 8)
    if (!result.success) {
      console.warn(`[AI Service] Provider (${activeProvider.name}) failed: ${result.error}. Engaging touch fallback.`);
      return {
        success: false,
        error: result.error,
        fallbackToTouch: true,
        extractions: [],
        latency: result.latency || 0,
      };
    }

    // 3. Parse and Validate Output against Schema & Ontology (Section 12)
    const parseResult = parseAndValidateModelOutput(result.rawOutput);

    if (!parseResult.success) {
      console.warn(`[AI Service] Model output validation failed: ${parseResult.error}`);
      return {
        success: false,
        error: parseResult.error,
        fallbackToTouch: true,
        extractions: [],
        latency: result.latency,
      };
    }

    if (parseResult.extractions.length === 0) {
      console.warn(`[AI Service] Zero valid ontology extractions obtained from model output.`);
      return {
        success: false,
        error: 'No valid clinical ontology concepts extracted',
        fallbackToTouch: true,
        extractions: [],
        latency: result.latency,
      };
    }

    const targetConcept = activeQuestion?.targetConcept || activeQuestion?.concept;
    const targetAttribute = activeQuestion?.targetAttribute || activeQuestion?.attribute;

    let sortedExtractions = parseResult.extractions;
    if (activeQuestion) {
      sortedExtractions = [...parseResult.extractions].sort((a, b) => {
        const aMatches = matchesQuestionTarget(a, activeQuestion);
        const bMatches = matchesQuestionTarget(b, activeQuestion);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;

        const aMatchesAttr = a.attribute === targetAttribute;
        const bMatchesAttr = b.attribute === targetAttribute;
        if (aMatchesAttr && !bMatchesAttr) return -1;
        if (!aMatchesAttr && bMatchesAttr) return 1;
        const aMatchesConcept = a.concept === targetConcept;
        const bMatchesConcept = b.concept === targetConcept;
        if (aMatchesConcept && !bMatchesConcept) return -1;
        if (!aMatchesConcept && bMatchesConcept) return 1;
        return 0;
      });
    }

    // Section 19: Debug Logging in Development
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      const primary = sortedExtractions[0];
      const uiMapping = mapExtractionToUiOption(primary, activeQuestion);
      console.log(`[ClinicalExtraction Trace]
  Session ID: ${sessionState?.sessionId || 'N/A'}
  Question ID: ${activeQuestion?.id || 'N/A'}
  Question text: ${typeof activeQuestion?.text === 'object' ? JSON.stringify(activeQuestion.text) : (activeQuestion?.text || 'N/A')}
  Target concept: ${targetConcept || 'N/A'}
  Target attribute: ${targetAttribute || 'N/A'}
  Raw transcript: "${rawTranscript}"
  Raw LLM extraction: ${result.rawOutput}
  Parsed extractions count: ${sortedExtractions.length}
  Primary extraction: ${JSON.stringify(primary)}
  Normalized value: ${JSON.stringify(primary?.value)}
  Confidence: ${primary?.confidence ?? 'N/A'}
  Mapped UI option: ${JSON.stringify(uiMapping.mappedOption)}
  Mapping source: LLM_EXTRACTION`);
    }

    const primary = sortedExtractions[0];
    const uiMapping = mapExtractionToUiOption(primary, activeQuestion);
    const hasTargetMatch = sortedExtractions.some(
      (ext) => matchesQuestionTarget(ext, activeQuestion) && ext.status !== 'UNKNOWN'
    );
    const answersCurrentQuestion = Boolean(
      hasTargetMatch ||
      (primary &&
        (primary.attribute === targetAttribute || primary.concept === targetConcept) &&
        primary.status !== 'UNKNOWN')
    );
    const additionalFacts = sortedExtractions.filter((ext) => ext !== primary);

    return {
      success: true,
      provider: activeProvider.name,
      latency: result.latency,
      extractions: sortedExtractions,
      additionalFacts,
      answersCurrentQuestion,
      targetAttribute: primary?.attribute || targetAttribute,
      value: primary?.value,
      mappedOption: uiMapping.mappedOption,
      mappedOptionId: uiMapping.mappedOption,
      confidence: primary?.confidence,
      rawTranscript,
    };
  }
}

export const clinicalExtractionService = new ClinicalExtractionService();
