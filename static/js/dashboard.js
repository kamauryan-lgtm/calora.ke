/**
 * CALORA - Daily Dashboard & Transparent Calculation Auditing
 * Accuracy over assumptions.
 */

let currentDashboardData = null;

// Local offline diary helpers
function getLocalDashboardData(dateStr) {
  const key = "calora_local_diary_" + dateStr;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(key));
  } catch (e) {}

  if (!saved) {
    saved = { breakfast: [], lunch: [], dinner: [], snack: [] };
  }

  let totalCal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFibre = 0;
  let minRange = 0;
  let maxRange = 0;

  const summaries = {};
  ["breakfast", "lunch", "dinner", "snack"].forEach(mealKey => {
    const items = saved[mealKey] || [];
    let mealCal = 0;
    let mealProt = 0;
    let mealCarb = 0;
    let mealFat = 0;
    let mealFib = 0;
    items.forEach(it => {
      mealCal += it.calories || 0;
      mealProt += it.protein_g || 0;
      mealCarb += it.carbs_g || 0;
      mealFat += it.fat_g || 0;
      mealFib += it.fibre_g || 0;
      minRange += it.uncertainty_min || Math.round((it.calories || 0) * 0.9);
      maxRange += it.uncertainty_max || Math.round((it.calories || 0) * 1.15);
    });
    totalCal += mealCal;
    totalProtein += mealProt;
    totalCarbs += mealCarb;
    totalFat += mealFat;
    totalFibre += mealFib;

    summaries[mealKey] = {
      calories: mealCal,
      range_display: `${Math.round(mealCal * 0.9)}–${Math.round(mealCal * 1.15)} kcal`,
      confidence: "HIGH",
      macros: {
        protein_g: Number(mealProt.toFixed(1)),
        carbs_g: Number(mealCarb.toFixed(1)),
        fat_g: Number(mealFat.toFixed(1)),
        fibre_g: Number(mealFib.toFixed(1))
      }
    };
  });

  const targetCal = AppState.profile?.target_calories || 2000;
  const targetProt = AppState.profile?.target_protein_g || 130;
  const targetCarb = AppState.profile?.target_carbs_g || 220;
  const targetFat = AppState.profile?.target_fat_g || 65;
  const targetFibre = 30;

  return {
    date: dateStr,
    consumed: {
      calories: totalCal,
      range_display: totalCal > 0 ? `${minRange}–${maxRange} kcal` : "0–0 kcal",
      confidence: "HIGH",
      main_uncertainties: ["Portion estimation"],
      macros: {
        protein_g: Number(totalProtein.toFixed(1)),
        carbs_g: Number(totalCarbs.toFixed(1)),
        fat_g: Number(totalFat.toFixed(1)),
        fibre_g: Number(totalFibre.toFixed(1))
      }
    },
    target: {
      calories: targetCal,
      protein_g: targetProt,
      carbs_g: targetCarb,
      fat_g: targetFat,
      fibre_g: targetFibre
    },
    remaining: {
      calories: Math.max(0, targetCal - totalCal),
      protein_g: Math.max(0, Number((targetProt - totalProtein).toFixed(1))),
      carbs_g: Math.max(0, Number((targetCarb - totalCarbs).toFixed(1))),
      fat_g: Math.max(0, Number((targetFat - totalFat).toFixed(1))),
      fibre_g: Math.max(0, Number((targetFibre - totalFibre).toFixed(1)))
    },
    meals: saved,
    meal_summaries: summaries
  };
}
window.getLocalDashboardData = getLocalDashboardData;

function saveLocalMealItem(dateStr, mealType, itemObj) {
  const key = "calora_local_diary_" + dateStr;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(key));
  } catch (e) {}
  if (!saved) {
    saved = { breakfast: [], lunch: [], dinner: [], snack: [] };
  }
  if (!saved[mealType]) saved[mealType] = [];
  saved[mealType].push(itemObj);
  localStorage.setItem(key, JSON.stringify(saved));
}
window.saveLocalMealItem = saveLocalMealItem;

