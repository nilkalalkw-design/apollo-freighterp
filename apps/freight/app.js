const STORAGE_KEY = "transport-fleet-app";
const SESSION_KEY = "transport-fleet-session";

const seedAdminId = crypto.randomUUID();
const seedVehicleId = crypto.randomUUID();

const defaultData = {
  users: [
    {
      id: seedAdminId,
      name: "System Administrator",
      username: "admin",
      password: "admin123",
      role: "admin"
    }
  ],
  vehicles: [
    {
      id: seedVehicleId,
      name: "Truck 12",
      plate: "KWT-4821",
      type: "Truck",
      driver: "Ahmed Nasser",
      route: "Kuwait City - Jahra",
      status: "Active"
    }
  ],
  expenses: [
    {
      id: crypto.randomUUID(),
      vehicleId: seedVehicleId,
      type: "Fuel",
      amount: 85.5,
      currency: "KWD",
      date: new Date().toISOString().slice(0, 10),
      notes: "Initial sample fuel expense"
    }
  ]
};

const els = {
  authScreen: document.getElementById("authScreen"),
  dashboardScreen: document.getElementById("dashboardScreen"),
  loginForm: document.getElementById("loginForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginMessage: document.getElementById("loginMessage"),
  logoutBtn: document.getElementById("logoutBtn"),
  currentUserName: document.getElementById("currentUserName"),
  currentUserRole: document.getElementById("currentUserRole"),
  userManagementPanel: document.getElementById("userManagementPanel"),
  userForm: document.getElementById("userForm"),
  userList: document.getElementById("userList"),
  userSubmitBtn: document.getElementById("userSubmitBtn"),
  userSearch: document.getElementById("userSearch"),
  vehicleForm: document.getElementById("vehicleForm"),
  expenseForm: document.getElementById("expenseForm"),
  vehicleList: document.getElementById("vehicleList"),
  expenseList: document.getElementById("expenseList"),
  vehicleSubmitBtn: document.getElementById("vehicleSubmitBtn"),
  expenseSubmitBtn: document.getElementById("expenseSubmitBtn"),
  vehicleSearch: document.getElementById("vehicleSearch"),
  expenseSearch: document.getElementById("expenseSearch"),
  expenseVehicle: document.getElementById("expenseVehicle"),
  expenseCurrency: document.getElementById("expenseCurrency"),
  vehicleCount: document.getElementById("vehicleCount"),
  expenseTotal: document.getElementById("expenseTotal"),
  monthlyTotal: document.getElementById("monthlyTotal"),
  activeVehicleCount: document.getElementById("activeVehicleCount"),
  expenseDate: document.getElementById("expenseDate")
};

let state = loadState();
let currentUser = loadSession();
let editingUserId = null;
let editingVehicleId = null;
let editingExpenseId = null;

initialize();

function initialize() {
  els.expenseDate.value = new Date().toISOString().slice(0, 10);

  els.loginForm.addEventListener("submit", handleLogin);
  els.logoutBtn.addEventListener("click", logout);
  els.userForm.addEventListener("submit", handleUserSubmit);
  els.vehicleForm.addEventListener("submit", handleVehicleSubmit);
  els.expenseForm.addEventListener("submit", handleExpenseSubmit);
  els.userSearch.addEventListener("input", renderUsers);
  els.vehicleSearch.addEventListener("input", renderVehicles);
  els.expenseSearch.addEventListener("input", renderExpenses);

  renderApp();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.users && saved?.vehicles && saved?.expenses) {
      return {
        users: saved.users,
        vehicles: saved.vehicles,
        expenses: saved.expenses.map((expense) => ({
          currency: "KWD",
          ...expense
        }))
      };
    }
  } catch (error) {
    console.warn("Failed to load saved data", error);
  }

  return structuredClone(defaultData);
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadSession() {
  try {
    const savedSession = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!savedSession?.userId) {
      return null;
    }

    return state.users.find((user) => user.id === savedSession.userId) || null;
  } catch (error) {
    console.warn("Failed to load session", error);
    return null;
  }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function handleLogin(event) {
  event.preventDefault();

  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value;
  const user = state.users.find((item) => item.username === username && item.password === password);

  if (!user) {
    els.loginMessage.textContent = "Invalid username or password.";
    return;
  }

  currentUser = user;
  saveSession(user);
  els.loginForm.reset();
  els.loginMessage.textContent = "";
  renderApp();
}

