/**
 * Screen 7: Conversational History Screen (Phase 3 Backend Engine Integration)
 * Dynamically driven by the backend Clinical Question Engine with rule-based adaptation.
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';
import { audioController } from '../audio.js';
import { renderVoiceButton } from '../components/voiceButton.js';
import { speechService } from '../services/speechService.js';
import { MOCK_QUESTION_FLOW } from '../mock/mockQuestions.js';

let currentBackendQuestion = null;
let currentProgress = null;
let isInitializing = false;
let fallbackIndex = 0;

export function resetConversationIndex() {
  currentBackendQuestion = null;
  currentProgress = null;
  isInitializing = false;
  fallbackIndex = 0;
}

export function renderConversationScreen() {
  const lang = appState.language;

  // 1. If we have not initialized the backend question engine yet, start loading it
  if (!appState.backendSessionId && !isInitializing && !currentBackendQuestion) {
    isInitializing = true;
    initBackendSession(lang);
    return {
      html: `
        <div class="screen-card" style="text-align: center; align-items: center; padding: 4rem 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem; animation: pulse 1s infinite;">🩺</div>
          <h2 class="kiosk-question-title">${t('processingVoice', lang)}</h2>
        </div>
      `,
      attachEvents: () => {},
    };
  }

  // 2. Resolve Active Question (Backend Engine or Fallback)
  let qText = '';
  let qOptions = [];
  let qId = '';
  let qInputType = 'single-choice';

  if (currentBackendQuestion) {
    qId = currentBackendQuestion.id;
    qText = currentBackendQuestion.text;
    qInputType = currentBackendQuestion.inputType;
    qOptions = currentBackendQuestion.options || [];
  } else {
    // Fallback static question
    const fallbackNode = MOCK_QUESTION_FLOW[fallbackIndex] || MOCK_QUESTION_FLOW[0];
    qId = fallbackNode.id;
    qText = t(fallbackNode.titleKey, lang);
    qInputType = fallbackNode.inputType;
    qOptions = fallbackNode.options.map((opt) => ({
      value: opt.value,
      label: t(opt.labelKey, lang),
      icon: opt.icon,
    }));
  }

  // Render Options
  const optionsHtml = qOptions
    .map((opt, idx) => {
      return `
        <div class="option-tile" data-opt-idx="${idx}">
          <div class="option-tile-icon">${opt.icon || '👉'}</div>
          <div class="option-tile-text">${opt.label}</div>
        </div>
      `;
    })
    .join('');

  // Voice widget integration
  const voiceWidgetHtml = renderVoiceButton({
    status: appState.voice.status,
    transcript: appState.voice.transcript,
  });

  const progressLabel = currentProgress
    ? `${currentProgress.completed} / ~${currentProgress.totalEstimated}`
    : `${fallbackIndex + 1} / 3`;

  const html = `
    <div class="screen-card">
      <!-- Audio Prompt Listener -->
      <button id="btn-question-audio" class="audio-prompt-bar">
        <span>🔊</span>
        <span>${t('listen', lang)}</span>
      </button>

      <h1 class="kiosk-question-title">${qText}</h1>

      <!-- Voice Interaction (Multimodal) -->
      ${voiceWidgetHtml}

      <!-- Options Grid -->
      <div class="option-grid">
        ${optionsHtml}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem;">
        <button id="btn-conv-skip" class="btn btn-secondary" style="font-size: var(--font-size-sm); min-height: 52px;">
          ${t('skip', lang)} ➔
        </button>

        <div style="font-size: var(--font-size-sm); font-weight: 700; color: var(--muted-text);">
          ${t('step', lang)}: ${progressLabel}
        </div>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      // 1. Audio Speak Button
      document.getElementById('btn-question-audio')?.addEventListener('click', () => {
        audioController.speak(qText, lang);
      });

      // 2. Option Selection Click
      document.querySelectorAll('.option-tile[data-opt-idx]').forEach((tile) => {
        tile.addEventListener('click', async () => {
          const idx = parseInt(tile.getAttribute('data-opt-idx'), 10);
          const selectedOption = qOptions[idx];
          if (!selectedOption) return;

          await handleAnswerSubmission(selectedOption.value, 'TOUCH');
        });
      });

      // 3. Voice Mic Click
      document.getElementById('btn-voice-mic')?.addEventListener('click', () => {
        speechService.startListening(appState.language, ({ status, transcript }) => {
          appState.voice.status = status;
          if (transcript) {
            appState.voice.transcript = transcript;
          }
          notifyStateChange('voice');
          router.renderCurrentScreen();
        });
      });

      // 4. Voice Confirm Click
      document.getElementById('btn-voice-confirm')?.addEventListener('click', async () => {
        const transcript = appState.voice.transcript;
        appState.voice.status = 'IDLE';
        appState.voice.transcript = null;

        await handleAnswerSubmission(transcript, 'VOICE');
      });

      // 5. Voice Retry Click
      document.getElementById('btn-voice-retry')?.addEventListener('click', () => {
        appState.voice.status = 'IDLE';
        appState.voice.transcript = null;
        notifyStateChange('voice');
        router.renderCurrentScreen();
      });

      // 6. Skip Button
      document.getElementById('btn-conv-skip')?.addEventListener('click', async () => {
        await handleAnswerSubmission('unknown', 'TOUCH');
      });
    },
  };
}

async function initBackendSession(lang) {
  try {
    const sessionRes = await api.createClinicalSession({
      patientId: appState.patient?.id || null,
      language: lang,
      opdMode: appState.opdMode || 'GENERAL',
    });

    if (sessionRes?.success && sessionRes.data?.sessionId) {
      appState.backendSessionId = sessionRes.data.sessionId;

      // Determine complaint slot to record
      let complaintValue = 'pain';
      if (appState.complaint?.id === 'FEVER') complaintValue = 'fever';
      if (appState.complaint?.id === 'COUGH') complaintValue = 'cough';
      if (appState.complaint?.id === 'BREATHING') complaintValue = 'breathing';
      if (appState.complaint?.id === 'HEADACHE') complaintValue = 'headache';
      if (appState.complaint?.id === 'STOMACH') complaintValue = 'stomach';

      const recordRes = await api.recordClinicalResponse(appState.backendSessionId, {
        questionId: 'q.chief_complaint',
        rawResponse: complaintValue,
        normalizedValue: complaintValue,
        inputMethod: 'TOUCH',
        language: lang,
      });

      if (recordRes?.success && recordRes.data?.next?.question) {
        currentBackendQuestion = recordRes.data.next.question;
        currentProgress = recordRes.data.next.progress;
      } else if (sessionRes.data.next?.question) {
        currentBackendQuestion = sessionRes.data.next.question;
        currentProgress = sessionRes.data.next.progress;
      }
    }
  } catch (err) {
    console.warn('[Conversation] Backend session init error, using fallback:', err);
  } finally {
    isInitializing = false;
    router.renderCurrentScreen();
  }
}

async function handleAnswerSubmission(value, inputMethod) {
  // Update local state summary
  if (currentBackendQuestion) {
    const attr = currentBackendQuestion.attribute;
    if (attr === 'location') appState.complaint.character = value;
    if (attr === 'duration') appState.complaint.duration = value;
    if (attr === 'severity') appState.complaint.severity = value;
  }

  // If connected to backend question engine:
  if (appState.backendSessionId && currentBackendQuestion) {
    try {
      const recordRes = await api.recordClinicalResponse(appState.backendSessionId, {
        questionId: currentBackendQuestion.id,
        rawResponse: value,
        normalizedValue: value,
        inputMethod,
        language: appState.language,
      });

      if (recordRes?.success) {
        const nextResult = recordRes.data?.next;
        if (nextResult?.status === 'complete') {
          router.navigate('documents');
          return;
        }
        currentBackendQuestion = nextResult?.question;
        currentProgress = nextResult?.progress;
        router.renderCurrentScreen();
        return;
      }
    } catch (e) {
      console.warn('[Conversation] Answer recording fallback:', e);
    }
  }

  // Fallback progression if offline or error
  if (fallbackIndex < MOCK_QUESTION_FLOW.length - 1) {
    fallbackIndex++;
    router.renderCurrentScreen();
  } else {
    fallbackIndex = 0;
    router.navigate('documents');
  }
}
