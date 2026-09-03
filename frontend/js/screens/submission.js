/**
 * Screen 11: Submission Screen (Section 33)
 * Clear confirmation before dispatch. Never implies automated medical diagnosis.
 */

import { t } from '../i18n.js';
import { appState } from '../state.js';
import { router } from '../router.js';

export function renderSubmissionScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card" style="text-align: center; align-items: center; max-width: 850px;">
      <div style="font-size: 4rem; margin-bottom: 1rem;">📤</div>

      <h1 class="kiosk-question-title">
        ${t('readyToSend', lang)}
      </h1>

      <p style="font-size: var(--font-size-md); max-width: 600px; margin-bottom: 2.5rem; color: var(--text-secondary);">
        ${t('readyToSendSub', lang)}
      </p>

      <div style="display: flex; gap: 1.5rem; width: 100%; max-width: 550px;">
        <button id="btn-submit-back" class="btn btn-secondary" style="flex: 1; min-height: var(--touch-standard);">
          ← ${t('back', lang)}
        </button>

        <button id="btn-submit-confirm" class="btn btn-primary btn-huge" style="flex: 2;">
          <span>✓</span>
          <span>${t('submitToDoctor', lang)}</span>
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.getElementById('btn-submit-back')?.addEventListener('click', () => {
        router.back();
      });

      document.getElementById('btn-submit-confirm')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-submit-confirm');
        if (btn) {
          btn.innerHTML = `<span class="animate-spin">⏳</span> <span>Sending...</span>`;
          btn.setAttribute('disabled', 'true');
        }

        // Simulate submission turnaround (600ms)
        await new Promise((r) => setTimeout(r, 600));

        router.navigate('complete');
      });
    },
  };
}
