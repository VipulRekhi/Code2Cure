/**
 * Screen 6: Chief Complaint Screen (Section 19 & 20)
 * Integrates multimodal Voice State Machine + Touch tiles.
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange, resetClinicalSession } from '../state.js';
import { router } from '../router.js';
import { renderVoiceButton } from '../components/voiceButton.js';
import { speechService } from '../services/speechService.js';
import { ttsService } from '../services/ttsService.js';

export function renderChiefComplaintScreen() {
  const lang = appState.language;

  // Clean isolation: if an active clinical session exists, wipe it when entering chief complaint
  if (appState.backendSessionId) {
    resetClinicalSession(false);
  }

  const complaintOptions = [
    { id: 'CHEST_PAIN', labelKey: 'cChestPain', icon: '🫀' },
    { id: 'SHOULDER_PAIN', labelKey: 'cShoulderPain', icon: '💪' },
    { id: 'KNEE_PAIN', labelKey: 'cKneePain', icon: '🦵' },
    { id: 'DIARRHEA', labelKey: 'cDiarrhea', icon: '💩' },
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
      // 1. Microphone Click (Acoustic echo prevention: stop TTS first)
      document.getElementById('btn-voice-mic')?.addEventListener('click', () => {
        ttsService.stop();

        if (speechService.isListening()) {
          speechService.stopListening();
          return;
        }

        const micBtn = document.getElementById('btn-voice-mic');
        const statusText = document.querySelector('.voice-status-text');

        speechService.startListening(appState.language, ({ status, transcript, error, message }) => {
          appState.voice.status = status;

          if (status === 'LISTENING') {
            if (micBtn) micBtn.classList.add('listening');
            if (statusText) statusText.textContent = t('tapListening', lang) || 'Listening... (Tap to stop)';
            return;
          }

          if (status === 'PROCESSING') {
            if (micBtn) {
              micBtn.classList.remove('listening');
              micBtn.setAttribute('disabled', 'true');
            }
            if (statusText) statusText.textContent = t('processingVoice', lang) || 'Processing speech...';
            return;
          }

          if (status === 'RECOGNIZED' && transcript) {
            appState.voice.transcript = transcript;
            appState.complaint.textPatientSpoken = transcript;

            const lower = transcript.toLowerCase();
            if (
              lower.includes('जुलाब') ||
              lower.includes('अतिसार') ||
              lower.includes('दस्त') ||
              lower.includes('diarrhea') ||
              lower.includes('loose motion')
            ) {
              appState.complaint.id = 'DIARRHEA';
              appState.complaint.location = null;
            } else if (lower.includes('गुडघ') || lower.includes('घुटन') || lower.includes('knee')) {
              appState.complaint.id = 'KNEE_PAIN';
              appState.complaint.location = 'knee';
            } else if (lower.includes('खांद') || lower.includes('कंध') || lower.includes('shoulder')) {
              appState.complaint.id = 'SHOULDER_PAIN';
              appState.complaint.location = 'shoulder';
            } else if (lower.includes('छाती') || lower.includes('सीना') || lower.includes('chest')) {
              appState.complaint.id = 'CHEST_PAIN';
              appState.complaint.location = 'chest';
            } else if (
              lower.includes('उलटी') ||
              lower.includes('उल्टी') ||
              lower.includes('vomit') ||
              lower.includes('मळमळ') ||
              lower.includes('पोट') ||
              lower.includes('पेट') ||
              lower.includes('stomach')
            ) {
              appState.complaint.id = 'STOMACH';
              appState.complaint.location = 'abdomen';
            } else if (lower.includes('ताप') || lower.includes('बुखार') || lower.includes('fever')) {
              appState.complaint.id = 'FEVER';
            } else if (lower.includes('खोकला') || lower.includes('खांसी') || lower.includes('cough')) {
              appState.complaint.id = 'COUGH';
            } else if (lower.includes('श्वास') || lower.includes('सांस') || lower.includes('breath')) {
              appState.complaint.id = 'BREATHING';
            } else if (lower.includes('डोके') || lower.includes('सिर') || lower.includes('head')) {
              appState.complaint.id = 'HEADACHE';
              appState.complaint.location = 'head';
            } else {
              appState.complaint.id = 'OTHER';
            }

            // Extract duration if explicitly spoken (supports 4 days, ranges, etc.)
            if (lower.includes('६-७') || lower.includes('६ ते ७') || lower.includes('6-7') || lower.includes('6 to 7') || lower.includes('छह सात') || lower.includes('सहा सात')) {
              appState.complaint.duration = { min: 6, max: 7, unit: 'days' };
            } else if (lower.includes('चार दिवस') || lower.includes('चार दिन') || lower.includes('4 दिन') || lower.includes('४ दिन') || lower.includes('four days') || lower.includes('4 days') || lower.includes('४ दिवस')) {
              appState.complaint.duration = { value: 4, unit: 'days' };
            } else if (lower.includes('तीन दिवस') || lower.includes('तीन दिन') || lower.includes('3 दिन') || lower.includes('३ दिन') || lower.includes('three days') || lower.includes('3 days') || lower.includes('३ दिवस')) {
              appState.complaint.duration = { value: 3, unit: 'days' };
            } else if (lower.includes('दोन दिवस') || lower.includes('दो दिन') || lower.includes('2 दिन') || lower.includes('२ दिन') || lower.includes('two days') || lower.includes('2 days') || lower.includes('२ दिवस')) {
              appState.complaint.duration = { value: 2, unit: 'days' };
            } else if (lower.includes('एक दिवस') || lower.includes('एक दिन') || lower.includes('1 दिन') || lower.includes('१ दिन') || lower.includes('one day') || lower.includes('1 day') || lower.includes('काल')) {
              appState.complaint.duration = { value: 1, unit: 'days' };
            } else if (lower.includes('हफ्ते') || lower.includes('हफ्ता') || lower.includes('week') || lower.includes('आठवडा')) {
              appState.complaint.duration = { min: 7, max: 7, unit: 'days' };
            } else if (lower.includes('काफी समय') || lower.includes('बहुत दिनों') || lower.includes('खूप दिवसां')) {
              appState.complaint.duration = { value: null, raw: 'काफी समय से', precision: 'vague' };
            } else {
              appState.complaint.duration = null;
            }

            notifyStateChange('voice');
            router.renderCurrentScreen();
            return;
          }

          // IDLE or error state
          if (micBtn) {
            micBtn.classList.remove('listening');
            micBtn.removeAttribute('disabled');
          }
          if (statusText) {
            statusText.textContent = message || t('speakAnswer', lang);
          }
          notifyStateChange('voice');
        });
      });

      // 2. Voice Confirm Click
      document.getElementById('btn-voice-confirm')?.addEventListener('click', () => {
        appState.voice.status = 'IDLE';
        appState.complaint.initialComplaintTranscript = appState.complaint.textPatientSpoken;
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
          resetClinicalSession(false);
          appState.complaint.id = complaintId;
          appState.complaint.textPatientSpoken = null;
          appState.complaint.initialComplaintTranscript = null;
          appState.complaint.duration = null;
          if (complaintId === 'KNEE_PAIN') appState.complaint.location = 'knee';
          else if (complaintId === 'SHOULDER_PAIN') appState.complaint.location = 'shoulder';
          else if (complaintId === 'CHEST_PAIN') appState.complaint.location = 'chest';
          else if (complaintId === 'STOMACH') appState.complaint.location = 'abdomen';
          else if (complaintId === 'HEADACHE') appState.complaint.location = 'head';
          else appState.complaint.location = null;

          notifyStateChange('complaint');
          router.navigate('conversation');
        });
      });
    },
  };
}
