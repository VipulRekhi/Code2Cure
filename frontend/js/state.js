/**
 * MediKiosk Centralized Application State (Section 14 & Phase 10 Institutional State)
 * Strictly separates patient-facing vernacular text from internal language-neutral clinical data.
 */

export const appState = {
  sessionId: null,
  backendSessionId: null,
  language: 'mr', // Default to Marathi for Maharashtra / AIIA context, switchable anytime
  
  // Patient Identity (Phase 10 Persistent Onboarding)
  patient: {
    id: null,
    identifier: null,
    type: 'NEW', // 'NEW' | 'EXISTING' | 'EXISTING_ABHA' | 'ASSISTED'
    name: null,
    fullName: null,
    firstName: null,
    lastName: null,
    age: null,
    ageYears: null,
    gender: 'OTHER',
    phone: null,
    dateOfBirth: null,
    abhaId: null,
    abhaAddress: null,
    hospitalUhid: null,
    address: null,
    preferredLanguage: 'MR',
    medicalHistory: [],
    surgicalHistory: [],
    familyHistory: null,
    personalHistory: null,
  },

  // Institutional Hierarchy & OPD Encounter (Phase 10)
  hospital: {
    id: null,
    code: null,
    name: null,
  },
  department: {
    id: null,
    code: null,
    name: null,
    opdType: 'GENERAL',
    roomNumber: null,
  },
  doctor: {
    id: null,
    name: null,
    specialization: null,
  },
  encounter: {
    id: null,
    tokenNumber: null,
    status: null,
    triageTier: 'NORMAL',
  },

  // Informed Consent (Section 16)
  consent: {
    granted: false,
    timestamp: null,
    version: '1.0',
  },

  // OPD Department Mode (Section 18)
  opdMode: 'GENERAL', // 'GENERAL' | 'AYUSH' | 'OTHER'

  // Current Step & Navigation History
  currentScreen: 'landing',
  historyStack: [],

  // Clinical Chief Complaint & History Slots (Language-neutral)
  complaint: {
    id: null,           // e.g. "CHEST_PAIN"
    textPatientSpoken: null,
    initialComplaintTranscript: null,
    location: null,
    duration: null,     // e.g. { value: 3, unit: "days" }
    severity: null,     // e.g. "MODERATE"
    character: null,    // e.g. "PRESSURE"
  },

  // Contextual Conversation & Turn Management (Phase 6.3)
  latestPatientResponseTranscript: null,
  latestNormalizedAnswer: null,
  latestSelectedOption: null,
  currentQuestionSource: null,
  conversationHistory: [],
  activeQuestionId: null,
  latestAnswerQuestionId: null,

  // Document Uploads (Section 29)
  documents: [],

  // Voice Interaction State Machine (Section 20)
  voice: {
    status: 'IDLE',     // 'IDLE' | 'LISTENING' | 'PROCESSING' | 'RECOGNIZED' | 'CONFIRMATION' | 'ERROR'
    transcript: null,
    matchedSlot: null,
  },

  // Inactivity tracking (Section 28)
  lastInteractionTime: Date.now(),
  isDemoMode: true,
};

// Listeners for state changes
const listeners = [];

export function subscribe(listener) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}

export function notifyStateChange(changedKey = null) {
  appState.lastInteractionTime = Date.now();
  listeners.forEach((fn) => fn(appState, changedKey));
}

export function setLanguage(lang) {
  if (['en', 'hi', 'mr'].includes(lang)) {
    appState.language = lang;
    notifyStateChange('language');
  }
}

// Reset handlers registered synchronously across modules
const resetCallbacks = new Set();

export function registerResetCallback(fn) {
  if (typeof fn === 'function') {
    resetCallbacks.add(fn);
    return () => resetCallbacks.delete(fn);
  }
  return () => {};
}

/**
 * Resets only the clinical intake session (chief complaint, active questions, conversation history, documents)
 * while preserving patient registration and institutional encounter.
 */
export function resetClinicalSession(notify = true) {
  appState.backendSessionId = null;
  appState.complaint = {
    id: null,
    textPatientSpoken: null,
    initialComplaintTranscript: null,
    location: null,
    duration: null,
    severity: null,
    character: null,
  };
  appState.latestPatientResponseTranscript = null;
  appState.latestNormalizedAnswer = null;
  appState.latestSelectedOption = null;
  appState.currentQuestionSource = null;
  appState.conversationHistory = [];
  appState.activeQuestionId = null;
  appState.latestAnswerQuestionId = null;
  appState.documents = [];
  appState.voice = { status: 'IDLE', transcript: null, matchedSlot: null };

  // Trigger all module-level reset handlers synchronously
  resetCallbacks.forEach((fn) => {
    try { fn(); } catch (e) { console.error('[State] Reset callback error:', e); }
  });

  if (notify) {
    notifyStateChange('clinicalReset');
  }
}

export function resetSession(notify = true) {
  appState.sessionId = `MK-${Date.now().toString().slice(-6)}`;
  appState.backendSessionId = null;
  appState.patient = {
    id: null,
    identifier: null,
    type: 'NEW',
    name: null,
    fullName: null,
    firstName: null,
    lastName: null,
    age: null,
    ageYears: null,
    gender: 'OTHER',
    phone: null,
    dateOfBirth: null,
    abhaId: null,
    abhaAddress: null,
    hospitalUhid: null,
    address: null,
    preferredLanguage: 'MR',
    medicalHistory: [],
    surgicalHistory: [],
    familyHistory: null,
    personalHistory: null,
  };
  appState.hospital = { id: null, code: null, name: null };
  appState.department = { id: null, code: null, name: null, opdType: 'GENERAL', roomNumber: null };
  appState.doctor = { id: null, name: null, specialization: null };
  appState.encounter = { id: null, tokenNumber: null, status: null, triageTier: 'NORMAL' };
  appState.consent = { granted: false, timestamp: null, version: '1.0' };
  appState.opdMode = 'GENERAL';
  appState.currentScreen = 'landing';
  appState.historyStack = [];
  appState.complaint = {
    id: null,
    textPatientSpoken: null,
    initialComplaintTranscript: null,
    location: null,
    duration: null,
    severity: null,
    character: null,
  };
  appState.latestPatientResponseTranscript = null;
  appState.latestNormalizedAnswer = null;
  appState.latestSelectedOption = null;
  appState.currentQuestionSource = null;
  appState.conversationHistory = [];
  appState.activeQuestionId = null;
  appState.latestAnswerQuestionId = null;
  appState.documents = [];
  appState.voice = { status: 'IDLE', transcript: null, matchedSlot: null };
  appState.lastInteractionTime = Date.now();

  // Clear temporary sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('medikiosk_patient_session');
  }

  // Trigger all module-level reset handlers synchronously
  resetCallbacks.forEach((fn) => {
    try { fn(); } catch (e) { console.error('[State] Reset callback error:', e); }
  });

  if (notify) {
    notifyStateChange('reset');
  }
}