function deleteLocalMealItem(dateStr, itemId) {
  const key = "calora_local_diary_" + dateStr;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(key));
  } catch (e) {}
  if (!saved) return;
  ["breakfast", "lunch", "dinner", "snack"].forEach(mealKey => {
    saved[mealKey] = (saved[mealKey] || []).filter(it => it.id !== itemId);
  });
  localStorage.setItem(key, JSON.stringify(saved));
}
window.deleteLocalMealItem = deleteLocalMealItem;

async function loadDashboardData() {
  const container = document.getElementById("meals-container");
  if (!container) return;

  try {
    let data = null;
    try {
      data = await apiCall(`/api/meals/date/${AppState.currentDate}`);
    } catch (err) {
      console.warn("Backend API unavailable, loading local offline diary:", err.message);
      data = getLocalDashboardData(AppState.currentDate);
    }
    currentDashboardData = data;

    // Update Calories Overview
    const consumedEl = document.getElementById("dash-calories-consumed");
    const targetEl = document.getElementById("dash-calorie-target");
    const remainingEl = document.getElementById("dash-calories-remaining");
    const rangeEl = document.getElementById("dash-calorie-range");
    const confBadge = document.getElementById("dash-confidence-badge");
    const progressBar = document.getElementById("dash-progress-bar");
    const uncertaintyTxt = document.getElementById("dash-main-uncertainty-txt");

    if (consumedEl) consumedEl.textContent = data.consumed.calories.toLocaleString();
    if (targetEl) targetEl.textContent = data.target.calories.toLocaleString();
    if (remainingEl) remainingEl.textContent = `${data.remaining.calories.toLocaleString()} kcal`;
    if (rangeEl) rangeEl.textContent = data.consumed.range_display;

    if (confBadge) {
      confBadge.className = `px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center space-x-1 ${
        data.consumed.confidence === "HIGH" ? "badge-high" :
        data.consumed.confidence === "LOW" ? "badge-low" : "badge-medium"
      }`;
      confBadge.innerHTML = `
        <i data-lucide="${data.consumed.confidence === 'HIGH' ? 'check-circle' : 'shield-alert'}" class="w-3 h-3 inline"></i>
        <span>${data.consumed.confidence} Confidence</span>
      `;
    }

    if (progressBar) {
      const pct = Math.min(100, Math.round((data.consumed.calories / data.target.calories) * 100));
      progressBar.style.width = `${pct}%`;
    }

    if (uncertaintyTxt) {
      uncertaintyTxt.textContent = `Uncertainty: ${data.consumed.main_uncertainties.slice(0, 2).join(" + ")}`;
    }

    // Update Macro Nutrients
    updateMacroCard("protein", data.consumed.macros.protein_g, data.target.protein_g);
    updateMacroCard("carbs", data.consumed.macros.carbs_g, data.target.carbs_g);
    updateMacroCard("fat", data.consumed.macros.fat_g, data.target.fat_g);
    updateMacroCard("fibre", data.consumed.macros.fibre_g, data.target.fibre_g);

    // Render Meal Categories
    renderMealSections(data.meals, data.meal_summaries);

    // Render Today's Wellness Hub
    await loadDashboardWellness();

    lucide.createIcons();
  } catch (err) {
    console.error("Dashboard error:", err);
    showToast("Failed to load daily diary: " + err.message, "error");
  }
}

