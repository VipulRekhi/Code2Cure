/**
 * Schema-Driven Question Catalog (Section 8, 9, 10, 28, 29, 30, 31)
 * Multilingual questions with stable IDs across English, Hindi, and Marathi.
 */

export const QUESTION_CATALOG = [
  // 1. Initial Chief Complaint
  {
    id: 'q.chief_complaint',
    concept: 'symptom.pain',
    attribute: 'complaint_type',
    inputType: 'single-choice',
    required: true,
    priority: 'critical',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'What is your primary health concern today?',
      hi: 'आज आपको मुख्य रूप से क्या समस्या है?',
      mr: 'आज तुम्हाला प्रामुख्याने काय त्रास होत आहे?',
    },
    helpText: {
      en: 'Select your most important symptom or tap microphone to speak.',
      hi: 'अपना मुख्य लक्षण चुनें या बोलने के लिए माइक दबाएं।',
      mr: 'आपले मुख्य लक्षण निवडा किंवा बोलण्यासाठी माइक दाबा.',
    },
    options: [
      { value: 'pain', labels: { en: 'Pain or Discomfort', hi: 'दर्द या बेचैनी', mr: 'वेदना किंवा अस्वस्थता' }, icon: '🫀' },
      { value: 'knee_pain', labels: { en: 'Knee Pain / Joint', hi: 'घुटने में दर्द', mr: 'गुडघेदुखी / सांधेदुखी' }, icon: '🦵' },
      { value: 'diarrhea', labels: { en: 'Diarrhea / Loose Stools', hi: 'दस्त / पेट खराब', mr: 'जुलाब / संडास' }, icon: '💩' },
      { value: 'fever', labels: { en: 'Fever / High Temperature', hi: 'बुखार / तापमान', mr: 'ताप / अंग गरम असणे' }, icon: '🤒' },
      { value: 'cough', labels: { en: 'Cough / Cold', hi: 'खांसी / जुकाम', mr: 'खोकला / सर्दी' }, icon: '🤧' },
      { value: 'breathing', labels: { en: 'Breathing Difficulty', hi: 'सांस फूलना / सांस लेने में तकलीफ', mr: 'श्वास घेण्यास त्रास' }, icon: '😮‍💨' },
      { value: 'headache', labels: { en: 'Severe Headache', hi: 'तेज सिरदर्द', mr: 'तीव्र डोकेदुखी' }, icon: '🤕' },
      { value: 'stomach', labels: { en: 'Stomach Ache / Vomiting', hi: 'पेट दर्द / उल्टी', mr: 'पोटदुखी / उलटी' }, icon: '🤢' },
    ],
  },

  // ----------------------------------------------------
  // PAIN PATHWAY (Section 31)
  // ----------------------------------------------------
  {
    id: 'q.pain.location',
    concept: 'symptom.pain',
    attribute: 'location',
    inputType: 'single-choice',
    required: true,
    priority: 'critical',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'Where is the pain located?',
      hi: 'दर्द किस जगह पर हो रहा है?',
      mr: 'वेदना शरीराच्या कोणत्या भागात होत आहे?',
    },
    options: [
      { value: 'chest', labels: { en: 'Chest / Ribs', hi: 'सीना / छाती', mr: 'छाती' }, icon: '🫀' },
      { value: 'abdomen', labels: { en: 'Stomach / Abdomen', hi: 'पेट', mr: 'पोट' }, icon: '🤰' },
      { value: 'head', labels: { en: 'Head / Forehead', hi: 'सिर / माथा', mr: 'डोके / कपाळ' }, icon: '🤕' },
      { value: 'back', labels: { en: 'Back / Spine', hi: 'पीठ / रीढ़', mr: 'पाठ / कणा' }, icon: '🦴' },
      { value: 'knee', labels: { en: 'Knee / Leg / Joint', hi: 'घुटना / पैर / जोड़', mr: 'गुडघा / पाय / सांधे' }, icon: '🦵' },
      { value: 'unknown', labels: { en: "I'm not sure / All over", hi: 'पक्का नहीं पता / पूरे शरीर में', mr: 'नक्की सांगता येत नाही / संपूर्ण अंग' }, icon: '❓' },
    ],
  },

  {
    id: 'q.pain.duration',
    concept: 'symptom.pain',
    attribute: 'duration',
    inputType: 'duration',
    required: true,
    priority: 'high',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How long have you had this pain?',
      hi: 'यह दर्द आपको कितने समय से है?',
      mr: 'ही वेदना तुम्हाला कधीपासून सुरू झाली आहे?',
    },
    options: [
      { value: { amount: 1, unit: 'days' }, labels: { en: 'Started today', hi: 'आज से', mr: 'आजपासून' }, icon: '⏱️' },
      { value: { amount: 2, unit: 'days' }, labels: { en: 'Since yesterday (1-2 days)', hi: 'कल से (1-2 दिन)', mr: 'कालपासून (१-२ दिवस)' }, icon: '📅' },
      { value: { amount: 3, unit: 'days' }, labels: { en: '3 to 5 days', hi: '3 से 5 दिन', mr: '३ ते ५ दिवस' }, icon: '📆' },
      { value: { amount: 7, unit: 'days' }, labels: { en: 'More than a week', hi: 'एक सप्ताह से अधिक', mr: 'एक आठवड्यापेक्षा जास्त' }, icon: '🗓️' },
      { value: { amount: 30, unit: 'days' }, labels: { en: 'More than a month', hi: 'एक महीने से अधिक', mr: 'एक महिन्यापेक्षा जास्त' }, icon: '⏳' },
    ],
  },

  {
    id: 'q.pain.severity',
    concept: 'symptom.pain',
    attribute: 'severity',
    inputType: 'scale',
    required: true,
    priority: 'high',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How severe is the pain?',
      hi: 'दर्द कितना तेज है?',
      mr: 'वेदना किती तीव्र आहे?',
    },
    options: [
      { value: 'MILD', labels: { en: 'Mild (Noticeable but easily manageable)', hi: 'हल्का (सहन करने योग्य)', mr: 'कमी (सहन होण्याजोगी)' }, icon: '🙂' },
      { value: 'MODERATE', labels: { en: 'Moderate (Disturbs normal daily work)', hi: 'मध्यम (काम में रुकावट)', mr: 'मध्यम (कामात अडचण)' }, icon: '😐' },
      { value: 'SEVERE', labels: { en: 'Severe (Cannot do any normal work)', hi: 'तेज (काम करना असंभव)', mr: 'तीव्र (काम करणे अशक्य)' }, icon: '😣' },
      { value: 'UNBEARABLE', labels: { en: 'Unbearable (Worst pain imaginable)', hi: 'असहनीय (बहुत ज्यादा दर्द)', mr: 'असह्य (अतिशय जास्त वेदना)' }, icon: '😫' },
    ],
  },

  {
    id: 'q.pain.character',
    concept: 'symptom.pain',
    attribute: 'character',
    inputType: 'single-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How would you describe the feeling of the pain?',
      hi: 'दर्द किस तरह का महसूस होता है?',
      mr: 'वेदनांचे स्वरूप कसे आहे?',
    },
    options: [
      { value: 'PRESSURE', labels: { en: 'Heavy pressure or tightness', hi: 'भारी दबाव या जकड़न', mr: 'जड दाब किंवा आवळल्यासारखे' }, icon: '🪨' },
      { value: 'SHARP', labels: { en: 'Sharp, piercing, or stabbing', hi: 'तेज या चुभने जैसा', mr: 'तीक्ष्ण किंवा सुई टोचल्यासारखे' }, icon: '⚡' },
      { value: 'BURNING', labels: { en: 'Burning or acidity-like', hi: 'जलन या एसिडिटी जैसा', mr: 'जळजळ किंवा पित्तासारखे' }, icon: '🔥' },
      { value: 'DULL', labels: { en: 'Constant dull aching', hi: 'लगातार बना रहने वाला हल्का दर्द', mr: 'सतत राहणारे हलके दुखणे' }, icon: '〰️' },
      { value: 'unknown', labels: { en: "I can't describe it", hi: 'बता नहीं सकते', mr: 'सांगता येत नाही' }, icon: '❓' },
    ],
  },

  // CONDITIONAL: Only if pain.location == 'chest'
  {
    id: 'q.pain.radiation',
    concept: 'symptom.pain.chest',
    attribute: 'radiation',
    inputType: 'single-choice',
    required: true,
    priority: 'high',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'Does the chest pain spread or move anywhere?',
      hi: 'क्या यह दर्द कहीं और फैलता है?',
      mr: 'छातीतील वेदना इतर कुठे पसरतात का?',
    },
    options: [
      { value: 'LEFT_ARM', labels: { en: 'Spreads to Left Arm or Shoulder', hi: 'बाएं हाथ या कंधे में जाता है', mr: 'डाव्या हाताकडे किंवा खांद्याकडे जाते' }, icon: '💪' },
      { value: 'JAW_NECK', labels: { en: 'Spreads to Jaw or Neck', hi: 'जबड़े या गर्दन की तरफ', mr: 'हनुवटी किंवा मानेकडे' }, icon: '🗣️' },
      { value: 'BACK', labels: { en: 'Spreads straight through to the Back', hi: 'पीठ के बीच में जाता है', mr: 'पाठीच्या मध्यभागी' }, icon: '🔙' },
      { value: 'NONE', labels: { en: 'Stays strictly in the chest (No radiation)', hi: 'कहीं नहीं फैलता (केवल सीने में)', mr: 'कुठेही पसरत नाही (फक्त छातीत)' }, icon: '🚫' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पक्का नहीं पता', mr: 'नक्की माहिती नाही' }, icon: '❓' },
    ],
  },

  // CONDITIONAL: Only if pain.location == 'chest'
  {
    id: 'q.pain.dyspnea',
    concept: 'symptom.pain.chest',
    attribute: 'dyspnea',
    inputType: 'yes-no',
    required: true,
    priority: 'high',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'Are you experiencing any shortness of breath or breathing difficulty?',
      hi: 'क्या आपको सांस लेने में कोई तकलीफ या सांस फूलना महसूस हो रहा है?',
      mr: 'तुम्हाला श्वास घेण्यास त्रास किंवा दम लागल्यासारखे होत आहे का?',
    },
    options: [
      { value: 'yes', labels: { en: 'Yes, having trouble breathing', hi: 'हां, सांस लेने में तकलीफ है', mr: 'होय, श्वास घेण्यास त्रास आहे' }, icon: '⚠️' },
      { value: 'no', labels: { en: 'No, breathing is normal', hi: 'नहीं, सांस सामान्य है', mr: 'नाही, श्वास सामान्य आहे' }, icon: '✓' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पक्का नहीं पता', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  // CONDITIONAL: Only if pain.location == 'chest'
  {
    id: 'q.pain.sweating',
    concept: 'symptom.pain.chest',
    attribute: 'sweating',
    inputType: 'yes-no',
    required: false,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'Have you noticed any cold sweating or dizziness?',
      hi: 'क्या आपको ठंडा पसीना या चक्कर आ रहा है?',
      mr: 'तुम्हाला थंड घाम येणे किंवा चक्कर आल्यासारखे होत आहे का?',
    },
    options: [
      { value: 'yes', labels: { en: 'Yes, experiencing sweating or dizziness', hi: 'हां, पसीना या चक्कर है', mr: 'होय, घाम किंवा चक्कर आहे' }, icon: '💧' },
      { value: 'no', labels: { en: 'No', hi: 'नहीं', mr: 'नाही' }, icon: '✓' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पक्का नहीं पता', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  // ----------------------------------------------------
  // FEVER PATHWAY
  // ----------------------------------------------------
  {
    id: 'q.fever.duration',
    concept: 'symptom.fever',
    attribute: 'duration',
    inputType: 'duration',
    required: true,
    priority: 'critical',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How many days have you had a fever?',
      hi: 'आपको कितने दिनों से बुखार है?',
      mr: 'तुम्हाला किती दिवसांपासून ताप येत आहे?',
    },
    options: [
      { value: { amount: 1, unit: 'days' }, labels: { en: 'Since today', hi: 'आज से', mr: 'आजपासून' }, icon: '⏱️' },
      { value: { amount: 3, unit: 'days' }, labels: { en: '2 to 3 days', hi: '2 से 3 दिन', mr: '२ ते ३ दिवस' }, icon: '📆' },
      { value: { amount: 7, unit: 'days' }, labels: { en: 'About 1 week', hi: 'लगभग 1 सप्ताह', mr: 'सुमारे १ आठवडा' }, icon: '🗓️' },
      { value: { amount: 14, unit: 'days' }, labels: { en: 'More than 2 weeks', hi: '2 सप्ताह से ज्यादा', mr: '२ आठवड्यांपेक्षा जास्त' }, icon: '⏳' },
    ],
  },

  {
    id: 'q.fever.pattern',
    concept: 'symptom.fever',
    attribute: 'pattern',
    inputType: 'single-choice',
    required: true,
    priority: 'high',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'What is the pattern of the fever?',
      hi: 'बुखार किस प्रकार से आता है?',
      mr: 'ताप कशा प्रकारे येतो?',
    },
    options: [
      { value: 'CONTINUOUS', labels: { en: 'Continuous all day long', hi: 'पूरे दिन लगातार रहता है', mr: 'दिवसभर सतत राहतो' }, icon: '🔥' },
      { value: 'CHILLS_RIGORS', labels: { en: 'Comes with severe shivering / chills', hi: 'ठंड और कंपकंपी के साथ आता है', mr: 'थंडी वाजून आणि हुडहुडी भरून येतो' }, icon: '🥶' },
      { value: 'EVENING_RISE', labels: { en: 'Rises mainly in the evening or night', hi: 'शाम या रात में बढ़ता है', mr: 'संध्याकाळी किंवा रात्री वाढतो' }, icon: '🌙' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पक्का नहीं पता', mr: 'नक्की सांगता येत नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.fever.associated',
    concept: 'symptom.fever',
    attribute: 'associated',
    inputType: 'multi-choice',
    required: false,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'Do you have any of these along with fever? (Select all that apply)',
      hi: 'बुखार के साथ इनमें से क्या लक्षण हैं? (जो भी हो चुनें)',
      mr: 'तापासोबत यांपैकी काही त्रास होतो आहे का? (लागू असलेले निवडा)',
    },
    options: [
      { value: 'cough', labels: { en: 'Cough or Sore Throat', hi: 'खांसी या गले में दर्द', mr: 'खोकला किंवा घसादुखी' }, icon: '🤧' },
      { value: 'burning_urine', labels: { en: 'Burning during urination', hi: 'पेशाब में जलन', mr: 'लघवी करताना जळजळ' }, icon: '🚽' },
      { value: 'severe_bodyache', labels: { en: 'Severe Joint or Body Ache', hi: 'शरीर या जोड़ों में तेज दर्द', mr: 'सांधे किंवा अंगदुखी' }, icon: '🦵' },
      { value: 'none', labels: { en: 'None of the above', hi: 'इनमें से कोई नहीं', mr: 'यांपैकी काहीही नाही' }, icon: '✓' },
    ],
  },

  // ----------------------------------------------------
  // GENERAL MEDICAL HISTORY (Asked for all pathways)
  // ----------------------------------------------------
  {
    id: 'q.history.conditions',
    concept: 'history.past_condition',
    attribute: 'conditions',
    inputType: 'multi-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'Do you have any ongoing medical conditions?',
      hi: 'क्या आपको पहले से इनमें से कोई बीमारी है?',
      mr: 'तुम्हाला आधीपासून यांपैकी काही आजार आहेत का?',
    },
    options: [
      { value: 'DIABETES', labels: { en: 'Diabetes (High Blood Sugar)', hi: 'मधुमेह (शुगर)', mr: 'मधुमेह (डायबेटिस)' }, icon: '🩸' },
      { value: 'HYPERTENSION', labels: { en: 'High Blood Pressure (BP)', hi: 'उच्च रक्तचाप (बीपी)', mr: 'उच्च रक्तदाब (बीपी)' }, icon: '🩺' },
      { value: 'HEART_DISEASE', labels: { en: 'Heart Condition / Previous Stent', hi: 'हार्ट की बीमारी', mr: 'हृदयाचा आजार' }, icon: '❤️' },
      { value: 'ASTHMA', labels: { en: 'Asthma / Respiratory issue', hi: 'अस्थमा / दमा', mr: 'दमा / अस्थमा' }, icon: '🫁' },
      { value: 'NONE', labels: { en: 'None / No known conditions', hi: 'कोई बीमारी नहीं है', mr: 'काहीही आजार नाही' }, icon: '✓' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पक्का नहीं पता', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.history.allergies',
    concept: 'history.allergy',
    attribute: 'allergies',
    inputType: 'single-choice',
    required: false,
    priority: 'optional',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'Do you have any known drug or medicine allergies?',
      hi: 'क्या आपको किसी दवा से एलर्जी है?',
      mr: 'तुम्हाला कोणत्याही औषधाची अ‍ॅलर्जी आहे का?',
    },
    options: [
      { value: 'YES_DRUG_ALLERGY', labels: { en: 'Yes, allergic to certain medicines', hi: 'हां, दवाओं से एलर्जी है', mr: 'होय, काही औषधांची अ‍ॅलर्जी आहे' }, icon: '⚠️' },
      { value: 'NO_ALLERGIES', labels: { en: 'No known allergies', hi: 'कोई एलर्जी नहीं है', mr: 'कोणतीही अ‍ॅलर्जी नाही' }, icon: '✓' },
      { value: 'unknown', labels: { en: 'Not sure / Prefer not to say', hi: 'पक्का नहीं पता', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },
];

export function getQuestionById(id) {
  return QUESTION_CATALOG.find((q) => q.id === id) || null;
}
