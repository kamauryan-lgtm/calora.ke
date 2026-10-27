/**
 * CALORA - Core Application State & Navigation
 * Accuracy over assumptions.
 */

const AppState = {
  token: localStorage.getItem("calora_token") || null,
  user: null,
  profile: null,
  currentDate: new Date().toISOString().split("T")[0],
  currentTab: "dashboard",
  currentLogMode: "search"
};

// Configurable API base URL (auto-connects to local backend when served from live-server or dev port)
function getCaloraApiBase() {
  if (window.CALORA_API_BASE) return window.CALORA_API_BASE;
  const stored = localStorage.getItem("calora_api_base");
  if (stored) return stored;

  if (typeof window !== "undefined" && window.location) {
    const protocol = window.location.protocol;
    const port = window.location.port;
    const host = window.location.hostname;
    // When opened directly via file:// or without host, default to local backend
    if (protocol === "file:" || !host) {
      return "http://127.0.0.1:8000";
    }
    // When served from local dev server (e.g. Live Server on 5500, Vite on 5173, etc.)
    if ((host === "localhost" || host === "127.0.0.1") && port && port !== "8000") {
      return `http://${host}:8000`;
    }
  }
  return "";
}
const API_BASE = getCaloraApiBase();

// API Helper with automatic JWT header and robust non-JSON / HTML response protection
async function apiCall(endpoint, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (AppState.token) {
    headers["Authorization"] = `Bearer ${AppState.token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      // Clear rejected / invalid / dummy token and attempt seamless re-login
      AppState.token = null;
      localStorage.removeItem("calora_token");
      try {
        await instantDemoLogin("user", false);
        if (AppState.token && AppState.token !== "demo_token_calora") {
          return apiCall(endpoint, method, body);
        }
      } catch (_) {}
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      let errMsg = `Request failed (${res.status} ${res.statusText})`;
      if (isJson) {
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (_) {}
      } else {
        const text = await res.text();
        if (text.trim().startsWith("<")) {
          // Static server or SPA fallback returned HTML instead of API data
          errMsg = `CALORA backend server is unavailable at ${API_BASE || 'http://127.0.0.1:8000'}. The server returned an HTML error page (${res.status}). Verify the backend is running with 'python run.py'.`;
        } else if (text) {
          errMsg = text.slice(0, 150);
        }
      }
      throw new Error(errMsg);
    }

    // Response is OK (status 200-299), but verify it's actual JSON and not an HTML SPA fallback
    if (!isJson) {
      const text = await res.text();
      if (text.trim().startsWith("<")) {
        throw new Error(`CALORA backend server is unavailable at ${API_BASE || 'http://127.0.0.1:8000'}. Received HTML SPA fallback. Verify the backend is running with 'python run.py'.`);
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON returned from ${endpoint}: ${text.slice(0, 80)}`);
      }
    }

    return await res.json();
  } catch (err) {
    console.error("API error:", err);
    if (err.name === "TypeError" && (err.message.includes("fetch") || err.message.includes("NetworkError"))) {
      throw new Error(`Cannot connect to CALORA backend at ${API_BASE || 'http://127.0.0.1:8000'}. Ensure 'python run.py' is running.`);
    }
    throw err;
  }
}

