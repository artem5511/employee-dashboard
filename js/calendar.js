import { Storage } from '../storage.js';
import { Calculator } from '../calculations.js';
import { AppState } from '../app.js';
import { showModal, closeModal } from './modals.js';
import { renderProjects, renderEmployees } from './tables.js';

export function initCalendar() {}

export function showVacationCalendar(empId) {
  const state = AppState;
  const data = Storage.getMonthData(state.currentYear, state.currentMonth);
  const emp = data.employees.find(e => e.id === empId);
  if (!emp) return;

  const month = state.currentMonth;
  const year = state.currentYear;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const workingDaysTotal = Calculator.countWorkingDays(year, month);

  let selectedDays = [...(emp.vacationDays || [])];

  function renderCalendar() {
    const vacWorking = Calculator.countVacationWorkingDays(year, month, selectedDays);
    const actualWorking = workingDaysTotal - vacWorking;

    let html = `<h3>🏖️ Отпуск: ${emp.firstName} ${emp.lastName}</h3>
      <p><strong>${CONFIG.MONTHS[month]} ${year}</strong></p>
      <p>Рабочие дни: <strong>${actualWorking}/${workingDaysTotal}</strong></p>
      <div class="calendar-grid">
        <div class="calendar-day disabled">Вс</div><div class="calendar-day disabled">Пн</div><div class="calendar-day disabled">Вт</div><div class="calendar-day disabled">Ср</div><div class="calendar-day disabled">Чт</div><div class="calendar-day disabled">Пт</div><div class="calendar-day disabled">Сб</div>`;

    for (let i = 0; i < startPadding; i++) {
      html += `<div class="calendar-day disabled"></div>`;
    }

    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      const isVacation = selectedDays.includes(day);

      let classes = 'calendar-day';
      if (isWeekend) classes += ' weekend';
      if (isToday) classes += ' today';
      if (isVacation) classes += ' vacation';

      html += `<div class="${classes}" data-day="${day}">${day}</div>`;
    }
    html += `</div>`;

    // Форматирование выбранных дней
    const ranges = formatVacationRanges(selectedDays);
    html += `<p><strong>Выбрано:</strong> ${ranges || 'нет дней'}</p>`;
    html += `<div style="display:flex;gap:0.5rem"><button class="btn btn-primary" id="saveVacation">Сохранить</button><button class="btn btn-secondary" id="cancelVacation">Отмена</button></div>`;

    return html;
  }

  function formatVacationRanges(days) {
    if (!days.length) return '';
    const sorted = [...days].sort((a,b) => a - b);
    const ranges = [];
    let start = sorted[0], end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1 || (sorted[i] === end + 3 && isWeekend(end+1))) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${String(start).padStart(2,'0')}.${String(month+1).padStart(2,'0')}` : `${String(start).padStart(2,'0')}.${String(month+1).padStart(2,'0')}-${String(end).padStart(2,'0')}.${String(month+1).padStart(2,'0')}`);
        start = end = sorted[i];
      }
    }
    ranges.push(start === end ? `${String(start).padStart(2,'0')}.${String(month+1).padStart(2,'0')}` : `${String(start).padStart(2,'0')}.${String(month+1).padStart(2,'0')}-${String(end).padStart(2,'0')}.${String(month+1).padStart(2,'0')}`);
    return ranges.join(', ');
  }

  function isWeekend(day) {
    const d = new Date(year, month, day);
    return d.getDay() === 0 || d.getDay() === 6;
  }

  showModal(renderCalendar(), () => {
    // Клик по дням
    document.querySelectorAll('.calendar-day[data-day]').forEach(cell => {
      cell.addEventListener('click', () => {
        const day = parseInt(cell.dataset.day);
        if (selectedDays.includes(day)) {
          selectedDays = selectedDays.filter(d => d !== day);
        } else {
          selectedDays.push(day);
        }
        // Перерисовать
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.innerHTML = `<div class="modal-header"><button class="modal-close" id="modalCloseBtn">×</button></div><div class="modal-body">${renderCalendar()}</div>`;
        document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
        setupCalendarHandlers();
      });
    });

    setupCalendarHandlers();
  });

  function setupCalendarHandlers() {
    document.getElementById('saveVacation')?.addEventListener('click', () => {
      emp.vacationDays = selectedDays;
      Storage.saveMonthData(state.currentYear, state.currentMonth, data);
      closeModal();
      renderProjects();
      renderEmployees();
    });
    document.getElementById('cancelVacation')?.addEventListener('click', closeModal);
    document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
  }
}