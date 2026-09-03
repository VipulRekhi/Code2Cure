/**
 * Patient Progress Indicator Component (Section 10)
 * Uses patient-friendly progression without technical abbreviations.
 */

import { t } from '../i18n.js';
import { appState } from '../state.js';

const STEP_SEQUENCE = [
  'language',
  'identify',
  'consent',
  'opdSelection',
  'chiefComplaint',
  'conversation',
  'documents',
  'patientReview',
];

export function renderProgress(container) {
  const currentScreen = appState.currentScreen;
  const currentIndex = STEP_SEQUENCE.indexOf(currentScreen);

  // Hide progress bar on welcome and complete screens
  if (currentIndex === -1) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  const totalSteps = STEP_SEQUENCE.length;
  const currentStepNum = currentIndex + 1;
  const progressPercent = Math.round((currentStepNum / totalSteps) * 100);

  container.innerHTML = `
    <div class="progress-track" role="progressbar" aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-fill" style="width: ${progressPercent}%;"></div>
    </div>
    <div class="progress-label">
      ${t('step', appState.language)} ${currentStepNum} ${t('of', appState.language)} ${totalSteps}
    </div>
  `;
}
