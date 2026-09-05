/**
 * Screen 7: Conversational History Screen (Phase 3 Backend Engine Integration)
 * Dynamically driven by the backend Clinical Question Engine with rule-based adaptation.
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';
import { ttsService } from '../services/ttsService.js';
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

      <!-- Dev Mode Indicator (Section 40) -->
      <div style="display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: ${currentBackendQuestion?.source === 'LLM_DYNAMIC' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)'}; color: ${currentBackendQuestion?.source === 'LLM_DYNAMIC' ? '#16a34a' : '#ca8a04'}; border: 1px solid ${currentBackendQuestion?.source === 'LLM_DYNAMIC' ? '#22c55e' : '#eab308'};">
        <span>●</span>
        <span>Question Source: ${currentBackendQuestion?.source || 'FALLBACK_MODE'}</span>
      </div>

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
      const audioBtn = document.getElementById('btn-question-audio');
      audioBtn?.addEventListener('click', async () => {
        if (ttsService.isSpeaking) {
          ttsService.stop();
          audioBtn.classList.remove('playing');
          return;
        }
        audioBtn.classList.add('playing');
        await ttsService.speak({ text: qText, language: lang });
        audioBtn.classList.remove('playing');
      });

      // 2. Option Selection Click
      document.querySelectorAll('.option-tile[data-opt-idx]').forEach((tile) => {
        tile.addEventListener('click', async () => {
          // Immediately stop any TTS playing when user interacts (Section 43)
          ttsService.stop();

          const idx = parseInt(tile.getAttribute('data-opt-idx'), 10);
          const selectedOption = qOptions[idx];
          if (!selectedOption) return;

          tile.classList.add('selected');
          appState.latestPatientResponseTranscript = selectedOption.label;
          await handleAnswerSubmission(selectedOption.value, 'TOUCH');
        });
      });

      // 3. Voice Mic Click (Acoustic Echo Prevention: Stop TTS before recording, Section 45)
      document.getElementById('btn-voice-mic')?.addEventListener('click', () => {
        ttsService.stop();

        speechService.startListening(
          appState.language,
          ({ status, transcript }) => {
            appState.voice.status = status;
            if (transcript) {
              appState.voice.transcript = transcript;
            }
            notifyStateChange('voice');
            router.renderCurrentScreen();
          },
          {
            questionId: qId,
            sessionId: appState.backendSessionId,
          }
        );
      });

      // 4. Voice Confirm Click (Phase 6.3)
      document.getElementById('btn-voice-confirm')?.addEventListener('click', async () => {
        ttsService.stop();
        const transcript = appState.voice.transcript;
        appState.voice.status = 'IDLE';
        appState.voice.transcript = null;
        appState.latestPatientResponseTranscript = transcript;
        notifyStateChange('voice');

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

      // Determine complaint slot to record (Section 15, 16, 44)
      let complaintValue = null;
      if (appState.complaint?.id === 'DIARRHEA') complaintValue = 'diarrhea';
      else if (appState.complaint?.id === 'KNEE_PAIN') complaintValue = 'knee_pain';
      else if (appState.complaint?.id === 'CHEST_PAIN') complaintValue = 'chest_pain';
      else if (appState.complaint?.id === 'FEVER') complaintValue = 'fever';
      else if (appState.complaint?.id === 'COUGH') complaintValue = 'cough';
      else if (appState.complaint?.id === 'BREATHING') complaintValue = 'breathing';
      else if (appState.complaint?.id === 'HEADACHE') complaintValue = 'headache';
      else if (appState.complaint?.id === 'STOMACH') complaintValue = 'stomach';
      else if (appState.complaint?.textPatientSpoken) complaintValue = appState.complaint.textPatientSpoken;
      else complaintValue = 'unknown';

      const isSpoken = Boolean(appState.complaint?.textPatientSpoken);
      const recordRes = await api.recordClinicalResponse(appState.backendSessionId, {
        questionId: 'q.chief_complaint',
        rawResponse: appState.complaint?.textPatientSpoken || complaintValue,
        normalizedValue: isSpoken ? null : complaintValue, // Allow backend extraction for voice
        inputMethod: isSpoken ? 'VOICE' : 'TOUCH',
        language: lang,
      });

      if (recordRes?.success) {
        if (recordRes.data?.clinicalSummary) {
          const sum = recordRes.data.clinicalSummary;
          if (sum.primaryConcern) appState.complaint.primaryConcern = sum.primaryConcern;
          if (sum.duration !== undefined) appState.complaint.duration = sum.duration;
          if (sum.severity) appState.complaint.severity = sum.severity;
          if (sum.location) appState.complaint.location = sum.location;
        }
        if (recordRes.data?.next?.question) {
          currentBackendQuestion = recordRes.data.next.question;
          currentProgress = recordRes.data.next.progress;
          appState.currentQuestionSource = currentBackendQuestion.source || 'LLM_DYNAMIC';
        } else if (sessionRes.data.next?.question) {
          currentBackendQuestion = sessionRes.data.next.question;
          currentProgress = sessionRes.data.next.progress;
          appState.currentQuestionSource = currentBackendQuestion.source || 'LLM_DYNAMIC';
        }
      } else if (sessionRes.data.next?.question) {
        currentBackendQuestion = sessionRes.data.next.question;
        currentProgress = sessionRes.data.next.progress;
        appState.currentQuestionSource = currentBackendQuestion.source || 'LLM_DYNAMIC';
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
  // If connected to backend question engine:
  if (appState.backendSessionId && currentBackendQuestion) {
    try {
      const isVoice = inputMethod === 'VOICE';
      const recordRes = await api.recordClinicalResponse(appState.backendSessionId, {
        questionId: currentBackendQuestion.id,
        rawResponse: value,
        normalizedValue: isVoice ? null : value, // Let backend AI extract from voice!
        inputMethod,
        language: appState.language,
      });

      if (recordRes?.success) {
        // Sync authoritative state from clinical summary
        if (recordRes.data?.clinicalSummary) {
          const sum = recordRes.data.clinicalSummary;
          if (sum.primaryConcern) appState.complaint.primaryConcern = sum.primaryConcern;
          if (sum.duration !== undefined) appState.complaint.duration = sum.duration;
          if (sum.severity) appState.complaint.severity = sum.severity;
          if (sum.location) appState.complaint.location = sum.location;
        }

        // Determine mapped option and normalized answer
        const selectedOption = recordRes.data?.selectedOption;
        const mappedLabel =
          typeof selectedOption === 'object'
            ? (selectedOption.label || selectedOption.value)
            : selectedOption;

        appState.latestSelectedOption =
          mappedLabel || (typeof value === 'object' ? JSON.stringify(value) : String(value));

        if (recordRes.data?.recorded?.attribute) {
          appState.latestNormalizedAnswer = `${recordRes.data.recorded.attribute} = ${recordRes.data.recorded.value}`;
        } else if (recordRes.data?.recorded) {
          appState.latestNormalizedAnswer = JSON.stringify(recordRes.data.recorded);
        }

        // Store turn in conversation history (Section 8, 15)
        appState.conversationHistory.push({
          questionId: currentBackendQuestion.id,
          questionText: currentBackendQuestion.text,
          patientResponse: value,
          normalizedAnswer: recordRes.data?.recorded || null,
          selectedOption: appState.latestSelectedOption,
          timestamp: new Date().toISOString(),
        });

        // Visual feedback: brief selection flash on matching tile (Section 1)
        if (selectedOption && currentBackendQuestion.options) {
          const matchIdx = currentBackendQuestion.options.findIndex((opt) => {
            const optVal = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt) : opt;
            const optLbl = typeof opt === 'object' ? (opt.label || '') : String(opt);
            const sVal = typeof selectedOption === 'object' ? (selectedOption.value ?? selectedOption.id ?? selectedOption) : selectedOption;
            return (
              optVal === sVal ||
              optVal === selectedOption ||
              optLbl === selectedOption ||
              (typeof selectedOption === 'string' && optLbl && optLbl.toLowerCase().includes(selectedOption.toLowerCase()))
            );
          });
          if (matchIdx !== -1) {
            const matchedTile = document.querySelector(`.option-tile[data-opt-idx="${matchIdx}"]`);
            if (matchedTile) {
              matchedTile.classList.add('selected');
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }

        const nextResult = recordRes.data?.next;
        if (nextResult?.status === 'complete') {
          router.navigate('documents');
          return;
        }
        currentBackendQuestion = nextResult?.question;
        currentProgress = nextResult?.progress;
        appState.currentQuestionSource = currentBackendQuestion?.source || 'LLM_DYNAMIC';
        notifyStateChange('conversation');
        router.renderCurrentScreen();
        return;
      }
    } catch (e) {
      console.warn('[Conversation] Answer recording fallback:', e);
    }
  }

  // Fallback progression if offline or error
  if (currentBackendQuestion) {
    const attr = currentBackendQuestion.attribute;
    if (attr === 'location') {
      appState.complaint.location = typeof value === 'object' ? value.value || value : value;
    }
    if (attr === 'duration') {
      if (typeof value === 'object' && (value.amount || value.value)) {
        appState.complaint.duration = {
          value: value.amount ?? value.value,
          unit: value.unit || 'days',
        };
      } else if (typeof value === 'number') {
        appState.complaint.duration = { value, unit: 'days' };
      } else {
        appState.complaint.duration = value;
      }
    }
    if (attr === 'severity') {
      const valStr = String(value).toUpperCase();
      if (valStr.includes('MILD') || valStr.includes('कमी') || valStr.includes('हल्का')) appState.complaint.severity = 'MILD';
      else if (valStr.includes('MODERATE') || valStr.includes('मध्यम')) appState.complaint.severity = 'MODERATE';
      else if (valStr.includes('SEVERE') || valStr.includes('तीव्र') || valStr.includes('तेज')) appState.complaint.severity = 'SEVERE';
      else if (valStr.includes('UNBEARABLE') || valStr.includes('असह्य')) appState.complaint.severity = 'UNBEARABLE';
      else appState.complaint.severity = value;
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
