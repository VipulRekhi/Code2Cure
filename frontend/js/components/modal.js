/**
 * Accessible Modal Dialog Component
 * Clean white surface, high-contrast typography, accessible dismiss.
 */

export function openModal({ title, contentHtml, onClose }) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-dialog">
        <div class="modal-title" id="modal-title">
          ${title}
        </div>
        <div class="modal-body">
          ${contentHtml}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 1.25rem;">
          <button id="btn-modal-close" class="btn btn-secondary" style="min-width: 140px; min-height: 48px;">
            Done / बंद करा
          </button>
        </div>
      </div>
    </div>
  `;

  const closeBtn = document.getElementById('btn-modal-close');
  const overlay = container.querySelector('.modal-overlay');

  const handleClose = () => {
    container.innerHTML = '';
    if (onClose) onClose();
  };

  closeBtn?.addEventListener('click', handleClose);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) handleClose();
  });
}

export function closeModal() {
  const container = document.getElementById('modal-container');
  if (container) container.innerHTML = '';
}
