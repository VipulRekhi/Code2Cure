/**
 * Screen 10: Complete Patient-Verified Health Summary Screen (Phase 8)
 * 
 * Strict Clinical & Aesthetic Design:
 * - Patient-friendly healthcare summary ("What did I tell MediKiosk?")
 * - Sections:
 *   1. Your Main Concern (with verbatim patient words & provenance)
 *   2. What You Told Us (Quick clinical facts)
 *   3. Other Symptoms (separated from primary concern)
 *   4. Health History (past medical conditions)
 *   5. Medicines & Allergies (patient-reported vs document-extracted separated + conflict detection)
 *   6. Uploaded Records (OCR extractions + "Not detected" flags)
 *   7. Things to Review (highlighting uncertain items/conflicts)
 *   8. Full Questions & Answers (complete verifiable history with inline correction)
 * - Safe error handling: friendly message on network failure, zero stack traces.
 */

import { t, supportedLanguages } from '../i18n.js';
import { appState, registerResetCallback } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';

let loadedSummary = null;
let isLoadingSummary = false;
let summaryLoadError = false;
let isPatientConfirmed = false;

export function resetPatientReviewSummary() {
  loadedSummary = null;
  isLoadingSummary = false;
  summaryLoadError = false;
  isPatientConfirmed = false;
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
  return String(concernId).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDuration(durationObj, lang) {
  if (!durationObj) return t('notProvided', lang);
  if (typeof durationObj === 'string' || typeof durationObj === 'number') {
    return `${durationObj} days`;
  }
  if (typeof durationObj === 'object') {
    if (durationObj.display) return durationObj.display;
    if (durationObj.min !== undefined && durationObj.max !== undefined) {
      return `${durationObj.min}–${durationObj.max} ${durationObj.unit || 'days'}`;
    }
    const val = durationObj.amount ?? durationObj.value;
    if (val !== undefined && val !== null && !isNaN(val)) {
      return `${val} ${durationObj.unit || 'days'}`;
    }
    if (durationObj.raw) return String(durationObj.raw);
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
  const currentLangObj = supportedLanguages.find((l) => l.code === appState.language) || supportedLanguages[0];

  // Fetch canonical clinical summary from backend if session active
  if (appState.backendSessionId && !loadedSummary && !isLoadingSummary && !summaryLoadError) {
    isLoadingSummary = true;
    api.getClinicalSummary(appState.backendSessionId)
      .then((res) => {
        isLoadingSummary = false;
        if (res?.success && res.data) {
          loadedSummary = res.data;
          summaryLoadError = false;
          router.renderCurrentScreen();
        } else {
          summaryLoadError = true;
          router.renderCurrentScreen();
        }
      })
      .catch((err) => {
        console.warn('[Review] Failed to load clinical summary:', err);
        isLoadingSummary = false;
        summaryLoadError = true;
        router.renderCurrentScreen();
      });
  }

  // Graceful Error State
  if (summaryLoadError) {
    return {
      html: `
        <div class="screen-card" style="text-align: center; max-width: 620px; margin: 3rem auto; padding: 2.5rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;" aria-hidden="true">⚠️</div>
          <h2 style="color: var(--primary); font-size: var(--font-size-xl); margin-bottom: 0.75rem;">
            ${t('loadSummaryError', lang) || "We couldn't load your summary right now."}
          </h2>
          <p style="color: var(--muted-text); font-size: var(--font-size-sm); margin-bottom: 2rem;">
            Please tap below to try again or go back to make changes.
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button id="btn-summary-retry" class="btn btn-primary" style="min-height: 52px; min-width: 150px;">
              🔄 ${t('tryAgain', lang) || 'Try again'}
            </button>
            <button id="btn-summary-back" class="btn btn-secondary" style="min-height: 52px; min-width: 150px;">
              ← ${t('goBack', lang) || 'Go back'}
            </button>
          </div>
        </div>
      `,
      attachEvents: () => {
        document.getElementById('btn-summary-retry')?.addEventListener('click', () => {
          summaryLoadError = false;
          isLoadingSummary = false;
          loadedSummary = null;
          router.renderCurrentScreen();
        });
        document.getElementById('btn-summary-back')?.addEventListener('click', () => {
          router.navigate(appState.documents.length > 0 ? 'documentReview' : 'documents');
        });
      },
    };
  }

  // Authoritative clinical fields
  const primaryConcernKey = (appState.backendSessionId && loadedSummary)
    ? (loadedSummary.primaryConcernDetails?.concern || loadedSummary.primaryConcern)
    : appState.complaint.id;
  const primaryConcernDisplay = formatPrimaryConcern(primaryConcernKey, lang);

  const durationData = (appState.backendSessionId && loadedSummary)
    ? (loadedSummary.durationDetails || loadedSummary.duration)
    : appState.complaint.duration;
  const durationDisplay = formatDuration(durationData, lang);

  const severityData = (appState.backendSessionId && loadedSummary)
    ? (loadedSummary.severityDetails?.value || loadedSummary.severity)
    : appState.complaint.severity;
  const severityDisplay = formatSeverity(severityData, lang);

  const locationData = (appState.backendSessionId && loadedSummary)
    ? (loadedSummary.locationDetails?.value || loadedSummary.location)
    : appState.complaint.location;

  const rawPatientCcQuote = loadedSummary?.primaryConcernDetails?.originalWording ||
    appState.complaint.textPatientSpoken ||
    appState.complaint.initialComplaintTranscript ||
    null;

  // Associated Symptoms (distinct from primary concern)
  const associatedSymptomsList = loadedSummary?.associatedSymptoms || [];
  // Relevant History
  const relevantHistoryList = loadedSummary?.relevantHistory || [];
  // Medications
  const patientMeds = loadedSummary?.medications?.patientReported || [];
  const docMeds = loadedSummary?.medications?.documentExtracted || [];
  const medConflicts = loadedSummary?.medications?.conflicts || [];
  // Allergies
  const allergyData = loadedSummary?.allergies || null;
  // Documents
  const documentsList = (loadedSummary?.documents && loadedSummary.documents.length > 0)
    ? loadedSummary.documents
    : appState.documents;
  // Uncertain items
  const uncertainItemsList = loadedSummary?.uncertainItems || [];

  // Phase 8.1 Verbal Clinical Summary
  const verbalSummaryText = loadedSummary?.verbalSummary || loadedSummary?.verbalSummaryDetails?.text || '';
  const verbalSummaryDetails = loadedSummary?.verbalSummaryDetails || null;

  // Q&A List
  const examinationHistoryList = (loadedSummary?.examinationHistory && loadedSummary.examinationHistory.length > 0)
    ? loadedSummary.examinationHistory
    : appState.conversationHistory;

  // Render Full Q&A History List
  const examResponsesHtml = examinationHistoryList.length > 0
    ? examinationHistoryList.map((item, idx) => {
        const rawText = item.patientAnswerRaw || item.originalTranscript || item.originalResponse || item.patientResponse || '';
        const normText = item.normalizedInterpretation || item.normalizedAnswer || item.selectedOption || rawText;
        const isVoice = item.inputMethod === 'VOICE' || Boolean(item.originalTranscript);
        const options = item.options || [];

        return `
          <div class="exam-turn-card" style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.15rem; margin-bottom: 0.85rem;" data-turn-qid="${item.questionId}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
              <div style="flex: 1;">
                <div style="font-size: var(--font-size-xs); color: var(--primary); font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">
                  ${t('step', lang)} #${idx + 1}
                </div>
                <div style="font-weight: 700; font-size: var(--font-size-base); margin-bottom: 0.5rem; color: var(--text);">
                  ${item.questionText || 'Clinical Question'}
                </div>

                <div style="background: var(--surface-subtle); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary); margin-bottom: 0.35rem;">
                  <div style="font-size: var(--font-size-sm); color: var(--text);">
                    <span style="color: var(--muted-text); font-weight: 600;">🗣️ ${t('youSaid', lang) || 'You said:'}</span> 
                    <strong>"${escapeHtml(rawText)}"</strong> 
                    ${isVoice ? '<span title="Spoken by voice" style="margin-left: 0.35rem; color: var(--primary); font-weight: 600;">🎙️ (Voice)</span>' : '<span title="Touch selected" style="margin-left: 0.35rem; color: var(--muted-text);">👆 (Touch)</span>'}
                  </div>
                  <div style="font-size: var(--font-size-sm); margin-top: 0.25rem; color: var(--teal);">
                    <span style="color: var(--muted-text); font-weight: 600;">✅ ${t('understoodAs', lang) || 'We understood:'}</span> 
                    <strong>${escapeHtml(normText)}</strong>
                  </div>
                </div>
              </div>

              <button class="btn btn-secondary btn-correct-turn" data-qid="${item.questionId}" style="min-height: 40px; padding: 0 0.85rem; font-size: var(--font-size-xs); white-space: nowrap;">
                ✎ ${t('changeAnswer', lang) || 'Change'}
              </button>
            </div>

            <!-- Inline Correction Panel -->
            <div id="correction-panel-${item.questionId}" class="correction-panel" style="display: none; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border);">
              <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--muted-text); margin-bottom: 0.5rem;">
                Select corrected answer:
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${
                  options.length > 0
                    ? options.map((opt) => {
                        const optVal = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt.label) : opt;
                        const optLbl = typeof opt === 'object' ? (opt.label || opt.labels?.mr || opt.labels?.en || optVal) : opt;
                        return `<button class="btn btn-secondary btn-apply-correction" data-qid="${item.questionId}" data-val="${escapeHtml(optVal)}" style="min-height: 40px; font-size: var(--font-size-xs);">${escapeHtml(optLbl)}</button>`;
                      }).join('')
                    : `
                      <button class="btn btn-secondary btn-apply-correction" data-qid="${item.questionId}" data-val="हो / Yes" style="min-height: 40px; font-size: var(--font-size-xs);">हो / Yes</button>
                      <button class="btn btn-secondary btn-apply-correction" data-qid="${item.questionId}" data-val="नाही / No" style="min-height: 40px; font-size: var(--font-size-xs);">नाही / No</button>
                      <button class="btn btn-secondary btn-apply-correction" data-qid="${item.questionId}" data-val="माहित नाही / Don't know" style="min-height: 40px; font-size: var(--font-size-xs);">माहित नाही / Don't know</button>
                    `
                }
              </div>
            </div>
          </div>
        `;
      }).join('')
    : `<div style="color: var(--muted-text); padding: 1rem;">${t('noQuestionsYet', lang) || 'No questions answered.'}</div>`;

  const html = `
    <div class="screen-card" style="max-width: 1040px; margin: 0 auto; padding-bottom: 2rem;">
      <!-- Kiosk Screen Header -->
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <h1 class="kiosk-question-title" style="color: var(--primary); font-size: var(--font-size-2xl);">
          ${t('healthSummaryTitle', lang) || 'Your Health Summary'}
        </h1>
        <p class="kiosk-question-subtitle" style="font-size: var(--font-size-base); max-width: 680px; margin: 0.25rem auto 0;">
          ${t('healthSummarySub', lang) || 'Please check that everything looks right before we share it with your clinician.'}
        </p>
      </div>

      <!-- SECTION 1: YOUR MAIN CONCERN -->
      <div class="review-card" style="border-left: 4px solid var(--primary);">
        <div class="review-card-header">
          <span style="display: flex; align-items: center; gap: 0.5rem;">
            <span>🩺</span>
            <strong>${t('mainConcernSection', lang) || 'Your Main Concern'}</strong>
          </span>
          <button class="btn btn-secondary btn-edit" data-target-screen="chiefComplaint" style="min-height: 38px; padding: 0 0.85rem; font-size: var(--font-size-xs);">
            ✎ ${t('edit', lang) || 'Edit'}
          </button>
        </div>
        <div class="review-card-body">
          <div style="font-size: var(--font-size-lg); font-weight: 800; color: var(--primary); margin-bottom: 0.5rem;">
            ${primaryConcernDisplay}
          </div>

          ${rawPatientCcQuote ? `
            <div style="background: var(--surface-subtle); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); margin-bottom: 0.85rem; font-size: var(--font-size-sm); color: var(--text);">
              <span style="color: var(--muted-text); font-weight: 600;">🗣️ ${t('youSaid', lang) || 'You said:'}</span> 
              <strong>"${escapeHtml(rawPatientCcQuote)}"</strong>
            </div>
          ` : ''}

          <div style="display: flex; flex-wrap: wrap; gap: 1.25rem; font-size: var(--font-size-sm); color: var(--text);">
            <div style="background: var(--surface); border: 1px solid var(--border); padding: 0.45rem 0.85rem; border-radius: var(--radius-sm);">
              <span style="color: var(--muted-text);">${t('forDuration', lang) || 'For'}:</span> <strong>${escapeHtml(durationDisplay)}</strong>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); padding: 0.45rem 0.85rem; border-radius: var(--radius-sm);">
              <span style="color: var(--muted-text);">${t('whereLocation', lang) || 'Where'}:</span> <strong>${escapeHtml(locationData || t('notProvided', lang))}</strong>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); padding: 0.45rem 0.85rem; border-radius: var(--radius-sm);">
              <span style="color: var(--muted-text);">${t('howBadSeverity', lang) || 'How bad'}:</span> <strong>${escapeHtml(severityDisplay)}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 2: OTHER SYMPTOMS MENTIONED (Separated from Primary Concern) -->
      ${associatedSymptomsList.length > 0 ? `
        <div class="review-card">
          <div class="review-card-header">
            <span style="display: flex; align-items: center; gap: 0.5rem;">
              <span>➕</span>
              <strong>${t('otherSymptomsSection', lang) || 'Other Symptoms Mentioned'}</strong>
            </span>
            <span style="font-size: var(--font-size-xs); color: var(--muted-text);">
              ${associatedSymptomsList.length} recorded
            </span>
          </div>
          <div class="review-card-body" style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
            ${associatedSymptomsList.map((s) => {
              const isAbsent = s.status === 'ABSENT';
              const isUnknown = s.status === 'UNKNOWN';
              const badgeBg = isAbsent ? '#fef2f2' : (isUnknown ? '#fffbeb' : '#f0fdf4');
              const badgeColor = isAbsent ? '#991b1b' : (isUnknown ? '#92400e' : '#166534');
              const icon = isAbsent ? '✕' : (isUnknown ? '?' : '✓');
              const statusLabel = isAbsent ? (t('absent', lang) || 'None / Denied') : (isUnknown ? (t('unknown', lang) || 'Unknown') : (t('present', lang) || 'Reported'));
              const name = s.concept.replace('symptom.', '').replace(/\./g, ' ');
              return `
                <div style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid rgba(0,0,0,0.06); padding: 0.45rem 0.85rem; border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
                  <span>${icon}</span>
                  <span style="text-transform: capitalize;">${escapeHtml(name)}:</span>
                  <strong>${statusLabel}</strong>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- SECTION 3: MEDICINES & ALLERGIES -->
      <div class="review-card">
        <div class="review-card-header">
          <span style="display: flex; align-items: center; gap: 0.5rem;">
            <span>💊</span>
            <strong>${t('medicinesAllergiesSection', lang) || 'Medicines & Allergies'}</strong>
          </span>
          <button class="btn btn-secondary btn-edit" data-target-screen="documents" style="min-height: 38px; padding: 0 0.85rem; font-size: var(--font-size-xs);">
            ✎ ${t('edit', lang) || 'Edit'}
          </button>
        </div>
        <div class="review-card-body">
          <!-- Medication Conflict Banner if Discrepancy Detected -->
          ${medConflicts.length > 0 ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; padding: 0.85rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem;">
              <div style="font-weight: 700; color: #92400e; font-size: var(--font-size-sm); margin-bottom: 0.25rem;">
                ⚠️ ${t('thingsToReviewSection', lang) || 'Review Required'}
              </div>
              <div style="font-size: var(--font-size-xs); color: #78350f; line-height: 1.5;">
                ${t('medDiscrepancyNotice', lang) || 'Medication information differs between your answer and uploaded record. Please review.'}
              </div>
              <div style="margin-top: 0.5rem; font-size: var(--font-size-xs);">
                ${medConflicts.map((c) => `
                  <div>• <strong>${escapeHtml(c.drugName)}</strong>: Patient: ${escapeHtml(c.patientReported.dose)} vs Document: ${escapeHtml(c.documentReported.dose)}</div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <!-- Column A: Patient Reported Medications -->
            <div style="background: var(--surface-subtle); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 0.5rem;">
                🗣️ ${t('patientReportedMeds', lang) || 'Reported by You'}
              </div>
              ${patientMeds.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                  ${patientMeds.map((m) => `
                    <div style="font-size: var(--font-size-xs); background: var(--surface); padding: 0.4rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border);">
                      <strong>${escapeHtml(m.drugName)}</strong> ${m.dose && m.dose !== 'Not reported' ? `— ${escapeHtml(m.dose)}` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : `<div style="font-size: var(--font-size-xs); color: var(--muted-text);">${t('noMedsReported', lang) || 'No regular medicines reported.'}</div>`}
            </div>

            <!-- Column B: Document Extracted Medications -->
            <div style="background: var(--surface-subtle); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 0.5rem;">
                📄 ${t('documentReportedMeds', lang) || 'Found in Uploaded Prescription'}
              </div>
              ${docMeds.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                  ${docMeds.map((m) => `
                    <div style="font-size: var(--font-size-xs); background: var(--surface); padding: 0.4rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border);">
                      <strong>${escapeHtml(m.drugName)}</strong> ${m.dose && m.dose !== 'Not detected' ? `— ${escapeHtml(m.dose)}` : `<span style="color: var(--muted-text);">(${t('notDetected', lang) || 'Not detected'})</span>`}
                      ${m.frequency && m.frequency !== 'Not detected' ? `<span style="color: var(--muted-text);"> | ${escapeHtml(m.frequency)}</span>` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : `<div style="font-size: var(--font-size-xs); color: var(--muted-text);">No uploaded prescription medicines.</div>`}
            </div>
          </div>

          <!-- Allergies Row -->
          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border); font-size: var(--font-size-sm);">
            <strong>Allergies:</strong> 
            ${allergyData?.status === 'ABSENT' ? `<span style="color: var(--teal); font-weight: 600;">✓ ${t('noAllergiesReported', lang) || 'No allergies reported.'}</span>` : ''}
            ${allergyData?.status === 'PRESENT' && allergyData.items?.length ? `<span style="color: #b91c1c; font-weight: 700;">⚠ ${escapeHtml(allergyData.display)}</span>` : ''}
            ${!allergyData || allergyData.status === 'NOT_PROVIDED' ? `<span style="color: var(--muted-text);">${t('notProvided', lang)}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- SECTION 4: YOUR UPLOADED RECORDS -->
      <div class="review-card">
        <div class="review-card-header">
          <span style="display: flex; align-items: center; gap: 0.5rem;">
            <span>📄</span>
            <strong>${t('uploadedRecordsSection', lang) || 'Your Uploaded Records'}</strong>
          </span>
          <button class="btn btn-secondary btn-edit" data-target-screen="documentReview" style="min-height: 38px; padding: 0 0.85rem; font-size: var(--font-size-xs);">
            ✎ ${t('edit', lang) || 'Edit'}
          </button>
        </div>
        <div class="review-card-body">
          ${documentsList.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${documentsList.map((d) => `
                <div style="font-size: var(--font-size-xs); background: var(--surface); padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--primary); font-size: var(--font-size-sm);">📄 ${escapeHtml(d.name || d.fileName)}</strong>
                    <span style="color: var(--teal); font-weight: 700;">✓ Scanned by PaddleOCR</span>
                  </div>
                  ${d.extractedData?.medications?.length ? `
                    <div style="margin-top: 0.45rem; color: var(--text);">
                      <strong>Extracted Medications:</strong> 
                      ${d.extractedData.medications.map((m) => escapeHtml(m.drugName) + (m.dose && m.dose !== 'Not detected' ? ` (${escapeHtml(m.dose)})` : '')).join(', ')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : `<div style="font-size: var(--font-size-xs); color: var(--muted-text);">No medical documents uploaded.</div>`}
        </div>
      </div>

      <!-- SECTION 5: THINGS TO REVIEW (Only if uncertain items exist) -->
      ${uncertainItemsList.length > 0 ? `
        <div class="review-card" style="border-left: 4px solid #f59e0b; background: #fffdfa;">
          <div class="review-card-header" style="background: transparent;">
            <span style="display: flex; align-items: center; gap: 0.5rem; color: #92400e;">
              <span>⚠</span>
              <strong>${t('thingsToReviewSection', lang) || 'Things to Review'}</strong>
            </span>
          </div>
          <div class="review-card-body" style="font-size: var(--font-size-xs); color: #78350f;">
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${uncertainItemsList.map((u) => `
                <div>• ${escapeHtml(u.message)}</div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- SECTION 6: FULL QUESTIONS & ANSWERS (Complete Verifiable History) -->
      <div class="review-card">
        <div class="review-card-header">
          <span style="display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span>
            <strong>${t('fullQnASection', lang) || 'Full Questions & Answers'}</strong>
          </span>
          <span style="font-size: var(--font-size-xs); color: var(--muted-text); font-weight: 600;">
            ${examinationHistoryList.length} recorded
          </span>
        </div>
        <div class="review-card-body" style="background: var(--surface-subtle);">
          ${examResponsesHtml}
        </div>
      </div>

      <!-- SECTION 6.5: SUMMARY FOR DOCTOR (Phase 8.1 Verbal Clinical Summary) -->
      <div class="review-card" id="verbal-summary-card" style="border-left: 4px solid var(--primary); background: var(--surface);">
        <div class="review-card-header" style="background: var(--surface-subtle);">
          <span style="display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span>
            <strong>${t('summaryForDoctor', lang) || 'Summary for Doctor'}</strong>
          </span>
          <span style="font-size: var(--font-size-xs); color: var(--muted-text); font-weight: 600;">
            ${verbalSummaryDetails?.wordCount ? `${verbalSummaryDetails.wordCount} words` : ''}
          </span>
        </div>
        <div class="review-card-body">
          <div style="font-size: var(--font-size-xs); color: var(--muted-text); margin-bottom: 0.65rem; font-weight: 600;">
            ℹ️ ${t('reviewSummaryBeforeSubmit', lang) || 'Please review this summary before sending it to the doctor.'}
          </div>
          <p id="verbal-summary-paragraph" style="font-size: var(--font-size-base); line-height: 1.6; color: var(--text); margin: 0; font-weight: 500; background: var(--surface); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
            ${escapeHtml(verbalSummaryText || '')}
          </p>
        </div>
      </div>

      <!-- SECTION 7: FINAL VERIFICATION & CLINICAL SAFETY NOTICE -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 1.15rem 1.5rem; margin-top: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        <div>
          <div style="font-weight: 700; color: #166534; font-size: var(--font-size-sm); margin-bottom: 0.2rem;">
            🛡️ ${t('verifiedByYou', lang) || 'Patient Verification'}
          </div>
          <div style="font-size: var(--font-size-xs); color: #14532d;">
            ${t('reviewNotice', lang) || 'This summary will be shared with your clinician. It is not a medical diagnosis.'}
          </div>
        </div>
        <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; user-select: none; font-size: var(--font-size-sm); font-weight: 700; color: #166534;">
          <input type="checkbox" id="chk-patient-confirm" ${isPatientConfirmed ? 'checked' : ''} style="width: 22px; height: 22px; accent-color: var(--teal); cursor: pointer;" />
          <span>${t('clickToVerify', lang) || 'I confirm this information is correct'}</span>
        </label>
      </div>

      <!-- Bottom Navigation Row -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border);">
        <button id="btn-review-back" class="btn btn-secondary" style="min-height: 52px; min-width: 130px;">
          ← ${t('back', lang)}
        </button>

        <button id="btn-review-proceed" class="btn btn-primary btn-huge" style="min-width: 280px; font-weight: 800;">
          <span>${t('submitToClinician', lang) || 'SUBMIT TO CLINICIAN →'}</span>
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      // Screen navigation for edits
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
                loadedSummary = res.data.clinicalSummary || res.data;
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

      // Verification checkbox
      document.getElementById('chk-patient-confirm')?.addEventListener('change', (e) => {
        isPatientConfirmed = e.target.checked;
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
