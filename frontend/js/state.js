/**
 * MediKiosk Centralized Application State (Section 14 & 27)
 * Strictly separates patient-facing vernacular text from internal language-neutral clinical data.
 */

export const appState = {
  sessionId: null,
  backendSessionId: null,
  language: 'mr', // Default to Marathi for Maharashtra / AIIA context, switchable anytime
  
  // Patient Identity (Section 15)
  patient: {
    id: null,
    identifier: null,
    type: 'NEW', // 'NEW' | 'EXISTING_ABHA' | 'ASSISTED'
    name: null,
    age: null,
    phone: null,
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
  currentScreen: 'welcome',
  historyStack: [],

  // Clinical Chief Complaint & History Slots (Language-neutral)
  complaint: {
    id: null,           // e.g. "CHEST_PAIN"
    textPatientSpoken: null,
    duration: null,     // e.g. { value: 3, unit: "days" }
    severity: null,     // e.g. "MODERATE"
    character: null,    // e.g. "PRESSURE"
  },

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

export function resetSession() {
  appState.sessionId = `MK-${Date.now().toString().slice(-6)}`;
  appState.backendSessionId = null;
  appState.patient = {
    id: null,
    identifier: null,
    type: 'NEW',
    name: null,
    age: null,
    phone: null,
  };
  appState.consent = { granted: false, timestamp: null, version: '1.0' };
  appState.opdMode = 'GENERAL';
  appState.currentScreen = 'welcome';
  appState.historyStack = [];
  appState.complaint = {
    id: null,
    textPatientSpoken: null,
    duration: null,
    severity: null,
    character: null,
  };
  appState.documents = [];
  appState.voice = { status: 'IDLE', transcript: null, matchedSlot: null };
  appState.lastInteractionTime = Date.now();

  // Clear any temporary sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('medikiosk_patient_session');
  }

  notifyStateChange('reset');
}
