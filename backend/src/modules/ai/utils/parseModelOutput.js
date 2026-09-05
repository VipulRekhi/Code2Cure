/**
 * Model Output Parser & Schema Validator (Section 12)
 * Cleans markdown fences, parses JSON, and validates with Zod against ontology.
 */

import { clinicalExtractionSchema } from '../schemas/clinicalExtractionSchema.js';
import { CLINICAL_CONCEPTS } from '../../questionEngine/clinicalConcepts.js';

export function parseAndValidateModelOutput(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { success: false, error: 'Empty model output' };
  }

  // 1. Strip markdown code fences if present
  let cleanText = rawText.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // 2. Extract JSON object boundary
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return { success: false, error: 'No valid JSON object found in output' };
  }

  const jsonSubstring = cleanText.substring(firstBrace, lastBrace + 1);

  // 3. Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonSubstring);
  } catch (err) {
    return { success: false, error: `Malformed JSON: ${err.message}` };
  }

  // 4. Validate with Zod Schema
  const validationResult = clinicalExtractionSchema.safeParse(parsed);
  if (!validationResult.success) {
    return {
      success: false,
      error: `Schema validation failed: ${validationResult.error.issues.map((i) => i.message).join('; ')}`,
    };
  }

  // 5. Ontology Validation: Filter out concepts/attributes not present in CLINICAL_CONCEPTS
  const validExtractions = validationResult.data.extractions.filter((ext) => {
    // Concept must exist in ontology
    const conceptDef = CLINICAL_CONCEPTS[ext.concept];
    if (!conceptDef) {
      console.warn(`[AI Validation] Rejected unknown concept: "${ext.concept}"`);
      return false;
    }

    // Must not be a diagnostic claim or emergency assessment
    if (
      ext.concept.startsWith('diagnosis.') ||
      ext.concept.includes('triage') ||
      ext.concept.includes('emergency') ||
      ext.attribute === 'diagnosis' ||
      ext.attribute === 'triage' ||
      ext.attribute === 'emergency'
    ) {
      console.warn(`[AI Validation] Rejected diagnostic/triage field: "${ext.concept}.${ext.attribute}"`);
      return false;
    }

    // Attribute must be supported by the concept definition
    if (conceptDef.attributes && !conceptDef.attributes.includes(ext.attribute)) {
      console.warn(`[AI Validation] Rejected unsupported attribute "${ext.attribute}" for concept "${ext.concept}"`);
      return false;
    }

    // Negative Statement Guard: Never manufacture duration=0 for an absent symptom
    if (ext.status === 'ABSENT' && ext.attribute === 'duration') {
      console.warn(`[AI Validation] Rejected fabricated duration=0 for absent symptom: "${ext.concept}"`);
      return false;
    }

    return true;
  });

  return {
    success: true,
    extractions: validExtractions,
  };
}
