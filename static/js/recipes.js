/**
 * CALORA - Recipes, Saved Meals & Custom Food Creation
 * Accuracy over assumptions.
 */

let recipeIngredients = [];

async function loadRecipesData() {
  loadSavedMeals();
  loadCustomRecipes();
}

// ----------------------------------------------------
// 1. SAVED MEAL TEMPLATES (Section 31)
// ----------------------------------------------------

async function loadSavedMeals() {
  const container = document.getElementById("saved-meals-container");
  if (!container) return;

  try {
    const saved = await apiCall("/api/meals/saved");
    if (saved.length === 0) {
      container.innerHTML = `<div class="col-span-3 text-slate-500 text-xs p-4 text-center">No saved meals yet.</div>`;
      return;
    }

    container.innerHTML = saved.map(sm => `
      <div class="calora-card p-4 space-y-3 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-white">${sm.name}</h4>
            <span class="text-xs font-mono font-bold text-brand-400">~${sm.estimated_calories} kcal</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">${sm.description || ''}</p>

          <div class="space-y-1 pt-2">
            ${(sm.items || []).map(item => `
              <div class="text-[11px] text-slate-300 flex items-center justify-between">
                <span>${item.food_id ? item.food_id.replace('food_', '').replace('_', ' ') : 'Food'}</span>
                <span class="text-slate-500 font-mono">${item.portion_name || '1 portion'}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <button onclick="logSavedMeal('${sm.id}')" class="w-full bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-200 font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1 border border-slate-700">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>1-Tap Add to Diary</span>
        </button>
      </div>
    `).join("");

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="col-span-3 text-red-400 text-xs p-4">Error loading saved meals: ${err.message}</div>`;
  }
}

async function logSavedMeal(savedMealId) {
  try {
    await apiCall("/api/meals/saved/log", "POST", {
      saved_meal_id: savedMealId,
      date: AppState.currentDate,
      meal_type: "lunch"
    });
    showToast("Saved meal logged to today's diary!", "success");
    switchTab("dashboard");
  } catch (err) {
    showToast(err.message, "error");
  }
}


// ----------------------------------------------------
// 2. RECIPE BUILDER (Section 13)
// ----------------------------------------------------

async function loadCustomRecipes() {
  const container = document.getElementById("recipes-list-container");
  if (!container) return;

  try {
    const recipes = await apiCall("/api/recipes");
    if (recipes.length === 0) {
      container.innerHTML = `<div class="col-span-2 text-slate-500 text-xs p-4 text-center">No recipes created yet. Click "Create Recipe" above to build a composite dish.</div>`;
      return;
    }

    container.innerHTML = recipes.map(r => `
      <div class="calora-card p-5 space-y-3">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h4 class="text-base font-bold text-white">${r.name}</h4>
            <span class="text-xs text-slate-400">${r.servings} Servings · Total: ${r.total_calories} kcal</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-bold text-brand-400 font-mono">~${r.per_serving_calories} kcal</span>
            <span class="text-[10px] text-slate-500 block">per serving</span>
          </div>
        </div>

        <p class="text-xs text-slate-400">${r.description || 'Custom composite recipe.'}</p>

        <!-- Macros per serving -->
        <div class="grid grid-cols-4 gap-2 text-center text-xs bg-slate-900/60 p-2 rounded-xl">
          <div><span class="text-[10px] text-slate-500 block">Protein</span><strong class="text-white">${r.per_serving_protein_g}g</strong></div>
          <div><span class="text-[10px] text-slate-500 block">Carbs</span><strong class="text-white">${r.per_serving_carbs_g}g</strong></div>
          <div><span class="text-[10px] text-slate-500 block">Fat</span><strong class="text-white">${r.per_serving_fat_g}g</strong></div>
          <div><span class="text-[10px] text-slate-500 block">Fibre</span><strong class="text-white">${r.per_serving_fibre_g}g</strong></div>
        </div>

        <!-- Ingredients breakdown -->
        <div class="space-y-1 text-xs text-slate-400">
          <span class="font-bold text-slate-300 block text-[11px]">Ingredients (${r.ingredients.length}):</span>
          ${r.ingredients.map(ing => `
            <div class="flex justify-between text-[11px]">
              <span>${ing.ingredient_name} (${ing.gram_weight}g)</span>
              <span class="font-mono text-slate-300">${ing.calories} kcal</span>
            </div>
          `).join("")}
        </div>

        <button onclick="logRecipeServing('${r.name}', ${r.per_serving_calories}, ${r.per_serving_protein_g}, ${r.per_serving_carbs_g}, ${r.per_serving_fat_g}, ${r.per_serving_fibre_g})" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 border border-slate-700">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Log 1 Serving to Diary</span>
        </button>
      </div>
    `).join("");

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="col-span-2 text-red-400 text-xs p-4">Error loading recipes: ${err.message}</div>`;
  }
}

async function logRecipeServing(name, cal, p, c, f, fib) {
  try {
    await apiCall("/api/meals/item", "POST", {
      date: AppState.currentDate,
      meal_type: "dinner",
      food_name: `${name} (1 serving)`,
      portion_name: "1 Serving",
      gram_weight: 200,
      calories: cal,
      data_origin: "user_entered"
    });
    showToast(`Logged 1 serving of ${name} (~${cal} kcal)!`, "success");
    switchTab("dashboard");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function openRecipeBuilderModal() {
  recipeIngredients = [];
  renderRecipeBuilderModal();
}

const VERIFIED_INGREDIENT_PRESETS = [
  { name: "Beef Stew Meat (Lean cut)", food_id: "food_beef_stew", cal_100: 175, p_100: 18.5, c_100: 3.2, f_100: 9.8, fib_100: 0.8 },
  { name: "Chicken Breast Fillet (Kuku)", food_id: "food_chicken_breast", cal_100: 165, p_100: 31.0, c_100: 0.0, f_100: 3.6, fib_100: 0.0 },
  { name: "Ugali Maize Flour", food_id: "food_ugali_white", cal_100: 130, p_100: 2.8, c_100: 27.5, f_100: 0.6, fib_100: 1.8 },
  { name: "Sukuma Wiki (Collard Greens)", food_id: "food_sukuma", cal_100: 52, p_100: 2.4, c_100: 4.8, f_100: 2.8, fib_100: 2.9 },
  { name: "Ndengu / Green Grams", food_id: "food_ndengu", cal_100: 118, p_100: 7.2, c_100: 19.8, f_100: 0.6, fib_100: 4.8 },
  { name: "Red Kidney Beans (Maharagwe)", food_id: "food_beans_yellow", cal_100: 112, p_100: 7.8, c_100: 18.2, f_100: 0.5, fib_100: 5.2 },
  { name: "White Rice (Cooked)", food_id: "food_rice_white", cal_100: 130, p_100: 2.7, c_100: 28.2, f_100: 0.3, fib_100: 0.4 },
  { name: "Irish Potatoes (Cubed)", food_id: "food_potatoes", cal_100: 87, p_100: 1.9, c_100: 20.1, f_100: 0.1, fib_100: 1.8 },
  { name: "Sweet Potatoes (Ngwashe)", food_id: "food_sweet_potato", cal_100: 86, p_100: 1.6, c_100: 20.1, f_100: 0.1, fib_100: 3.0 },
  { name: "Nduma (Steamed Arrowroots)", food_id: "food_nduma", cal_100: 112, p_100: 1.5, c_100: 26.5, f_100: 0.2, fib_100: 4.1 },
  { name: "Tomato & Onion Base", food_id: null, cal_100: 32, p_100: 1.1, c_100: 6.5, f_100: 0.2, fib_100: 1.4 },
  { name: "Pure Vegetable Cooking Oil", food_id: null, cal_100: 884, p_100: 0.0, c_100: 0.0, f_100: 100.0, fib_100: 0.0 },
  { name: "Chicken Egg (Whole)", food_id: "food_egg_boiled", cal_100: 143, p_100: 12.6, c_100: 0.7, f_100: 9.5, fib_100: 0.0 }
];

function renderRecipeBuilderModal() {
  const existing = document.getElementById("modal-recipe-builder");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "modal-recipe-builder";
  modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm modal-overlay";

  modal.innerHTML = `
    <div class="calora-card p-6 max-w-xl w-full bg-slate-900 border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto modal-content">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center space-x-2">
          <i data-lucide="chef-hat" class="w-5 h-5 text-emerald-400"></i>
          <h3 class="text-base font-bold text-white">Custom Recipe Macro Calculator</h3>
        </div>
        <button onclick="document.getElementById('modal-recipe-builder').remove()" class="p-1 text-slate-400 hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2 space-y-1">
            <label class="text-xs font-semibold text-slate-300">Recipe Title</label>
            <input type="text" id="recipe-title" placeholder="e.g. Grandma's Beef & Ndengu Stew" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-300">Servings</label>
            <input type="number" id="recipe-servings" min="1" max="50" value="4" oninput="updateRecipeIngredientsView()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white text-center font-bold focus:outline-none">
          </div>
        </div>

        <!-- Add Ingredient Quick Row -->
        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
          <span class="text-xs font-bold text-slate-300 flex items-center space-x-1">
            <i data-lucide="plus" class="w-3.5 h-3.5 text-emerald-400"></i>
            <span>Add Ingredient</span>
          </span>

          <div class="space-y-2">
            <div>
              <label class="text-[10px] text-slate-400 font-semibold block mb-1">Select Verified Ingredient or Type Name:</label>
              <select id="recipe-ing-preset" onchange="onRecipePresetSelected(this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white">
                <option value="">-- Or choose from verified database staples --</option>
                ${VERIFIED_INGREDIENT_PRESETS.map((p, idx) => `
                  <option value="${idx}">${p.name} (~${p.cal_100} kcal/100g · ${p.p_100}g P)</option>
                `).join("")}
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div class="sm:col-span-5">
                <input type="text" id="recipe-ing-name" placeholder="Item name (e.g. Beef stew)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white">
              </div>
              <div class="sm:col-span-3">
                <input type="number" id="recipe-ing-grams" placeholder="Grams (e.g. 400)" value="200" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono">
              </div>
              <div class="sm:col-span-4 flex space-x-1">
                <select id="recipe-ing-oil" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-200">
                  <option value="none">No extra oil</option>
                  <option value="1_tbsp">+1 tbsp oil (+124 kcal)</option>
                  <option value="2_tbsp">+2 tbsp oil (+248 kcal)</option>
                </select>
                <button type="button" onclick="addIngredientToRecipe()" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 rounded-lg text-xs whitespace-nowrap">Add</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Ingredients Table & Live Calculations -->
        <div class="space-y-1.5" id="recipe-builder-ingredients-list">
          <p class="text-xs text-slate-500 italic py-2 text-center">No ingredients added yet.</p>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-800">
          <button onclick="document.getElementById('modal-recipe-builder').remove()" class="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
          <button onclick="saveNewRecipe()" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center space-x-1.5">
            <i data-lucide="check" class="w-4 h-4"></i>
            <span>Calculate & Save Recipe</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  lucide.createIcons();
}

function onRecipePresetSelected(idxVal) {
  if (idxVal === "") return;
  const p = VERIFIED_INGREDIENT_PRESETS[parseInt(idxVal)];
  if (p) {
    document.getElementById("recipe-ing-name").value = p.name;
  }
}

function addIngredientToRecipe() {
  const nameEl = document.getElementById("recipe-ing-name");
  const gramsEl = document.getElementById("recipe-ing-grams");
  const oilEl = document.getElementById("recipe-ing-oil");
  const presetIdx = document.getElementById("recipe-ing-preset").value;

  const name = nameEl.value.trim();
  const grams = parseFloat(gramsEl.value) || 100;
  const oil = oilEl.value;

  if (!name) {
    showToast("Please enter an ingredient name", "error");
    return;
  }

  let food_id = null;
  let cals = 0;
  let p = 0;
  let c = 0;
  let f = 0;
  let fib = 0;

  const oilCal = oil === '1_tbsp' ? 124 : (oil === '2_tbsp' ? 248 : 0);
  const oilFat = oil === '1_tbsp' ? 14.0 : (oil === '2_tbsp' ? 28.0 : 0.0);

  if (presetIdx !== "") {
    const preset = VERIFIED_INGREDIENT_PRESETS[parseInt(presetIdx)];
    food_id = preset.food_id;
    cals = Math.round((preset.cal_100 * grams) / 100.0 + oilCal);
    p = Math.round(((preset.p_100 * grams) / 100.0) * 10) / 10;
    c = Math.round(((preset.c_100 * grams) / 100.0) * 10) / 10;
    f = Math.round((((preset.f_100 * grams) / 100.0) + oilFat) * 10) / 10;
    fib = Math.round(((preset.fib_100 * grams) / 100.0) * 10) / 10;
  } else {
    // Custom item estimate
    cals = Math.round(grams * 1.4 + oilCal);
    p = Math.round(grams * 0.12 * 10) / 10;
    c = Math.round(grams * 0.15 * 10) / 10;
    f = Math.round((grams * 0.04 + oilFat) * 10) / 10;
    fib = 1.0;
  }

  recipeIngredients.push({
    ingredient_name: name,
    food_id: food_id,
    gram_weight: grams,
    oil_type: oil,
    calories: cals,
    protein_g: p,
    carbs_g: c,
    fat_g: f,
    fibre_g: fib
  });

  nameEl.value = "";
  document.getElementById("recipe-ing-preset").value = "";

  updateRecipeIngredientsView();
}

function updateRecipeIngredientsView() {
  const listEl = document.getElementById("recipe-builder-ingredients-list");
  if (!listEl) return;

  if (recipeIngredients.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-slate-500 italic py-2 text-center">No ingredients added yet.</p>`;
    return;
  }

  const totalCal = recipeIngredients.reduce((sum, i) => sum + i.calories, 0);
  const totalP = Math.round(recipeIngredients.reduce((sum, i) => sum + i.protein_g, 0) * 10) / 10;
  const totalC = Math.round(recipeIngredients.reduce((sum, i) => sum + i.carbs_g, 0) * 10) / 10;
  const totalF = Math.round(recipeIngredients.reduce((sum, i) => sum + i.fat_g, 0) * 10) / 10;
  const totalFib = Math.round(recipeIngredients.reduce((sum, i) => sum + i.fibre_g, 0) * 10) / 10;

  const servings = parseInt(document.getElementById("recipe-servings").value, 10) || 4;

  const perCal = Math.round(totalCal / servings);
  const perP = Math.round((totalP / servings) * 10) / 10;
  const perC = Math.round((totalC / servings) * 10) / 10;
  const perF = Math.round((totalF / servings) * 10) / 10;
  const perFib = Math.round((totalFib / servings) * 10) / 10;

  listEl.innerHTML = `
    <div class="space-y-1">
      <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Recipe Ingredients (${recipeIngredients.length}):</span>
      ${recipeIngredients.map((item, idx) => `
        <div class="flex items-center justify-between bg-slate-950 p-2 rounded-lg text-xs border border-slate-800">
          <div>
            <span class="text-white font-semibold">${item.ingredient_name}</span>
            <span class="text-slate-400 block text-[10px]">${item.gram_weight}g ${item.oil_type !== 'none' ? '(+' + item.oil_type + ')' : ''} · ${item.protein_g}g P / ${item.carbs_g}g C / ${item.fat_g}g F</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="font-mono text-emerald-400 font-bold">~${item.calories} kcal</span>
            <button onclick="recipeIngredients.splice(${idx}, 1); updateRecipeIngredientsView();" class="text-red-400 hover:text-red-300 p-1">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `).join("")}
    </div>

    <!-- Live Total & Per-Serving Macro Summary Box -->
    <div class="p-3.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
      <div class="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
        <span class="text-white">Total Dish Nutrition (${servings} Servings)</span>
        <span class="text-emerald-400 font-mono text-sm">~${totalCal} kcal</span>
      </div>

      <div class="grid grid-cols-4 gap-2 text-center text-xs">
        <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
          <span class="text-[10px] text-slate-400 block">Total P</span>
          <strong class="text-white font-mono">${totalP}g</strong>
        </div>
        <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
          <span class="text-[10px] text-slate-400 block">Total C</span>
          <strong class="text-white font-mono">${totalC}g</strong>
        </div>
        <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
          <span class="text-[10px] text-slate-400 block">Total F</span>
          <strong class="text-white font-mono">${totalF}g</strong>
        </div>
        <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
          <span class="text-[10px] text-slate-400 block">Total Fib</span>
          <strong class="text-white font-mono">${totalFib}g</strong>
        </div>
      </div>

      <div class="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center justify-between text-xs">
        <span class="font-bold text-emerald-300">Per Serving (${servings} Servings):</span>
        <div class="font-mono text-right">
          <strong class="text-white">~${perCal} kcal</strong>
          <span class="text-[10px] text-emerald-300 block">(${perP}g P · ${perC}g C · ${perF}g F · ${perFib}g Fib)</span>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}

async function saveNewRecipe() {
  const title = document.getElementById("recipe-title").value.trim();
  const servings = parseInt(document.getElementById("recipe-servings").value, 10) || 4;

  if (!title) {
    showToast("Please enter a recipe title", "error");
    return;
  }
  if (recipeIngredients.length === 0) {
    showToast("Please add at least one ingredient", "error");
    return;
  }

  try {
    await apiCall("/api/recipes", "POST", {
      name: title,
      servings: servings,
      ingredients: recipeIngredients
    });

    document.getElementById("modal-recipe-builder").remove();
    showToast(`Recipe "${title}" created successfully!`, "success");
    loadCustomRecipes();
  } catch (err) {
    showToast(err.message, "error");
  }
}


// ----------------------------------------------------
// 3. CUSTOM FOOD CREATION (Section 30)
// ----------------------------------------------------

function openCustomFoodModal() {
  const existing = document.getElementById("modal-custom-food");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "modal-custom-food";
  modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm modal-overlay";

  modal.innerHTML = `
    <div class="calora-card p-6 max-w-md w-full bg-slate-900 border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto modal-content">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-base font-bold text-white">Create Custom Food</h3>
        <button onclick="document.getElementById('modal-custom-food').remove()" class="p-1 text-slate-400 hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form onsubmit="submitCustomFood(event)" class="space-y-3 text-xs">
        <div class="space-y-1">
          <label class="font-semibold text-slate-300">Food Name *</label>
          <input type="text" id="cust-name" required placeholder="e.g. Homemade Meatloaf" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1">
            <label class="font-semibold text-slate-300">Category</label>
            <select id="cust-cat" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white">
              <option value="Kenyan meals">Kenyan meals</option>
              <option value="Grains & Cereals">Grains & Cereals</option>
              <option value="Meat & Poultry">Meat & Poultry</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Snacks">Snacks</option>
              <option value="Drinks">Drinks</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="font-semibold text-slate-300">Calories per 100g *</label>
            <input type="number" step="0.1" id="cust-cal" required placeholder="180" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold text-brand-400">
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="space-y-1">
            <label class="text-[10px] text-slate-400">Protein (g)</label>
            <input type="number" step="0.1" id="cust-p" placeholder="10" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
          </div>
          <div class="space-y-1">
            <label class="text-[10px] text-slate-400">Carbs (g)</label>
            <input type="number" step="0.1" id="cust-c" placeholder="20" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
          </div>
          <div class="space-y-1">
            <label class="text-[10px] text-slate-400">Fat (g)</label>
            <input type="number" step="0.1" id="cust-f" placeholder="5" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
          </div>
        </div>

        <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
          <strong>Trust Policy:</strong> This food will be clearly flagged as <em>User-created</em> in your database to prevent false authority.
        </div>

        <div class="flex justify-end space-x-2 pt-2">
          <button type="button" onclick="document.getElementById('modal-custom-food').remove()" class="px-4 py-2 text-slate-400">Cancel</button>
          <button type="submit" class="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 rounded-xl">Save Custom Food</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  lucide.createIcons();
}

async function submitCustomFood(e) {
  e.preventDefault();
  const name = document.getElementById("cust-name").value.trim();
  const cat = document.getElementById("cust-cat").value;
  const cal = parseFloat(document.getElementById("cust-cal").value);
  const p = parseFloat(document.getElementById("cust-p").value) || 0;
  const c = parseFloat(document.getElementById("cust-c").value) || 0;
  const f = parseFloat(document.getElementById("cust-f").value) || 0;

  try {
    await apiCall("/api/foods/custom", "POST", {
      name: name,
      category: cat,
      calories_per_100g: cal,
      protein_per_100g: p,
      carbs_per_100g: c,
      fat_per_100g: f,
      portions: [
        { name: "100g standard", gram_weight: 100.0, is_default: true },
        { name: "1 Serving", gram_weight: 150.0, is_default: false }
      ]
    });

    document.getElementById("modal-custom-food").remove();
    showToast(`Custom food "${name}" created!`, "success");
    loadFoodSearchResults();
  } catch (err) {
    showToast(err.message, "error");
  }
}


// ----------------------------------------------------
// 4. REPORT DISCREPANCY (Section 37)
// ----------------------------------------------------

function openReportFoodModal(foodId, foodName) {
  const modal = document.getElementById("modal-report-food");
  if (!modal) return;

  document.getElementById("report-food-id").value = foodId || "unspecified";
  document.getElementById("report-food-name").value = foodName;
  document.getElementById("report-display-food-name").textContent = foodName;
  document.getElementById("report-user-notes").value = "";

  openModal("modal-report-food");
}

async function submitFoodReportForm(e) {
  e.preventDefault();
  const foodId = document.getElementById("report-food-id").value;
  const foodName = document.getElementById("report-food-name").value;
  const issueType = document.getElementById("report-issue-type").value;
  const notes = document.getElementById("report-user-notes").value;

  try {
    await apiCall("/api/reports/submit", "POST", {
      food_id: foodId,
      food_name: foodName,
      issue_type: issueType,
      user_notes: notes
    });

    closeModal("modal-report-food");
    showToast("Report submitted to CALORA nutrition administrators. Thank you!", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}
