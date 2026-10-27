import os

file_path = os.path.join("static", "js", "wellness_workouts.js")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target1 = """async function fetchWorkoutPlans() {
  const container = document.getElementById("workout-plans-container");
  if (!container) return;

  try {
    const plans = await apiCall("/api/workouts/plans");

    window._workoutPlansMap = window._workoutPlansMap || {};
    plans.forEach(p => window._workoutPlansMap[p.id] = p);"""

replacement1 = """async function fetchWorkoutPlans() {
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
    plans.forEach(p => window._workoutPlansMap[p.id] = p);"""

target2 = """async function openWorkoutProgrammeModal(planId) {
  let plan = window._workoutPlansMap?.[planId];
  if (!plan) {
    try {
      const plans = await apiCall("/api/workouts/plans");
      window._workoutPlansMap = window._workoutPlansMap || {};
      plans.forEach(p => window._workoutPlansMap[p.id] = p);
      plan = window._workoutPlansMap?.[planId];
    } catch (e) {
      showToast("Failed to load workout programme: " + e.message, "error");
      return;
    }
  }"""

replacement2 = """async function openWorkoutProgrammeModal(planId) {
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
  }"""

target3 = """async function filterExercises() {
  const container = document.getElementById("exercises-library-container");
  if (!container) return;

  const mg = document.getElementById("exercise-muscle-filter") ? document.getElementById("exercise-muscle-filter").value : "all";
  const eq = document.getElementById("exercise-equip-filter") ? document.getElementById("exercise-equip-filter").value : "all";
  const search = document.getElementById("exercise-search-input") ? document.getElementById("exercise-search-input").value : "";

  try {
    const exercises = await apiCall(`/api/workouts/exercises?muscle_group=${mg}&equipment=${eq}&search=${encodeURIComponent(search)}`);
    window._exercisesMap = window._exercisesMap || {};
    exercises.forEach(ex => window._exercisesMap[ex.id] = ex);"""

replacement3 = """async function filterExercises() {
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
    exercises.forEach(ex => window._exercisesMap[ex.id] = ex);"""

content_norm = content.replace("\r\n", "\n")
target1_norm = target1.replace("\r\n", "\n")
target2_norm = target2.replace("\r\n", "\n")
target3_norm = target3.replace("\r\n", "\n")

assert target1_norm in content_norm, "target1 not found"
assert target2_norm in content_norm, "target2 not found"
assert target3_norm in content_norm, "target3 not found"

content_norm = content_norm.replace(target1_norm, replacement1.replace("\r\n", "\n"))
content_norm = content_norm.replace(target2_norm, replacement2.replace("\r\n", "\n"))
content_norm = content_norm.replace(target3_norm, replacement3.replace("\r\n", "\n"))

with open(file_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(content_norm.replace("\n", "\r\n"))

print("[SUCCESS] wellness_workouts.js updated with offline fallbacks!")
