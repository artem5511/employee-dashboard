// js/ui/sidebar.js
import { CONFIG } from '../config.js';
import { AppState } from '../app.js';

export function initSidebar() {
  // Заполняем выпадающие списки месяца и года
  populateMonthSelect();
  populateYearSelect();

  // Устанавливаем текущий месяц/год
  setCurrentPeriod();
}

  // Обработчик кнопки сворачивания
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      // Меняем иконку
      toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '→' : '☰';
    });
  }

  // Обработчики выбора месяца/года
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');

  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      AppState.currentMonth = parseInt(e.target.value);
      handlePeriodChange();
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      AppState.currentYear = parseInt(e.target.value);
      handlePeriodChange();
    });
  }

  // Обработчики навигации (вкладки Проекты/Сотрудники)
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');

      const view = e.currentTarget.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`${view}View`).classList.add('active');

      AppState.currentView = view;
      // Здесь можно вызвать renderProjects() или renderEmployees()
      console.log(`Переключено на вкладку: ${view}`);
    });
  });

// Кнопка "Данные посева"
const seedBtn = document.getElementById('seedDataBtn');
if (seedBtn) {
  seedBtn.addEventListener('click', () => {
    // Импортируем и вызываем реальную функцию
    import('../seed.js').then(module => {
      module.SeedData.showSeedModal();
    });
  });
}

// Кнопка "Добавить"
const addBtn = document.getElementById('addBtn');
if (addBtn) {
  addBtn.addEventListener('click', () => {
    // Определяем текущую вкладку
    const currentView = document.querySelector('.nav-tab.active')?.dataset.view || 'projects';
    const formType = currentView === 'projects' ? 'project' : 'employee';

    // Открываем форму
    import('./forms.js').then(module => {
      module.openAddForm(formType);
    });
  });
}

function populateMonthSelect() {
  const select = document.getElementById('monthSelect');
  if (!select) return;

  CONFIG.MONTHS.forEach((monthName, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = monthName;
    select.appendChild(option);
  });
}

function populateYearSelect() {
  const select = document.getElementById('yearSelect');
  if (!select) return;

  CONFIG.YEARS.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    select.appendChild(option);
  });
}

function setCurrentPeriod() {
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');

  if (monthSelect) monthSelect.value = AppState.currentMonth;
  if (yearSelect) yearSelect.value = AppState.currentYear;
}

// Простая функция, которая только сообщает о смене периода
async function handlePeriodChange() {
  console.log(`Период изменен: ${AppState.currentYear}-${AppState.currentMonth}`);

  // Создаём и отправляем событие, которое поймает app.js
  window.dispatchEvent(new CustomEvent('periodChanged', {
    detail: {
      year: AppState.currentYear,
      month: AppState.currentMonth
    }
  }));
}