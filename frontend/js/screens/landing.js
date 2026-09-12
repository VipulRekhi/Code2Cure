/**
 * Screen 0: Top-Level Landing Role Selection (Phase 10)
 * Allows entering either Patient Kiosk or Doctor / Hospital Portal.
 * Pure Vanilla HTML5, CSS3, ES Modules.
 */

import { t } from '../i18n.js';
import { appState, setLanguage, notifyStateChange } from '../state.js';
import { router } from '../router.js';

export function renderLandingScreen() {
  const lang = appState.language;

  const html = `
    <div class="screen-card" style="max-width: 1080px; margin: 0 auto; text-align: center; padding: 2.5rem 2rem;">
      <!-- Hospital / Institutional Brand Header -->
      <div style="display: inline-flex; align-items: center; gap: 0.75rem; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: 9999px; padding: 0.4rem 1.25rem; margin-bottom: 1.5rem;">
        <span style="font-size: 1.25rem;">🏛️</span>
        <span style="font-size: var(--font-size-xs); font-weight: 700; color: var(--primary); letter-spacing: 0.05em; text-transform: uppercase;">
          ${t('institutionName', lang) || 'All India Institute of Ayurveda (AIIA) & District Civil Hospital'}
        </span>
      </div>

      <h1 class="kiosk-question-title" style="font-size: 2.25rem; color: var(--primary); margin-bottom: 0.5rem; line-height: 1.2;">
        ${t('roleSelectTitle', lang) || 'How would you like to continue?'}
      </h1>
      <p style="font-size: var(--font-size-base); color: var(--text-secondary); max-width: 620px; margin: 0 auto 2.5rem auto; line-height: 1.5;">
        ${t('roleSelectSubtitle', lang) || 'Select your portal to proceed with patient clinical intake or physician consultation review.'}
      </p>

      <!-- Two Large Responsive Role Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; margin-bottom: 2.5rem; text-align: left;">
        
        <!-- Role Card 1: PATIENT -->
        <div id="card-role-patient" class="role-selection-card" style="cursor: pointer; background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius-lg); padding: 2.25rem 1.75rem; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; box-shadow: var(--shadow-sm); position: relative;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
              <div style="font-size: 3rem; background: #e0f2fe; width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                🧑‍⚕️
              </div>
              <span style="background: #e0f2fe; color: #0284c7; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 9999px; text-transform: uppercase;">
                ${t('patientKioskRole', lang) || 'Patient / Kiosk'}
              </span>
            </div>
            
            <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">
              ${t('continuePatient', lang) || 'Patient / Kiosk'}
            </h2>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.5rem;">
              ${t('patientRoleDesc', lang) || 'Voice-guided clinical intake, symptom evaluation, document scanning, and automated OPD token generation.'}
            </p>
          </div>

          <button id="btn-enter-patient" class="btn btn-primary" style="width: 100%; min-height: 52px; font-weight: 700; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <span>${t('beginHealthCheck', lang) || 'BEGIN HEALTH CHECK'}</span>
            <span style="font-size: 1.25rem;">➔</span>
          </button>
        </div>

        <!-- Role Card 2: DOCTOR -->
        <div id="card-role-doctor" class="role-selection-card" style="cursor: pointer; background: #0f172a; border: 2px solid #334155; border-radius: var(--radius-lg); padding: 2.25rem 1.75rem; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3); color: #f8fafc; position: relative;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
              <div style="font-size: 3rem; background: #1e293b; width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #334155;">
                🩺
              </div>
              <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 9999px; text-transform: uppercase;">
                ${t('doctorPortalRole', lang) || 'Doctor / Hospital'}
              </span>
            </div>

            <h2 style="font-size: 1.5rem; font-weight: 700; color: #ffffff; margin-bottom: 0.5rem;">
              ${t('doctorPortalTitle', lang) || 'Doctor / Hospital Portal'}
            </h2>
            <p style="font-size: 0.95rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.5rem;">
              ${t('doctorRoleDesc', lang) || 'Access real OPD queue, verified clinical summaries, AYUSH assessments, prescriptions, and review consultation history.'}
            </p>
          </div>

          <button id="btn-enter-doctor" class="btn" style="width: 100%; min-height: 52px; font-weight: 700; font-size: 1rem; background: #38bdf8; color: #0f172a; border: none; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer;">
            <span>${t('doctorLoginCta', lang) || 'ENTER CLINICAL WORKSTATION'}</span>
            <span style="font-size: 1.25rem;">➔</span>
          </button>
        </div>

      </div>

      <!-- Quick Language Switch Bar -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; border-top: 1px solid var(--border); padding-top: 1.5rem;">
        <span style="font-size: var(--font-size-xs); color: var(--muted-text); font-weight: 600;">भाषा बदला / Change Language:</span>
        <button id="btn-lang-en" class="btn btn-secondary ${lang === 'en' ? 'active-lang' : ''}" style="padding: 0.3rem 0.8rem; font-size: var(--font-size-xs);">English</button>
        <button id="btn-lang-hi" class="btn btn-secondary ${lang === 'hi' ? 'active-lang' : ''}" style="padding: 0.3rem 0.8rem; font-size: var(--font-size-xs);">हिंदी</button>
        <button id="btn-lang-mr" class="btn btn-secondary ${lang === 'mr' ? 'active-lang' : ''}" style="padding: 0.3rem 0.8rem; font-size: var(--font-size-xs);">मराठी</button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      // Patient Role Selection
      const goPatient = () => {
        router.navigate('welcome');
      };
      document.getElementById('card-role-patient')?.addEventListener('click', goPatient);
      document.getElementById('btn-enter-patient')?.addEventListener('click', (e) => {
        e.stopPropagation();
        goPatient();
      });

      // Doctor Role Selection
      const goDoctor = () => {
        window.location.hash = '#/doctor';
      };
      document.getElementById('card-role-doctor')?.addEventListener('click', goDoctor);
      document.getElementById('btn-enter-doctor')?.addEventListener('click', (e) => {
        e.stopPropagation();
        goDoctor();
      });

      // Language Switchers
      document.getElementById('btn-lang-en')?.addEventListener('click', () => {
        setLanguage('en');
        router.renderCurrentScreen();
      });
      document.getElementById('btn-lang-hi')?.addEventListener('click', () => {
        setLanguage('hi');
        router.renderCurrentScreen();
      });
      document.getElementById('btn-lang-mr')?.addEventListener('click', () => {
        setLanguage('mr');
        router.renderCurrentScreen();
      });
    },
  };
}
