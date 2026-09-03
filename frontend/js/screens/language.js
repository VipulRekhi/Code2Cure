/**
 * Screen 2: Language Selection Screen (Section 12)
 */

import { t, supportedLanguages } from '../i18n.js';
import { appState, setLanguage } from '../state.js';
import { router } from '../router.js';

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
          <div style="font-size: 3rem;">${l.flag}</div>
          <div class="lang-native-text">${l.nativeName}</div>
          <div class="lang-secondary-text">${l.englishName}</div>
        </button>
      `;
    })
    .join('');

  const html = `
    <div class="screen-card">
      <h1 class="kiosk-question-title">${t('selectLanguage', lang)}</h1>
      <p class="kiosk-question-subtitle">${t('selectLanguageSub', lang)}</p>

      <div class="lang-card-grid">
        ${cardsHtml}
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      document.querySelectorAll('.lang-card').forEach((card) => {
        card.addEventListener('click', (e) => {
          const selectedCode = card.getAttribute('data-lang-code');
          setLanguage(selectedCode);
          // Advance smoothly to next stage
          setTimeout(() => {
            router.navigate('identify');
          }, 250);
        });
      });
    },
  };
}
