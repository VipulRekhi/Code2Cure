/**
 * Accessibility Utilities (Section 36)
 * Keyboard navigation, screen-reader live announcements, high contrast toggles.
 */

class AccessibilityManager {
  constructor() {
    this.highContrast = false;
    this.liveRegion = null;
  }

  init() {
    this.createLiveRegion();
    this.bindKeyboardShortcuts();
  }

  createLiveRegion() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.id = 'a11y-live-announcer';
    this.liveRegion.className = 'sr-only';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.liveRegion);
  }

  announce(message) {
    if (this.liveRegion) {
      this.liveRegion.textContent = '';
      setTimeout(() => {
        this.liveRegion.textContent = message;
      }, 50);
    }
  }

  toggleHighContrast() {
    this.highContrast = !this.highContrast;
    document.body.classList.toggle('high-contrast', this.highContrast);
    this.announce(this.highContrast ? 'High contrast enabled' : 'High contrast disabled');
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Alt + C for High Contrast
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.toggleHighContrast();
      }
    });
  }
}

export const a11y = new AccessibilityManager();
