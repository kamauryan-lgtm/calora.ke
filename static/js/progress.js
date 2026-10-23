/**
 * CALORA - Progress, Weight Tracking, Adaptive Calorie Engine & Weekly Trends
 * Accuracy over assumptions.
 */

let weightChartInstance = null;

async function loadProgressData() {
  await Promise.all([
    loadWeightChartAndStats(),
    loadAdaptiveEngine(),
    loadWeeklyAnalysis()
  ]);
}

// ----------------------------------------------------
// 1. WEIGHT CHART & MOVING AVERAGE (Section 23)
// ----------------------------------------------------

async function loadWeightChartAndStats() {
  try {
    const data = await apiCall("/api/weight/history?days=30");

    // Populate top stat cards
    const startEl = document.getElementById("prog-start-weight");
    const currentEl = document.getElementById("prog-current-weight");
    const goalEl = document.getElementById("prog-goal-weight");
    const netEl = document.getElementById("prog-net-change");
    const sevenAvgEl = document.getElementById("prog-seven-day-avg");

    if (startEl) startEl.innerHTML = `${data.stats.start_weight.toFixed(1)} <span class="text-xs text-slate-500">kg</span>`;
    if (currentEl) currentEl.innerHTML = `${data.stats.current_weight.toFixed(1)} <span class="text-xs text-slate-500">kg</span>`;
    if (goalEl) goalEl.innerHTML = `${data.stats.goal_weight.toFixed(1)} <span class="text-xs text-slate-500">kg</span>`;
    if (sevenAvgEl) sevenAvgEl.innerHTML = `${data.stats.seven_day_avg.toFixed(1)} <span class="text-xs text-slate-500">kg</span>`;

    if (netEl) {
      const change = data.stats.total_change;
      const pct = Math.abs(change / (data.stats.start_weight || 1) * 100).toFixed(1);
      netEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)} kg (${change < 0 ? '-' : '+'}${pct}%)`;
      netEl.className = change <= 0 ? "text-[11px] text-emerald-400 font-semibold" : "text-[11px] text-amber-400 font-semibold";
    }

    // Render Chart.js
    renderWeightChart(data.logs, data.stats.goal_weight);

  } catch (err) {
    console.error("Progress data error:", err);
  }
}

function renderWeightChart(logs, goalWeight) {
  const canvas = document.getElementById("weightTrendChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Format dates for labels
  const labels = logs.map(l => {
    const parts = l.date.split("-");
    return `${parts[1]}/${parts[2]}`;
  });

  const rawWeights = logs.map(l => l.weight_kg);
  const smoothedWeights = logs.map(l => l.smoothed_avg_kg);

  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  weightChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "7-Day Smoothed Trend (True Biological Signal)",
          data: smoothedWeights,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: "Daily Scale Reading (Hydration / Water Noise)",
          data: rawWeights,
          borderColor: "rgba(148, 163, 184, 0.4)",
          backgroundColor: "rgba(148, 163, 184, 0.8)",
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 4,
          pointBackgroundColor: "#94a3b8",
          pointHoverRadius: 6,
          fill: false,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "#94a3b8",
            font: { size: 11, family: "sans-serif" },
            boxWidth: 12
          }
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleColor: "#f8fafc",
          bodyColor: "#94a3b8",
          borderColor: "#334155",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)} kg`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(51, 65, 85, 0.25)" },
          ticks: { color: "#64748b", font: { size: 10 } }
        },
        y: {
          grid: { color: "rgba(51, 65, 85, 0.25)" },
          ticks: { color: "#64748b", font: { size: 10 } }
        }
      }
    }
  });
}

async function submitWeightLog() {
  const input = document.getElementById("new-weight-val");
  if (!input || !input.value) return;

  const wt = parseFloat(input.value);
  if (isNaN(wt) || wt < 30 || wt > 300) {
    showToast("Please enter a valid weight between 30 and 300 kg", "error");
    return;
  }

  try {
    await apiCall("/api/weight/log", "POST", {
      date: AppState.currentDate,
      weight_kg: wt,
      notes: "Daily check-in"
    });

    input.value = "";
    showToast(`Logged weight: ${wt} kg`, "success");
    loadProgressData();
  } catch (err) {
    showToast(err.message, "error");
  }
}


// ----------------------------------------------------
// 2. ADAPTIVE CALORIE ENGINE (Section 7)
// ----------------------------------------------------

async function loadAdaptiveEngine() {
  try {
    const data = await apiCall("/api/progress/adaptive-engine");

    const estEl = document.getElementById("adapt-estimated-maint");
    const obsEl = document.getElementById("adapt-observed-maint");
    const varEl = document.getElementById("adapt-variance-text");
    const relEl = document.getElementById("adapt-relationship-text");
    const advEl = document.getElementById("adapt-advice-text");

    if (estEl) estEl.innerHTML = `${data.estimated_maintenance.toLocaleString()} <span class="text-xs text-slate-400">kcal/day</span>`;

    if (data.status === "active") {
      if (obsEl) obsEl.innerHTML = `${data.observed_maintenance.toLocaleString()} <span class="text-xs text-slate-400">kcal/day</span>`;
      if (varEl) varEl.textContent = `Variance: ${data.variance >= 0 ? '+' : ''}${data.variance} kcal/day (${data.relationship})`;
      if (relEl) relEl.textContent = data.relationship;
      if (advEl) advEl.textContent = data.advice;
    } else {
      if (obsEl) obsEl.innerHTML = `Calculating... <span class="text-xs text-slate-400">(${data.message})</span>`;
      if (varEl) varEl.textContent = "Requires 7 consecutive days of weigh-ins to establish true non-hydration trend.";
      if (relEl) relEl.textContent = "Collecting initial baseline moving average";
      if (advEl) advEl.textContent = data.smoothing_explanation;
    }

  } catch (err) {
    console.error("Adaptive engine error:", err);
  }
}


// ----------------------------------------------------
// 3. WEEKLY ANALYSIS (Section 25)
// ----------------------------------------------------

async function loadWeeklyAnalysis() {
  try {
    const data = await apiCall("/api/progress/weekly-analysis");

    const periodEl = document.getElementById("weekly-period-label");
    const avgCalEl = document.getElementById("weekly-avg-cal");
    const loggedDaysEl = document.getElementById("weekly-logged-days");
    const avgProteinEl = document.getElementById("weekly-avg-protein");
    const proteinHitEl = document.getElementById("weekly-protein-hit");
    const wtTrendEl = document.getElementById("weekly-weight-trend");
    const feedbackBox = document.getElementById("weekly-feedback-box");

    if (periodEl) periodEl.textContent = data.period;
    if (avgCalEl) avgCalEl.textContent = `${data.average_calories.toLocaleString()} kcal`;
    if (loggedDaysEl) loggedDaysEl.textContent = `${data.logged_days} days`;
    if (avgProteinEl) avgProteinEl.textContent = `${data.average_protein}g / day`;
    if (proteinHitEl) proteinHitEl.textContent = `Target reached ${data.protein_days_hit} days`;
    if (wtTrendEl) wtTrendEl.textContent = `${data.weight_trend_kg >= 0 ? '+' : ''}${data.weight_trend_kg} kg`;
    if (feedbackBox) feedbackBox.textContent = `"${data.feedback_message}"`;

  } catch (err) {
    console.error("Weekly analysis error:", err);
  }
}
