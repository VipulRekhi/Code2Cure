/**
 * Screen 10: Complete Patient Review Screen
 * Final verification page: Comprehensive, structured, human-centric.
 * Sections: YOUR CONCERN, WHAT YOU TOLD US & QUESTIONS, YOUR RECORDS, FINAL CHECK.
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

  // Fetch verified backend ClinicalState summary if active session
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

  // Authoritative clinical state
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

  const examinationHistoryList = (loadedSummary?.examinationHistory && loadedSummary.examinationHistory.length > 0)
    ? loadedSummary.examinationHistory
    : appState.conversationHistory;

  // Q&A List
  const examResponsesHtml = examinationHistoryList.length > 0
    ? examinationHistoryList.map((item, idx) => {
        const rawText = item.patientAnswerRaw || item.originalTranscript || item.patientResponse || '';
        const normText = item.normalizedInterpretation || item.normalizedAnswer || item.selectedOption || rawText;
        const isVoice = item.inputMethod === 'VOICE' || Boolean(item.originalTranscript);
        const options = item.options || [];

        return `
          <div class="exam-turn-card" style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem;" data-turn-qid="${item.questionId}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
              <div style="flex: 1;">
                <div style="font-size: var(--font-size-xs); color: var(--primary); font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">
                  ${t('step', lang)} #${idx + 1}
                </div>
                <div style="font-weight: 700; font-size: var(--font-size-base); margin-bottom: 0.65rem; color: var(--primary);">
                  ${item.questionText || 'Clinical Question'}
                </div>

                <div style="background: var(--surface-subtle); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary); margin-bottom: 0.5rem;">
                  <div style="font-size: var(--font-size-sm); color: var(--text);">
                    <span style="color: var(--muted-text); font-weight: 600;">🗣️ ${t('youSaid', lang) || 'You said:'}</span> 
                    <strong>"${rawText}"</strong> 
                    ${isVoice ? '<span title="Spoken by voice" style="margin-left: 0.35rem; color: var(--primary); font-weight: 600;">🎙️ (Voice)</span>' : '<span title="Touch selected" style="margin-left: 0.35rem; color: var(--muted-text);">👆 (Touch)</span>'}
                  </div>
                  <div style="font-size: var(--font-size-sm); margin-top: 0.35rem; color: var(--teal);">
                    <span style="color: var(--muted-text); font-weight: 600;">✅ ${t('understoodAs', lang) || 'We understood:'}</span> 
                    <strong>${normText}</strong>
                  </div>
                </div>
              </div>

              <button class="btn btn-secondary btn-correct-turn" data-qid="${item.questionId}" style="min-height: 40px; padding: 0 0.85rem; font-size: var(--font-size-xs); white-space: nowrap;">
                ✎ ${t('changeAnswer', lang) || 'Edit answer'}
              </button>
            </div>

            <!-- Inline Correction Panel -->
            <div id="correction-panel-${item.questionId}" class="correction-panel" style="display: none; margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px dashed var(--border);">
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
    : `<div style="color: var(--muted-text); padding: 1rem;">${t('noQuestionsYet', lang) || 'No questions answered.'}</div>`;

  const html = `
    <div class="screen-card" style="max-width: 1080px; margin: 0 auto;">
      <h1 class="kiosk-question-title" style="color: var(--primary);">
        ${t('reviewTitle', lang)}
      </h1>
      <p class="kiosk-question-subtitle">
        ${t('reviewSubtitle', lang)}
      </p>

      <!-- Section 1: YOUR CONCERN -->
      <div class="review-card">
        <div class="review-card-header">
          <span>🩺 YOUR CONCERN (${t('reviewSymptoms', lang)})</span>
          <button class="btn btn-secondary btn-edit" data-target-screen="chiefComplaint" style="min-height: 36px; padding: 0 0.85rem; font-size: var(--font-size-xs);">
            ✎ ${t('edit', lang) || 'Edit'}
          </button>
        </div>
        <div class="review-card-body">
          <div style="font-size: var(--font-size-base); font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">
            ${primaryConcernDisplay}
          </div>
          ${appState.complaint.textPatientSpoken ? `<div style="margin-bottom: 0.5rem;"><strong>Patient Words:</strong> "${appState.complaint.textPatientSpoken}"</div>` : ''}
          <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; color: var(--text); font-size: var(--font-size-sm); margin-top: 0.5rem;">
            <span><strong>Duration:</strong> ${durationDisplay}</span>
            <span><strong>Severity:</strong> ${severityDisplay}</span>
            ${locationData ? `<span><strong>Location:</strong> ${locationData}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Section 2: WHAT YOU TOLD US & FOLLOW-UP QUESTIONS -->
      <div class="review-card">
        <div class="review-card-header">
          <span>📋 WHAT YOU TOLD US & FOLLOW-UP QUESTIONS</span>
          <span style="font-size: var(--font-size-xs); color: var(--muted-text); font-weight: 600;">
            ${examinationHistoryList.length} recorded
          </span>
        </div>
        <div class="review-card-body" style="background: var(--surface-subtle);">
          ${examResponsesHtml}
        </div>
      </div>

      <!-- Section 3: YOUR RECORDS -->
      <div class="review-card">
        <div class="review-card-header">
          <span>📄 YOUR RECORDS (${t('reviewDocs', lang)})</span>
          <button class="btn btn-secondary btn-edit" data-target-screen="documentReview" style="min-height: 36px; padding: 0 0.85rem; font-size: var(--font-size-xs);">
            ✎ ${t('edit', lang) || 'Edit'}
          </button>
        </div>
        <div class="review-card-body">
          ${
            appState.documents.length > 0
              ? `
            <div style="margin-bottom: 0.5rem;">Attached: <strong>${appState.documents.length} document(s)</strong></div>
            <div style="display: flex; flex-direction: column; gap: 0.65rem;">
              ${appState.documents.map((d) => `
                <div style="font-size: var(--font-size-xs); background: var(--surface); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--primary);">📄 ${escapeHtml(d.name)}</strong>
                    <span style="color: var(--teal); font-weight: 700;">✓ Scanned by PaddleOCR</span>
                  </div>
                  ${d.extractedData?.medications?.length ? `
                    <div style="margin-top: 0.35rem; color: var(--text-secondary);">
                      <strong>Extracted:</strong> ${d.extractedData.medications.map((m) => escapeHtml(m.drugName) + (m.dose && m.dose !== 'Not detected' ? ` (${escapeHtml(m.dose)})` : '')).join(', ')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
            `
              : 'No past medical papers attached.'
          }
        </div>
      </div>

      <!-- Section 4: FINAL CHECK (Identity, Language, Consent) -->
      <div class="review-card">
        <div class="review-card-header">
          <span>👤 FINAL CHECK (Patient & Registration Details)</span>
          <button class="btn btn-secondary btn-edit" data-target-screen="identify" style="min-height: 36px; padding: 0 0.85rem; font-size: var(--font-size-xs);">
            ✎ ${t('edit', lang) || 'Edit'}
          </button>
        </div>
        <div class="review-card-body" style="display: flex; flex-wrap: wrap; gap: 2rem;">
          <div><strong>Patient:</strong> ${appState.patient.name || 'Walk-in Patient'}</div>
          ${appState.patient.identifier ? `<div><strong>ID:</strong> ${appState.patient.identifier}</div>` : ''}
          <div><strong>Language:</strong> ${currentLangObj?.nativeName || 'English'}</div>
          <div><strong>Consent:</strong> ${appState.consent.granted ? '<span style="color: var(--teal); font-weight: 700;">✓ Granted</span>' : 'Declined'}</div>
        </div>
      </div>

      <!-- Bottom Navigation Row -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-subtle);">
        <button id="btn-review-back" class="btn btn-secondary" style="min-height: 52px;">
          ← ${t('back', lang)}
        </button>

        <button id="btn-review-proceed" class="btn btn-primary btn-huge" style="min-width: 260px;">
          <span>${t('continue', lang)}</span>
          <span aria-hidden="true">➔</span>
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

      document.getElementById('btn-review-back')?.addEventListener('click', () => {
        if (appState.documents.length > 0) {
          router.navigate('documentReview');
        } else {
          router.navigate('documents');
        }
      });
    },
  };
}
