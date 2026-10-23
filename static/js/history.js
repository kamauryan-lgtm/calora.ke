/**
 * CALORA - Comprehensive Client History & Unified Activity Stream
 * Tracks food, workouts, steps, sleep, weigh-ins and everything the client does.
 */

let currentHistorySubtab = "food";

async function loadHistoryModule() {
  switchHistorySubtab(currentHistorySubtab);
}

function switchHistorySubtab(subtab) {
  currentHistorySubtab = subtab;

  // Toggle button styles
  document.querySelectorAll(".history-subtab-btn").forEach(btn => {
    btn.className = "history-subtab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 flex items-center space-x-1.5";
  });
  const activeBtn = document.getElementById(`hist-subtab-${subtab}`);
  if (activeBtn) {
    activeBtn.className = "history-subtab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-emerald-400 bg-slate-800 border border-emerald-500/30 flex items-center space-x-1.5 shadow-lg shadow-emerald-500/10";
  }

  // Toggle panel visibility
  document.querySelectorAll(".history-panel").forEach(p => p.classList.add("hidden"));
  const target = document.getElementById(`hist-panel-${subtab}`);
  if (target) target.classList.remove("hidden");

  if (subtab === "food") loadFoodHistory();
  else if (subtab === "timeline") loadUnifiedTimeline();
  else if (subtab === "weight") loadWeightHistory();
  else if (subtab === "steps") loadStepsHistory();
  else if (subtab === "sleep") loadSleepHistory();
  else if (subtab === "workouts") loadWorkoutsHistory();

  lucide.createIcons();
}


// ----------------------------------------------------
// 1. DAILY FOOD & MEAL HISTORY
// ----------------------------------------------------

