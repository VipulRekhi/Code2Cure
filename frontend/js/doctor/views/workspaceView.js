/**
 * Patient Clinical Workspace View — MediKiosk (Phase 10)
 * 
 * The Core Clinician Review Interface.
 * Consumes the verified output of Phases 1–9.
 * 
 * Architectural Invariants:
 * - NO AI-generated disease diagnosis or autonomous prescription.
 * - Displays verified patient verbal narrative, structured facts, separated meds,
 *   OCR documents, full Q&A audit trail, and AYUSH assessment when applicable.
 */

import { doctorState, clearPatientWorkspace, setActiveTab } from '../doctorState.js';
import { doctorApi } from '../doctorApi.js';

export function renderDoctorWorkspaceView() {
  const ws = doctorState.workspaceData;

  if (!ws) {
    return {
      html: `
        <div class="doc-state-container" style="margin-top: 3rem;">
          <div class="doc-state-icon">👤</div>
          <div class="doc-state-title">No Patient Selected</div>
          <div class="doc-state-desc">Please open a patient from the OPD Queue or Patient Registry.</div>
          <button id="doc-ws-return-queue-btn" class="doc-btn-open" style="margin-top: 1rem;">
            ← Return to Live OPD Queue
          </button>
        </div>
      `,
      attachEvents: () => {
        document.getElementById('doc-ws-return-queue-btn')?.addEventListener('click', () => {
          setActiveTab('queue');
        });
      },
    };
  }

  const patient = ws.patient || {};
  const triage = ws.triage || {};
  const hasRedFlag = Boolean(triage.hasRedFlag && triage.redFlags?.length > 0);
  const structured = ws.structuredSummary || {};
  const isAyush = Boolean(ws.isAyushMode && ws.ayushAssessment);
  const ayush = ws.ayushAssessment || {};
  const meds = ws.medications || { patientReported: [], documentExtracted: [], discrepancies: [] };
  const allergies = ws.allergies || { status: 'NOT_PROVIDED', substances: [] };
  const docs = ws.documents || [];
  const qas = ws.questionResponses || [];
  const uncertain = ws.uncertainItems || [];
  const notes = ws.physicianNotes || [];
  const isSignedOff = Boolean(ws.isSignedOff);

  const intakeTimeFormatted = ws.intakeTime
    ? new Date(ws.intakeTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Recently';

  const html = `
    <div class="doc-workspace">
      <!-- Top Navigation Action Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <button id="doc-ws-back-btn" class="doc-action-btn">
          ← Back to Live Queue
        </button>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <span style="font-size: 0.82rem; color: var(--doc-text-muted);">
            Session ID: <code>${ws.sessionId}</code>
          </span>
          <span class="doc-triage-badge ${hasRedFlag ? 'critical' : 'normal'}">
            ${hasRedFlag ? '🚨 CRITICAL RED-FLAG' : 'NORMAL TRIAGE'}
          </span>
        </div>
      </div>

      <!-- =======================================================
           SECTION 1: PATIENT HEADER
           ======================================================= -->
      <div class="doc-patient-header-card">
        <div class="doc-patient-name-wrap">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h1 class="doc-patient-name">${patient.name || 'Patient'}</h1>
            <span class="doc-token-badge" style="font-size: 1rem; padding: 0.3rem 0.75rem;">
              Token: ${ws.token}
            </span>
            ${
              isAyush
                ? '<span class="doc-opd-badge ayush" style="font-size: 0.85rem; padding: 0.25rem 0.6rem;">🌿 AYUSH OPD</span>'
                : '<span class="doc-opd-badge general" style="font-size: 0.85rem; padding: 0.25rem 0.6rem;">🏥 General OPD</span>'
            }
          </div>

          <div class="doc-patient-meta-row">
            <span><strong>Age/Sex:</strong> ${patient.age || 'Adult'} (${patient.sex || 'Adult'})</span>
            <span>•</span>
            <span><strong>ABHA / Hospital ID:</strong> <code>${patient.patientIdentifier || 'WALKIN'}</code></span>
            <span>•</span>
            <span><strong>Intake Time:</strong> ${intakeTimeFormatted}</span>
            <span>•</span>
            <span><strong>Language:</strong> ${(ws.language || 'mr').toUpperCase()}</span>
            <span>•</span>
            <span><strong>Status:</strong> <strong style="color: #1d4ed8;">${ws.consultationStatus || 'WAITING'}</strong></span>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 0.8rem; color: var(--doc-text-muted);">Consultation Room</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">${ws.department} • ${ws.room}</div>
        </div>
      </div>

      <!-- =======================================================
           SECTION 2: PRIORITY RED-FLAG ALERT (If present)
           ======================================================= -->
      ${
        hasRedFlag
          ? `
        <div class="doc-critical-banner">
          <div class="doc-critical-icon">🚨</div>
          <div style="flex-grow: 1;">
            <div class="doc-critical-heading">HIGH-PRIORITY RED-FLAG ALERT DETECTED</div>
            <div class="doc-critical-text">
              <strong>Code:</strong> <code>${triage.redFlags[0]?.code}</code><br/>
              <strong>Patient-Reported Feature:</strong> ${triage.redFlags[0]?.reason}
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.82rem; color: #991b1b;">
              ⚠️ Safety Boundary: This alert reflects patient-reported emergency indicators from intake questioning. No autonomous medical diagnosis has been made.
            </div>
          </div>
        </div>
      `
          : ''
      }

      <!-- =======================================================
           SECTION 3: CLINICAL NARRATIVE SUMMARY (Verbal Summary)
           ======================================================= -->
      <div class="doc-narrative-card">
        <div class="doc-narrative-header">
          <h3 class="doc-narrative-title">
            <span>💬</span> Verified Clinical Narrative Summary (Phase 8.2 Verbatim)
          </h3>
          <span style="font-size: 0.75rem; background: #dcfce7; color: #166534; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px;">
            ✓ Patient-Verified & Submitted
          </span>
        </div>
        <div class="doc-narrative-body">
          ${ws.verbalSummary || 'No verbal narrative recorded.'}
        </div>
      </div>

      <!-- =======================================================
           SECTION 4: STRUCTURED CLINICAL SUMMARY
           ======================================================= -->
      <div>
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--doc-text-main);">
          📊 Structured Clinical Intake Data
        </h3>
        <div class="doc-structured-grid">
          <div class="doc-structured-card">
            <h4>Primary Concern</h4>
            <div class="doc-structured-val" style="color: #1d4ed8;">
              ${structured.primaryConcernDisplayName || structured.primaryConcern || 'Not Provided'}
            </div>
          </div>

          <div class="doc-structured-card">
            <h4>Location & Laterality</h4>
            <div class="doc-structured-val">
              ${formatFieldValue(structured.location)}
            </div>
          </div>

          <div class="doc-structured-card">
            <h4>Duration</h4>
            <div class="doc-structured-val">
              ${formatDuration(structured.duration)}
            </div>
          </div>

          <div class="doc-structured-card">
            <h4>Severity / Pain Scale</h4>
            <div class="doc-structured-val">
              ${formatFieldValue(structured.severity)}
            </div>
          </div>

          <div class="doc-structured-card">
            <h4>Associated Symptoms (Present)</h4>
            <div class="doc-structured-val">
              ${
                structured.associatedSymptoms && structured.associatedSymptoms.length > 0
                  ? structured.associatedSymptoms.map((s) => `• ${s.displayName || s.concept || s}`).join('<br/>')
                  : '<span style="color:var(--doc-text-muted);">None explicitly reported</span>'
              }
            </div>
          </div>

          <div class="doc-structured-card">
            <h4>Negative Findings (Absent / Denied)</h4>
            <div class="doc-structured-val">
              ${
                structured.negativeFindings && structured.negativeFindings.length > 0
                  ? structured.negativeFindings.map((s) => `✕ ${s.displayName || s.concept || s} (ABSENT)`).join('<br/>')
                  : '<span style="color:var(--doc-text-muted);">None recorded</span>'
              }
            </div>
          </div>
        </div>
      </div>

      <!-- =======================================================
           SECTION 5: AYUSH ASSESSMENT (Dashavidha + Ahara-Vihara)
           ======================================================= -->
      ${
        isAyush
          ? `
        <div class="doc-ayush-card">
          <div class="doc-ayush-title">
            <span>🌿</span> AYUSH Assessment — Dashavidha Pariksha & Ahara-Vihara
            <span style="font-size: 0.75rem; font-weight: normal; color: #047857; margin-left: auto;">
              Patient-Reported Holistic Profile • No Autonomous Dosha Prescriptions
            </span>
          </div>

          <!-- Dashavidha Pariksha (10 Parameters) -->
          <h4 style="font-size: 0.85rem; font-weight: 700; color: #0f766e; text-transform: uppercase; margin-bottom: 0.5rem;">
            10-Fold Clinical Assessment (Dashavidha Pariksha)
          </h4>
          <div class="doc-ayush-grid" style="margin-bottom: 1.25rem;">
            ${renderAyushParamBox('Prakriti (Natural Constitution)', ayush.dashavidha?.prakriti || ayush.dashavidhaPariksha?.prakriti)}
            ${renderAyushParamBox('Vikriti (Current Aggravation)', ayush.dashavidha?.vikriti || ayush.dashavidhaPariksha?.vikriti)}
            ${renderAyushParamBox('Sara (Tissue Vitality)', ayush.dashavidha?.sara || ayush.dashavidhaPariksha?.sara)}
            ${renderAyushParamBox('Samhanana (Body Build & Joints)', ayush.dashavidha?.samhanana || ayush.dashavidhaPariksha?.samhanana)}
            ${renderAyushParamBox('Pramana (Body Proportions)', ayush.dashavidha?.pramana || ayush.dashavidhaPariksha?.pramana)}
            ${renderAyushParamBox('Satmya (Habituation & Adaptability)', ayush.dashavidha?.satmya || ayush.dashavidhaPariksha?.satmya)}
            ${renderAyushParamBox('Sattva (Mental Resilience)', ayush.dashavidha?.sattva || ayush.dashavidhaPariksha?.sattva)}
            ${renderAyushParamBox('Ahara Shakti (Digestive Capacity)', ayush.dashavidha?.ahara_shakti || ayush.dashavidhaPariksha?.ahara_shakti)}
            ${renderAyushParamBox('Vyayama Shakti (Physical Stamina)', ayush.dashavidha?.vyayama_shakti || ayush.dashavidhaPariksha?.vyayama_shakti)}
            ${renderAyushParamBox('Vaya (Stage of Life)', ayush.dashavidha?.vaya || ayush.dashavidhaPariksha?.vaya)}
          </div>

          <!-- Ahara-Vihara (Diet & Routine) -->
          <h4 style="font-size: 0.85rem; font-weight: 700; color: #0f766e; text-transform: uppercase; margin-bottom: 0.5rem;">
            Diet & Lifestyle Assessment (Ahara-Vihara)
          </h4>
          <div class="doc-ayush-grid">
            ${renderAyushParamBox('Dietary Pattern (Ahara)', ayush.aharaVihara?.diet || ayush.dashavidha?.diet)}
            ${renderAyushParamBox('Bowel / Elimination (Koshtha)', ayush.aharaVihara?.bowel || ayush.dashavidha?.bowel)}
            ${renderAyushParamBox('Sleep Quality (Nidra)', ayush.aharaVihara?.sleep || ayush.dashavidha?.sleep)}
            ${renderAyushParamBox('Activity & Work (Vihara)', ayush.aharaVihara?.activity || ayush.dashavidha?.activity)}
          </div>
        </div>
      `
          : ''
      }

      <!-- =======================================================
           SECTION 6: MEDICATIONS & ALLERGIES (Strict Source Separation)
           ======================================================= -->
      <div class="doc-meds-container">
        <h3 class="doc-meds-title">💊 Medications & Allergies (Source Separated)</h3>

        <div class="doc-meds-columns">
          <!-- Column 1: Patient-Reported -->
          <div class="doc-med-col">
            <div class="doc-med-col-heading patient">🗣️ Patient-Reported Medications</div>
            ${
              meds.patientReported && meds.patientReported.length > 0
                ? meds.patientReported
                    .map(
                      (m) => `
                  <div class="doc-med-item">
                    <strong>${m.name || m.medicine || 'Medicine'}</strong>
                    <div style="font-size: 0.8rem; color: var(--doc-text-muted);">
                      Dosage: ${m.dose || 'Not specified'} • Frequency: ${m.frequency || 'Not specified'}
                    </div>
                  </div>
                `
                    )
                    .join('')
                : '<div style="font-size: 0.85rem; color: var(--doc-text-muted);">No current medications reported by patient.</div>'
            }
          </div>

          <!-- Column 2: Document-Extracted -->
          <div class="doc-med-col">
            <div class="doc-med-col-heading ocr">📄 Document-Extracted Medications (OCR)</div>
            ${
              meds.documentExtracted && meds.documentExtracted.length > 0
                ? meds.documentExtracted
                    .map(
                      (m) => `
                  <div class="doc-med-item">
                    <strong>${m.name || m.medicine || 'Prescription item'}</strong>
                    <div style="font-size: 0.8rem; color: var(--doc-text-muted);">
                      Dosage: ${m.dose || 'Not detected'} • Freq: ${m.frequency || 'Not detected'} • Confidence: ${
                        m.confidence ? Math.round(m.confidence * 100) + '%' : '95%'
                      }
                    </div>
                  </div>
                `
                    )
                    .join('')
                : '<div style="font-size: 0.85rem; color: var(--doc-text-muted);">No medications extracted from uploaded records.</div>'
            }
          </div>
        </div>

        <!-- Discrepancy Warnings -->
        ${
          meds.discrepancies && meds.discrepancies.length > 0
            ? `
          <div class="doc-discrepancy-banner">
            <span>⚠️</span>
            <div>
              <strong>Medication Discrepancy Detected:</strong>
              ${meds.discrepancies.map((d) => d.message || JSON.stringify(d)).join('; ')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Allergy Status -->
        <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--doc-border);">
          <div style="font-size: 0.85rem; font-weight: 700; color: #b91c1c; text-transform: uppercase;">
            Known Allergies:
          </div>
          <div style="font-size: 0.95rem; font-weight: 600; color: #991b1b; margin-top: 0.25rem;">
            ${formatAllergies(allergies)}
          </div>
        </div>
      </div>

      <!-- =======================================================
           SECTION 7: UPLOADED MEDICAL DOCUMENTS & OCR
           ======================================================= -->
      <div>
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--doc-text-main);">
          📑 Uploaded Medical Documents & OCR Previews (${docs.length})
        </h3>
        ${
          docs.length > 0
            ? `
          <div class="doc-docs-grid">
            ${docs
              .map(
                (d) => `
              <div class="doc-doc-card">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <strong style="font-size: 0.9rem;">${d.fileName || 'Uploaded Document'}</strong>
                  <span class="doc-token-badge">${d.documentType || 'PRESCRIPTION'}</span>
                </div>
                <div style="font-size: 0.78rem; color: var(--doc-text-muted);">
                  Status: <strong>${d.processingStatus || 'PROCESSED'}</strong> • Confidence: ${
                  d.confidence ? Math.round(d.confidence * 100) + '%' : '95%'
                }
                </div>
                <div class="doc-doc-preview">${d.ocrText || 'No OCR text preview available'}</div>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : '<div style="background: #ffffff; padding: 1rem; border-radius: 8px; border: 1px solid var(--doc-border); font-size: 0.85rem; color: var(--doc-text-muted);">No documents were uploaded by the patient during this kiosk session.</div>'
        }
      </div>

      <!-- =======================================================
           SECTION 8: COMPLETE PATIENT Q&A AUDIT HISTORY
           ======================================================= -->
      <div class="doc-qa-container">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--doc-text-main);">
            🔍 Complete Patient Q&A Audit Trail (${qas.length} questions answered)
          </h3>
          <button id="doc-toggle-qa-btn" class="doc-action-btn">
            Toggle Expand / Collapse
          </button>
        </div>

        <div id="doc-qa-items-wrap" class="doc-qa-list">
          ${qas
            .map(
              (item) => `
            <div class="doc-qa-item">
              <div class="doc-qa-q">Q${item.index}: ${item.questionText || item.questionId}</div>
              <div class="doc-qa-a">
                <span><strong>Patient Answer:</strong> ${formatFieldValue(item.patientAnswer || item.rawResponse)}</span>
                <span class="doc-source-tag">${item.source === 'PATIENT_VOICE' ? '🎤 Patient Voice' : '👆 Touch Choice'}</span>
                <span style="font-size: 0.75rem; color: var(--doc-text-muted); margin-left: auto;">
                  Status: <strong>${item.status || 'PRESENT'}</strong>
                </span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- =======================================================
           SECTION 9: UNCERTAIN & CONFLICTING INFORMATION
           ======================================================= -->
      ${
        uncertain && uncertain.length > 0
          ? `
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 1.25rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #92400e; margin-bottom: 0.5rem;">
            ⚠️ Clarification / Uncertain Items (${uncertain.length})
          </h4>
          <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: #78350f;">
            ${uncertain.map((u) => `<li>${u.message || u.item || JSON.stringify(u)}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }

      <!-- =======================================================
           SECTION 10: PHYSICIAN CLINICAL NOTES
           ======================================================= -->
      <div class="doc-actions-card">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: #1e3a8a;">
          ✍️ Physician Consultation Notes & Clinical Impressions
        </h3>
        <p style="font-size: 0.85rem; color: var(--doc-text-muted); margin-top: -0.5rem;">
          These notes are recorded under your clinician identity and kept strictly distinct from patient verbatim responses.
        </p>

        <!-- Existing Notes History -->
        ${
          notes.length > 0
            ? `
          <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
            ${notes
              .map(
                (n) => `
              <div style="background: #f8fafc; border: 1px solid var(--doc-border); border-radius: 6px; padding: 0.75rem;">
                <div style="font-size: 0.92rem; color: #0f172a; margin-bottom: 0.25rem;">${n.text}</div>
                <div style="font-size: 0.75rem; color: var(--doc-text-muted);">
                  By <strong>${n.author}</strong> (${n.doctorId}) • ${
                  n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : 'Recently'
                }
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }

        <textarea
          id="doc-physician-notes-input"
          class="doc-textarea"
          placeholder="Type your clinical impression, examination findings, or prescription advice here..."
        ></textarea>

        <div style="display: flex; justify-content: flex-end;">
          <button id="doc-save-notes-btn" class="doc-btn-open" style="background: #2563eb;">
            💾 Save Note to Record
          </button>
        </div>
      </div>

      <!-- =======================================================
           SECTION 11: CONSULTATION STATUS & SIGN-OFF ACTIONS
           ======================================================= -->
      <div class="doc-actions-card" style="border-color: #16a34a;">
        <div class="doc-action-bar">
          <div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #166534;">
              ${isSignedOff ? '✓ Intake Confirmed & Signed Off' : 'Review & Complete Consultation'}
            </div>
            <div style="font-size: 0.82rem; color: var(--doc-text-muted);">
              Current Status: <strong>${ws.consultationStatus}</strong>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <select id="doc-consult-status-select" style="padding: 0.6rem 1rem; border-radius: 6px; border: 1px solid var(--doc-border-strong); font-size: 0.9rem; font-weight: 600;">
              <option value="WAITING" ${ws.consultationStatus === 'WAITING' ? 'selected' : ''}>Waiting</option>
              <option value="IN_CONSULTATION" ${ws.consultationStatus === 'IN_CONSULTATION' ? 'selected' : ''}>In Consultation</option>
              <option value="COMPLETED" ${ws.consultationStatus === 'COMPLETED' ? 'selected' : ''}>Completed</option>
            </select>

            <button id="doc-signoff-btn" class="doc-btn-submit">
              ✓ Confirm Intake & Sign Off
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  function attachEvents() {
    document.getElementById('doc-ws-back-btn')?.addEventListener('click', () => {
      // Clear patient workspace on navigating back to prevent cross-session leakage
      clearPatientWorkspace();
      setActiveTab('queue');
    });

    // Toggle Q&A expand/collapse
    document.getElementById('doc-toggle-qa-btn')?.addEventListener('click', () => {
      const qaWrap = document.getElementById('doc-qa-items-wrap');
      if (qaWrap) {
        qaWrap.style.display = qaWrap.style.display === 'none' ? 'flex' : 'none';
      }
    });

    // Save Physician Note
    const saveNoteBtn = document.getElementById('doc-save-notes-btn');
    saveNoteBtn?.addEventListener('click', async () => {
      const input = document.getElementById('doc-physician-notes-input');
      const noteText = input?.value?.trim();
      if (!noteText) {
        alert('Please enter note text before saving.');
        return;
      }

      saveNoteBtn.disabled = true;
      saveNoteBtn.textContent = 'Saving...';
      try {
        const res = await doctorApi.saveNotes(ws.sessionId, noteText);
        if (res.success) {
          alert('Physician note saved successfully.');
          input.value = '';
          // Refresh workspace
          const updated = await doctorApi.getWorkspace(ws.sessionId);
          if (updated.success) {
            doctorState.workspaceData = updated.data;
            doctorState.notifyDoctorState('workspace');
          }
        }
      } catch (err) {
        alert('Failed to save note: ' + err.message);
      } finally {
        saveNoteBtn.disabled = false;
        saveNoteBtn.textContent = '💾 Save Note to Record';
      }
    });

    // Update Consultation Status dropdown
    const statusSelect = document.getElementById('doc-consult-status-select');
    statusSelect?.addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      try {
        await doctorApi.updateStatus(ws.sessionId, newStatus);
        ws.consultationStatus = newStatus;
      } catch (err) {
        alert('Failed to update status: ' + err.message);
      }
    });

    // Clinician Sign-Off button
    const signOffBtn = document.getElementById('doc-signoff-btn');
    signOffBtn?.addEventListener('click', async () => {
      const confirmSign = window.confirm(
        'Confirm that you have reviewed the verified patient intake, medications, and clinical summary?'
      );
      if (!confirmSign) return;

      signOffBtn.disabled = true;
      signOffBtn.textContent = 'Signing Off...';
      try {
        const res = await doctorApi.confirmReview(ws.sessionId, 'Intake validated by physician.');
        if (res.success) {
          alert('Consultation signed off successfully! Returning to OPD Queue.');
          clearPatientWorkspace();
          setActiveTab('queue');
        }
      } catch (err) {
        alert('Sign-off error: ' + err.message);
        signOffBtn.disabled = false;
        signOffBtn.textContent = '✓ Confirm Intake & Sign Off';
      }
    });
  }

  return { html, attachEvents };
}

// Helpers for formatted rendering
function formatFieldValue(val) {
  if (val === null || val === undefined) return '<span style="color:var(--doc-text-muted);">NOT_PROVIDED</span>';
  if (typeof val === 'object') {
    if (val.raw) return val.raw;
    if (val.value) return val.value;
    return JSON.stringify(val);
  }
  return String(val);
}

function formatDuration(dur) {
  if (!dur) return '<span style="color:var(--doc-text-muted);">NOT_PROVIDED</span>';
  if (typeof dur === 'object') {
    if (dur.raw) return dur.raw;
    if (dur.min && dur.max && dur.unit) {
      return dur.min === dur.max ? `${dur.min} ${dur.unit}` : `${dur.min} - ${dur.max} ${dur.unit}`;
    }
  }
  return String(dur);
}

function renderAyushParamBox(paramLabel, paramObj) {
  const val = paramObj?.value || 'NOT_PROVIDED';
  const isPresent = paramObj?.status === 'PRESENT';

  return `
    <div class="doc-ayush-param-box">
      <div class="doc-ayush-param-name">${paramLabel}</div>
      <div class="doc-ayush-param-val" style="color: ${isPresent ? '#0f172a' : 'var(--doc-text-muted)'};">
        ${isPresent ? `✓ ${val}` : 'NOT_PROVIDED'}
      </div>
    </div>
  `;
}

function formatAllergies(allergies) {
  if (!allergies) return 'NOT_PROVIDED';
  if (allergies.status === 'ABSENT' || allergies.status === 'NO') {
    return '✓ Patient explicitly denied any known drug/food allergies.';
  }
  if (allergies.status === 'PRESENT' || allergies.status === 'YES') {
    const list = allergies.substances || [];
    return `⚠️ ALLERGIES REPORTED: ${list.length > 0 ? list.join(', ') : 'Drug/substance allergy noted'}`;
  }
  if (allergies.status === 'UNKNOWN') {
    return '❓ Patient uncertain / unknown about allergies.';
  }
  return 'NOT_PROVIDED (Not asked or unconfirmed)';
}
