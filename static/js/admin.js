/**
 * CALORA - Admin Dashboard & Verification Console
 * Accuracy over assumptions.
 */

async function loadAdminDashboard() {
  await Promise.all([
    loadAdminStats(),
    loadAdminReports()
  ]);
}

// ----------------------------------------------------
// 1. SYSTEM STATS & DATABASE HEALTH (Section 36)
// ----------------------------------------------------

async function loadAdminStats() {
  const container = document.getElementById("admin-stats-container");
  if (!container) return;

  try {
    const stats = await apiCall("/api/admin/stats");

    container.innerHTML = `
      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">Verified Foods</span>
        <div class="text-2xl font-black text-brand-400">${stats.verified_foods} <span class="text-xs text-slate-500 font-normal">/ ${stats.total_foods} total</span></div>
        <span class="text-[10px] text-slate-400">KFCT, USDA & Verified Labels</span>
      </div>

      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">Pending Reports</span>
        <div class="text-2xl font-black text-amber-400">${stats.pending_reports}</div>
        <span class="text-[10px] text-slate-400">User error reports awaiting audit</span>
      </div>

      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">Registered Users</span>
        <div class="text-2xl font-black text-white">${stats.total_users}</div>
        <span class="text-[10px] text-slate-400">Active nutrition profiles</span>
      </div>

      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">Total Meal Entries</span>
        <div class="text-2xl font-black text-white">${stats.total_logged_items}</div>
        <span class="text-[10px] text-slate-400">Dietary logs recorded</span>
      </div>
    `;

    // Render Recent Audits
    const auditContainer = document.getElementById("admin-audit-logs");
    if (auditContainer) {
      if (stats.recent_audits.length === 0) {
        auditContainer.innerHTML = `<p class="text-slate-500 py-2">No administrative modifications recorded yet.</p>`;
      } else {
        auditContainer.innerHTML = stats.recent_audits.map(a => `
          <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-brand-400 font-semibold">[${a.action}]</span>
              <span class="text-slate-300 ml-1">${a.details || ''}</span>
            </div>
            <span class="text-slate-500 text-[10px]">${a.created_at.substring(0, 16).replace('T', ' ')}</span>
          </div>
        `).join("");
      }
    }

  } catch (err) {
    container.innerHTML = `<div class="col-span-4 p-4 text-xs text-red-400">Error loading admin stats: ${err.message}</div>`;
  }
}


// ----------------------------------------------------
// 2. USER ERROR REPORTS QUEUE (Section 37)
// ----------------------------------------------------

async function loadAdminReports() {
  const container = document.getElementById("admin-reports-list");
  if (!container) return;

  const filterSelect = document.getElementById("admin-report-filter");
  const statusFilter = filterSelect ? filterSelect.value : "pending";

  try {
    const reports = await apiCall(`/api/admin/reports?status=${statusFilter}`);

    if (reports.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">No reports found for filter "${statusFilter}".</div>`;
      return;
    }

    container.innerHTML = reports.map(r => `
      <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-white text-sm">${r.food_name}</span>
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'badge-medium' : 'badge-high'}">
              ${r.status}
            </span>
          </div>
          <span class="text-[10px] text-slate-500 font-mono">${r.created_at.substring(0, 10)}</span>
        </div>

        <div class="text-xs text-slate-300">
          <span class="text-amber-400 font-semibold block">Issue: ${r.issue_type.replace('_', ' ')}</span>
          <p class="text-slate-400 italic mt-0.5">"${r.user_notes}"</p>
        </div>

        ${r.admin_response ? `
          <div class="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-brand-300">
            <strong>Admin Action:</strong> ${r.admin_response}
          </div>
        ` : `
          <div class="flex items-center space-x-2 pt-1">
            <input type="text" id="admin-resp-${r.id}" placeholder="Admin resolution note..." class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white">
            <button onclick="resolveReport('${r.id}', 'resolved')" class="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs">Resolve</button>
            <button onclick="resolveReport('${r.id}', 'investigated')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-xs border border-slate-700">Investigate</button>
          </div>
        `}
      </div>
    `).join("");

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-4 text-xs text-red-400">Error: ${err.message}</div>`;
  }
}

