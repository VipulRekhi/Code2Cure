/**
 * Screen 7: Conversational History Screen (Phase 3 Backend Engine Integration)
 * Dynamically driven by the backend Clinical Question Engine with rule-based adaptation.
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange, registerResetCallback } from '../state.js';
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

export function resetConversationState() {
  currentBackendQuestion = null;
  currentProgress = null;
  isInitializing = false;
  fallbackIndex = 0;
}
export const resetConversationIndex = resetConversationState;

// Register synchronous reset handler
registerResetCallback(() => {
  resetConversationState();
});

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
    qOptions = (currentBackendQuestion.options || []).map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value ?? opt.id ?? opt.label ?? opt,
          label: opt.label || opt.labels?.[lang] || opt.labels?.mr || opt.labels?.en || opt.value || String(opt),
          icon: opt.icon || '👉',
        };
      }
      return {
        value: opt,
        label: String(opt),
        icon: '👉',
      };
    });
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

  appState.activeQuestionId = qId;

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
          const chosenLabel = typeof selectedOption === 'object' && selectedOption !== null
            ? (selectedOption.label || selectedOption.value)
            : String(selectedOption);
          const chosenValue = typeof selectedOption === 'object' && selectedOption !== null
            ? (selectedOption.value ?? selectedOption.id ?? selectedOption.label)
            : selectedOption;
          appState.latestPatientResponseTranscript = chosenLabel;
          await handleAnswerSubmission(chosenValue, 'TOUCH');
        });
      });

      // 3. Voice Mic Click (Acoustic Echo Prevention: Stop TTS before recording, Section 45)
      document.getElementById('btn-voice-mic')?.addEventListener('click', () => {
        ttsService.stop();

        if (speechService.isListening()) {
          speechService.stopListening();
          return;
        }

        const micBtn = document.getElementById('btn-voice-mic');
        const statusText = document.querySelector('.voice-status-text');

        speechService.startListening(
          appState.language,
          ({ status, transcript, message }) => {
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
              notifyStateChange('voice');
              router.renderCurrentScreen();
              return;
            }

            // SERVICE_UNAVAILABLE or error state
            if (micBtn) {
              micBtn.classList.remove('listening');
              micBtn.removeAttribute('disabled');
            }
            if (statusText) {
              if (status === 'SERVICE_UNAVAILABLE') {
                statusText.innerHTML = `
                  <div class="voice-alert" style="color: #b91c1c; font-weight: 500;">
                    <span>${t('voiceUnavailable', lang)}</span><br>
                    <small style="color: #4b5563;">${t('voiceUnavailableSub', lang)}</small>
                  </div>`;
              } else {
                const safeMessage = (message && !message.includes('port') && !message.includes('IndicConformer') && !message.includes('runtime'))
                  ? message
                  : `${t('voiceUnavailable', lang)} ${t('voiceUnavailableSub', lang)}`;
                statusText.textContent = safeMessage;
              }
            }
            notifyStateChange('voice');
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
      else if (appState.complaint?.id === 'SHOULDER_PAIN') complaintValue = 'shoulder_pain';
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

        // Store chief complaint turn into conversation history (Phase 7 Section 11)
        const ccQuestionText = lang === 'mr' ? 'तुम्हाला काय त्रास होतोय?' : lang === 'hi' ? 'आपको क्या तकलीफ हो रही है?' : 'What problem are you experiencing?';
        appState.conversationHistory = [{
          questionId: 'q.chief_complaint',
          questionText: ccQuestionText,
          patientResponse: appState.complaint?.textPatientSpoken || complaintValue,
          originalTranscript: isSpoken ? appState.complaint.textPatientSpoken : null,
          normalizedAnswer: recordRes.data?.recorded || complaintValue,
          selectedOption: appState.complaint?.textPatientSpoken || complaintValue,
          inputMethod: isSpoken ? 'VOICE' : 'TOUCH',
          timestamp: new Date().toISOString(),
        }];
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
    appState.latestAnswerQuestionId = currentBackendQuestion.id;
    try {
      const isVoice = inputMethod === 'VOICE';
      const recordRes = await api.recordClinicalResponse(appState.backendSessionId, {
        questionId: currentBackendQuestion.id,
        rawResponse: value,
        normalizedValue: isVoice ? null : value, // Let backend AI extract from voice!
        inputMethod,
        language: appState.language,
      });

      // Handle Stale Question Submission (HTTP 409)
      if (recordRes?.status === 409 || recordRes?.error === 'STALE_QUESTION_SUBMISSION') {
        console.warn('[Conversation] Stale question submission detected. Re-synchronizing active question...');
        const refreshRes = await api.getNextClinicalQuestion(appState.backendSessionId, appState.language);
        if (refreshRes?.data?.question) {
          currentBackendQuestion = refreshRes.data.question;
          appState.activeQuestionId = currentBackendQuestion.id;
          currentProgress = refreshRes.data.progress;
          appState.currentQuestionSource = currentBackendQuestion.source || 'LLM_DYNAMIC';
        }
        notifyStateChange('conversation');
        router.renderCurrentScreen();
        return;
      }

      if (recordRes?.success) {
        // Sync authoritative state from clinical summary
        if (recordRes.data?.clinicalSummary) {
          const sum = recordRes.data.clinicalSummary;
          if (sum.primaryConcern) appState.complaint.primaryConcern = sum.primaryConcern;
          if (sum.duration !== undefined) appState.complaint.duration = sum.duration;
          if (sum.severity) appState.complaint.severity = sum.severity;
          if (sum.location) appState.complaint.location = sum.location;
        }

        // If patient gave incidental info without answering active question:
        if (recordRes.data?.answersCurrentQuestion === false) {
          appState.latestNormalizedAnswer = 'INCIDENTAL_FACT_RECORDED';
          appState.latestSelectedOption = null;
          notifyStateChange('conversation');
          router.renderCurrentScreen();
          return;
        }

        // Determine mapped option and normalized answer
        const selectedOption = recordRes.data?.selectedOption;
        const mappedLabel =
          typeof selectedOption === 'object' && selectedOption !== null
            ? (selectedOption.label || selectedOption.value)
            : selectedOption;

        appState.latestSelectedOption =
          mappedLabel || (typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? ''));

        if (recordRes.data?.recorded?.attribute) {
          appState.latestNormalizedAnswer = `${recordRes.data.recorded.attribute} = ${recordRes.data.recorded.value}`;
        } else if (recordRes.data?.recorded) {
          appState.latestNormalizedAnswer = JSON.stringify(recordRes.data.recorded);
        } else {
          appState.latestNormalizedAnswer = String(recordRes.data?.recorded?.value ?? value ?? 'null');
        }

        // Store turn in conversation history (Section 8, 15, Phase 7 Section 11)
        appState.conversationHistory.push({
          questionId: currentBackendQuestion.id,
          questionText: currentBackendQuestion.text,
          patientResponse: value,
          originalTranscript: isVoice && typeof value === 'string' ? value : null,
          normalizedAnswer: recordRes.data?.recorded || null,
          selectedOption: appState.latestSelectedOption,
          inputMethod,
          options: currentBackendQuestion.options || [],
          timestamp: new Date().toISOString(),
        });

        // Visual feedback: brief selection flash on matching tile (Section 1)
        if (selectedOption && currentBackendQuestion.options) {
          const matchIdx = currentBackendQuestion.options.findIndex((opt) => {
            const optVal = typeof opt === 'object' && opt !== null ? (opt.value ?? opt.id ?? opt) : opt;
            const optLbl = typeof opt === 'object' && opt !== null ? (opt.label || opt.labels?.mr || opt.labels?.en || opt.value || '') : String(opt ?? '');
            const sVal = typeof selectedOption === 'object' && selectedOption !== null ? (selectedOption.value ?? selectedOption.id ?? selectedOption) : selectedOption;
            const sValStr = String(sVal ?? '').toLowerCase().trim();
            const optValStr = String(optVal ?? '').toLowerCase().trim();
            const optLblStr = String(optLbl ?? '').toLowerCase().trim();
            return (
              optVal === sVal ||
              optValStr === sValStr ||
              optLblStr === sValStr ||
              (sValStr && optLblStr.includes(sValStr))
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
        appState.activeQuestionId = currentBackendQuestion?.id || null;
        notifyStateChange('conversation');
        router.renderCurrentScreen();
        return;
      } else {
        // Extraction failed or unverified: DO NOT advance question! Keep on current question.
        appState.latestNormalizedAnswer = 'UNVERIFIED_VOICE';
        appState.latestSelectedOption = null;
        notifyStateChange('conversation');
        router.renderCurrentScreen();
        return;
      }
    } catch (e) {
      console.warn('[Conversation] Answer recording error:', e);
      appState.latestNormalizedAnswer = 'ERROR';
      appState.latestSelectedOption = null;
      notifyStateChange('conversation');
      router.renderCurrentScreen();
      return;
    }
  }

  // Fallback progression ONLY if offline / zero backendSessionId
  if (!appState.backendSessionId) {
    if (fallbackIndex < MOCK_QUESTION_FLOW.length - 1) {
      fallbackIndex++;
      router.renderCurrentScreen();
    } else {
      fallbackIndex = 0;
      router.navigate('documents');
    }
  }
}
