/**
 * Screen 9: Document Upload & Classification Review (Section 29, 30, 31)
 */

import { t } from '../i18n.js';
import { appState, notifyStateChange } from '../state.js';
import { router } from '../router.js';
import { documentService } from '../services/documentService.js';
import { MOCK_PRESET_DOCUMENTS } from '../mock/mockDocuments.js';

let selectedDocType = 'PRESCRIPTION';
let isProcessing = false;
let processingStage = '';

export function renderDocumentReviewScreen() {
  const lang = appState.language;

  // Processing state display (Section 31)
  if (isProcessing) {
    return {
      html: `
        <div class="screen-card" style="text-align: center; align-items: center; padding: 4rem 2rem;">
          <div style="font-size: 3.5rem; margin-bottom: 1.5rem; animation: pulse 1s infinite;">🔍</div>
          <h2 class="kiosk-question-title">${t('analyzingDoc', lang)}</h2>
          <div style="font-size: var(--font-size-md); color: var(--primary); font-weight: 700; margin-top: 1rem;">
            ● ${t(processingStage || 'readingDoc', lang)}
          </div>
        </div>
      `,
      attachEvents: () => {},
    };
  }

  // Render list of attached documents
  const attachedDocsHtml = appState.documents
    .map(
      (doc, index) => `
      <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-subtle); border: 2px solid var(--border); border-radius: var(--radius-md); padding: 1rem 1.5rem; margin-bottom: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span style="font-size: 1.75rem;">📄</span>
          <div>
            <div style="font-weight: 700; font-size: var(--font-size-base);">${doc.name}</div>
            <div style="font-size: var(--font-size-xs); color: var(--muted-text);">
              ${doc.type} • ${(doc.fileSizeBytes / 1024 / 1024).toFixed(1)} MB
            </div>
          </div>
        </div>
        <button class="btn btn-secondary btn-remove-doc" data-doc-index="${index}" style="min-height: 44px; padding: 0 1rem; color: var(--danger); border-color: var(--danger);">
          ✕
        </button>
      </div>
    `
    )
    .join('');

  const html = `
    <div class="screen-card">
      <h1 class="kiosk-question-title">${t('docUploadTitle', lang)}</h1>
      <p class="kiosk-question-subtitle">${t('docSupportedTypes', lang)}</p>

      <!-- Document Upload / Scan Dropzone (Section 29) -->
      <div id="dropzone-upload" class="upload-dropzone">
        <div style="font-size: 3.5rem; margin-bottom: 0.75rem;">📤</div>
        <div style="font-size: var(--font-size-lg); font-weight: 700; color: var(--text);">
          ${t('docUploadPrompt', lang)}
        </div>
        <div style="font-size: var(--font-size-sm); color: var(--muted-text); margin-top: 0.5rem;">
          JPG, PNG, PDF (Up to 15 MB)
        </div>
      </div>
      <input type="file" id="file-input" style="display: none;" accept="image/*,application/pdf" capture="environment" />

      <!-- Quick Preset Buttons for Evaluator / Kiosk Demo -->
      <div style="margin-bottom: 2rem;">
        <div style="font-size: var(--font-size-sm); font-weight: 700; color: var(--muted-text); margin-bottom: 0.75rem;">
          ${t('docTypeQuestion', lang)}
        </div>
        <div class="doc-type-pill-group">
          <button class="doc-type-pill ${selectedDocType === 'PRESCRIPTION' ? 'selected' : ''}" data-type="PRESCRIPTION">
            💊 ${t('typePrescription', lang)}
          </button>
          <button class="doc-type-pill ${selectedDocType === 'LAB_REPORT' ? 'selected' : ''}" data-type="LAB_REPORT">
            🧪 ${t('typeLabReport', lang)}
          </button>
          <button class="doc-type-pill ${selectedDocType === 'DISCHARGE' ? 'selected' : ''}" data-type="DISCHARGE">
            📋 ${t('typeDischarge', lang)}
          </button>
          <button class="doc-type-pill ${selectedDocType === 'OTHER' ? 'selected' : ''}" data-type="OTHER">
            📁 ${t('typeOther', lang)}
          </button>
        </div>
      </div>

      <!-- Attached Documents List -->
      ${
        appState.documents.length > 0
          ? `
        <div style="margin-bottom: 2rem;">
          <div style="font-size: var(--font-size-base); font-weight: 700; margin-bottom: 0.75rem;">
            Attached Documents (${appState.documents.length}):
          </div>
          ${attachedDocsHtml}
        </div>
      `
          : ''
      }

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
        <button id="btn-add-demo-doc" class="btn btn-secondary" style="font-size: var(--font-size-sm); min-height: 52px;">
          <span>⚡</span>
          <span>Add Demo Sample Document</span>
        </button>

        <button id="btn-docs-continue" class="btn btn-primary btn-huge">
          <span>${t('continue', lang)} ➔</span>
        </button>
      </div>
    </div>
  `;

  return {
    html,
    attachEvents: () => {
      const dropzone = document.getElementById('dropzone-upload');
      const fileInput = document.getElementById('file-input');

      dropzone?.addEventListener('click', () => fileInput?.click());

      // Type Selector Pills
      document.querySelectorAll('.doc-type-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          selectedDocType = pill.getAttribute('data-type');
          document.querySelectorAll('.doc-type-pill').forEach((p) => p.classList.remove('selected'));
          pill.classList.add('selected');
        });
      });

      // File Input Change
      fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          isProcessing = true;
          router.renderCurrentScreen();

          const processed = await documentService.processDocument(
            { name: file.name, type: selectedDocType, size: file.size },
            (stage) => {
              processingStage = stage;
              router.renderCurrentScreen();
            }
          );

          appState.documents.push(processed);
          isProcessing = false;
          notifyStateChange('documents');
          router.renderCurrentScreen();
        }
      });

      // Quick Demo Sample Add
      document.getElementById('btn-add-demo-doc')?.addEventListener('click', async () => {
        isProcessing = true;
        router.renderCurrentScreen();

        const preset = MOCK_PRESET_DOCUMENTS[appState.documents.length % MOCK_PRESET_DOCUMENTS.length];
        const processed = await documentService.processDocument(preset, (stage) => {
          processingStage = stage;
          router.renderCurrentScreen();
        });

        appState.documents.push(processed);
        isProcessing = false;
        notifyStateChange('documents');
        router.renderCurrentScreen();
      });

      // Remove Doc Buttons
      document.querySelectorAll('.btn-remove-doc').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-doc-index'), 10);
          appState.documents.splice(idx, 1);
          notifyStateChange('documents');
          router.renderCurrentScreen();
        });
      });

      // Continue to Review
      document.getElementById('btn-docs-continue')?.addEventListener('click', () => {
        router.navigate('patientReview');
      });
    },
  };
}
