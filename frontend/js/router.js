/**
 * Kiosk Screen Router & Navigation Controller (Section 26 & 42)
 * Manages transitions, forward/backward history preservation, and screen rendering.
 */

import { appState, notifyStateChange, resetClinicalSession } from './state.js';
import { renderHeader } from './components/header.js';
import { renderProgress } from './components/progress.js';
import { t } from './i18n.js';
import { showHelpModal } from './screens/help.js';
import { renderDebugPanel } from './components/debugPanel.js';

import { renderLandingScreen } from './screens/landing.js';
import { renderWelcomeScreen } from './screens/welcome.js';
import { renderLanguageScreen } from './screens/language.js';
import { renderIdentifyScreen } from './screens/identify.js';
import { renderConsentScreen } from './screens/consent.js';
import { renderOpdSelectionScreen } from './screens/opdSelection.js';
import { renderChiefComplaintScreen } from './screens/chiefComplaint.js';
import { renderConversationScreen } from './screens/conversation.js';
import { renderDocumentsScreen } from './screens/documents.js';
import { renderDocumentReviewScreen } from './screens/documentReview.js';
import { renderPatientReviewScreen } from './screens/patientReview.js';
import { renderSubmissionScreen } from './screens/submission.js';
import { renderCompleteScreen } from './screens/complete.js';

const screenRenderers = {
  landing: renderLandingScreen,
  welcome: renderWelcomeScreen,
  language: renderLanguageScreen,
  identify: renderIdentifyScreen,
  consent: renderConsentScreen,
  opdSelection: renderOpdSelectionScreen,
  chiefComplaint: renderChiefComplaintScreen,
  conversation: renderConversationScreen,
  documents: renderDocumentsScreen,
  documentReview: renderDocumentReviewScreen,
  patientReview: renderPatientReviewScreen,
  submission: renderSubmissionScreen,
  complete: renderCompleteScreen,
};

class Router {
  constructor() {
    this.stageEl = null;
    this.headerEl = null;
    this.progressEl = null;
    this.footerEl = null;
  }

  init() {
    this.stageEl = document.getElementById('kiosk-stage');
    this.headerEl = document.getElementById('kiosk-header');
    this.progressEl = document.getElementById('kiosk-progress');
    this.footerEl = document.getElementById('kiosk-footer');

    // Render initial screen
    this.renderCurrentScreen();
  }

  navigate(screenName, replace = false) {
    if (!screenRenderers[screenName]) {
      console.error(`[Router] Unknown screen: "${screenName}"`);
      return;
    }

    if (!replace && appState.currentScreen !== screenName) {
      appState.historyStack.push(appState.currentScreen);
    }

    appState.currentScreen = screenName;
    notifyStateChange('screen');
    this.renderCurrentScreen();
  }

  back() {
    if (appState.historyStack.length > 0) {
      const previous = appState.historyStack.pop();
      if (
        previous === 'chiefComplaint' ||
        previous === 'opdSelection' ||
        previous === 'welcome' ||
        previous === 'consent' ||
        previous === 'identify'
      ) {
        resetClinicalSession(false);
      }
      appState.currentScreen = previous;
      notifyStateChange('screen');
      this.renderCurrentScreen();
    }
  }

  renderCurrentScreen() {
    const screenName = appState.currentScreen;
    const renderer = screenRenderers[screenName] || screenRenderers.landing || screenRenderers.welcome;

    // 1. Render Header & Progress
    if (this.headerEl) renderHeader(this.headerEl);
    if (this.progressEl) renderProgress(this.progressEl);

    // 2. Render Screen Body
    if (this.stageEl) {
      const { html, attachEvents } = renderer();
      this.stageEl.innerHTML = html;
      this.stageEl.focus();
      if (attachEvents) attachEvents();
    }

    // 3. Render Footer (Back button & help)
    this.renderFooter();

    // 4. Attach global header events
    this.attachHeaderEvents();
  }

  renderFooter() {
    if (!this.footerEl) return;

    const screenName = appState.currentScreen;
    const canGoBack = appState.historyStack.length > 0 && screenName !== 'complete';

    this.footerEl.innerHTML = `
      <div>
        ${
          canGoBack
            ? `
          <button id="btn-global-back" class="btn btn-secondary" style="min-height: var(--touch-standard);" aria-label="Go to previous step">
            ← ${t('back', appState.language)}
          </button>
        `
            : ''
        }
      </div>

      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="font-size: var(--font-size-xs); color: var(--muted-text);">
          Kiosk Terminal #01 • Online
        </span>
      </div>
      ${renderDebugPanel()}
    `;

    document.getElementById('btn-global-back')?.addEventListener('click', () => {
      this.back();
    });
  }

  attachHeaderEvents() {
    document.getElementById('btn-global-help')?.addEventListener('click', () => {
      this.openHelpModal();
    });

    document.getElementById('btn-quick-lang')?.addEventListener('click', () => {
      this.navigate('language');
    });
  }

  openHelpModal(customMessage = null) {
    showHelpModal(customMessage);
  }
}

export const router = new Router();
