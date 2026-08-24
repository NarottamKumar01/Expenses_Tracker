/* charts.js – Chart.js chart management */

const CATEGORY_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#ec4899","#84cc16","#f97316","#6366f1",
  "#14b8a6","#a78bfa"
];

const CHART_DEFAULTS = {
  color: "#94a3b8",
  borderColor: "rgba(255,255,255,0.06)",
  font: { family: "'Inter', sans-serif", size: 11 }
};

Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.borderColor = CHART_DEFAULTS.borderColor;
Chart.defaults.font.family = CHART_DEFAULTS.font.family;

let categoryChart = null;
let trendChart = null;
let dailyChart = null;

function destroyChart(chart) {
  if (chart) chart.destroy();
  return null;
}

// ─── Category Doughnut ────────────────────────────────────
function renderCategoryChart(data) {
  categoryChart = destroyChart(categoryChart);
  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;

  if (!data || data.length === 0) {
    ctx.parentElement.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:4rem 0;font-size:0.82rem;">No data for this month</p>`;
    return;
  }

  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.map(d => d.category),
      datasets: [{
        data: data.map(d => d.total),
        backgroundColor: CATEGORY_COLORS.slice(0, data.length),
        borderWidth: 2,
        borderColor: "#1a2235",
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            boxWidth: 10,
            padding: 10,
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ₹${ctx.parsed.toLocaleString("en-IN")} (${((ctx.parsed / ctx.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`
          }
        }
      }
    }
  });
}

// ─── Monthly Trend Bar ────────────────────────────────────
function renderTrendChart(data) {
  trendChart = destroyChart(trendChart);
  const ctx = document.getElementById("trendChart");
  if (!ctx) return;

  trendChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: "Expenses (₹)",
        data: data.map(d => d.total),
        backgroundColor: "rgba(59,130,246,0.6)",
        borderColor: "#3b82f6",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ₹${ctx.parsed.y.toLocaleString("en-IN")}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            font: { size: 11 },
            callback: (v) => "₹" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)
          }
        }
      }
    }
  });
}

// ─── Daily Spending Line ──────────────────────────────────
function renderDailyChart(data) {
  dailyChart = destroyChart(dailyChart);
  const ctx = document.getElementById("dailyChart");
  if (!ctx) return;

  dailyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => d.date.slice(5)), // MM-DD
      datasets: [{
        label: "Daily Spend (₹)",
        data: data.map(d => d.total),
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.12)",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: "#10b981",
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ₹${ctx.parsed.y.toLocaleString("en-IN")}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 10, font: { size: 10 } }
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            font: { size: 11 },
            callback: (v) => "₹" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)
          }
        }
      }
    }
  });
}
