/**
 * CALORA - Food Logging Engine (Search, NLP, Photo, Barcode)
 * Core differentiator: Accuracy, Transparency, and Uncertainty Awareness.
 */

let selectedFood = null;
let currentPortion = null;
let currentOil = "none";
let currentPrep = "boiled";
let currentGrams = 100;
let currentCategory = "All";

// Initialize View
function initFoodLogView() {
  loadFoodSearchResults();
}

// ----------------------------------------------------
// 1. DATABASE SEARCH & TRANSPARENT PORTION BUILDER
// ----------------------------------------------------

async function loadFoodSearchResults(query = "") {
  const container = document.getElementById("food-search-results");
  if (!container) return;

  let foods = null;

  // 1. First attempt live backend API if available
  try {
    let url = `/api/foods/search?limit=40`;
    if (query && query.trim()) url += `&q=${encodeURIComponent(query.trim())}`;
    if (currentCategory && currentCategory !== "All") url += `&category=${encodeURIComponent(currentCategory)}`;

    foods = await apiCall(url);
    if (!Array.isArray(foods)) {
      foods = null;
    }
  } catch (err) {
    console.warn("Backend API unavailable, using verified local food database:", err.message);
  }

  // 2. If API is offline, returned non-JSON/HTML, or failed: search verified local dataset
  if (!foods) {
    const catalog = window.CALORA_VERIFIED_FOODS || [];
    let filtered = catalog;

    if (currentCategory && currentCategory !== "All") {
      filtered = filtered.filter(f => (f.category || "").toLowerCase() === currentCategory.toLowerCase());
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(f =>
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.common_names && f.common_names.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q)) ||
        (f.cuisine && f.cuisine.toLowerCase().includes(q)) ||
        (f.notes && f.notes.toLowerCase().includes(q))
      );
    }
    foods = filtered.slice(0, 40);
  }

  try {
    if (foods.length === 0) {
      container.innerHTML = `
        <div class="calora-card p-6 text-center text-slate-400 text-xs space-y-2">
          <p>No foods found matching "${query}".</p>
          <button onclick="openCustomFoodModal()" class="text-brand-400 font-semibold hover:underline">Create a custom food entry</button>
        </div>
      `;
      return;
    }

    window._foodSearchCache = window._foodSearchCache || {};
    foods.forEach(f => window._foodSearchCache[f.id] = f);

    container.innerHTML = foods.map(f => {
      const defaultPortion = f.portions && f.portions.length > 0 ? f.portions[0] : null;
      return `
        <div onclick="selectFoodForConfigById('${f.id}')" class="calora-card p-3.5 cursor-pointer hover:border-brand-500/50 transition-all space-y-1.5 ${selectedFood && selectedFood.id === f.id ? 'border-brand-500 bg-slate-900' : ''}">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold text-white">${f.name}</span>
            <span class="text-xs font-mono font-bold text-brand-400">${Math.round(f.calories_per_100g)} kcal <span class="text-[10px] text-slate-500 font-normal">/100g</span></span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>${f.category} · ${f.cuisine}</span>
            <span class="badge-high text-[10px] px-2 py-0.5 rounded-full font-semibold">Verified</span>
          </div>

          ${defaultPortion ? `
            <div class="text-[11px] text-slate-400 pt-0.5">
              Default: <strong class="text-slate-300">${defaultPortion.name}</strong> (${defaultPortion.gram_weight}g)
            </div>
          ` : ''}
        </div>
      `;
    }).join("");

    lucide.createIcons();

    // Select first food if none selected
    if (!selectedFood && foods.length > 0) {
      selectFoodForConfig(foods[0]);
    }
  } catch (renderErr) {
    container.innerHTML = `<div class="p-4 text-xs text-red-400">Error displaying foods: ${renderErr.message}</div>`;
  }
}

function selectFoodForConfigById(id) {
  const food = window._foodSearchCache?.[id];
  if (food) selectFoodForConfig(food);
}
window.selectFoodForConfigById = selectFoodForConfigById;

