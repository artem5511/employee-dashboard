// js/ui/popups.js

// Заглушка для инициализации (чтобы app.js не падал)
export function initPopups() {
  console.log("Popups initialized");
}

let activePopup = null;

export function showPopup(content, anchor, onShow) {
  hideAllPopups();

  const container = document.getElementById('popupContainer');
  if (!container) return null;

  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.innerHTML = typeof content === 'string' ? content : '';
  if (typeof content !== 'string') popup.appendChild(content);

  container.appendChild(popup);
  positionPopup(popup, anchor);

  setTimeout(() => {
    document.addEventListener('click', hideOnClickOutside);
    window.addEventListener('scroll', () => positionPopup(popup, anchor), { passive: true });
    window.addEventListener('resize', () => positionPopup(popup, anchor), { passive: true });
  }, 0);

  activePopup = popup;
  if (onShow) onShow(popup);
  return popup;
}

export function hideAllPopups() {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }
  document.removeEventListener('click', hideOnClickOutside);
}

function hideOnClickOutside(e) {
  if (activePopup && !activePopup.contains(e.target) && !e.target.closest('.popup')) {
    hideAllPopups();
  }
}

function positionPopup(popup, anchor) {
  const anchorRect = anchor.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = anchorRect.right + 10;
  let top = anchorRect.top;

  if (left + popupRect.width > viewportWidth) left = anchorRect.left - popupRect.width - 10;
  if (left < 10) left = 10;
  if (top + popupRect.height > viewportHeight) top = viewportHeight - popupRect.height - 10;
  if (top < 10) top = 10;

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}