// Toast notification helper
function showToast(message, type = "info") {
  const existing = document.getElementById("calora-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "calora-toast";
  toast.className = `fixed bottom-20 md:bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl transition-all flex items-center space-x-2 ${
    type === "error" ? "bg-red-950 text-red-200 border border-red-700" :
    type === "success" ? "bg-emerald-950 text-emerald-300 border border-emerald-700" :
    "bg-slate-900 text-slate-200 border border-slate-700"
  }`;
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal Helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("hidden");
    lucide.createIcons();
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function openAuthModal() {
  openModal("modal-auth");
}

function openQuickAddModal() {
  openModal("modal-quick-add");
}

// ----------------------------------------------------
// SHOW / HIDE PASSWORD TOGGLE HELPER
// ----------------------------------------------------
function togglePasswordVisibility(inputId, toggleBtnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(toggleBtnId);
  if (!input) return;

  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  if (btn) {
    btn.innerHTML = isPassword 
      ? '<i data-lucide="eye-off" class="w-4 h-4 text-brand-400"></i>'
      : '<i data-lucide="eye" class="w-4 h-4 text-slate-400"></i>';
    lucide.createIcons();
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

// ----------------------------------------------------
// THEME SWITCHER (Dark / Light Mode)
// ----------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem("calora_theme") || "dark";
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.classList.contains("light") ? "light" : "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  showToast(`Switched to ${next === 'dark' ? 'Dark Mode' : 'Light Mode'}`, "info");
}

function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }
  localStorage.setItem("calora_theme", theme);
  const icon = document.getElementById("theme-toggle-icon");
  if (icon) {
    icon.setAttribute("data-lucide", theme === "light" ? "moon" : "sun");
    lucide.createIcons();
  }
}

// ----------------------------------------------------
// PWA SERVICE WORKER REGISTRATION & INSTALL PROMPT
// ----------------------------------------------------
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
      .catch(() => navigator.serviceWorker.register("/static/sw.js"))
      .then(() => console.log("CALORA PWA Service Worker Registered"))
      .catch((err) => console.warn("SW registration failed:", err));
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.deferredInstallPrompt = e;
    const pwaBtn = document.getElementById("pwa-install-btn");
    if (pwaBtn) pwaBtn.classList.remove("hidden");
  });

  window.addEventListener("online", () => {
    showToast("Internet connection restored!", "success");
  });
  window.addEventListener("offline", () => {
    showToast("You are offline. Food logs are cached locally.", "info");
  });
}

function installPWA() {
  if (window.deferredInstallPrompt) {
    window.deferredInstallPrompt.prompt();
    window.deferredInstallPrompt.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        showToast("CALORA installed to your device!", "success");
      }
      window.deferredInstallPrompt = null;
      const pwaBtn = document.getElementById("pwa-install-btn");
      if (pwaBtn) pwaBtn.classList.add("hidden");
    });
  } else {
    showToast("To install CALORA, tap your browser's menu and select 'Add to Home Screen'.", "info");
  }
}

// ----------------------------------------------------
// TAB SWITCHING & ACCESS CONTROL
// ----------------------------------------------------
function switchTab(tabId) {
  // Enforce strict admin access: Only admin can see and enter the admin dashboard
  if (tabId === "admin") {
    if (!AppState.user || AppState.user.role !== "admin") {
      showToast("Access restricted: Administrator privileges required.", "error");
      return;
    }
  }

  AppState.currentTab = tabId;

  // Toggle tab contents
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.add("hidden"));
  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.remove("hidden");

  // Update desktop navigation buttons
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.className = "nav-tab-btn px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-400 hover:text-slate-200 flex items-center space-x-1.5";
  });
  const activeDesktopBtn = document.getElementById(`nav-btn-${tabId}`);
  if (activeDesktopBtn) {
    activeDesktopBtn.className = "nav-tab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-brand-400 bg-slate-800 flex items-center space-x-1.5";
  }

  // Update mobile bottom nav buttons
  document.querySelectorAll(".mobile-tab-btn").forEach(btn => {
    btn.className = "mobile-tab-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200";
  });
  const activeMobBtn = document.getElementById(`mob-nav-${tabId}`);
  if (activeMobBtn) {
    activeMobBtn.className = "mobile-tab-btn flex flex-col items-center justify-center text-brand-400 font-bold";
  }

  // Tab-specific load triggers
  if (tabId === "dashboard") loadDashboardData();
  else if (tabId === "foodlog") initFoodLogView();
  else if (tabId === "history") loadHistoryModule();
  else if (tabId === "progress") loadProgressData();
  else if (tabId === "recipes") loadRecipesData();
  else if (tabId === "assistant") loadAssistantContext();
  else if (tabId === "gyms") loadGymPartnerModule();
  else if (tabId === "wellness") loadWellnessData();
  else if (tabId === "workouts") loadWorkoutsData();
  else if (tabId === "profile") loadProfileForm();
  else if (tabId === "admin") loadAdminDashboard();

  lucide.createIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Sub-tab switcher inside Log Food
