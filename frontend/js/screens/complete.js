/**
 * Screen 12: Completion Screen (Section 34)
 */

import { t } from '../i18n.js';
import { appState, resetSession } from '../state.js';
import { router } from '../router.js';

export function renderCompleteScreen() {
  const lang = appState.language;
  const tokenNumber = `OPD-A104`;

  const html = `
    <div class="screen-card" style="text-align: center; align-items: center; max-width: 850px;">
      <div style="font-size: 4rem; color: var(--primary); margin-bottom: 0.5rem;">✅</div>

      <h1 class="kiosk-question-title" style="color: var(--primary-dark);">
        ${t('completeTitle', lang)}
      </h1>

      <p style="font-size: var(--font-size-md); max-width: 600px; color: var(--text-secondary);">
        ${t('completeSubtitle', lang)}
      </p>

      <!-- Large Glanceable Token Badge (Section 34) -->
      <div class="token-display-badge">
        <span style="font-size: var(--font-size-sm); font-weight: 700; color: var(--muted-text); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
          ${t('completeTokenPrompt', lang)}
        </span>
        <span class="token-number">${tokenNumber}</span>
      </div>

      <div style="background: var(--surface-subtle); border-radius: var(--radius-md); padding: 1.25rem 2rem; max-width: 650px; font-size: var(--font-size-base); color: var(--text-secondary); margin-bottom: 2.5rem;">
        📢 ${t('completeWaitingNote', lang)}
      </div>

      <button id="btn-complete-finish" class="btn btn-primary btn-huge" style="min-width: 320px;">
        <span>${t('finishSession', lang)} ➔</span>
      </button>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.getElementById('btn-complete-finish')?.addEventListener('click', () => {
        resetSession();
        router.navigate('welcome');
      });
    },
  };
}