async function loadDashboardWellness() {
  const stepsEl = document.getElementById("dash-steps-val");
  const stepsGoalEl = document.getElementById("dash-steps-goal");
  const stepsBar = document.getElementById("dash-steps-bar");
  const sleepEl = document.getElementById("dash-sleep-val");
  const sleepRatingEl = document.getElementById("dash-sleep-rating");
  const workoutsEl = document.getElementById("dash-workouts-val");

  try {
    const [steps, sleep, workouts] = await Promise.all([
      apiCall(`/api/steps/today?date_str=${AppState.currentDate}`).catch(() => null),
      apiCall(`/api/sleep/today?date_str=${AppState.currentDate}`).catch(() => null),
      apiCall("/api/workouts/history").catch(() => [])
    ]);

    if (steps && stepsEl) {
      stepsEl.textContent = steps.steps_count.toLocaleString();
      if (stepsGoalEl) stepsGoalEl.textContent = (steps.goal_steps || 10000).toLocaleString();
      if (stepsBar) {
        const pct = Math.min(100, Math.round((steps.steps_count / (steps.goal_steps || 10000)) * 100));
        stepsBar.style.width = `${pct}%`;
      }
    }

    if (sleep && sleepEl) {
      const h = Math.floor((sleep.duration_minutes || 480) / 60);
      const m = (sleep.duration_minutes || 480) % 60;
      sleepEl.textContent = `${h}h ${m}m`;
      if (sleepRatingEl) sleepRatingEl.textContent = `${sleep.quality_rating || 4}/5 ⭐`;
    }

    if (workouts && workoutsEl) {
      const todaysWorkouts = (workouts || []).filter(w => w.date === AppState.currentDate);
      workoutsEl.textContent = `${todaysWorkouts.length} completed`;
    }
  } catch (e) {
    console.error("Dashboard wellness load error:", e);
  }
}

function updateMacroCard(macro, val, target) {
  const valEl = document.getElementById(`dash-macro-${macro}-val`);
  const targetEl = document.getElementById(`dash-macro-${macro}-target`);
  const pctEl = document.getElementById(`dash-macro-${macro}-pct`);
  const barEl = document.getElementById(`dash-macro-${macro}-bar`);

  if (valEl) valEl.textContent = Math.round(val);
  if (targetEl) targetEl.textContent = Math.round(target);

  const pct = Math.min(100, Math.round((val / (target || 1)) * 100));
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (barEl) barEl.style.width = `${pct}%`;
}

function renderMealSections(meals, summaries) {
  const container = document.getElementById("meals-container");
  container.innerHTML = "";

  const mealDefs = [
    { key: "breakfast", label: "Breakfast", icon: "sun" },
    { key: "lunch", label: "Lunch", icon: "sun-medium" },
    { key: "dinner", label: "Dinner", icon: "moon" },
    { key: "snack", label: "Snacks", icon: "coffee" }
  ];

  mealDefs.forEach(m => {
    const items = meals[m.key] || [];
    const summary = summaries[m.key] || { calories: 0, range_display: "0–0 kcal", confidence: "HIGH" };

    const card = document.createElement("div");
    card.className = "calora-card p-4 sm:p-5 space-y-3";

    // Header
    let headerHtml = `
      <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div class="flex items-center space-x-2">
          <div class="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-brand-400">
            <i data-lucide="${m.icon}" class="w-4 h-4"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">${m.label}</h3>
            <span class="text-[11px] text-slate-400 font-mono">${summary.range_display}</span>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <span class="text-sm font-bold text-white font-mono">${summary.calories} kcal</span>
          <button onclick="openLogForMeal('${m.key}')" class="text-xs font-semibold text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1 rounded-lg border border-brand-500/20 transition-all flex items-center space-x-1">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Add</span>
          </button>
        </div>
      </div>
    `;

    // Items list
    let itemsHtml = "";
    if (items.length === 0) {
      itemsHtml = `
        <div class="py-4 text-center text-slate-500 text-xs">
          No food logged yet for ${m.label.toLowerCase()}.
        </div>
      `;
    } else {
      window._dashboardItemsMap = window._dashboardItemsMap || {};
      itemsHtml = `<div class="space-y-2">`;
      items.forEach(item => {
        window._dashboardItemsMap[item.id] = item;
        const confClass = item.confidence_level === "HIGH" ? "badge-high" :
                          item.confidence_level === "LOW" ? "badge-low" : "badge-medium";

        itemsHtml += `
          <div class="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            
            <!-- Left Info -->
            <div class="space-y-1">
              <div class="flex items-center space-x-2">
                <span class="text-xs sm:text-sm font-bold text-white">${item.food_name}</span>
                <span class="${confClass} text-[10px] font-semibold px-2 py-0.5 rounded-full">${item.confidence_level}</span>
                ${item.data_origin === 'user_entered' ? '<span class="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">User-entered</span>' : ''}
              </div>

              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span>Portion: <strong class="text-slate-300">${item.portion_name}</strong> (${item.gram_weight}g)</span>
                ${item.cooking_oil_type !== 'none' ? `<span>Oil: <strong class="text-amber-400">${item.cooking_oil_type.replace('_', ' ')}</strong></span>` : ''}
                <span>Macros: <span class="text-slate-300">P:${item.protein_g}g C:${item.carbs_g}g F:${item.fat_g}g</span></span>
              </div>
            </div>

            <!-- Right Calorie & Why This Number Trigger -->
            <div class="flex items-center justify-between sm:justify-end space-x-3 self-end sm:self-center">
              <div class="text-right">
                <div class="text-sm font-bold text-white font-mono">~${item.logged_calories} kcal</div>
                <div class="text-[10px] text-slate-400 font-mono">${item.range_low}–${item.range_high} kcal</div>
              </div>

              <div class="flex items-center space-x-1">
                <!-- "Why this number?" Audit Trigger -->
                <button onclick="openWhyThisNumberModal('${item.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-brand-400 transition-colors" title="Why this number? (Transparent Calculation)">
                  <i data-lucide="help-circle" class="w-4 h-4"></i>
                </button>

                <!-- Report Issue Trigger -->
                <button onclick="openReportFoodModalById('${item.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors" title="Report Discrepancy">
                  <i data-lucide="flag" class="w-4 h-4"></i>
                </button>

                <!-- Delete Item -->
                <button onclick="deleteMealItem('${item.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors" title="Delete entry">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

          </div>
        `;
      });
      itemsHtml += `</div>`;
    }

    card.innerHTML = headerHtml + itemsHtml;
    container.appendChild(card);
  });
}

