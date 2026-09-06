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
    attributes: ['presence', 'status', 'complaint_type', 'location', 'onset', 'duration', 'severity', 'character', 'radiation', 'associatedSymptoms'],
  },
  'symptom.pain.chest': {
    code: 'symptom.pain.chest',
    category: 'symptom',
    labels: { en: 'Chest Pain / Discomfort', hi: 'सीने में दर्द या भारीपन', mr: 'छातीत दुखणे किंवा जड वाटणे' },
    attributes: ['presence', 'status', 'onset', 'duration', 'severity', 'character', 'radiation', 'dyspnea', 'sweating'],
  },
  'symptom.pain.knee': {
    code: 'symptom.pain.knee',
    category: 'symptom',
    labels: { en: 'Knee Pain / Discomfort', hi: 'घुटने में दर्द', mr: 'गुडघेदुखी / गुडघ्यात वेदना' },
    attributes: ['presence', 'status', 'location', 'onset', 'duration', 'severity', 'injury', 'swelling', 'mobility', 'locking'],
  },
  'symptom.pain.shoulder': {
    code: 'symptom.pain.shoulder',
    category: 'symptom',
    labels: { en: 'Shoulder Pain / Discomfort', hi: 'कंधे में दर्द / जकड़न', mr: 'खांदेदुखी / खांद्यात वेदना' },
    attributes: ['presence', 'status', 'location', 'onset', 'duration', 'severity', 'injury', 'mobility', 'stiffness', 'movementAggravation'],
  },
  'symptom.pain.abdominal': {
    code: 'symptom.pain.abdominal',
    category: 'symptom',
    labels: { en: 'Abdominal Pain / Stomach', hi: 'पेट दर्द / उल्टी', mr: 'पोटदुखी / उलटी' },
    attributes: ['presence', 'status', 'complaint_type', 'location', 'onset', 'duration', 'severity', 'character', 'foodRelation', 'nausea', 'vomiting'],
  },
  'symptom.diarrhea': {
    code: 'symptom.diarrhea',
    category: 'symptom',
    labels: { en: 'Diarrhea / Loose Stools', hi: 'दस्त / पेट खराब', mr: 'जुलाब / संडास' },
    attributes: ['presence', 'status', 'complaint_type', 'duration', 'frequency', 'bloodInStool', 'stoolConsistency', 'associatedSymptoms'],
  },
  'symptom.injury': {
    code: 'symptom.injury',
    category: 'symptom',
    labels: { en: 'Injury / Trauma / Fall', hi: 'चोट / गिरना / आघात', mr: 'दुखापत / पडणे / मार' },
    attributes: ['presence', 'status', 'mechanism', 'timing', 'swelling', 'location'],
  },
  'symptom.vomiting': {
    code: 'symptom.vomiting',
    category: 'symptom',
    labels: { en: 'Vomiting / Nausea', hi: 'उल्टी / जी मिचलाना', mr: 'उलटी / मळमळ' },
    attributes: ['presence', 'status', 'complaint_type', 'duration', 'frequency', 'bloodInVomit', 'associatedSymptoms'],
  },
  'symptom.fever': {
    code: 'symptom.fever',
    category: 'symptom',
    labels: { en: 'Fever', hi: 'बुखार', mr: 'ताप' },
    attributes: ['presence', 'status', 'duration', 'pattern', 'chills', 'associatedSymptoms', 'associated'],
  },
  'symptom.cough': {
    code: 'symptom.cough',
    category: 'symptom',
    labels: { en: 'Cough', hi: 'खांसी', mr: 'खोकला' },
    attributes: ['presence', 'status', 'duration', 'character', 'sputumColor', 'hemoptysis'],
  },
  'symptom.dyspnea': {
    code: 'symptom.dyspnea',
    category: 'symptom',
    labels: { en: 'Breathing Difficulty', hi: 'सांस लेने में तकलीफ', mr: 'श्वास घेण्यास त्रास' },
    attributes: ['presence', 'status', 'onset', 'duration', 'severity', 'orthopnea'],
  },
  'symptom.breathing': {
    code: 'symptom.breathing',
    category: 'symptom',
    labels: { en: 'Breathing Difficulty', hi: 'सांस लेने में तकलीफ', mr: 'श्वास घेण्यास त्रास' },
    attributes: ['presence', 'status', 'onset', 'duration', 'severity', 'orthopnea'],
  },
  'symptom.sweating': {
    code: 'symptom.sweating',
    category: 'symptom',
    labels: { en: 'Sweating / Diaphoresis', hi: 'पसीना आना', mr: 'घाम येणे' },
    attributes: ['presence', 'status', 'severity', 'coldSweat'],
  },
  'symptom.headache': {
    code: 'symptom.headache',
    category: 'symptom',
    labels: { en: 'Headache', hi: 'सिरदर्द', mr: 'डोकेदुखी' },
    attributes: ['presence', 'status', 'location', 'duration', 'severity', 'visualChanges'],
  },
  'clinical.duration': {
    code: 'clinical.duration',
    category: 'metadata',
    labels: { en: 'Duration', hi: 'अवधि', mr: 'कालावधी' },
    attributes: ['value', 'duration', 'unit', 'precision', 'raw'],
  },
  'clinical.severity': {
    code: 'clinical.severity',
    category: 'metadata',
    labels: { en: 'Severity', hi: 'तीव्रता', mr: 'तीव्रता' },
    attributes: ['value', 'severity', 'level'],
  },

  // Medical History
  'history.past_condition': {
    code: 'history.past_condition',
    category: 'history',
    labels: { en: 'Past Medical Condition', hi: 'पिछली बीमारियां', mr: 'मागील आजार' },
    attributes: ['presence', 'status', 'conditions'],
  },
  'history.medication': {
    code: 'history.medication',
    category: 'history',
    labels: { en: 'Active Medications', hi: 'चल रही दवाइयां', mr: 'सध्या चालू असलेली औषधे' },
    attributes: ['presence', 'status', 'medications'],
  },
  'history.allergy': {
    code: 'history.allergy',
    category: 'history',
    labels: { en: 'Allergies', hi: 'एलर्जी', mr: 'अ‍ॅलर्जी' },
    attributes: ['presence', 'status', 'allergies'],
  },
};
