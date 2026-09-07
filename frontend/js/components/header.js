/**
 * Global Kiosk Header Component
 * Clean, compact, white, subtle bottom border, professional clinical identity.
 */

import { t, supportedLanguages } from '../i18n.js';
import { appState, resetSession } from '../state.js';
import { router } from '../router.js';
import { a11y } from '../accessibility.js';
import { audioController } from '../audio.js';

export function renderHeader(container) {
  const currentLangObj = supportedLanguages.find((l) => l.code === appState.language) || supportedLanguages[0];

  container.innerHTML = `
    <div class="kiosk-brand" id="btn-brand-home" title="Start Over / नवीन रुग्ण">
      <div class="kiosk-brand-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 6v12M6 12h12" />
          <rect x="3" y="3" width="18" height="18" rx="4" />
        </svg>
      </div>
      <div class="kiosk-brand-text">
        <span class="kiosk-brand-title">MediKiosk</span>
        <span class="kiosk-brand-sub">Clinical Intake • OPD Kiosk</span>
      </div>
    </div>

    <div class="kiosk-header-right">
      <!-- Quick Language Switch -->
      <button id="btn-quick-lang" class="header-lang-pill" aria-label="Change Language">
        <span aria-hidden="true">🌐</span>
        <span>${currentLangObj.nativeName}</span>
      </button>

      <!-- Audio / Dynamic Mute CTA -->
      <button id="btn-header-audio" class="header-a11y-btn" title="Audio Help / आवाजी मार्गदर्शन" aria-label="Audio Controls">
        <span aria-hidden="true">🔊</span>
      </button>

      <!-- High Contrast Accessibility Toggle -->
      <button id="btn-header-contrast" class="header-a11y-btn" title="High Contrast Mode / उच्च कॉन्ट्रास्ट" aria-label="Toggle High Contrast">
        <span aria-hidden="true">🌓</span>
      </button>

      <!-- Global Staff / Patient Help CTA -->
      <button id="btn-global-help" class="btn-help" aria-label="${t('needHelp', appState.language)}">
        <span aria-hidden="true">❓</span>
        <span>${t('help', appState.language)}</span>
      </button>
    </div>
  `;

  // Attach Event Handlers
  container.querySelector('#btn-brand-home')?.addEventListener('click', () => {
    resetSession();
    router.navigate('welcome');
  });

  container.querySelector('#btn-quick-lang')?.addEventListener('click', () => {
    router.navigate('language');
  });

  const audioBtn = container.querySelector('#btn-header-audio');
  const updateAudioBtnState = () => {
    if (!audioBtn) return;
    if (audioController.isMuted) {
      audioBtn.classList.add('muted');
      audioBtn.classList.remove('speaking');
      audioBtn.setAttribute('title', t('unmute', appState.language) || 'Muted — Click to unmute audio');
      audioBtn.setAttribute('aria-label', 'Audio is muted. Click to unmute.');
      audioBtn.innerHTML = `<span aria-hidden="true">🔇</span><span class="mute-badge">MUTED</span>`;
    } else if (audioController.isSpeaking) {
      audioBtn.classList.remove('muted');
      audioBtn.classList.add('speaking');
      audioBtn.setAttribute('title', t('stopAudio', appState.language) || 'Speaking — Click to mute');
      audioBtn.setAttribute('aria-label', 'Audio is speaking. Click to mute.');
      audioBtn.innerHTML = `<span aria-hidden="true">🔊</span>`;
    } else {
      audioBtn.classList.remove('muted');
      audioBtn.classList.remove('speaking');
      audioBtn.setAttribute('title', t('muteAudio', appState.language) || 'Audio Active — Click to mute');
      audioBtn.setAttribute('aria-label', 'Audio is active. Click to mute.');
      audioBtn.innerHTML = `<span aria-hidden="true">🔊</span>`;
    }
  };

  // Initial sync & subscriptions
  updateAudioBtnState();
  audioController.onMuteChange(updateAudioBtnState);
  audioController.onSpeakingChange(updateAudioBtnState);

  audioBtn?.addEventListener('click', async () => {
    if (audioController.isMuted) {
      // Un-mute and provide immediate positive audio cue
      audioController.setMuted(false);
      audioController.playChime();
      const currentPrompt = t('welcomeAudioPrompt', appState.language) || 'MediKiosk audio assistant active.';
      await audioController.speak(currentPrompt, appState.language);
    } else if (audioController.isSpeaking) {
      // If speaking, clicking stops and mutes
      audioController.stop();
      audioController.setMuted(true);
    } else {
      // Mute audio
      audioController.setMuted(true);
    }
  });

  container.querySelector('#btn-header-contrast')?.addEventListener('click', () => {
    a11y.toggleHighContrast();
  });

  container.querySelector('#btn-global-help')?.addEventListener('click', () => {
    router.openHelpModal();
  });
}