function logout() {
  currentUser = null;
  clearSession();
  renderApp();
}

function handleUserSubmit(event) {
  event.preventDefault();

  if (!isAdmin()) {
    return;
  }

  const username = document.getElementById("newUsername").value.trim();
  if (state.users.some((user) => user.username.toLowerCase() === username.toLowerCase() && user.id !== editingUserId)) {
    alert("Username already exists.");
    return;
  }

  const password = document.getElementById("newUserPassword").value;

  if (editingUserId) {
    const user = state.users.find((item) => item.id === editingUserId);
    if (!user) return;

    user.name = document.getElementById("newUserName").value.trim();
    user.username = username;
    user.role = document.getElementById("newUserRole").value;
    if (password) {
      user.password = password;
    }
  } else {
    const user = {
      id: crypto.randomUUID(),
      name: document.getElementById("newUserName").value.trim(),
      username,
      password,
      role: document.getElementById("newUserRole").value
    };

    state.users.unshift(user);
  }

  persistState();
  resetUserForm();
  renderDashboard();
}

function handleVehicleSubmit(event) {
  event.preventDefault();
  if (!currentUser) {
    return;
  }

  if (editingVehicleId) {
    const vehicle = state.vehicles.find((item) => item.id === editingVehicleId);
    if (!vehicle) return;

    vehicle.name = document.getElementById("vehicleName").value.trim();
    vehicle.plate = document.getElementById("plateNumber").value.trim();
    vehicle.type = document.getElementById("vehicleType").value;
    vehicle.driver = document.getElementById("driverName").value.trim();
    vehicle.route = document.getElementById("routeName").value.trim();
    vehicle.status = document.getElementById("vehicleStatus").value;
  } else {
    const vehicle = {
      id: crypto.randomUUID(),
      name: document.getElementById("vehicleName").value.trim(),
      plate: document.getElementById("plateNumber").value.trim(),
      type: document.getElementById("vehicleType").value,
      driver: document.getElementById("driverName").value.trim(),
      route: document.getElementById("routeName").value.trim(),
      status: document.getElementById("vehicleStatus").value
    };

    state.vehicles.unshift(vehicle);
  }

  persistState();
  resetVehicleForm();
  renderDashboard();
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  if (!currentUser) {
    return;
  }

  if (editingExpenseId) {
    const expense = state.expenses.find((item) => item.id === editingExpenseId);
    if (!expense) return;

    expense.vehicleId = els.expenseVehicle.value;
    expense.type = document.getElementById("expenseType").value;
    expense.amount = Number(document.getElementById("expenseAmount").value);
    expense.currency = els.expenseCurrency.value;
    expense.date = document.getElementById("expenseDate").value;
    expense.notes = document.getElementById("expenseNotes").value.trim();
  } else {
    const expense = {
      id: crypto.randomUUID(),
      vehicleId: els.expenseVehicle.value,
      type: document.getElementById("expenseType").value,
      amount: Number(document.getElementById("expenseAmount").value),
      currency: els.expenseCurrency.value,
      date: document.getElementById("expenseDate").value,
      notes: document.getElementById("expenseNotes").value.trim()
    };

    state.expenses.unshift(expense);
  }

  persistState();
  resetExpenseForm();
  renderDashboard();
}

function renderApp() {
  const loggedIn = Boolean(currentUser);

  els.authScreen.classList.toggle("hidden", loggedIn);
  els.dashboardScreen.classList.toggle("hidden", !loggedIn);

  if (!loggedIn) {
    return;
  }

  els.currentUserName.textContent = currentUser.name;
  els.currentUserRole.textContent = currentUser.role === "admin" ? "Administrator" : "Staff User";
  els.userManagementPanel.classList.toggle("hidden", !isAdmin());

  renderDashboard();
}

function renderDashboard() {
  renderVehicleOptions();
  renderStats();
  renderVehicles();
  renderExpenses();
  renderUsers();
}