let searchDebounceTimeout = null;
function onSearchInput(val) {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    loadFoodSearchResults(val);
  }, 250);
}

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll(".cat-pill").forEach(p => {
    p.className = "cat-pill px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap";
    if (p.textContent.trim().toLowerCase() === cat.toLowerCase() || (cat === "All" && p.textContent.includes("All"))) {
      p.className = "cat-pill px-3 py-1 rounded-full text-xs font-semibold bg-brand-500 text-slate-950 whitespace-nowrap";
    }
  });
  const input = document.getElementById("food-search-input");
  loadFoodSearchResults(input ? input.value : "");
}

// Select a food to open the Portions & Uncertainty Configurator
function selectFoodForConfig(food) {
  selectedFood = food;
  currentPrep = food.default_prep_method || "boiled";
  currentOil = (food.category === "Vegetables" || food.category === "Meat & Poultry" || food.category === "Kenyan meals") ? "1_tbsp" : "none";

  // Pick default portion
  if (food.portions && food.portions.length > 0) {
    currentPortion = food.portions.find(p => p.is_default) || food.portions[0];
    currentGrams = currentPortion.gram_weight;
  } else {
    currentPortion = { name: "100g standard", gram_weight: 100 };
    currentGrams = 100;
  }

  renderFoodConfigPanel();
}

