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

// API Helper with automatic JWT header
async function apiCall(endpoint, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (AppState.token) {
    headers["Authorization"] = `Bearer ${AppState.token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(endpoint, options);
    if (res.status === 401) {
      if (!AppState.token) {
        await instantDemoLogin("user", false);
        return apiCall(endpoint, method, body);
      }
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "API request failed");
    }
    return data;
  } catch (err) {
    console.error("API error:", err);
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
    navigator.serviceWorker.register("/static/sw.js")
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

// Tab Switching
function switchTab(tabId) {
  AppState.currentTab = tabId;

  // Toggle tab contents
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.add("hidden"));
  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.remove("hidden");

  // Update desktop navigation buttons
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.className = "nav-tab-btn px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-slate-400 hover:text-slate-200 flex items-center space-x-1.5";
  });
  const activeDesktopBtn = document.getElementById(`nav-btn-${tabId}`);
  if (activeDesktopBtn) {
    activeDesktopBtn.className = "nav-tab-btn px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-emerald-400 bg-slate-800 flex items-center space-x-1.5";
  }

  // Update mobile bottom nav buttons
  document.querySelectorAll(".mobile-tab-btn").forEach(btn => {
    btn.className = "mobile-tab-btn flex flex-col items-center justify-center text-slate-400";
  });
  const activeMobBtn = document.getElementById(`mob-nav-${tabId}`);
  if (activeMobBtn) {
    activeMobBtn.className = "mobile-tab-btn flex flex-col items-center justify-center text-emerald-400";
  }

  // Tab-specific load triggers
  if (tabId === "dashboard") loadDashboardData();
  else if (tabId === "foodlog") initFoodLogView();
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

// Authentication
async function instantDemoLogin(role = "user", reload = true) {
  try {
    const res = await apiCall(`/api/auth/demo-login?role=${role}`, "POST");
    AppState.token = res.token;
    AppState.user = res.user;
    localStorage.setItem("calora_token", res.token);
    closeModal("modal-auth");

    updateUserDisplay();
    showToast(`Signed in as ${res.user.name} (${role})`, "success");

    if (reload) {
      if (role === "admin") switchTab("admin");
      else if (role === "gym_owner") switchTab("gyms");
      else switchTab("dashboard");
    }
  } catch (err) {
    showToast(err.message, "error");
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
    switchTab("dashboard");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function updateUserDisplay() {
  if (AppState.user) {
    const nameEl = document.getElementById("user-display-name");
    const avatarEl = document.getElementById("user-avatar-text");
    const greetingEl = document.getElementById("dash-greeting-name");

    if (nameEl) nameEl.textContent = AppState.user.name;
    if (avatarEl) avatarEl.textContent = AppState.user.name.charAt(0).toUpperCase();
    if (greetingEl) greetingEl.textContent = AppState.user.name;

    // Show/hide admin tab button
    const adminBtn = document.getElementById("nav-btn-admin");
    if (adminBtn) {
      if (AppState.user.role === "admin") adminBtn.classList.remove("hidden");
    }
  }
}

// App Initialization
async function initializeApp() {
  initTheme();
  registerServiceWorker();

  const picker = document.getElementById("current-date-picker");
  if (picker) picker.value = AppState.currentDate;

  try {
    if (!AppState.token) {
      await instantDemoLogin("user", false);
    }
    const me = await apiCall("/api/auth/me");
    AppState.user = me.user;
    AppState.profile = me.profile;
    updateUserDisplay();
  } catch (err) {
    console.warn("Session check failed, falling back to demo Ryan:", err);
    await instantDemoLogin("user", false);
  }

  loadDashboardData();
  lucide.createIcons();
}

window.addEventListener("DOMContentLoaded", initializeApp);
