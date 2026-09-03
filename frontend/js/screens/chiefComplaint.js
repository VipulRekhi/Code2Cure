/**
 * Screen 6: Chief Complaint Screen (Section 19 & 20)
 * Integrates multimodal Voice State Machine + Touch tiles.
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { renderVoiceButton } from '../components/voiceButton.js';
import { speechService } from '../services/speechService.js';

export function renderChiefComplaintScreen() {
  const lang = appState.language;

  const complaintOptions = [
    { id: 'CHEST_PAIN', labelKey: 'cChestPain', icon: '🫀' },
    { id: 'FEVER', labelKey: 'cFever', icon: '🤒' },
    { id: 'COUGH', labelKey: 'cCough', icon: '🤧' },
    { id: 'BREATHING', labelKey: 'cBreathing', icon: '😮‍💨' },
    { id: 'HEADACHE', labelKey: 'cHeadache', icon: '🤕' },
    { id: 'STOMACH', labelKey: 'cStomach', icon: '🤢' },
    { id: 'MEDICATION', labelKey: 'cMedication', icon: '💊' },
    { id: 'OTHER', labelKey: 'cOther', icon: '❓' },
  ];

  const tilesHtml = complaintOptions
    .map(
      (opt) => `
      <div class="option-tile ${appState.complaint.id === opt.id ? 'selected' : ''}" data-complaint-id="${opt.id}">
        <div class="option-tile-icon">${opt.icon}</div>
        <div>
          <div class="option-tile-text">${t(opt.labelKey, lang)}</div>
        </div>
      </div>
    `
    )
    .join('');

  const voiceBoxHtml = renderVoiceButton({
    status: appState.voice.status,
    transcript: appState.voice.transcript,
  });

  const html = `
    <div class="screen-card">
      <h1 class="kiosk-question-title">${t('complaintTitle', lang)}</h1>
      <p class="kiosk-question-subtitle">${t('complaintSubtitle', lang)}</p>

      <!-- Multimodal Voice Section (Section 20) -->
      ${voiceBoxHtml}

      <div style="text-align: center; margin: 1.5rem 0; font-size: var(--font-size-base); font-weight: 700; color: var(--muted-text);">
        — ${t('orChooseBelow', lang)} —
      </div>

      <!-- Touch Tiles (Section 21) -->
      <div class="option-grid">
        ${tilesHtml}
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      // 1. Microphone Click
      document.getElementById('btn-voice-mic')?.addEventListener('click', () => {
        speechService.startListening(appState.language, ({ status, transcript }) => {
          appState.voice.status = status;
          if (transcript) {
            appState.voice.transcript = transcript;
            appState.complaint.textPatientSpoken = transcript;
            appState.complaint.id = 'CHEST_PAIN'; // Simulated extraction in Phase 2
          }
          notifyStateChange('voice');
          router.renderCurrentScreen();
        });
      });

      // 2. Voice Confirm Click
      document.getElementById('btn-voice-confirm')?.addEventListener('click', () => {
        appState.voice.status = 'IDLE';
        notifyStateChange('complaint');
        router.navigate('conversation');
      });

      // 3. Voice Retry Click
      document.getElementById('btn-voice-retry')?.addEventListener('click', () => {
        appState.voice.status = 'IDLE';
        appState.voice.transcript = null;
        notifyStateChange('voice');
        router.renderCurrentScreen();
      });

      // 4. Touch Option Tile Click
      document.querySelectorAll('.option-tile[data-complaint-id]').forEach((tile) => {
        tile.addEventListener('click', () => {
          const complaintId = tile.getAttribute('data-complaint-id');
          appState.complaint.id = complaintId;
          appState.complaint.textPatientSpoken = null;
          notifyStateChange('complaint');
          router.navigate('conversation');
        });
      });
    },
  };
}
