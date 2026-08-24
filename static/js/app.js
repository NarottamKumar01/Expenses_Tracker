/* app.js – Main application logic */

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let state = {
  categories: [],
  incomeSources: [],
  currentPage: "dashboard",
  currentMonth: new Date().toISOString().slice(0, 7),
};

let pendingDeleteFn = null;

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  // Set global month picker
  const monthPicker = document.getElementById("global-month");
  monthPicker.value = state.currentMonth;
  monthPicker.addEventListener("change", (e) => {
    state.currentMonth = e.target.value;
    refreshCurrentPage();
  });

  // Load categories & income sources
  await Promise.all([loadCategories(), loadIncomeSources()]);

  // Nav wiring
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  // Mobile menu toggle
  document.getElementById("menu-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  // Quick add button
  document.getElementById("quick-add-btn").addEventListener("click", openAddExpenseModal);

  // Set today's date as default for date inputs
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach((inp) => {
    if (!inp.value) inp.value = today;
  });
  document.querySelectorAll('input[type="month"]').forEach((inp) => {
    if (!inp.value) inp.value = state.currentMonth;
  });

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Summary month default
  const summaryMonth = document.getElementById("summary-month");
  if (summaryMonth) summaryMonth.value = state.currentMonth;

  // Initial page load
  showPage("dashboard");
});

function updateClock() {
  const el = document.getElementById("current-time");
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
}

// ═══════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════
async function loadCategories() {
  try {
    state.categories = await API.getCategories();
    ["exp-cat", "exp-category", "bud-category"].forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const first = sel.options[0];
      sel.innerHTML = "";
      if (first) sel.appendChild(first);
      state.categories.forEach((cat) => {
        sel.appendChild(new Option(cat, cat));
      });
    });
  } catch (e) { console.error("Failed to load categories", e); }
}

