/**
 * Debug Panel Component (Section 39, 40, Phase 6.3)
 * Development-only visual inspectable trace for clinical intake & questioning.
 */

import { appState } from '../state.js';

export function renderDebugPanel() {
  const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isDevMode) return '';

  const factsCount = appState.backendSessionId ? 'Active' : 'Offline/Fallback';
  const initialComplaintText = appState.complaint.initialComplaintTranscript || appState.complaint.textPatientSpoken;

  return `
    <div id="kiosk-debug-panel" style="
      position: fixed;
      bottom: 10px;
      right: 10px;
      max-width: 440px;
      background: rgba(15, 23, 42, 0.96);
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 11px;
      z-index: 99999;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 8px;">
        <span style="font-weight: bold; color: #38bdf8;">🩺 MEDIKIOSK INTAKE DEBUG</span>
        <span style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #94a3b8;">${factsCount}</span>
      </div>

      <div style="margin-bottom: 4px;">
        <span style="color: #94a3b8;">Session ID:</span>
        <span style="color: #f1f5f9;">${appState.backendSessionId || 'none'}</span>
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
        <span style="color: #94a3b8;">Latest Response:</span>
        <span style="color: #fef08a; font-weight: bold;">${appState.latestPatientResponseTranscript ? `"${appState.latestPatientResponseTranscript}"` : 'none'}</span>
      </div>

      <div style="margin-bottom: 4px;">
        <span style="color: #94a3b8;">Normalized Answer:</span>
        <span style="color: #86efac;">${appState.latestNormalizedAnswer || 'null'}</span>
      </div>

      <div style="margin-bottom: 4px;">
        <span style="color: #94a3b8;">Selected Option:</span>
        <span style="color: #93c5fd; font-weight: bold;">${appState.latestSelectedOption || 'null'}</span>
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
  `;
}
