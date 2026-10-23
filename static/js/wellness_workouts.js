/**
 * CALORA - Wellness (Steps & Sleep) and Workout Library Engine
 * Features 12 muscle groups, Kenyan equipment adaptations,
 * sleep duration calculator across midnight, and daily step logging.
 */

let currentExerciseFilters = {
  muscle_group: "all",
  equipment: "all",
  search: ""
};

// ----------------------------------------------------
// 1. WELLNESS ENGINE (Steps & Sleep)
// ----------------------------------------------------

async function loadWellnessData() {
  await loadStepsData();
  await loadSleepData();
}

async function loadStepsData() {
  const container = document.getElementById("steps-card-container");
  if (!container) return;

  try {
    const todaySteps = await apiCall(`/api/steps/today?date_str=${AppState.currentDate}`);
    const history = await apiCall("/api/steps/history?days=7");

    const goal = todaySteps.goal_steps || 10000;
    const count = todaySteps.steps_count || 0;
    const pct = Math.min(100, Math.round((count / goal) * 100));

    container.innerHTML = `
      <div class="calora-card p-5 space-y-4 border-slate-800">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center space-x-2">
            <div class="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <i data-lucide="footprints" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white">Daily Step Counter</h3>
              <span class="text-xs text-slate-400 font-mono">${AppState.currentDate}</span>
            </div>
          </div>
          <span class="badge-high text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">${pct}% Goal</span>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-3xl font-black text-white font-mono">${count.toLocaleString()}</div>
            <span class="text-xs text-slate-400 font-semibold">of ${goal.toLocaleString()} daily target</span>
          </div>
          <div class="text-right text-xs space-y-0.5">
            <span class="text-slate-400 block">Distance: <strong class="text-white">${todaySteps.distance_km || 0} km</strong></span>
            <span class="text-slate-400 block">Burned: <strong class="text-emerald-400">${todaySteps.calories_burned || 0} kcal</strong></span>
          </div>
        </div>

        <!-- Quick Log Row -->
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center space-x-2">
          <input type="number" id="quick-steps-input" placeholder="e.g. 8500" value="${count || ''}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono">
          <button onclick="saveDailySteps()" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs whitespace-nowrap">
            Update Steps
          </button>
        </div>

        <!-- 7-day mini trend -->
        <div class="space-y-1">
          <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">7-Day Step Average: ~${history.average_steps ? history.average_steps.toLocaleString() : 0} steps/day</span>
          <div class="grid grid-cols-7 gap-1 pt-1">
            ${(history.history || []).map(h => `
              <div class="text-center">
                <div class="h-12 bg-slate-900 rounded-md relative flex items-end justify-center p-0.5 border border-slate-800">
                  <div class="w-full bg-emerald-500/80 rounded-sm" style="height: ${Math.min(100, Math.round((h.steps_count / goal) * 100))}%;"></div>
                </div>
                <span class="text-[9px] text-slate-500 block mt-1">${h.date.substring(8, 10)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="calora-card p-4 text-red-400 text-xs">Error: ${err.message}</div>`;
  }
}

async function saveDailySteps() {
  const input = document.getElementById("quick-steps-input");
  if (!input || !input.value) return;

  try {
    await apiCall("/api/steps/log", "POST", {
      date: AppState.currentDate,
      steps_count: parseInt(input.value)
    });
    showToast("Steps updated for today!", "success");
    await loadStepsData();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadSleepData() {
  const container = document.getElementById("sleep-card-container");
  if (!container) return;

  try {
    const todaySleep = await apiCall(`/api/sleep/today?date_str=${AppState.currentDate}`);
    const history = await apiCall("/api/sleep/history?days=7");

    const durMin = todaySleep.duration_minutes || 480;
    const hrs = Math.floor(durMin / 60);
    const mins = durMin % 60;

    container.innerHTML = `
      <div class="calora-card p-5 space-y-4 border-slate-800">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center space-x-2">
            <div class="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <i data-lucide="moon" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white">Sleep & Recovery</h3>
              <span class="text-xs text-slate-400 font-mono">${AppState.currentDate}</span>
            </div>
          </div>
          <span class="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">★ ${todaySleep.quality_rating || 4}/5 Quality</span>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-3xl font-black text-white font-mono">${hrs}h ${mins}m</div>
            <span class="text-xs text-slate-400 font-semibold">Bed: ${todaySleep.bedtime || '22:30'} · Wake: ${todaySleep.wake_time || '06:30'}</span>
          </div>
          <div class="text-right text-xs">
            <span class="text-slate-400 block">Weekly Average:</span>
            <strong class="text-purple-300 text-sm font-mono">${Math.floor(history.average_duration_min / 60)}h ${history.average_duration_min % 60}m</strong>
          </div>
        </div>

        <!-- Bedtime / Wake Log Form -->
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-[10px] text-slate-400 block font-semibold">Bedtime</label>
              <input type="time" id="sleep-bedtime-input" value="${todaySleep.bedtime || '22:30'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white">
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block font-semibold">Wake Time</label>
              <input type="time" id="sleep-waketime-input" value="${todaySleep.wake_time || '06:30'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white">
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block font-semibold">Quality (1-5)</label>
              <select id="sleep-quality-input" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white">
                <option value="5" ${todaySleep.quality_rating === 5 ? 'selected' : ''}>5 - Restful</option>
                <option value="4" ${todaySleep.quality_rating === 4 ? 'selected' : ''}>4 - Good</option>
                <option value="3" ${todaySleep.quality_rating === 3 ? 'selected' : ''}>3 - Average</option>
                <option value="2" ${todaySleep.quality_rating === 2 ? 'selected' : ''}>2 - Restless</option>
                <option value="1" ${todaySleep.quality_rating === 1 ? 'selected' : ''}>1 - Poor</option>
              </select>
            </div>
          </div>
          <button onclick="saveSleepLog()" class="w-full bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-200 border border-slate-700 font-bold py-1.5 rounded-lg text-xs transition-all">
            Calculate Duration & Save Sleep
          </button>
        </div>
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="calora-card p-4 text-red-400 text-xs">Error: ${err.message}</div>`;
  }
}

async function saveSleepLog() {
  const bedtime = document.getElementById("sleep-bedtime-input").value;
  const waketime = document.getElementById("sleep-waketime-input").value;
  const quality = document.getElementById("sleep-quality-input").value;

  try {
    const res = await apiCall("/api/sleep/log", "POST", {
      date: AppState.currentDate,
      bedtime: bedtime,
      wake_time: waketime,
      quality_rating: parseInt(quality)
    });
    showToast(`Logged ${res.hours} of sleep!`, "success");
    await loadSleepData();
  } catch (err) {
    showToast(err.message, "error");
  }
}


// ----------------------------------------------------
// 2. WORKOUT LIBRARY & EXERCISE BROWSER (12 Muscle Groups)
// ----------------------------------------------------

async function loadWorkoutsData() {
  await fetchWorkoutPlans();
  await filterExercises();
}

async function fetchWorkoutPlans() {
  const container = document.getElementById("workout-plans-container");
  if (!container) return;

  try {
    const plans = await apiCall("/api/workouts/plans");

    container.innerHTML = plans.map(p => `
      <div class="calora-card p-5 space-y-3 flex flex-col justify-between border-slate-800">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">${p.level}</span>
            <span class="text-xs text-slate-400 font-mono">${p.days_per_week} Days/Wk · ~${p.estimated_duration_min} min</span>
          </div>
          <h4 class="text-sm font-bold text-white">${p.title}</h4>
          <p class="text-xs text-slate-400">${p.description}</p>
          <span class="text-[11px] text-slate-500 block">Equipment: ${p.equipment_needed}</span>
        </div>

        <button onclick='startWorkoutFromPlan(${JSON.stringify(p)})' class="w-full bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5">
          <i data-lucide="play" class="w-3.5 h-3.5"></i>
          <span>Start This Workout</span>
        </button>
      </div>
    `).join("");

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="calora-card p-4 text-red-400 text-xs">Error: ${err.message}</div>`;
  }
}

async function filterExercises() {
  const container = document.getElementById("exercises-library-container");
  if (!container) return;

  const mg = document.getElementById("exercise-muscle-filter") ? document.getElementById("exercise-muscle-filter").value : "all";
  const eq = document.getElementById("exercise-equip-filter") ? document.getElementById("exercise-equip-filter").value : "all";
  const search = document.getElementById("exercise-search-input") ? document.getElementById("exercise-search-input").value : "";

  try {
    const exercises = await apiCall(`/api/workouts/exercises?muscle_group=${mg}&equipment=${eq}&search=${encodeURIComponent(search)}`);

    container.innerHTML = exercises.map(ex => `
      <div class="calora-card p-4 space-y-2 border-slate-800">
        <div class="flex items-center justify-between">
          <h5 class="text-sm font-bold text-white">${ex.name}</h5>
          <span class="badge-high text-[10px] px-2 py-0.5 rounded-full font-bold">${ex.muscle_group}</span>
        </div>

        <div class="text-[11px] text-slate-400 space-y-1">
          <p><strong>Form:</strong> ${ex.form_cues}</p>
          <p class="text-amber-400/90"><strong>Safety:</strong> ${ex.safety_tips}</p>
          ${ex.kenyan_context ? `<p class="text-emerald-400/90"><strong>Kenyan Setup:</strong> ${ex.kenyan_context}</p>` : ''}
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-semibold uppercase">
          <span>${ex.equipment} · ${ex.movement_pattern}</span>
          <button onclick="logSingleExerciseQuick('${ex.name}')" class="text-emerald-400 hover:underline font-bold">
            + Log Session
          </button>
        </div>
      </div>
    `).join("");

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="calora-card p-4 text-red-400 text-xs">Error: ${err.message}</div>`;
  }
}

function logSingleExerciseQuick(name) {
  openWorkoutLoggerModal(name);
}

function openWorkoutLoggerModal(routineName = "Full Body Workout") {
  const existing = document.getElementById("modal-workout-logger");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "modal-workout-logger";
  modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm modal-overlay";

  modal.innerHTML = `
    <div class="calora-card p-6 max-w-md w-full bg-slate-900 border-slate-700 space-y-4 modal-content">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-white flex items-center space-x-2">
          <i data-lucide="dumbbell" class="w-4 h-4 text-emerald-400"></i>
          <span>Log Workout Session</span>
        </h3>
        <button onclick="document.getElementById('modal-workout-logger').remove()" class="p-1 text-slate-400 hover:text-white">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <div class="space-y-3">
        <div class="space-y-1">
          <label class="text-xs font-semibold text-slate-300">Routine Title</label>
          <input type="text" id="log-workout-routine" value="${routineName}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-300">Duration (Minutes)</label>
            <input type="number" id="log-workout-duration" value="45" min="10" max="180" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-300">Workout Date</label>
            <input type="date" id="log-workout-date" value="${AppState.currentDate}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono">
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-semibold text-slate-300">Notes & Perceived Exertion (RPE)</label>
          <textarea id="log-workout-notes" placeholder="e.g. Felt strong on pushups, finished with 5-min stretch." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white h-16"></textarea>
        </div>

        <div class="flex justify-end space-x-2 pt-2 border-t border-slate-800">
          <button onclick="document.getElementById('modal-workout-logger').remove()" class="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
          <button onclick="submitWorkoutLog()" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs">Save Session</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  lucide.createIcons();
}

async function submitWorkoutLog() {
  const routine = document.getElementById("log-workout-routine").value;
  const dur = parseInt(document.getElementById("log-workout-duration").value) || 45;
  const dateStr = document.getElementById("log-workout-date").value;
  const notes = document.getElementById("log-workout-notes").value;

  try {
    await apiCall("/api/workouts/log", "POST", {
      date: dateStr,
      routine_name: routine,
      duration_minutes: dur,
      exercises: [
        {"name": routine, "sets": [{"reps": 12, "weight_kg": 10, "rpe": 8}, {"reps": 12, "weight_kg": 10, "rpe": 8}]}
      ],
      notes: notes
    });
    showToast("Workout session logged successfully!", "success");
    document.getElementById("modal-workout-logger").remove();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function startWorkoutFromPlan(plan) {
  openWorkoutLoggerModal(plan.title);
}
