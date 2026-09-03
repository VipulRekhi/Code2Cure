/**
 * Voice Interaction Button & Confirmation Box Component (Section 20 & 23)
 */

import { t } from '../i18n.js';
import { appState } from '../state.js';

export function renderVoiceButton({
  status = 'IDLE',
  transcript = null,
  onMicClick,
  onConfirm,
  onRetry,
}) {
  const lang = appState.language;

  // 1. If we have a recognized transcript awaiting confirmation:
  if (status === 'RECOGNIZED' && transcript) {
    return `
      <div class="voice-confirmation-box" role="region" aria-label="Speech Confirmation">
        <div style="font-size: var(--font-size-base); font-weight: 600; color: var(--muted-text);">
          ${t('heardVoice', lang)}
        </div>
        <div class="voice-heard-quote">"${transcript}"</div>
        <div style="font-size: var(--font-size-base); font-weight: 700; color: var(--text);">
          ${t('isThisCorrect', lang)}
        </div>
        <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
          <button id="btn-voice-confirm" class="btn btn-primary" style="flex: 1;">
            ✓ ${t('yesCorrect', lang)}
          </button>
          <button id="btn-voice-retry" class="btn btn-secondary" style="flex: 1;">
            ↻ ${t('tryAgain', lang)}
          </button>
        </div>
      </div>
    `;
  }

  // 2. Default Voice Mic Button State
  const isListening = status === 'LISTENING';
  const isProcessing = status === 'PROCESSING';

  let statusLabel = t('speakAnswer', lang);
  if (isListening) statusLabel = t('tapListening', lang);
  if (isProcessing) statusLabel = t('processingVoice', lang);

  return `
    <div class="voice-mic-container">
      <button
        id="btn-voice-mic"
        class="voice-mic-button ${isListening ? 'listening' : ''}"
        aria-label="${statusLabel}"
        ${isProcessing ? 'disabled' : ''}
      >
        <span>🎙</span>
      </button>
      <div class="voice-status-text">${statusLabel}</div>
    </div>
  `;
}
