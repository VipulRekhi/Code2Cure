/**
 * Screen 10: Patient Review Screen (Section 32)
 */

import { t, supportedLanguages } from '../i18n.js';
import { appState, registerResetCallback } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';

let loadedSummary = null;
let isLoadingSummary = false;

export function resetPatientReviewSummary() {
  loadedSummary = null;
  isLoadingSummary = false;
}

registerResetCallback(() => {
  resetPatientReviewSummary();
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    : appState.complaint.location;  const examinationHistoryList = (loadedSummary?.examinationHistory && loadedSummary.examinationHistory.length > 0)
    ? loadedSummary.examinationHistory
    : appState.conversationHistory;

  const examResponsesHtml = examinationHistoryList.length > 0
    ? examinationHistoryList.map((item, idx) => {
        const rawText = item.patientAnswerRaw || item.originalTranscript || item.patientResponse || '';
        const normText = item.normalizedInterpretation || item.normalizedAnswer || item.selectedOption || rawText;
        const isVoice = item.inputMethod === 'VOICE' || Boolean(item.originalTranscript);
        const options = item.options || [];

        return `
          <div class="exam-turn-card" style="background: var(--surface-subtle); border: 2px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem;" data-turn-qid="${item.questionId}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
              <div style="flex: 1;">
                <div style="font-size: var(--font-size-xs); color: var(--primary); font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">
                  ${t('question', lang)} #${idx + 1}
                </div>
                <div style="font-weight: 700; font-size: var(--font-size-base); margin-bottom: 0.75rem; color: var(--text);">
                  ${item.questionText || 'Clinical Question'}
                </div>

                <div style="background: var(--surface); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary); margin-bottom: 0.5rem;">
                  <div style="font-size: var(--font-size-sm); color: var(--text);">
                    <span style="color: var(--muted-text); font-weight: 600;">🗣️ ${t('youSaid', lang)}:</span> 
                    <strong>"${rawText}"</strong> 
                    ${isVoice ? '<span title="Spoken by voice" style="margin-left: 0.35rem;">🎙️ (Voice)</span>' : '<span title="Touch selected" style="margin-left: 0.35rem;">👆 (Touch)</span>'}
                  </div>
                  <div style="font-size: var(--font-size-sm); margin-top: 0.35rem; color: var(--success);">
                    <span style="color: var(--muted-text); font-weight: 600;">✅ ${t('understoodAs', lang)}:</span> 
                    <strong>${normText}</strong>
                  </div>
                </div>
              </div>

              <button class="btn btn-secondary btn-correct-turn" data-qid="${item.questionId}" style="min-height: 40px; padding: 0 1rem; font-size: var(--font-size-xs); white-space: nowrap;">
                ✏️ ${t('changeAnswer', lang)}
              </button>
            </div>

            <!-- Inline Correction Panel (hidden by default, toggled on click) -->
            <div id="correction-panel-${item.questionId}" class="correction-panel" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border);">
              <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--muted-text); margin-bottom: 0.5rem;">
                Select corrected answer:
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${
                  options.length > 0
                    ? options.map((opt) => {
                        const optVal = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt.label) : opt;
                        const optLbl = typeof opt === 'object' ? (opt.label || opt.labels?.mr || opt.labels?.en || optVal) : opt;
                        return `<button class="btn btn-secondary btn-apply-correction" data-qid="${item.questionId}" data-val="${optVal}" style="min-height: 38px; font-size: var(--font-size-xs);">${optLbl}</button>`;
                      }).join('')
                    : `
                      <button class="btn btn-secondary btn-apply-correction" data-qid="${item.questionId}" data-val="हो / Yes" style="min-height: 38px; font-size: var(--font-size-xs);">हो / Yes</button>
                      <button class="btn btn-secondary btn-apply-correction" data-qid="${item.questionId}" data-val="नाही / No" style="min-height: 38px; font-size: var(--font-size-xs);">नाही / No</button>
                      <button class="btn btn-secondary btn-apply-correction" data-qid="${item.questionId}" data-val="माहित नाही / Don't know" style="min-height: 38px; font-size: var(--font-size-xs);">माहित नाही / Don't know</button>
                    `
                }
              </div>
            </div>
          </div>
        `;
      }).join('')
    : `<div style="color: var(--muted-text); padding: 1rem;">${t('noQuestionsYet', lang)}</div>`;

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

      <!-- 2. Clinical Summary Card (Tier A) -->
      <div class="review-card">
        <div class="review-card-header">
          <span>🩺 ${t('reviewSymptoms', lang)} — Clinical Summary</span>
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

      <!-- 3. Complete Examination Responses (Tier B - Phase 7 Section 10, 11, 12, 13) -->
      <div class="review-card" style="border: 2px solid var(--primary-light, var(--primary));">
        <div class="review-card-header" style="background: rgba(30, 90, 180, 0.06);">
          <span>📋 ${t('reviewExamResponses', lang)}</span>
          <span style="font-size: var(--font-size-xs); color: var(--muted-text);">
            ${examinationHistoryList.length} questions answered
          </span>
        </div>
        <div class="review-card-body" style="padding-top: 1rem;">
          <p style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: 1.25rem;">
            ${t('reviewExamResponsesSub', lang)}
          </p>
          ${examResponsesHtml}
        </div>
      </div>

      <!-- 4. Documents Card -->
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
              ? `
            <div>Attached: <strong>${appState.documents.length} document(s)</strong></div>
            <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
              ${appState.documents.map((d) => `
                <div style="font-size: var(--font-size-xs); background: var(--surface-subtle); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>📄 ${escapeHtml(d.name)}</strong>
                    <span style="color: var(--success); font-weight: 600;">✓ PaddleOCR Scanned</span>
                  </div>
                  ${d.extractedData?.medications?.length ? `
                    <div style="margin-top: 0.25rem; color: var(--text-secondary);">
                      <strong>Medications:</strong> ${d.extractedData.medications.map((m) => escapeHtml(m.drugName) + (m.dose && m.dose !== 'Not detected' ? ` (${escapeHtml(m.dose)})` : '')).join(', ')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
            `
              : 'No previous documents attached'
          }
        </div>
      </div>

      <!-- 5. Language & Consent Badges -->
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
      // Screen navigation for general edits
      document.querySelectorAll('.btn-edit').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-target-screen');
          router.navigate(target);
        });
      });

      // Toggle inline correction panels
      document.querySelectorAll('.btn-correct-turn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const qid = btn.getAttribute('data-qid');
          const panel = document.getElementById(`correction-panel-${qid}`);
          if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
          }
        });
      });

      // Apply inline answer correction
      document.querySelectorAll('.btn-apply-correction').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const qid = btn.getAttribute('data-qid');
          const newVal = btn.getAttribute('data-val');

          btn.innerHTML = '⏳ Updating...';

          if (appState.backendSessionId) {
            try {
              const res = await api.updateClinicalResponse(appState.backendSessionId, qid, {
                newResponse: newVal,
                normalizedValue: newVal,
                inputMethod: 'TOUCH',
                language: appState.language,
              });

              if (res?.success && res.data) {
                loadedSummary = res.data.clinicalSummary;
              }
            } catch (err) {
              console.warn('[Review] Error updating answer:', err);
            }
          }

          // Update local conversationHistory entry
          const item = appState.conversationHistory.find((c) => c.questionId === qid);
          if (item) {
            item.patientResponse = newVal;
            item.normalizedAnswer = newVal;
            item.selectedOption = newVal;
          }

          router.renderCurrentScreen();
        });
      });

      document.getElementById('btn-review-proceed')?.addEventListener('click', () => {
        router.navigate('submission');
      });
    },
  };
}

