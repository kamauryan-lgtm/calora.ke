/**
 * CALORA - User Profile & Transparent Deficit Engine
 * Pure mathematical transparency based on Mifflin-St Jeor formula & macronutrient balance.
 */

async function loadProfileForm() {
  try {
    let profile = AppState.profile;
    if (!profile) {
      profile = await apiCall("/api/profile");
      AppState.profile = profile;
    }

    const nameEl = document.getElementById("prof-name");
    const ageEl = document.getElementById("prof-age");
    const sexEl = document.getElementById("prof-sex");
    const heightEl = document.getElementById("prof-height");
    const weightEl = document.getElementById("prof-weight");
    const goalWeightEl = document.getElementById("prof-goal-weight");
    const activityEl = document.getElementById("prof-activity");
    const deficitTierEl = document.getElementById("prof-deficit-tier");

    if (nameEl) nameEl.value = AppState.user ? AppState.user.name : "Client";
    if (ageEl) ageEl.value = profile.age || 20;
    if (sexEl) sexEl.value = profile.sex || "male";
    if (heightEl) heightEl.value = profile.height_cm || 178;
    if (weightEl) weightEl.value = profile.current_weight_kg || 80;
    if (goalWeightEl) goalWeightEl.value = profile.goal_weight_kg || 72;
    if (activityEl) activityEl.value = profile.activity_level || "moderately_active";
    if (deficitTierEl) deficitTierEl.value = profile.deficit_tier || "moderate";

    recalculateProfilePreview();
  } catch (err) {
    console.error("Error loading profile form:", err);
    showToast("Failed to load profile data: " + err.message, "error");
  }
}

function recalculateProfilePreview() {
  const previewBox = document.getElementById("profile-preview-box");
  if (!previewBox) return;

  const age = parseFloat(document.getElementById("prof-age")?.value) || 20;
  const sex = document.getElementById("prof-sex")?.value || "male";
  const height = parseFloat(document.getElementById("prof-height")?.value) || 178;
  const weight = parseFloat(document.getElementById("prof-weight")?.value) || 80;
  const activity = document.getElementById("prof-activity")?.value || "moderately_active";
  const deficitTier = document.getElementById("prof-deficit-tier")?.value || "moderate";

  // 1. Mifflin-St Jeor Formula
  // BMR = (10 * weight) + (6.25 * height) - (5 * age) + (5 for male, -161 for female)
  const sexConstant = sex === "male" ? 5 : -161;
  const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + sexConstant);

  // 2. Activity Multiplier
  const multipliers = {
    sedentary: 1.20,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.90
  };
  const multiplier = multipliers[activity] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  // 3. Deficit Target
  const deficitMap = {
    conservative: 300,
    moderate: 500,
    aggressive: 750
  };
  const deficit = deficitMap[deficitTier] || 500;
  const rawTarget = tdee - deficit;

  // Minimum safety floor: 1,500 kcal for male, 1,200 kcal for female
  const safetyFloor = sex === "male" ? 1500 : 1200;
  const targetCalories = Math.max(safetyFloor, rawTarget);
  const safetyTriggered = rawTarget < safetyFloor;

  // 4. Macro Partitions (Science-backed protein sparing during deficit)
  // Protein: 2.0g per kg of body weight
  const proteinG = Math.round(weight * 2.0);
  const proteinKcal = proteinG * 4;

  // Fat: 0.8g per kg of body weight (healthy hormone & cell function)
  const fatG = Math.round(weight * 0.8);
  const fatKcal = fatG * 9;

  // Carbs: Remaining calories
  const remainingKcal = Math.max(0, targetCalories - proteinKcal - fatKcal);
  const carbsG = Math.round(remainingKcal / 4);

  // Fibre: 14g per 1,000 kcal intake
  const fibreG = Math.round((targetCalories / 1000) * 14);

  previewBox.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div class="flex items-center space-x-2">
        <i data-lucide="calculator" class="w-4 h-4 text-brand-400"></i>
        <h4 class="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Live Calorie & Macro Calculation Audit</h4>
      </div>
      <span class="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
        Mifflin-St Jeor Engine
      </span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
        <span class="text-[10px] text-slate-400 block uppercase font-bold">1. Basal BMR</span>
        <span class="text-lg font-black text-white font-mono">${bmr.toLocaleString()}</span>
        <span class="text-[10px] text-slate-500 block">Resting metabolic burn</span>
      </div>

      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
        <span class="text-[10px] text-slate-400 block uppercase font-bold">2. Maintenance TDEE</span>
        <span class="text-lg font-black text-white font-mono">${tdee.toLocaleString()}</span>
        <span class="text-[10px] text-slate-500 block">At ${multiplier}× activity</span>
      </div>

      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
        <span class="text-[10px] text-slate-400 block uppercase font-bold">3. Calorie Deficit</span>
        <span class="text-lg font-black text-red-400 font-mono">-${deficit}</span>
        <span class="text-[10px] text-slate-500 block">${deficitTier} rate</span>
      </div>

      <div class="bg-slate-950 p-3 rounded-xl border border-brand-500/30 bg-brand-500/5">
        <span class="text-[10px] text-brand-400 block uppercase font-bold">4. Daily Calorie Goal</span>
        <span class="text-lg font-black text-brand-400 font-mono">${targetCalories.toLocaleString()}</span>
        <span class="text-[10px] text-brand-500 block">kcal / day target</span>
      </div>
    </div>

    ${safetyTriggered ? `
      <div class="bg-amber-950/40 border border-amber-600/40 p-2.5 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
        <i data-lucide="shield-alert" class="w-4 h-4 text-amber-400 flex-shrink-0"></i>
        <span><strong>Safety Guard Active:</strong> Calorie floor preserved at ${safetyFloor} kcal to prevent metabolic slowdown.</span>
      </div>
    ` : ''}

    <div class="space-y-1.5 pt-2">
      <span class="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Recommended Macronutrient Partitioning:</span>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
          <span class="text-slate-400">Protein:</span>
          <strong class="text-emerald-400">${proteinG}g <span class="text-[10px] font-normal text-slate-500">(2.0g/kg)</span></strong>
        </div>
        <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
          <span class="text-slate-400">Carbs:</span>
          <strong class="text-sky-400">${carbsG}g <span class="text-[10px] font-normal text-slate-500">(Energy)</span></strong>
        </div>
        <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
          <span class="text-slate-400">Fat:</span>
          <strong class="text-amber-400">${fatG}g <span class="text-[10px] font-normal text-slate-500">(0.8g/kg)</span></strong>
        </div>
        <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
          <span class="text-slate-400">Fibre:</span>
          <strong class="text-teal-400">${fibreG}g <span class="text-[10px] font-normal text-slate-500">(14g/1k)</span></strong>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}