function renderVehicleOptions() {
  const options = state.vehicles.map((vehicle) => (
    `<option value="${vehicle.id}">${vehicle.name} - ${vehicle.plate}</option>`
  )).join("");

  els.expenseVehicle.innerHTML = `<option value="">Select vehicle</option>${options}`;
}

function renderStats() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const expenseTotals = sumByCurrency(state.expenses);
  const monthlyTotals = sumByCurrency(state.expenses.filter((item) => item.date.startsWith(currentMonth)));
  const activeVehicles = state.vehicles.filter((vehicle) => vehicle.status === "Active").length;

  els.vehicleCount.textContent = state.vehicles.length;
  els.expenseTotal.textContent = formatCurrencySummary(expenseTotals);
  els.monthlyTotal.textContent = formatCurrencySummary(monthlyTotals);
  els.activeVehicleCount.textContent = activeVehicles;
}

function renderVehicles() {
  const query = els.vehicleSearch.value.trim().toLowerCase();
  const filteredVehicles = state.vehicles.filter((vehicle) => {
    if (!query) return true;
    return (
      vehicle.name.toLowerCase().includes(query) ||
      vehicle.plate.toLowerCase().includes(query)
    );
  });

  if (!filteredVehicles.length) {
    els.vehicleList.className = "card-list empty-state";
    els.vehicleList.textContent = query ? "No vehicles found." : "No vehicles added yet.";
    return;
  }

  els.vehicleList.className = "card-list";
  els.vehicleList.innerHTML = filteredVehicles.map((vehicle) => `
    <article class="item-card">
      <h3>${vehicle.name}</h3>
      <div class="item-meta">
        <span><strong>Plate:</strong> ${vehicle.plate}</span>
        <span><strong>Type:</strong> ${vehicle.type}</span>
        <span><strong>Driver:</strong> ${vehicle.driver || "Not assigned"}</span>
        <span><strong>Route:</strong> ${vehicle.route || "Not assigned"}</span>
      </div>
      <span class="badge ${getStatusClass(vehicle.status)}">${vehicle.status}</span>
      <div class="card-actions">
        <button type="button" class="action-btn" onclick="editVehicle('${vehicle.id}')">Edit</button>
      </div>
    </article>
  `).join("");
}

