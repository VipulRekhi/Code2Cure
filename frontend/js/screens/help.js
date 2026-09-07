/**
 * Screen 13: Global Help Overlay
 * High-contrast, icon-paired guidance for all literacy levels.
 */

import { t } from '../i18n.js';
import { appState } from '../state.js';
import { openModal, closeModal } from '../components/modal.js';
import { audioController } from '../audio.js';
import { router } from '../router.js';

export function showHelpModal(customMessage = null) {
  const lang = appState.language;

  const contentHtml = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      ${customMessage ? `
        <div style="background: var(--warning-bg); border: 1px solid var(--warning-border); color: var(--warning); padding: 1rem; border-radius: var(--radius-sm); font-weight: 600; font-size: var(--font-size-sm);">
          ${customMessage}
        </div>
      ` : ''}

      <!-- Help Actions -->
      <div style="display: flex; flex-direction: column; gap: 0.85rem;">
        <button id="btn-hear-instructions" class="btn btn-secondary" style="justify-content: flex-start; min-height: 54px; font-size: var(--font-size-sm); text-align: left; padding: 0 1.25rem;">
          <span style="font-size: 1.35rem;" aria-hidden="true">🔊</span>
          <span>${t('listen', lang) || 'Hear instructions spoken aloud'}</span>
        </button>

        <button id="btn-help-goback" class="btn btn-secondary" style="justify-content: flex-start; min-height: 54px; font-size: var(--font-size-sm); text-align: left; padding: 0 1.25rem;">
          <span style="font-size: 1.35rem;" aria-hidden="true">↩️</span>
          <span>${t('back', lang) || 'Go back to previous screen'}</span>
        </button>

        <button id="btn-call-nurse" class="btn btn-primary" style="justify-content: flex-start; min-height: 54px; font-size: var(--font-size-sm); text-align: left; padding: 0 1.25rem;">
          <span style="font-size: 1.35rem;" aria-hidden="true">👩‍⚕️</span>
          <span>${t('askStaff', lang) || 'Ask staff for assistance'}</span>
        </button>
      </div>

      <!-- Staff Notification Confirmation -->
      <div id="nurse-alert-msg" style="display: none; background: var(--success-bg); border: 1px solid var(--success-border); color: var(--teal); padding: 0.85rem 1rem; border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: 700;">
        ✓ ${t('staffAlerted', lang) || 'Hospital staff has been notified. An attendant is arriving shortly.'}
      </div>
    </div>
  `;

  openModal({
    title: `❓ ${t('helpTitle', lang) || 'Need Assistance?'}`,
    contentHtml,
    onClose: () => {},
  });

  // Attach modal internal handlers
  document.getElementById('btn-hear-instructions')?.addEventListener('click', async () => {
    const helpVoiceText = `${t('helpItem1', lang)}. ${t('helpItem2', lang)}.`;
    await audioController.speak(helpVoiceText, lang);
  });

  document.getElementById('btn-help-goback')?.addEventListener('click', () => {
    closeModal();
    router.back();
  });

  document.getElementById('btn-call-nurse')?.addEventListener('click', () => {
    const alertBox = document.getElementById('nurse-alert-msg');
    if (alertBox) {
      alertBox.style.display = 'block';
      audioController.speak(t('staffAlerted', lang), lang);
    }
  });
}
