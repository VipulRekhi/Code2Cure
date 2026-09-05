/**
 * Screen 10: Patient Review Screen (Section 32)
 */

import { t, supportedLanguages } from '../i18n.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';

let loadedSummary = null;
let isLoadingSummary = false;

export function resetPatientReviewSummary() {
  loadedSummary = null;
  isLoadingSummary = false;
}

function formatPrimaryConcern(concernId, lang) {
  if (!concernId) return t('notProvided', lang);
  const mapping = {
    CHEST_PAIN: 'cChestPain',
    chest_pain: 'cChestPain',
    'symptom.pain.chest': 'cChestPain',
    KNEE_PAIN: 'cKneePain',
    knee_pain: 'cKneePain',
    'symptom.pain.knee': 'cKneePain',
    DIARRHEA: 'cDiarrhea',
    diarrhea: 'cDiarrhea',
    'symptom.diarrhea': 'cDiarrhea',
    pain: 'cPain',
    'symptom.pain': 'cPain',
    FEVER: 'cFever',
    fever: 'cFever',
    'symptom.fever': 'cFever',
    COUGH: 'cCough',
    cough: 'cCough',
    'symptom.cough': 'cCough',
    BREATHING: 'cBreathing',
    breathing: 'cBreathing',
    'symptom.dyspnea': 'cBreathing',
    HEADACHE: 'cHeadache',
    headache: 'cHeadache',
    'symptom.headache': 'cHeadache',
    STOMACH: 'cStomach',
    stomach: 'cStomach',
    'symptom.vomiting': 'cStomach',
    'symptom.pain.abdominal': 'cStomach',
    MEDICATION: 'cMedication',
    OTHER: 'cOther',
  };

  const key = mapping[concernId];
  if (key) return t(key, lang);
  return concernId;
}

function formatDuration(durationObj, lang) {
  if (!durationObj) return t('notProvided', lang);
  if (typeof durationObj === 'string' || typeof durationObj === 'number') {
    return `${durationObj} days`;
  }
  if (typeof durationObj === 'object') {
    if (durationObj.min !== undefined && durationObj.max !== undefined) {
      return `${durationObj.min}–${durationObj.max} ${durationObj.unit || 'days'}`;
    }
    const val = durationObj.amount ?? durationObj.value;
    if (val !== undefined && val !== null && !isNaN(val)) {
      return `${val} ${durationObj.unit || 'days'}`;
    }
  }
  return t('notProvided', lang);
}

function formatSeverity(severityVal, lang) {
  if (!severityVal || severityVal === 'unknown') {
    return t('notProvided', lang);
  }
  const sevStr = String(severityVal).toUpperCase();
  if (sevStr === 'MILD') return t('optMild', lang) || 'Mild';
  if (sevStr === 'MODERATE') return t('optModerate', lang) || 'Moderate';
  if (sevStr === 'SEVERE') return t('optSevere', lang) || 'Severe';
  if (sevStr === 'UNBEARABLE') return t('optVerySevere', lang) || 'Very Severe';
  return severityVal;
}

export function renderPatientReviewScreen() {
  const lang = appState.language;
  const currentLangObj = supportedLanguages.find((l) => l.code === appState.language);

  // If backend session exists and summary not loaded yet, fetch it asynchronously
  if (appState.backendSessionId && !loadedSummary && !isLoadingSummary) {
    isLoadingSummary = true;
    api.getClinicalSummary(appState.backendSessionId).then((res) => {
      isLoadingSummary = false;
      if (res?.success && res.data) {
        loadedSummary = res.data;
        router.renderCurrentScreen();
      }
    }).catch(() => {
      isLoadingSummary = false;
    });
  }

  // Derive display values prioritizing verified backend ClinicalState summary when present
  const primaryConcernKey = (appState.backendSessionId && loadedSummary)
    ? loadedSummary.primaryConcern
    : appState.complaint.id;
  const primaryConcernDisplay = formatPrimaryConcern(primaryConcernKey, lang);

  const durationData = (appState.backendSessionId && loadedSummary)
    ? loadedSummary.duration
    : appState.complaint.duration;
  const durationDisplay = formatDuration(durationData, lang);

  const severityData = (appState.backendSessionId && loadedSummary)
    ? loadedSummary.severity
    : appState.complaint.severity;
  const severityDisplay = formatSeverity(severityData, lang);

  const locationData = (appState.backendSessionId && loadedSummary)
    ? loadedSummary.location
    : appState.complaint.location;

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
          <div><strong>Primary Concern:</strong> ${primaryConcernDisplay}</div>
          ${appState.complaint.textPatientSpoken ? `<div><strong>Voice Transcript:</strong> "${appState.complaint.textPatientSpoken}"</div>` : ''}
          <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 1.5rem; color: var(--text);">
            <span><strong>Duration:</strong> ${durationDisplay}</span>
            <span><strong>Severity:</strong> ${severityDisplay}</span>
            ${locationData ? `<span><strong>Location:</strong> ${locationData}</span>` : ''}
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
