// js/calculations.js
import { CONFIG } from './config.js';

export const Calculator = {
  // Подсчет рабочих дней в месяце
  countWorkingDays(year, month) {
    const date = new Date(year, month, 1);
    let workingDays = 0;
    while (date.getMonth() === month) {
      const day = date.getDay();
      if (day !== 0 && day !== 6) workingDays++;
      date.setDate(date.getDate() + 1);
    }
    return workingDays;
  },

  // Подсчет дней отпуска, попадающих на рабочие дни
  countVacationWorkingDays(year, month, vacationDays) {
    return vacationDays.filter(day => {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    }).length;
  },

  // Коэффициент отпуска
  getVacationCoefficient(year, month, vacationDays) {
    const workingDays = this.countWorkingDays(year, month);
    if (workingDays === 0) return 1;
    const vacationWorkingDays = this.countVacationWorkingDays(year, month, vacationDays);
    return (workingDays - vacationWorkingDays) / workingDays;
  },

  // Эффективная мощность сотрудника
  getEffectiveCapacity(assignedCapacity, fit, vacationCoefficient) {
    return parseFloat((assignedCapacity * fit * vacationCoefficient).toFixed(3));
  },

  // Расчет выручки проекта
  calculateProjectRevenue(project, employees, year, month) {
    const assignments = project.assignments || [];

    // Сумма эффективных мощностей
    let usedEffectiveCapacity = 0;
    const employeeData = {};

    assignments.forEach(assignment => {
      const emp = employees.find(e => e.id === assignment.employeeId);
      if (!emp) return;

      const vacationCoeff = this.getVacationCoefficient(year, month, emp.vacationDays || []);
      const effectiveCap = this.getEffectiveCapacity(
        assignment.capacity,
        assignment.fit,
        vacationCoeff
      );

      usedEffectiveCapacity += effectiveCap;
      employeeData[emp.id] = { effectiveCap, assignment };
    });

    const capacityForRevenue = Math.max(project.capacity, usedEffectiveCapacity);
    const revenuePerUnit = project.budget / capacityForRevenue;

    // Выручка по каждому сотруднику
    const revenues = {};
    assignments.forEach(assignment => {
      const emp = employees.find(e => e.id === assignment.employeeId);
      if (!emp) return;
      const data = employeeData[emp.id];
      revenues[emp.id] = revenuePerUnit * data.effectiveCap;
    });

    return {
      total: revenuePerUnit * usedEffectiveCapacity,
      byEmployee: revenues,
      usedEffectiveCapacity,
      revenuePerUnit
    };
  },

  // Расчет затрат на сотрудника
  calculateEmployeeCost(salary, assignedCapacity) {
    return salary * Math.max(CONFIG.MIN_SALARY_SHARE, assignedCapacity);
  },

  // Расчет затрат проекта
  calculateProjectCosts(project, employees) {
    let totalCosts = 0;
    const costsByEmployee = {};

    project.assignments?.forEach(assignment => {
      const emp = employees.find(e => e.id === assignment.employeeId);
      if (!emp) return;

      const cost = this.calculateEmployeeCost(emp.salary, assignment.capacity);
      costsByEmployee[emp.id] = cost;
      totalCosts += cost;
    });

    return { total: totalCosts, byEmployee: costsByEmployee };
  },

  // Прибыль проекта
  calculateProjectProfit(project, employees, year, month) {
    const revenue = this.calculateProjectRevenue(project, employees, year, month);
    const costs = this.calculateProjectCosts(project, employees);
    return revenue.total - costs.total;
  },

  // Прогнозируемый доход сотрудника
  calculateEmployeeProfit(employee, projects, year, month) {
    let totalProfit = 0;

    employee.assignments?.forEach(assignment => {
      const project = projects.find(p => p.id === assignment.projectId);
      if (!project) return;

      const vacationCoeff = this.getVacationCoefficient(year, month, employee.vacationDays || []);
      const effectiveCap = this.getEffectiveCapacity(
        assignment.capacity,
        assignment.fit,
        vacationCoeff
      );

      const projectRevenue = this.calculateProjectRevenue(project, [employee], year, month);
      const revenue = projectRevenue.byEmployee[employee.id] || 0;
      const cost = this.calculateEmployeeCost(employee.salary, assignment.capacity);

      totalProfit += revenue - cost;
    });

    return totalProfit;
  },

  // Прогнозируемая выплата сотруднику
  calculateEmployeePayment(employee) {
    if (!employee.assignments?.length) {
      return employee.salary * CONFIG.MIN_SALARY_SHARE;
    }

    return employee.assignments.reduce((sum, assignment) => {
      return sum + this.calculateEmployeeCost(employee.salary, assignment.capacity);
    }, 0);
  },

  // Общая прогнозируемая прибыль (все проекты)
  calculateTotalForecastedProfit(projects, employees, year, month) {
    let totalProfit = 0;

    projects.forEach(project => {
      totalProfit += this.calculateProjectProfit(project, employees, year, month);
    });

    // Вычитаем надбавки за простой незакрепленных сотрудников
    employees.forEach(emp => {
      if (!emp.assignments?.length) {
        totalProfit -= emp.salary * CONFIG.MIN_SALARY_SHARE;
      }
    });

    return totalProfit;
  }
};