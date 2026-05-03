// js/config.js

export const CONFIG = {
  STORAGE_KEY: 'monthlyData',
  YEARS: [2025, 2026, 2027],
  MONTHS: [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ],
  POSITIONS: [
    'Junior', 'Middle', 'Senior', 'Lead', 'Architect', 'Business Manager'
  ],
  CAPACITY: {
    MIN: 0,
    MAX: 1.5,
    STEP: 0.1
  },
  FIT: {
    MIN: 0,
    MAX: 1,
    STEP: 0.1
  },
  MIN_SALARY_SHARE: 0.5, // Минимальная оплата при простое
  MIN_AGE: 18
};

export const DEFAULT_DATA = {
  '2026-0': { // Январь 2026
    employees: [
      {
        id: 'emp-1',
        firstName: 'Иван',
        lastName: 'Иванов',
        birthDate: '1990-05-15',
        position: 'Senior',
        salary: 3000,
        assignments: [],
        vacationDays: []
      }
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'Mobile App',
        company: 'TechCorp',
        budget: 50000,
        capacity: 3,
        assignments: []
      }
    ]
  }
};