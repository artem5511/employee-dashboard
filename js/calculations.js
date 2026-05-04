import { CONFIG } from './config.js';

export const Calculator = {
  countWorkingDays(year, month) {
    const date = new Date(year, month, 1);
    let count = 0;
    while (date.getMonth() === month) {
      const day = date.getDay();
      if (day !== 0 && day !== 6) count++;
      date.setDate(date.getDate() + 1);
    }
    return count;
  },

  countVacationWorkingDays(year, month, vacationDays) {
    return vacationDays.filter(day => {
      const d = new Date(year, month, day);
      const wd = d.getDay();
      return wd !== 0 && wd !== 6;
    }).length;
  },

  getVacationCoefficient(year, month, vacationDays) {
    const working = this.countWorkingDays(year, month);
    if (working === 0) return 1;
    const vacWorking = this.countVacationWorkingDays(year, month, vacationDays);
    return (working - vacWorking) / working;
  },

  getEffectiveCapacity(assignedCapacity, fit, vacationCoeff) {
    return parseFloat((assignedCapacity * fit * vacationCoeff).toFixed(3));
  },

  calculateProjectRevenue(project, employees, year, month) {
    let usedEffective = 0;
    const byEmployee = {};

    project.assignments?.forEach(assignment => {
      const emp = employees.find(e => e.id === assignment.employeeId);
      if (!emp) return;
      const vacCoeff = this.getVacationCoefficient(year, month, emp.vacationDays || []);
      const effCap = this.getEffectiveCapacity(assignment.capacity, assignment.fit, vacCoeff);
      usedEffective += effCap;
      byEmployee[emp.id] = { effectiveCap: effCap, assignment };
    });

    const capForRevenue = Math.max(project.capacity, usedEffective);
    const revPerUnit = project.budget / capForRevenue;

    const revenues = {};
    project.assignments?.forEach(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      if (emp && byEmployee[emp.id]) {
        revenues[emp.id] = revPerUnit * byEmployee[emp.id].effectiveCap;
      }
    });

    return { total: revPerUnit * usedEffective, byEmployee, usedEffectiveCapacity: usedEffective, revenuePerUnit: revPerUnit };
  },

  calculateEmployeeCost(salary, assignedCapacity) {
    return salary * Math.max(CONFIG.MIN_SALARY_SHARE, assignedCapacity);
  },

  calculateProjectCosts(project, employees) {
    let total = 0;
    const byEmployee = {};
    project.assignments?.forEach(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      if (emp) {
        const cost = this.calculateEmployeeCost(emp.salary, a.capacity);
        byEmployee[emp.id] = cost;
        total += cost;
      }
    });
    return { total, byEmployee };
  },

  calculateProjectProfit(project, employees, year, month) {
    const rev = this.calculateProjectRevenue(project, employees, year, month);
    const costs = this.calculateProjectCosts(project, employees);
    return rev.total - costs.total;
  },

  calculateEmployeeProfit(employee, projects, year, month) {
    let profit = 0;
    employee.assignments?.forEach(a => {
      const proj = projects.find(p => p.id === a.projectId);
      if (!proj) return;
      const vacCoeff = this.getVacationCoefficient(year, month, employee.vacationDays || []);
      const effCap = this.getEffectiveCapacity(a.capacity, a.fit, vacCoeff);
      const revData = this.calculateProjectRevenue(proj, [employee], year, month);
      const revenue = revData.byEmployee[employee.id] || 0;
      const cost = this.calculateEmployeeCost(employee.salary, a.capacity);
      profit += revenue - cost;
    });
    return profit;
  },

  calculateEmployeePayment(employee) {
    if (!employee.assignments?.length) return employee.salary * CONFIG.MIN_SALARY_SHARE;
    return employee.assignments.reduce((sum, a) => sum + this.calculateEmployeeCost(employee.salary, a.capacity), 0);
  },

  calculateTotalForecastedProfit(projects, employees, year, month) {
    let total = 0;
    projects.forEach(p => total += this.calculateProjectProfit(p, employees, year, month));
    employees.forEach(emp => {
      if (!emp.assignments?.length) total -= emp.salary * CONFIG.MIN_SALARY_SHARE;
    });
    return total;
  }
};