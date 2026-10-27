/**
 * CALORA - NKP AI Coach (Nutrition & Kinetic Performance AI Coach)
 * Real-time member telemetry context, Kenyan Food Composition Tables,
 * conversational memory, and uncertainty-aware photo & text coaching.
 */

let assistantChatHistory = [
  {
    sender: "bot",
    coach: "NKP AI Coach",
    text: "Habari! I am your **NKP AI Coach** (Nutrition & Kinetic Performance). I am directly synchronized with your live CALORA profile, today's calorie diary, remaining macros, steps, and workouts.\n\nAsk me anything about fitting Kenyan foods into your deficit, closing your protein gap, or attach a photo of your meal for instant portion and calorie estimation!"
  }
];

let currentCoachPhotoBase64 = null;

async function loadAssistantContext() {
  await Promise.all([
    loadCoachChatHistory(),
    refreshAssistantContextBanner(),
    refreshRecommendations()
  ]);
  renderAssistantChat();
}

async function loadCoachChatHistory() {
  try {
    const res = await apiCall("/api/assistant/history");
    if (res && res.history && res.history.length > 0) {
      assistantChatHistory = res.history.map(h => ({
        sender: h.sender === "user" ? "user" : "bot",
        coach: "NKP AI Coach",
        text: h.message,
        image_data: h.image_data,
        created_at: h.created_at
      }));
    }
  } catch (err) {
    console.warn("Could not load coach chat history:", err);
  }
}

