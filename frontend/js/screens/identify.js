/**
 * Screen 3: Patient Identification & Onboarding (Phase 10 Persistent Onboarding)
 * Supports:
 *  1. NEW PATIENT persistent registration with full demographics & medical history.
 *  2. EXISTING PATIENT search/lookup by Mobile Number, Patient Code, ABHA ID, or UHID.
 *  3. Demo evaluator shortcut.
 * Pure Vanilla HTML5, CSS3, ES Modules.
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';
import { audioController } from '../audio.js';

let activeTab = 'NEW'; // 'NEW' | 'EXISTING'
let searchResults = [];
let isSearching = false;
let isSubmitting = false;
let formErrors = {};

export function renderIdentifyScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card" style="max-width: 1040px; margin: 0 auto; padding: 2rem 2.25rem;">
      <!-- Audio Narration & Header Row -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
        <div>
          <h1 class="kiosk-question-title" style="color: var(--primary); margin-bottom: 0.25rem; font-size: 1.85rem;">
            ${t('identifyTitle', lang) || 'Patient Identification & Onboarding'}
          </h1>
          <p class="kiosk-question-subtitle" style="margin: 0; font-size: 0.95rem; color: var(--text-secondary);">
            ${t('identifySubtitle', lang) || 'Register as a new patient or retrieve your existing hospital records'}
          </p>
        </div>

        <button id="btn-identify-audio" class="audio-prompt-bar" style="margin: 0;">
          <span aria-hidden="true">🔊</span>
          <span>${t('listen', lang)}</span>
        </button>
      </div>

      <!-- Mode Selector Tabs: NEW vs EXISTING -->
      <div style="display: flex; gap: 1rem; margin-bottom: 1.75rem; border-bottom: 2px solid var(--border); padding-bottom: 0.75rem;">
        <button id="tab-new-patient" class="btn ${activeTab === 'NEW' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; min-height: 52px; font-size: 1.05rem;">
          <span>🆕 ${t('newPatient', lang) || 'New Patient Registration'}</span>
        </button>
        <button id="tab-existing-patient" class="btn ${activeTab === 'EXISTING' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; min-height: 52px; font-size: 1.05rem;">
          <span>🔍 ${t('existingPatient', lang) || 'Existing Patient Lookup'}</span>
        </button>
      </div>

      <!-- TAB 1: NEW PATIENT REGISTRATION FORM -->
      <div id="section-new-patient" style="display: ${activeTab === 'NEW' ? 'block' : 'none'};">
        <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.1rem; color: var(--primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span>
            <span>${t('demographicsTitle', lang) || 'Basic Demographics'}</span>
          </h3>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
            <!-- Full Name -->
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem;">
                ${t('fullName', lang) || 'Full Name'} <span style="color: #ef4444;">*</span>
              </label>
              <input id="input-full-name" type="text" placeholder="e.g. Aarav Ramesh Sharma" value="${appState.patient?.fullName || ''}" 
                style="width: 100%; height: 48px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 1rem; font-size: 1rem;" />
              <div id="err-full-name" style="color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; display: none;">Please enter full name</div>
            </div>

            <!-- Age (Years) -->
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem;">
                ${t('ageYears', lang) || 'Age (in Years)'} <span style="color: #ef4444;">*</span>
              </label>
              <input id="input-age-years" type="number" min="1" max="120" placeholder="e.g. 35" value="${appState.patient?.ageYears || ''}" 
                style="width: 100%; height: 48px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 1rem; font-size: 1rem;" />
              <div id="err-age" style="color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; display: none;">Please enter valid age</div>
            </div>

            <!-- Gender Buttons -->
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem;">
                ${t('gender', lang) || 'Gender'} <span style="color: #ef4444;">*</span>
              </label>
              <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="btn btn-gender ${appState.patient?.gender === 'MALE' ? 'btn-primary' : 'btn-secondary'}" data-gender="MALE" style="flex: 1; min-height: 48px; padding: 0;">Male</button>
                <button type="button" class="btn btn-gender ${appState.patient?.gender === 'FEMALE' ? 'btn-primary' : 'btn-secondary'}" data-gender="FEMALE" style="flex: 1; min-height: 48px; padding: 0;">Female</button>
                <button type="button" class="btn btn-gender ${appState.patient?.gender === 'OTHER' ? 'btn-primary' : 'btn-secondary'}" data-gender="OTHER" style="flex: 1; min-height: 48px; padding: 0;">Other</button>
              </div>
            </div>

            <!-- Mobile Phone -->
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem;">
                ${t('phone', lang) || 'Mobile Number'} <span style="color: #ef4444;">*</span>
              </label>
              <input id="input-phone" type="tel" maxlength="10" placeholder="10-digit mobile (e.g. 9876543210)" value="${appState.patient?.phone || ''}" 
                style="width: 100%; height: 48px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 1rem; font-size: 1rem;" />
              <div id="err-phone" style="color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; display: none;">Enter 10-digit mobile number</div>
            </div>

            <!-- ABHA ID (Optional) -->
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem;">
                ${t('abhaId', lang) || 'ABHA ID / Address (Optional)'}
              </label>
              <input id="input-abha-id" type="text" placeholder="e.g. 91-1234-5678-9012 or user@abdm" value="${appState.patient?.abhaId || ''}" 
                style="width: 100%; height: 48px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 1rem; font-size: 1rem;" />
            </div>

            <!-- Address / City (Optional) -->
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem;">
                ${t('addressLocation', lang) || 'Address / City (Optional)'}
              </label>
              <input id="input-address" type="text" placeholder="e.g. Pune, Maharashtra" value="${appState.patient?.address || ''}" 
                style="width: 100%; height: 48px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 1rem; font-size: 1rem;" />
            </div>
          </div>
        </div>

        <!-- Medical & Health History Section -->
        <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.1rem; color: var(--primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🩺</span>
            <span>${t('healthHistoryTitle', lang) || 'Medical & Past Health History'}</span>
            <span style="font-size: 0.75rem; font-weight: 400; color: var(--muted-text);">(Select all that apply)</span>
          </h3>

          <!-- Medical History Chips -->
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem;">
              Known Medical Conditions:
            </label>
            <div id="chips-medical-history" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              <button type="button" class="btn btn-secondary chip-btn" data-val="NONE">None / None Known</button>
              <button type="button" class="btn btn-secondary chip-btn" data-val="HYPERTENSION">High Blood Pressure</button>
              <button type="button" class="btn btn-secondary chip-btn" data-val="DIABETES">Diabetes (Sugar)</button>
              <button type="button" class="btn btn-secondary chip-btn" data-val="ASTHMA">Asthma / Breathing issue</button>
              <button type="button" class="btn btn-secondary chip-btn" data-val="THYROID">Thyroid Disorder</button>
              <button type="button" class="btn btn-secondary chip-btn" data-val="HEART_DISEASE">Heart Condition</button>
            </div>
          </div>

          <!-- Surgical History -->
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem;">
              Previous Surgeries / Operations:
            </label>
            <div id="chips-surgical-history" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              <button type="button" class="btn btn-secondary chip-btn selected" data-val="NONE">No Past Surgeries</button>
              <button type="button" class="btn btn-secondary chip-btn" data-val="APPENDECTOMY">Appendectomy</button>
              <button type="button" class="btn btn-secondary chip-btn" data-val="CHOLECYSTECTOMY">Gallbladder Surgery</button>
              <button type="button" class="btn btn-secondary chip-btn" data-val="OTHER">Other Major Surgery</button>
            </div>
          </div>

          <!-- Family History & Habits -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem;">
                Family History:
              </label>
              <select id="select-family-history" style="width: 100%; height: 44px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 0.75rem;">
                <option value="NONE">No significant family history</option>
                <option value="DIABETES">Family history of Diabetes</option>
                <option value="HYPERTENSION">Family history of Hypertension</option>
                <option value="HEART_DISEASE">Family history of Heart Disease</option>
                <option value="UNKNOWN">Unknown / Not sure</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem;">
                Personal Habits / Lifestyle:
              </label>
              <select id="select-personal-history" style="width: 100%; height: 44px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 0.75rem;">
                <option value="NONE">Non-smoker, no tobacco or alcohol</option>
                <option value="TOBACCO">Tobacco / Bidi / Cigarette use</option>
                <option value="ALCOHOL">Alcohol consumption</option>
                <option value="BOTH">Tobacco and Alcohol</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Submit Button for New Registration -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
          <button id="btn-new-back" class="btn btn-secondary" style="min-height: 52px;">
            ← ${t('back', lang)}
          </button>

          <button id="btn-submit-new-patient" class="btn btn-primary" style="min-height: 52px; min-width: 240px; font-size: 1.05rem;">
            <span>${t('continue', lang) || 'SAVE & CONTINUE'}</span>
            <span>➔</span>
          </button>
        </div>
      </div>

      <!-- TAB 2: EXISTING PATIENT LOOKUP -->
      <div id="section-existing-patient" style="display: ${activeTab === 'EXISTING' ? 'block' : 'none'};">
        <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.75rem; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.1rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🔍</span>
            <span>${t('searchPatientTitle', lang) || 'Search Registered Patient'}</span>
          </h3>
          <p style="font-size: 0.85rem; color: var(--muted-text); margin-bottom: 1.25rem;">
            Search using Mobile Number (10 digits), Patient Code (e.g. PAT-...), ABHA ID, or Hospital UHID.
          </p>

          <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">
            <input id="input-patient-search" type="text" placeholder="Enter Mobile, Patient Code, or ABHA..." 
              style="flex: 1; height: 52px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 1.25rem; font-size: 1.1rem;" />
            <button id="btn-search-patient" class="btn btn-primary" style="min-height: 52px; padding: 0 1.75rem;">
              <span>🔍 ${t('search', lang) || 'Search'}</span>
            </button>
          </div>

          <!-- Search Results Container -->
          <div id="container-search-results" style="margin-top: 1.25rem;">
            <div id="search-feedback" style="font-size: 0.9rem; color: var(--muted-text); text-align: center; padding: 1rem 0;">
              Enter your identifier and tap Search to retrieve your hospital profile.
            </div>
            <div id="search-list" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
          <button id="btn-existing-back" class="btn btn-secondary" style="min-height: 52px;">
            ← ${t('back', lang)}
          </button>

          <button id="btn-switch-new" class="btn btn-secondary" style="min-height: 52px;">
            <span>Not registered yet? Register as New Patient ➔</span>
          </button>
        </div>
      </div>

      <!-- Quick Demo Shortcut Footer -->
      <div style="margin-top: 2.25rem; padding-top: 1rem; border-top: 1px dashed var(--border); display: flex; justify-content: flex-end; align-items: center;">
        <button id="btn-prefill-demo-patient" class="btn btn-secondary" style="font-size: 0.8rem; min-height: 42px; border-style: dashed; color: var(--primary);">
          <span>⚡ Fast-Track: Use Demo Patient (Aarav Sharma)</span>
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      // Local state for chips
      let selectedMedConditions = new Set(['NONE']);
      let selectedSurgConditions = new Set(['NONE']);
      let selectedGender = appState.patient?.gender || 'MALE';

      // 1. Tab Switching
      const tabNew = document.getElementById('tab-new-patient');
      const tabExisting = document.getElementById('tab-existing-patient');
      const secNew = document.getElementById('section-new-patient');
      const secExisting = document.getElementById('section-existing-patient');

      tabNew?.addEventListener('click', () => {
        activeTab = 'NEW';
        tabNew.className = 'btn btn-primary';
        tabExisting.className = 'btn btn-secondary';
        secNew.style.display = 'block';
        secExisting.style.display = 'none';
      });

      tabExisting?.addEventListener('click', () => {
        activeTab = 'EXISTING';
        tabExisting.className = 'btn btn-primary';
        tabNew.className = 'btn btn-secondary';
        secExisting.style.display = 'block';
        secNew.style.display = 'none';
      });

      document.getElementById('btn-switch-new')?.addEventListener('click', () => {
        activeTab = 'NEW';
        tabNew.click();
      });

      // 2. Gender Selection
      document.querySelectorAll('.btn-gender').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.btn-gender').forEach((b) => {
            b.className = 'btn btn-secondary btn-gender';
          });
          btn.className = 'btn btn-primary btn-gender';
          selectedGender = btn.dataset.gender;
        });
      });

      // 3. Medical History Chips
      document.querySelectorAll('#chips-medical-history .chip-btn').forEach((chip) => {
        chip.addEventListener('click', () => {
          const val = chip.dataset.val;
          if (val === 'NONE') {
            selectedMedConditions.clear();
            selectedMedConditions.add('NONE');
            document.querySelectorAll('#chips-medical-history .chip-btn').forEach((c) => {
              c.className = 'btn btn-secondary chip-btn';
            });
            chip.className = 'btn btn-primary chip-btn';
          } else {
            selectedMedConditions.delete('NONE');
            document.querySelector('#chips-medical-history .chip-btn[data-val="NONE"]')?.classList.remove('btn-primary');
            document.querySelector('#chips-medical-history .chip-btn[data-val="NONE"]')?.classList.add('btn-secondary');

            if (selectedMedConditions.has(val)) {
              selectedMedConditions.delete(val);
              chip.className = 'btn btn-secondary chip-btn';
              if (selectedMedConditions.size === 0) {
                selectedMedConditions.add('NONE');
                document.querySelector('#chips-medical-history .chip-btn[data-val="NONE"]')?.classList.add('btn-primary');
              }
            } else {
              selectedMedConditions.add(val);
              chip.className = 'btn btn-primary chip-btn';
            }
          }
        });
      });

      // 4. Surgical History Chips
      document.querySelectorAll('#chips-surgical-history .chip-btn').forEach((chip) => {
        chip.addEventListener('click', () => {
          const val = chip.dataset.val;
          if (val === 'NONE') {
            selectedSurgConditions.clear();
            selectedSurgConditions.add('NONE');
            document.querySelectorAll('#chips-surgical-history .chip-btn').forEach((c) => {
              c.className = 'btn btn-secondary chip-btn';
            });
            chip.className = 'btn btn-primary chip-btn';
          } else {
            selectedSurgConditions.delete('NONE');
            document.querySelector('#chips-surgical-history .chip-btn[data-val="NONE"]')?.classList.remove('btn-primary');
            document.querySelector('#chips-surgical-history .chip-btn[data-val="NONE"]')?.classList.add('btn-secondary');

            if (selectedSurgConditions.has(val)) {
              selectedSurgConditions.delete(val);
              chip.className = 'btn btn-secondary chip-btn';
              if (selectedSurgConditions.size === 0) {
                selectedSurgConditions.add('NONE');
                document.querySelector('#chips-surgical-history .chip-btn[data-val="NONE"]')?.classList.add('btn-primary');
              }
            } else {
              selectedSurgConditions.add(val);
              chip.className = 'btn btn-primary chip-btn';
            }
          }
        });
      });

      // 5. Submit New Patient Registration
      document.getElementById('btn-submit-new-patient')?.addEventListener('click', async () => {
        if (isSubmitting) return;

        const fullName = document.getElementById('input-full-name')?.value?.trim();
        const ageYearsVal = document.getElementById('input-age-years')?.value?.trim();
        const phone = document.getElementById('input-phone')?.value?.trim();
        const abhaId = document.getElementById('input-abha-id')?.value?.trim() || null;
        const address = document.getElementById('input-address')?.value?.trim() || null;
        const familyHistory = document.getElementById('select-family-history')?.value || 'NONE';
        const personalHistory = document.getElementById('select-personal-history')?.value || 'NONE';

        // Validation
        let hasError = false;
        const errName = document.getElementById('err-full-name');
        const errAge = document.getElementById('err-age');
        const errPhone = document.getElementById('err-phone');

        if (!fullName) {
          if (errName) errName.style.display = 'block';
          hasError = true;
        } else if (errName) {
          errName.style.display = 'none';
        }

        const ageYears = parseInt(ageYearsVal, 10);
        if (!ageYearsVal || isNaN(ageYears) || ageYears < 1 || ageYears > 120) {
          if (errAge) errAge.style.display = 'block';
          hasError = true;
        } else if (errAge) {
          errAge.style.display = 'none';
        }

        if (!phone || phone.length < 10) {
          if (errPhone) errPhone.style.display = 'block';
          hasError = true;
        } else if (errPhone) {
          errPhone.style.display = 'none';
        }

        if (hasError) return;

        isSubmitting = true;
        const submitBtn = document.getElementById('btn-submit-new-patient');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>Saving...</span>`;
        }

        try {
          const patientPayload = {
            fullName,
            ageYears,
            gender: selectedGender,
            phone,
            abhaId,
            address,
            preferredLanguage: appState.language.toUpperCase(),
            medicalHistory: Array.from(selectedMedConditions),
            surgicalHistory: Array.from(selectedSurgConditions),
            familyHistory,
            personalHistory,
          };

          const res = await api.createPatient(patientPayload);
          if (res?.success && res.data) {
            const saved = res.data;
            appState.patient = {
              id: saved.id,
              identifier: saved.patientCode || `PAT-${Date.now().toString().slice(-4)}`,
              type: 'NEW',
              name: saved.fullName,
              fullName: saved.fullName,
              age: saved.ageYears,
              ageYears: saved.ageYears,
              gender: saved.gender,
              phone: phone,
              abhaId: saved.abhaId,
              hospitalUhid: saved.hospitalUhid,
              address: saved.address,
              preferredLanguage: saved.preferredLanguage,
              medicalHistory: saved.medicalHistory || [],
              surgicalHistory: saved.surgicalHistory || [],
              familyHistory: saved.familyHistory,
              personalHistory: saved.personalHistory,
            };
            notifyStateChange('patient');
            router.navigate('consent');
          } else {
            alert(res?.error || 'Failed to register patient in database. Please retry.');
          }
        } catch (err) {
          console.error('[Identify] Patient registration error:', err);
          alert('Network or server error creating patient profile.');
        } finally {
          isSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>${t('continue', lang) || 'SAVE & CONTINUE'}</span><span>➔</span>`;
          }
        }
      });

      // 6. Search Existing Patient
      const doSearch = async () => {
        const query = document.getElementById('input-patient-search')?.value?.trim();
        const feedback = document.getElementById('search-feedback');
        const list = document.getElementById('search-list');
        if (!query) {
          if (feedback) feedback.textContent = 'Please enter a search term (mobile, patient code, or ABHA).';
          return;
        }

        if (feedback) feedback.textContent = 'Searching patient database...';
        if (list) list.innerHTML = '';

        try {
          const res = await api.searchPatients(query);
          if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
            if (feedback) feedback.textContent = `Found ${res.data.length} registered patient record(s). Tap to select:`;
            if (list) {
              list.innerHTML = res.data
                .map((pat) => `
                  <div class="existing-patient-row" data-pat-id="${pat.id}" style="cursor: pointer; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
                    <div>
                      <div style="font-weight: 700; font-size: 1.05rem; color: var(--primary);">${pat.fullName}</div>
                      <div style="font-size: 0.8rem; color: var(--muted-text); margin-top: 0.2rem;">
                        ID: <strong style="color: var(--text);">${pat.patientCode}</strong> • Age: ${pat.ageYears || pat.age || 'N/A'} • Gender: ${pat.gender} • Language: ${pat.preferredLanguage || 'MR'}
                      </div>
                      ${pat.abhaId ? `<div style="font-size: 0.75rem; color: #0284c7; margin-top: 0.2rem;">ABHA: ${pat.abhaId}</div>` : ''}
                    </div>
                    <button class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.4rem 1rem;">Select ➔</button>
                  </div>
                `)
                .join('');

              // Attach row clicks
              document.querySelectorAll('.existing-patient-row').forEach((row) => {
                row.addEventListener('click', () => {
                  const patId = row.dataset.patId;
                  const matched = res.data.find((p) => p.id === patId);
                  if (matched) {
                    appState.patient = {
                      id: matched.id,
                      identifier: matched.patientCode,
                      type: 'EXISTING',
                      name: matched.fullName,
                      fullName: matched.fullName,
                      age: matched.ageYears,
                      ageYears: matched.ageYears,
                      gender: matched.gender,
                      phone: matched.phone || query,
                      abhaId: matched.abhaId,
                      hospitalUhid: matched.hospitalUhid,
                      address: matched.address,
                      preferredLanguage: matched.preferredLanguage,
                      medicalHistory: matched.medicalHistory || [],
                      surgicalHistory: matched.surgicalHistory || [],
                      familyHistory: matched.familyHistory,
                      personalHistory: matched.personalHistory,
                    };
                    notifyStateChange('patient');
                    router.navigate('consent');
                  }
                });
              });
            }
          } else {
            if (feedback) {
              feedback.innerHTML = `
                <div style="color: #b91c1c; margin-bottom: 0.5rem;">No matching patient found for "${query}".</div>
                <button id="btn-fallback-new" class="btn btn-secondary" style="font-size: 0.85rem;">Register as New Patient</button>
              `;
              document.getElementById('btn-fallback-new')?.addEventListener('click', () => {
                tabNew.click();
              });
            }
          }
        } catch (err) {
          console.error('[Identify] Search error:', err);
          if (feedback) feedback.textContent = 'Error querying patient database. Please retry.';
        }
      };

      document.getElementById('btn-search-patient')?.addEventListener('click', doSearch);
      document.getElementById('input-patient-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
      });

      // 7. Demo Patient Prefill
      document.getElementById('btn-prefill-demo-patient')?.addEventListener('click', async () => {
        const inputName = document.getElementById('input-full-name');
        const inputAge = document.getElementById('input-age-years');
        const inputPhone = document.getElementById('input-phone');
        const inputAbha = document.getElementById('input-abha-id');
        const inputAddr = document.getElementById('input-address');

        if (inputName) inputName.value = 'Aarav Sharma';
        if (inputAge) inputAge.value = '35';
        if (inputPhone) inputPhone.value = '9876543210';
        if (inputAbha) inputAbha.value = 'aarav.sharma@abdm';
        if (inputAddr) inputAddr.value = 'District Civil Hospital Area, Pune';

        document.querySelector('.btn-gender[data-gender="MALE"]')?.click();
        document.querySelector('#chips-medical-history .chip-btn[data-val="HYPERTENSION"]')?.click();

        // Also allow direct fast-track registration
        activeTab = 'NEW';
      });

      // 8. Back navigation
      const goBack = () => router.navigate('language');
      document.getElementById('btn-new-back')?.addEventListener('click', goBack);
      document.getElementById('btn-existing-back')?.addEventListener('click', goBack);

      // 9. Audio Narration
      const audioBtn = document.getElementById('btn-identify-audio');
      audioBtn?.addEventListener('click', async () => {
        if (audioController.isSpeaking) {
          audioController.stop();
          audioBtn.classList.remove('playing');
          return;
        }
        audioBtn.classList.add('playing');
        const speechText = t('identifyTitle', appState.language) + '. ' + t('identifySubtitle', appState.language);
        await audioController.speak(speechText, appState.language);
        audioBtn.classList.remove('playing');
      });
    },
  };
}
