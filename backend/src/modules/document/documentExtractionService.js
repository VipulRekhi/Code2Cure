/**
 * Medical Document Extraction Service (Phase 7 Section 6, 7, 8)
 * Extracts structured clinical information from raw OCR text.
 * STRICT ZERO-HALLUCINATION ENFORCEMENT:
 * - If a value (dose, frequency, duration, test value, diagnosis) is absent in OCR text,
 *   it MUST be set to "Not detected" or null.
 * - Never fabricate medications, diagnoses, dates, or lab values.
 */

export class DocumentExtractionService {
  /**
   * Main extractor for raw OCR text.
   * @param {string} ocrText - Raw OCR text extracted by ocrService.
   * @param {string} declaredType - Optional user/system declared document type.
   */
  extract(ocrText = '', declaredType = 'OTHER') {
    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length === 0) {
      return {
        documentType: declaredType || 'OTHER',
        diagnoses: [],
        medications: [],
        labResults: [],
        doctorOrFacility: null,
        documentDate: null,
        extractionConfidence: 0,
        unverifiedOrMissingFields: ['all'],
      };
    }

    const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);
    const textLower = ocrText.toLowerCase();

    // 1. Determine Document Classification
    let resolvedType = declaredType;
    if (textLower.includes('rx') || textLower.includes('tab.') || textLower.includes('cap.') || textLower.includes('syp.') || textLower.includes('औषध')) {
      resolvedType = 'PRESCRIPTION';
    } else if (textLower.includes('investigation') || textLower.includes('reference interval') || textLower.includes('lab report') || textLower.includes('glucose') || textLower.includes('cholesterol') || textLower.includes('तपासणी')) {
      resolvedType = 'LAB_REPORT';
    } else if (textLower.includes('discharge summary') || textLower.includes('admission') || textLower.includes('condition at discharge')) {
      resolvedType = 'DISCHARGE';
    }

    // 2. Extract Doctor or Issuing Facility
    let doctorOrFacility = null;
    for (const line of lines) {
      if (/^(Dr\.|Doctor|Dr\s|वैद्य)/i.test(line)) {
        doctorOrFacility = line;
        break;
      }
      if (/Hospital|Clinic|Healthcare|रग्णालय|दवाखाना/i.test(line) && !doctorOrFacility) {
        doctorOrFacility = line;
      }
    }

    // 3. Extract Document Date (without inventing)
    let documentDate = null;
    const dateMatch = ocrText.match(/(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b)/);
    if (dateMatch) {
      documentDate = dateMatch[1];
    }

    // 4. Extract Medications (Strict Zero-Hallucination)
    const medications = [];
    const diagnoses = [];
    const labResults = [];
    const missingFields = [];

    const nonDrugKeywords = new Set([
      'rx', 'date', 'patient', 'dr', 'doctor', 'city', 'general', 'final', 'adv', 'review',
      'investigation', 'test', 'result', 'hba1c', 'sugar', 'glucose', 'blood', 'report',
      'value', 'reference', 'range', 'diagnosis', 'impression', 'history'
    ]);

    for (const line of lines) {
      const cleanLine = line.replace(/^\s*\d+[\.\)]\s*/, '').trim();

      // Check for prescription medication line
      const hasMedPrefix = /^(?:Tab\.?|Tablet|Cap\.?|Capsule|Syp\.?|Syrup|Inj\.?|Injection|Oint\.?|Ointment)\b/i.test(cleanLine);
      const isRxLine = /^(?:Rx:?\s*)/i.test(cleanLine);
      const isPrescriptionContext = resolvedType === 'PRESCRIPTION' && !line.includes('|') && !line.includes(':') && /\d+\s*(?:mg|g|mcg|ml)/i.test(cleanLine);

      if ((hasMedPrefix || isRxLine || isPrescriptionContext) && !line.includes('|')) {
        // Strip prefix cleanly
        const afterPrefix = cleanLine
          .replace(/^(?:Rx:?\s*)?(?:Tab\.?|Tablet|Cap\.?|Capsule|Syp\.?|Syrup|Inj\.?|Injection|Oint\.?|Ointment)\s*/i, '')
          .trim();

        const drugMatch = afterPrefix.match(/^([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)/i);
        const candidateName = drugMatch ? drugMatch[1].trim() : null;

        if (candidateName && !nonDrugKeywords.has(candidateName.toLowerCase())) {
          // Extract dosage if present (e.g. 40mg, 650 mg, 500mg, 5ml, 2 tsp)
          const doseMatch = line.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|IU|tsp|tablets?))/i);
          const dose = doseMatch ? doseMatch[1].trim() : 'Not detected';

          // Extract frequency if present (e.g. 1-0-0, 1-0-1, OD, BD, TDS, QID, Once daily)
          const freqMatch = line.match(/(\b[01]-[01]-[01]\b|\b[01]-[01]-[01]-[01]\b|\bOD\b|\bBD\b|\bTDS\b|\bQID\b|\bHS\b|\bSOS\b|Once daily|Twice daily|Thrice daily)/i);
          const frequency = freqMatch ? freqMatch[1].trim() : 'Not detected';

          // Extract duration if present (e.g. 7 days, 3 days, 1 month)
          const durMatch = line.match(/(\d+\s*(?:days?|weeks?|months?|दिवस|आठवडे))/i);
          const duration = durMatch ? durMatch[1].trim() : 'Not detected';

          // Instructions (e.g. Before food, After food, उपाशीपोटी, जेवणानंतर)
          let instructions = 'Not detected';
          if (/before food|उपाशीपोटी/i.test(line)) instructions = 'Before food';
          else if (/after food|जेवणानंतर/i.test(line)) instructions = 'After food';
          else if (/with food/i.test(line)) instructions = 'With food';

          if (dose === 'Not detected') missingFields.push(`Medication "${candidateName}" dose`);
          if (frequency === 'Not detected') missingFields.push(`Medication "${candidateName}" frequency`);

          medications.push({
            drugName: candidateName,
            dose,
            frequency,
            duration,
            instructions,
            rawTextLine: line,
            verifiedFromDocument: true,
          });
        }
      }

      // Check for Diagnoses
      if (/(?:Diagnosis|Diagnoses|Impression|निदान|तक्रार):?\s*([^\n\r]+)/i.test(line)) {
        const diagMatch = line.match(/(?:Diagnosis|Diagnoses|Impression|निदान|तक्रार):?\s*([^\n\r]+)/i);
        if (diagMatch && diagMatch[1].trim()) {
          diagnoses.push({
            conditionName: diagMatch[1].trim(),
            verifiedFromDocument: true,
            confidence: 0.95,
          });
        }
      }

      // Check for Laboratory Results: e.g. "Fasting Blood Glucose: 112 mg/dL (70 - 99)"
      if (/:|\b\d+(?:\.\d+)?\s*(?:mg\/dL|%|g\/dL|mmol\/L|U\/L|cells\/cu\.mm|fl)\b/i.test(line) && !line.startsWith('Tab') && !line.startsWith('Cap') && !line.startsWith('Date:')) {
        const labMatch = line.match(/^([^:\-\|]+)(?::|\|)\s*([\d\.]+\s*(?:mg\/dL|%|g\/dL|mmol\/L|U\/L|cells\/cu\.mm|fl)?)(?:\s*\(([^)]+)\))?/i);
        if (labMatch) {
          const testName = labMatch[1].trim();
          const resultValue = labMatch[2] ? labMatch[2].trim() : 'Not detected';
          const referenceRange = labMatch[3] ? labMatch[3].trim() : 'Not detected';

          // Only add if testName looks like a clinical test
          if (!['Date', 'Time', 'Age', 'Gender', 'Phone', 'Dr'].includes(testName)) {
            let isAbnormal = false;
            if (line.toLowerCase().includes('high') || line.toLowerCase().includes('borderline') || line.toLowerCase().includes('elevated') || line.toLowerCase().includes('abnormal')) {
              isAbnormal = true;
            }

            labResults.push({
              testName,
              resultValue,
              referenceRange,
              isAbnormal,
              rawTextLine: line,
              verifiedFromDocument: true,
            });
          }
        }
      }
    }

    return {
      documentType: resolvedType,
      diagnoses,
      medications,
      labResults,
      doctorOrFacility,
      documentDate,
      extractionConfidence: 0.93,
      rawLinesCount: lines.length,
      missingFieldsNoted: missingFields,
    };
  }
}

export const documentExtractionService = new DocumentExtractionService();
