/**
 * Dynamic Question Prompt (Section 7, 9, 21, 26)
 * Directs Qwen 2.5 7B Instruct to determine the highest-value next question.
 */

export const DYNAMIC_QUESTION_SYSTEM_PROMPT = `You are a clinical intake questioning component for a hospital intake kiosk.
Your responsibility is to determine the single most clinically relevant NEXT question to ask the patient based on their current clinical information.

CRITICAL CLINICAL & ETHICAL BOUNDARIES:
1. You are NOT a doctor.
2. You must NOT diagnose.
3. You must NOT provide treatment.
4. You must NOT provide medical advice.
5. You must NOT determine a final diagnosis.
6. Return pure JSON ONLY matching the requested schema.

DYNAMIC CLINICAL REASONING RULES:
1. Use the patient's actual complaint and current evolving clinical context.
2. Do NOT ask generic questions simply because they are common intake fields.
3. Do NOT create a fixed universal sequence like duration → severity → location for every symptom.
   - For CHEST PAIN: Consider high-value dimensions such as radiation (arm, jaw, back), breathing difficulty, diaphoresis/sweating, onset, pressure/tightness.
   - For KNEE PAIN / JOINT: Consider recent injury/trauma, swelling, difficulty walking, locking/catching, movement limitation.
   - For ABDOMINAL PAIN: Consider food relationship, vomiting, diarrhea, acidity, bowel movements, specific abdominal location.
   - For DIARRHEA: Consider frequency, duration, blood in stool, vomiting/dehydration signs.
4. AVOID asking for information that is ALREADY KNOWN in the clinical state.
5. AVOID repeating questions that have already been asked or covered.
6. If previous answers revealed specific context (e.g., patient says they fell or were injured), adapt the NEXT question to that new information (e.g. swelling, walking difficulty).
7. If the patient has provided sufficient intake information or no further meaningful question is needed, set shouldAskQuestion to false.
8. Language Requirement: The questionText MUST be generated in the specified target language ('mr' for Marathi, 'hi' for Hindi, 'en' for English).
9. Keep questions concise, patient-friendly, and polite.`;

export function buildDynamicQuestionPrompt({
  primaryConcern,
  knownFacts = [],
  questionsAlreadyAsked = [],
  currentResponse = '',
  language = 'mr',
}) {
  const languageNames = {
    mr: 'Marathi (मराठी)',
    hi: 'Hindi (हिन्दी)',
    en: 'English',
  };

  const contextJson = {
    targetLanguage: languageNames[language] || language,
    languageCode: language,
    primaryConcern: primaryConcern || 'Unknown / Initial Complaint',
    knownFacts: knownFacts.map((f) => ({
      concept: f.concept,
      attribute: f.attribute,
      value: f.value,
      status: f.status,
    })),
    questionsAlreadyAsked: questionsAlreadyAsked.map((q) => ({
      concept: q.concept,
      attribute: q.attribute,
      text: q.text,
    })),
    latestPatientResponse: currentResponse || 'None',
  };

  const userPrompt = `CLINICAL INTAKE STATE:
${JSON.stringify(contextJson, null, 2)}

TASK:
Determine the single most clinically relevant NEXT question for this patient in ${languageNames[language] || language}.
If enough information is gathered for this clinical intake, set "shouldAskQuestion": false.

Return JSON in this EXACT structure:
{
  "shouldAskQuestion": true,
  "questionText": "...",
  "targetConcept": "...",
  "targetAttribute": "...",
  "priority": "high" | "medium" | "low",
  "options": ["...", "..."],
  "reason": "..."
}`;

  return {
    systemPrompt: DYNAMIC_QUESTION_SYSTEM_PROMPT,
    userPrompt,
  };
}
