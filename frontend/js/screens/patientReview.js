/**
 * Screen 10: Patient Review Screen (Section 32)
 */

import { t, supportedLanguages } from '../i18n.js';
import { appState } from '../state.js';
import { router } from '../router.js';

export function renderPatientReviewScreen() {
  const lang = appState.language;
  const currentLangObj = supportedLanguages.find((l) => l.code === appState.language);

  // Format Duration string
  let durationStr = '—';
  if (appState.complaint.duration) {
    durationStr = `${appState.complaint.duration.value} ${appState.complaint.duration.unit || 'days'}`;
  }

  const html = `
    <div class="screen-card">
      <h1 class="kiosk-question-title">${t('reviewTitle', lang)}</h1>
      <p class="kiosk-question-subtitle">${t('reviewSubtitle', lang)}</p>

      <!-- 1. Patient Details Card -->
      <div class="review-card">
        <div class="review-card-header">
          <span>👤 ${t('reviewPatient', lang)}</span>
          <button class="btn btn-secondary btn-edit" data-target-screen="identify" style="min-height: 38px; padding: 0 1rem; font-size: var(--font-size-xs);">
            ✏️ ${t('edit', lang)}
          </button>
        </div>
        <div class="review-card-body">
          <strong>${appState.patient.name || 'New Walk-in Patient'}</strong>
          ${appState.patient.age ? ` • Age: ${appState.patient.age}` : ''}
          ${appState.patient.identifier ? ` • ID: ${appState.patient.identifier}` : ''}
        </div>
      </div>

      <!-- 2. Symptoms & Complaint Card -->
      <div class="review-card">
        <div class="review-card-header">
          <span>🩺 ${t('reviewSymptoms', lang)}</span>
          <button class="btn btn-secondary btn-edit" data-target-screen="chiefComplaint" style="min-height: 38px; padding: 0 1rem; font-size: var(--font-size-xs);">
            ✏️ ${t('edit', lang)}
          </button>
        </div>
        <div class="review-card-body">
          <div><strong>Primary Concern:</strong> ${appState.complaint.id || 'Not Specified'}</div>
          ${appState.complaint.textPatientSpoken ? `<div><strong>Voice Transcript:</strong> "${appState.complaint.textPatientSpoken}"</div>` : ''}
          <div style="margin-top: 0.5rem; display: flex; gap: 1.5rem; color: var(--text);">
            <span><strong>Duration:</strong> ${durationStr}</span>
            <span><strong>Severity:</strong> ${appState.complaint.severity || '—'}</span>
            <span><strong>Type:</strong> ${appState.complaint.character || '—'}</span>
          </div>
        </div>
      </div>

      <!-- 3. Documents Card -->
      <div class="review-card">
        <div class="review-card-header">
          <span>📄 ${t('reviewDocs', lang)}</span>
          <button class="btn btn-secondary btn-edit" data-target-screen="documentReview" style="min-height: 38px; padding: 0 1rem; font-size: var(--font-size-xs);">
            ✏️ ${t('edit', lang)}
          </button>
        </div>
        <div class="review-card-body">
          ${
            appState.documents.length > 0
              ? `Attached: <strong>${appState.documents.length} document(s)</strong> (${appState.documents.map((d) => d.type).join(', ')})`
              : 'No previous documents attached'
          }
        </div>
      </div>

      <!-- 4. Language & Consent Badges -->
      <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
        <div style="flex: 1; background: var(--surface-subtle); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); font-size: var(--font-size-sm);">
          <span style="color: var(--muted-text);">${t('reviewLanguage', lang)}:</span> <strong>${currentLangObj?.nativeName}</strong>
        </div>
        <div style="flex: 1; background: var(--surface-subtle); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); font-size: var(--font-size-sm);">
          <span style="color: var(--muted-text);">${t('reviewConsent', lang)}:</span> <strong>${appState.consent.granted ? '✓ Granted' : 'Declined'}</strong>
        </div>
      </div>

      <!-- Final Submit CTA -->
      <div style="display: flex; justify-content: flex-end;">
        <button id="btn-review-proceed" class="btn btn-primary btn-huge" style="min-width: 320px;">
          <span>${t('continue', lang)} ➔</span>
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.querySelectorAll('.btn-edit').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-target-screen');
          router.navigate(target);
        });
      });

      document.getElementById('btn-review-proceed')?.addEventListener('click', () => {
        router.navigate('submission');
      });
    },
  };
}