function openLogForMeal(mealType) {
  switchTab("foodlog");
  const select = document.getElementById("nlp-meal-type-select");
  if (select) select.value = mealType;
}

// "WHY THIS NUMBER?" MODAL POPULATION (Section 26)
function openWhyThisNumberModal(itemOrId) {
  const item = (typeof itemOrId === "string" ? window._dashboardItemsMap?.[itemOrId] : itemOrId) || itemOrId;
  if (!item) return;

  const modalBody = document.getElementById("why-number-modal-body");
  if (!modalBody) return;

  const uncertainties = Array.isArray(item.main_uncertainties) ? item.main_uncertainties : JSON.parse(item.main_uncertainties || "[]");
  const breakdowns = Array.isArray(item.breakdown) ? item.breakdown : JSON.parse(item.breakdown_json || "[]");

  let breakdownRowsHtml = "";
  if (breakdowns && breakdowns.length > 0) {
    breakdownRowsHtml = breakdowns.map(b => `
      <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-800 last:border-0">
        <div>
          <span class="text-white font-medium">${b.component}</span>
          ${b.weight_g ? `<span class="text-slate-400 text-[11px] block">${b.weight_g}g serving conversion</span>` : ''}
        </div>
        <div class="text-right">
          <strong class="text-brand-400 font-mono">~${b.estimated_kcal} kcal</strong>
          ${b.range_kcal ? `<span class="text-[10px] text-amber-400 block">${b.range_kcal}</span>` : ''}
        </div>
      </div>
    `).join("");
  } else {
    breakdownRowsHtml = `
      <div class="flex items-center justify-between text-xs py-1.5">
        <span class="text-slate-300">Base Food Item (${item.gram_weight}g)</span>
        <strong class="text-brand-400 font-mono">~${item.logged_calories} kcal</strong>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <!-- Top Result Banner -->
    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-center">
      <span class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Calorie Breakdown & Calculation Audit</span>
      <div class="text-3xl font-black text-white tracking-tight">~${item.logged_calories} <span class="text-sm font-normal text-slate-400">kcal</span></div>
      <div class="text-xs font-mono text-brand-400 font-bold">Likely Range: ${item.range_low} – ${item.range_high} kcal</div>
    </div>

    <!-- Transparent Calculation Components -->
    <div class="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
      <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Formula Components</h4>
      <div class="space-y-1">
        ${breakdownRowsHtml}
      </div>
    </div>

    <!-- Confidence & Uncertainties -->
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
        <span class="text-slate-400 block text-[10px] font-semibold uppercase">Confidence Level</span>
        <strong class="text-sm ${item.confidence_level === 'HIGH' ? 'text-brand-400' : (item.confidence_level === 'LOW' ? 'text-red-400' : 'text-amber-400')}">
          ${item.confidence_level}
        </strong>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
        <span class="text-slate-400 block text-[10px] font-semibold uppercase">Data Origin</span>
        <strong class="text-sm text-slate-200">${item.data_origin === 'verified' ? 'Verified Database' : 'User Estimate'}</strong>
      </div>
    </div>

    <!-- Main Uncertainties List -->
    <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
      <span class="font-bold text-slate-300">Identified Uncertainty Factors:</span>
      <ul class="list-disc list-inside text-slate-400 space-y-0.5 text-[11px] pt-1">
        ${uncertainties.map(u => `<li>${u}</li>`).join("")}
      </ul>
    </div>

    <!-- Source Citation -->
    <div class="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-400">
      <span class="font-semibold text-slate-300 block">Authoritative Citation:</span>
      <span>${item.source_citation || 'Official Food Composition Standard'}</span>
    </div>
  `;

  openModal("modal-why-this-number");
  lucide.createIcons();
}

function openReportFoodModalById(itemId) {
  const item = window._dashboardItemsMap?.[itemId];
  if (item) {
    openReportFoodModal(item.food_id || '', item.food_name || '');
  }
}
window.openReportFoodModalById = openReportFoodModalById;

async function deleteMealItem(itemId) {
  if (!confirm("Remove this food item from your diary?")) return;
  try {
    await apiCall(`/api/meals/item/${itemId}`, "DELETE");
    showToast("Food item removed", "info");
    loadDashboardData();
  } catch (err) {
    console.warn("Backend delete unavailable, removing from local diary:", err.message);
    deleteLocalMealItem(AppState.currentDate, itemId);
    showToast("Food item removed", "info");
    loadDashboardData();
  }
}

async function submitQuickAdd(e) {
  e.preventDefault();
  const name = document.getElementById("quick-add-name").value;
  const mealType = document.getElementById("quick-add-meal-type").value;
  const calories = parseInt(document.getElementById("quick-add-calories").value, 10);
  const p = parseFloat(document.getElementById("quick-add-p").value) || 0;
  const c = parseFloat(document.getElementById("quick-add-c").value) || 0;
  const f = parseFloat(document.getElementById("quick-add-f").value) || 0;

  try {
    await apiCall("/api/meals/quick-add", "POST", {
      date: AppState.currentDate,
      meal_type: mealType,
      name: name || "Quick Calorie Entry",
      calories: calories,
      protein_g: p,
      carbs_g: c,
      fat_g: f
    });

    closeModal("modal-quick-add");
    showToast(`Quick-added ${calories} kcal to ${mealType}`, "success");
    loadDashboardData();
  } catch (err) {
    console.warn("Backend quick-add unavailable, saving locally:", err.message);
    const itemObj = {
      id: "quick_" + Date.now(),
      food_id: "quick_add",
      food_name: name || "Quick Calorie Entry",
      portion_name: "Quick Add",
      gram_weight: 100,
      cooking_oil_type: "none",
      prep_method: "boiled",
      calories: calories,
      logged_calories: calories,
      range_low: Math.round(calories * 0.95),
      range_high: Math.round(calories * 1.05),
      protein_g: p,
      carbs_g: c,
      fat_g: f,
      fibre_g: 0,
      uncertainty_min: Math.round(calories * 0.95),
      uncertainty_max: Math.round(calories * 1.05),
      confidence_level: "HIGH"
    };
    saveLocalMealItem(AppState.currentDate, mealType, itemObj);
    closeModal("modal-quick-add");
    showToast(`Quick-added ${calories} kcal to ${mealType} (Saved locally)`, "success");
    loadDashboardData();
  }
}