async function loadFoodHistory(days = 14) {
  const container = document.getElementById("food-history-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading meal diary history...</div>`;
  lucide.createIcons();

  try {
    const res = await apiCall(`/api/meals/history?days=${days}`);
    const history = res.history || [];

    if (history.length === 0) {
      container.innerHTML = `
        <div class="calora-card p-8 text-center space-y-3">
          <i data-lucide="utensils" class="w-10 h-10 text-slate-600 mx-auto"></i>
          <h3 class="text-sm font-bold text-slate-300">No Historical Food Logs Yet</h3>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">Start logging your meals on the Food Log tab to build your verified historical diary.</p>
          <button onclick="switchTab('foodlog')" class="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all">
            Log First Meal
          </button>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = history.map(day => {
      const isDeficit = day.is_deficit;
      const allItems = [
        ...day.meals.breakfast,
        ...day.meals.lunch,
        ...day.meals.dinner,
        ...day.meals.snack
      ];

      return `
        <div class="calora-card p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-bold text-white text-base">${formatDateDisplay(day.date)}</span>
                <span class="text-xs font-mono text-slate-400">(${day.date})</span>
                <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isDeficit ? 'badge-high' : 'badge-low'}">
                  ${isDeficit ? `-${day.deficit_kcal} kcal Deficit` : `+${Math.abs(day.deficit_kcal)} kcal Surplus`}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Target: <strong class="text-slate-300">${day.target_calories} kcal</strong> · Consumed: <strong class="text-white">${day.total_calories} kcal</strong> (${day.items_count} items logged)
              </p>
            </div>

            <div class="flex items-center space-x-2 self-start sm:self-auto">
              <button onclick="copyDayToToday('${day.date}')" class="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1 border border-slate-700 transition-all">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                <span>Copy to Today</span>
              </button>
            </div>
          </div>

          <!-- Macros Bar -->
          <div class="grid grid-cols-4 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-center">
            <div>
              <span class="text-[10px] text-slate-400 font-semibold uppercase">Protein</span>
              <div class="text-xs font-black text-brand-400">${day.total_protein_g}g</div>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 font-semibold uppercase">Carbs</span>
              <div class="text-xs font-black text-amber-400">${day.total_carbs_g}g</div>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 font-semibold uppercase">Fats</span>
              <div class="text-xs font-black text-rose-400">${day.total_fat_g}g</div>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 font-semibold uppercase">Fibre</span>
              <div class="text-xs font-black text-blue-400">${day.total_fibre_g}g</div>
            </div>
          </div>

          <!-- Meal Items List -->
          <div class="space-y-1.5">
            ${allItems.map(itm => `
              <div class="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/50">
                <div class="flex items-center space-x-2">
                  <span class="font-medium text-slate-200">${itm.food_name}</span>
                  <span class="text-slate-500 font-normal">· ${itm.portion_name}</span>
                  ${itm.cooking_oil && itm.cooking_oil !== 'none' ? `<span class="text-[10px] text-amber-400/80 font-mono">(${itm.cooking_oil.replace('_', ' ')})</span>` : ''}
                </div>
                <div class="flex items-center space-x-3">
                  <span class="text-slate-400 font-mono text-[11px]">${itm.protein_g}g P</span>
                  <span class="font-bold text-white font-mono">~${itm.calories} kcal</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("");

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error loading food history: ${err.message}</div>`;
  }
}

async function copyDayToToday(sourceDate) {
  try {
    const res = await apiCall("/api/meals/copy-to-today", "POST", { source_date: sourceDate });
    showToast(`Copied ${res.copied_count} meal items to today's diary!`, "success");
    switchTab("dashboard");
  } catch (err) {
    showToast(`Failed to copy meals: ${err.message}`, "error");
  }
}


// ----------------------------------------------------
// 2. UNIFIED ACTIVITY TIMELINE (Everything client does)
// ----------------------------------------------------

async function loadUnifiedTimeline(limit = 40) {
  const container = document.getElementById("timeline-history-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Compiling activity stream...</div>`;
  lucide.createIcons();

  try {
    const res = await apiCall(`/api/client/unified-history?limit=${limit}`);
    const events = res.timeline || [];

    if (events.length === 0) {
      container.innerHTML = `<div class="calora-card p-8 text-center text-xs text-slate-500">No activity recorded yet. Log food, steps, sleep, or workouts to populate your activity stream.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
        ${events.map(ev => {
          const badgeClass =
            ev.badge === "food" ? "bg-brand-500/10 text-brand-400 border-brand-500/20" :
            ev.badge === "workout" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
            ev.badge === "wellness" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
            "bg-amber-500/10 text-amber-400 border-amber-500/20";

          const iconName =
            ev.type === "meal" ? "utensils" :
            ev.type === "workout" ? "dumbbell" :
            ev.type === "steps" ? "footprints" :
            ev.type === "sleep" ? "moon" : "scale";

          return `
            <div class="relative">
              <!-- Timeline node icon -->
              <div class="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-slate-300">
                <i data-lucide="${iconName}" class="w-3 h-3 text-emerald-400"></i>
              </div>

              <div class="calora-card p-4 space-y-1 hover:border-slate-700 transition-all">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClass}">
                    ${ev.category}
                  </span>
                  <span class="text-[11px] text-slate-500 font-mono">${ev.date}</span>
                </div>
                <h4 class="text-sm font-bold text-white pt-1">${ev.title}</h4>
                <p class="text-xs text-slate-300">${ev.summary}</p>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error: ${err.message}</div>`;
  }
}


// ----------------------------------------------------
// 3. WEIGHT HISTORY
// ----------------------------------------------------

async function loadWeightHistory() {
  const container = document.getElementById("weight-history-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading weight history...</div>`;
  lucide.createIcons();

  try {
    const res = await apiCall("/api/weight/history?days=60");
    const logs = res.history || [];

    if (logs.length === 0) {
      container.innerHTML = `<div class="calora-card p-8 text-center text-xs text-slate-500">No weigh-ins recorded. Log your weight on the Progress tab to track trend.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="calora-card overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase text-slate-300 tracking-wider">Weight & Smoothed Moving Average Log</h4>
          <span class="text-xs text-slate-400">${logs.length} weigh-ins recorded</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="p-3">Date</th>
                <th class="p-3">Scale Weight</th>
                <th class="p-3">7-Day Smoothed</th>
                <th class="p-3">Delta (Daily)</th>
                <th class="p-3">Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${logs.map((w, idx) => {
                const prev = logs[idx + 1];
                const delta = prev ? (w.weight_kg - prev.weight_kg).toFixed(1) : "—";
                const deltaColor = !prev ? "text-slate-400" : (w.weight_kg <= prev.weight_kg ? "text-emerald-400" : "text-amber-400");
                return `
                  <tr class="hover:bg-slate-900/50">
                    <td class="p-3 font-mono font-medium text-white">${w.date}</td>
                    <td class="p-3 font-bold text-white">${w.weight_kg} kg</td>
                    <td class="p-3 font-semibold text-emerald-400">${w.smoothed_moving_average_kg || w.weight_kg} kg</td>
                    <td class="p-3 font-mono ${deltaColor}">${delta !== '—' && delta > 0 ? '+' : ''}${delta} ${delta !== '—' ? 'kg' : ''}</td>
                    <td class="p-3 text-slate-400 italic">${w.notes || '—'}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error: ${err.message}</div>`;
  }
}


// ----------------------------------------------------
// 4. STEPS HISTORY
// ----------------------------------------------------

async function loadStepsHistory() {
  const container = document.getElementById("steps-history-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading steps telemetry...</div>`;
  lucide.createIcons();

  try {
    const res = await apiCall("/api/steps/history?days=30");
    const logs = res.history || [];

    if (logs.length === 0) {
      container.innerHTML = `<div class="calora-card p-8 text-center text-xs text-slate-500">No step records yet. Log steps under the Wellness tab.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="calora-card overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase text-slate-300 tracking-wider">Step Count & Distance History</h4>
          <span class="text-xs text-emerald-400 font-bold">Avg: ${res.average_steps.toLocaleString()} steps/day</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="p-3">Date</th>
                <th class="p-3">Steps</th>
                <th class="p-3">Goal</th>
                <th class="p-3">Distance</th>
                <th class="p-3">Energy Burned</th>
                <th class="p-3">Active Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${logs.map(s => {
                const metGoal = s.steps_count >= (s.goal_steps || 10000);
                return `
                  <tr class="hover:bg-slate-900/50">
                    <td class="p-3 font-mono font-medium text-white">${s.date}</td>
                    <td class="p-3 font-black ${metGoal ? 'text-emerald-400' : 'text-white'}">${s.steps_count.toLocaleString()}</td>
                    <td class="p-3 text-slate-400">${(s.goal_steps || 10000).toLocaleString()}</td>
                    <td class="p-3 font-mono text-slate-300">${s.distance_km || (s.steps_count * 0.00075).toFixed(2)} km</td>
                    <td class="p-3 font-mono text-amber-400">${s.calories_burned || Math.round(s.steps_count * 0.038)} kcal</td>
                    <td class="p-3 text-slate-400">${s.active_minutes || 30} min</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error: ${err.message}</div>`;
  }
}


// ----------------------------------------------------
// 5. SLEEP HISTORY
// ----------------------------------------------------

async function loadSleepHistory() {
  const container = document.getElementById("sleep-history-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading sleep logs...</div>`;
  lucide.createIcons();

  try {
    const res = await apiCall("/api/sleep/history?days=30");
    const logs = res.history || [];

    if (logs.length === 0) {
      container.innerHTML = `<div class="calora-card p-8 text-center text-xs text-slate-500">No sleep logs yet. Track sleep under the Wellness tab.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="calora-card overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase text-slate-300 tracking-wider">Sleep Sessions & Recovery Rating</h4>
          <span class="text-xs text-blue-400 font-bold">Avg: ${(res.average_duration_min / 60).toFixed(1)} hrs/night</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="p-3">Date</th>
                <th class="p-3">Duration</th>
                <th class="p-3">Bedtime</th>
                <th class="p-3">Wake Time</th>
                <th class="p-3">Quality</th>
                <th class="p-3">Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${logs.map(sl => {
                const h = Math.floor(sl.duration_minutes / 60);
                const m = sl.duration_minutes % 60;
                return `
                  <tr class="hover:bg-slate-900/50">
                    <td class="p-3 font-mono font-medium text-white">${sl.date}</td>
                    <td class="p-3 font-black text-blue-400">${h}h ${m}m</td>
                    <td class="p-3 text-slate-300 font-mono">${sl.bedtime}</td>
                    <td class="p-3 text-slate-300 font-mono">${sl.wake_time}</td>
                    <td class="p-3 font-semibold text-amber-400">${sl.quality_rating || 4}/5 ⭐</td>
                    <td class="p-3 text-slate-400 italic">${sl.notes || '—'}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error: ${err.message}</div>`;
  }
}


// ----------------------------------------------------
// 6. WORKOUTS HISTORY
// ----------------------------------------------------

async function loadWorkoutsHistory() {
  const container = document.getElementById("workouts-history-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading workout records...</div>`;
  lucide.createIcons();

  try {
    const logs = await apiCall("/api/workouts/history");

    if (logs.length === 0) {
      container.innerHTML = `<div class="calora-card p-8 text-center text-xs text-slate-500">No workout sessions logged yet. Record workouts under the Workouts tab.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="space-y-4">
        ${logs.map(w => {
          let exercises = [];
          try {
            exercises = JSON.parse(w.exercises_json || "[]");
          } catch(e) {}

          return `
            <div class="calora-card p-5 space-y-3">
              <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h4 class="text-sm font-bold text-white flex items-center space-x-2">
                    <i data-lucide="dumbbell" class="w-4 h-4 text-purple-400"></i>
                    <span>${w.routine_name}</span>
                  </h4>
                  <span class="text-xs text-slate-400 font-mono">${w.date} · ${w.duration_minutes} minutes active</span>
                </div>
                <span class="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-xl border border-purple-500/20">
                  Volume: ${w.total_volume_kg.toLocaleString()} kg
                </span>
              </div>

              ${exercises.length > 0 ? `
                <div class="space-y-1.5 pt-1">
                  <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Exercises Performed:</span>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${exercises.map(ex => `
                      <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                        <strong class="text-slate-200 block">${ex.exercise_name || 'Exercise'}</strong>
                        <span class="text-slate-400 text-[11px]">${(ex.sets || []).length} sets · ${ex.sets ? ex.sets.map(s => `${s.reps} reps @ ${s.weight_kg}kg`).join(', ') : ''}</span>
                      </div>
                    `).join("")}
                  </div>
                </div>
              ` : ''}

              ${w.notes ? `<p class="text-xs text-slate-400 italic bg-slate-900/60 p-2 rounded-lg">"${w.notes}"</p>` : ''}
            </div>
          `;
        }).join("")}
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error: ${err.message}</div>`;
  }
}

function formatDateDisplay(dateStr) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch (e) {
    return dateStr;
  }
}
