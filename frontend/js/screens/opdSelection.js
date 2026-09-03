/**
 * Screen 5: OPD / Department Selection (Section 18)
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';

export function renderOpdSelectionScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card">
      <h1 class="kiosk-question-title">${t('opdTitle', lang)}</h1>
      <p class="kiosk-question-subtitle">${t('opdSubtitle', lang)}</p>

      <div class="option-grid">
        <!-- General Medicine -->
        <div id="opt-opd-general" class="option-tile ${appState.opdMode === 'GENERAL' ? 'selected' : ''}">
          <div class="option-tile-icon">🩺</div>
          <div>
            <div class="option-tile-text">${t('opdGeneral', lang)}</div>
            <div class="option-tile-subtext">${t('opdGeneralSub', lang)}</div>
          </div>
        </div>

        <!-- Ayurvedic / AYUSH -->
        <div id="opt-opd-ayush" class="option-tile ${appState.opdMode === 'AYUSH' ? 'selected' : ''}">
          <div class="option-tile-icon">🌿</div>
          <div>
            <div class="option-tile-text">${t('opdAyush', lang)}</div>
            <div class="option-tile-subtext">${t('opdAyushSub', lang)}</div>
          </div>
        </div>

        <!-- Other Specialist -->
        <div id="opt-opd-other" class="option-tile">
          <div class="option-tile-icon">🏥</div>
          <div>
            <div class="option-tile-text">${t('opdOther', lang)}</div>
            <div class="option-tile-subtext">${t('opdOtherSub', lang)}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.getElementById('opt-opd-general')?.addEventListener('click', () => {
        appState.opdMode = 'GENERAL';
        notifyStateChange('opdMode');
        router.navigate('chiefComplaint');
      });

      document.getElementById('opt-opd-ayush')?.addEventListener('click', () => {
        appState.opdMode = 'AYUSH';
        notifyStateChange('opdMode');
        router.navigate('chiefComplaint');
      });

      document.getElementById('opt-opd-other')?.addEventListener('click', () => {
        appState.opdMode = 'OTHER';
        notifyStateChange('opdMode');
        router.navigate('chiefComplaint');
      });
    },
  };
}
