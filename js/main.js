
import { Storage } from './storage.js';
import { Calculator } from './calculations.js';
import { CONFIG } from './config.js';
import { initSidebar } from './ui/sidebar.js';
import { initTables, renderProjects, renderEmployees } from './ui/tables.js';
import { initForms } from './ui/forms.js';
import { initModals } from './ui/modals.js';
import { initPopups } from './ui/popups.js';

// Глобальное состояние
export const AppState = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  currentView: 'projects',
  filters: {
    projects: {},
    employees: {}
  },
  sort: {
    projects: { column: null, direction: 'asc' },
    employees: { column: null, direction: 'asc' }
  }
};

// Инициализация приложения
export async function initApp() {
  // Инициализация хранилища
  Storage.init();

  // Загрузка данных за текущий месяц
  await loadCurrentMonth();

  // Инициализация UI компонентов
  initSidebar();
  initTables();
  initForms();
  initModals();
  initPopups();

  // Рендер начального состояния
  renderProjects();

  // Глобальные обработчики
  setupEventListeners();
}

async function loadCurrentMonth() {
  const data = Storage.getMonthData(AppState.currentYear, AppState.currentMonth);
  window.currentData = data;
}

function setupEventListeners() {
  // Переключение вида
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');

      const view = e.currentTarget.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`${view}View`).classList.add('active');

      AppState.currentView = view;
      if (view === 'projects') renderProjects();
      else renderEmployees();
    });
  });

  // Выбор месяца/года
  document.getElementById('monthSelect')?.addEventListener('change', (e) => {
    AppState.currentMonth = parseInt(e.target.value);
    handlePeriodChange();
  });

  document.getElementById('yearSelect')?.addEventListener('change', (e) => {
    AppState.currentYear = parseInt(e.target.value);
    handlePeriodChange();
  });
}

async function handlePeriodChange() {
  await loadCurrentMonth();
  if (AppState.currentView === 'projects') renderProjects();
  else renderEmployees();
}

// Запуск
document.addEventListener('DOMContentLoaded', initApp);