async function resolveReport(reportId, status) {
  const input = document.getElementById(`admin-resp-${reportId}`);
  const resp = input ? input.value.trim() : "Verified and updated nutritional records";

  try {
    await apiCall(`/api/admin/reports/${reportId}/status`, "POST", {
      status: status,
      admin_response: resp || "Verified by CALORA nutritionist"
    });

    showToast(`Report marked as ${status}!`, "success");
    loadAdminDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}


// ----------------------------------------------------
// 3. PROFILE SETTINGS & LIVE PREVIEW (Section 4 & 5)
// ----------------------------------------------------

async function loadProfileForm() {
  try {
    const prof = await apiCall("/api/profile");
    AppState.profile = prof;

    const nameInput = document.getElementById("prof-name");
    const ageInput = document.getElementById("prof-age");
    const sexSelect = document.getElementById("prof-sex");
    const heightInput = document.getElementById("prof-height");
    const weightInput = document.getElementById("prof-weight");
    const goalWeightInput = document.getElementById("prof-goal-weight");
    const activitySelect = document.getElementById("prof-activity");
    const deficitSelect = document.getElementById("prof-deficit-tier");

    if (nameInput && AppState.user) nameInput.value = AppState.user.name;
    if (ageInput) ageInput.value = prof.age;
    if (sexSelect) sexSelect.value = prof.sex;
    if (heightInput) heightInput.value = prof.height_cm;
    if (weightInput) weightInput.value = prof.current_weight_kg;
    if (goalWeightInput) goalWeightInput.value = prof.goal_weight_kg;
    if (activitySelect) activitySelect.value = prof.activity_level;
    if (deficitSelect) deficitSelect.value = prof.deficit_tier;

    recalculateProfilePreview();
  } catch (err) {
    console.error("Profile load error:", err);
  }
}

async function recalculateProfilePreview() {
  const age = parseInt(document.getElementById("prof-age")?.value, 10) || 20;
  const sex = document.getElementById("prof-sex")?.value || "male";
  const height = parseFloat(document.getElementById("prof-height")?.value) || 175;
  const weight = parseFloat(document.getElementById("prof-weight")?.value) || 80;
  const activity = document.getElementById("prof-activity")?.value || "moderately_active";
  const deficit = document.getElementById("prof-deficit-tier")?.value || "moderate";

  try {
    const res = await apiCall("/api/calculations/preview", "POST", {
      age, sex, height_cm: height, weight_kg: weight,
      activity_level: activity, goal: "lose", deficit_tier: deficit
    });

    const box = document.getElementById("profile-preview-box");
    if (!box) return;

    box.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
          <i data-lucide="calculator" class="w-4 h-4 text-brand-400"></i>
          <span>Live Transparent Calculation Preview</span>
        </h4>
        <span class="text-xs font-mono text-brand-400 font-bold">~${res.target.target_calories} kcal/day Target</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div class="space-y-1">
          <span class="text-slate-400 font-semibold block">Step 1: Basal Metabolic Rate (BMR)</span>
          <p class="text-slate-300 font-mono">${res.bmr.explanation}</p>
        </div>

        <div class="space-y-1">
          <span class="text-slate-400 font-semibold block">Step 2: Total Daily Energy Expenditure (TDEE)</span>
          <p class="text-slate-300 font-mono">${res.tdee.explanation}</p>
          <span class="text-[10px] text-slate-500 italic block">${res.tdee.disclaimer}</span>
        </div>
      </div>

      <!-- Macro distribution target -->
      <div class="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
        <div class="bg-slate-950 p-2 rounded-lg">
          <span class="text-[10px] text-slate-400 block">Protein Target</span>
          <strong class="text-brand-400">${res.target.macros.protein_g}g (${res.target.macros.protein_cal} kcal)</strong>
        </div>
        <div class="bg-slate-950 p-2 rounded-lg">
          <span class="text-[10px] text-slate-400 block">Carbs Target</span>
          <strong class="text-sky-400">${res.target.macros.carbs_g}g (${res.target.macros.carbs_cal} kcal)</strong>
        </div>
        <div class="bg-slate-950 p-2 rounded-lg">
          <span class="text-[10px] text-slate-400 block">Fat Target</span>
          <strong class="text-amber-400">${res.target.macros.fat_g}g (${res.target.macros.fat_cal} kcal)</strong>
        </div>
        <div class="bg-slate-950 p-2 rounded-lg">
          <span class="text-[10px] text-slate-400 block">Fibre Target</span>
          <strong class="text-emerald-400">${res.target.macros.fibre_g}g / day</strong>
        </div>
      </div>

      ${res.target.safety_flag ? `
        <div class="p-3 bg-red-950/40 border border-red-700/60 rounded-xl text-xs text-red-300">
          <strong>Safety Protection Active:</strong> ${res.target.safety_message}
        </div>
      ` : ''}
    `;

    lucide.createIcons();
  } catch (err) {
    console.error("Preview calc error:", err);
  }
}

async function saveProfileSettings(e) {
  e.preventDefault();

  const name = document.getElementById("prof-name").value.trim();
  const age = parseInt(document.getElementById("prof-age").value, 10);
  const sex = document.getElementById("prof-sex").value;
  const height = parseFloat(document.getElementById("prof-height").value);
  const weight = parseFloat(document.getElementById("prof-weight").value);
  const goalWeight = parseFloat(document.getElementById("prof-goal-weight").value);
  const activity = document.getElementById("prof-activity").value;
  const deficit = document.getElementById("prof-deficit-tier").value;

  try {
    await apiCall("/api/profile/update", "POST", {
      name, age, sex, height_cm: height, current_weight_kg: weight,
      goal_weight_kg: goalWeight, activity_level: activity,
      primary_goal: "lose", deficit_tier: deficit
    });

    if (AppState.user) AppState.user.name = name;
    updateUserDisplay();
    showToast("Profile & Deficit Targets Saved!", "success");
    loadDashboardData();
  } catch (err) {
    showToast(err.message, "error");
  }
}