function renderExpenses() {
  const query = els.expenseSearch.value.trim().toLowerCase();
  const filteredExpenses = state.expenses.filter((expense) => {
    const vehicle = state.vehicles.find((item) => item.id === expense.vehicleId);
    const vehicleText = vehicle ? `${vehicle.name} ${vehicle.plate}`.toLowerCase() : "";
    const notesText = (expense.notes || "").toLowerCase();

    if (!query) return true;
    return (
      expense.type.toLowerCase().includes(query) ||
      vehicleText.includes(query) ||
      notesText.includes(query) ||
      expense.date.includes(query)
    );
  });

  if (!filteredExpenses.length) {
    els.expenseList.className = "card-list empty-state";
    els.expenseList.textContent = query ? "No expense history found." : "No expenses recorded yet.";
    return;
  }

  els.expenseList.className = "card-list";
  els.expenseList.innerHTML = filteredExpenses.map((expense) => {
    const vehicle = state.vehicles.find((item) => item.id === expense.vehicleId);

    return `
      <article class="item-card">
        <h3>${expense.type}</h3>
        <div class="item-meta">
          <span><strong>Vehicle:</strong> ${vehicle ? `${vehicle.name} (${vehicle.plate})` : "Unknown vehicle"}</span>
          <span><strong>Date:</strong> ${expense.date}</span>
          <span><strong>Currency:</strong> ${expense.currency || "KWD"}</span>
          <span><strong>Notes:</strong> ${expense.notes || "No notes provided"}</span>
        </div>
        <p class="expense-amount">${formatCurrency(expense.amount, expense.currency || "KWD")}</p>
        <div class="card-actions">
          <button type="button" class="action-btn" onclick="editExpense('${expense.id}')">Edit</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderUsers() {
  if (!isAdmin()) {
    return;
  }

  const query = els.userSearch.value.trim().toLowerCase();
  const filteredUsers = state.users.filter((user) => {
    if (!query) return true;
    return (
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  });

  if (!filteredUsers.length) {
    els.userList.className = "card-list empty-state";
    els.userList.textContent = "No users found.";
    return;
  }

  els.userList.className = "card-list";
  els.userList.innerHTML = filteredUsers.map((user) => `
    <article class="item-card">
      <h3>${user.name}</h3>
      <div class="item-meta">
        <span><strong>Username:</strong> ${user.username}</span>
        <span><strong>Role:</strong> <span class="user-role">${user.role}</span></span>
      </div>
      <div class="card-actions">
        <button type="button" class="action-btn" onclick="editUser('${user.id}')">Edit</button>
        <button type="button" class="action-btn" onclick="changeUserPassword('${user.id}')">Change Password</button>
      </div>
    </article>
  `).join("");
}

function resetUserForm() {
  editingUserId = null;
  els.userForm.reset();
  document.getElementById("newUserRole").value = "staff";
  els.userSubmitBtn.textContent = "Create User";
  document.getElementById("newUserPassword").placeholder = "Create password";
}

function resetVehicleForm() {
  editingVehicleId = null;
  els.vehicleForm.reset();
  document.getElementById("vehicleStatus").value = "Active";
  els.vehicleSubmitBtn.textContent = "Save Vehicle";
}

function resetExpenseForm() {
  editingExpenseId = null;
  els.expenseForm.reset();
  els.expenseDate.value = new Date().toISOString().slice(0, 10);
  els.expenseCurrency.value = "KWD";
  els.expenseSubmitBtn.textContent = "Save Expense";
}

function editUser(userId) {
  if (!isAdmin()) return;
  const user = state.users.find((item) => item.id === userId);
  if (!user) return;

  editingUserId = userId;
  document.getElementById("newUserName").value = user.name;
  document.getElementById("newUsername").value = user.username;
  document.getElementById("newUserPassword").value = "";
  document.getElementById("newUserPassword").placeholder = "Leave blank to keep current password";
  document.getElementById("newUserRole").value = user.role;
  els.userSubmitBtn.textContent = "Update User";
}

function changeUserPassword(userId) {
  if (!isAdmin()) return;
  const user = state.users.find((item) => item.id === userId);
  if (!user) return;

  const newPassword = prompt(`Enter a new password for ${user.username}`);
  if (!newPassword) return;

  user.password = newPassword;
  persistState();
  if (currentUser?.id === user.id) {
    currentUser = user;
    saveSession(user);
  }
  renderUsers();
}

function editVehicle(vehicleId) {
  const vehicle = state.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) return;

  editingVehicleId = vehicleId;
  document.getElementById("vehicleName").value = vehicle.name;
  document.getElementById("plateNumber").value = vehicle.plate;
  document.getElementById("vehicleType").value = vehicle.type;
  document.getElementById("driverName").value = vehicle.driver;
  document.getElementById("routeName").value = vehicle.route;
  document.getElementById("vehicleStatus").value = vehicle.status;
  els.vehicleSubmitBtn.textContent = "Update Vehicle";
}

function editExpense(expenseId) {
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) return;

  editingExpenseId = expenseId;
  els.expenseVehicle.value = expense.vehicleId;
  document.getElementById("expenseType").value = expense.type;
  document.getElementById("expenseAmount").value = expense.amount;
  els.expenseCurrency.value = expense.currency || "KWD";
  document.getElementById("expenseDate").value = expense.date;
  document.getElementById("expenseNotes").value = expense.notes;
  els.expenseSubmitBtn.textContent = "Update Expense";
}

window.editUser = editUser;
window.changeUserPassword = changeUserPassword;
window.editVehicle = editVehicle;
window.editExpense = editExpense;

function isAdmin() {
  return currentUser?.role === "admin";
}

function getStatusClass(status) {
  if (status === "Active") return "active";
  if (status === "In Maintenance") return "maintenance";
  return "inactive";
}

function sumByCurrency(items) {
  return items.reduce((totals, item) => {
    const currency = item.currency || "KWD";
    totals[currency] = (totals[currency] || 0) + Number(item.amount || 0);
    return totals;
  }, {});
}

function formatCurrencySummary(totals) {
  const currencies = ["KWD", "AED"];
  return currencies
    .filter((currency) => totals[currency] !== undefined)
    .map((currency) => formatCurrency(totals[currency], currency))
    .join(" | ") || "KWD 0.000";
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(value);
}
