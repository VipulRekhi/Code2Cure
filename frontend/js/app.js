/**
 * MediKiosk Patient Kiosk Application Entrypoint (Phase 2)
 * Pure Vanilla HTML5, CSS3, JavaScript (ES Modules).
 */

import { router } from './router.js';
import { subscribe, appState } from './state.js';
import { a11y } from './accessibility.js';
import { sessionService } from './services/sessionService.js';
import { api } from './api.js';
import { openModal } from './components/modal.js';
import { t } from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[MediKiosk] Bootstrapping Patient Kiosk Frontend (Phase 2)...');

  // 1. Accessibility initialization
  a11y.init();

  // 2. Router initialization
  router.init();

  // 3. React to language changes
  subscribe((state, changedKey) => {
    if (changedKey === 'language' || changedKey === 'reset') {
      router.renderCurrentScreen();
    }
  });

  // 4. Inactivity Monitor (Section 28)
  sessionService.startMonitoring((remainingSeconds) => {
    openModal({
      title: '⏰ Are you still there?',
      contentHtml: `
        <p>No activity detected. To protect your privacy, this kiosk session will reset in <strong>${remainingSeconds} seconds</strong>.</p>
        <p style="margin-top: 1rem; color: var(--muted-text);">Tap anywhere to continue your consultation intake.</p>
      `,
      onClose: () => {
        sessionService.resetTimer();
      },
    });
  });

  // 5. Backend Connection Check (Section 45)
  try {
    const health = await api.checkHealth();
    if (health?.success && health?.data?.status === 'ok') {
      console.log('[MediKiosk] Backend Express API connection confirmed:', health.data);
    } else {
      console.warn('[MediKiosk] Backend Express API offline or returned error.');
    }
  } catch (err) {
    console.warn('[MediKiosk] Backend check error:', err);
  }
});
