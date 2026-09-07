/**
 * Screen 3: Patient Identification Screen
 * Patient identification modes with accessible touch tiles.
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { DEMO_PATIENT } from '../mock/mockPatient.js';
import { audioController } from '../audio.js';

export function renderIdentifyScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card" style="max-width: 960px; margin: 0 auto;">
      <!-- Audio Narration Pill -->
      <button id="btn-identify-audio" class="audio-prompt-bar">
        <span aria-hidden="true">🔊</span>
        <span>${t('listen', lang)}</span>
      </button>

      <h1 class="kiosk-question-title" style="color: var(--primary);">
        ${t('identifyTitle', lang)}
      </h1>
      <p class="kiosk-question-subtitle">
        ${t('identifySubtitle', lang)}
      </p>

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
        <div id="opt-identify-abha" class="option-tile ${appState.patient?.type === 'EXISTING_ABHA' ? 'selected' : ''}">
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

      <!-- Footer Action Row -->
      <div style="margin-top: 2rem; display: flex; justify-content: space-between; align-items: center;">
        <button id="btn-identify-back" class="btn btn-secondary" style="min-height: 50px;">
          ← ${t('back', lang)}
        </button>

        <!-- Quick Demo Shortcut for Evaluators -->
        <button id="btn-prefill-demo" class="btn btn-secondary" style="font-size: var(--font-size-xs); min-height: 48px; border-style: dashed;">
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

      document.getElementById('btn-identify-back')?.addEventListener('click', () => {
        router.navigate('language');
      });

      const audioBtn = document.getElementById('btn-identify-audio');
      audioBtn?.addEventListener('click', async () => {
        if (audioController.isSpeaking) {
          audioController.stop();
          audioBtn.classList.remove('playing');
          return;
        }
        audioBtn.classList.add('playing');
        await audioController.speak(t('identifyTitle', appState.language), appState.language);
        audioBtn.classList.remove('playing');
      });
    },
  };
}
