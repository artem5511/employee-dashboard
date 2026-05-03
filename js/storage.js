// js/storage.js
import { CONFIG, DEFAULT_DATA } from './config.js';

export const Storage = {
  getKey() {
    return CONFIG.STORAGE_KEY;
  },

  getMonthKey(year, month) {
    return `${year}-${month}`;
  },

  getAllData() {
    const data = localStorage.getItem(this.getKey());
    return data ? JSON.parse(data) : {};
  },

  saveAllData(data) {
    localStorage.setItem(this.getKey(), JSON.stringify(data));
  },

  getMonthData(year, month) {
    const allData = this.getAllData();
    const key = this.getMonthKey(year, month);
    return allData[key] || { employees: [], projects: [] };
  },

  saveMonthData(year, month, data) {
    const allData = this.getAllData();
    const key = this.getMonthKey(year, month);
    allData[key] = {
      employees: data.employees || [],
      projects: data.projects || []
    };
    this.saveAllData(allData);
  },

  copyMonthData(fromYear, fromMonth, toYear, toMonth) {
    const fromData = this.getMonthData(fromYear, fromMonth);
    // Копируем с новыми ID и сбрасываем отпуска
    const employees = fromData.employees.map(emp => ({
      ...emp,
      id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vacationDays: [],
      assignments: emp.assignments.map(a => ({ ...a }))
    }));
    const projects = fromData.projects.map(proj => ({
      ...proj,
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assignments: proj.assignments.map(a => ({ ...a }))
    }));
    this.saveMonthData(toYear, toMonth, { employees, projects });
  },

  generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  init() {
    if (!localStorage.getItem(this.getKey())) {
      this.saveAllData(DEFAULT_DATA);
    }
  }
};