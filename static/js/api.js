/* api.js – Centralized fetch helpers */

const BASE = "";

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(BASE + url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e) {
    throw e;
  }
}

// ─── Expenses ───────────────────────────────────────────
const API = {
  // Categories
  getCategories: () => apiFetch("/api/categories"),

  // Expenses
  getExpenses: (params = {}) => apiFetch("/api/expenses?" + new URLSearchParams(params)),
  addExpense: (data) => apiFetch("/api/expenses", { method: "POST", body: JSON.stringify(data) }),
  getExpense: (id) => apiFetch(`/api/expenses/${id}`),
  updateExpense: (id, data) => apiFetch(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExpense: (id) => apiFetch(`/api/expenses/${id}`, { method: "DELETE" }),

  // Income
  getIncomeSources: () => apiFetch("/api/income/sources"),
  getIncome: (params = {}) => apiFetch("/api/income?" + new URLSearchParams(params)),
  addIncome: (data) => apiFetch("/api/income", { method: "POST", body: JSON.stringify(data) }),
  deleteIncome: (id) => apiFetch(`/api/income/${id}`, { method: "DELETE" }),

  // Budgets
  getBudgets: (month) => apiFetch(`/api/budgets?month=${month}`),
  setBudget: (data) => apiFetch("/api/budgets", { method: "POST", body: JSON.stringify(data) }),
  deleteBudget: (id) => apiFetch(`/api/budgets/${id}`, { method: "DELETE" }),

  // Savings Goals
  getGoals: () => apiFetch("/api/savings-goals"),
  addGoal: (data) => apiFetch("/api/savings-goals", { method: "POST", body: JSON.stringify(data) }),
  contributeGoal: (id, amount) => apiFetch(`/api/savings-goals/${id}/contribute`, { method: "POST", body: JSON.stringify({ amount }) }),
  deleteGoal: (id) => apiFetch(`/api/savings-goals/${id}`, { method: "DELETE" }),

  // Dashboard
  getDashboard: (month) => apiFetch(`/api/dashboard?month=${month}`),

  // Reports & Export
  getSummary: (month) => apiFetch(`/api/summary?month=${month}`),
};

// ─── CSV Download helper ─────────────────────────────────
function downloadCSV(url) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
