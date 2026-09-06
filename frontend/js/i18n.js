/**
 * MediKiosk Localization & Translations (Section 13)
 * Supports: English ('en'), Hindi ('hi'), Marathi ('mr')
 */

export const translations = {
  en: {
    // Brand & Global
    appName: "MediKiosk",
    tagline: "Smart Healthcare Intake",
    step: "Step",
    of: "of",
    help: "Help",
    back: "Back",
    next: "Next",
    continue: "Continue",
    start: "START",
    skip: "Skip this question",
    listen: "Listen to instructions",
    close: "Close",
    askStaff: "Ask for staff assistance",
    needHelp: "Need help?",
    understandingVoice: "Understanding your response...",
    notProvided: "Not provided",

    // Welcome Screen
    welcomeTitle: "Welcome to MediKiosk",
    welcomeSubtitle: "Let's collect your health information before your doctor consultation.",
    welcomeEstimate: "This takes about 2 to 3 minutes.",
    welcomeAudioPrompt: "Welcome to MediKiosk. Please tap START or choose your language to begin.",

    // Language Screen
    selectLanguage: "Choose your language",
    selectLanguageSub: "You can speak or tap in any of these languages",

    // Identification Screen
    identifyTitle: "How would you like to continue?",
    identifySubtitle: "Identify yourself to start case taking",
    haveAbha: "I have an ABHA ID",
    haveAbhaSub: "Fast track with Ayushman Bharat Health Account",
    newPatient: "I am a new patient",
    newPatientSub: "First time visiting this hospital",
    needAssist: "I need hospital staff assistance",
    needAssistSub: "A nurse or receptionist will assist you",
    demoPatientPrefill: "Use Demo Patient (Aarav Sharma)",

    // Consent Screen
    consentTitle: "Informed Patient Consent",
    consentSubtitle: "Please review how your health information will be used",
    consentPoint1: "We collect your symptoms and health history to help your doctor.",
    consentPoint2: "You can speak naturally or tap your answers on screen.",
    consentPoint3: "You can scan and add previous prescriptions or lab reports.",
    consentPoint4: "A licensed doctor will review and verify all details during your visit.",
    consentPoint5: "Your information is protected under the Digital Personal Data Protection (DPDP) Act.",
    consentAudioExplanation: "Listen to audio explanation of this consent",
    consentAgree: "I understand and consent",
    consentDecline: "I do not consent",

    // OPD Department Selection
    opdTitle: "What type of consultation are you here for?",
    opdSubtitle: "Choose your hospital department",
    opdGeneral: "General Medicine",
    opdGeneralSub: "Fever, cough, pain, body ache, blood pressure, diabetes",
    opdAyush: "Ayurvedic / AYUSH",
    opdAyushSub: "Prakriti assessment, classical Ayurvedic therapy, holistic care",
    opdOther: "Other Specialist",
    opdOtherSub: "Surgery, Orthopedics, Pediatrics, ENT, Eye",

    // Chief Complaint Screen
    complaintTitle: "What brings you to the hospital today?",
    complaintSubtitle: "Tap your primary concern or tap the microphone to speak naturally",
    speakAnswer: "Speak your answer",
    tapListening: "Listening... Please speak now",
    processingVoice: "Understanding your speech...",
    heardVoice: "I heard:",
    isThisCorrect: "Is this correct?",
    yesCorrect: "Yes, that's correct",
    tryAgain: "Try again",
    orChooseBelow: "OR choose below:",

    // Common Complaints
    cChestPain: "Chest Discomfort / Pain",
    cShoulderPain: "Shoulder Pain / Discomfort",
    cPain: "Pain / Discomfort",
    cKneePain: "Knee Pain / Discomfort",
    cDiarrhea: "Diarrhea / Loose Stools",
    cFever: "Fever / Chills",
    cCough: "Cough / Cold",
    cBreathing: "Breathing Problem",
    cHeadache: "Headache",
    cStomach: "Stomach Problem / Nausea",
    cMedication: "Prescription Renewal",
    cOther: "Something Else",

    // Questions in History
    qDurationTitle: "How long have you had this issue?",
    optToday: "Started Today",
    optYesterday: "Since Yesterday",
    optFewDays: "2 to 3 Days",
    optWeekPlus: "More than a Week",
    optMonthPlus: "More than a Month",

    qSeverityTitle: "How severe is your discomfort?",
    optMild: "Mild (Manageable)",
    optModerate: "Moderate (Affecting daily work)",
    optSevere: "Severe (Cannot do work)",
    optVerySevere: "Very Severe (Extreme emergency)",

    qNatureTitle: "How would you describe the feeling?",
    optPressure: "Pressure or Heaviness",
    optSharp: "Sharp or Stabbing",
    optBurning: "Burning or Acidity",
    optDull: "Dull or Constant Ache",

    // Document Upload Screen
    docQuestionTitle: "Do you have previous medical reports or prescriptions?",
    docQuestionSubtitle: "Adding past papers helps the doctor understand your medical history",
    haveDocsYes: "Yes, I have reports / prescriptions",
    haveDocsNo: "No, continue without reports",
    docUploadTitle: "Add a Medical Document",
    docUploadPrompt: "Tap to upload file or take photo from kiosk scanner",
    docSupportedTypes: "Prescriptions, Blood Tests, Discharge Summaries, X-Ray reports",
    docTypeQuestion: "What type of document is this?",
    typePrescription: "Prescription",
    typeLabReport: "Lab / Blood Report",
    typeDischarge: "Discharge Summary",
    typeOther: "Other Report",
    useDocument: "Use this document",
    retakeDocument: "Retake / Choose another",
    analyzingDoc: "Analyzing your document...",
    readingDoc: "Reading document text",
    extractingDoc: "Extracting medicines & tests",
    organizingDoc: "Organizing for doctor review",

    // Review Screen
    reviewTitle: "Review Your Information",
    reviewSubtitle: "Check your details before submitting to the doctor's queue",
    reviewPatient: "Patient Identification",
    reviewSymptoms: "Reported Symptoms",
    reviewLanguage: "Language Preference",
    reviewConsent: "Consent Status",
    reviewExamResponses: "Examination Responses",
    reviewExamResponsesSub: "All questions asked and your exact answers during this visit",
    youSaid: "You said",
    understoodAs: "Understood as",
    changeAnswer: "Change",
    question: "Question",
    yourAnswer: "Your answer",
    noQuestionsYet: "No additional examination questions recorded.",
    edit: "Edit",
    readyToSend: "Ready to send your information?",
    readyToSendSub: "Your information will be securely sent to the healthcare team.",
    submitToDoctor: "Submit for Doctor Consultation",

    // Completion Screen
    completeTitle: "Information Received",
    completeSubtitle: "Your case summary has been sent to the healthcare team.",
    completeTokenPrompt: "Your Token Number:",
    completeWaitingNote: "Please proceed to waiting area Block A. Your token will be called on the screen.",
    finishSession: "Finish & Reset Kiosk",

    // Help Modal
    helpTitle: "How can we help you?",
    helpItem1: "You can speak in your mother tongue by tapping the microphone icon.",
    helpItem2: "If you made a mistake, tap Back at the bottom of the screen.",
    helpItem3: "To call a nurse or kiosk attendant, tap below.",
    staffAlerted: "Hospital staff has been notified. An attendant will assist you shortly.",
  },

  hi: {
    // Brand & Global
    appName: "मेडीकियोस्क",
    tagline: "स्मार्ट स्वास्थ्य पंजीकरण",
    step: "चरण",
    of: "का",
    help: "मदद",
    back: "पीछे जाएं",
    next: "आगे बढ़ें",
    continue: "जारी रखें",
    start: "शुरू करें",
    skip: "यह प्रश्न छोड़ें",
    listen: "निर्देश सुनें",
    close: "बंद करें",
    askStaff: "कर्मचारी की मदद लें",
    needHelp: "मदद चाहिए?",
    understandingVoice: "आपके उत्तर को समझा जा रहा है...",
    notProvided: "उपलब्ध नहीं",

    // Welcome Screen
    welcomeTitle: "मेडीकियोस्क में आपका स्वागत है",
    welcomeSubtitle: "डॉक्टर से परामर्श से पहले अपनी स्वास्थ्य जानकारी दर्ज करें।",
    welcomeEstimate: "इसमें केवल 2 से 3 मिनट लगेंगे।",
    welcomeAudioPrompt: "मेडीकियोस्क में आपका स्वागत है। शुरू करने के लिए 'शुरू करें' बटन दबाएं या अपनी भाषा चुनें।",

    // Language Screen
    selectLanguage: "अपनी भाषा चुनें",
    selectLanguageSub: "आप इनमें से किसी भी भाषा में बोल या दबाकर उत्तर दे सकते हैं",

    // Identification Screen
    identifyTitle: "आप कैसे आगे बढ़ना चाहते हैं?",
    identifySubtitle: "प्रक्रिया शुरू करने के लिए अपनी पहचान चुनें",
    haveAbha: "मेरे पास आभा (ABHA) आईडी है",
    haveAbhaSub: "आयुष्मान भारत खाते से तुरंत पंजीकरण",
    newPatient: "मैं एक नया मरीज हूं",
    newPatientSub: "इस अस्पताल में मेरी पहली यात्रा",
    needAssist: "मुझे अस्पताल कर्मचारी की मदद चाहिए",
    needAssistSub: "नर्स या सहायक आपकी मदद करेंगे",
    demoPatientPrefill: "डेमो मरीज का उपयोग करें (आरव शर्मा)",

    // Consent Screen
    consentTitle: "मरीज सहमति पत्र",
    consentSubtitle: "कृपया समझें कि आपकी जानकारी का उपयोग कैसे किया जाएगा",
    consentPoint1: "हम आपकी बीमारी और स्वास्थ्य इतिहास डॉक्टर की सहायता के लिए एकत्र करते हैं।",
    consentPoint2: "आप स्क्रीन पर छूकर या बोलकर स्वाभाविक रूप से उत्तर दे सकते हैं।",
    consentPoint3: "आप अपने पुराने पर्चे या जांच रिपोर्ट जोड़ सकते हैं।",
    consentPoint4: "आपके डॉक्टर परामर्श के समय इन सभी जानकारियों की जांच करेंगे।",
    consentPoint5: "आपकी जानकारी डिजिटल व्यक्तिगत डेटा संरक्षण कानून के तहत सुरक्षित है।",
    consentAudioExplanation: "इस सहमति पत्र की ऑडियो व्याख्या सुनें",
    consentAgree: "मैं समझता हूं और सहमत हूं",
    consentDecline: "मैं सहमत नहीं हूं",

    // OPD Department Selection
    opdTitle: "आप किस प्रकार के परामर्श के लिए आए हैं?",
    opdSubtitle: "अस्पताल विभाग चुनें",
    opdGeneral: "सामान्य चिकित्सा (जनरल मेडिसिन)",
    opdGeneralSub: "बुखार, खांसी, दर्द, कमजोरी, बीपी, शुगर",
    opdAyush: "आयुर्वेदिक / आयुष (AYUSH)",
    opdAyushSub: "प्रकृति परीक्षण, कायाचिकित्सा, पारंपरिक उपचार",
    opdOther: "अन्य विशेषज्ञ",
    opdOtherSub: "सर्जरी, हड्डी रोग, बाल रोग, कान-नाक-गला, आंख",

    // Chief Complaint Screen
    complaintTitle: "आज आपको क्या तकलीफ है?",
    complaintSubtitle: "अपनी मुख्य समस्या चुनें या माइक दबाकर बोलें",
    speakAnswer: "बोलकर बताएं",
    tapListening: "सुन रहे हैं... कृपया अब बोलें",
    processingVoice: "आपकी बात समझी जा रही है...",
    heardVoice: "हमने सुना:",
    isThisCorrect: "क्या यह सही है?",
    yesCorrect: "हां, यह सही है",
    tryAgain: "फिर से बोलें",
    orChooseBelow: "या नीचे दिए गए विकल्पों में से चुनें:",

    // Common Complaints
    cChestPain: "सीने में दर्द या भारीपन",
    cShoulderPain: "कंधे में दर्द / जकड़न",
    cPain: "दर्द / बेचैनी",
    cKneePain: "घुटने में दर्द / जोड़ दर्द",
    cDiarrhea: "दस्त / पेट खराब / लूज मोशन",
    cFever: "बुखार / ठंड लगना",
    cCough: "खांसी / जुकाम",
    cBreathing: "सांस लेने में तकलीफ",
    cHeadache: "सिरदर्द",
    cStomach: "पेट दर्द / गैस / उल्टी",
    cMedication: "पुरानी दवाइयों का नवीनीकरण",
    cOther: "कोई अन्य समस्या",

    // Questions in History
    qDurationTitle: "यह समस्या आपको कब से है?",
    optToday: "आज से शुरू हुआ",
    optYesterday: "कल से",
    optFewDays: "2 से 3 दिनों से",
    optWeekPlus: "एक हफ्ते से ज्यादा से",
    optMonthPlus: "एक महीने से ज्यादा से",

    qSeverityTitle: "दर्द या तकलीफ कितनी तेज है?",
    optMild: "हल्की (सहन करने योग्य)",
    optModerate: "मध्यम (काम में रुकावट)",
    optSevere: "तेज (काम नहीं कर पा रहे)",
    optVerySevere: "अत्यधिक तेज (आपातकालीन)",

    qNatureTitle: "तकलीफ किस प्रकार की महसूस होती है?",
    optPressure: "दबाव या भारीपन",
    optSharp: "चुभने जैसा तेज दर्द",
    optBurning: "जलन या एसिडिटी जैसा",
    optDull: "लगातार बना रहने वाला हल्का दर्द",

    // Document Upload Screen
    docQuestionTitle: "क्या आपके पास पुराने पर्चे या रिपोर्ट हैं?",
    docQuestionSubtitle: "पुरानी रिपोर्ट जोड़ने से डॉक्टर को बीमारी समझने में आसानी होती है",
    haveDocsYes: "हां, मेरे पास रिपोर्ट / पर्चे हैं",
    haveDocsNo: "नहीं, बिना रिपोर्ट के आगे बढ़ें",
    docUploadTitle: "मेडिकल दस्तावेज जोड़ें",
    docUploadPrompt: "फाइल अपलोड करने या स्कैनर से फोटो लेने के लिए दबाएं",
    docSupportedTypes: "दवा पर्ची, खून जांच, छुट्टी का सारांश (डिस्चार्ज), एक्स-रे रिपोर्ट",
    docTypeQuestion: "यह किस प्रकार का दस्तावेज है?",
    typePrescription: "दवा का पर्चा",
    typeLabReport: "लैब / खून जांच रिपोर्ट",
    typeDischarge: "डिस्चार्ज सारांश",
    typeOther: "अन्य रिपोर्ट",
    useDocument: "इस दस्तावेज का उपयोग करें",
    retakeDocument: "दोबारा फोटो लें",
    analyzingDoc: "दस्तावेज का विश्लेषण हो रहा है...",
    readingDoc: "दस्तावेज पढ़ा जा रहा है",
    extractingDoc: "दवाइयां और जांचें पहचानी जा रही हैं",
    organizingDoc: "डॉक्टर के लिए व्यवस्थित किया जा रहा है",

    // Review Screen
    reviewTitle: "अपनी जानकारी की समीक्षा करें",
    reviewSubtitle: "डॉक्टर के पास भेजने से पहले अपनी जानकारी जांच लें",
    reviewPatient: "मरीज की पहचान",
    reviewSymptoms: "दर्ज लक्षण",
    reviewDocs: "मेडिकल दस्तावेज",
    reviewLanguage: "भाषा प्राथमिकता",
    reviewConsent: "सहमति स्थिति",
    reviewExamResponses: "जांच के दौरान दी गई जानकारी",
    reviewExamResponsesSub: "इस दौरे के दौरान पूछे गए सभी सवाल और आपके दिए गए जवाब",
    youSaid: "आपने बताया",
    understoodAs: "समझा गया",
    changeAnswer: "बदलें",
    question: "प्रश्न",
    yourAnswer: "आपका उत्तर",
    noQuestionsYet: "कोई अतिरिक्त प्रश्न दर्ज नहीं किया गया।",
    edit: "बदलें",
    readyToSend: "क्या आप जानकारी भेजने के लिए तैयार हैं?",
    readyToSendSub: "आपकी जानकारी सुरक्षित रूप से स्वास्थ्य दल के पास भेज दी जाएगी।",
    submitToDoctor: "डॉक्टर के लिए सबमिट करें",

    // Completion Screen
    completeTitle: "जानकारी सफलतापूर्वक प्राप्त हुई",
    completeSubtitle: "आपका विवरण डॉक्टर की कतार में भेज दिया गया है।",
    completeTokenPrompt: "आपका टोकन नंबर:",
    completeWaitingNote: "कृपया ब्लॉक ए प्रतीक्षा क्षेत्र में बैठें। स्क्रीन पर आपका टोकन बुलाया जाएगा।",
    finishSession: "पूर्ण करें और समाप्त करें",

    // Help Modal
    helpTitle: "हम आपकी क्या सहायता कर सकते हैं?",
    helpItem1: "माइक बटन दबाकर आप अपनी भाषा में बोल सकते हैं।",
    helpItem2: "यदि कोई गलती हो गई है, तो नीचे 'पीछे जाएं' बटन दबाएं।",
    helpItem3: "अस्पताल कर्मचारी या नर्स को बुलाने के लिए नीचे दबाएं।",
    staffAlerted: "कर्मचारियों को सूचित कर दिया गया है। सहायक जल्द ही आपकी सहायता करेंगे।",
  },

  mr: {
    // Brand & Global
    appName: "मेडीकिऑस्क",
    tagline: "स्मार्ट आरोग्य नोंदणी",
    step: "टप्पा",
    of: "पैकी",
    help: "मदत",
    back: "मागे जा",
    next: "पुढे जा",
    continue: "सुरू ठेवा",
    start: "सुरू करा",
    skip: "हा प्रश्न वगळा",
    listen: "सूचना ऐका",
    close: "बंद करा",
    askStaff: "कर्मचाऱ्यांची मदत घ्या",
    needHelp: "मदत हवी आहे?",
    understandingVoice: "तुमच्या उत्तराचे विश्लेषण होत आहे...",
    notProvided: "नोंदवलेले नाही",

    // Welcome Screen
    welcomeTitle: "मेडीकिऑस्कमध्ये आपले स्वागत आहे",
    welcomeSubtitle: "डॉक्टरांच्या तपासणीपूर्वी आपली आरोग्य माहिती सहज नोंदवा.",
    welcomeEstimate: "यासाठी फक्त २ ते ३ मिनिटे लागतील.",
    welcomeAudioPrompt: "मेडीकिऑस्कमध्ये आपले स्वागत आहे. सुरू करण्यासाठी 'सुरू करा' बटण दाबा किंवा आपली भाषा निवडा.",

    // Language Screen
    selectLanguage: "आपली भाषा निवडा",
    selectLanguageSub: "तुम्ही यापैकी कोणत्याही भाषेत बोलून किंवा स्पर्श करून उत्तर देऊ शकता",

    // Identification Screen
    identifyTitle: "तुम्ही कसे पुढे जाऊ इच्छिता?",
    identifySubtitle: "नोंदणी सुरू करण्यासाठी आपली ओळख निवडा",
    haveAbha: "माझ्याकडे आभा (ABHA) आयडी आहे",
    haveAbhaSub: "आयुष्मान भारत खात्याद्वारे जलद नोंदणी",
    newPatient: "मी नवीन रुग्ण आहे",
    newPatientSub: "या रुग्णालयातील माझी पहिलीच भेट",
    needAssist: "मला रुग्णालयातील कर्मचाऱ्यांची मदत हवी आहे",
    needAssistSub: "परिचारिका किंवा मदतनीस तुम्हाला मदत करतील",
    demoPatientPrefill: "डेमो रुग्ण वापरा (आरव शर्मा)",

    // Consent Screen
    consentTitle: "रुग्ण संमती पत्र",
    consentSubtitle: "आपली माहिती कशी वापरली जाईल हे कृपया समजून घ्या",
    consentPoint1: "डॉक्टरांच्या मदतीसाठी आम्ही तुमची लक्षणे आणि आरोग्याचा इतिहास गोळा करतो.",
    consentPoint2: "तुम्ही पडद्यावर स्पर्श करून किंवा सहज आवाजात बोलून उत्तरे देऊ शकता.",
    consentPoint3: "तुम्ही तुमचे जुने औषधांचे कागद किंवा तपासणी अहवाल जोडू शकता.",
    consentPoint4: "तपासणीदरम्यान डॉक्टर या सर्व माहितीची खात्री करतील.",
    consentPoint5: "आपली माहिती डिजिटल वैयक्तिक डेटा संरक्षण कायद्यानुसार पूर्णपणे सुरक्षित आहे.",
    consentAudioExplanation: "या संमती पत्राचे ऑडिओ स्पष्टीकरण ऐका",
    consentAgree: "मला समजले आणि माझी संमती आहे",
    consentDecline: "माझी संमती नाही",

    // OPD Department Selection
    opdTitle: "तुम्ही कोणत्या तपासणीसाठी आला आहात?",
    opdSubtitle: "रुग्णालय विभाग निवडा",
    opdGeneral: "जनरल मेडिसिन (सामान्य तपासणी)",
    opdGeneralSub: "ताप, खोकला, अंगदुखी, रक्तदाब, मधुमेह इत्यादी",
    opdAyush: "आयुर्वेदिक / आयुष (AYUSH)",
    opdAyushSub: "प्रकृती परीक्षण, कायाचिकित्सा, पारंपरिक उपचार",
    opdOther: "इतर तज्ज्ञ डॉक्टर",
    opdOtherSub: "शस्त्रक्रिया, अस्थिरोग, बालरोग, कान-नाक-घसा, डोळे",

    // Chief Complaint Screen
    complaintTitle: "आज तुम्हाला काय त्रास होत आहे?",
    complaintSubtitle: "मुख्य त्रास निवडा किंवा मायक्रोफोन बटण दाबून आवाजात सांगा",
    speakAnswer: "बोलून सांगा",
    tapListening: "ऐकत आहे... कृपया आता बोला",
    processingVoice: "तुमचे बोलणे समजून घेत आहे...",
    heardVoice: "आम्ही ऐकले:",
    isThisCorrect: "हे बरोबर आहे का?",
    yesCorrect: "होय, हे बरोबर आहे",
    tryAgain: "पुन्हा प्रयत्न करा",
    orChooseBelow: "किंवा खालील पर्यायांमधून निवडा:",

    // Common Complaints
    cChestPain: "छातीत दुखणे किंवा जड वाटणे",
    cShoulderPain: "खांदेदुखी / खांद्यात वेदना",
    cPain: "वेदना किंवा अस्वस्थता",
    cKneePain: "गुडघेदुखी / सांधेदुखी",
    cDiarrhea: "जुलाब / संडास / अतिसार",
    cFever: "ताप / थंडी वाजणे",
    cCough: "खोकला / सर्दी",
    cBreathing: "श्वास घेण्यास त्रास",
    cHeadache: "डोकेदुखी",
    cStomach: "पोटदुखी / मळमळ / उलटी",
    cMedication: "जुनी औषधे पुन्हा घेणे",
    cOther: "इतर काही त्रास",

    // Questions in History
    qDurationTitle: "हा त्रास तुम्हाला कधीपासून सुरू झाला?",
    optToday: "आजपासून सुरू झाला",
    optYesterday: "कालपासून",
    optFewDays: "२ ते ३ दिवसांपासून",
    optWeekPlus: "एक आठवड्यापेक्षा जास्त",
    optMonthPlus: "एक महिन्यापेक्षा जास्त",

    qSeverityTitle: "त्रास किंवा वेदना किती तीव्र आहे?",
    optMild: "कमी (सहन करण्यासारखी)",
    optModerate: "मध्यम (दैनंदिन कामात अडचण)",
    optSevere: "तीव्र (काम करणे अशक्य)",
    optVerySevere: "अति तीव्र (तातडीची गरज)",

    qNatureTitle: "वेदना किंवा त्रासाचे स्वरूप कसे आहे?",
    optPressure: "दाब किंवा छातीत जडपणा",
    optSharp: "तीक्ष्ण किंवा सुई टोचल्यासारखे",
    optBurning: "जळजळ किंवा पित्तासारखे",
    optDull: "सतत राहणारे हलके दुखणे",

    // Document Upload Screen
    docQuestionTitle: "आपल्याकडे जुने अहवाल किंवा डॉक्टरांचे कागद आहेत का?",
    docQuestionSubtitle: "मागील कागदपत्रे जोडल्याने डॉक्टरांना आजार समजण्यास मदत होते",
    haveDocsYes: "होय, मागील अहवाल / कागदपत्रे आहेत",
    haveDocsNo: "नाही, अहवालांशिवाय पुढे जा",
    docUploadTitle: "वैद्यकीय कागदपत्र जोडा",
    docUploadPrompt: "फाइल अपलोड करण्यासाठी किंवा स्कॅनरने फोटो घेण्यासाठी दाबा",
    docSupportedTypes: "औषध पत्री, रक्त तपासणी, डिस्चार्ज समरी, एक्स-रे अहवाल",
    docTypeQuestion: "हा कोणत्या प्रकारचा कागद आहे?",
    typePrescription: "औषधांचे प्रिस्क्रिप्शन",
    typeLabReport: "लॅब / रक्त तपासणी अहवाल",
    typeDischarge: "डिस्चार्ज समरी",
    typeOther: "इतर अहवाल",
    useDocument: "हा कागद वापरा",
    retakeDocument: "पुन्हा फोटो घ्या",
    analyzingDoc: "कागदपत्राचे विश्लेषण सुरू आहे...",
    readingDoc: "कागदपत्र वाचले जात आहे",
    extractingDoc: "औषधे आणि तपासण्या शोधल्या जात आहेत",
    organizingDoc: "डॉक्टरांसाठी माहिती तयार केली जात आहे",

    // Review Screen
    reviewTitle: "आपल्या माहितीचे पुनरावलोकन करा",
    reviewSubtitle: "डॉक्टरांकडे पाठवण्यापूर्वी माहिती तपासा",
    reviewPatient: "रुग्णाची ओळख",
    reviewSymptoms: "नोंदवलेली लक्षणे",
    reviewDocs: "वैद्यकीय कागदपत्रे",
    reviewLanguage: "भाषेची निवड",
    reviewConsent: "संमती स्थिती",
    reviewExamResponses: "तपासणीदरम्यान दिलेली माहिती",
    reviewExamResponsesSub: "विचारलेले सर्व प्रश्न आणि आपण दिलेली अचूक उत्तरे",
    youSaid: "आपण सांगितले",
    understoodAs: "समजलेले",
    changeAnswer: "बदला",
    question: "प्रश्न",
    yourAnswer: "तुमचे उत्तर",
    noQuestionsYet: "कोणतेही अतिरिक्त प्रश्न नोंदवलेले नाहीत.",
    edit: "बदला",
    readyToSend: "तुम्ही माहिती पाठवण्यासाठी तयार आहात का?",
    readyToSendSub: "आपली माहिती सुरक्षितपणे आरोग्य पथकाकडे पाठवली जाईल.",
    submitToDoctor: "डॉक्टरांसाठी माहिती पाठवा",

    // Completion Screen
    completeTitle: "माहिती यशस्वीरीत्या प्राप्त झाली",
    completeSubtitle: "आपली माहिती डॉक्टरांच्या ओपीडीत पाठवण्यात आली आहे.",
    completeTokenPrompt: "आपला टोकन नंबर:",
    completeWaitingNote: "कृपया ब्लॉक ए प्रतीक्षा कक्षात बसा. पडद्यावर आपला नंबर पुकारला जाईल.",
    finishSession: "पूर्ण करा आणि किऑस्क पूर्ववत करा",

    // Help Modal
    helpTitle: "आम्ही आपली कशी मदत करू शकतो?",
    helpItem1: "मायक्रोफोन बटण दाबून तुम्ही तुमच्या भाषेत बोलू शकता.",
    helpItem2: "काही चूक झाली असल्यास तळाशी असलेले 'मागे जा' बटण दाबा.",
    helpItem3: "रुग्णालयातील परिचारिका किंवा मदतनीसांना बोलावण्यासाठी खाली दाबा.",
    staffAlerted: "कर्मचाऱ्यांना सूचित करण्यात आले आहे. मदतनीस लवकरच आपल्याकडे येतील.",
  },
};

export const supportedLanguages = [
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', flag: '🇮🇳' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳' },
  { code: 'en', nativeName: 'English', englishName: 'English', flag: '🇬🇧' },
];

export function t(key, lang = 'en') {
  const dictionary = translations[lang] || translations.en;
  return dictionary[key] || translations.en[key] || key;
}
