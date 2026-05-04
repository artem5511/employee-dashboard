import { Storage } from './storage.js';
import { CONFIG } from './config.js';
import { showModal } from './ui/modals.js';

const NAMES = ['Иван','Анна','Сергей','Мария','Дмитрий','Елена','Алексей','Ольга','Михаил','Татьяна'];
const SURNAMES = ['Иванов','Петров','Сидоров','Смирнов','Кузнецов','Попов','Соколов','Михайлов','Новиков','Федоров'];
const POSITIONS = CONFIG.POSITIONS;
const COMPANIES = ['TechCorp','GlobalSoft','InnoSystem','DataFlow','CloudNet','AlphaDev'];
const PROJECTS = ['Mobile App','CRM System','AI Chatbot','Payment Gateway','Analytics','Security'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
        if (!emp.assignments.find(a => a.projectId === proj.id) &&
            emp.assignments.reduce((s,a) => s + a.capacity, 0) < 1.5) {
          const cap = Math.min(0.5, 1.5 - emp.assignments.reduce((s,a) => s + a.capacity, 0));
          proj.assignments.push({ employeeId: emp.id, capacity: cap, fit: rand(7,10)/10 });
          emp.assignments.push({ projectId: proj.id, capacity: cap, fit: rand(7,10)/10 });
        }
      }
    });

    Storage.saveMonthData(year, month, { employees, projects });
  },

  showSeedModal() {
    const allData = Storage.getAllData();
    const months = Object.keys(allData).filter(k => k !== `${AppState.currentYear}-${AppState.currentMonth}`);

    if (months.length === 0) {
      alert('Нет других месяцев с данными для копирования');
      return;
    }

    let html = '<h3>🌱 Данные посева</h3><p>Выберите месяц для копирования:</p>';
    months.forEach(key => {
      const [y, m] = key.split('-').map(Number);
      const data = allData[key];
      html += `<div style="padding:0.5rem;border:1px solid var(--border);border-radius:4px;margin:0.5rem 0;display:flex;justify-content:space-between;align-items:center">
        <span><strong>${CONFIG.MONTHS[m]} ${y}</strong><br><small>👥 ${data.employees.length} | 📁 ${data.projects.length}</small></span>
        <button class="btn btn-primary btn-sm" data-key="${key}">Посев</button>
      </div>`;
    });

    showModal(html, () => {
      document.querySelectorAll('.modal button[data-key]').forEach(btn => {
        btn.addEventListener('click', () => {
          const [y, m] = btn.dataset.key.split('-').map(Number);
          if (confirm(`Скопировать данные из ${CONFIG.MONTHS[m]} ${y} в текущий месяц?`)) {
            Storage.copyMonthData(y, m, AppState.currentYear, AppState.currentMonth);
            location.reload();
          }
        });
      });
    });
  }
};