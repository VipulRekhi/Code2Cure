/**
 * Screen 5: Institutional Intake — Hospital, Department, Doctor & Encounter Setup (Phase 10)
 * Replaces hardcoded hospital/department with real database-backed selection:
 *  1. Hospital Selection (/api/hospitals)
 *  2. Department / OPD Selection (/api/hospitals/:id/departments)
 *  3. Doctor Selection (/api/departments/:id/doctors)
 *  4. Server-side Encounter & Token Generation (POST /api/encounters)
 * Pure Vanilla HTML5, CSS3, ES Modules.
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';
import { audioController } from '../audio.js';

let currentStep = 1; // 1: Hospital, 2: Department, 3: Doctor, 4: Encounter Confirmed
let hospitalsList = [];
let departmentsList = [];
let doctorsList = [];
let isLoadingData = false;
let isCreatingEncounter = false;
let loadError = null;

export function renderOpdSelectionScreen() {
  const lang = appState.language;

  // Header Title based on current step
  let stepTitle = t('opdTitle', lang) || 'Hospital & OPD Selection';
  let stepSubtitle = 'Select your healthcare facility and OPD department';
  if (currentStep === 1) {
    stepTitle = t('selectHospitalTitle', lang) || 'Select Hospital / Healthcare Facility';
    stepSubtitle = 'Choose the hospital or institute you are visiting today';
  } else if (currentStep === 2) {
    stepTitle = t('selectDepartmentTitle', lang) || 'Select Department / OPD Clinic';
    stepSubtitle = `Choose your clinical department at ${appState.hospital?.name || 'the hospital'}`;
  } else if (currentStep === 3) {
    stepTitle = t('selectDoctorTitle', lang) || 'Select Doctor or OPD Queue';
    stepSubtitle = `Select your preferred doctor or next available clinical queue`;
  } else if (currentStep === 4) {
    stepTitle = t('encounterConfirmedTitle', lang) || 'OPD Token Generated';
    stepSubtitle = `Your clinical visit is registered. Ready to start symptom intake.`;
  }

  const html = `
    <div class="screen-card" style="max-width: 1040px; margin: 0 auto; padding: 2rem 2.25rem;">
      <!-- Step Progress Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
            <span style="background: var(--primary); color: #ffffff; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 9999px;">
              STEP ${currentStep} OF 4
            </span>
            <span style="font-size: 0.85rem; color: var(--muted-text); font-weight: 600;">
              ${appState.patient?.fullName ? `Patient: ${appState.patient.fullName}` : ''}
            </span>
          </div>
          <h1 class="kiosk-question-title" style="color: var(--primary); margin: 0 0 0.25rem 0; font-size: 1.85rem;">
            ${stepTitle}
          </h1>
          <p class="kiosk-question-subtitle" style="margin: 0; font-size: 0.95rem; color: var(--text-secondary);">
            ${stepSubtitle}
          </p>
        </div>

        <button id="btn-opd-audio" class="audio-prompt-bar" style="margin: 0;">
          <span aria-hidden="true">🔊</span>
          <span>${t('listen', lang)}</span>
        </button>
      </div>

      <!-- Loading / Error Notices -->
      <div id="opd-feedback" style="display: ${loadError || isLoadingData ? 'block' : 'none'}; margin-bottom: 1rem;">
        ${isLoadingData ? `<div style="text-align: center; padding: 2rem; color: var(--primary); font-weight: 600;">Loading hospital data from database...</div>` : ''}
        ${loadError ? `<div style="background: #fee2e2; border: 1px solid #f87171; color: #991b1b; padding: 1rem; border-radius: var(--radius-sm);">${loadError}</div>` : ''}
      </div>

      <!-- STEP 1: HOSPITAL SELECTION -->
      <div id="step-hospital" style="display: ${currentStep === 1 && !isLoadingData ? 'block' : 'none'};">
        <div class="option-grid" id="hospital-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
          <!-- Injected dynamically -->
        </div>
      </div>

      <!-- STEP 2: DEPARTMENT SELECTION -->
      <div id="step-department" style="display: ${currentStep === 2 && !isLoadingData ? 'block' : 'none'};">
        <!-- Selected Hospital Banner -->
        <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.75rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 0.8rem; color: var(--muted-text);">Selected Hospital:</span>
            <strong style="color: var(--primary); margin-left: 0.5rem;">${appState.hospital?.name || ''}</strong>
          </div>
          <button id="btn-change-hospital" class="btn btn-secondary" style="font-size: 0.75rem; min-height: 32px; padding: 0 0.75rem;">Change</button>
        </div>

        <div class="option-grid" id="department-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
          <!-- Injected dynamically -->
        </div>
      </div>

      <!-- STEP 3: DOCTOR SELECTION -->
      <div id="step-doctor" style="display: ${currentStep === 3 && !isLoadingData ? 'block' : 'none'};">
        <!-- Selected Department Banner -->
        <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.75rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 0.8rem; color: var(--muted-text);">Department:</span>
            <strong style="color: var(--primary); margin-left: 0.5rem;">${appState.department?.name || ''}</strong>
            <span style="margin-left: 0.5rem; font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 0.15rem 0.5rem; border-radius: 9999px;">${appState.opdMode}</span>
          </div>
          <button id="btn-change-dept" class="btn btn-secondary" style="font-size: 0.75rem; min-height: 32px; padding: 0 0.75rem;">Change</button>
        </div>

        <div class="option-grid" id="doctor-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
          <!-- Injected dynamically -->
        </div>
      </div>

      <!-- STEP 4: ENCOUNTER TOKEN CONFIRMED -->
      <div id="step-encounter-summary" style="display: ${currentStep === 4 ? 'block' : 'none'};">
        <div style="text-align: center; padding: 2rem 1.5rem; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-lg); margin-bottom: 2rem;">
          <div style="font-size: 3.5rem; color: var(--teal); margin-bottom: 0.5rem;">🎫</div>
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.5rem;">
            OFFICIAL OPD TOKEN
          </div>
          <div style="font-size: 3.5rem; font-weight: 800; color: var(--primary); font-family: monospace; letter-spacing: 0.05em; margin-bottom: 1rem;">
            ${appState.encounter?.tokenNumber || 'GM-001'}
          </div>

          <div style="display: inline-grid; grid-template-columns: auto auto; text-align: left; gap: 0.75rem 2rem; background: #ffffff; padding: 1.25rem 2rem; border-radius: var(--radius-md); border: 1px solid var(--border); box-shadow: var(--shadow-sm); margin: 0 auto 1.5rem auto;">
            <span style="font-size: 0.85rem; color: var(--muted-text);">Patient:</span>
            <strong style="font-size: 0.95rem; color: var(--text);">${appState.patient?.fullName || 'Walk-in Patient'}</strong>

            <span style="font-size: 0.85rem; color: var(--muted-text);">Hospital:</span>
            <strong style="font-size: 0.95rem; color: var(--text);">${appState.hospital?.name || 'District Civil Hospital'}</strong>

            <span style="font-size: 0.85rem; color: var(--muted-text);">Department:</span>
            <strong style="font-size: 0.95rem; color: var(--text);">${appState.department?.name || 'General Medicine'}</strong>

            <span style="font-size: 0.85rem; color: var(--muted-text);">Assigned Doctor:</span>
            <strong style="font-size: 0.95rem; color: var(--text);">${appState.doctor?.name ? `${appState.doctor.name} (${appState.doctor.specialization || 'OPD'})` : 'First Available Doctor (Queue)'}</strong>

            <span style="font-size: 0.85rem; color: var(--muted-text);">OPD Mode:</span>
            <span style="font-size: 0.85rem; font-weight: 700; color: #0284c7;">${appState.opdMode === 'AYUSH' ? 'AYUSH / Ayurveda (Phase 9 Active)' : 'General Clinical Mode'}</span>
          </div>

          <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 550px; margin: 0 auto;">
            Your official encounter has been created. Proceed to share your symptoms and medical concerns.
          </p>
        </div>

        <div style="display: flex; justify-content: center;">
          <button id="btn-start-intake" class="btn btn-primary btn-huge" style="min-width: 320px; font-size: 1.15rem;">
            <span>START CLINICAL INTAKE</span>
            <span>➔</span>
          </button>
        </div>
      </div>

      <!-- Footer Navigation Controls -->
      <div style="margin-top: 2rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 1.25rem;">
        <button id="btn-opd-back" class="btn btn-secondary" style="min-height: 50px;">
          ← ${t('back', lang)}
        </button>

        ${currentStep === 3 ? `
          <button id="btn-confirm-encounter" class="btn btn-primary" style="min-height: 52px; padding: 0 2rem; font-size: 1.05rem;">
            <span>${isCreatingEncounter ? 'Generating Token...' : 'GENERATE OPD TOKEN ➔'}</span>
          </button>
        ` : ''}
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      // Audio narration
      const audioBtn = document.getElementById('btn-opd-audio');
      audioBtn?.addEventListener('click', async () => {
        if (audioController.isSpeaking) {
          audioController.stop();
          audioBtn.classList.remove('playing');
          return;
        }
        audioBtn.classList.add('playing');
        await audioController.speak(stepTitle, appState.language);
        audioBtn.classList.remove('playing');
      });

      // Back button
      document.getElementById('btn-opd-back')?.addEventListener('click', () => {
        if (currentStep === 1) {
          router.navigate('consent');
        } else if (currentStep === 2) {
          currentStep = 1;
          router.renderCurrentScreen();
        } else if (currentStep === 3) {
          currentStep = 2;
          router.renderCurrentScreen();
        } else if (currentStep === 4) {
          currentStep = 3;
          router.renderCurrentScreen();
        }
      });

      // Change Hospital shortcut
      document.getElementById('btn-change-hospital')?.addEventListener('click', () => {
        currentStep = 1;
        router.renderCurrentScreen();
      });

      // Change Dept shortcut
      document.getElementById('btn-change-dept')?.addEventListener('click', () => {
        currentStep = 2;
        router.renderCurrentScreen();
      });

      // STEP 1: Fetch and Render Hospitals
      if (currentStep === 1) {
        loadHospitals();
      } else if (currentStep === 2) {
        loadDepartments(appState.hospital?.id);
      } else if (currentStep === 3) {
        loadDoctors(appState.department?.id);
      } else if (currentStep === 4) {
        document.getElementById('btn-start-intake')?.addEventListener('click', () => {
          router.navigate('chiefComplaint');
        });
      }

      // STEP 3: Confirm Encounter & Generate Token
      document.getElementById('btn-confirm-encounter')?.addEventListener('click', async () => {
        if (isCreatingEncounter) return;
        await executeCreateEncounter();
      });
    },
  };
}

// ----------------------------------------------------
// Data Loaders & Renderers
// ----------------------------------------------------

async function loadHospitals() {
  const grid = document.getElementById('hospital-grid');
  if (!grid) return;

  try {
    const res = await api.getHospitals();
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      hospitalsList = res.data;
      grid.innerHTML = hospitalsList
        .map(
          (h) => `
            <div class="option-tile hospital-tile ${appState.hospital?.id === h.id ? 'selected' : ''}" data-id="${h.id}" style="cursor: pointer; text-align: left; padding: 1.5rem;">
              <div style="font-size: 2.25rem; margin-bottom: 0.75rem;">🏛️</div>
              <div class="option-tile-text" style="font-size: 1.2rem; font-weight: 700; color: var(--primary); margin-bottom: 0.25rem;">
                ${h.name}
              </div>
              <div class="option-tile-subtext" style="font-size: 0.85rem; color: var(--muted-text); margin-bottom: 0.75rem;">
                📍 ${h.city || 'District Facility'}, ${h.state || 'Maharashtra'} • Code: ${h.code}
              </div>
              <div style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: #16a34a; font-weight: 700;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #16a34a; display: inline-block;"></span>
                <span>Active Facility & OPD Open</span>
              </div>
            </div>
          `
        )
        .join('');

      // Attach tile click handlers
      document.querySelectorAll('.hospital-tile').forEach((tile) => {
        tile.addEventListener('click', () => {
          const id = tile.dataset.id;
          const matched = hospitalsList.find((h) => h.id === id);
          if (matched) {
            appState.hospital = {
              id: matched.id,
              code: matched.code,
              name: matched.name,
            };
            notifyStateChange('hospital');
            currentStep = 2;
            router.renderCurrentScreen();
          }
        });
      });
    } else {
      grid.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--muted-text);">
          No active hospitals found in database. Using default Civil Hospital.
        </div>
      `;
    }
  } catch (err) {
    console.error('[OPDSelection] Error loading hospitals:', err);
    grid.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Failed to load hospitals. Please retry.</div>`;
  }
}

async function loadDepartments(hospitalId) {
  const grid = document.getElementById('department-grid');
  if (!grid || !hospitalId) return;

  try {
    const res = await api.getDepartments(hospitalId);
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      departmentsList = res.data;
      grid.innerHTML = departmentsList
        .map((d) => {
          const isAyush = d.opdType === 'AYUSH';
          const icon = isAyush ? '🌿' : d.code.includes('ORTHO') ? '🦴' : d.code.includes('PEDI') ? '👶' : '🩺';
          const badgeColor = isAyush ? '#15803d' : '#0284c7';
          const badgeBg = isAyush ? '#dcfce7' : '#e0f2fe';

          return `
            <div class="option-tile department-tile ${appState.department?.id === d.id ? 'selected' : ''}" data-id="${d.id}" style="cursor: pointer; text-align: left; padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <span style="font-size: 2.25rem;">${icon}</span>
                <span style="background: ${badgeBg}; color: ${badgeColor}; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 9999px; text-transform: uppercase;">
                  ${d.opdType}
                </span>
              </div>
              <div class="option-tile-text" style="font-size: 1.2rem; font-weight: 700; color: var(--primary); margin-bottom: 0.35rem;">
                ${d.name}
              </div>
              <div class="option-tile-subtext" style="font-size: 0.85rem; color: var(--muted-text); margin-bottom: 0.5rem;">
                Room: ${d.roomNumber || 'General Wing'} • Code: ${d.code}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                ${isAyush ? 'Ayurvedic Kayachikitsa, Dashavidha Pariksha, and holistic regimen.' : 'General adult and family medical consultation.'}
              </div>
            </div>
          `;
        })
        .join('');

      document.querySelectorAll('.department-tile').forEach((tile) => {
        tile.addEventListener('click', () => {
          const id = tile.dataset.id;
          const matched = departmentsList.find((d) => d.id === id);
          if (matched) {
            appState.department = {
              id: matched.id,
              code: matched.code,
              name: matched.name,
              opdType: matched.opdType,
              roomNumber: matched.roomNumber,
            };
            appState.opdMode = matched.opdType === 'AYUSH' ? 'AYUSH' : 'GENERAL';
            notifyStateChange('department');
            notifyStateChange('opdMode');
            currentStep = 3;
            router.renderCurrentScreen();
          }
        });
      });
    } else {
      grid.innerHTML = `<div style="padding: 2rem; color: var(--muted-text);">No active departments found for this hospital.</div>`;
    }
  } catch (err) {
    console.error('[OPDSelection] Error loading departments:', err);
    grid.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Failed to load departments. Please retry.</div>`;
  }
}

async function loadDoctors(departmentId) {
  const grid = document.getElementById('doctor-grid');
  if (!grid || !departmentId) return;

  try {
    const res = await api.getDoctors(departmentId);
    doctorsList = res?.success && Array.isArray(res.data) ? res.data : [];

    // Pooled Queue Card + Individual Doctors
    const pooledCardHtml = `
      <div class="option-tile doctor-tile ${!appState.doctor?.id ? 'selected' : ''}" data-id="POOLED" style="cursor: pointer; text-align: left; padding: 1.5rem; border: 2px dashed var(--teal);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <span style="font-size: 2.25rem;">⚡</span>
          <span style="background: #e6f4f4; color: var(--teal); font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 9999px;">
            RECOMMENDED
          </span>
        </div>
        <div class="option-tile-text" style="font-size: 1.15rem; font-weight: 700; color: var(--primary); margin-bottom: 0.25rem;">
          Next Available Doctor
        </div>
        <div class="option-tile-subtext" style="font-size: 0.85rem; color: var(--muted-text); margin-bottom: 0.5rem;">
          Central Department Queue (Fastest Intake)
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">
          You will be seen by the first doctor available in ${appState.department?.name || 'the department'}.
        </div>
      </div>
    `;

    const doctorCardsHtml = doctorsList
      .map(
        (doc) => `
          <div class="option-tile doctor-tile ${appState.doctor?.id === doc.id ? 'selected' : ''}" data-id="${doc.id}" style="cursor: pointer; text-align: left; padding: 1.5rem;">
            <div style="font-size: 2.25rem; margin-bottom: 0.75rem;">👨‍⚕️</div>
            <div class="option-tile-text" style="font-size: 1.15rem; font-weight: 700; color: var(--primary); margin-bottom: 0.25rem;">
              ${doc.name}
            </div>
            <div class="option-tile-subtext" style="font-size: 0.85rem; color: var(--muted-text); margin-bottom: 0.5rem;">
              ${doc.qualification || 'MBBS / BAMS'} • ${doc.specialization || 'Physician'}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">
              Room: ${doc.roomNumber || 'Consultation Room'} • Reg: ${doc.registrationNo || 'MCI-Active'}
            </div>
          </div>
        `
      )
      .join('');

    grid.innerHTML = pooledCardHtml + doctorCardsHtml;

    document.querySelectorAll('.doctor-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const id = tile.dataset.id;
        if (id === 'POOLED') {
          appState.doctor = {
            id: null,
            name: 'First Available Doctor (Queue)',
            specialization: appState.department?.name,
          };
        } else {
          const matched = doctorsList.find((d) => d.id === id);
          if (matched) {
            appState.doctor = {
              id: matched.id,
              name: matched.name,
              specialization: matched.specialization,
            };
          }
        }
        notifyStateChange('doctor');
        document.querySelectorAll('.doctor-tile').forEach((t) => t.classList.remove('selected'));
        tile.classList.add('selected');
      });
    });
  } catch (err) {
    console.error('[OPDSelection] Error loading doctors:', err);
    grid.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Failed to load doctors. Please retry.</div>`;
  }
}

async function executeCreateEncounter() {
  isCreatingEncounter = true;
  const btn = document.getElementById('btn-confirm-encounter');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Creating Encounter & Token...</span>`;
  }

  try {
    const payload = {
      patientId: appState.patient?.id || null,
      hospitalId: appState.hospital?.id || null,
      departmentId: appState.department?.id || null,
      doctorId: appState.doctor?.id || null,
      opdMode: appState.opdMode || 'GENERAL',
      appointmentType: 'WALK_IN',
    };

    const res = await api.createEncounter(payload);
    if (res?.success && res.data) {
      const encounter = res.data;
      appState.encounter = {
        id: encounter.id,
        tokenNumber: encounter.tokenNumber,
        status: encounter.status,
        triageTier: encounter.triageTier || 'NORMAL',
      };
      notifyStateChange('encounter');
      currentStep = 4;
      router.renderCurrentScreen();
    } else {
      alert(res?.error || 'Failed to create encounter in database. Please check selections.');
    }
  } catch (err) {
    console.error('[OPDSelection] Encounter generation error:', err);
    alert('Server error generating encounter token.');
  } finally {
    isCreatingEncounter = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>GENERATE OPD TOKEN ➔</span>`;
    }
  }
}
