/**
 * Screen 1: Welcome Screen (Hero Split Layout)
 * Reference: "Your health story, ready for care."
 * Pure Vanilla HTML5, CSS3, ES Module.
 */

import { t } from '../i18n.js';
import { appState, resetSession, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { audioController } from '../audio.js';
import { DEMO_PATIENT } from '../mock/mockPatient.js';

export function renderWelcomeScreen() {
  // Purge old clinical state on arrival at welcome screen
  resetSession(false);
  const lang = appState.language;

  const headline = t('welcomeHeroHeadline', lang) || 'Your health story,\nready for care.';
  const headlineHtml = headline.replace('\n', '<br>');
  const subMessage = t('welcomeHeroSub', lang) || "We listen to your symptoms, organize your records, and prepare structured information for your clinician.";
  const primaryCtaText = t('beginHealthCheck', lang) || "BEGIN HEALTH CHECK";
  const abhaCtaText = t('haveAbhaNumber', lang) || "I HAVE AN ABHA NUMBER";

  const html = `
    <div class="screen-card screen-card-split" style="max-width: 1140px; margin: 0 auto;">
      <!-- Left Column: Copy, CTAs, Trust Items -->
      <div style="display: flex; flex-direction: column; justify-content: center;">
        <!-- Audio Narration Pill -->
        <button id="btn-welcome-audio" class="audio-prompt-bar">
          <span aria-hidden="true">🔊</span>
          <span>${t('listen', lang)}</span>
        </button>

        <h1 class="kiosk-question-title" style="font-size: var(--font-size-hero); line-height: 1.15; color: var(--primary); margin-bottom: 1.25rem;">
          ${headlineHtml}
        </h1>

        <p style="font-size: var(--font-size-base); color: var(--text-secondary); line-height: 1.6; margin-bottom: 2rem; max-width: 500px;">
          ${subMessage}
        </p>

        <!-- Primary CTA: Begin Health Check -->
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 440px;">
          <button id="btn-welcome-start" class="btn btn-primary btn-huge" style="width: 100%;">
            <span>${primaryCtaText}</span>
            <span style="font-size: 1.5rem; line-height: 1;">→</span>
          </button>

          <!-- Secondary CTA: I have an ABHA number -->
          <button id="btn-welcome-abha" class="btn btn-secondary" style="width: 100%; min-height: 54px; font-size: var(--font-size-sm); font-weight: 700; color: var(--primary);">
            <span aria-hidden="true">🆔</span>
            <span>${abhaCtaText}</span>
          </button>
        </div>

        <!-- Three Trust / Value Badges -->
        <div class="trust-badges-row">
          <div class="trust-badge-item">
            <div class="trust-badge-icon" aria-hidden="true">🎙</div>
            <span>${t('trustSpeak', lang) || 'Speak naturally'}</span>
          </div>
          <div class="trust-badge-item">
            <div class="trust-badge-icon" aria-hidden="true">📄</div>
            <span>${t('trustScan', lang) || 'Scan your records'}</span>
          </div>
          <div class="trust-badge-item">
            <div class="trust-badge-icon" aria-hidden="true">🔒</div>
            <span>${t('trustControl', lang) || "You're in control"}</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Framed Healthcare Hero Visual -->
      <div style="display: flex; align-items: center; justify-content: center;">
        <div style="width: 100%; max-width: 480px; aspect-ratio: 1 / 1; background: linear-gradient(135deg, #F0F6FC 0%, #E6F4F4 100%); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 2rem; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); position: relative; overflow: hidden;">
          <!-- Sovereign Healthcare Hero SVG -->
          <svg viewBox="0 0 400 400" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <!-- Background Circular Aura -->
            <circle cx="200" cy="200" r="160" fill="#FFFFFF" fill-opacity="0.75" stroke="#E5E7EB" stroke-width="2" />
            <circle cx="200" cy="200" r="120" fill="#EDF4FB" />

            <!-- Medical Shield Base -->
            <path d="M200 80C240 80 280 95 280 95V210C280 270 200 310 200 310C200 310 120 270 120 210V95C120 95 160 80 200 80Z" fill="#1A3A5C" />
            
            <!-- Safe Teal Inner Shield Layer -->
            <path d="M200 96C232 96 264 108 264 108V206C264 256 200 292 200 292C200 292 136 256 136 206V108C136 108 168 96 200 96Z" fill="#008080" />

            <!-- Pure White Clinical Cross Symbol -->
            <rect x="186" y="140" width="28" height="84" rx="6" fill="#FFFFFF" />
            <rect x="158" y="168" width="84" height="28" rx="6" fill="#FFFFFF" />

            <!-- Digital Health Waves & Records Floating Badges -->
            <g transform="translate(60, 240)">
              <rect width="110" height="48" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" />
              <path d="M16 24h12l4-8 8 16 6-10 4 2h14" stroke="#4A90D9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="86" cy="24" r="5" fill="#10B981" />
            </g>

            <g transform="translate(240, 110)">
              <rect width="100" height="52" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" />
              <line x1="16" y1="18" x2="60" y2="18" stroke="#1A3A5C" stroke-width="3" stroke-linecap="round" />
              <line x1="16" y1="28" x2="80" y2="28" stroke="#6B7280" stroke-width="2.5" stroke-linecap="round" />
              <line x1="16" y1="38" x2="50" y2="38" stroke="#008080" stroke-width="2.5" stroke-linecap="round" />
            </g>

            <!-- Human Doctor & Stethoscope Touchpoints -->
            <circle cx="200" cy="335" r="8" fill="#4A90D9" />
            <path d="M190 345h20" stroke="#1A3A5C" stroke-width="3" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      // 1. Primary Start Button
      document.getElementById('btn-welcome-start')?.addEventListener('click', () => {
        resetSession();
        router.navigate('language');
      });

      // 2. Secondary ABHA Button
      document.getElementById('btn-welcome-abha')?.addEventListener('click', () => {
        resetSession();
        appState.patient = { ...DEMO_PATIENT, type: 'EXISTING_ABHA' };
        notifyStateChange('patient');
        router.navigate('identify');
      });

      // 3. Audio Narration Button
      const welcomeAudioBtn = document.getElementById('btn-welcome-audio');
      welcomeAudioBtn?.addEventListener('click', async () => {
        if (audioController.isSpeaking) {
          audioController.stop();
          welcomeAudioBtn.classList.remove('playing');
          return;
        }
        if (audioController.isMuted) {
          audioController.setMuted(false);
        }
        welcomeAudioBtn.classList.add('playing');
        const audioText = `${t('welcomeHeroHeadline', appState.language)}. ${t('welcomeHeroSub', appState.language)}`;
        await audioController.speak(audioText, appState.language);
        welcomeAudioBtn.classList.remove('playing');
      });
    },
  };
}
