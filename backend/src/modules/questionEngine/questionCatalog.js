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

  // ----------------------------------------------------
  // AYUSH HISTORY MODE: DASHAVIDHA PARIKSHA (Phase 9)
  // ----------------------------------------------------
  {
    id: 'q.ayush.prakriti',
    concept: 'ayush.dashavidha',
    attribute: 'prakriti',
    inputType: 'single-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'Which of these best describes your natural body tendencies from youth?',
      hi: 'बचपन या सामान्य दिनों में आपकी स्वाभाविक शारीरिक प्रवृत्ति कैसी रही है?',
      mr: 'लहानपणापासून किंवा सामान्यतः तुमची नैसर्गिक शारीरिक प्रवृत्ती कशी राहिलेली आहे?',
    },
    helpText: {
      en: 'Select your general natural constitution tendencies (Prakriti assessment).',
      hi: 'अपनी स्वाभाविक शारीरिक बनावट व प्रवृत्ति का चयन करें।',
      mr: 'तुमच्या मूळ शारीरिक प्रवृत्तीनुसार योग्य पर्याय निवडा.',
    },
    options: [
      { value: 'vata_dominant', labels: { en: 'Lean build, dry skin, sensitive to cold', hi: 'पतला शरीर, रूखी त्वचा, ठंड बर्दाश्त न होना', mr: 'बारीक अंगकाठी, कोरडी त्वचा, थंडी न सहन होणे' }, icon: '💨' },
      { value: 'pitta_dominant', labels: { en: 'Medium build, warm body, sensitive to heat & spicy food', hi: 'मध्यम शरीर, गर्म शरीर, गर्मी व तीखा न सुहाना', mr: 'मध्यम अंगकाठी, गरम प्रकृती, उष्णता व तिखट न सोसणे' }, icon: '🔥' },
      { value: 'kapha_dominant', labels: { en: 'Broad sturdy build, calm temperament, slow digestion', hi: 'मजबूत चौड़ा शरीर, शांत स्वभाव, सुस्त पाचन', mr: 'भक्कम अंगकाठी, शांत स्वभाव, पचन संथ असणे' }, icon: '🌊' },
      { value: 'mixed', labels: { en: 'Combination of above tendencies', hi: 'ऊपर दी गई प्रवृत्तियों का मिश्रण', mr: 'वरील लक्षणांचे मिश्रण' }, icon: '⚖️' },
      { value: 'unknown', labels: { en: 'Not sure / To be assessed by doctor', hi: 'पक्का नहीं पता / डॉक्टर द्वारा जांच', mr: 'नक्की सांगता येत नाही / डॉक्टरांनी तपासावे' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.vikriti',
    concept: 'ayush.dashavidha',
    attribute: 'vikriti',
    inputType: 'single-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'What kind of bodily disturbance or aggravation do you currently feel most?',
      hi: 'वर्तमान में आपको किस तरह की परेशानी या शारीरिक असंतुलन सबसे ज्यादा महसूस होता है?',
      mr: 'सध्या तुम्हाला शरीरात कोणत्या प्रकारचा त्रास किंवा असंतुलन सर्वात जास्त जाणवतो?',
    },
    options: [
      { value: 'dryness_pain_stiffness', labels: { en: 'Joint stiffness, dryness, body aches', hi: 'जोड़ों में अकड़न, रूखापन, शरीर में दर्द', mr: 'सांधेदुखी, ताठरपणा, अंगात कोरडेपणा' }, icon: '🦴' },
      { value: 'burning_heat_acidity', labels: { en: 'Burning sensation, acidity, excess body heat', hi: 'जलन, एसिडिटी/खट्टी डकारें, शरीर में ज्यादा गर्मी', mr: 'जळजळ, पित्त/आंबट ढेकर, अंग गरम पडणे' }, icon: '🔥' },
      { value: 'heaviness_lethargy_mucus', labels: { en: 'Heaviness, sluggishness, congestion/cold', hi: 'भारीपन, सुस्ती, कफ या जकड़न', mr: 'जडपणा, आळस, छातीत कफ किंवा जड वाटणे' }, icon: '💧' },
      { value: 'none_balanced', labels: { en: 'None of these / Chief complaint only', hi: 'इनमें से कोई नहीं / केवल मुख्य तकलीफ', mr: 'यापैकी काही नाही / केवळ मुख्य त्रास' }, icon: '✨' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.sara',
    concept: 'ayush.dashavidha',
    attribute: 'sara',
    inputType: 'single-choice',
    required: false,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How would you describe your overall physical strength and vitality (Sara)?',
      hi: 'आपकी सामान्य शारीरिक शक्ति और अंदरूनी ऊर्जा (सार) कैसी है?',
      mr: 'तुमची सर्वसाधारण शारीरिक ताकद आणि उत्साह (सार) कसा आहे?',
    },
    options: [
      { value: 'pravara', labels: { en: 'High vitality & strong resilience (Pravara)', hi: 'उत्कृष्ट शक्ति और अच्छी ऊर्जा (प्रवर)', mr: 'उत्तम ताकद आणि भरपूर ऊर्जा (प्रवर)' }, icon: '💪' },
      { value: 'madhyama', labels: { en: 'Moderate stamina and strength (Madhyama)', hi: 'मध्यम शक्ति और ऊर्जा (मध्यम)', mr: 'मध्यम ताकद आणि सहनशक्ती (मध्यम)' }, icon: '🚶' },
      { value: 'avara', labels: { en: 'Low energy, fatigues very quickly (Avara)', hi: 'कमजोरी, बहुत जल्दी थकान होना (अवर)', mr: 'कमी ताकद, खूप लवकर थकवा येणे (अवर)' }, icon: '🛋️' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.samhanana',
    concept: 'ayush.dashavidha',
    attribute: 'samhanana',
    inputType: 'single-choice',
    required: false,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How is your body build and firmness of joints and muscles (Samhanana)?',
      hi: 'आपके शरीर की बनावट और मांसपेशियों/जोड़ों की दृढ़ता (संहनन) कैसी है?',
      mr: 'तुमच्या शरीराची बांधणी आणि सांधे-स्नायूंचा भक्कमपणा (संहनन) कसा आहे?',
    },
    options: [
      { value: 'su_samhata', labels: { en: 'Compact, well-knit & symmetrical frame', hi: 'सुगठित, मजबूत और सुडौल शरीर (सुसंहत)', mr: 'सुदृढ, भरदार आणि प्रमाणबद्ध शरीर (सुसंहत)' }, icon: '🛡️' },
      { value: 'madhyama', labels: { en: 'Moderate muscular build', hi: 'सामान्य व मध्यम बनावट (मध्यम)', mr: 'सर्वसामान्य मध्यम बांधा (मध्यम)' }, icon: '🧍' },
      { value: 'heena_samhata', labels: { en: 'Loose, slender or delicate joint structure', hi: 'ढीला, दुबला या कमजोर जोड़ (हीन संहत)', mr: 'बारीक, सैल किंवा अशक्त सांधे (हीन संहत)' }, icon: '🌱' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.pramana',
    concept: 'ayush.dashavidha',
    attribute: 'pramana',
    inputType: 'single-choice',
    required: false,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How are your body height and weight proportions (Pramana)?',
      hi: 'आपकी कद-काठी और वजन का अनुपात (प्रमाण) कैसा है?',
      mr: 'तुमची उंची आणि वजनाचे प्रमाण (प्रमाण) कसे आहे?',
    },
    options: [
      { value: 'pramanyukta', labels: { en: 'Well-proportioned height and weight', hi: 'ऊंचाई और वजन का संतुलित अनुपात (प्रमाणयुक्त)', mr: 'उंची आणि वजनाचा योग्य तोल (प्रमाणयुक्त)' }, icon: '⚖️' },
      { value: 'ati_sthaula', labels: { en: 'Heavy build / overweight for height', hi: 'वजन अधिक या भारी शरीर (स्थूल)', mr: 'वजन जास्त किंवा स्थूल शरीर (स्थूल)' }, icon: '➕' },
      { value: 'ati_krisha', labels: { en: 'Very lean / underweight for height', hi: 'काफी दुबला या कम वजन (कृश)', mr: 'खूप बारीक किंवा कमी वजन (कृश)' }, icon: '➖' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.satmya',
    concept: 'ayush.dashavidha',
    attribute: 'satmya',
    inputType: 'single-choice',
    required: false,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How easily does your body tolerate changing food and weather (Satmya)?',
      hi: 'आपका शरीर बदले हुए खान-पान और मौसम के बदलाव को कितनी आसानी से सह लेता है (सात्म्य)?',
      mr: 'तुमचे शरीर बदललेले अन्न आणि ऋतू-हवामानातील बदल किती सहजतेने सहन करते (सात्म्य)?',
    },
    options: [
      { value: 'sarva_satmya', labels: { en: 'Easily adapts to all climates and foods (Sarva-satmya)', hi: 'हर तरह का खाना व मौसम आसानी से सध जाता है (सर्वसात्म्य)', mr: 'सर्व प्रकारचे अन्न व हवामान सहज सोसते (सर्वसात्म्य)' }, icon: '🌍' },
      { value: 'madhyama', labels: { en: 'Moderately adaptable (Madhyama Satmya)', hi: 'मध्यम अनुकूलन (मध्यम सात्म्य)', mr: 'मध्यम प्रमाणात सहन होते (मध्यम सात्म्य)' }, icon: '⛅' },
      { value: 'heena_satmya', labels: { en: 'Very sensitive to cold, heat or food shifts', hi: 'जरा सा मौसम या भोजन बदलने पर तुरंत अस्वस्थ होना (अवर)', mr: 'हवामान किंवा अन्न बदलताच लगेच त्रास होणे (अवर)' }, icon: '⚠️' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.sattva',
    concept: 'ayush.dashavidha',
    attribute: 'sattva',
    inputType: 'single-choice',
    required: false,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How do you typically cope with mental stress, pain, or difficulty (Sattva)?',
      hi: 'मानसिक तनाव, दर्द या कठिन परिस्थितियों में आपका मन कैसा रहता है (सत्व)?',
      mr: 'मानसिक ताण, वेदना किंवा संकटाच्या वेळी तुमचे मन कसे राहते (सत्व)?',
    },
    options: [
      { value: 'pravara', labels: { en: 'Calm, patient and mentally resilient (Pravara)', hi: 'धैर्यवान, शांत और मानसिक रूप से मजबूत (प्रवर सत्व)', mr: 'शांत, संयमी आणि मानसिकदृष्ट्या खंबीर (प्रवर सत्व)' }, icon: '🧘' },
      { value: 'madhyama', labels: { en: 'Manages with effort and family support (Madhyama)', hi: 'सहारे और समझ से संभाल लेते हैं (मध्यम सत्व)', mr: 'धीर धरून परिस्थिती हाताळता येते (मध्यम सत्व)' }, icon: '🤝' },
      { value: 'avara', labels: { en: 'Easily fearful, anxious or overwhelmed (Avara)', hi: 'बहुत जल्दी घबरा जाना या डर लगना (अवर सत्व)', mr: 'लगेच घाबरणे किंवा अस्वस्थ होणे (अवर सत्व)' }, icon: '😟' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.ahara_shakti',
    concept: 'ayush.dashavidha',
    attribute: 'ahara_shakti',
    inputType: 'single-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How would you describe your appetite and digestive power (Ahara Shakti)?',
      hi: 'आपकी भूख और भोजन पचाने की क्षमता (आहार शक्ति) कैसी है?',
      mr: 'तुमची भूक आणि अन्न पचनाची ताकद (आहार शक्ती) कशी आहे?',
    },
    options: [
      { value: 'tikshnagni', labels: { en: 'Strong appetite, digests heavy food quickly (Tikshnagni)', hi: 'तेज भूख, जल्दी और अच्छी तरह पचना (तीक्ष्णाग्नि)', mr: 'कडक भूक, जड अन्नही लवकर पचणे (तीक्ष्णाग्नि)' }, icon: '🔥' },
      { value: 'samagni', labels: { en: 'Balanced appetite and comfortable digestion (Samagni)', hi: 'संतुलित भूख और सामान्य पाचन (समाग्नि)', mr: 'वेळेवर भूक आणि व्यवस्थित पचन (समाग्नि)' }, icon: '🥗' },
      { value: 'vishamagni', labels: { en: 'Irregular appetite, frequent gas or bloating (Vishamagni)', hi: 'अनियमित भूख, गैस या पेट फूलना (विषमाग्नि)', mr: 'कधी जास्त कधी कमी भूक, गॅसेस होणे (विषमाग्नि)' }, icon: '💨' },
      { value: 'mandagni', labels: { en: 'Poor appetite, sluggish digestion, heaviness (Mandagni)', hi: 'कम भूख, भारीपन और देर से पचना (मंदाग्नि)', mr: 'कमी भूक, अन्न न पचणे, पोट जड वाटणे (मंदाग्नि)' }, icon: '⏳' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.vyayama_shakti',
    concept: 'ayush.dashavidha',
    attribute: 'vyayama_shakti',
    inputType: 'single-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How much physical exertion or manual work can you comfortably do (Vyayama Shakti)?',
      hi: 'आप कितना शारीरिक श्रम, व्यायाम या मेहनत बिना थके कर पाते हैं (व्यायाम शक्ति)?',
      mr: 'तुम्ही न थकता किती शारीरिक कष्ट, व्यायाम किंवा हालचाल करू शकता (व्यायाम शक्ती)?',
    },
    options: [
      { value: 'pravara', labels: { en: 'High stamina, can do heavy exertion without quick fatigue', hi: 'भारी मेहनत या कसरत बिना जल्दी थके कर सकते हैं (प्रवर)', mr: 'खूप मेहनत किंवा व्यायाम सहज करू शकता (प्रवर)' }, icon: '🏃' },
      { value: 'madhyama', labels: { en: 'Can do routine daily work and moderate walking', hi: 'दैनिक घरेलू काम व सामान्य चलना-फिरना (मध्यम)', mr: 'दैनंदिन घरकाम व सामान्य चालणे व्यवस्थित होते (मध्यम)' }, icon: '🚶' },
      { value: 'avara', labels: { en: 'Gets exhausted or breathless with minor exertion', hi: 'हल्की सी मेहनत से भी सांस फूलना या थक जाना (अवर)', mr: 'थोडासाही ताण आला तरी खूप दम लागणे किंवा थकणे (अवर)' }, icon: '🛋️' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.vaya',
    concept: 'ayush.dashavidha',
    attribute: 'vaya',
    inputType: 'single-choice',
    required: false,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'What is your current stage of life (Vaya)?',
      hi: 'आपकी आयु का वर्तमान चरण कौन सा है (वय)?',
      mr: 'तुमचा सध्याचा वयोगट कोणता आहे (वय)?',
    },
    options: [
      { value: 'bala', labels: { en: 'Child / Growing youth (up to 16 years)', hi: 'बाल्यावस्था (16 वर्ष तक)', mr: 'बाल किंवा वाढते वय (१६ वर्षांपर्यंत)' }, icon: '🧒' },
      { value: 'madhyama', labels: { en: 'Adult / Working age (16 to 60 years)', hi: 'युवा / वयस्क (16 से 60 वर्ष)', mr: 'तरुण / प्रौढ वय (१६ ते ६० वर्षे)' }, icon: '🧑' },
      { value: 'vriddha', labels: { en: 'Senior / Elderly (above 60 years)', hi: 'वृद्धावस्था (60 वर्ष से अधिक)', mr: 'ज्येष्ठ नागरिक / वृद्ध (६० वर्षांपेक्षा जास्त)' }, icon: '🧓' },
      { value: 'unknown', labels: { en: 'Not specified', hi: 'उल्लेख नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  // ----------------------------------------------------
  // AYUSH HISTORY MODE: AHARA-VIHARA (Phase 9)
  // ----------------------------------------------------
  {
    id: 'q.ayush.ahara_diet',
    concept: 'ayush.ahara_vihara',
    attribute: 'diet_pattern',
    inputType: 'single-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'What best describes your regular daily diet pattern (Ahara)?',
      hi: 'आपका दैनिक खान-पान मुख्य रूप से किस प्रकार का रहता है (आहार)?',
      mr: 'तुमचा दैनंदिन आहार प्रामुख्याने कोणत्या प्रकारचा असतो (आहार)?',
    },
    options: [
      { value: 'vegetarian_fresh', labels: { en: 'Freshly cooked vegetarian food at regular times', hi: 'समय पर ताजा बना शाकाहारी भोजन', mr: 'वेळेवर ताजे शिजवलेले शाकाहारी जेवण' }, icon: '🍲' },
      { value: 'mixed_nonveg', labels: { en: 'Mixed diet including non-vegetarian foods', hi: 'शाकाहारी और मांसाहारी दोनों', mr: 'शाकाहारी व मांसाहारी मिश्रित आहार' }, icon: '🍗' },
      { value: 'spicy_oily_outside', labels: { en: 'Frequent spicy, oily or street/outside food', hi: 'ज्यादा तला-भुना, तीखा या बाहर का खाना', mr: 'जास्त तेलकट, तिखट किंवा बाहेरचे खाणे' }, icon: '🌶️' },
      { value: 'irregular_fasting', labels: { en: 'Irregular eating hours / frequent fasting', hi: 'भोजन का कोई निश्चित समय नहीं / बार-बार उपवास', mr: 'जेवणाची अनिश्चित वेळ / वारंवार उपास' }, icon: '⏰' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.ahara_bowel',
    concept: 'ayush.ahara_vihara',
    attribute: 'bowel_pattern',
    inputType: 'single-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How are your daily bowel movements and digestion (Koshtha)?',
      hi: 'आपका पेट साफ होने (शौच) की आदत कैसी है (कोष्ठ)?',
      mr: 'तुमचे पोट साफ होण्याची (शौचाची) सवय कशी आहे (कोष्ठ)?',
    },
    options: [
      { value: 'regular_clear', labels: { en: 'Clear & comfortable once or twice daily', hi: 'रोज नियमित और आसानी से साफ होना', mr: 'दररोज वेळेवर आणि व्यवस्थित पोट साफ होणे' }, icon: '✅' },
      { value: 'constipated_hard', labels: { en: 'Hard stools, sluggish or constipated (Krura Koshtha)', hi: 'कब्ज, सख्त मल या 2-3 दिन में एक बार (क्रूर कोष्ठ)', mr: 'बद्धकोष्ठता, खडा होणे किंवा २-३ दिवसांतून एकदा (क्रूर कोष्ठ)' }, icon: '🧱' },
      { value: 'loose_frequent', labels: { en: 'Frequent, soft or loose stools (Mridu Koshtha)', hi: 'जल्दी-जल्दी या ढीला मल आना (मृदु कोष्ठ)', mr: 'वारंवार किंवा पातळ शौचास होणे (मृदू कोष्ठ)' }, icon: '💧' },
      { value: 'variable_irregular', labels: { en: 'Irregular, unpredictable from day to day', hi: 'अनियमित, कभी सख्त तो कभी ढीला', mr: 'अनियमित, कधी घट्ट तर कधी सैल' }, icon: '🔄' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.vihara_sleep',
    concept: 'ayush.ahara_vihara',
    attribute: 'sleep_pattern',
    inputType: 'single-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'How is your regular sleep quality and routine (Nidra)?',
      hi: 'आपकी नींद और विश्राम की दिनचर्या कैसी रहती है (निद्रा)?',
      mr: 'तुमची झोप आणि विश्रांतीची दिनचर्या कशी असते (निद्रा)?',
    },
    options: [
      { value: 'sound_restful', labels: { en: 'Sound, restful sleep 6 to 8 hours daily', hi: '6 से 8 घंटे की गहरी और आरामदायक नींद', mr: 'दररोज ६ ते ८ तासांची शांत आणि गाढ झोप' }, icon: '😴' },
      { value: 'disturbed_insomnia', labels: { en: 'Difficulty falling asleep / disturbed waking', hi: 'नींद न आना या बार-बार खुलना', mr: 'झोप न येणे किंवा वारंवार जाग येणे' }, icon: '👁️' },
      { value: 'excess_daytime', labels: { en: 'Excessive sleep / feeling sleepy during the day', hi: 'दिन में ज्यादा नींद आना या भारीपन', mr: 'दिवसा झोप येणे किंवा सुस्ती वाटणे' }, icon: '🥱' },
      { value: 'irregular_shifts', labels: { en: 'Irregular night shifts / disrupted sleep cycle', hi: 'नाईट शिफ्ट या अनियमित सोने का समय', mr: 'रात्रपाळी किंवा झोपेची अनियमित वेळ' }, icon: '🌙' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },

  {
    id: 'q.ayush.vihara_activity',
    concept: 'ayush.ahara_vihara',
    attribute: 'activity_pattern',
    inputType: 'single-choice',
    required: true,
    priority: 'normal',
    allowVoice: true,
    allowTouch: true,
    text: {
      en: 'What is your typical daily physical activity and work style (Vihara)?',
      hi: 'आपकी दिनभर की शारीरिक गतिविधि और काम का ढंग कैसा है (विहार)?',
      mr: 'तुमची दिवसभरातील शारीरिक हालचाल आणि कामाचे स्वरूप कसे आहे (विहार)?',
    },
    options: [
      { value: 'moderate_active', labels: { en: 'Moderate physical movement, regular walking/work', hi: 'मध्यम सक्रिय, चलना-फिरना और नियमित काम', mr: 'मध्यम हालचाल, नियमित चालणे आणि दैनंदिन कामे' }, icon: '🚶' },
      { value: 'sedentary_desk', labels: { en: 'Mostly sitting / desk job with little movement', hi: 'ज्यादातर बैठकर काम / कम चलना-फिरना', mr: 'जास्त वेळ बसून काम / हालचाल कमी' }, icon: '🪑' },
      { value: 'heavy_manual', labels: { en: 'Heavy physical labor / standing for long hours', hi: 'कठिन शारीरिक मेहनत या देर तक खड़े रहना', mr: 'कष्टाचे शारीरिक काम किंवा जास्त वेळ उभे राहणे' }, icon: '🏋️' },
      { value: 'strenuous_irregular', labels: { en: 'Erratic routine with frequent long travel', hi: 'अनियमित दिनचर्या और बार-बार लंबा सफर', mr: 'अनियमित धावपळ आणि वारंवार लांबचा प्रवास' }, icon: '🚗' },
      { value: 'unknown', labels: { en: 'Not sure', hi: 'पता नहीं', mr: 'माहित नाही' }, icon: '❓' },
    ],
  },
];

export function getQuestionById(id) {
  return QUESTION_CATALOG.find((q) => q.id === id) || null;
}
