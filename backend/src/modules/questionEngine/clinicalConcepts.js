/**
 * Clinical Concept Ontology (Section 5, 6, 7)
 * Stable internal identifiers with multilingual labels (en, hi, mr)
 */

export const CLINICAL_CONCEPTS = {
  // Symptoms
  'symptom.pain': {
    code: 'symptom.pain',
    category: 'symptom',
    labels: { en: 'Pain / Discomfort', hi: 'दर्द / बेचैनी', mr: 'वेदना / अस्वस्थता' },
    attributes: ['location', 'onset', 'duration', 'severity', 'character', 'radiation', 'associatedSymptoms'],
  },
  'symptom.pain.chest': {
    code: 'symptom.pain.chest',
    category: 'symptom',
    labels: { en: 'Chest Pain / Discomfort', hi: 'सीने में दर्द या भारीपन', mr: 'छातीत दुखणे किंवा जड वाटणे' },
    attributes: ['onset', 'duration', 'severity', 'character', 'radiation', 'dyspnea', 'sweating'],
  },
  'symptom.pain.abdominal': {
    code: 'symptom.pain.abdominal',
    category: 'symptom',
    labels: { en: 'Abdominal Pain', hi: 'पेट दर्द', mr: 'पोटदुखी' },
    attributes: ['location', 'onset', 'duration', 'severity', 'character', 'foodRelation', 'nausea'],
  },
  'symptom.fever': {
    code: 'symptom.fever',
    category: 'symptom',
    labels: { en: 'Fever', hi: 'बुखार', mr: 'ताप' },
    attributes: ['duration', 'pattern', 'chills', 'associatedSymptoms'],
  },
  'symptom.cough': {
    code: 'symptom.cough',
    category: 'symptom',
    labels: { en: 'Cough', hi: 'खांसी', mr: 'खोकला' },
    attributes: ['duration', 'character', 'sputumColor', 'hemoptysis'],
  },
  'symptom.dyspnea': {
    code: 'symptom.dyspnea',
    category: 'symptom',
    labels: { en: 'Breathing Difficulty', hi: 'सांस लेने में तकलीफ', mr: 'श्वास घेण्यास त्रास' },
    attributes: ['onset', 'duration', 'severity', 'orthopnea'],
  },
  'symptom.headache': {
    code: 'symptom.headache',
    category: 'symptom',
    labels: { en: 'Headache', hi: 'सिरदर्द', mr: 'डोकेदुखी' },
    attributes: ['location', 'duration', 'severity', 'visualChanges'],
  },

  // Medical History
  'history.past_condition': {
    code: 'history.past_condition',
    category: 'history',
    labels: { en: 'Past Medical Condition', hi: 'पिछली बीमारियां', mr: 'मागील आजार' },
  },
  'history.medication': {
    code: 'history.medication',
    category: 'history',
    labels: { en: 'Active Medications', hi: 'चल रही दवाइयां', mr: 'सध्या चालू असलेली औषधे' },
  },
  'history.allergy': {
    code: 'history.allergy',
    category: 'history',
    labels: { en: 'Allergies', hi: 'एलर्जी', mr: 'अ‍ॅलर्जी' },
  },
};