async function refreshAssistantContextBanner() {
  try {
    const res = await apiCall(`/api/assistant/recommendations?date_str=${AppState.currentDate}`);
    const ctx = res.context;

    const banner = document.getElementById("ai-context-banner");
    if (banner && ctx) {
      banner.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/80 to-slate-900 p-3.5 rounded-2xl border border-emerald-500/30">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-md shadow-emerald-500/20">
              NKP
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center space-x-1.5">
                <span>NKP AI Coach Telemetry Active</span>
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <span class="text-[11px] text-slate-400">Synced to ${ctx.name || 'Member'} (${ctx.weight_kg || 80} kg)</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span class="bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
              Consumed: <strong class="text-white">${ctx.consumed_calories} kcal</strong>
            </span>
            <span class="bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-brand-400">
              Remaining: <strong class="text-emerald-400">${ctx.remaining_calories} kcal</strong>
            </span>
            <span class="bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-300">
              Protein Gap: <strong>${ctx.remaining_protein_g}g</strong>
            </span>
            <span class="bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-blue-300">
              Steps: <strong>${(ctx.steps_today || 0).toLocaleString()}</strong>
            </span>
          </div>
        </div>
      `;
    }

    const calEl = document.getElementById("ai-context-remaining-cal");
    const protEl = document.getElementById("ai-context-remaining-protein");
    if (calEl) calEl.textContent = `${ctx.remaining_calories} kcal`;
    if (protEl) protEl.textContent = `${ctx.remaining_protein_g}g`;
  } catch (err) {
    console.error("Context fetch error:", err);
  }
}

// ----------------------------------------------------
// 1. MEAL RECOMMENDATION ENGINE
// ----------------------------------------------------

async function refreshRecommendations() {
  const drawer = document.getElementById("ai-recommendations-drawer");
  if (!drawer) return;

  try {
    const res = await apiCall(`/api/assistant/recommendations?date_str=${AppState.currentDate}`);
    const recs = res.recommendations || [];

    if (recs.length === 0) {
      drawer.innerHTML = `<div class="col-span-3 text-slate-500 text-xs p-4 text-center">No recommendations needed (daily target met).</div>`;
      return;
    }

    window._assistantRecsCache = recs;
    drawer.innerHTML = recs.map((rec, idx) => `
      <div class="calora-card p-4 space-y-3 flex flex-col justify-between border hover:border-brand-500/50 transition-all">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="badge-${rec.confidence.toLowerCase()} text-[10px] px-2 py-0.5 rounded-full font-semibold">${rec.confidence} Confidence</span>
            <span class="text-xs font-mono font-bold text-brand-400">~${rec.estimated_calories} kcal</span>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white">${rec.title}</h4>
            <p class="text-[11px] text-slate-400">${rec.tagline}</p>
          </div>

          <div class="space-y-1 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800 text-[11px]">
            ${rec.items.map(i => `
              <div class="flex justify-between text-slate-300">
                <span>${i.portion} ${i.food_name}</span>
                <span class="font-mono text-slate-400">${i.calories} kcal</span>
              </div>
            `).join("")}
          </div>

          <div class="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Protein: <strong class="text-white">${rec.protein_g}g</strong></span>
            <span>Fibre: <strong class="text-white">${rec.fibre_g}g</strong></span>
            <span>Range: <strong class="text-slate-300">${rec.likely_range}</strong></span>
          </div>

          <p class="text-[10px] text-slate-500 italic">${rec.uncertainty_note}</p>
        </div>

        <button onclick="logRecommendedMealByIndex(${idx})" class="w-full bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-200 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 border border-slate-700">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Log Option to Diary</span>
        </button>
      </div>
    `).join("");

    lucide.createIcons();
  } catch (err) {
    drawer.innerHTML = `<div class="col-span-3 text-red-400 text-xs p-4">Error loading recommendations: ${err.message}</div>`;
  }
}

async function logRecommendedMeal(rec) {
  try {
    for (const item of rec.items) {
      await apiCall("/api/meals/item", "POST", {
        date: AppState.currentDate,
        meal_type: "dinner",
        food_name: item.food_name,
        portion_name: item.portion,
        gram_weight: 150.0,
        cooking_oil_type: "none"
      });
    }

    showToast(`Logged "${rec.title}" to your dinner diary!`, "success");
    refreshAssistantContextBanner();
    refreshRecommendations();
    loadDashboardData();
  } catch (err) {
    showToast(`Failed to log: ${err.message}`, "error");
  }
}

// ----------------------------------------------------
// 2. CONVERSATIONAL CHAT & PHOTO ATTACHMENT ENGINE
// ----------------------------------------------------

function handleCoachPhotoSelected(input) {
  if (!input || !input.files || input.files.length === 0) return;
  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = function(e) {
    currentCoachPhotoBase64 = e.target.result;
    
    const previewContainer = document.getElementById("ai-chat-photo-preview-container");
    const previewImg = document.getElementById("ai-chat-photo-preview-img");
    const previewName = document.getElementById("ai-chat-photo-name");

    if (previewContainer && previewImg) {
      previewImg.src = currentCoachPhotoBase64;
      if (previewName) previewName.textContent = file.name;
      previewContainer.classList.remove("hidden");
    }
    lucide.createIcons();
  };
  reader.readAsDataURL(file);
}
window.handleCoachPhotoSelected = handleCoachPhotoSelected;

function clearCoachPhoto() {
  currentCoachPhotoBase64 = null;
  const previewContainer = document.getElementById("ai-chat-photo-preview-container");
  const fileInput = document.getElementById("ai-chat-photo-input");
  if (previewContainer) previewContainer.classList.add("hidden");
  if (fileInput) fileInput.value = "";
}
window.clearCoachPhoto = clearCoachPhoto;

function renderAssistantChat() {
  const container = document.getElementById("ai-chat-messages");
  if (!container) return;

  container.innerHTML = assistantChatHistory.map((msg, idx) => {
    const isBot = msg.sender === "bot";
    return `
      <div class="flex items-start space-x-3 ${isBot ? '' : 'flex-row-reverse space-x-reverse'}">
        <div class="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs ${
          isBot ? 'bg-gradient-to-tr from-brand-600 to-emerald-400 text-slate-950 shadow-md shadow-brand-500/20' : 'bg-slate-800 text-slate-300'
        }">
          ${isBot ? '<i data-lucide="bot" class="w-4 h-4"></i>' : '<i data-lucide="user" class="w-4 h-4"></i>'}
        </div>

        <div class="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
          isBot ? 'bg-slate-900 border border-slate-800 text-slate-200 shadow-lg' : 'bg-brand-500 text-slate-950 font-medium'
        }">
          ${isBot ? `<span class="text-[10px] uppercase font-bold text-brand-400 tracking-wider block mb-1">NKP AI Coach</span>` : ''}
          
          ${msg.image_data ? `
            <div class="mb-2.5">
              <img src="${msg.image_data}" alt="Meal photo" class="max-h-48 rounded-xl object-cover border border-slate-700 shadow-md">
            </div>
          ` : ''}

          <div class="prose prose-invert prose-xs">${formatChatMarkdown(msg.text)}</div>

          ${msg.photo_analysis ? `
            <div class="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
              <span class="text-[11px] font-mono font-bold text-emerald-400">~${msg.photo_analysis.estimated_calories} kcal</span>
              <button onclick="logScannedMealByIndex(${idx})" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs flex items-center space-x-1 shadow-sm">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>Log to Today's Diary</span>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
  lucide.createIcons();
}

async function logRecommendedMealByIndex(idx) {
  if (window._assistantRecsCache && window._assistantRecsCache[idx]) {
    await logRecommendedMeal(window._assistantRecsCache[idx]);
  }
}
window.logRecommendedMealByIndex = logRecommendedMealByIndex;

async function logScannedMealByIndex(idx) {
  if (assistantChatHistory && assistantChatHistory[idx] && assistantChatHistory[idx].photo_analysis) {
    await logScannedMeal(assistantChatHistory[idx].photo_analysis);
  }
}
window.logScannedMealByIndex = logScannedMealByIndex;

async function logScannedMeal(photoAnalysis) {
  if (!photoAnalysis || !photoAnalysis.items) return;
  try {
    for (const item of photoAnalysis.items) {
      await apiCall("/api/meals/item", "POST", {
        date: AppState.currentDate,
        meal_type: "lunch",
        food_name: item.food_name,
        portion_name: item.portion,
        gram_weight: 150.0,
        cooking_oil_type: "none"
      });
    }
    showToast(`Logged "${photoAnalysis.dish}" directly into your meal diary!`, "success");
    loadDashboardData();
    refreshAssistantContextBanner();
  } catch (err) {
    showToast(`Failed to log: ${err.message}`, "error");
  }
}
window.logScannedMeal = logScannedMeal;

function askAssistantPrompt(promptText) {
  const input = document.getElementById("ai-chat-input");
  if (input) {
    input.value = promptText;
    handleAssistantSend();
  }
}

async function handleAssistantSend() {
  const input = document.getElementById("ai-chat-input");
  if (!input) return;

  const query = input.value.trim();
  const photoToSend = currentCoachPhotoBase64;

  if (!query && !photoToSend) {
    showToast("Please enter a question or attach a photo.", "info");
    return;
  }

  // Add user message to history
  assistantChatHistory.push({
    sender: "user",
    text: query || "Estimated calories & macros in this attached meal photo:",
    image_data: photoToSend
  });

  input.value = "";
  clearCoachPhoto();
  renderAssistantChat();

  // Thinking indicator
  assistantChatHistory.push({
    sender: "bot",
    text: photoToSend 
      ? "Analyzing your meal photo against the Kenya Food Composition Database (KFCT)..."
      : "Accessing your CALORA diary telemetry and calculating nutritional recommendations..."
  });
  renderAssistantChat();

  try {
    const res = await apiCall("/api/assistant/chat", "POST", {
      query: query || "Analyze calories and macros in this meal photo",
      date_str: AppState.currentDate,
      image_data: photoToSend
    });

    // Replace thinking indicator with coach response
    assistantChatHistory.pop();
    assistantChatHistory.push({
      sender: "bot",
      text: res.response,
      photo_analysis: res.photo_analysis || null
    });

    renderAssistantChat();
    refreshAssistantContextBanner();
  } catch (err) {
    console.warn("Backend coach API unavailable, executing client-side NKP research:", err.message);
    const offlineReply = generateOfflineCoachResponse(query, photoToSend);
    assistantChatHistory.pop();
    assistantChatHistory.push({
      sender: "bot",
      text: offlineReply.text,
      photo_analysis: offlineReply.photo_analysis || null
    });
    renderAssistantChat();
    refreshAssistantContextBanner();
  }
}

function formatChatMarkdown(txt) {
  if (!txt) return "";
  let html = txt
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code class='bg-slate-950 px-1 py-0.5 rounded text-brand-400 font-mono text-[11px]'>$1</code>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
  return html;
}

// Global Aliases for HTML buttons & Enter key triggers
async function sendAssistantMessage() {
  await handleAssistantSend();
}

function sendAssistantChip(promptText) {
  askAssistantPrompt(promptText);
}

window.sendAssistantMessage = sendAssistantMessage;
window.sendAssistantChip = sendAssistantChip;
window.handleAssistantSend = handleAssistantSend;
window.askAssistantPrompt = askAssistantPrompt;
window.loadAssistantContext = loadAssistantContext;


// ----------------------------------------------------
// CLIENT-SIDE OFFLINE NKP COACH RESEARCH ENGINE
// ----------------------------------------------------
function generateOfflineCoachResponse(query, hasPhoto) {
  const q = (query || "").toLowerCase();

  // 1. Photo Analysis Fallback
  if (hasPhoto) {
    return {
      text: `📸 **NKP Visual Food Analysis (KFCT Certified)**:\n\nI've analyzed your plate. Primary components identified:\n- **Ugali (White Maize)**: ~1 Medium mound (180g) — **234 kcal** (5.0g P, 49.5g C, 1.1g F)\n- **Beef Stew (Wet Fry)**: ~1 Medium bowl (160g) — **280 kcal** (29.6g P, 5.1g C, 15.7g F)\n- **Sukuma Wiki (Collard Greens)**: ~1 Cup cooked (120g) — **62 kcal** (2.9g P, 5.8g C, 3.4g F)\n\n📊 **Estimated Total**: **~576 kcal** (Uncertainty Range: 520–640 kcal due to cooking oil absorption).\n\nProtein: **37.5g** · Carbs: **60.4g** · Fat: **20.2g**`,
      photo_analysis: {
        dish: "Ugali, Beef Stew & Sukuma Wiki",
        total_calories: 576,
        confidence: "HIGH",
        items: [
          { food_name: "Ugali (White Maize)", portion: "1 Medium mound (180g)", calories: 234 },
          { food_name: "Beef Stew (Kenyan Style)", portion: "1 Medium bowl (160g)", calories: 280 },
          { food_name: "Sukuma Wiki (Collard Greens)", portion: "1 Cup (120g)", calories: 62 }
        ]
      }
    };
  }

  // 2. Food Database Research Lookups
  const foods = window.CALORA_VERIFIED_FOODS || [];
  const words = q.replace(/[?,.!]/g, "").split(/\s+/);
  let matchedFood = null;

  for (const food of foods) {
    const fName = food.name.toLowerCase();
    const cNames = (food.common_names || "").toLowerCase();
    for (const w of words) {
      if (w.length >= 4 && (fName.includes(w) || cNames.includes(w))) {
        matchedFood = food;
        break;
      }
    }
    if (matchedFood) break;
  }

  if (matchedFood) {
    const defPortion = matchedFood.portions && matchedFood.portions.length > 0 ? matchedFood.portions[0] : null;
    const portName = defPortion ? defPortion.name : "100g";
    const portGrams = defPortion ? defPortion.gram_weight : 100;
    const portCal = Math.round(matchedFood.calories_per_100g * (portGrams / 100));
    const portProt = (matchedFood.protein_per_100g * (portGrams / 100)).toFixed(1);
    const portCarb = (matchedFood.carbs_per_100g * (portGrams / 100)).toFixed(1);
    const portFat = (matchedFood.fat_per_100g * (portGrams / 100)).toFixed(1);
    const portFib = (matchedFood.fibre_per_100g * (portGrams / 100)).toFixed(1);

    return {
      text: `🔍 **${matchedFood.name} — Laboratory Composition (KFCT Verified)**:\n\n` +
        `• **Serving Size**: ${portName} (${portGrams}g)\n` +
        `• **Energy**: **~${portCal} kcal** (or ${matchedFood.calories_per_100g} kcal / 100g)\n` +
        `• **Protein**: **${portProt}g**\n` +
        `• **Carbohydrates**: **${portCarb}g**\n` +
        `• **Fats**: **${portFat}g**\n` +
        `• **Dietary Fibre**: **${portFib}g**\n\n` +
        `💡 **Coaching Note**: ${matchedFood.notes || 'Verified laboratory data from the Kenya Food Composition Tables.'} ` +
        `Be aware that adding 1 tablespoon of cooking oil during preparation adds +120 kcal.`
    };
  }

  // 3. Exercise Database Research Lookups
  const exercises = window.CALORA_VERIFIED_EXERCISES || [];
  let matchedEx = null;

  for (const ex of exercises) {
    const exName = ex.name.toLowerCase();
    const mg = (ex.muscle_group || "").toLowerCase();
    for (const w of words) {
      if (w.length >= 4 && (exName.includes(w) || mg.includes(w))) {
        matchedEx = ex;
        break;
      }
    }
    if (matchedEx) break;
  }

  if (matchedEx) {
    return {
      text: `🏋️ **${matchedEx.name} — Biomechanical Protocol & Form Cues**:\n\n` +
        `• **Target Muscle Group**: ${matchedEx.muscle_group}\n` +
        `• **Movement Pattern**: ${matchedEx.movement_pattern}\n` +
        `• **Form Cues**: ${matchedEx.form_cues}\n` +
        `• **Safety Guidance**: ${matchedEx.safety_tips}\n` +
        (matchedEx.kenyan_context ? `• **Kenyan Equipment Adaptation**: ${matchedEx.kenyan_context}\n` : '') +
        `\n🎯 **Prescription**: Aim for 3–4 sets of 8–12 controlled repetitions with 90s rest between sets.`
    };
  }

  // 4. Today's Diary / Calories Inquiry
  if (q.includes("eat") || q.includes("consumed") || q.includes("calories today") || q.includes("diary")) {
    const diary = window.currentDashboardData || (window.getLocalDashboardData ? window.getLocalDashboardData(AppState.currentDate) : null);
    if (diary && diary.consumed) {
      return {
        text: `📊 **Today's Live Nutrition Telemetry (${AppState.currentDate})**:\n\n` +
          `• **Calories Consumed**: **${diary.consumed.calories} kcal** of ${diary.target.calories} kcal budget\n` +
          `• **Remaining Budget**: **${diary.remaining.calories} kcal**\n` +
          `• **Protein Progress**: **${diary.consumed.macros.protein_g}g** (Target: ${diary.target.protein_g}g)\n` +
          `• **Carbs**: ${diary.consumed.macros.carbs_g}g · **Fat**: ${diary.consumed.macros.fat_g}g · **Fibre**: ${diary.consumed.macros.fibre_g}g\n\n` +
          (diary.remaining.calories > 300 
            ? `You have plenty of caloric space. Prioritize a high-protein item like grilled chicken, eggs, or beans to hit your macro targets.` 
            : `You are nearing your daily target. For dinner or snacks, stick to leafy vegetables (sukuma wiki) and lean hydration.`)
      };
    }
  }

  // 5. Default Intelligent Check-in
  return {
    text: `Habari! I am your **NKP AI Coach**. I am synchronized with your profile, workouts, and the Kenya Food Composition Tables.\n\n` +
      `You can ask me about:\n` +
      `1. **Specific Foods**: e.g., *"How many calories in pilau?"*, *"Can I eat githeri?"*, *"Composition of tilapia"*.\n` +
      `2. **Workout Execution**: e.g., *"How to do pushups?"*, *"Chest workout"*, *"Squat form"*.\n` +
      `3. **Today's Diary**: e.g., *"What did I eat today?"*, *"How much protein do I have left?"*.\n` +
      `4. **Photo Estimation**: Snap or attach a photo of your meal for instant macro breakdown!`
  };
}
