/**
 * Doctor Login View — MediKiosk (Phase 10)
 */

import { doctorApi } from '../doctorApi.js';
import { setDoctorAuth } from '../doctorState.js';

export function renderDoctorLoginView() {
  const html = `
    <div class="doc-login-wrap">
      <div class="doc-login-card">
        <div class="doc-login-header">
          <div class="doc-login-logo">🩺</div>
          <h1 class="doc-login-title">MediKiosk Clinical Portal</h1>
          <p class="doc-login-sub">District Civil Hospital, Pune • OPD Clinical Workstation</p>
        </div>

        <div id="doc-login-alert" style="display:none; padding:0.75rem; border-radius:6px; margin-bottom:1rem; font-size:0.875rem;"></div>

        <form id="doc-login-form">
          <div class="doc-form-group">
            <label class="doc-form-label" for="doc-login-id">Employee / Hospital ID</label>
            <input
              type="text"
              id="doc-login-id"
              class="doc-form-input"
              placeholder="e.g. DOC-8942 or doctor@medikiosk.local"
              value="DOC-8942"
              required
            />
          </div>

          <div class="doc-form-group">
            <label class="doc-form-label" for="doc-login-dept">Clinical Department</label>
            <input
              type="text"
              id="doc-login-dept"
              class="doc-form-input"
              placeholder="e.g. General Medicine / OPD-3"
              value="General Medicine / OPD-3"
              required
            />
          </div>

          <div class="doc-form-group">
            <label class="doc-form-label" for="doc-login-pass">Password / Digital Token</label>
            <input
              type="password"
              id="doc-login-pass"
              class="doc-form-input"
              placeholder="••••••••"
              value="Password123!"
              required
            />
          </div>

          <button type="submit" id="doc-login-submit" class="doc-btn-login">
            🔐 Access Clinical Dashboard
          </button>
        </form>

        <button type="button" id="doc-quick-demo-btn" class="doc-demo-login-btn">
          ⚡ 1-Click Demo Clinician Access (Dr. Priya Deshmukh)
        </button>

        <div style="margin-top: 1.5rem; text-align: center;">
          <a href="#/kiosk" id="doc-return-kiosk-link" style="color: #64748b; font-size: 0.82rem; text-decoration: none;">
            ← Return to Patient Self-Service Kiosk
          </a>
        </div>
      </div>
    </div>
  `;

  function attachEvents() {
    const form = document.getElementById('doc-login-form');
    const alertBox = document.getElementById('doc-login-alert');
    const submitBtn = document.getElementById('doc-login-submit');
    const demoBtn = document.getElementById('doc-quick-demo-btn');
    const returnKiosk = document.getElementById('doc-return-kiosk-link');

    returnKiosk?.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#/kiosk';
    });

    async function handleLogin(employeeId, password, department) {
      if (alertBox) alertBox.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying Credentials...';
      }

      try {
        const res = await doctorApi.login({
          employeeId,
          password,
          department,
        });

        if (res.success && res.data?.token) {
          setDoctorAuth(res.data.doctor, res.data.token);
        } else {
          throw new Error('Authentication failed');
        }
      } catch (err) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = '#fef2f2';
          alertBox.style.color = '#dc2626';
          alertBox.style.border = '1px solid #fecaca';
          alertBox.textContent = err.message || 'Login failed. Please check your credentials.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🔐 Access Clinical Dashboard';
        }
      }
    }

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const employeeId = document.getElementById('doc-login-id')?.value.trim();
      const department = document.getElementById('doc-login-dept')?.value.trim();
      const password = document.getElementById('doc-login-pass')?.value;
      handleLogin(employeeId, password, department);
    });

    demoBtn?.addEventListener('click', () => {
      handleLogin('DOC-8942', 'Password123!', 'General Medicine / OPD-3');
    });
  }

  return { html, attachEvents };
}
