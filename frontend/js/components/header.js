/**
 * Global Kiosk Header Component (Section 9)
 */

import { t, supportedLanguages } from '../i18n.js';
import { appState, setLanguage } from '../state.js';

export function renderHeader(container) {
  const currentLangObj = supportedLanguages.find((l) => l.code === appState.language) || supportedLanguages[0];

  container.innerHTML = `
    <div class="kiosk-brand">
      <div class="kiosk-brand-icon" aria-hidden="true">🏥</div>
      <div>
        <span>${t('appName', appState.language)}</span>
        <span style="font-size: 0.75rem; font-weight: 600; color: var(--muted-text); display: block;">SIH26047</span>
      </div>
    </div>

    <div class="kiosk-header-right">
      <!-- Language Quick-Switch Pill -->
      <button id="btn-quick-lang" class="header-lang-pill" aria-label="Change Language">
        🌐 ${currentLangObj.nativeName}
      </button>

      <!-- Global Help CTA (Section 35) -->
      <button id="btn-global-help" class="btn-help" aria-label="${t('needHelp', appState.language)}">
        <span aria-hidden="true">❓</span>
        <span>${t('help', appState.language)}</span>
      </button>
    </div>
  `;
}
