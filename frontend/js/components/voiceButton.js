/**
 * Voice Interaction Button & Confirmation Component
 * Pure clinical UI for multimodal voice state machine.
 */

import { t } from '../i18n.js';
import { appState } from '../state.js';

export function renderVoiceButton({
  status = 'IDLE',
  transcript = null,
  interpreted = null,
  onMicClick,
  onConfirm,
  onRetry,
}) {
  const lang = appState.language;

  // 1. Recognized/Success State with Raw Transcript & Interpreted Understanding
  if ((status === 'RECOGNIZED' || status === 'SUCCESS') && transcript) {
    return `
      <div class="voice-confirmation-box" role="region" aria-label="Speech Confirmation">
        <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--muted-text); text-transform: uppercase; letter-spacing: 0.04em;">
          🗣️ ${t('heardVoice', lang) || 'You said:'}
        </div>
        <div class="voice-heard-quote">"${transcript}"</div>

        ${interpreted ? `
          <div class="voice-interpreted-row">
            <span>✓</span>
            <span>${t('understoodAs', lang) || 'We understood'}: <strong>${interpreted}</strong></span>
          </div>
        ` : ''}

        <div style="font-size: var(--font-size-sm); font-weight: 700; color: var(--text); margin-top: 0.25rem;">
          ${t('isThisCorrect', lang) || 'Is this correct?'}
        </div>

        <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
          <button id="btn-voice-confirm" class="btn btn-primary" style="flex: 2; min-height: 52px;">
            ✓ ${t('yesCorrect', lang) || "That's correct"}
          </button>
          <button id="btn-voice-retry" class="btn btn-secondary" style="flex: 1; min-height: 52px;">
            ✎ ${t('tryAgain', lang) || 'Change answer'}
          </button>
        </div>
      </div>
    `;
  }

  // 2. Interactive Voice States
  const isListening = status === 'LISTENING';
  const isProcessing = status === 'PROCESSING';
  const isTranscribing = status === 'TRANSCRIBING';
  const isUnavailable = status === 'SERVICE_UNAVAILABLE' || status === 'ERROR';

  let statusLabel = t('speakAnswer', lang) || 'Tap to speak';
  let statusSub = 'You can speak in your own language';

  if (isListening) {
    statusLabel = t('tapListening', lang) || 'Listening...';
    statusSub = 'Tap the microphone again when done';
  } else if (isProcessing) {
    statusLabel = t('processingVoice', lang) || 'Understanding your speech...';
    statusSub = 'Preparing audio...';
  } else if (isTranscribing) {
    statusLabel = t('transcribingVoice', lang) || 'Transcribing speech...';
    statusSub = 'Contacting speech recognition service...';
  } else if (isUnavailable) {
    statusLabel = t('voiceUnavailable', lang) || 'Voice service temporarily unavailable.';
    statusSub = t('voiceUnavailableSub', lang) || 'Please select an option from the list.';
  }

  return `
    <div class="voice-mic-container">
      <button
        id="btn-voice-mic"
        class="voice-mic-button ${isListening ? 'listening' : ''}"
        aria-label="${statusLabel}"
        ${isProcessing || isTranscribing ? 'disabled' : ''}
      >
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>

      <div class="voice-status-text">${statusLabel}</div>
      <div class="voice-status-subtext">${statusSub}</div>
    </div>
  `;
}
