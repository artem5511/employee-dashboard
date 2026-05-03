export function initTables() {
  console.log("Tables module loaded");
}

export function renderProjects() {
  const tbody = document.getElementById('projectsBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6">Нет данных</td></tr>';
  }
}

export function renderEmployees() {
  const tbody = document.getElementById('employeesBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="9">Нет данных</td></tr>';
  }
}