async function saveProfileSettings(event) {
  if (event) event.preventDefault();

  const name = document.getElementById("prof-name")?.value || "";
  const age = parseInt(document.getElementById("prof-age")?.value) || 20;
  const sex = document.getElementById("prof-sex")?.value || "male";
  const height_cm = parseFloat(document.getElementById("prof-height")?.value) || 178;
  const current_weight_kg = parseFloat(document.getElementById("prof-weight")?.value) || 80;
  const goal_weight_kg = parseFloat(document.getElementById("prof-goal-weight")?.value) || 72;
  const activity_level = document.getElementById("prof-activity")?.value || "moderately_active";
  const deficit_tier = document.getElementById("prof-deficit-tier")?.value || "moderate";

  const payload = {
    name,
    age,
    sex,
    height_cm,
    current_weight_kg,
    goal_weight_kg,
    activity_level,
    primary_goal: "lose",
    deficit_tier,
    measurement_system: "metric"
  };

  try {
    const res = await apiCall("/api/profile/update", "POST", payload);

    if (AppState.user && name) {
      AppState.user.name = name;
    }

    // Refresh profile in AppState
    const me = await apiCall("/api/auth/me");
    AppState.user = me.user;
    AppState.profile = me.profile;

    updateUserDisplay();
    showToast("Profile & calorie targets updated successfully!", "success");

    // Refresh dashboard to reflect new targets
    loadDashboardData();
  } catch (err) {
    showToast("Error updating profile: " + err.message, "error");
  }
}

// Global window mappings
window.loadProfileForm = loadProfileForm;
window.recalculateProfilePreview = recalculateProfilePreview;
window.saveProfileSettings = saveProfileSettings;