function renderFoodConfigPanel() {
  const panel = document.getElementById("food-detail-builder-panel");
  if (!panel || !selectedFood) return;

  // Portion radio buttons
  const portionButtonsHtml = (selectedFood.portions || []).map((p, idx) => `
    <button onclick="setFoodPortionByIndex(${idx})" class="portion-btn text-left p-3 rounded-xl border transition-all text-xs space-y-0.5 ${currentPortion && currentPortion.name === p.name ? 'bg-slate-800 border-brand-500 text-brand-300 font-bold' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'}">
      <div class="flex items-center justify-between">
        <span>${p.name}</span>
        <strong class="font-mono text-white">${p.gram_weight}g</strong>
      </div>
      <p class="text-[10px] text-slate-400 font-normal">${p.description || ''}</p>
    </button>
  `).join("");

  // Live calculation of preview
  const preview = calculateLiveItemPreview();

  panel.innerHTML = `
    <div class="calora-card p-6 space-y-6">
      
      <!-- Top Food Header & Source Citation -->
      <div class="border-b border-slate-800 pb-4 space-y-1">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-black text-white">${selectedFood.name}</h2>
          <span class="badge-high text-xs px-2.5 py-0.5 rounded-full font-semibold">Verified Database</span>
        </div>
        <p class="text-xs text-slate-400 italic">Citation: ${selectedFood.source}</p>
      </div>

      <!-- Portion Size Selection (Section 10) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">1. Select Portion Size</label>
          <span class="text-xs text-slate-400">Never forced to enter grams</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${portionButtonsHtml}
        </div>
        
        <!-- Custom Grams Option -->
        <div class="flex items-center space-x-2 pt-1">
          <span class="text-xs text-slate-400">Or custom weight:</span>
          <input type="number" step="1" min="5" max="2000" value="${currentGrams}" oninput="setCustomGrams(this.value)" class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500">
          <span class="text-xs text-slate-400 font-semibold">grams</span>
        </div>
      </div>

      <!-- Cooking Oil Uncertainty Engine (Section 12) -->
      <div class="space-y-2 pt-1">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <i data-lucide="droplet" class="w-3.5 h-3.5 text-amber-400"></i>
            <span>2. Cooking Oil Impact (Major Source of Uncertainty)</span>
          </label>
        </div>
        
        <select id="food-oil-select" onchange="setFoodOil(this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500">
          <option value="none" ${currentOil === 'none' ? 'selected' : ''}>No added oil (0 kcal, 0g fat)</option>
          <option value="1_tsp" ${currentOil === '1_tsp' ? 'selected' : ''}>Light / 1 teaspoon (~40 kcal, 4.5g fat)</option>
          <option value="1_tbsp" ${currentOil === '1_tbsp' ? 'selected' : ''}>Standard / 1 tablespoon (~124 kcal, 14g fat)</option>
          <option value="2_tbsp" ${currentOil === '2_tbsp' ? 'selected' : ''}>Generous / 2 tablespoons (~248 kcal, 28g fat)</option>
          <option value="3_plus_tbsp" ${currentOil === '3_plus_tbsp' ? 'selected' : ''}>Heavy / 3+ tablespoons (~372 kcal, 42g fat)</option>
          <option value="unknown" ${currentOil === 'unknown' ? 'selected' : ''}>Unknown (CALORA will calculate an uncertainty range)</option>
        </select>
      </div>

      <!-- Meal Type Selector -->
      <div class="flex items-center justify-between pt-1">
        <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">3. Log To Meal</label>
        <select id="food-meal-type-select" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none">
          <option value="lunch" selected>Lunch</option>
          <option value="breakfast">Breakfast</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>

      <!-- LIVE UNCERTAINTY & CALORIE RANGE PREVIEW (Section 15 & 16) -->
      <div class="calora-card p-5 bg-slate-950 border-slate-700 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Transparent Estimate</span>
          <span class="badge-${preview.confidence.toLowerCase()} text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center space-x-1">
            <i data-lucide="shield-check" class="w-3 h-3"></i>
            <span>${preview.confidence} Confidence</span>
          </span>
        </div>

        <div class="flex items-baseline space-x-3">
          <div class="text-3xl font-black text-white">~${preview.calories} <span class="text-xs font-normal text-slate-400">kcal</span></div>
          <div class="text-sm font-mono font-bold text-brand-400">Range: ${preview.range_display}</div>
        </div>

        <!-- Breakdown List -->
        <div class="text-xs text-slate-400 space-y-1 border-t border-slate-800 pt-2 font-mono">
          <div class="flex justify-between">
            <span>Base Food (${currentGrams}g):</span>
            <strong class="text-slate-200">~${preview.base_cal} kcal</strong>
          </div>
          ${preview.oil_cal > 0 ? `
            <div class="flex justify-between text-amber-300">
              <span>Cooking Oil (${preview.oil_name}):</span>
              <strong>+~${preview.oil_cal} kcal ${currentOil === 'unknown' ? '(range 45–180)' : ''}</strong>
            </div>
          ` : ''}
          <div class="flex justify-between text-slate-400 pt-1">
            <span>Estimated Macros:</span>
            <strong class="text-slate-300">P:${preview.protein}g · C:${preview.carbs}g · F:${preview.fat}g</strong>
          </div>
        </div>

        <!-- Uncertainty disclosure -->
        <div class="text-[11px] text-slate-500 italic pt-1">
          Main uncertainties: ${preview.uncertainties.join(" · ")}
        </div>
      </div>

      <!-- Add to Diary CTA -->
      <button onclick="commitFoodLogItem()" class="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20">
        <i data-lucide="plus" class="w-4 h-4"></i>
        <span>Add ${selectedFood.name} to Diary</span>
      </button>

    </div>
  `;

  lucide.createIcons();
}

function setFoodPortion(name, grams) {
  if (!selectedFood) return;
  currentPortion = selectedFood.portions.find(p => p.name === name) || { name, gram_weight: grams };
  currentGrams = grams;
  renderFoodConfigPanel();
}

function setFoodPortionByIndex(idx) {
  if (selectedFood && selectedFood.portions && selectedFood.portions[idx]) {
    const p = selectedFood.portions[idx];
    setFoodPortion(p.name, p.gram_weight);
  }
}
window.setFoodPortionByIndex = setFoodPortionByIndex;

function setCustomGrams(grams) {
  currentGrams = parseFloat(grams) || 100;
  currentPortion = { name: `Custom (${currentGrams}g)`, gram_weight: currentGrams };
  renderFoodConfigPanel();
}

function setFoodOil(oil) {
  currentOil = oil;
  renderFoodConfigPanel();
}

