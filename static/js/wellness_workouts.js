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
  const bedtime = document.getElementById("sleep-bedtime-input")?.value || "22:30";
  const waketime = document.getElementById("sleep-waketime-input")?.value || "06:30";
  const quality = document.getElementById("sleep-quality-input")?.value || "4";

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

  let plans = null;
  try {
    plans = await apiCall("/api/workouts/plans");
    if (!Array.isArray(plans)) plans = null;
  } catch (err) {
    console.warn("Workouts API unavailable, using verified local plans:", err.message);
  }

  if (!plans) {
    plans = window.CALORA_WORKOUT_PLANS || [];
  }

  try {
    window._workoutPlansMap = window._workoutPlansMap || {};
    plans.forEach(p => window._workoutPlansMap[p.id] = p);

    container.innerHTML = plans.map(p => `
      <div class="calora-card p-5 space-y-3 flex flex-col justify-between border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group" onclick="openWorkoutProgrammeModal('${p.id}')">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">${p.level}</span>
            <span class="text-xs text-slate-400 font-mono">${p.days_per_week} Days/Wk · ~${p.estimated_duration_min} min</span>
          </div>
          <h4 class="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center justify-between">
            <span>${p.title}</span>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors"></i>
          </h4>
          <p class="text-xs text-slate-400">${p.description}</p>
          <div class="flex items-center space-x-2 text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
            <i data-lucide="dumbbell" class="w-3.5 h-3.5 text-emerald-400"></i>
            <span>Equipment: ${p.equipment_needed}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-2" onclick="event.stopPropagation()">
          <button onclick="openWorkoutProgrammeModal('${p.id}')" class="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5">
            <i data-lucide="book-open" class="w-3.5 h-3.5 text-emerald-400"></i>
            <span>View Programme</span>
          </button>
          <button onclick="openWorkoutProgrammeModal('${p.id}')" class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20">
            <i data-lucide="play" class="w-3.5 h-3.5 fill-slate-950"></i>
            <span>Start</span>
          </button>
        </div>
      </div>
    `).join("");

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="calora-card p-4 text-red-400 text-xs">Error: ${err.message}</div>`;
  }
}

let currentProgrammeSelectedDayIndex = 0;
let currentProgrammeSelectedDuration = 45;

async function openWorkoutProgrammeModal(planId) {
  let plan = window._workoutPlansMap?.[planId] || (window.CALORA_WORKOUT_PLANS || []).find(p => p.id === planId);
  if (!plan) {
    try {
      const plans = await apiCall("/api/workouts/plans");
      window._workoutPlansMap = window._workoutPlansMap || {};
      plans.forEach(p => window._workoutPlansMap[p.id] = p);
      plan = window._workoutPlansMap?.[planId] || (window.CALORA_WORKOUT_PLANS || []).find(p => p.id === planId);
    } catch (e) {
      plan = (window.CALORA_WORKOUT_PLANS || []).find(p => p.id === planId);
    }
  }
  if (!plan) return;

  const existing = document.getElementById("modal-workout-programme");
  if (existing) existing.remove();

  currentProgrammeSelectedDayIndex = 0;
  currentProgrammeSelectedDuration = plan.estimated_duration_min || 45;

  const schedule = plan.schedule || [];

  const modal = document.createElement("div");
  modal.id = "modal-workout-programme";
  modal.className = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto";

  modal.innerHTML = `
    <div class="calora-card max-w-2xl w-full p-5 sm:p-6 space-y-5 border-emerald-500/30 shadow-2xl relative my-auto bg-slate-900">
      
      <!-- Modal Header -->
      <div class="flex items-start justify-between border-b border-slate-800 pb-4">
        <div class="space-y-1">
          <div class="flex items-center space-x-2">
            <span class="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">${plan.level} Routine</span>
            <span class="text-xs text-slate-400 font-mono">${plan.days_per_week} Days/Week</span>
          </div>
          <h3 class="text-lg sm:text-xl font-bold text-white">${plan.title}</h3>
          <p class="text-xs text-slate-400">${plan.description}</p>
        </div>
        <button onclick="document.getElementById('modal-workout-programme')?.remove()" class="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-950 border border-slate-800 transition-all">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Programme Metadata Pills -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <span class="text-[10px] text-slate-500 block uppercase font-bold">Goal Focus</span>
          <span class="text-slate-200 font-semibold capitalize">${(plan.goal || 'Fitness').replace('_', ' ')}</span>
        </div>
        <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <span class="text-[10px] text-slate-500 block uppercase font-bold">Est. Duration</span>
          <span class="text-emerald-400 font-mono font-bold">~${plan.estimated_duration_min} min / day</span>
        </div>
        <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 col-span-2">
          <span class="text-[10px] text-slate-500 block uppercase font-bold">Equipment Needed</span>
          <span class="text-slate-200 font-semibold truncate block">${plan.equipment_needed}</span>
        </div>
      </div>

      <!-- Scheduled Days Selector -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <i data-lucide="calendar" class="w-4 h-4 text-emerald-400"></i>
            <span>Programme Schedule (${schedule.length} Training Days)</span>
          </h4>
          <span class="text-[11px] text-slate-400">Click a day to review movements</span>
        </div>

        <div class="flex items-center space-x-2 overflow-x-auto pb-1" id="programme-days-pills">
          ${schedule.map((day, dIdx) => `
            <button type="button" onclick="selectProgrammeDay(${dIdx}, '${plan.id}')" id="programme-day-pill-${dIdx}" class="programme-day-pill px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${dIdx === 0 ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}">
              Day ${day.day_number || (dIdx + 1)}: ${day.title ? day.title.split(':')[0] : 'Routine'}
            </button>
          `).join("")}
        </div>

        <!-- Selected Day's Exercise Breakdown Container -->
        <div id="programme-day-exercises-container" class="space-y-2 max-h-64 overflow-y-auto pr-1">
          <!-- Injected by renderProgrammeDayExercises -->
        </div>
      </div>

      <!-- Duration Selector & Interactive Start Section -->
      <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label class="text-xs font-bold text-white flex items-center space-x-1.5">
              <i data-lucide="timer" class="w-4 h-4 text-emerald-400"></i>
              <span>Select Workout Session Duration</span>
            </label>
            <p class="text-[11px] text-slate-400">Live countdown timer will count down from your selected duration.</p>
          </div>

          <div class="flex items-center space-x-1.5" id="programme-duration-pills">
            ${[20, 30, 45, 60].map(m => `
              <button type="button" onclick="selectProgrammeDuration(${m})" id="programme-dur-pill-${m}" class="programme-dur-pill px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${m === (plan.estimated_duration_min || 45) ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'}">
                ${m}m
              </button>
            `).join("")}
            <div class="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <input type="number" id="programme-custom-dur" min="5" max="180" value="${plan.estimated_duration_min || 45}" oninput="selectProgrammeCustomDuration(this.value)" class="w-12 bg-transparent text-xs text-white font-mono font-bold focus:outline-none">
              <span class="text-[10px] text-slate-400">min</span>
            </div>
          </div>
        </div>

        <!-- Launch Button -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <button onclick="document.getElementById('modal-workout-programme')?.remove()" class="text-xs text-slate-400 hover:text-white font-semibold">
            Close
          </button>
          <button onclick="launchLiveWorkoutFromProgramme('${plan.id}')" class="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all">
            <i data-lucide="play" class="w-4 h-4 fill-slate-950"></i>
            <span>Start Workout with Live Tracker</span>
          </button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modal);
  renderProgrammeDayExercises(0, plan);
  lucide.createIcons();
}

