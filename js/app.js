import { Storage } from './storage.js';
import { Calculator } from './calculations.js';
import { CONFIG } from './config.js';
import { SeedData } from './seed.js';
import { initSidebar } from './ui/sidebar.js';
import { initTables, renderProjects, renderEmployees } from './ui/tables.js';
import { initForms } from './ui/forms.js';
import { initModals } from './ui/modals.js';
import { initPopups } from './ui/popups.js';
import { initCalendar } from './ui/calendar.js';

// Глобальное состояние
export const AppState = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  currentView: 'projects',
  filters: { projects: {}, employees: {} },
  sort: { projects: { column: null, direction: 'asc' }, employees: { column: null, direction: 'asc' } }
};
window.AppState = AppState;

export async function initApp() {
  Storage.init();
  await loadCurrentMonth();

  initSidebar();
  initTables();
  initForms();
  initModals();
  initPopups();
  initCalendar();

  renderProjects();
  setupGlobalListeners();
  window.addEventListener('periodChanged', async (e) => {
  await loadCurrentMonth();
  if (AppState.currentView === 'projects') {
    renderProjects();
  } else {
    renderEmployees();
  }
});
}

async function loadCurrentMonth() {
  const data = Storage.getMonthData(AppState.currentYear, AppState.currentMonth);
  window.currentData = data;
}

function setupGlobalListeners() {
  // Вкладки
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const view = e.currentTarget.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`${view}View`).classList.add('active');
      AppState.currentView = view;
      if (view === 'projects') renderProjects(); else renderEmployees();
    });
  });

  // Месяц/Год
  document.getElementById('monthSelect')?.addEventListener('change', (e) => {
    AppState.currentMonth = parseInt(e.target.value);
    handlePeriodChange();
  });
  document.getElementById('yearSelect')?.addEventListener('change', (e) => {
    AppState.currentYear = parseInt(e.target.value);
    handlePeriodChange();
  });

  // Кнопки сайдбара
  document.getElementById('seedDataBtn')?.addEventListener('click', () => {
    SeedData.showSeedModal();
  });
  document.getElementById('addBtn')?.addEventListener('click', () => {
    initForms().openAddForm(AppState.currentView === 'projects' ? 'project' : 'employee');
  });
}

async function handlePeriodChange() {
  await loadCurrentMonth();
  if (AppState.currentView === 'projects') renderProjects(); else renderEmployees();
}

document.addEventListener('DOMContentLoaded', initApp);