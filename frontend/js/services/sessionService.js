/**
 * Session Lifecycle & Ephemeral Kiosk Management (Section 28 & ADR-008)
 * 60-second inactivity timeout with automatic memory purge to prevent cross-patient data leakage.
 */

import { resetSession, appState } from '../state.js';

class SessionService {
  constructor() {
    this.inactivitySeconds = 0;
    this.timer = null;
    this.warningCallback = null;
  }

  startMonitoring(onWarning) {
    this.warningCallback = onWarning;
    this.resetTimer();

    // Reset on any physical touch or interaction
    const userEvents = ['touchstart', 'pointerdown', 'keydown', 'click'];
    userEvents.forEach((event) => {
      window.addEventListener(event, () => this.resetTimer(), { passive: true });
    });

    this.timer = setInterval(() => this.tick(), 1000);
  }

  resetTimer() {
    this.inactivitySeconds = 0;
  }

  tick() {
    // Only count inactivity once user has advanced past welcome screen
    if (appState.currentScreen === 'welcome' || appState.currentScreen === 'complete') {
      this.inactivitySeconds = 0;
      return;
    }

    this.inactivitySeconds++;

    // Warning modal at 45 seconds
    if (this.inactivitySeconds === 45 && this.warningCallback) {
      this.warningCallback(15);
    }

    // Auto-abort and purge at 60 seconds
    if (this.inactivitySeconds >= 60) {
      console.warn('[Session] Inactivity timeout reached (60s). Purging kiosk memory.');
      resetSession();
      this.inactivitySeconds = 0;
    }
  }
}

export const sessionService = new SessionService();
