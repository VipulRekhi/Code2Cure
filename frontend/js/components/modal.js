/**
 * Accessible Modal Dialog Component (Section 35)
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
        <div class="modal-body" style="font-size: var(--font-size-md); margin-bottom: 2rem;">
          ${contentHtml}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button id="btn-modal-close" class="btn btn-primary" style="min-width: 140px;">
            Done
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
