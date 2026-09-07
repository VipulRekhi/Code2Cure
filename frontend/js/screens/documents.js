/**
 * Screen 8: Documents Prompt Screen
 * Simple choice asking if patient has physical papers/reports to scan.
 */

import { t } from '../i18n.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { audioController } from '../audio.js';

export function renderDocumentsScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card" style="max-width: 900px; margin: 0 auto; text-align: center; align-items: center;">
      <!-- Audio Narration Pill -->
      <button id="btn-docs-audio" class="audio-prompt-bar">
        <span aria-hidden="true">🔊</span>
        <span>${t('listen', lang)}</span>
      </button>

      <div style="font-size: 3.5rem; margin-bottom: 0.75rem; color: var(--primary);" aria-hidden="true">📄</div>

      <h1 class="kiosk-question-title" style="color: var(--primary); max-width: 700px;">
        ${t('docQuestionTitle', lang)}
      </h1>

      <p style="font-size: var(--font-size-base); max-width: 620px; margin-bottom: 2.5rem; color: var(--text-secondary); line-height: 1.6;">
        ${t('docQuestionSubtitle', lang)}
      </p>

      <!-- Large Clear Choices -->
      <div style="display: flex; flex-direction: column; gap: 1.25rem; width: 100%; max-width: 500px;">
        <button id="btn-docs-yes" class="btn btn-primary btn-huge" style="width: 100%;">
          <span aria-hidden="true">📸</span>
          <span>${t('haveDocsYes', lang) || 'Yes, I have records to scan'}</span>
        </button>

        <button id="btn-docs-no" class="btn btn-secondary btn-huge" style="width: 100%;">
          <span>${t('haveDocsNo', lang) || 'No, continue without papers'}</span>
          <span aria-hidden="true">➔</span>
        </button>
      </div>

      <div style="margin-top: 2.5rem; display: flex; justify-content: flex-start; width: 100%;">
        <button id="btn-docs-back" class="btn btn-secondary" style="min-height: 48px;">
          ← ${t('back', lang)}
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.getElementById('btn-docs-yes')?.addEventListener('click', () => {
        router.navigate('documentReview');
      });

      document.getElementById('btn-docs-no')?.addEventListener('click', () => {
        router.navigate('patientReview');
      });

      document.getElementById('btn-docs-back')?.addEventListener('click', () => {
        router.navigate('conversation');
      });

      const audioBtn = document.getElementById('btn-docs-audio');
      audioBtn?.addEventListener('click', async () => {
        if (audioController.isSpeaking) {
          audioController.stop();
          audioBtn.classList.remove('playing');
          return;
        }
        audioBtn.classList.add('playing');
        await audioController.speak(t('docQuestionTitle', appState.language), appState.language);
        audioBtn.classList.remove('playing');
      });
    },
  };
}