function selectProgrammeDay(dayIndex, planId) {
  currentProgrammeSelectedDayIndex = dayIndex;
  const plan = window._workoutPlansMap?.[planId];
  if (!plan) return;

  document.querySelectorAll(".programme-day-pill").forEach((pill, idx) => {
    if (idx === dayIndex) {
      pill.className = "programme-day-pill px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20";
    } else {
      pill.className = "programme-day-pill px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border bg-slate-950 text-slate-400 border-slate-800 hover:text-white";
    }
  });

  renderProgrammeDayExercises(dayIndex, plan);
}

function renderProgrammeDayExercises(dayIndex, plan) {
  const container = document.getElementById("programme-day-exercises-container");
  if (!container) return;

  const day = (plan.schedule && plan.schedule[dayIndex]) ? plan.schedule[dayIndex] : null;
  if (!day || !day.exercises || day.exercises.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-500">Rest or active recovery day.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
      <span>${day.title || `Day ${dayIndex + 1}`}</span>
      <span class="text-[10px] text-slate-400">${day.exercises.length} Exercises Planned</span>
    </div>
    <div class="space-y-2">
      ${day.exercises.map((ex, eIdx) => `
        <div class="bg-slate-950/80 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between text-xs">
          <div class="space-y-0.5">
            <div class="flex items-center space-x-2">
              <span class="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 text-[10px] font-mono font-bold flex items-center justify-center">${eIdx + 1}</span>
              <span class="font-bold text-white">${ex.name}</span>
            </div>
            <div class="text-[11px] text-slate-400 pl-7">
              Target: <strong class="text-slate-200 font-mono">${ex.sets || 3} sets × ${ex.reps || 12} reps</strong>
              ${ex.rest_sec ? ` · Rest: <span class="text-emerald-400 font-mono">${ex.rest_sec}s</span>` : ''}
            </div>
          </div>
          <span class="badge-high text-[10px] px-2 py-0.5 rounded-full font-bold">Planned</span>
        </div>
      `).join("")}
    </div>
  `;
}

function selectProgrammeDuration(min) {
  currentProgrammeSelectedDuration = parseInt(min) || 45;
  document.querySelectorAll(".programme-dur-pill").forEach(p => {
    p.className = "programme-dur-pill px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border bg-slate-900 text-slate-300 border-slate-800 hover:text-white";
  });
  const activePill = document.getElementById(`programme-dur-pill-${min}`);
  if (activePill) {
    activePill.className = "programme-dur-pill px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border bg-emerald-500 text-slate-950 border-emerald-400";
  }
  const customInput = document.getElementById("programme-custom-dur");
  if (customInput) customInput.value = min;
}

function selectProgrammeCustomDuration(val) {
  const m = parseInt(val) || 45;
  currentProgrammeSelectedDuration = m;
  document.querySelectorAll(".programme-dur-pill").forEach(p => {
    p.className = "programme-dur-pill px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border bg-slate-900 text-slate-300 border-slate-800 hover:text-white";
  });
}

function launchLiveWorkoutFromProgramme(planId) {
  const plan = window._workoutPlansMap?.[planId];
  if (!plan) return;

  const day = (plan.schedule && plan.schedule[currentProgrammeSelectedDayIndex]) ? plan.schedule[currentProgrammeSelectedDayIndex] : null;
  const routineTitle = day ? `${plan.title} - ${day.title || `Day ${currentProgrammeSelectedDayIndex + 1}`}` : plan.title;

  let exerciseItems = [];
  if (day && day.exercises && day.exercises.length > 0) {
    exerciseItems = day.exercises.map(e => {
      const setsCount = parseInt(e.sets) || 3;
      const sets = [];
      for (let s = 1; s <= setsCount; s++) {
        sets.push({ reps: e.reps || 12, weight_kg: 0, completed: false });
      }
      return {
        name: e.name || "Exercise",
        muscle: e.muscle_group || "Compound",
        rest_sec: e.rest_sec || 60,
        sets: sets
      };
    });
  } else {
    exerciseItems = [
      { name: "Bodyweight Squats", muscle: "Quads & Glutes", sets: [{ reps: 15, completed: false }, { reps: 15, completed: false }, { reps: 15, completed: false }] },
      { name: "Push-ups (Standard / Incline)", muscle: "Chest & Triceps", sets: [{ reps: 12, completed: false }, { reps: 12, completed: false }, { reps: 12, completed: false }] },
      { name: "Reverse Lunges", muscle: "Hamstrings & Glutes", sets: [{ reps: 12, completed: false }, { reps: 12, completed: false }, { reps: 12, completed: false }] },
      { name: "Plank Hold", muscle: "Core Stabilizers", sets: [{ reps: "45 sec", completed: false }, { reps: "45 sec", completed: false }, { reps: "45 sec", completed: false }] }
    ];
  }

  // Close programme modal
  const progModal = document.getElementById("modal-workout-programme");
  if (progModal) progModal.remove();

  // Launch live tracker with chosen duration!
  openActiveWorkoutModal(routineTitle, currentProgrammeSelectedDuration, exerciseItems, plan.id);
}

function startWorkoutFromPlanById(planId) {
  openWorkoutProgrammeModal(planId);
}
window.startWorkoutFromPlanById = startWorkoutFromPlanById;
window.openWorkoutProgrammeModal = openWorkoutProgrammeModal;
window.selectProgrammeDay = selectProgrammeDay;
window.selectProgrammeDuration = selectProgrammeDuration;
window.selectProgrammeCustomDuration = selectProgrammeCustomDuration;
window.launchLiveWorkoutFromProgramme = launchLiveWorkoutFromProgramme;

async function filterExercises() {
  const container = document.getElementById("exercises-library-container");
  if (!container) return;

  const mg = document.getElementById("exercise-muscle-filter") ? document.getElementById("exercise-muscle-filter").value : "all";
  const eq = document.getElementById("exercise-equip-filter") ? document.getElementById("exercise-equip-filter").value : "all";
  const search = document.getElementById("exercise-search-input") ? document.getElementById("exercise-search-input").value : "";

  let exercises = null;
  try {
    exercises = await apiCall(`/api/workouts/exercises?muscle_group=${mg}&equipment=${eq}&search=${encodeURIComponent(search)}`);
    if (!Array.isArray(exercises)) exercises = null;
  } catch (err) {
    console.warn("Exercises API unavailable, filtering local verified exercises:", err.message);
  }

  if (!exercises) {
    let allEx = window.CALORA_VERIFIED_EXERCISES || [];
    if (mg !== "all") {
      allEx = allEx.filter(e => (e.muscle_group || "").toLowerCase() === mg.toLowerCase());
    }
    if (eq !== "all") {
      allEx = allEx.filter(e => (e.equipment || "").toLowerCase() === eq.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allEx = allEx.filter(e =>
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.muscle_group && e.muscle_group.toLowerCase().includes(q)) ||
        (e.equipment && e.equipment.toLowerCase().includes(q)) ||
        (e.form_cues && e.form_cues.toLowerCase().includes(q)) ||
        (e.kenyan_context && e.kenyan_context.toLowerCase().includes(q))
      );
    }
    exercises = allEx;
  }

  try {
    window._exercisesMap = window._exercisesMap || {};
    exercises.forEach(ex => window._exercisesMap[ex.id] = ex);

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
          <button onclick="logSingleExerciseQuickById('${ex.id}')" class="text-emerald-400 hover:underline font-bold">
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

function logSingleExerciseQuickById(exId) {
  const ex = window._exercisesMap?.[exId];
  if (ex) logSingleExerciseQuick(ex.name);
}
window.logSingleExerciseQuickById = logSingleExerciseQuickById;

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
        <button onclick="document.getElementById('modal-workout-logger')?.remove()" class="p-1 text-slate-400 hover:text-white">
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
          <button onclick="document.getElementById('modal-workout-logger')?.remove()" class="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
          <button onclick="submitWorkoutLog()" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs">Save Session</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  lucide.createIcons();
}

// ----------------------------------------------------
// 3. INTERACTIVE LIVE WORKOUT RUNNER WITH COUNTDOWN TIMER
// ----------------------------------------------------

let activeWorkoutState = {
  timer: null,
  initialSeconds: 45 * 60,
  secondsLeft: 45 * 60,
  isPaused: false,
  routineTitle: "Custom Workout Session",
  planId: null,
  exercises: [],
  completedSetsCount: 0,
  totalSetsCount: 0
};

function formatTimerMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function startWorkoutFromPlan(plan) {
  let routineTitle = plan ? (plan.title || "Workout Session") : "Full Body Session";
  let planId = plan ? plan.id : null;
  let durationMin = (plan && plan.estimated_duration_min) ? plan.estimated_duration_min : 45;

  let exerciseItems = [];
  if (plan && plan.schedule && plan.schedule[0] && plan.schedule[0].exercises) {
    exerciseItems = plan.schedule[0].exercises.map(e => ({
      name: e.name || "Exercise",
      muscle: e.muscle_group || "Full Body",
      sets: [
        { reps: 12, weight_kg: 0, completed: false },
        { reps: 12, weight_kg: 0, completed: false },
        { reps: 12, weight_kg: 0, completed: false }
      ]
    }));
  }

  if (exerciseItems.length === 0) {
    exerciseItems = [
      { name: "Bodyweight Squats", muscle: "Quads & Glutes", sets: [{ reps: 15, completed: false }, { reps: 15, completed: false }, { reps: 15, completed: false }] },
      { name: "Push-ups (Standard / Incline)", muscle: "Chest & Triceps", sets: [{ reps: 12, completed: false }, { reps: 12, completed: false }, { reps: 12, completed: false }] },
      { name: "Reverse Lunges", muscle: "Hamstrings & Glutes", sets: [{ reps: 12, completed: false }, { reps: 12, completed: false }, { reps: 12, completed: false }] },
      { name: "Plank Hold", muscle: "Core Stabilizers", sets: [{ reps: "45 sec", completed: false }, { reps: "45 sec", completed: false }, { reps: "45 sec", completed: false }] }
    ];
  }

  openActiveWorkoutModal(routineTitle, durationMin, exerciseItems, planId);
}

function openActiveWorkoutModal(routineTitle, durationMin, exerciseItems, planId = null) {
  // Clear any existing timer
  if (activeWorkoutState.timer) {
    clearInterval(activeWorkoutState.timer);
  }

  const totalSec = durationMin * 60;
  let totalSets = 0;
  exerciseItems.forEach(e => totalSets += (e.sets ? e.sets.length : 3));

  activeWorkoutState = {
    timer: null,
    initialSeconds: totalSec,
    secondsLeft: totalSec,
    isPaused: false,
    routineTitle: routineTitle,
    planId: planId,
    exercises: exerciseItems,
    completedSetsCount: 0,
    totalSetsCount: totalSets
  };

  const existing = document.getElementById("modal-active-workout");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "modal-active-workout";
  modal.className = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto";

  modal.innerHTML = `
    <div class="calora-card max-w-xl w-full p-6 space-y-6 border-emerald-500/40 shadow-2xl relative my-auto">
      
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div class="flex items-center space-x-2.5">
          <div class="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
            <i data-lucide="play" class="w-5 h-5 fill-slate-950"></i>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h3 class="text-base sm:text-lg font-bold text-white">${routineTitle}</h3>
              <span id="active-workout-status-badge" class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Active</span>
            </div>
            <p class="text-xs text-slate-400">Live Kinetic Session · Real-Time Countdown</p>
          </div>
        </div>
        <button onclick="confirmExitActiveWorkout()" class="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 transition-all">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Big Live Countdown Timer Display -->
      <div class="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-emerald-500/30 text-center space-y-3">
        <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Time Remaining</span>
        
        <div id="active-workout-timer-text" class="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-lg">
          ${formatTimerMMSS(totalSec)}
        </div>

        <!-- Progress bar -->
        <div class="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div id="active-workout-progress-bar" class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-1000" style="width: 100%;"></div>
        </div>

        <!-- Timer Controls (Play/Pause, +1m, -1m) -->
        <div class="flex items-center justify-center space-x-3 pt-2">
          <button onclick="adjustActiveWorkoutTime(-60)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-700 transition-all">
            -1 Min
          </button>
          
          <button id="active-workout-pause-btn" onclick="togglePauseActiveWorkout()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2 rounded-xl text-sm flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition-all">
            <i id="active-workout-pause-icon" data-lucide="pause" class="w-4 h-4 fill-slate-950"></i>
            <span id="active-workout-pause-text">Pause</span>
          </button>

          <button onclick="adjustActiveWorkoutTime(60)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-700 transition-all">
            +1 Min
          </button>
        </div>
      </div>

      <!-- Exercise Circuit Checklist -->
      <div class="space-y-3">
        <div class="flex items-center justify-between text-xs">
          <h4 class="font-bold text-white flex items-center space-x-1.5">
            <i data-lucide="dumbbell" class="w-4 h-4 text-emerald-400"></i>
            <span>Circuit Exercise Checklist</span>
          </h4>
          <span id="active-workout-sets-counter" class="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
            0 / ${totalSets} sets done
          </span>
        </div>

        <div class="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          ${exerciseItems.map((ex, exIdx) => `
            <div class="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white">${ex.name}</span>
                <span class="text-[10px] text-slate-400">${ex.muscle || 'Compound'}</span>
              </div>
              <div class="flex flex-wrap gap-2">
                ${(ex.sets || [{}, {}, {}]).map((s, sIdx) => `
                  <button type="button" onclick="toggleSetCompletion(${exIdx}, ${sIdx}, this)" id="set-btn-${exIdx}-${sIdx}" class="text-xs px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-500 transition-all flex items-center space-x-1">
                    <i data-lucide="circle" class="w-3.5 h-3.5 text-slate-500"></i>
                    <span>Set ${sIdx + 1} (${s.reps || 12} reps)</span>
                  </button>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Notes / RPE Rating -->
      <div class="space-y-1">
        <label class="text-xs font-semibold text-slate-300">Session Notes & RPE Exertion (Optional)</label>
        <input type="text" id="active-workout-notes" placeholder="e.g. Great pace, kept rest to 60s, finished strong" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-2 border-t border-slate-800">
        <button onclick="confirmExitActiveWorkout()" class="text-xs text-slate-400 hover:text-red-400 font-semibold px-2 py-1">
          Discard
        </button>
        <button onclick="finishAndLogActiveWorkout()" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all">
          <i data-lucide="check-circle" class="w-4 h-4"></i>
          <span>Complete & Log Workout</span>
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modal);
  lucide.createIcons();

  // Start live interval countdown
  activeWorkoutState.timer = setInterval(() => {
    if (!activeWorkoutState.isPaused) {
      activeWorkoutState.secondsLeft--;
      
      const timerEl = document.getElementById("active-workout-timer-text");
      const progEl = document.getElementById("active-workout-progress-bar");
      
      if (timerEl) {
        timerEl.textContent = formatTimerMMSS(Math.max(0, activeWorkoutState.secondsLeft));
      }
      if (progEl) {
        const pct = Math.max(0, (activeWorkoutState.secondsLeft / activeWorkoutState.initialSeconds) * 100);
        progEl.style.width = `${pct}%`;
      }

      if (activeWorkoutState.secondsLeft <= 0) {
        clearInterval(activeWorkoutState.timer);
        activeWorkoutState.timer = null;
        if (timerEl) timerEl.textContent = "00:00";
        showToast("Time is up! Outstanding work completing your session!", "success");
      }
    }
  }, 1000);
}

function togglePauseActiveWorkout() {
  activeWorkoutState.isPaused = !activeWorkoutState.isPaused;
  const btnText = document.getElementById("active-workout-pause-text");
  const btnIcon = document.getElementById("active-workout-pause-icon");
  const statusBadge = document.getElementById("active-workout-status-badge");

  if (activeWorkoutState.isPaused) {
    if (btnText) btnText.textContent = "Continue";
    if (btnIcon) btnIcon.setAttribute("data-lucide", "play");
    if (statusBadge) {
      statusBadge.textContent = "PAUSED";
      statusBadge.className = "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse";
    }
    showToast("Workout paused. Take a breath and press Continue when ready!", "info");
  } else {
    if (btnText) btnText.textContent = "Pause";
    if (btnIcon) btnIcon.setAttribute("data-lucide", "pause");
    if (statusBadge) {
      statusBadge.textContent = "ACTIVE";
      statusBadge.className = "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
    }
    showToast("Resuming countdown timer!", "success");
  }
  lucide.createIcons();
}

function adjustActiveWorkoutTime(deltaSec) {
  activeWorkoutState.secondsLeft = Math.max(10, activeWorkoutState.secondsLeft + deltaSec);
  if (activeWorkoutState.secondsLeft > activeWorkoutState.initialSeconds) {
    activeWorkoutState.initialSeconds = activeWorkoutState.secondsLeft;
  }
  const timerEl = document.getElementById("active-workout-timer-text");
  if (timerEl) {
    timerEl.textContent = formatTimerMMSS(activeWorkoutState.secondsLeft);
  }
}

function toggleSetCompletion(exIdx, sIdx, btnEl) {
  const isDone = btnEl.classList.contains("set-completed");
  if (isDone) {
    btnEl.classList.remove("set-completed", "bg-emerald-500", "text-slate-950", "font-bold", "border-emerald-400", "line-through");
    btnEl.classList.add("bg-slate-950", "text-slate-300", "border-slate-700");
    btnEl.innerHTML = `<i data-lucide="circle" class="w-3.5 h-3.5 text-slate-500"></i><span>Set ${sIdx + 1}</span>`;
    activeWorkoutState.completedSetsCount = Math.max(0, activeWorkoutState.completedSetsCount - 1);
  } else {
    btnEl.classList.add("set-completed", "bg-emerald-500", "text-slate-950", "font-bold", "border-emerald-400", "line-through");
    btnEl.classList.remove("bg-slate-950", "text-slate-300", "border-slate-700");
    btnEl.innerHTML = `<i data-lucide="check-circle-2" class="w-3.5 h-3.5 fill-slate-950 text-emerald-400"></i><span>Set ${sIdx + 1} Done</span>`;
    activeWorkoutState.completedSetsCount++;
  }

  const counter = document.getElementById("active-workout-sets-counter");
  if (counter) {
    counter.textContent = `${activeWorkoutState.completedSetsCount} / ${activeWorkoutState.totalSetsCount} sets done`;
  }
  lucide.createIcons();
}

async function finishAndLogActiveWorkout() {
  if (activeWorkoutState.timer) {
    clearInterval(activeWorkoutState.timer);
    activeWorkoutState.timer = null;
  }

  // Calculate actual elapsed minutes
  const elapsedSec = Math.max(60, activeWorkoutState.initialSeconds - activeWorkoutState.secondsLeft);
  const elapsedMin = Math.max(1, Math.round(elapsedSec / 60));

  const notesInput = document.getElementById("active-workout-notes");
  const notes = notesInput ? notesInput.value.trim() : "";
  const finalNotes = notes || `Completed ${activeWorkoutState.completedSetsCount}/${activeWorkoutState.totalSetsCount} circuit sets.`;

  try {
    await apiCall("/api/workouts/log", "POST", {
      date: AppState.currentDate,
      routine_name: activeWorkoutState.routineTitle,
      plan_id: activeWorkoutState.planId,
      duration_minutes: elapsedMin,
      exercises: activeWorkoutState.exercises.map(e => ({
        name: e.name,
        sets: [
          { reps: 12, weight_kg: 0, completed: true },
          { reps: 12, weight_kg: 0, completed: true }
        ]
      })),
      notes: finalNotes
    });

    showToast(`Workout logged! ${elapsedMin} minutes completed with ${activeWorkoutState.completedSetsCount} sets finished!`, "success");
    
    const modal = document.getElementById("modal-active-workout");
    if (modal) modal.remove();

    // Reload wellness and dashboard data
    loadWellnessData();
    loadDashboardData();
  } catch (err) {
    showToast(`Failed to log workout: ${err.message}`, "error");
  }
}

function confirmExitActiveWorkout() {
  if (confirm("Are you sure you want to exit and discard this active workout session?")) {
    if (activeWorkoutState.timer) {
      clearInterval(activeWorkoutState.timer);
      activeWorkoutState.timer = null;
    }
    const modal = document.getElementById("modal-active-workout");
    if (modal) modal.remove();
  }
}

// Global window exposure
window.startWorkoutFromPlan = startWorkoutFromPlan;
window.openActiveWorkoutModal = openActiveWorkoutModal;
window.togglePauseActiveWorkout = togglePauseActiveWorkout;
window.adjustActiveWorkoutTime = adjustActiveWorkoutTime;
window.toggleSetCompletion = toggleSetCompletion;
window.finishAndLogActiveWorkout = finishAndLogActiveWorkout;
window.confirmExitActiveWorkout = confirmExitActiveWorkout;
