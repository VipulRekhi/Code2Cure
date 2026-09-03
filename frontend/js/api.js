/**
 * Centralized API Client (Section 45)
 * Communicates with the Express backend foundation.
 */

const API_BASE = '/api';

export const api = {
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('[API] Health check unreachable:', error.message);
      return { success: false, error: error.message };
    }
  },

  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: { message: error.message } };
    }
  },

  // ----------------------------------------------------
  // Phase 3: Clinical Question Engine Endpoints (Section 41)
  // ----------------------------------------------------
  async createClinicalSession({ patientId = null, language = 'mr', opdMode = 'GENERAL' }) {
    try {
      const response = await fetch(`${API_BASE}/clinical/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, language, opdMode }),
      });
      return await response.json();
    } catch (error) {
      console.warn('[API] Failed to create clinical session:', error);
      return { success: false, error: error.message };
    }
  },

  async getNextClinicalQuestion(sessionId, lang = 'mr') {
    try {
      const response = await fetch(`${API_BASE}/clinical/sessions/${sessionId}/next-question?lang=${lang}`);
      return await response.json();
    } catch (error) {
      console.warn('[API] Failed to fetch next clinical question:', error);
      return { success: false, error: error.message };
    }
  },

  async recordClinicalResponse(sessionId, responseData) {
    try {
      const response = await fetch(`${API_BASE}/clinical/sessions/${sessionId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responseData),
      });
      return await response.json();
    } catch (error) {
      console.warn('[API] Failed to record response:', error);
      return { success: false, error: error.message };
    }
  },

  async getClinicalProgress(sessionId) {
    try {
      const response = await fetch(`${API_BASE}/clinical/sessions/${sessionId}/progress`);
      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
