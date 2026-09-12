/**
 * Debug Panel Component (Developer Only)
 * Discreet, minimized floating toggle that never obscures patient kiosk CTAs.
 */

import { appState } from '../state.js';

let isExpanded = false;

export function toggleDebugPanel() {
  isExpanded = !isExpanded;
  const panel = document.getElementById('kiosk-debug-panel');
  if (panel) {
    panel.style.display = isExpanded ? 'block' : 'none';
  }
  const badge = document.getElementById('debug-toggle-badge');
  if (badge) {
    badge.textContent = isExpanded ? '✕ Close Debug' : '🩺 Debug';
  }
}

export function renderDebugPanel() {
  const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isDevMode) return '';

  const factsCount = appState.backendSessionId ? 'Active' : 'Offline/Fallback';
  const initialComplaintText = appState.complaint.initialComplaintTranscript || appState.complaint.textPatientSpoken;

  const isQuestionDesynced = Boolean(
    appState.activeQuestionId &&
    appState.latestAnswerQuestionId &&
    appState.activeQuestionId !== appState.latestAnswerQuestionId
  );

  return `
    <!-- Floating discreet badge -->
    <div style="position: fixed; bottom: 8px; right: 12px; z-index: 99999; display: flex; gap: 6px; align-items: center;">
      <a href="#/doctor" style="
        background: #1e3a8a;
        color: #ffffff;
        border: 1px solid #3b82f6;
        border-radius: 9999px;
        padding: 4px 10px;
        font-family: monospace;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        🩺 Doctor Portal
      </a>
      <button id="debug-toggle-badge" onclick="window.__toggleMediKioskDebug && window.__toggleMediKioskDebug()" style="
        background: #0f172a;
        color: #94a3b8;
        border: 1px solid #334155;
        border-radius: 9999px;
        padding: 4px 10px;
        font-family: monospace;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        ${isExpanded ? '✕ Close Debug' : '⚙️ Trace'}
      </button>

      <!-- Expandable Debug Body -->
      <div id="kiosk-debug-panel" style="
        display: ${isExpanded ? 'block' : 'none'};
        position: absolute;
        bottom: 32px;
        right: 0;
        width: 380px;
        max-height: 480px;
        overflow-y: auto;
        background: rgba(15, 23, 42, 0.98);
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 12px;
        font-family: monospace;
        font-size: 11px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 8px;">
          <span style="font-weight: bold; color: #38bdf8;">🩺 MEDIKIOSK INTAKE TRACE</span>
          <span style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #94a3b8;">${factsCount}</span>
        </div>

        ${isQuestionDesynced ? `
          <div style="background: #dc2626; color: white; padding: 4px 6px; border-radius: 4px; font-weight: bold; margin-bottom: 8px; text-align: center;">
            ⚠️ QUESTION DESYNC DETECTED!
          </div>
        ` : ''}

        <div style="margin-bottom: 4px;">
          <span style="color: #94a3b8;">Session ID:</span>
          <span style="color: #f1f5f9;">${appState.backendSessionId || 'none'}</span>
        </div>

        <div style="margin-bottom: 4px;">
          <span style="color: #94a3b8;">Active Q ID:</span>
          <span style="color: #38bdf8; font-weight: bold;">${appState.activeQuestionId || 'none'}</span>
        </div>

        <div style="margin-bottom: 4px;">
          <span style="color: #94a3b8;">Answered Q ID:</span>
          <span style="color: #f472b6; font-weight: bold;">${appState.latestAnswerQuestionId || 'none'}</span>
        </div>

        <div style="margin-bottom: 4px;">
          <span style="color: #94a3b8;">Complaint:</span>
          <span style="color: #a7f3d0; font-weight: bold;">${appState.complaint.id || 'null'}</span>
        </div>

        <div style="margin-bottom: 4px;">
          <span style="color: #94a3b8;">Initial Complaint:</span>
          <span style="color: #fed7aa;">${initialComplaintText ? `"${initialComplaintText}"` : 'none'}</span>
        </div>

        <div style="margin-bottom: 4px;">
          <span style="color: #94a3b8;">Latest Spoken:</span>
          <span style="color: #fef08a; font-weight: bold;">${appState.latestPatientResponseTranscript ? `"${appState.latestPatientResponseTranscript}"` : 'none'}</span>
        </div>

        <div style="margin-bottom: 4px;">
          <span style="color: #94a3b8;">Normalized Value:</span>
          <span style="color: #86efac;">${appState.latestNormalizedAnswer || 'null'}</span>
        </div>

        <div style="margin-bottom: 4px;">
          <span style="color: #94a3b8;">Question Source:</span>
          <span style="color: #c084fc;">${appState.currentQuestionSource || 'LLM_DYNAMIC'}</span>
        </div>

        <div style="margin-bottom: 4px;">
          <span style="color: #94a3b8;">Duration:</span>
          <span style="color: #fde047;">${appState.complaint.duration ? JSON.stringify(appState.complaint.duration) : 'null'}</span>
        </div>

        <div>
          <span style="color: #94a3b8;">Location:</span>
          <span style="color: #cbd5e1;">${appState.complaint.location || 'null'}</span>
        </div>
      </div>
    </div>
  `;
}

// Bind to window for click handler
if (typeof window !== 'undefined') {
  window.__toggleMediKioskDebug = toggleDebugPanel;
}