function calculateLiveItemPreview() {
  if (!selectedFood) return { calories: 0, range_display: "0–0 kcal", confidence: "MEDIUM", uncertainties: [] };

  const baseCal = (selectedFood.calories_per_100g * currentGrams) / 100.0;
  
  let oilCal = 0;
  let oilFat = 0;
  let oilLow = 0;
  let oilHigh = 0;
  let oilName = "None";

  if (currentOil === "1_tsp") {
    oilCal = 40; oilFat = 4.5; oilLow = 30; oilHigh = 50; oilName = "1 teaspoon";
  } else if (currentOil === "1_tbsp") {
    oilCal = 124; oilFat = 14; oilLow = 100; oilHigh = 145; oilName = "1 tablespoon";
  } else if (currentOil === "2_tbsp") {
    oilCal = 248; oilFat = 28; oilLow = 210; oilHigh = 290; oilName = "2 tablespoons";
  } else if (currentOil === "3_plus_tbsp") {
    oilCal = 372; oilFat = 42; oilLow = 330; oilHigh = 440; oilName = "3+ tablespoons";
  } else if (currentOil === "unknown") {
    oilCal = 105; oilFat = 12; oilLow = 45; oilHigh = 180; oilName = "Unknown range";
  }

  const confidence = selectedFood.confidence_level || "MEDIUM";
  const variancePct = confidence === "HIGH" ? 0.05 : (confidence === "LOW" ? 0.25 : 0.12);

  const totalMid = Math.round(baseCal + oilCal);
  const totalLow = Math.round((baseCal * (1 - variancePct)) + oilLow);
  const totalHigh = Math.round((baseCal * (1 + variancePct)) + oilHigh);

  const uncertainties = [];
  if (confidence !== "HIGH") uncertainties.push("Portion size estimation");
  if (currentOil === "unknown") uncertainties.push("Cooking oil amount unknown");
  else if (currentOil !== "none") uncertainties.push("Cooking oil volume variation");
  if (uncertainties.length === 0) uncertainties.push("Minimal (verified analytical database data)");

  const p = Math.round(((selectedFood.protein_per_100g * currentGrams) / 100.0) * 10) / 10;
  const c = Math.round(((selectedFood.carbs_per_100g * currentGrams) / 100.0) * 10) / 10;
  const f = Math.round((((selectedFood.fat_per_100g * currentGrams) / 100.0) + oilFat) * 10) / 10;

  return {
    calories: totalMid,
    base_cal: Math.round(baseCal),
    oil_cal: Math.round(oilCal),
    oil_name: oilName,
    range_display: `${totalLow}–${totalHigh} kcal`,
    confidence: confidence,
    uncertainties: uncertainties,
    protein: p,
    carbs: c,
    fat: f
  };
}

async function commitFoodLogItem() {
  if (!selectedFood) return;

  const mealTypeSelect = document.getElementById("food-meal-type-select");
  const mealType = mealTypeSelect ? mealTypeSelect.value : "lunch";

  try {
    const res = await apiCall("/api/meals/item", "POST", {
      date: AppState.currentDate,
      meal_type: mealType,
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      portion_name: currentPortion.name,
      gram_weight: currentGrams,
      cooking_oil_type: currentOil,
      prep_method: currentPrep
    });

    showToast(`Logged ${selectedFood.name} (~${res.logged_calories} kcal) to ${mealType}!`, "success");
    switchTab("dashboard");
  } catch (err) {
    console.warn("Backend unavailable, saving food to local diary cache:", err.message);
    const oilCalories = currentOil === "none" ? 0 : (currentOil === "1_tsp" ? 40 : (currentOil === "1_tbsp" ? 120 : 180));
    const foodCalories = Math.round(selectedFood.calories_per_100g * (currentGrams / 100));
    const totalCal = foodCalories + oilCalories;
    const itemObj = {
      id: "local_" + Date.now(),
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      portion_name: currentPortion.name,
      gram_weight: currentGrams,
      cooking_oil_type: currentOil,
      prep_method: currentPrep,
      calories: totalCal,
      logged_calories: totalCal,
      range_low: Math.round(totalCal * 0.9),
      range_high: Math.round(totalCal * 1.15),
      protein_g: Number((selectedFood.protein_per_100g * (currentGrams / 100)).toFixed(1)),
      carbs_g: Number((selectedFood.carbs_per_100g * (currentGrams / 100)).toFixed(1)),
      fat_g: Number(((selectedFood.fat_per_100g * (currentGrams / 100)) + (oilCalories / 9)).toFixed(1)),
      fibre_g: Number((selectedFood.fibre_per_100g * (currentGrams / 100)).toFixed(1)),
      uncertainty_min: Math.round(totalCal * 0.9),
      uncertainty_max: Math.round(totalCal * 1.15),
      confidence_level: "HIGH"
    };

    if (window.saveLocalMealItem) {
      window.saveLocalMealItem(AppState.currentDate, mealType, itemObj);
    }
    showToast(`Logged ${selectedFood.name} (~${totalCal} kcal) to ${mealType}!`, "success");
    switchTab("dashboard");
  }
}


