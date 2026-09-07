/**
 * Patient Progress Indicator Component
 * Dynamic horizontal stepper bound to actual state.
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
  'submission',
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

  const stepLabel = `${t('step', appState.language)} ${currentStepNum} ${t('of', appState.language)} ${totalSteps}`;

  container.innerHTML = `
    <div class="progress-track-wrapper">
      <div class="progress-track" role="progressbar" aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100" aria-label="${stepLabel}">
        <div class="progress-fill" style="width: ${progressPercent}%;"></div>
      </div>
    </div>
    <div class="progress-label">
      ${stepLabel}
    </div>
  `;
}
