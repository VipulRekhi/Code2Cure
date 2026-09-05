/**
 * Screen 1: Welcome Screen (Section 11)
 */

import { t } from '../i18n.js';
import { appState, resetSession } from '../state.js';
import { router } from '../router.js';
import { audioController } from '../audio.js';

export function renderWelcomeScreen() {
  // Hard Boundary: Every arrival at welcome screen purges old clinical state (without infinite render loop)
  resetSession(false);
  const lang = appState.language;

  const html = `
    <div class="screen-card" style="text-align: center; align-items: center; max-width: 900px;">
      <div style="font-size: 3.5rem; margin-bottom: 1rem;">🩺</div>

      <h1 class="kiosk-question-title" style="font-size: var(--font-size-hero);">
        ${t('welcomeTitle', lang)}
      </h1>

      <p style="font-size: var(--font-size-lg); max-width: 650px; margin-bottom: 1.5rem; color: var(--text-secondary);">
        ${t('welcomeSubtitle', lang)}
      </p>

      <div style="display: inline-flex; align-items: center; gap: 0.5rem; font-size: var(--font-size-base); color: var(--muted-text); background: var(--surface-subtle); padding: 0.5rem 1.25rem; border-radius: var(--radius-full); margin-bottom: 3rem;">
        <span>⏱️</span>
        <span>${t('welcomeEstimate', lang)}</span>
      </div>

      <!-- Audio Prompt Listener -->
      <button id="btn-welcome-audio" class="audio-prompt-bar">
        <span>🔊</span>
        <span>${t('listen', lang)}</span>
      </button>

      <!-- Primary Action CTA -->
      <button id="btn-welcome-start" class="btn btn-primary btn-huge" style="width: 100%; max-width: 480px; box-shadow: 0 10px 30px rgba(21, 128, 61, 0.35);">
        <span>${t('start', lang)}</span>
        <span style="font-size: 1.75rem;">➔</span>
      </button>

      <div style="margin-top: 2rem;">
        <button id="btn-welcome-help" style="font-size: var(--font-size-base); font-weight: 600; color: var(--muted-text); text-decoration: underline; background: none; border: none; cursor: pointer;">
          ${t('needHelp', lang)}
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.getElementById('btn-welcome-start')?.addEventListener('click', () => {
        resetSession();
        router.navigate('language');
      });

      const welcomeAudioBtn = document.getElementById('btn-welcome-audio');
      welcomeAudioBtn?.addEventListener('click', async () => {
        if (audioController.isSpeaking) {
          audioController.stop();
          welcomeAudioBtn.classList.remove('playing');
          return;
        }
        welcomeAudioBtn.classList.add('playing');
        await audioController.speak(t('welcomeAudioPrompt', appState.language), appState.language);
        welcomeAudioBtn.classList.remove('playing');
      });

      document.getElementById('btn-welcome-help')?.addEventListener('click', () => {
        router.openHelpModal();
      });
    },
  };
}
