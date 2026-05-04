// js/ui/modals.js

export function initModals() {
  // Инициализация модальных окон (заглушка)
  console.log("Modals initialized");
}

export function showModal(htmlContent, onOpen) {
  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');
  if (!overlay || !container) return;

  container.innerHTML = `<div class="modal-header"><button class="modal-close" id="modalCloseBtn">×</button></div><div class="modal-body">${htmlContent}</div>`;
  overlay.classList.add('active');

  const closeBtn = document.getElementById('modalCloseBtn');
  const close = () => {
    overlay.classList.remove('active');
    container.innerHTML = '';
    document.removeEventListener('keydown', onEscape);
  };

  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const onEscape = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEscape);

  if (onOpen) onOpen();
}

export function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');
  if (overlay) overlay.classList.remove('active');
  if (container) container.innerHTML = '';
}