function switchLogMode(modeId) {
  AppState.currentLogMode = modeId;

  document.querySelectorAll("[id^='logmode-']").forEach(el => {
    if (el.id !== "logmode-btn-" + modeId) el.classList.add("hidden");
  });
  const target = document.getElementById(`logmode-${modeId}`);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".log-subtab-btn").forEach(btn => {
    btn.className = "log-subtab-btn flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-semibold transition-all text-slate-400 hover:text-slate-200 flex items-center justify-center space-x-1.5";
  });
  const active = document.getElementById(`logmode-btn-${modeId}`);
  if (active) {
    active.className = "log-subtab-btn flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition-all bg-slate-800 text-emerald-400 flex items-center justify-center space-x-1.5";
  }

  lucide.createIcons();
}

// Date Management
function setDate(dateStr) {
  AppState.currentDate = dateStr;
  const picker = document.getElementById("current-date-picker");
  if (picker) picker.value = dateStr;
  loadDashboardData();
}

function changeDay(delta) {
  const d = new Date(AppState.currentDate);
  d.setDate(d.getDate() + delta);
  setDate(d.toISOString().split("T")[0]);
}

function resetToToday() {
  setDate(new Date().toISOString().split("T")[0]);
}

function onDateChanged() {
  const val = document.getElementById("current-date-picker").value;
  if (val) setDate(val);
}