async function loadIncomeSources() {
  try {
    state.incomeSources = await API.getIncomeSources();
    const sel = document.getElementById("inc-source");
    if (!sel) return;
    const first = sel.options[0];
    sel.innerHTML = "";
    if (first) sel.appendChild(first);
    state.incomeSources.forEach((src) => {
      sel.appendChild(new Option(src, src));
    });
  } catch (e) { console.error("Failed to load income sources", e); }
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function showPage(page) {
  state.currentPage = page;
  document.querySelectorAll(".page").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.getElementById(`nav-${page}`);
  if (pageEl) pageEl.classList.add("active");
  if (navEl) navEl.classList.add("active");

  // Update page title
  const titles = {
    dashboard: "Dashboard", expenses: "Expenses", income: "Income",
    budgets: "Budget Manager", savings: "Savings Goals", reports: "Reports & Export"
  };
  document.getElementById("page-title").textContent = titles[page] || page;

  // Close sidebar on mobile
  document.getElementById("sidebar").classList.remove("open");

  refreshCurrentPage();
}

function refreshCurrentPage() {
  switch (state.currentPage) {
    case "dashboard": loadDashboard(); break;
    case "expenses": loadExpenses(); loadQuickStats(); break;
    case "income": loadIncome(); break;
    case "budgets": loadBudgets(); break;
    case "savings": loadGoals(); break;
    case "reports": loadQuickStats(); break;
  }
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
async function loadDashboard() {
  try {
    const data = await API.getDashboard(state.currentMonth);

    // Stats
    document.getElementById("stat-expenses").textContent = fmt(data.total_expenses);
    document.getElementById("stat-income").textContent = fmt(data.total_income);
    document.getElementById("stat-balance").textContent = fmt(data.balance);
    document.getElementById("stat-balance").style.color = data.balance >= 0 ? "#6ee7b7" : "#fca5a5";

    const savingsRate = data.total_income > 0 ? ((data.balance / data.total_income) * 100).toFixed(1) : 0;
    document.getElementById("stat-savings-rate").textContent = `${savingsRate}%`;
    document.getElementById("stat-balance-status").textContent = data.balance >= 0 ? "✅ Healthy" : "⚠️ Overspent";
    document.getElementById("stat-expenses-count").textContent = `${data.recent.length}+ transactions`;
    document.getElementById("stat-income-count").textContent = `${data.total_income > 0 ? "multiple" : "0"} sources`;

    // Charts
    renderCategoryChart(data.by_category);
    renderTrendChart(data.monthly_trend);
    renderDailyChart(data.daily);

    // Recent
    const list = document.getElementById("recent-list");
    if (data.recent.length === 0) {
      list.innerHTML = `<li class="empty-state">No recent expenses</li>`;
    } else {
      list.innerHTML = data.recent.map((e) => `
        <li class="recent-item">
          <div class="recent-cat-dot">${catEmoji(e.category)}</div>
          <div class="recent-info">
            <div class="recent-title">${esc(e.title)}</div>
            <div class="recent-meta">${e.category} · ${e.date}</div>
          </div>
          <div class="recent-amount">${fmt(e.amount)}</div>
        </li>
      `).join("");
    }
  } catch (e) {
    showToast("Failed to load dashboard", "error");
    console.error(e);
  }
}

// ═══════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════
async function loadExpenses() {
  const tbody = document.getElementById("expenses-tbody");
  tbody.innerHTML = `<tr><td colspan="7" class="empty-cell"><span class="spinner"></span> Loading…</td></tr>`;
  try {
    const params = {
      category: document.getElementById("exp-category")?.value || "",
      start_date: document.getElementById("exp-start")?.value || "",
      end_date: document.getElementById("exp-end")?.value || "",
      search: document.getElementById("exp-search")?.value || "",
    };
    Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
    const expenses = await API.getExpenses(params);

    if (expenses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No expenses found</td></tr>`;
      document.getElementById("expenses-total-label").textContent = "";
      return;
    }

    const total = expenses.reduce((s, e) => s + e.amount, 0);
    document.getElementById("expenses-total-label").textContent =
      `${expenses.length} record(s) · Total: ${fmt(total)}`;

    tbody.innerHTML = expenses.map((e, i) => `
      <tr>
        <td class="text-muted">${i + 1}</td>
        <td><span class="fw-bold">${esc(e.title)}</span></td>
        <td class="amount-cell">${fmt(e.amount)}</td>
        <td><span class="cat-badge">${catEmoji(e.category)} ${esc(e.category)}</span></td>
        <td class="text-muted">${e.date}</td>
        <td class="text-muted">${esc(e.note) || "–"}</td>
        <td class="actions-cell">
          <button class="btn btn-outline btn-icon" onclick="openEditExpenseModal(${e.id})" title="Edit">✏️</button>
          <button class="btn btn-danger btn-icon" onclick="confirmDelete('expense', ${e.id})" title="Delete">🗑</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell text-red">Error loading expenses</td></tr>`;
    showToast(err.message, "error");
  }
}

function clearExpenseFilters() {
  ["exp-search", "exp-start", "exp-end"].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });
  document.getElementById("exp-category").value = "";
  loadExpenses();
}

// ─── Add Expense Modal ─────────────────────────
function openAddExpenseModal() {
  document.getElementById("expense-edit-id").value = "";
  document.getElementById("expense-modal-title").textContent = "Add Expense";
  document.getElementById("expense-submit-btn").textContent = "Add Expense";
  document.getElementById("expense-form").reset();
  document.getElementById("exp-date").value = new Date().toISOString().slice(0, 10);
  openModal("expense-modal");
}

async function openEditExpenseModal(id) {
  try {
    const e = await API.getExpense(id);
    document.getElementById("expense-edit-id").value = e.id;
    document.getElementById("expense-modal-title").textContent = "Edit Expense";
    document.getElementById("expense-submit-btn").textContent = "Save Changes";
    document.getElementById("exp-title").value = e.title;
    document.getElementById("exp-amount").value = e.amount;
    document.getElementById("exp-date").value = e.date;
    document.getElementById("exp-cat").value = e.category;
    document.getElementById("exp-note").value = e.note;
    openModal("expense-modal");
  } catch (err) {
    showToast("Failed to load expense", "error");
  }
}

async function submitExpense(evt) {
  evt.preventDefault();
  const editId = document.getElementById("expense-edit-id").value;
  const data = {
    title: document.getElementById("exp-title").value.trim(),
    amount: parseFloat(document.getElementById("exp-amount").value),
    category: document.getElementById("exp-cat").value,
    note: document.getElementById("exp-note").value.trim(),
    date: document.getElementById("exp-date").value,
  };
  try {
    if (editId) {
      await API.updateExpense(editId, data);
      showToast("Expense updated!", "success");
    } else {
      await API.addExpense(data);
      showToast("Expense added!", "success");
    }
    closeModal();
    loadExpenses();
    if (state.currentPage === "dashboard") loadDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ═══════════════════════════════════════════════
// INCOME
// ═══════════════════════════════════════════════
async function loadIncome() {
  const tbody = document.getElementById("income-tbody");
  tbody.innerHTML = `<tr><td colspan="7" class="empty-cell"><span class="spinner"></span> Loading…</td></tr>`;
  try {
    const params = {
      start_date: document.getElementById("inc-start")?.value || "",
      end_date: document.getElementById("inc-end")?.value || "",
    };
    Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
    const income = await API.getIncome(params);

    if (income.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No income records found</td></tr>`;
      document.getElementById("income-total-label").textContent = "";
      return;
    }
    const total = income.reduce((s, i) => s + i.amount, 0);
    document.getElementById("income-total-label").textContent =
      `${income.length} record(s) · Total: ${fmt(total)}`;

    tbody.innerHTML = income.map((i, idx) => `
      <tr>
        <td class="text-muted">${idx + 1}</td>
        <td><span class="fw-bold">${esc(i.title)}</span></td>
        <td class="income-amount">${fmt(i.amount)}</td>
        <td><span class="cat-badge" style="background:rgba(16,185,129,0.12);color:#6ee7b7;border-color:rgba(16,185,129,0.2)">💵 ${esc(i.source)}</span></td>
        <td class="text-muted">${i.date}</td>
        <td class="text-muted">${esc(i.note) || "–"}</td>
        <td class="actions-cell">
          <button class="btn btn-danger btn-icon" onclick="confirmDelete('income', ${i.id})" title="Delete">🗑</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell text-red">Error loading income</td></tr>`;
    showToast(err.message, "error");
  }
}

function clearIncomeFilters() {
  ["inc-start", "inc-end"].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });
  loadIncome();
}

function openAddIncomeModal() {
  document.getElementById("income-form").reset();
  document.getElementById("inc-date").value = new Date().toISOString().slice(0, 10);
  openModal("income-modal");
}

async function submitIncome(evt) {
  evt.preventDefault();
  const data = {
    title: document.getElementById("inc-title").value.trim(),
    amount: parseFloat(document.getElementById("inc-amount").value),
    source: document.getElementById("inc-source").value,
    note: document.getElementById("inc-note").value.trim(),
    date: document.getElementById("inc-date").value,
  };
  try {
    await API.addIncome(data);
    showToast("Income added!", "success");
    closeModal();
    loadIncome();
    if (state.currentPage === "dashboard") loadDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ═══════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════
async function loadBudgets() {
  const grid = document.getElementById("budgets-grid");
  document.getElementById("budget-month-label").textContent = `Showing budgets for: ${state.currentMonth}`;
  grid.innerHTML = `<div class="empty-state-card"><span class="spinner"></span> Loading...</div>`;
  try {
    const budgets = await API.getBudgets(state.currentMonth);
    if (budgets.length === 0) {
      grid.innerHTML = `<div class="empty-state-card">No budgets set for ${state.currentMonth}. Click "Set Budget" to start!</div>`;
      return;
    }
    grid.innerHTML = budgets.map((b) => {
      const pct = Math.min(b.percentage, 100);
      const cls = b.percentage >= 90 ? "danger" : b.percentage >= 70 ? "warning" : "safe";
      return `
        <div class="budget-card">
          <div class="budget-card-header">
            <div>
              <div class="budget-cat">${catEmoji(b.category)} ${esc(b.category)}</div>
            </div>
            <button class="budget-delete" onclick="confirmDelete('budget', ${b.id})">🗑 Remove</button>
          </div>
          <div class="budget-amounts">
            <span class="budget-spent">Spent: <strong>${fmt(b.spent)}</strong></span>
            <span class="budget-limit">Limit: ${fmt(b.monthly_limit)}</span>
          </div>
          <div class="budget-bar-bg">
            <div class="budget-bar-fill ${cls}" style="width:${pct}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="budget-pct ${cls}">${b.percentage}% used</span>
            <span class="budget-remaining">${b.remaining >= 0 ? `₹${b.remaining.toLocaleString("en-IN")} left` : `₹${Math.abs(b.remaining).toLocaleString("en-IN")} over`}</span>
          </div>
          ${b.percentage >= 90 ? `<div style="margin-top:0.5rem;font-size:0.72rem;color:var(--accent-red);font-weight:600">⚠️ Budget ${b.percentage >= 100 ? "exceeded!" : "almost full!"}</div>` : ""}
        </div>
      `;
    }).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state-card text-red">Error loading budgets</div>`;
    showToast(err.message, "error");
  }
}

function openAddBudgetModal() {
  document.getElementById("budget-form").reset();
  document.getElementById("bud-month").value = state.currentMonth;
  openModal("budget-modal");
}

async function submitBudget(evt) {
  evt.preventDefault();
  const data = {
    category: document.getElementById("bud-category").value,
    monthly_limit: parseFloat(document.getElementById("bud-limit").value),
    month: document.getElementById("bud-month").value,
  };
  try {
    await API.setBudget(data);
    showToast("Budget set!", "success");
    closeModal();
    loadBudgets();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ═══════════════════════════════════════════════
// SAVINGS GOALS
// ═══════════════════════════════════════════════
async function loadGoals() {
  const grid = document.getElementById("goals-grid");
  grid.innerHTML = `<div class="empty-state-card"><span class="spinner"></span> Loading...</div>`;
  try {
    const goals = await API.getGoals();
    if (goals.length === 0) {
      grid.innerHTML = `<div class="empty-state-card">🎯 No savings goals yet. Start saving today!</div>`;
      return;
    }
    grid.innerHTML = goals.map((g) => {
      const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100).toFixed(1) : 0;
      return `
        <div class="goal-card">
          <div class="goal-header">
            <div>
              <div class="goal-title">🎯 ${esc(g.title)}</div>
              ${g.deadline ? `<div class="goal-deadline">Deadline: ${g.deadline}</div>` : ""}
            </div>
            <button class="budget-delete" onclick="confirmDelete('goal', ${g.id})">🗑</button>
          </div>
          <div class="goal-amounts">
            <div class="goal-current">${fmt(g.current_amount)}</div>
            <div class="goal-target">of ${fmt(g.target_amount)} goal</div>
          </div>
          <div class="goal-bar-bg">
            <div class="goal-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="goal-pct">${pct}% achieved</div>
          <div class="goal-actions">
            <button class="btn btn-primary btn-purple" onclick="openContributeModal(${g.id})">+ Add Money</button>
            ${parseFloat(pct) >= 100 ? `<span style="color:var(--accent-green);font-size:0.85rem;font-weight:700">🎉 Goal reached!</span>` : ""}
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state-card text-red">Error loading goals</div>`;
    showToast(err.message, "error");
  }
}

function openAddGoalModal() {
  document.getElementById("goal-form").reset();
  openModal("goal-modal");
}

async function submitGoal(evt) {
  evt.preventDefault();
  const data = {
    title: document.getElementById("goal-title").value.trim(),
    target_amount: parseFloat(document.getElementById("goal-target").value),
    deadline: document.getElementById("goal-deadline").value || "",
  };
  try {
    await API.addGoal(data);
    showToast("Savings goal created!", "success");
    closeModal();
    loadGoals();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function openContributeModal(goalId) {
  document.getElementById("contribute-goal-id").value = goalId;
  document.getElementById("contribute-form").reset();
  openModal("contribute-modal");
}

async function submitContribution(evt) {
  evt.preventDefault();
  const id = document.getElementById("contribute-goal-id").value;
  const amount = parseFloat(document.getElementById("contribute-amount").value);
  try {
    await API.contributeGoal(id, amount);
    showToast(`₹${amount.toLocaleString("en-IN")} added to goal!`, "success");
    closeModal();
    loadGoals();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ═══════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════
async function loadSummary() {
  const month = document.getElementById("summary-month").value;
  if (!month) { showToast("Please select a month", "warning"); return; }
  const result = document.getElementById("summary-result");
  result.classList.remove("hidden");
  result.innerHTML = `<span class="spinner"></span> Generating…`;
  try {
    const data = await API.getSummary(month);
    result.innerHTML = `
      <div class="summary-row"><span class="key">Month</span><span class="val">${data.month}</span></div>
      <div class="summary-row"><span class="key">Total Expenses</span><span class="val text-red">${fmt(data.total_expenses)}</span></div>
      <div class="summary-row"><span class="key">Total Income</span><span class="val text-green">${fmt(data.total_income)}</span></div>
      <div class="summary-row"><span class="key">Net Savings</span><span class="val" style="color:${data.net_savings >= 0 ? "var(--accent-green)" : "var(--accent-red)"}">${fmt(data.net_savings)}</span></div>
      <div class="summary-row"><span class="key">Expense Count</span><span class="val">${data.expense_count}</span></div>
      <div class="summary-row"><span class="key">Income Count</span><span class="val">${data.income_count}</span></div>
      <hr style="border-color:var(--border);margin:0.5rem 0"/>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.05em">By Category</div>
      ${data.by_category.map((c) => `<div class="summary-row"><span class="key">${catEmoji(c.category)} ${c.category}</span><span class="val text-red">${fmt(c.total)}</span></div>`).join("")}
    `;
  } catch (err) {
    result.innerHTML = `<span class="text-red">Error: ${err.message}</span>`;
  }
}

async function loadQuickStats() {
  try {
    const expenses = await API.getExpenses();
    if (expenses.length === 0) {
      ["qs-highest", "qs-avg", "qs-top-cat", "qs-count"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "–";
      });
      return;
    }
    const highest = Math.max(...expenses.map((e) => e.amount));
    const uniqueDates = new Set(expenses.map((e) => e.date)).size;
    const avgDaily = expenses.reduce((s, e) => s + e.amount, 0) / (uniqueDates || 1);
    const catTotals = {};
    expenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl("qs-highest", fmt(highest));
    setEl("qs-avg", fmt(avgDaily));
    setEl("qs-top-cat", topCat ? `${catEmoji(topCat[0])} ${topCat[0]}` : "–");
    setEl("qs-count", expenses.length);
  } catch (e) { console.error(e); }
}

function exportExpensesCSV() {
  const start = document.getElementById("csv-start").value;
  const end = document.getElementById("csv-end").value;
  let url = "/api/export/csv";
  const params = new URLSearchParams();
  if (start) params.set("start_date", start);
  if (end) params.set("end_date", end);
  if (params.toString()) url += "?" + params.toString();
  downloadCSV(url);
  showToast("CSV download started!", "success");
}

function exportIncomeCSV() {
  const start = document.getElementById("income-csv-start").value;
  const end = document.getElementById("income-csv-end").value;
  let url = "/api/export/income-csv";
  const params = new URLSearchParams();
  if (start) params.set("start_date", start);
  if (end) params.set("end_date", end);
  if (params.toString()) url += "?" + params.toString();
  downloadCSV(url);
  showToast("CSV download started!", "success");
}

// ═══════════════════════════════════════════════
// DELETE / CONFIRM
// ═══════════════════════════════════════════════
function confirmDelete(type, id) {
  const msgs = {
    expense: "Delete this expense? This cannot be undone.",
    income: "Delete this income record? This cannot be undone.",
    budget: "Remove this budget?",
    goal: "Delete this savings goal and all progress?",
  };
  document.getElementById("confirm-msg").textContent = msgs[type] || "Are you sure?";
  pendingDeleteFn = async () => {
    try {
      if (type === "expense") { await API.deleteExpense(id); loadExpenses(); }
      else if (type === "income") { await API.deleteIncome(id); loadIncome(); }
      else if (type === "budget") { await API.deleteBudget(id); loadBudgets(); }
      else if (type === "goal") { await API.deleteGoal(id); loadGoals(); }
      showToast("Deleted successfully", "success");
      if (state.currentPage === "dashboard") loadDashboard();
    } catch (err) { showToast(err.message, "error"); }
    closeModal();
  };
  document.getElementById("confirm-ok-btn").onclick = pendingDeleteFn;
  openModal("confirm-modal");
}

// ═══════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════
function openModal(id) {
  document.getElementById("modal-overlay").classList.add("active");
  // Small delay for CSS transition
  setTimeout(() => {
    document.getElementById(id).classList.add("active");
  }, 10);
}

function closeModal() {
  document.querySelectorAll(".modal").forEach((m) => m.classList.remove("active"));
  document.getElementById("modal-overlay").classList.remove("active");
  pendingDeleteFn = null;
}

// Keyboard escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function showToast(msg, type = "info") {
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "•"}</span><span>${esc(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════
function fmt(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CAT_EMOJI = {
  "Food & Dining": "🍽️", "Transportation": "🚗", "Shopping": "🛍️",
  "Bills & Utilities": "💡", "Entertainment": "🎬", "Education": "📚",
  "Health & Medical": "💊", "Travel": "✈️", "Groceries": "🛒",
  "Personal Care": "💅", "Investments": "📈", "Others": "📦"
};

function catEmoji(cat) {
  return CAT_EMOJI[cat] || "💸";
}
