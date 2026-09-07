/**
 * Screen 12: Completion Screen
 * Displays authoritative OPD token and clear instructions to wait in lounge.
 */

import { t } from '../i18n.js';
import { appState, resetSession } from '../state.js';
import { router } from '../router.js';

export function renderCompleteScreen() {
  const lang = appState.language;
  const tokenNumber = appState.patient?.identifier || `OPD-A104`;

  const html = `
    <div class="screen-card" style="text-align: center; align-items: center; max-width: 860px; margin: 0 auto;">
      <!-- Large Teal Success Icon -->
      <div style="font-size: 3.75rem; color: var(--teal); margin-bottom: 0.5rem;" aria-hidden="true">✓</div>

      <h1 class="kiosk-question-title" style="color: var(--primary); font-size: var(--font-size-2xl);">
        ${t('completeTitle', lang) || "You're all set."}
      </h1>

      <p style="font-size: var(--font-size-base); max-width: 580px; color: var(--text-secondary); line-height: 1.6;">
        ${t('completeSubtitle', lang) || 'Your clinical intake information and records have been sent to your doctor.'}
      </p>

      <!-- Large Glanceable OPD Token Badge -->
      <div class="token-display-badge">
        <span style="font-size: var(--font-size-xs); font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem;">
          ${t('completeTokenPrompt', lang) || 'YOUR OPD TOKEN NUMBER'}
        </span>
        <span class="token-number">${tokenNumber}</span>
      </div>

      <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem 2rem; max-width: 620px; font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: 2.25rem; line-height: 1.5;">
        📢 <strong>Please take your token</strong> and wait in the OPD consultation area. The doctor will call your token number shortly.
      </div>

      <!-- Finish CTA: Triggers complete session cleanup -->
      <button id="btn-complete-finish" class="btn btn-primary btn-huge" style="min-width: 280px;">
        <span>${t('finishSession', lang) || 'FINISH'}</span>
        <span aria-hidden="true">➔</span>
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