// ----------------------------------------------------
// 2. NATURAL LANGUAGE FOOD LOGGING ENGINE (Section 18)
// ----------------------------------------------------

function setNlpText(text) {
  const input = document.getElementById("nlp-input-text");
  if (input) input.value = text;
}

async function submitNlpParse() {
  const input = document.getElementById("nlp-input-text");
  const container = document.getElementById("nlp-results-container");
  if (!input || !input.value.trim() || !container) return;

  container.innerHTML = `
    <div class="calora-card p-6 text-center text-slate-400 space-y-2">
      <div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs">Analyzing ingredients and estimating portion uncertainties...</p>
    </div>
  `;

  try {
    const res = await apiCall("/api/nlp/parse", "POST", { text: input.value.trim() });

    if (res.status === "unrecognized") {
      container.innerHTML = `
        <div class="calora-card p-6 text-amber-300 text-xs bg-amber-500/10 border-amber-500/20 space-y-2">
          <strong>Ambiguous or Unrecognized Foods:</strong>
          <p>${res.message}</p>
        </div>
      `;
      return;
    }

    // Render parsed items
    let itemsHtml = res.items.map((item, idx) => `
      <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span class="font-bold text-white">${item.food_name}</span>
          <span class="text-slate-400 block text-[11px]">${item.portion_name} · ${item.gram_weight}g</span>
        </div>
        <div class="text-right">
          <strong class="text-brand-400 font-mono text-sm">~${item.calories} kcal</strong>
          <span class="text-[10px] text-slate-400 font-mono block">${item.range_display}</span>
        </div>
      </div>
    `).join("");

    // Clarifications Drawer (Section 18: "Do not silently invent portions")
    let clarificationsHtml = "";
    if (res.clarifications && res.clarifications.length > 0) {
      clarificationsHtml = `
        <div class="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-3">
          <div class="flex items-center space-x-2 text-amber-300 font-bold text-xs">
            <i data-lucide="help-circle" class="w-4 h-4"></i>
            <span>Clarifications Needed (To avoid false assumptions)</span>
          </div>
          ${res.clarifications.map((c, i) => `
            <div class="space-y-1.5 text-xs">
              <p class="text-slate-200 font-medium">${c.question}</p>
              <div class="flex flex-wrap gap-2">
                ${c.options.map(opt => `
                  <button type="button" class="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg text-[11px] ${opt === c.default ? 'border-brand-500 text-brand-300 font-bold' : ''}">
                    ${opt}
                  </button>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="calora-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-white uppercase tracking-wider">Natural Language Analysis Result</h3>
          <span class="badge-${res.summary.confidence.toLowerCase()} text-xs px-2.5 py-0.5 rounded-full font-semibold">
            ${res.summary.confidence} Confidence
          </span>
        </div>

        <div class="space-y-2">
          ${itemsHtml}
        </div>

        <!-- Meal Summary & Transparent Statement -->
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-baseline justify-between">
            <span class="text-xs text-slate-400">Total Meal Estimate:</span>
            <div class="text-right">
              <strong class="text-xl font-black text-white font-mono">~${res.summary.calories} kcal</strong>
              <span class="text-xs text-brand-400 font-mono block">Range: ${res.summary.range_display}</span>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 italic">${res.transparency_statement}</p>
        </div>

        ${clarificationsHtml}

        <button onclick="commitLastNlpItems()" class="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center space-x-2">
          <i data-lucide="check" class="w-4 h-4"></i>
          <span>Confirm & Log All Items to Diary</span>
        </button>
      </div>
    `;

    window._lastNlpParsedItems = res.items;
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-4 text-xs text-red-400">Error: ${err.message}</div>`;
  }
}

async function commitLastNlpItems() {
  await commitNlpItems(window._lastNlpParsedItems);
}
window.commitLastNlpItems = commitLastNlpItems;

async function commitNlpItems(items) {
  const itemsToCommit = items || window._lastNlpParsedItems || [];
  const mealTypeSelect = document.getElementById("nlp-meal-type-select");
  const mealType = mealTypeSelect ? mealTypeSelect.value : "lunch";

  try {
    for (const item of itemsToCommit) {
      await apiCall("/api/meals/item", "POST", {
        date: AppState.currentDate,
        meal_type: mealType,
        food_id: item.food_id,
        food_name: item.food_name,
        portion_name: item.portion_name,
        gram_weight: item.gram_weight,
        cooking_oil_type: item.cooking_oil_type,
        prep_method: item.prep_method
      });
    }

    showToast(`Logged ${items.length} items to ${mealType}!`, "success");
    switchTab("dashboard");
  } catch (err) {
    showToast("Failed to commit items: " + err.message, "error");
  }
}


// ----------------------------------------------------
// 3. PHOTO FOOD RECOGNITION (Section 17)
// ----------------------------------------------------

let currentUploadedPhotoDataUrl = null;

function onPhotoSelected(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      currentUploadedPhotoDataUrl = evt.target.result;
      triggerSimulatedPhotoScan(file.name);
    };
    reader.readAsDataURL(file);
  }
}

async function triggerSimulatedPhotoScan(hint = "ugali") {
  const container = document.getElementById("photo-recognition-results");
  if (!container) return;

  container.innerHTML = `
    <div class="calora-card p-6 text-center text-slate-400 space-y-3">
      ${currentUploadedPhotoDataUrl ? `
        <div class="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-lg">
          <img src="${currentUploadedPhotoDataUrl}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
            <div class="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      ` : `
        <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      `}
      <div>
        <p class="text-xs font-bold text-white">CALORA Vision Engine Analyzing Plate...</p>
        <p class="text-[11px] text-slate-400">Detecting food boundaries, volume depth, and cooking oil sheen</p>
      </div>
    </div>
  `;

  try {
    const res = await apiCall("/api/photo/detect", "POST", { hint: hint, image_data: currentUploadedPhotoDataUrl });

    let itemsHtml = res.items.map(item => `
      <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span class="font-bold text-white">${item.food_name}</span>
          <span class="text-slate-400 block text-[11px]">Detected: ${item.portion_name} (~${item.gram_weight}g)</span>
        </div>
        <div class="text-right">
          <strong class="text-emerald-400 font-mono text-sm">~${item.calories} kcal</strong>
          <span class="text-[10px] text-slate-400 font-mono block">${item.range_display}</span>
        </div>
      </div>
    `).join("");

    container.innerHTML = `
      <div class="calora-card p-6 space-y-4">
        ${currentUploadedPhotoDataUrl ? `
          <div class="flex items-center space-x-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <img src="${currentUploadedPhotoDataUrl}" class="w-16 h-16 object-cover rounded-lg border border-slate-700">
            <div>
              <span class="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Identified Meal Scene</span>
              <h3 class="text-sm font-bold text-white">${res.scene_detected}</h3>
              <span class="badge-medium text-[10px] px-2 py-0.5 rounded-full font-semibold">Medium Confidence</span>
            </div>
          </div>
        ` : `
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs text-slate-400 uppercase font-semibold">Identified Scene</span>
              <h3 class="text-base font-bold text-white">${res.scene_detected}</h3>
            </div>
            <span class="badge-medium text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Medium Confidence
            </span>
          </div>
        `}

        <div class="space-y-2">
          <span class="text-xs font-bold text-slate-300 uppercase tracking-wider block">Detected Plate Breakdown:</span>
          ${itemsHtml}
        </div>

        <!-- Follow-up Clarification Questions (Section 17) -->
        <div class="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div class="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
            <i data-lucide="help-circle" class="w-4 h-4"></i>
            <span>Uncertainty Clarifications (Adjust If Needed)</span>
          </div>
          ${res.clarification_questions.map((q, idx) => `
            <div class="space-y-1 text-xs">
              <span class="text-slate-300 font-medium">${q.question}</span>
              <div class="flex flex-wrap gap-2 pt-0.5">
                ${q.options.map(opt => `
                  <button type="button" class="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg text-[11px] ${opt === q.default ? 'border-emerald-500 text-emerald-300 font-bold' : ''}">
                    ${opt}
                  </button>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>

        <div class="text-[11px] text-slate-400 italic">
          ${res.disclaimer}
        </div>

        <button onclick="commitLastNlpItems()" class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/20">
          <i data-lucide="check" class="w-4 h-4"></i>
          <span>Confirm & Log Plate to Diary</span>
        </button>
      </div>
    `;

    window._lastNlpParsedItems = res.items;
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-4 text-xs text-red-400">Error: ${err.message}</div>`;
  }
}


// ----------------------------------------------------
// 4. BARCODE SCANNER ENGINE (Section 19)
// ----------------------------------------------------

function setBarcode(code) {
  const input = document.getElementById("barcode-manual-input");
  if (input) {
    input.value = code;
    lookupBarcode();
  }
}

async function lookupBarcode() {
  const input = document.getElementById("barcode-manual-input");
  const container = document.getElementById("barcode-result-container");
  if (!input || !input.value.trim() || !container) return;

  const barcode = input.value.trim();

  container.innerHTML = `
    <div class="calora-card p-6 text-center text-slate-400 text-xs space-y-2">
      <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p>Querying verified Kenyan manufacturer database for barcode ${barcode}...</p>
    </div>
  `;

  try {
    const food = await apiCall(`/api/foods/barcode/${barcode}`);

    const hasImg = food.image_url && food.image_url.startsWith("http");
    const brandStr = food.brand ? `<span class="text-xs text-brand-400 font-semibold block">${food.brand}</span>` : "";
    const packStr = food.packaging ? `<span class="text-[10px] text-slate-400 block">${food.packaging}</span>` : "";

    container.innerHTML = `
      <div class="calora-card p-6 space-y-4 border-slate-800">
        <div class="flex items-start justify-between border-b border-slate-800 pb-3 gap-3">
          <div class="flex items-center space-x-3">
            ${hasImg ? `
              <img src="${food.image_url}" alt="${food.name}" class="w-14 h-14 object-contain rounded-xl bg-slate-900 border border-slate-700 p-1">
            ` : `
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <i data-lucide="package" class="w-6 h-6"></i>
              </div>
            `}
            <div>
              ${brandStr}
              <h3 class="text-base font-bold text-white">${food.name}</h3>
              <span class="text-xs text-slate-400 font-mono">Barcode: ${food.barcode} · ${food.category}</span>
              ${packStr}
            </div>
          </div>
          <span class="badge-high text-xs px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap">Verified Product</span>
        </div>

        <div class="grid grid-cols-4 gap-2 text-center text-xs">
          <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Calories</span>
            <strong class="text-emerald-400 text-sm font-mono">${Math.round(food.calories_per_100g)} kcal</strong>
            <span class="text-[9px] text-slate-500 block">per 100g</span>
          </div>
          <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Protein</span>
            <strong class="text-white text-sm font-mono">${food.protein_per_100g}g</strong>
            <span class="text-[9px] text-slate-500 block">per 100g</span>
          </div>
          <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Carbs</span>
            <strong class="text-white text-sm font-mono">${food.carbs_per_100g}g</strong>
            <span class="text-[9px] text-slate-500 block">per 100g</span>
          </div>
          <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Fat</span>
            <strong class="text-white text-sm font-mono">${food.fat_per_100g}g</strong>
            <span class="text-[9px] text-slate-500 block">per 100g</span>
          </div>
        </div>

        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
          <div><strong>Source:</strong> ${food.source || 'Open Food Facts Database'}</div>
          ${food.serving_size ? `<span class="text-slate-400 font-mono">Serving: ${food.serving_size}</span>` : ''}
        </div>

        <button onclick="selectLastScannedBarcodeFood(); switchLogMode('search');" class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20">
          <i data-lucide="check" class="w-4 h-4"></i>
          <span>Configure Portion & Add to Diary</span>
        </button>
      </div>
    `;

    window._lastScannedBarcodeFood = food;
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `
      <div class="calora-card p-6 text-center text-amber-300 text-xs bg-amber-500/10 border-amber-500/20 space-y-2">
        <p>Barcode ${barcode} not found in verified database or Open Food Facts.</p>
        <button onclick="openCustomFoodModal()" class="text-emerald-400 font-semibold hover:underline">Submit this product as a new verified food</button>
      </div>
    `;
  }
}

function selectLastScannedBarcodeFood() {
  if (window._lastScannedBarcodeFood) {
    selectFoodForConfig(window._lastScannedBarcodeFood);
  }
}
window.selectLastScannedBarcodeFood = selectLastScannedBarcodeFood;

function startLiveCameraBarcode() {
  const container = document.getElementById("barcode-result-container");
  if (!container) return;

  container.innerHTML = `
    <div class="calora-card p-5 space-y-3 border-emerald-500/40">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-white flex items-center space-x-1.5">
          <i data-lucide="camera" class="w-4 h-4 text-emerald-400"></i>
          <span>Live Barcode Camera Scanner</span>
        </span>
        <span class="badge-high text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">Scanning Active</span>
      </div>

      <div class="relative w-full h-44 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        <!-- Crosshair & Scan Line -->
        <div class="absolute inset-8 border-2 border-emerald-500/60 rounded-xl flex items-center justify-center pointer-events-none">
          <div class="w-full h-0.5 bg-emerald-400 shadow-md shadow-emerald-400/80 animate-bounce"></div>
        </div>
        <p class="text-xs text-slate-400">Position barcode inside green frame</p>
      </div>

      <div class="space-y-1.5 pt-1">
        <span class="text-[10px] text-slate-400 font-semibold uppercase">Or tap popular verified Kenyan packaged foods:</span>
        <div class="flex flex-wrap gap-1.5 text-xs">
          <button onclick="setBarcode('6161100001012')" class="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
            Brookside Whole Milk (500ml)
          </button>
          <button onclick="setBarcode('6161100002019')" class="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
            Farmer's Choice Sausages
          </button>
          <button onclick="setBarcode('6161100003023')" class="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
            Weetabix East Africa
          </button>
          <button onclick="setBarcode('6161100004037')" class="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
            Dairyland Yoghurt
          </button>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();

  // If camera is available, attempt getUserMedia
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        // Stream acquired successfully; for demo we auto-detect after 2 seconds
        setTimeout(() => {
          stream.getTracks().forEach(t => t.stop());
          setBarcode("6161100001012");
        }, 2000);
      })
      .catch(() => {
        // Fallback simulation
        setTimeout(() => {
          setBarcode("6161100001012");
        }, 1800);
      });
  } else {
    setTimeout(() => {
      setBarcode("6161100001012");
    }, 1800);
  }
}

