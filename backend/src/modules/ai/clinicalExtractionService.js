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

  // Rule 13: NO DEFAULT SELECTION if ambiguous or null
  if (!extraction || extraction.value === null) {
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

  // 2. Direct match on option value or string enum
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

  // 3. Semantic Radiation & Boolean Mapping (Section 1, 4, 5, 7)
  const isRadiationAttr = extraction.attribute === 'radiation';
  const isAffirmative =
    extVal === true ||
    (typeof extVal === 'string' &&
      ['LEFT_ARM', 'JAW_NECK', 'BACK', 'YES', 'SPREADS'].includes(extVal.toUpperCase()));
  const isNegative =
    extVal === false ||
    extraction.status === 'ABSENT' ||
    (typeof extVal === 'string' &&
      ['NONE', 'NO', 'NO_ONLY_CHEST'].includes(extVal.toUpperCase()));

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
        const lbl = typeof opt === 'object' ? (opt.label || opt.labels?.en || '') : String(opt);
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
    } else if (isNegative) {
      const noOpt = activeQuestion.options.find((opt) => {
        const val = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt) : opt;
        const lbl = typeof opt === 'object' ? (opt.label || opt.labels?.en || '') : String(opt);
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
    const answersCurrentQuestion = Boolean(
      primary &&
      (primary.attribute === targetAttribute || primary.concept === targetConcept) &&
      primary.status !== 'UNKNOWN'
    );

    return {
      success: true,
      provider: activeProvider.name,
      latency: result.latency,
      extractions: sortedExtractions,
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
