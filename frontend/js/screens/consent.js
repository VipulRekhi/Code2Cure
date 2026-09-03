/**
 * Screen 4: Informed Consent Screen (Section 16 & 17)
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { audioController } from '../audio.js';

export function renderConsentScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card">
      <h1 class="kiosk-question-title">${t('consentTitle', lang)}</h1>
      <p class="kiosk-question-subtitle">${t('consentSubtitle', lang)}</p>

      <!-- Audio Explanation Bar -->
      <button id="btn-consent-audio" class="audio-prompt-bar">
        <span>🔊</span>
        <span>${t('consentAudioExplanation', lang)}</span>
      </button>

      <!-- Clear, High-Contrast Bullet Points -->
      <div style="background: var(--surface-subtle); border: 2px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem;">
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 1.25rem; font-size: var(--font-size-md);">
          <li style="display: flex; gap: 1rem; align-items: flex-start;">
            <span style="font-size: 1.5rem; color: var(--primary);">✓</span>
            <span>${t('consentPoint1', lang)}</span>
          </li>
          <li style="display: flex; gap: 1rem; align-items: flex-start;">
            <span style="font-size: 1.5rem; color: var(--primary);">✓</span>
            <span>${t('consentPoint2', lang)}</span>
          </li>
          <li style="display: flex; gap: 1rem; align-items: flex-start;">
            <span style="font-size: 1.5rem; color: var(--primary);">✓</span>
            <span>${t('consentPoint3', lang)}</span>
          </li>
          <li style="display: flex; gap: 1rem; align-items: flex-start;">
            <span style="font-size: 1.5rem; color: var(--primary);">✓</span>
            <span>${t('consentPoint4', lang)}</span>
          </li>
          <li style="display: flex; gap: 1rem; align-items: flex-start;">
            <span style="font-size: 1.5rem; color: var(--primary);">✓</span>
            <span>${t('consentPoint5', lang)}</span>
          </li>
        </ul>
      </div>

      <!-- Consent Actions -->
      <div style="display: flex; gap: 1.5rem; justify-content: flex-end;">
        <button id="btn-consent-decline" class="btn btn-secondary" style="min-width: 200px;">
          ${t('consentDecline', lang)}
        </button>
        <button id="btn-consent-agree" class="btn btn-primary" style="min-width: 280px;">
          ${t('consentAgree', lang)} ➔
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.getElementById('btn-consent-audio')?.addEventListener('click', () => {
        const fullExplanation = `${t('consentTitle', lang)}. ${t('consentPoint1', lang)}. ${t('consentPoint2', lang)}. ${t('consentPoint4', lang)}.`;
        audioController.speak(fullExplanation, lang);
      });

      document.getElementById('btn-consent-agree')?.addEventListener('click', () => {
        appState.consent = {
          granted: true,
          timestamp: new Date().toISOString(),
          version: '1.0',
        };
        notifyStateChange('consent');
        router.navigate('opdSelection');
      });

      document.getElementById('btn-consent-decline')?.addEventListener('click', () => {
        appState.consent = {
          granted: false,
          timestamp: new Date().toISOString(),
          version: '1.0',
        };
        notifyStateChange('consent');
        router.openHelpModal(
          'Consent is required to continue. A hospital attendant can assist you with manual paper OPD registration.'
        );
      });
    },
  };
}
