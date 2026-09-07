/**
 * Screen 2: Language Selection Screen
 * Large, accessible touch cards with authentic Devanagari typography.
 */

import { t, supportedLanguages } from '../i18n.js';
import { appState, setLanguage } from '../state.js';
import { router } from '../router.js';
import { audioController } from '../audio.js';

export function renderLanguageScreen() {
  const lang = appState.language;

  const cardsHtml = supportedLanguages
    .map((l) => {
      const isSelected = appState.language === l.code;
      return `
        <button
          class="lang-card ${isSelected ? 'selected' : ''}"
          data-lang-code="${l.code}"
          aria-label="${l.englishName} (${l.nativeName})"
        >
          <div style="font-size: 2.75rem; margin-bottom: 0.25rem;">${l.flag}</div>
          <div class="lang-native-text">${l.nativeName}</div>
          <div class="lang-secondary-text">${l.englishName}</div>
        </button>
      `;
    })
    .join('');

  const html = `
    <div class="screen-card" style="max-width: 960px; margin: 0 auto; text-align: center;">
      <!-- Audio Narration Pill -->
      <button id="btn-lang-audio" class="audio-prompt-bar">
        <span aria-hidden="true">🔊</span>
        <span>${t('listen', lang)}</span>
      </button>

      <h1 class="kiosk-question-title" style="color: var(--primary);">
        ${t('selectLanguage', lang)}
      </h1>
      <p class="kiosk-question-subtitle">
        ${t('selectLanguageSub', lang)}
      </p>

      <div class="lang-card-grid">
        ${cardsHtml}
      </div>

      <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <button id="btn-lang-back" class="btn btn-secondary" style="min-height: 50px;">
          ← ${t('back', lang)}
        </button>
        <span style="font-size: var(--font-size-xs); color: var(--muted-text);">
          Select any language to proceed automatically
        </span>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.querySelectorAll('.lang-card').forEach((card) => {
        card.addEventListener('click', () => {
          const selectedCode = card.getAttribute('data-lang-code');
          setLanguage(selectedCode);
          // Advance smoothly to next stage
          setTimeout(() => {
            router.navigate('identify');
          }, 200);
        });
      });

      document.getElementById('btn-lang-back')?.addEventListener('click', () => {
        router.navigate('welcome');
      });

      const audioBtn = document.getElementById('btn-lang-audio');
      audioBtn?.addEventListener('click', async () => {
        if (audioController.isSpeaking) {
          audioController.stop();
          audioBtn.classList.remove('playing');
          return;
        }
        audioBtn.classList.add('playing');
        await audioController.speak(t('selectLanguage', appState.language), appState.language);
        audioBtn.classList.remove('playing');
      });
    },
  };
}
