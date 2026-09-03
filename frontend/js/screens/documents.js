/**
 * Screen 8: Documents Prompt Screen (Section 29)
 */

import { t } from '../i18n.js';
import { appState } from '../state.js';
import { router } from '../router.js';

export function renderDocumentsScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card" style="text-align: center; align-items: center;">
      <div style="font-size: 3.5rem; margin-bottom: 1rem;">📄</div>

      <h1 class="kiosk-question-title">
        ${t('docQuestionTitle', lang)}
      </h1>

      <p style="font-size: var(--font-size-md); max-width: 650px; margin-bottom: 2.5rem; color: var(--text-secondary);">
        ${t('docQuestionSubtitle', lang)}
      </p>

      <div style="display: flex; flex-direction: column; gap: 1.25rem; width: 100%; max-width: 550px;">
        <button id="btn-docs-yes" class="btn btn-primary btn-huge" style="width: 100%;">
          <span>📸</span>
          <span>${t('haveDocsYes', lang)}</span>
        </button>

        <button id="btn-docs-no" class="btn btn-secondary btn-huge" style="width: 100%;">
          <span>${t('haveDocsNo', lang)} ➔</span>
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
    },
  };
}
