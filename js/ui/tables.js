import { Storage } from '../storage.js';
import { Calculator } from '../calculations.js';
import { CONFIG } from '../config.js';
import { showModal, closeModal } from './modals.js';
import { showPopup, hideAllPopups } from './popups.js';

const getState = () => window.AppState || { currentYear: 2026, currentMonth: 0, filters: {projects:{}, employees:{}}, sort: {projects:{}, employees:{}} };

export function initTables() {
  setupSorting();
  setupFiltering();
}

export function renderProjects() {
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const tbody = document.getElementById('projectsBody');
  const totalEl = document.getElementById('totalProfit');
  if (!tbody) return;

  // Фильтрация
  let projects = [...data.projects];
  if (state.filters.projects?.company) {
    projects = projects.filter(p => p.company.toLowerCase().includes(state.filters.projects.company.toLowerCase()));
  }
  if (state.filters.projects?.name) {
    projects = projects.filter(p => p.name.toLowerCase().includes(state.filters.projects.name.toLowerCase()));
  }

  // Сортировка
  if (state.sort.projects?.column) {
    const { column, direction } = state.sort.projects;
    projects.sort((a, b) => {
      let valA = a[column], valB = b[column];
      if (column === 'staff') {
        valA = Calculator.calculateProjectRevenue(a, data.employees, state.currentYear, state.currentMonth).usedEffectiveCapacity;
        valB = Calculator.calculateProjectRevenue(b, data.employees, state.currentYear, state.currentMonth).usedEffectiveCapacity;
      }
      if (column === 'forecast') {
        valA = Calculator.calculateProjectProfit(a, data.employees, state.currentYear, state.currentMonth);
        valB = Calculator.calculateProjectProfit(b, data.employees, state.currentYear, state.currentMonth);
      }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  tbody.innerHTML = '';
  let totalProfit = 0;

  if (projects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888">Нет проектов</td></tr>';
    if (totalEl) totalEl.textContent = '';
    return;
  }

  projects.forEach(project => {
    const rev = Calculator.calculateProjectRevenue(project, data.employees, state.currentYear, state.currentMonth);
    const costs = Calculator.calculateProjectCosts(project, data.employees);
    const profit = rev.total - costs.total;
    totalProfit += profit;
    const usedCap = rev.usedEffectiveCapacity.toFixed(1);
    const overloaded = parseFloat(usedCap) > project.capacity;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${project.company}</td>
      <td>${project.name}</td>
      <td>${project.budget.toLocaleString()} ₽</td>
      <td class="${overloaded ? 'overflow-capacity' : ''}">${usedCap} / ${project.capacity}</td>
      <td class="${profit >= 0 ? 'text-success' : 'text-danger'}">${profit.toFixed(2)} ₽</td>
      <td>
        <button class="btn btn-sm btn-secondary view-emp-btn" data-id="${project.id}">👥 ${project.assignments?.length || 0}</button>
        <button class="btn btn-sm btn-danger delete-proj-btn" data-id="${project.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (totalEl) {
    totalEl.textContent = `Общая прибыль: ${totalProfit.toFixed(2)} ₽`;
    totalEl.className = `total-profit ${totalProfit >= 0 ? 'positive' : 'negative'}`;
  }

  // Обработчики кнопок
  tbody.querySelectorAll('.view-emp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => showProjectEmployees(e.currentTarget.dataset.id));
  });
  tbody.querySelectorAll('.delete-proj-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteProject(e.currentTarget.dataset.id));
  });
}

export function renderEmployees() {
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const tbody = document.getElementById('employeesBody');
  if (!tbody) return;

  let employees = [...data.employees];
  // Фильтрация
  if (state.filters.employees?.firstName) {
    employees = employees.filter(e => e.firstName.toLowerCase().includes(state.filters.employees.firstName.toLowerCase()));
  }
  if (state.filters.employees?.lastName) {
    employees = employees.filter(e => e.lastName.toLowerCase().includes(state.filters.employees.lastName.toLowerCase()));
  }
  if (state.filters.employees?.position) {
    employees = employees.filter(e => e.position === state.filters.employees.position);
  }

  // Сортировка
  if (state.sort.employees?.column) {
    const { column, direction } = state.sort.employees;
    employees.sort((a, b) => {
      let valA = a[column], valB = b[column];
      if (column === 'age') { valA = calcAge(a.birthDate); valB = calcAge(b.birthDate); }
      if (column === 'payment') { valA = Calculator.calculateEmployeePayment(a); valB = Calculator.calculateEmployeePayment(b); }
      if (column === 'profit') { valA = Calculator.calculateEmployeeProfit(a, data.projects, state.currentYear, state.currentMonth); valB = Calculator.calculateEmployeeProfit(b, data.projects, state.currentYear, state.currentMonth); }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  tbody.innerHTML = '';
  if (employees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#888">Нет сотрудников</td></tr>';
    return;
  }

  employees.forEach(emp => {
    const age = calcAge(emp.birthDate);
    const payment = Calculator.calculateEmployeePayment(emp);
    const profit = Calculator.calculateEmployeeProfit(emp, data.projects, state.currentYear, state.currentMonth);
    const currentLoad = emp.assignments.reduce((s, a) => s + a.capacity, 0);
    const isFull = currentLoad >= 1.5;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${emp.firstName}</td>
      <td>${emp.lastName}</td>
      <td>${age}</td>
      <td>
        <select class="position-select" data-id="${emp.id}">
          ${CONFIG.POSITIONS.map(p => `<option value="${p}" ${emp.position===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </td>
      <td><input type="number" class="salary-input" value="${emp.salary}" data-id="${emp.id}" style="width:70px"></td>
      <td>${payment.toFixed(2)} ₽</td>
      <td><button class="btn btn-sm btn-secondary view-assign-btn" data-id="${emp.id}">📋 ${emp.assignments.length} <small>(${currentLoad.toFixed(1)}/1.5)</small></button></td>
      <td class="${profit >= 0 ? 'text-success' : 'text-danger'}">${profit.toFixed(2)} ₽</td>
      <td>
        <button class="btn btn-sm btn-primary assign-btn" data-id="${emp.id}" ${isFull?'disabled':''}>➕</button>
        <button class="btn btn-sm btn-info vacation-btn" data-id="${emp.id}">🏖️</button>
        <button class="btn btn-sm btn-danger delete-emp-btn" data-id="${emp.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Обработчики
  tbody.querySelectorAll('.salary-input').forEach(inp => {
    inp.addEventListener('change', (e) => updateEmpSalary(e.currentTarget.dataset.id, parseFloat(e.currentTarget.value)));
  });
  tbody.querySelectorAll('.position-select').forEach(sel => {
    sel.addEventListener('change', (e) => updateEmpPosition(e.currentTarget.dataset.id, e.currentTarget.value));
  });
  tbody.querySelectorAll('.assign-btn').forEach(btn => {
    btn.addEventListener('click', (e) => showAssignPopup(e.currentTarget.dataset.id, e.currentTarget));
  });
  tbody.querySelectorAll('.vacation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => showVacationCalendar(e.currentTarget.dataset.id));
  });
  tbody.querySelectorAll('.view-assign-btn').forEach(btn => {
    btn.addEventListener('click', (e) => showEmployeeAssignments(e.currentTarget.dataset.id));
  });
  tbody.querySelectorAll('.delete-emp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteEmployee(e.currentTarget.dataset.id));
  });
}

function calcAge(birthDate) {
  if (!birthDate) return '-';
  const today = new Date(), birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function setupSorting() {
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      const view = document.getElementById('projectsView').classList.contains('active') ? 'projects' : 'employees';
      const sort = getState().sort[view];

      if (sort.column === col) {
        sort.direction = sort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        sort.column = col;
        sort.direction = 'asc';
      }

      document.querySelectorAll('th[data-sort]').forEach(t => t.classList.remove('sorted-asc','sorted-desc'));
      th.classList.add(sort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');

      if (view === 'projects') renderProjects(); else renderEmployees();
    });
  });
}

function setupFiltering() {
  document.querySelectorAll('th[data-filter]').forEach(th => {
    const icon = th.querySelector('.filter-icon');
    if (!icon) return;
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const col = th.dataset.filter;
      const view = document.getElementById('projectsView').classList.contains('active') ? 'projects' : 'employees';
      showFilterPopup(col, view, icon);
    });
  });
}

function showFilterPopup(column, view, anchor) {
  hideAllPopups();
  const state = getState();
  const currentVal = state.filters[view]?.[column] || '';

  let content = `<div style="padding:0.5rem"><strong>Фильтр: ${column}</strong><br>`;
  if (column === 'position') {
    content += `<select id="filterSelect" style="margin-top:0.5rem;width:100%">
      <option value="">Все</option>
      ${CONFIG.POSITIONS.map(p => `<option value="${p}" ${currentVal===p?'selected':''}>${p}</option>`).join('')}
    </select>`;
  } else {
    content += `<input type="text" id="filterInput" value="${currentVal}" placeholder="Введите..." style="margin-top:0.5rem;width:100%">`;
  }
  content += `<div style="margin-top:0.5rem;display:flex;gap:0.5rem">
    <button class="btn btn-primary btn-sm" id="applyFilter">Применить</button>
    <button class="btn btn-secondary btn-sm" id="cancelFilter">Отмена</button>
  </div></div>`;

  const popup = showPopup(content, anchor);

  popup.querySelector('#applyFilter')?.addEventListener('click', () => {
    const val = column === 'position'
      ? popup.querySelector('#filterSelect').value
      : popup.querySelector('#filterInput').value;
    if (!getState().filters[view]) getState().filters[view] = {};
    if (val) getState().filters[view][column] = val;
    else delete getState().filters[view][column];
    hideAllPopups();
    if (view === 'projects') renderProjects(); else renderEmployees();
    renderFilterChips();
  });

  popup.querySelector('#cancelFilter')?.addEventListener('click', () => hideAllPopups());
}

function renderFilterChips() {
  const state = getState();
  const view = document.getElementById('projectsView').classList.contains('active') ? 'projects' : 'employees';
  const container = document.getElementById(`${view}Filters`);
  if (!container) return;

  container.innerHTML = '';
  const filters = state.filters[view] || {};
  Object.entries(filters).forEach(([key, val]) => {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = `${key}: ${val} <button>×</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      delete state.filters[view][key];
      if (view === 'projects') renderProjects(); else renderEmployees();
      renderFilterChips();
    });
    container.appendChild(chip);
  });

  if (Object.keys(filters).length >= 2) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-sm btn-secondary clear-filters-btn';
    clearBtn.textContent = 'Очистить фильтры';
    clearBtn.addEventListener('click', () => {
      state.filters[view] = {};
      if (view === 'projects') renderProjects(); else renderEmployees();
      renderFilterChips();
    });
    container.appendChild(clearBtn);
  }
}

// --- CRUD операции ---

function deleteProject(id) {
  if (!confirm('Удалить проект?')) return;
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  data.projects = data.projects.filter(p => p.id !== id);
  data.employees.forEach(emp => {
    emp.assignments = emp.assignments.filter(a => a.projectId !== id);
  });
  Storage.saveMonthData(state.currentYear, state.currentMonth, data);
  renderProjects();
  renderEmployees();
}

function deleteEmployee(id) {
  if (!confirm('Удалить сотрудника?')) return;
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  data.employees = data.employees.filter(e => e.id !== id);
  data.projects.forEach(proj => {
    proj.assignments = proj.assignments.filter(a => a.employeeId !== id);
  });
  Storage.saveMonthData(state.currentYear, state.currentMonth, data);
  renderEmployees();
  renderProjects();
}

function updateEmpSalary(id, salary) {
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const emp = data.employees.find(e => e.id === id);
  if (emp && salary > 0) {
    emp.salary = salary;
    Storage.saveMonthData(state.currentYear, state.currentMonth, data);
    renderEmployees();
    renderProjects();
  }
}

function updateEmpPosition(id, position) {
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const emp = data.employees.find(e => e.id === id);
  if (emp) {
    emp.position = position;
    Storage.saveMonthData(state.currentYear, state.currentMonth, data);
    renderEmployees();
  }
}

// --- Всплывающие окна деталей ---

function showProjectEmployees(projectId) {
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return;

  let html = `<h3>👥 Сотрудники: ${project.name}</h3>`;
  if (!project.assignments?.length) {
    html += '<p style="color:#888">Нет назначенных сотрудников</p>';
  } else {
    html += '<table style="width:100%;font-size:0.9rem"><thead><tr><th>Сотрудник</th><th>Мощность</th><th>Соответствие</th><th>Отпуск</th><th>Эффективн.</th><th>Доход</th><th>Затраты</th><th>Прибыль</th><th>Действия</th></tr></thead><tbody>';

    project.assignments.forEach(a => {
      const emp = data.employees.find(e => e.id === a.employeeId);
      if (!emp) return;
      const vacCoeff = Calculator.getVacationCoefficient(state.currentYear, state.currentMonth, emp.vacationDays || []);
      const effCap = Calculator.getEffectiveCapacity(a.capacity, a.fit, vacCoeff);
      const revData = Calculator.calculateProjectRevenue(project, [emp], state.currentYear, state.currentMonth);
      const revenue = revData.byEmployee[emp.id] || 0;
      const cost = Calculator.calculateEmployeeCost(emp.salary, a.capacity);
      const profit = revenue - cost;

      html += `<tr>
        <td><strong>${emp.firstName} ${emp.lastName}</strong></td>
        <td>${a.capacity.toFixed(2)}</td>
        <td>${a.fit.toFixed(2)}</td>
        <td>${emp.vacationDays?.length || 0} дн.</td>
        <td>${effCap.toFixed(3)}</td>
        <td>${revenue.toFixed(2)} ₽</td>
        <td>${cost.toFixed(2)} ₽</td>
        <td class="${profit>=0?'text-success':'text-danger'}">${profit.toFixed(2)} ₽</td>
        <td>
          <button class="btn btn-sm btn-secondary edit-assign-btn" data-eid="${emp.id}" data-pid="${project.id}">✏️</button>
          <button class="btn btn-sm btn-danger unassign-btn" data-eid="${emp.id}" data-pid="${project.id}">❌</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
  }

  showModal(html, () => {
    document.querySelectorAll('.edit-assign-btn').forEach(btn => {
      btn.addEventListener('click', (e) => showEditAssignment(e.dataset.eid, e.dataset.pid));
    });
    document.querySelectorAll('.unassign-btn').forEach(btn => {
      btn.addEventListener('click', (e) => confirmUnassign(e.dataset.eid, e.dataset.pid));
    });
  });
}

function showEmployeeAssignments(empId) {
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const emp = data.employees.find(e => e.id === empId);
  if (!emp) return;

  let html = `<h3>📋 Назначения: ${emp.firstName} ${emp.lastName}</h3>`;
  if (!emp.assignments?.length) {
    html += '<p style="color:#888">Нет назначений</p>';
  } else {
    html += '<table style="width:100%;font-size:0.9rem"><thead><tr><th>Проект</th><th>Мощность</th><th>Соответствие</th><th>Отпуск</th><th>Эффективн.</th><th>Доход</th><th>Затраты</th><th>Прибыль</th><th>Действия</th></tr></thead><tbody>';

    emp.assignments.forEach(a => {
      const proj = data.projects.find(p => p.id === a.projectId);
      if (!proj) return;
      const vacCoeff = Calculator.getVacationCoefficient(state.currentYear, state.currentMonth, emp.vacationDays || []);
      const effCap = Calculator.getEffectiveCapacity(a.capacity, a.fit, vacCoeff);
      const revData = Calculator.calculateProjectRevenue(proj, [emp], state.currentYear, state.currentMonth);
      const revenue = revData.byEmployee[emp.id] || 0;
      const cost = Calculator.calculateEmployeeCost(emp.salary, a.capacity);
      const profit = revenue - cost;

      html += `<tr>
        <td><strong>${proj.name}</strong> (${proj.company})</td>
        <td>${a.capacity.toFixed(2)}</td>
        <td>${a.fit.toFixed(2)}</td>
        <td>${emp.vacationDays?.length || 0} дн.</td>
        <td>${effCap.toFixed(3)}</td>
        <td>${revenue.toFixed(2)} ₽</td>
        <td>${cost.toFixed(2)} ₽</td>
        <td class="${profit>=0?'text-success':'text-danger'}">${profit.toFixed(2)} ₽</td>
        <td>
          <button class="btn btn-sm btn-secondary edit-assign-btn" data-eid="${emp.id}" data-pid="${proj.id}">✏️</button>
          <button class="btn btn-sm btn-danger unassign-btn" data-eid="${emp.id}" data-pid="${proj.id}">❌</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
  }

  showModal(html, () => {
    document.querySelectorAll('.edit-assign-btn').forEach(btn => {
      btn.addEventListener('click', (e) => showEditAssignment(e.dataset.eid, e.dataset.pid));
    });
    document.querySelectorAll('.unassign-btn').forEach(btn => {
      btn.addEventListener('click', (e) => confirmUnassign(e.dataset.eid, e.dataset.pid));
    });
  });
}

function showEditAssignment(empId, projectId) {
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const emp = data.employees.find(e => e.id === empId);
  const proj = data.projects.find(p => p.id === projectId);
  const assignment = emp?.assignments?.find(a => a.projectId === projectId);
  if (!assignment) return;

  const currentLoad = emp.assignments.reduce((s,a) => s + a.capacity, 0);
  const available = 1.5 - (currentLoad - assignment.capacity);

  let html = `<h3>✏️ Редактировать задание</h3>
    <p><strong>${emp.firstName} ${emp.lastName}</strong> → <strong>${proj.name}</strong></p>
    <div class="form-group">
      <label>Мощность (0.0 - ${available.toFixed(1)}): <span id="capVal">${assignment.capacity.toFixed(1)}</span></label>
      <input type="range" id="capRange" min="0" max="${available}" step="0.1" value="${assignment.capacity}">
    </div>
    <div class="form-group">
      <label>Соответствие (0.0 - 1.0): <span id="fitVal">${assignment.fit.toFixed(1)}</span></label>
      <input type="range" id="fitRange" min="0" max="1" step="0.1" value="${assignment.fit}">
    </div>
    <p><strong>Эффективная мощность:</strong> <span id="effCap">${Calculator.getEffectiveCapacity(assignment.capacity, assignment.fit, Calculator.getVacationCoefficient(state.currentYear, state.currentMonth, emp.vacationDays||[])).toFixed(3)}</span></p>
    <div style="display:flex;gap:0.5rem">
      <button class="btn btn-primary" id="saveAssign">Сохранить</button>
      <button class="btn btn-secondary" id="cancelAssign">Отмена</button>
    </div>`;

  showModal(html, () => {
    const capRange = document.getElementById('capRange');
    const fitRange = document.getElementById('fitRange');

    function updatePreview() {
      document.getElementById('capVal').textContent = parseFloat(capRange.value).toFixed(1);
      document.getElementById('fitVal').textContent = parseFloat(fitRange.value).toFixed(1);
      const eff = Calculator.getEffectiveCapacity(parseFloat(capRange.value), parseFloat(fitRange.value), Calculator.getVacationCoefficient(state.currentYear, state.currentMonth, emp.vacationDays||[]));
      document.getElementById('effCap').textContent = eff.toFixed(3);
    }
    capRange.addEventListener('input', updatePreview);
    fitRange.addEventListener('input', updatePreview);

    document.getElementById('saveAssign').addEventListener('click', () => {
      assignment.capacity = parseFloat(capRange.value);
      assignment.fit = parseFloat(fitRange.value);
      Storage.saveMonthData(state.currentYear, state.currentMonth, data);
      closeModal();
      renderProjects();
      renderEmployees();
      // Обновить открытые попапы
      if (document.querySelector('.modal')) {
        if (document.querySelector('.view-emp-btn')) showProjectEmployees(projectId);
        else showEmployeeAssignments(empId);
      }
    });
    document.getElementById('cancelAssign').addEventListener('click', closeModal);
  });
}

function confirmUnassign(empId, projectId) {
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const emp = data.employees.find(e => e.id === empId);
  const proj = data.projects.find(p => p.id === projectId);
  const assignment = emp?.assignments?.find(a => a.projectId === projectId);
  if (!assignment) return;

  const vacCoeff = Calculator.getVacationCoefficient(state.currentYear, state.currentMonth, emp.vacationDays||[]);
  const effCap = Calculator.getEffectiveCapacity(assignment.capacity, assignment.fit, vacCoeff);
  const revData = Calculator.calculateProjectRevenue(proj, [emp], state.currentYear, state.currentMonth);
  const revenue = revData.byEmployee[emp.id] || 0;
  const cost = Calculator.calculateEmployeeCost(emp.salary, assignment.capacity);
  const profit = revenue - cost;

  let html = `<h3>❌ Отменить назначение?</h3>
    <p><strong>${emp.firstName} ${emp.lastName}</strong> ←→ <strong>${proj.name}</strong></p>
    <table style="width:100%;font-size:0.9rem">
      <tr><td>Мощность:</td><td>${assignment.capacity.toFixed(2)}</td></tr>
      <tr><td>Затраты:</td><td>${cost.toFixed(2)} ₽</td></tr>
      <tr><td>Доход:</td><td>${revenue.toFixed(2)} ₽</td></tr>
      <tr><td><strong>Прибыль:</strong></td><td class="${profit>=0?'text-success':'text-danger'}"><strong>${profit.toFixed(2)} ₽</strong></td></tr>
    </table>
    <div style="margin-top:1rem;display:flex;gap:0.5rem">
      <button class="btn btn-danger" id="confirmUnassign">Подтвердить</button>
      <button class="btn btn-secondary" id="cancelUnassign">Отмена</button>
    </div>`;

  showModal(html, () => {
    document.getElementById('confirmUnassign').addEventListener('click', () => {
      emp.assignments = emp.assignments.filter(a => a.projectId !== projectId);
      proj.assignments = proj.assignments.filter(a => a.employeeId !== empId);
      Storage.saveMonthData(state.currentYear, state.currentMonth, data);
      closeModal();
      renderProjects();
      renderEmployees();
      if (document.querySelector('.modal')) {
        if (document.querySelector('.view-emp-btn')) showProjectEmployees(projectId);
        else showEmployeeAssignments(empId);
      }
    });
    document.getElementById('cancelUnassign').addEventListener('click', closeModal);
  });
}

// Экспорт для других модулей
window.showAssignPopup = function(empId, anchor) {
  const state = getState();
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const emp = data.employees.find(e => e.id === empId);
  if (!emp) return;

  const currentLoad = emp.assignments.reduce((s,a) => s + a.capacity, 0);
  const available = Math.max(0, 1.5 - currentLoad);
  if (available <= 0) {
    alert('Сотрудник полностью загружен (1.5)');
    return;
  }

  const projects = data.projects.filter(p => p.capacity > (p.assignments?.reduce((s,a) => {
    const e = data.employees.find(emp => emp.id === a.employeeId);
    return s + (e ? a.capacity : 0);
  }, 0) || 0));

  let html = `<h3>➕ Назначить на проект</h3>
    <p><strong>${emp.firstName} ${emp.lastName}</strong> | Загрузка: ${currentLoad.toFixed(1)}/1.5</p>
    <div class="form-group">
      <label>Проект:</label>
      <select id="projSelect">
        ${projects.map(p => `<option value="${p.id}">${p.name} (${p.company}) - доступно: ${(p.capacity - (p.assignments?.reduce((s,a)=>{const e=data.employees.find(emp=>emp.id===a.employeeId);return s+(e?a.capacity:0)},0)||0)).toFixed(1)}/${p.capacity}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Мощность (0.0 - ${available.toFixed(1)}): <span id="capVal">0.5</span></label>
      <input type="range" id="capRange" min="0" max="${available}" step="0.1" value="0.5">
    </div>
    <div class="form-group">
      <label>Соответствие (0.0 - 1.0): <span id="fitVal">0.8</span></label>
      <input type="range" id="fitRange" min="0" max="1" step="0.1" value="0.8">
    </div>
    <p><strong>Эффективная мощность:</strong> <span id="effCap">0.400</span></p>
    <div style="display:flex;gap:0.5rem">
      <button class="btn btn-primary" id="assignBtn">Назначить</button>
      <button class="btn btn-secondary" id="cancelAssign">Отмена</button>
    </div>`;

  showPopup(html, anchor, (popup) => {
    const capRange = popup.querySelector('#capRange');
    const fitRange = popup.querySelector('#fitRange');

    function updatePreview() {
      popup.querySelector('#capVal').textContent = parseFloat(capRange.value).toFixed(1);
      popup.querySelector('#fitVal').textContent = parseFloat(fitRange.value).toFixed(1);
      const eff = Calculator.getEffectiveCapacity(parseFloat(capRange.value), parseFloat(fitRange.value), Calculator.getVacationCoefficient(state.currentYear, state.currentMonth, emp.vacationDays||[]));
      popup.querySelector('#effCap').textContent = eff.toFixed(3);
    }
    capRange.addEventListener('input', updatePreview);
    fitRange.addEventListener('input', updatePreview);
    updatePreview();

    popup.querySelector('#assignBtn').addEventListener('click', () => {
      const projId = popup.querySelector('#projSelect').value;
      const proj = data.projects.find(p => p.id === projId);
      const cap = parseFloat(capRange.value);
      const fit = parseFloat(fitRange.value);

      emp.assignments.push({ projectId: projId, capacity: cap, fit });
      proj.assignments.push({ employeeId: empId, capacity: cap, fit });

      Storage.saveMonthData(state.currentYear, state.currentMonth, data);
      hideAllPopups();
      renderProjects();
      renderEmployees();
    });
    popup.querySelector('#cancelAssign').addEventListener('click', () => hideAllPopups());
  });
};

window.showVacationCalendar = function(empId) {
  // Реализация календаря в calendar.js
  import('./calendar.js').then(mod => mod.showVacationCalendar(empId));
};