// ----------------------------------------------------
// AUTHENTICATION & ADMIN PORTAL
// ----------------------------------------------------
async function instantDemoLogin(role = "user", reload = true) {
  // Prevent demo login into admin
  if (role === "admin") {
    openAdminAuthModal();
    return;
  }

  try {
    const res = await apiCall(`/api/auth/demo-login?role=${role}`, "POST");
    AppState.token = res.token;
    AppState.user = res.user;
    localStorage.setItem("calora_token", res.token);
    closeModal("modal-auth");

    updateUserDisplay();
    showToast(`Signed in as ${res.user.name} (${role})`, "success");

    if (reload) {
      if (role === "gym_owner") switchTab("gyms");
      else switchTab("dashboard");
    }
  } catch (err) {
    console.warn("Demo login API unavailable, initializing offline demo session:", err.message);
    const demoUser = {
      id: "demo_user_1",
      email: "demo@calora.app",
      name: "Ryan (Demo)",
      role: "user"
    };
    AppState.token = "demo_token_calora";
    AppState.user = demoUser;
    localStorage.setItem("calora_token", AppState.token);
    closeModal("modal-auth");
    updateUserDisplay();
    showToast(`Signed in locally as ${demoUser.name}`, "info");

    if (reload) {
      switchTab("dashboard");
    }
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;

  try {
    const res = await apiCall("/api/auth/login", "POST", { email, password });
    AppState.token = res.token;
    AppState.user = res.user;
    localStorage.setItem("calora_token", res.token);
    closeModal("modal-auth");
    updateUserDisplay();
    showToast(`Welcome back, ${res.user.name}!`, "success");

    if (res.user.role === "admin") {
      switchTab("admin");
    } else {
      switchTab("dashboard");
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

function openAdminAuthModal() {
  closeModal("modal-auth");
  openModal("modal-admin-auth");
}
window.openAdminAuthModal = openAdminAuthModal;

async function handleAdminAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("admin-auth-email").value.trim();
  const password = document.getElementById("admin-auth-password").value;

  try {
    const res = await apiCall("/api/auth/login", "POST", { email, password });
    if (res.user.role !== "admin") {
      throw new Error("This account does not have platform administrator access.");
    }

    AppState.token = res.token;
    AppState.user = res.user;
    localStorage.setItem("calora_token", res.token);
    closeModal("modal-admin-auth");
    updateUserDisplay();
    showToast(`Authenticated as Administrator (${res.user.name})`, "success");
    switchTab("admin");
  } catch (err) {
    showToast(err.message, "error");
  }
}
window.handleAdminAuthSubmit = handleAdminAuthSubmit;

function handleSignOut() {
  AppState.token = null;
  AppState.user = null;
  AppState.profile = null;
  localStorage.removeItem("calora_token");
  closeModal("modal-auth");
  closeModal("modal-admin-auth");
  showToast("Signed out successfully.", "info");
  initializeApp();
}
window.handleSignOut = handleSignOut;

function updateUserDisplay() {
  if (AppState.user) {
    const nameEl = document.getElementById("user-display-name");
    const avatarEl = document.getElementById("user-avatar-text");
    const greetingEl = document.getElementById("dash-greeting-name");

    if (nameEl) nameEl.textContent = AppState.user.name;
    if (avatarEl) avatarEl.textContent = AppState.user.name.charAt(0).toUpperCase();
    if (greetingEl) greetingEl.textContent = AppState.user.name;

    // Strict Admin Visibility: Admin tab is ONLY visible to authenticated admins!
    const isAdmin = AppState.user.role === "admin";
    const adminBtn = document.getElementById("nav-btn-admin");
    const adminMobBtn = document.getElementById("mob-nav-admin");
    if (adminBtn) {
      if (isAdmin) {
        adminBtn.classList.remove("hidden");
        adminBtn.className = "nav-tab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-purple-200 bg-purple-900/80 border border-purple-400 flex items-center space-x-1.5 shadow-md shadow-purple-500/20";
      } else {
        adminBtn.classList.add("hidden");
      }
    }
    if (adminMobBtn) {
      if (isAdmin) {
        adminMobBtn.classList.remove("hidden");
      } else {
        adminMobBtn.classList.add("hidden");
      }
    }
  } else {
    const adminBtn = document.getElementById("nav-btn-admin");
    const adminMobBtn = document.getElementById("mob-nav-admin");
    if (adminBtn) adminBtn.classList.add("hidden");
    if (adminMobBtn) adminMobBtn.classList.add("hidden");
  }
}

// ----------------------------------------------------
// FIRST-TIME USER ONBOARDING WIZARD
// ----------------------------------------------------
let currentOnboardingStep = 1;

function openOnboardingModal() {
  currentOnboardingStep = 1;
  setOnboardingStep(1);
  openModal("modal-onboarding");
}
window.openOnboardingModal = openOnboardingModal;

function closeOnboardingModal() {
  localStorage.setItem("calora_onboarding_dismissed", "true");
  closeModal("modal-onboarding");
}
window.closeOnboardingModal = closeOnboardingModal;

function setOnboardingStep(step) {
  currentOnboardingStep = step;
  document.querySelectorAll("[id^='onboard-step-']").forEach(el => el.classList.add("hidden"));
  const target = document.getElementById(`onboard-step-${step}`);
  if (target) target.classList.remove("hidden");

  const progress = document.getElementById("onboard-progress-bar");
  if (progress) {
    progress.style.width = step === 1 ? "33%" : (step === 2 ? "66%" : "100%");
  }
  const badge = document.getElementById("onboard-step-badge");
  if (badge) badge.textContent = `Step ${step} of 3`;

  if (step === 3) {
    recalculateOnboardingPreview();
  }
  lucide.createIcons();
}
window.setOnboardingStep = setOnboardingStep;

function recalculateOnboardingPreview() {
  const age = parseFloat(document.getElementById("onboard-age")?.value) || 24;
  const sex = document.getElementById("onboard-sex")?.value || "male";
  const height = parseFloat(document.getElementById("onboard-height")?.value) || 175;
  const weight = parseFloat(document.getElementById("onboard-weight")?.value) || 80;
  const activity = document.getElementById("onboard-activity")?.value || "moderately_active";
  const goal = document.getElementById("onboard-goal")?.value || "lose";

  // Mifflin-St Jeor formula
  const sexConstant = sex === "male" ? 5 : -161;
  const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + sexConstant);

  const multipliers = {
    sedentary: 1.20,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725
  };
  const tdee = Math.round(bmr * (multipliers[activity] || 1.55));
  let target = tdee;
  if (goal === "lose") target = Math.max(sex === "male" ? 1500 : 1200, tdee - 500);
  else if (goal === "gain") target = tdee + 350;

  const proteinG = Math.round(weight * 2.0);

  const prevEl = document.getElementById("onboard-preview-summary");
  if (prevEl) {
    prevEl.innerHTML = `
      <div class="flex justify-between items-center text-xs text-slate-300">
        <span>BMR (Basal Rate):</span>
        <strong class="font-mono text-white">${bmr} kcal</strong>
      </div>
      <div class="flex justify-between items-center text-xs text-slate-300">
        <span>TDEE (Daily Burn):</span>
        <strong class="font-mono text-emerald-400">${tdee} kcal</strong>
      </div>
      <div class="flex justify-between items-center text-xs text-slate-300">
        <span>Target Daily Intake:</span>
        <strong class="font-mono text-brand-400 text-sm">${target} kcal/day</strong>
      </div>
      <div class="flex justify-between items-center text-xs text-slate-300">
        <span>Target Protein:</span>
        <strong class="font-mono text-white">${proteinG}g/day (2.0g/kg)</strong>
      </div>
    `;
  }
}
window.recalculateOnboardingPreview = recalculateOnboardingPreview;

async function handleOnboardingSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("onboard-name").value.trim();
  const sex = document.getElementById("onboard-sex").value;
  const goal = document.getElementById("onboard-goal").value;
  const age = parseInt(document.getElementById("onboard-age").value) || 24;
  const height_cm = parseFloat(document.getElementById("onboard-height").value) || 175;
  const current_weight_kg = parseFloat(document.getElementById("onboard-weight").value) || 80;
  const goal_weight_kg = parseFloat(document.getElementById("onboard-goal-weight").value) || 72;
  const activity_level = document.getElementById("onboard-activity").value;
  const email = document.getElementById("onboard-email").value.trim();
  const password = document.getElementById("onboard-password").value;

  if (!name || !email || !password) {
    showToast("Please fill in your name, email, and password.", "error");
    return;
  }

  const payload = {
    name,
    email,
    password,
    age,
    sex,
    height_cm,
    current_weight_kg,
    goal_weight_kg,
    activity_level,
    primary_goal: goal,
    deficit_tier: "moderate",
    measurement_system: "metric"
  };

  try {
    const res = await apiCall("/api/auth/register", "POST", payload);
    AppState.token = res.token;
    AppState.user = res.user;
    localStorage.setItem("calora_token", res.token);
    localStorage.setItem("calora_has_account", "true");

    closeModal("modal-onboarding");
    updateUserDisplay();
    showToast(`Welcome to CALORA, ${res.user.name}! Your account is active.`, "success");

    // Fetch full profile and refresh dashboard
    const me = await apiCall("/api/auth/me");
    AppState.user = me.user;
    AppState.profile = me.profile;

    switchTab("dashboard");
  } catch (err) {
    showToast(err.message, "error");
  }
}
window.handleOnboardingSubmit = handleOnboardingSubmit;

// ----------------------------------------------------
// APP INITIALIZATION
// ----------------------------------------------------
async function initializeApp() {
  initTheme();
  registerServiceWorker();

  const picker = document.getElementById("current-date-picker");
  if (picker) picker.value = AppState.currentDate;

  // Check if visitor has account
  const storedToken = localStorage.getItem("calora_token");
  const dismissedOnboarding = localStorage.getItem("calora_onboarding_dismissed");

  if (!storedToken && !dismissedOnboarding) {
    // Show Onboarding wizard to new visitor
    setTimeout(() => {
      openOnboardingModal();
    }, 400);
  }

  try {
    if (!AppState.token) {
      await instantDemoLogin("user", false);
    }
    const me = await apiCall("/api/auth/me");
    AppState.user = me.user;
    AppState.profile = me.profile;
    updateUserDisplay();
  } catch (err) {
    console.warn("Session check failed, falling back to demo session:", err);
    await instantDemoLogin("user", false);
  }

  loadDashboardData();
  lucide.createIcons();

  // Secure admin shortcut trigger for authorized platform administrators (Ctrl+Shift+A or #admin-auth)
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
      e.preventDefault();
      openAdminAuthModal();
    }
  });

  if (window.location.hash === "#admin-portal" || window.location.hash === "#admin-auth") {
    openAdminAuthModal();
  }
}

window.addEventListener("DOMContentLoaded", initializeApp);
