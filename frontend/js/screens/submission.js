/**
 * Screen 11: Reassuring Submission Screen
 * Reassures patient before dispatching clinical case to clinician.
 */

import { t } from '../i18n.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';

export function renderSubmissionScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card" style="text-align: center; align-items: center; max-width: 860px; margin: 0 auto;">
      <div style="font-size: 3.5rem; margin-bottom: 1rem; color: var(--primary);" aria-hidden="true">📤</div>

      <h1 class="kiosk-question-title" style="color: var(--primary); font-size: var(--font-size-2xl);">
        ${t('readyToSend', lang) || 'Ready to share your information?'}
      </h1>

      <p style="font-size: var(--font-size-base); max-width: 580px; margin-bottom: 2rem; color: var(--text-secondary); line-height: 1.6;">
        ${t('readyToSendSub', lang) || 'Your symptoms, answers, and medical documents will be sent directly to your doctor for consultation.'}
      </p>

      <!-- Three Reassurance Badges -->
      <div style="display: flex; gap: 1.5rem; justify-content: center; margin-bottom: 2.5rem; width: 100%; max-width: 600px;">
        <div style="flex: 1; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
          <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🔒</div>
          <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--primary);">Secure</div>
          <div style="font-size: 0.75rem; color: var(--muted-text); margin-top: 0.15rem;">DPDP Protected</div>
        </div>

        <div style="flex: 1; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
          <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">👁️</div>
          <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--primary);">Reviewed by you</div>
          <div style="font-size: 0.75rem; color: var(--muted-text); margin-top: 0.15rem;">Accurate facts</div>
        </div>

        <div style="flex: 1; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
          <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🩺</div>
          <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--primary);">Ready for clinician</div>
          <div style="font-size: 0.75rem; color: var(--muted-text); margin-top: 0.15rem;">OPD consult ready</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 1.25rem; width: 100%; max-width: 520px;">
        <button id="btn-submit-back" class="btn btn-secondary" style="flex: 1; min-height: 56px;">
          ← ${t('back', lang) || 'GO BACK'}
        </button>

        <button id="btn-submit-confirm" class="btn btn-primary btn-huge" style="flex: 2; min-height: 56px;">
          <span>✓</span>
          <span>${t('submitToDoctor', lang) || 'SUBMIT TO CLINICIAN →'}</span>
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.getElementById('btn-submit-back')?.addEventListener('click', () => {
        router.navigate('patientReview');
      });

      document.getElementById('btn-submit-confirm')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-submit-confirm');
        if (btn) {
          btn.innerHTML = `<span>⏳</span> <span>Sending to doctor...</span>`;
          btn.setAttribute('disabled', 'true');
        }

        if (appState.backendSessionId) {
          try {
            await api.submitToDoctor(appState.backendSessionId);
          } catch (err) {
            console.warn('[Submission] Failed to dispatch payload to doctor:', err);
          }
        } else {
          await new Promise((r) => setTimeout(r, 400));
        }

        router.navigate('complete');
      });
    },
  };
}
