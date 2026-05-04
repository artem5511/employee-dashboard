// js/ui/tables.js
import { Storage } from '../storage.js'; // Убедись, что storage.js существует и экспортирует Storage
import { Calculator } from '../calculations.js'; // Убедись, что calculations.js существует

// Глобальное состояние (должно быть доступно, например через window.AppState)
const getAppState = () => window.AppState || { currentYear: 2026, currentMonth: 0 };

export function initTables() {
  console.log("Tables module initialized");
}

export function renderProjects() {
  const state = getAppState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const tbody = document.getElementById('projectsBody');
  const totalProfitEl = document.getElementById('totalProfit');

  if (!tbody) return;
  tbody.innerHTML = '';

  let totalProjectProfit = 0;

  if (data.projects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">Нет проектов. Нажмите "Данные посева" или добавьте проект.</td></tr>';
    if (totalProfitEl) totalProfitEl.textContent = '';
    return;
  }

  data.projects.forEach(project => {
    // Расчеты
    const revenueData = Calculator.calculateProjectRevenue(project, data.employees, state.currentYear, state.currentMonth);
    const costData = Calculator.calculateProjectCosts(project, data.employees);
    const profit = revenueData.total - costData.total;

    totalProjectProfit += profit;

    // Подсчет используемой мощности
    const usedCapacity = revenueData.usedEffectiveCapacity.toFixed(1);
    const isOverloaded = parseFloat(usedCapacity) > project.capacity;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${project.company}</td>
      <td>${project.name}</td>
      <td>${project.budget.toLocaleString()} ₽</td>
      <td class="${isOverloaded ? 'overflow-capacity' : ''}">
        ${usedCapacity} / ${project.capacity}
      </td>
      <td class="${profit >= 0 ? 'text-success' : 'text-danger'}">
        ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ₽
      </td>
      <td>
        <button class="btn btn-sm btn-secondary view-employees-btn" data-id="${project.id}">
          👥 Сотрудники (${project.assignments?.length || 0})
        </button>
        <button class="btn btn-sm btn-danger delete-project-btn" data-id="${project.id}">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Отображение общей прибыли
  if (totalProfitEl) {
    totalProfitEl.textContent = `Общая прибыль: ${totalProjectProfit.toLocaleString()} ₽`;
    totalProfitEl.className = `total-profit ${totalProjectProfit >= 0 ? 'positive' : 'negative'}`;
  }

  // Добавляем слушатели событий для кнопок внутри таблицы
  attachProjectTableEvents();
}

export function renderEmployees() {
  const state = getAppState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const tbody = document.getElementById('employeesBody');

  if (!tbody) return;
  tbody.innerHTML = '';

  if (data.employees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#888;">Нет сотрудников.</td></tr>';
    return;
  }

  data.employees.forEach(emp => {
    const age = calculateAge(emp.birthDate);
    const payment = Calculator.calculateEmployeePayment(emp);
    const profit = Calculator.calculateEmployeeProfit(emp, data.projects, state.currentYear, state.currentMonth);

    // Подсчет текущей загрузки
    const currentLoad = emp.assignments.reduce((sum, a) => sum + a.capacity, 0);
    const loadText = `${currentLoad.toFixed(1)} / 1.5`;
    const isFull = currentLoad >= 1.5;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${emp.firstName}</td>
      <td>${emp.lastName}</td>
      <td>${age}</td>
      <td>
        <select class="position-select" data-id="${emp.id}">
          ${['Junior', 'Middle', 'Senior', 'Lead', 'Architect', 'Business Manager'].map(pos =>
            `<option value="${pos}" ${emp.position === pos ? 'selected' : ''}>${pos}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <input type="number" class="salary-input" value="${emp.salary}" data-id="${emp.id}" style="width: 80px;">
      </td>
      <td>${payment.toLocaleString()} ₽</td>
      <td>
        <button class="btn btn-sm btn-secondary view-assignments-btn" data-id="${emp.id}" ${isFull ? 'disabled' : ''}>
           📋 Задания (${emp.assignments.length}) <br> <small>${loadText}</small>
        </button>
      </td>
      <td class="${profit >= 0 ? 'text-success' : 'text-danger'}">
        ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ₽
      </td>
      <td>
        <button class="btn btn-sm btn-primary assign-btn" data-id="${emp.id}" ${isFull ? 'disabled' : ''}>
          ➕ Назначить
        </button>
        <button class="btn btn-sm btn-info vacation-btn" data-id="${emp.id}">
          🏖️
        </button>
        <button class="btn btn-sm btn-danger delete-emp-btn" data-id="${emp.id}">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  attachEmployeeTableEvents();
}

// --- Вспомогательные функции ---

function calculateAge(birthDateString) {
  if (!birthDateString) return '-';
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function attachProjectTableEvents() {
  // Здесь можно добавить обработчики для кнопок удаления и просмотра
  // Пока просто заглушки, чтобы не было ошибок при клике
  document.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if(confirm('Удалить проект?')) {
        deleteProject(id);
      }
    });
  });
}

function attachEmployeeTableEvents() {
  // Обработка изменения зарплаты
  document.querySelectorAll('.salary-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.currentTarget.dataset.id;
      const newSalary = parseFloat(e.currentTarget.value);
      updateEmployeeSalary(id, newSalary);
    });
  });

  // Обработка изменения должности
  document.querySelectorAll('.position-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const id = e.currentTarget.dataset.id;
      const newPos = e.currentTarget.value;
      updateEmployeePosition(id, newPos);
    });
  });

  // Кнопка отпуска
  document.querySelectorAll('.vacation-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          alert(`Открыть календарь для сотрудника ID: ${id}`);
          // Тут будет логика открытия модального окна календаря
      });
  });

  // Кнопка назначения
  document.querySelectorAll('.assign-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          alert(`Назначить сотрудника ID: ${id} на проект`);
          // Тут будет логика открытия модалки назначения
      });
  });
}

// --- Функции обновления данных (через Storage) ---

function deleteProject(id) {
  const state = getAppState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);

  // Удаляем проект
  data.projects = data.projects.filter(p => p.id !== id);

  // Удаляем ссылки на этот проект у всех сотрудников
  data.employees.forEach(emp => {
    emp.assignments = emp.assignments.filter(a => a.projectId !== id);
  });

  Storage.saveMonthData(state.currentYear, state.currentMonth, data);
  renderProjects();
  renderEmployees(); // Перерисовать обе таблицы, так как изменились связи
}

function updateEmployeeSalary(id, newSalary) {
  const state = getAppState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const emp = data.employees.find(e => e.id === id);
  if (emp) {
    emp.salary = newSalary;
    Storage.saveMonthData(state.currentYear, state.currentMonth, data);
    renderEmployees(); // Пересчет выплат и прибылей
    renderProjects();  // Пересчет прибылей проектов
  }
}

function updateEmployeePosition(id, newPos) {
  const state = getAppState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const emp = data.employees.find(e => e.id === id);
  if (emp) {
    emp.position = newPos;
    Storage.saveMonthData(state.currentYear, state.currentMonth, data);
    // Позиция не влияет на финансы напрямую, но можно перерисовать для порядка
    console.log(`Позиция сотрудника ${id} изменена на ${newPos}`);
  }
}