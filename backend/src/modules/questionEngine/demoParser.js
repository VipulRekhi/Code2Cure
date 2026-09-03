/**
 * Deterministic Demo Voice Response Parser (Section 42 & 43)
 * Mappings for known vernacular demo inputs to normalized slot values.
 * Strictly labeled as deterministic test/demo logic (Zero AI model).
 */

export function parseDemoVoiceResponse(rawTranscript, question) {
  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return null;
  }

  const text = rawTranscript.toLowerCase().trim();

  // 1. Duration Parsing
  if (question.inputType === 'duration') {
    if (text.includes('तीन दिवस') || text.includes('तीन दिन') || text.includes('three days')) {
      return { amount: 3, unit: 'days' };
    }
    if (text.includes('आज') || text.includes('today')) {
      return { amount: 1, unit: 'days' };
    }
    if (text.includes('काल') || text.includes('कल') || text.includes('yesterday')) {
      return { amount: 2, unit: 'days' };
    }
    if (text.includes('आठवडा') || text.includes('सप्ताह') || text.includes('week')) {
      return { amount: 7, unit: 'days' };
    }
  }

  // 2. Pain Location Parsing
  if (question.id === 'q.pain.location') {
    if (text.includes('छाती') || text.includes('सीना') || text.includes('chest')) return 'chest';
    if (text.includes('पोट') || text.includes('पेट') || text.includes('stomach') || text.includes('abdomen')) return 'abdomen';
    if (text.includes('डोके') || text.includes('सिर') || text.includes('head')) return 'head';
    if (text.includes('पाठ') || text.includes('पीठ') || text.includes('back')) return 'back';
    if (text.includes('गुडघा') || text.includes('घुटना') || text.includes('knee')) return 'knee';
  }

  // 3. Severity Parsing
  if (question.inputType === 'scale') {
    if (text.includes('असह्य') || text.includes('असहनीय') || text.includes('worst')) return 'UNBEARABLE';
    if (text.includes('तीव्र') || text.includes('तेज') || text.includes('severe')) return 'SEVERE';
    if (text.includes('मध्यम') || text.includes('moderate')) return 'MODERATE';
    if (text.includes('कमी') || text.includes('हल्का') || text.includes('mild')) return 'MILD';
  }

  // 4. Character Parsing
  if (question.id === 'q.pain.character') {
    if (text.includes('दाब') || text.includes('जड') || text.includes('दबाव') || text.includes('भारी') || text.includes('pressure')) return 'PRESSURE';
    if (text.includes('जळजळ') || text.includes('जलन') || text.includes('burning')) return 'BURNING';
    if (text.includes('सुई') || text.includes('चुभने') || text.includes('sharp')) return 'SHARP';
    if (text.includes('हल्के') || text.includes('dull')) return 'DULL';
  }

  // 5. Yes/No Parsing
  if (question.inputType === 'yes-no') {
    if (text.includes('होय') || text.includes('हां') || text.includes('yes')) return 'yes';
    if (text.includes('नाही') || text.includes('नहीं') || text.includes('no')) return 'no';
    if (text.includes('माहित नाही') || text.includes('पता नहीं') || text.includes('unknown') || text.includes('not sure')) return 'unknown';
  }

  // Fallback: if matches any option value or label directly
  if (question.options) {
    for (const opt of question.options) {
      if (text.includes(String(opt.value).toLowerCase())) return opt.value;
      for (const lang of ['en', 'hi', 'mr']) {
        if (opt.labels?.[lang] && text.includes(opt.labels[lang].toLowerCase())) {
          return opt.value;
        }
      }
    }
  }

  return null;
}
