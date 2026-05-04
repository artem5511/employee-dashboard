// js/seed.js
import { Storage } from './storage.js';
import { CONFIG } from './config.js';
import { showModal, closeModal } from './ui/modals.js';

const NAMES = ['Иван','Анна','Сергей','Мария','Дмитрий','Елена','Алексей','Ольга','Михаил','Татьяна'];
const SURNAMES = ['Иванов','Петров','Сидоров','Смирнов','Кузнецов','Попов','Соколов','Михайлов','Новиков','Федоров'];
const POSITIONS = CONFIG.POSITIONS;
const COMPANIES = ['TechCorp','GlobalSoft','InnoSystem','DataFlow','CloudNet','AlphaDev'];
const PROJECTS = ['Mobile App','CRM System','AI Chatbot','Payment Gateway','Analytics','Security'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Получаем AppState из глобального окна
const getAppState = () => window.AppState || { currentYear: 2026, currentMonth: 0 };

export const SeedData = {
  generateEmployee() {
    const year = new Date().getFullYear() - rand(20, 40);
    return {
      id: Storage.generateId('emp'),
      firstName: randItem(NAMES),
      lastName: randItem(SURNAMES),
      birthDate: `${year}-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`,
      position: randItem(POSITIONS),
      salary: rand(1500, 5000),
      assignments: [],
      vacationDays: []
    };
  },

  generateProject() {
    return {
      id: Storage.generateId('proj'),
      name: randItem(PROJECTS),
      company: randItem(COMPANIES),
      budget: rand(10000, 100000),
      capacity: rand(2, 5),
      assignments: []
    };
  },

  seedMonth(year, month) {
    const employees = Array.from({length: 5}, () => this.generateEmployee());
    const projects = Array.from({length: 3}, () => this.generateProject());

    // Случайные назначения
    projects.forEach(proj => {
      const count = rand(1, Math.min(3, employees.length));
      for (let i = 0; i < count; i++) {
        const emp = employees[rand(0, employees.length - 1)];
        const currentLoad = emp.assignments.reduce((s, a) => s + a.capacity, 0);
        if (!emp.assignments.find(a => a.projectId === proj.id) && currentLoad < 1.5) {
          const cap = Math.min(0.5, 1.5 - currentLoad);
          proj.assignments.push({ employeeId: emp.id, capacity: cap, fit: rand(7,10)/10 });
          emp.assignments.push({ projectId: proj.id, capacity: cap, fit: rand(7,10)/10 });
        }
      }
    });

    Storage.saveMonthData(year, month, { employees, projects });
  },

  showSeedModal() {
    // ИСПОЛЬЗУЕМ window.AppState вместо AppState
    const state = getAppState();
    const allData = Storage.getAllData();
    const currentKey = `${state.currentYear}-${state.currentMonth}`;
    const months = Object.keys(allData).filter(k => k !== currentKey);

    if (months.length === 0) {
      if (confirm('Нет данных для копирования. Сгенерировать случайные данные для текущего месяца?')) {
        this.seedMonth(state.currentYear, state.currentMonth);
        location.reload();
      }
      return;
    }

    let html = '<h3>🌱 Данные посева</h3><p>Выберите месяц для копирования:</p>';
    months.forEach(key => {
      const [y, m] = key.split('-').map(Number);
      const data = allData[key];
      html += `<div style="padding:0.5rem;border:1px solid var(--border);border-radius:4px;margin:0.5rem 0;display:flex;justify-content:space-between;align-items:center">
        <span><strong>${CONFIG.MONTHS[m]} ${y}</strong><br><small>👥 ${data.employees.length} сотрудников | 📁 ${data.projects.length} проектов</small></span>
        <button class="btn btn-primary btn-sm" data-key="${key}">Копировать</button>
      </div>`;
    });

    html += '<div style="margin-top:1rem;padding:0.5rem;background:#f0f9ff;border-radius:4px"><strong>💡 Или:</strong> <button class="btn btn-secondary btn-sm" id="generateNew">Сгенерировать новые данные</button></div>';

    showModal(html, () => {
      document.querySelectorAll('.modal button[data-key]').forEach(btn => {
        btn.addEventListener('click', () => {
          const [y, m] = btn.dataset.key.split('-').map(Number);
          if (confirm(`Скопировать данные из ${CONFIG.MONTHS[m]} ${y}?`)) {
            Storage.copyMonthData(y, m, state.currentYear, state.currentMonth);
            closeModal();
            location.reload();
          }
        });
      });

      document.getElementById('generateNew')?.addEventListener('click', () => {
        if (confirm('Сгенерировать 5 сотрудников и 3 проекта?')) {
          this.seedMonth(state.currentYear, state.currentMonth);
          closeModal();
          location.reload();
        }
      });
    });
  }
};