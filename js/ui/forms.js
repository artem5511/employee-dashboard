import { Storage } from '../storage.js';
import { CONFIG } from '../config.js';
import { AppState } from '../app.js';
import { renderProjects, renderEmployees } from './tables.js';

let slidePanel = null;

export function initForms() {
  slidePanel = document.getElementById('slidePanel');
  document.getElementById('slidePanelClose')?.addEventListener('click', closeSlidePanel);

  return { openAddForm };
}

function closeSlidePanel() {
  if (slidePanel) slidePanel.classList.remove('open');
}

function openAddForm(type) {
  const content = document.getElementById('slidePanelContent');
  if (!content) return;

  if (type === 'employee') {
    content.innerHTML = getEmployeeForm();
    setupEmployeeForm();
  } else {
    content.innerHTML = getProjectForm();
    setupProjectForm();
  }

  if (slidePanel) slidePanel.classList.add('open');
}

function getEmployeeForm() {
  return `<h3>➕ Новый сотрудник</h3>
    <form id="empForm">
      <div class="form-group"><label>Имя *</label><input type="text" id="firstName" required pattern="[A-Za-zА-Яа-яЁё]{3,}" title="Мин. 3 буквы"></div>
      <div class="form-group"><label>Фамилия *</label><input type="text" id="lastName" required pattern="[A-Za-zА-Яа-яЁё]{3,}" title="Мин. 3 буквы"></div>
      <div class="form-group"><label>Дата рождения *</label><input type="date" id="birthDate" required></div>
      <div class="form-group"><label>Должность *</label><select id="position" required>${CONFIG.POSITIONS.map(p=>`<option value="${p}">${p}</option>`).join('')}</select></div>
      <div class="form-group"><label>Зарплата *</label><input type="number" id="salary" required min="0" step="0.01"></div>
      <div id="formErrors" style="color:var(--danger);margin:0.5rem 0"></div>
      <div class="form-actions"><button type="submit" class="btn btn-primary" id="submitBtn">Сохранить</button><button type="button" class="btn btn-secondary" onclick="document.getElementById('slidePanelClose').click()">Отмена</button></div>
    </form>`;
}

function getProjectForm() {
  return `<h3>➕ Новый проект</h3>
    <form id="projForm">
      <div class="form-group"><label>Название проекта *</label><input type="text" id="projName" required pattern="[A-Za-z0-9А-Яа-яЁё]{3,}" title="Мин. 3 симв."></div>
      <div class="form-group"><label>Компания *</label><input type="text" id="company" required pattern="[A-Za-z0-9А-Яа-яЁё]{2,}" title="Мин. 2 симв."></div>
      <div class="form-group"><label>Бюджет *</label><input type="number" id="budget" required min="0" step="0.01"></div>
      <div class="form-group"><label>Мощность (чел.) *</label><input type="number" id="capacity" required min="1" step="1"></div>
      <div id="formErrors" style="color:var(--danger);margin:0.5rem 0"></div>
      <div class="form-actions"><button type="submit" class="btn btn-primary" id="submitBtn">Сохранить</button><button type="button" class="btn btn-secondary" onclick="document.getElementById('slidePanelClose').click()">Отмена</button></div>
    </form>`;
}

function setupEmployeeForm() {
  const form = document.getElementById('empForm');
  const submitBtn = document.getElementById('submitBtn');
  const errors = document.getElementById('formErrors');
  const birthDate = document.getElementById('birthDate');

  // Ограничение даты (18+ лет)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - CONFIG.MIN_AGE);
  birthDate.max = maxDate.toISOString().split('T')[0];

  function validate() {
    errors.textContent = '';
    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const birth = form.birthDate.value;
    const salary = parseFloat(form.salary.value);

    if (!/^[A-Za-zА-Яа-яЁё]{3,}$/.test(firstName)) { errors.textContent = 'Имя: мин. 3 буквы'; return false; }
    if (!/^[A-Za-zА-Яа-яЁё]{3,}$/.test(lastName)) { errors.textContent = 'Фамилия: мин. 3 буквы'; return false; }
    if (!birth) { errors.textContent = 'Укажите дату рождения'; return false; }
    if (new Date(birth) > maxDate) { errors.textContent = 'Возраст должен быть 18+'; return false; }
    if (!form.position.value) { errors.textContent = 'Выберите должность'; return false; }
    if (isNaN(salary) || salary <= 0) { errors.textContent = 'Зарплата > 0'; return false; }
    return true;
  }

  form.querySelectorAll('input,select').forEach(inp => {
    inp.addEventListener('input', () => submitBtn.disabled = !validate());
    inp.addEventListener('blur', validate);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;

    const data = Storage.getMonthData(AppState.currentYear, AppState.currentMonth);
    data.employees.push({
      id: Storage.generateId('emp'),
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      birthDate: form.birthDate.value,
      position: form.position.value,
      salary: parseFloat(form.salary.value),
      assignments: [],
      vacationDays: []
    });
    Storage.saveMonthData(AppState.currentYear, AppState.currentMonth, data);

    closeSlidePanel();
    renderEmployees();
    renderProjects();
  });

  submitBtn.disabled = true;
}

function setupProjectForm() {
  const form = document.getElementById('projForm');
  const submitBtn = document.getElementById('submitBtn');
  const errors = document.getElementById('formErrors');

  function validate() {
    errors.textContent = '';
    const name = form.projName.value.trim();
    const company = form.company.value.trim();
    const budget = parseFloat(form.budget.value);
    const capacity = parseInt(form.capacity.value);

    if (!/^[A-Za-z0-9А-Яа-яЁё]{3,}$/.test(name)) { errors.textContent = 'Название: мин. 3 симв.'; return false; }
    if (!/^[A-Za-z0-9А-Яа-яЁё]{2,}$/.test(company)) { errors.textContent = 'Компания: мин. 2 симв.'; return false; }
    if (isNaN(budget) || budget <= 0) { errors.textContent = 'Бюджет > 0'; return false; }
    if (isNaN(capacity) || capacity < 1) { errors.textContent = 'Мощность >= 1'; return false; }
    return true;
  }

  form.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => submitBtn.disabled = !validate());
    inp.addEventListener('blur', validate);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;

    const data = Storage.getMonthData(AppState.currentYear, AppState.currentMonth);
    data.projects.push({
      id: Storage.generateId('proj'),
      name: form.projName.value.trim(),
      company: form.company.value.trim(),
      budget: parseFloat(form.budget.value),
      capacity: parseInt(form.capacity.value),
      assignments: []
    });
    Storage.saveMonthData(AppState.currentYear, AppState.currentMonth, data);

    closeSlidePanel();
    renderProjects();
    renderEmployees();
  });

  submitBtn.disabled = true;
}