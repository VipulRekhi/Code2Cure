/**
 * Screen 5: OPD / Department Selection
 * Clear selection of hospital clinical intake path.
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { audioController } from '../audio.js';

export function renderOpdSelectionScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card" style="max-width: 980px; margin: 0 auto;">
      <!-- Audio Narration Pill -->
      <button id="btn-opd-audio" class="audio-prompt-bar">
        <span aria-hidden="true">🔊</span>
        <span>${t('listen', lang)}</span>
      </button>

      <h1 class="kiosk-question-title" style="color: var(--primary);">
        ${t('opdTitle', lang)}
      </h1>
      <p class="kiosk-question-subtitle">
        ${t('opdSubtitle', lang)}
      </p>

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
        <div id="opt-opd-other" class="option-tile ${appState.opdMode === 'OTHER' ? 'selected' : ''}">
          <div class="option-tile-icon">🏥</div>
          <div>
            <div class="option-tile-text">${t('opdOther', lang)}</div>
            <div class="option-tile-subtext">${t('opdOtherSub', lang)}</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 2rem; display: flex; justify-content: flex-start;">
        <button id="btn-opd-back" class="btn btn-secondary" style="min-height: 50px;">
          ← ${t('back', lang)}
        </button>
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

      document.getElementById('btn-opd-back')?.addEventListener('click', () => {
        router.navigate('consent');
      });

      const audioBtn = document.getElementById('btn-opd-audio');
      audioBtn?.addEventListener('click', async () => {
        if (audioController.isSpeaking) {
          audioController.stop();
          audioBtn.classList.remove('playing');
          return;
        }
        audioBtn.classList.add('playing');
        await audioController.speak(t('opdTitle', appState.language), appState.language);
        audioBtn.classList.remove('playing');
      });
    },
  };
}
