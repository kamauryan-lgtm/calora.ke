/**
 * CALORA - Super-Admin Console & Platform Management
 * Restricted exclusively to the Platform Administrator.
 */

let currentAdminSubtab = "overview";

async function loadAdminDashboard() {
  const container = document.getElementById("tab-admin");
  if (!container) return;

  // Strict client-side gate: only admin can view
  if (!AppState.user || AppState.user.role !== "admin") {
    container.innerHTML = `
      <div class="calora-card p-12 text-center max-w-lg mx-auto space-y-4 my-8">
        <div class="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <i data-lucide="shield-alert" class="w-8 h-8"></i>
        </div>
        <h2 class="text-xl font-bold text-white">Access Restricted</h2>
        <p class="text-xs sm:text-sm text-slate-400">
          This dashboard is reserved exclusively for the <strong>CALORA Platform Administrator</strong>.
          Your current account is authenticated as <span class="text-brand-400 font-mono">${AppState.user ? AppState.user.email : 'Guest'}</span> (${AppState.user ? AppState.user.role : 'unauthenticated'}).
        </p>
        <div class="pt-2">
          <button onclick="instantDemoLogin('admin')" class="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all">
            Switch to Admin Demo Account
          </button>
        </div>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  switchAdminSubtab(currentAdminSubtab);
}

function switchAdminSubtab(subtab) {
  currentAdminSubtab = subtab;

  // Update subtab buttons
  document.querySelectorAll(".admin-subtab-btn").forEach(btn => {
    btn.className = "admin-subtab-btn px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 flex items-center space-x-1.5 transition-all";
  });
  const activeBtn = document.getElementById(`adm-subtab-${subtab}`);
  if (activeBtn) {
    activeBtn.className = "admin-subtab-btn px-3 py-2 rounded-xl text-xs font-bold text-brand-400 bg-slate-800 border border-brand-500/30 flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10";
  }

  // Toggle panels
  document.querySelectorAll(".admin-panel").forEach(p => p.classList.add("hidden"));
  const target = document.getElementById(`adm-panel-${subtab}`);
  if (target) target.classList.remove("hidden");

  if (subtab === "overview") loadAdminOverview();
  else if (subtab === "foods") loadAdminFoodDatabase();
  else if (subtab === "plans") loadAdminSubscriptionPlans();
  else if (subtab === "gyms") loadAdminGymWorkspaces();
  else if (subtab === "users") loadAdminUserManagement();
  else if (subtab === "revenue") loadAdminRevenueLedger();
  else if (subtab === "reports") loadAdminReports();
  else if (subtab === "audit") loadAdminAuditTrail();

  lucide.createIcons();
}


// ----------------------------------------------------
// 1. OVERVIEW & PLATFORM KPIS
// ----------------------------------------------------

async function loadAdminOverview() {
  const container = document.getElementById("admin-stats-container");
  if (!container) return;

  try {
    const [stats, rev] = await Promise.all([
      apiCall("/api/admin/stats"),
      apiCall("/api/admin/revenue-overview")
    ]);

    container.innerHTML = `
      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">Verified Foods</span>
        <div class="text-2xl font-black text-brand-400">${stats.verified_foods} <span class="text-xs text-slate-500 font-normal">/ ${stats.total_foods} total</span></div>
        <span class="text-[10px] text-slate-400">Kenya Food Composition Tables & USDA</span>
      </div>

      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">Registered Users</span>
        <div class="text-2xl font-black text-white">${stats.total_users}</div>
        <span class="text-[10px] text-slate-400">Clients, coaches & gym managers</span>
      </div>

      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">SaaS Monthly Recurring</span>
        <div class="text-2xl font-black text-emerald-400">KES ${rev.saas_recurring_revenue_kes.toLocaleString()}</div>
        <span class="text-[10px] text-slate-400">CALORA Software Subscription MRR</span>
      </div>

      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">Gross Gym Package Sales</span>
        <div class="text-2xl font-black text-blue-400">KES ${rev.member_package_gross_volume_kes.toLocaleString()}</div>
        <span class="text-[10px] text-slate-400">Gym-owned member sales (0% pilot commission)</span>
      </div>

      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">Total Meal Entries</span>
        <div class="text-2xl font-black text-white">${stats.total_logged_items}</div>
        <span class="text-[10px] text-slate-400">Verified dietary logs recorded</span>
      </div>

      <div class="calora-card p-4 space-y-1">
        <span class="text-xs text-slate-400 font-medium">Pending Discrepancies</span>
        <div class="text-2xl font-black text-amber-400">${stats.pending_reports}</div>
        <span class="text-[10px] text-slate-400">User portion & nutrient feedback</span>
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="col-span-3 p-4 text-xs text-red-400">Error loading KPIs: ${err.message}</div>`;
  }
}


// ----------------------------------------------------
// 2. FOOD DATABASE MANAGER (Add, Edit, Delete, Verify)
// ----------------------------------------------------

let adminFoodsList = [];

async function loadAdminFoodDatabase() {
  const container = document.getElementById("admin-foods-table-container");
  if (!container) return;

  const searchInput = document.getElementById("admin-food-search");
  const query = searchInput ? searchInput.value.trim() : "";

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading nutritional database...</div>`;
  lucide.createIcons();

  try {
    const url = `/api/admin/foods${query ? `?search=${encodeURIComponent(query)}` : ''}`;
    adminFoodsList = await apiCall(url);

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th class="p-3">Food Name & Source</th>
              <th class="p-3">Category</th>
              <th class="p-3">Calories / 100g</th>
              <th class="p-3">Protein</th>
              <th class="p-3">Carbs</th>
              <th class="p-3">Fat</th>
              <th class="p-3">Fibre</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            ${adminFoodsList.map(f => `
              <tr class="hover:bg-slate-900/50">
                <td class="p-3">
                  <div class="font-bold text-white text-sm">${f.name}</div>
                  <span class="text-[10px] text-slate-400">${f.source || 'Standard Database'}</span>
                </td>
                <td class="p-3 text-slate-300 font-medium">${f.category}</td>
                <td class="p-3 font-mono font-bold text-brand-400">${f.calories_per_100g} kcal</td>
                <td class="p-3 font-mono text-slate-300">${f.protein_per_100g}g</td>
                <td class="p-3 font-mono text-slate-300">${f.carbs_per_100g}g</td>
                <td class="p-3 font-mono text-slate-300">${f.fat_per_100g}g</td>
                <td class="p-3 font-mono text-slate-300">${f.fibre_per_100g}g</td>
                <td class="p-3">
                  <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${f.is_verified ? 'badge-high' : 'badge-medium'}">
                    ${f.is_verified ? 'Verified' : 'Estimated'}
                  </span>
                </td>
                <td class="p-3 text-right space-x-1.5">
                  <button onclick="openEditFoodModal('${f.id}')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs" title="Edit Nutrients">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                  </button>
                  <button onclick="handleDeleteFood('${f.id}', '${f.name.replace(/'/g, "\\'")}')" class="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 rounded-lg text-xs" title="Delete Food Item">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error: ${err.message}</div>`;
  }
}

function openAddFoodModal() {
  openModal("modal-admin-add-food");
}

async function handleCreateFoodSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("adm-add-food-name").value.trim();
  const category = document.getElementById("adm-add-food-cat").value;
  const source = document.getElementById("adm-add-food-src").value.trim() || "Kenya Food Composition Tables (KFCT), 2018";
  const cals = parseFloat(document.getElementById("adm-add-food-cal").value);
  const prot = parseFloat(document.getElementById("adm-add-food-prot").value);
  const carbs = parseFloat(document.getElementById("adm-add-food-carbs").value);
  const fat = parseFloat(document.getElementById("adm-add-food-fat").value);
  const fibre = parseFloat(document.getElementById("adm-add-food-fibre").value);

  try {
    await apiCall("/api/admin/foods", "POST", {
      name, category, source,
      calories_per_100g: cals,
      protein_per_100g: prot,
      carbs_per_100g: carbs,
      fat_per_100g: fat,
      fibre_per_100g: fibre,
      is_verified: 1
    });

    showToast(`Added verified food: "${name}"`, "success");
    closeModal("modal-admin-add-food");
    document.getElementById("form-admin-add-food").reset();
    loadAdminFoodDatabase();
    loadAdminOverview();
  } catch (err) {
    showToast(`Error adding food: ${err.message}`, "error");
  }
}

function openEditFoodModal(foodId) {
  const food = adminFoodsList.find(f => f.id === foodId);
  if (!food) return;

  document.getElementById("adm-edit-food-id").value = food.id;
  document.getElementById("adm-edit-food-name").value = food.name;
  document.getElementById("adm-edit-food-cat").value = food.category;
  document.getElementById("adm-edit-food-cal").value = food.calories_per_100g;
  document.getElementById("adm-edit-food-prot").value = food.protein_per_100g;
  document.getElementById("adm-edit-food-carbs").value = food.carbs_per_100g;
  document.getElementById("adm-edit-food-fat").value = food.fat_per_100g;
  document.getElementById("adm-edit-food-fibre").value = food.fibre_per_100g;
  document.getElementById("adm-edit-food-verified").value = food.is_verified ? "1" : "0";

  openModal("modal-admin-edit-food");
}

async function handleUpdateFoodSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("adm-edit-food-id").value;
  const name = document.getElementById("adm-edit-food-name").value.trim();
  const category = document.getElementById("adm-edit-food-cat").value;
  const cals = parseFloat(document.getElementById("adm-edit-food-cal").value);
  const prot = parseFloat(document.getElementById("adm-edit-food-prot").value);
  const carbs = parseFloat(document.getElementById("adm-edit-food-carbs").value);
  const fat = parseFloat(document.getElementById("adm-edit-food-fat").value);
  const fibre = parseFloat(document.getElementById("adm-edit-food-fibre").value);
  const verified = parseInt(document.getElementById("adm-edit-food-verified").value, 10);

  try {
    await apiCall(`/api/admin/foods/${id}`, "PUT", {
      name, category,
      calories_per_100g: cals,
      protein_per_100g: prot,
      carbs_per_100g: carbs,
      fat_per_100g: fat,
      fibre_per_100g: fibre,
      is_verified: verified
    });

    showToast(`Updated nutrients for "${name}"`, "success");
    closeModal("modal-admin-edit-food");
    loadAdminFoodDatabase();
  } catch (err) {
    showToast(`Error updating food: ${err.message}`, "error");
  }
}

async function handleDeleteFood(foodId, foodName) {
  if (!confirm(`Are you sure you want to permanently delete "${foodName}" from the nutritional database?`)) return;

  try {
    await apiCall(`/api/admin/foods/${foodId}`, "DELETE");
    showToast(`Deleted "${foodName}"`, "info");
    loadAdminFoodDatabase();
    loadAdminOverview();
  } catch (err) {
    showToast(`Error deleting food: ${err.message}`, "error");
  }
}


// ----------------------------------------------------
// 3. SUBSCRIPTION PLANS MANAGER
// ----------------------------------------------------

async function loadAdminSubscriptionPlans() {
  const container = document.getElementById("admin-plans-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading subscription plans...</div>`;
  lucide.createIcons();

  try {
    const plans = await apiCall("/api/gyms/plans");

    container.innerHTML = plans.map(p => {
      let features = [];
      try { features = JSON.parse(p.features_json || "[]"); } catch(e) {}

      return `
        <div class="calora-card p-6 space-y-4 relative">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 class="text-lg font-black text-white">${p.name}</h4>
              <span class="text-xs text-slate-400">ID: ${p.id}</span>
            </div>
            <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Active Tier
            </span>
          </div>

          <div class="space-y-3">
            <div class="space-y-1">
              <label class="text-xs font-semibold text-slate-400">Monthly Price (KES)</label>
              <input type="number" id="plan-price-${p.id}" value="${p.price_kes}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-brand-500">
            </div>

            <div class="space-y-1">
              <label class="text-xs font-semibold text-slate-400">Max Member Capacity</label>
              <input type="number" id="plan-members-${p.id}" value="${p.max_members}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand-500">
            </div>

            <div class="pt-1">
              <span class="text-[11px] font-semibold text-slate-400 block mb-1">Entitlements:</span>
              <ul class="text-xs text-slate-300 space-y-1">
                ${features.map(f => `<li class="flex items-center space-x-1.5"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i><span>${f}</span></li>`).join("")}
              </ul>
            </div>
          </div>

          <button onclick="handleSavePlan('${p.id}')" class="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5">
            <i data-lucide="save" class="w-3.5 h-3.5"></i>
            <span>Update ${p.name} Plan</span>
          </button>
        </div>
      `;
    }).join("");

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error: ${err.message}</div>`;
  }
}

async function handleSavePlan(planId) {
  const price = parseInt(document.getElementById(`plan-price-${planId}`).value, 10);
  const maxMembers = parseInt(document.getElementById(`plan-members-${planId}`).value, 10);

  try {
    await apiCall(`/api/admin/plans/${planId}`, "PUT", {
      price_kes: price,
      max_members: maxMembers,
      is_active: 1
    });

    showToast("Subscription plan updated successfully!", "success");
    loadAdminOverview();
  } catch (err) {
    showToast(`Error saving plan: ${err.message}`, "error");
  }
}


// ----------------------------------------------------
// 4. GYM WORKSPACES MANAGER
// ----------------------------------------------------

async function loadAdminGymWorkspaces() {
  const container = document.getElementById("admin-gyms-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading gym workspaces...</div>`;
  lucide.createIcons();

  try {
    const gyms = await apiCall("/api/admin/gyms");

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th class="p-3">Gym & Slug</th>
              <th class="p-3">Owner Contact</th>
              <th class="p-3">Current Plan</th>
              <th class="p-3">Active Members</th>
              <th class="p-3">Packages</th>
              <th class="p-3">Gross Sales</th>
              <th class="p-3 text-right">Workspace Link</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            ${gyms.map(g => `
              <tr class="hover:bg-slate-900/50">
                <td class="p-3">
                  <div class="font-bold text-white text-sm flex items-center space-x-2">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${g.primary_color || '#10b981'}"></span>
                    <span>${g.name}</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">/workspace/${g.slug}</span>
                </td>
                <td class="p-3">
                  <div class="text-slate-200 font-medium">${g.owner_name || 'Owner'}</div>
                  <span class="text-[10px] text-slate-400">${g.owner_email || '—'}</span>
                </td>
                <td class="p-3 font-semibold text-emerald-400">${g.plan_name || 'Starter'}</td>
                <td class="p-3 font-mono font-bold text-white">${g.active_members} members</td>
                <td class="p-3 text-slate-300 font-mono">${g.packages_count} packages</td>
                <td class="p-3 font-mono font-bold text-brand-400">KES ${(g.gross_package_sales || 0).toLocaleString()}</td>
                <td class="p-3 text-right">
                  <button onclick="switchTab('gyms'); setTimeout(() => switchGymWorkspace('${g.slug}'), 100);" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg text-xs font-semibold border border-slate-700">
                    Open Workspace
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error: ${err.message}</div>`;
  }
}


// ----------------------------------------------------
// 5. USER MANAGEMENT & ROLES
// ----------------------------------------------------

async function loadAdminUserManagement() {
  const container = document.getElementById("admin-users-container");
  if (!container) return;

  const searchInput = document.getElementById("admin-user-search");
  const query = searchInput ? searchInput.value.trim() : "";

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading users...</div>`;
  lucide.createIcons();

  try {
    const url = `/api/admin/users${query ? `?search=${encodeURIComponent(query)}` : ''}`;
    const users = await apiCall(url);

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th class="p-3">User & Email</th>
              <th class="p-3">Current Role</th>
              <th class="p-3">Weight / Goal</th>
              <th class="p-3">Calorie Target</th>
              <th class="p-3">Activity</th>
              <th class="p-3 text-right">Role Management</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            ${users.map(u => `
              <tr class="hover:bg-slate-900/50">
                <td class="p-3">
                  <div class="font-bold text-white text-sm">${u.name}</div>
                  <span class="text-[10px] text-slate-400 font-mono">${u.email}</span>
                </td>
                <td class="p-3">
                  <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    u.role === 'coach' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    u.role === 'gym_owner' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-slate-800 text-slate-300'
                  }">
                    ${u.role}
                  </span>
                </td>
                <td class="p-3 font-mono text-slate-300">
                  ${u.current_weight_kg ? `${u.current_weight_kg} kg -> ${u.goal_weight_kg} kg` : '—'}
                </td>
                <td class="p-3 font-mono font-bold text-brand-400">
                  ${u.target_calories ? `${u.target_calories} kcal` : '—'}
                </td>
                <td class="p-3 text-slate-400">
                  ${u.total_meals_logged} meals · ${u.total_workouts_logged} workouts
                </td>
                <td class="p-3 text-right">
                  <select onchange="handleUserRoleChange('${u.id}', this.value)" class="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none">
                    <option value="client" ${u.role === 'client' ? 'selected' : ''}>Client</option>
                    <option value="coach" ${u.role === 'coach' ? 'selected' : ''}>Coach</option>
                    <option value="gym_owner" ${u.role === 'gym_owner' ? 'selected' : ''}>Gym Owner</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-xs text-red-400 text-center">Error: ${err.message}</div>`;
  }
}

async function handleUserRoleChange(userId, newRole) {
  try {
    await apiCall(`/api/admin/users/${userId}/role`, "PUT", { role: newRole });
    showToast(`Updated user role to ${newRole}!`, "success");
    loadAdminUserManagement();
  } catch (err) {
    showToast(`Error changing role: ${err.message}`, "error");
  }
}


// ----------------------------------------------------
// 6. FINANCIAL SAAS MRR & REVENUE LEDGER
// ----------------------------------------------------

async function loadAdminRevenueLedger() {
  const container = document.getElementById("admin-revenue-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading financial ledger...</div>`;
  lucide.createIcons();

  try {
    const rev = await apiCall("/api/admin/revenue-overview");
    const entries = rev.recent_ledger || [];

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="calora-card p-4 space-y-1">
          <span class="text-xs text-slate-400 font-semibold">CALORA SaaS Subscription MRR</span>
          <div class="text-2xl font-black text-emerald-400">KES ${rev.saas_recurring_revenue_kes.toLocaleString()}</div>
          <span class="text-[10px] text-slate-500">Fixed monthly B2B software revenue</span>
        </div>
        <div class="calora-card p-4 space-y-1">
          <span class="text-xs text-slate-400 font-semibold">Gross Gym Package Volume</span>
          <div class="text-2xl font-black text-blue-400">KES ${rev.member_package_gross_volume_kes.toLocaleString()}</div>
          <span class="text-[10px] text-slate-500">Direct gym sales (segregated from MRR)</span>
        </div>
        <div class="calora-card p-4 space-y-1">
          <span class="text-xs text-slate-400 font-semibold">Pending Settlement Liabilities</span>
          <div class="text-2xl font-black text-amber-400">KES ${rev.pending_settlement_liabilities_kes.toLocaleString()}</div>
          <span class="text-[10px] text-slate-500">Due for payout to partner gyms</span>
        </div>
      </div>

      <div class="calora-card overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase text-slate-300 tracking-wider">Append-Only Revenue Ledger</h4>
          <span class="text-xs text-slate-400 font-mono">${entries.length} recent transactions</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="p-3">Date</th>
                <th class="p-3">Type</th>
                <th class="p-3">Description</th>
                <th class="p-3">Gross Amount</th>
                <th class="p-3">Platform Share</th>
                <th class="p-3">Gym Share</th>
                <th class="p-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono">
              ${entries.map(e => `
                <tr class="hover:bg-slate-900/50">
                  <td class="p-3 text-slate-400 text-[11px]">${e.created_at.substring(0, 16).replace('T', ' ')}</td>
                  <td class="p-3">
                    <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${e.entry_type === 'gym_subscription' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}">
                      ${e.entry_type}
                    </span>
                  </td>
                  <td class="p-3 font-sans text-white text-xs">${e.description}</td>
                  <td class="p-3 font-bold text-white">KES ${e.amount_kes.toLocaleString()}</td>
                  <td class="p-3 font-bold text-emerald-400">KES ${e.platform_share_kes.toLocaleString()}</td>
                  <td class="p-3 text-blue-300">KES ${e.gym_share_kes.toLocaleString()}</td>
                  <td class="p-3 text-[10px] text-slate-400 uppercase">${e.status}</td>
                </tr>
              `).join("")}
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
// 7. USER ERROR REPORTS & AUDIT TRAIL
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
  const resp = input ? input.value.trim() : "Verified against Kenya Food Composition Tables sample weights";

  try {
    await apiCall(`/api/admin/reports/${reportId}/status`, "POST", {
      status: status,
      admin_response: resp || "Verified by CALORA nutritionist"
    });

    showToast(`Report marked as ${status}!`, "success");
    loadAdminReports();
    loadAdminOverview();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadAdminAuditTrail() {
  const container = document.getElementById("admin-audit-logs-container");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400"></i>Loading audit trail...</div>`;
  lucide.createIcons();

  try {
    const logs = await apiCall("/api/admin/audit-logs?limit=50");

    if (logs.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-xs text-slate-500">No administrative audit entries logged yet.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="calora-card divide-y divide-slate-800/60 overflow-hidden">
        ${logs.map(a => `
          <div class="p-3.5 flex items-center justify-between hover:bg-slate-900/50 transition-all text-xs">
            <div>
              <span class="text-emerald-400 font-bold font-mono">[${a.action}]</span>
              <span class="text-slate-200 ml-2">${a.details || ''}</span>
              <div class="text-[10px] text-slate-500 mt-0.5">Target: ${a.target_entity} #${a.target_id} · Admin: #${a.admin_user_id}</div>
            </div>
            <span class="text-slate-500 text-[11px] font-mono">${a.created_at.substring(0, 16).replace('T', ' ')}</span>
          </div>
        `).join("")}
      </div>
    `;

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-4 text-xs text-red-400">Error: ${err.message}</div>`;
  }
}
