/**
 * Screen 3: Patient Identification Screen (Section 15)
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { DEMO_PATIENT } from '../mock/mockPatient.js';

export function renderIdentifyScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card">
      <h1 class="kiosk-question-title">${t('identifyTitle', lang)}</h1>
      <p class="kiosk-question-subtitle">${t('identifySubtitle', lang)}</p>

      <div class="option-grid">
        <!-- New Patient Option -->
        <div id="opt-identify-new" class="option-tile">
          <div class="option-tile-icon">🆕</div>
          <div>
            <div class="option-tile-text">${t('newPatient', lang)}</div>
            <div class="option-tile-subtext">${t('newPatientSub', lang)}</div>
          </div>
        </div>

        <!-- ABHA Option -->
        <div id="opt-identify-abha" class="option-tile">
          <div class="option-tile-icon">🆔</div>
          <div>
            <div class="option-tile-text">${t('haveAbha', lang)}</div>
            <div class="option-tile-subtext">${t('haveAbhaSub', lang)}</div>
          </div>
        </div>

        <!-- Staff Assistance Option -->
        <div id="opt-identify-assist" class="option-tile">
          <div class="option-tile-icon">👩‍⚕️</div>
          <div>
            <div class="option-tile-text">${t('needAssist', lang)}</div>
            <div class="option-tile-subtext">${t('needAssistSub', lang)}</div>
          </div>
        </div>
      </div>

      <!-- Quick Demo Shortcut for Evaluators -->
      <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: center;">
        <button id="btn-prefill-demo" class="btn btn-secondary" style="font-size: var(--font-size-sm); min-height: 52px;">
          <span>⚡</span>
          <span>${t('demoPatientPrefill', lang)}</span>
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.getElementById('opt-identify-new')?.addEventListener('click', () => {
        appState.patient = {
          id: `pat-${Date.now().toString().slice(-4)}`,
          identifier: `MK-NEW-${Date.now().toString().slice(-4)}`,
          type: 'NEW',
          name: 'Patient (New OPD)',
          age: null,
          phone: null,
        };
        notifyStateChange('patient');
        router.navigate('consent');
      });

      document.getElementById('opt-identify-abha')?.addEventListener('click', () => {
        // Use demo ABHA identity
        appState.patient = { ...DEMO_PATIENT, type: 'EXISTING_ABHA' };
        notifyStateChange('patient');
        router.navigate('consent');
      });

      document.getElementById('opt-identify-assist')?.addEventListener('click', () => {
        router.openHelpModal();
      });

      document.getElementById('btn-prefill-demo')?.addEventListener('click', () => {
        appState.patient = { ...DEMO_PATIENT };
        notifyStateChange('patient');
        router.navigate('consent');
      });
    },
  };
}
