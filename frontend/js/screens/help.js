/**
 * Screen 13: Global Help Overlay (Section 35)
 */

import { t } from '../i18n.js';
import { appState } from '../state.js';
import { openModal, closeModal } from '../components/modal.js';
import { audioController } from '../audio.js';

export function showHelpModal(customMessage = null) {
  const lang = appState.language;

  const contentHtml = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      ${customMessage ? `<div style="background: var(--warning-bg); color: var(--warning); padding: 1rem; border-radius: var(--radius-sm); font-weight: 600;">${customMessage}</div>` : ''}

      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <span style="font-size: 1.5rem;">🎙</span>
        <div>${t('helpItem1', lang)}</div>
      </div>

      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <span style="font-size: 1.5rem;">↩️</span>
        <div>${t('helpItem2', lang)}</div>
      </div>

      <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle);">
        <button id="btn-call-nurse" class="btn btn-secondary" style="width: 100%; border-color: var(--primary); color: var(--primary-dark);">
          👩‍⚕️ ${t('askStaff', lang)}
        </button>
      </div>

      <div id="nurse-alert-msg" style="display: none; background: var(--success-bg); color: var(--success); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600;">
        ${t('staffAlerted', lang)}
      </div>
    </div>
  `;

  openModal({
    title: `❓ ${t('helpTitle', lang)}`,
    contentHtml,
    onClose: () => {},
  });

  document.getElementById('btn-call-nurse')?.addEventListener('click', () => {
    const alertBox = document.getElementById('nurse-alert-msg');
    if (alertBox) {
      alertBox.style.display = 'block';
      audioController.speak(t('staffAlerted', lang), lang);
    }
  });
}
