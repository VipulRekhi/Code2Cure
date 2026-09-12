/**
 * Doctor Portal State Manager — MediKiosk (Phase 10)
 * 
 * Enforces strict session isolation:
 * Switching patients wipes all clinical facts, verbal summaries, Q&A responses,
 * and notes from the previous patient.
 */

const STORAGE_KEY_TOKEN = 'medikiosk_doc_token';
const STORAGE_KEY_PROFILE = 'medikiosk_doc_profile';

export const doctorState = {
  doctor: null,
  token: null,
  activeTab: 'login', // 'dashboard', 'queue', 'alerts', 'registry', 'workspace', 'reports', 'settings'
  currentPatientId: null,
  workspaceData: null,
  dashboardData: null,
  queueList: [],
  alertsList: [],
  registryList: [],
  reportsData: null,
  settingsData: null,
  searchQuery: '',
  registryFilter: 'ALL',
  audioAlertsEnabled: true,
  highContrastMode: false,
};

const listeners = new Set();

export function subscribeDoctorState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyDoctorState(changeKey = 'all') {
  for (const listener of listeners) {
    try {
      listener(doctorState, changeKey);
    } catch (e) {
      console.error('[DoctorState] Listener error:', e);
    }
  }
}

export function initDoctorState() {
  try {
    const savedToken = sessionStorage.getItem(STORAGE_KEY_TOKEN);
    const savedProfile = sessionStorage.getItem(STORAGE_KEY_PROFILE);
    if (savedToken && savedProfile) {
      doctorState.token = savedToken;
      doctorState.doctor = JSON.parse(savedProfile);
      doctorState.activeTab = 'dashboard';
    } else {
      doctorState.activeTab = 'login';
    }
  } catch (e) {
    console.warn('[DoctorState] Session restore failed:', e);
    doctorState.activeTab = 'login';
  }
}

export function setDoctorAuth(doctor, token) {
  doctorState.doctor = doctor;
  doctorState.token = token;
  doctorState.activeTab = 'dashboard';
  try {
    sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
    sessionStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(doctor));
  } catch (e) {}
  notifyDoctorState('auth');
}

export function clearDoctorAuth() {
  doctorState.doctor = null;
  doctorState.token = null;
  doctorState.activeTab = 'login';
  clearPatientWorkspace();
  try {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_PROFILE);
  } catch (e) {}
  notifyDoctorState('auth');
}

export function setActiveTab(tab) {
  if (doctorState.activeTab !== tab) {
    doctorState.activeTab = tab;
    notifyDoctorState('tab');
  }
}

/**
 * STRICT SESSION ISOLATION:
 * Clears current patient workspace before opening a new patient or navigating away.
 */
export function clearPatientWorkspace() {
  doctorState.currentPatientId = null;
  doctorState.workspaceData = null;
  notifyDoctorState('workspace_cleared');
}

export function setPatientWorkspace(data) {
  // Clear any existing patient data first to ensure 100% isolation
  doctorState.workspaceData = null;
  doctorState.currentPatientId = data?.sessionId || null;
  doctorState.workspaceData = data;
  doctorState.activeTab = 'workspace';
  notifyDoctorState('workspace');
}
