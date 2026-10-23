/**
 * CALORA - AI Nutrition Assistant & Smart Meal Recommendation Engine
 * Accuracy over assumptions.
 */

let assistantChatHistory = [
  {
    sender: "bot",
    text: "Hello! I am your CALORA Nutrition Assistant. I use your real-time diary status and verified food composition tables to answer questions and suggest meals without fabricating precision. How can I help you today?"
  }
];

async function loadAssistantContext() {
  await Promise.all([
    refreshAssistantContextBanner(),
    refreshRecommendations()
  ]);
  renderAssistantChat();
}

async function refreshAssistantContextBanner() {
  try {
    const res = await apiCall(`/api/assistant/recommendations?date_str=${AppState.currentDate}`);
    const ctx = res.context;

    const calEl = document.getElementById("ai-context-remaining-cal");
    const protEl = document.getElementById("ai-context-remaining-protein");

    if (calEl) calEl.textContent = `${ctx.remaining_calories} kcal`;
    if (protEl) protEl.textContent = `${ctx.remaining_protein_g}g`;
  } catch (err) {
    console.error("Context fetch error:", err);
  }
}

// ----------------------------------------------------
// 1. MEAL RECOMMENDATION ENGINE (Section 28)
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

    drawer.innerHTML = recs.map(rec => `
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

          <!-- Items list -->
          <div class="space-y-1 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800 text-[11px]">
            ${rec.items.map(i => `
              <div class="flex justify-between text-slate-300">
                <span>${i.portion} ${i.food_name}</span>
                <span class="font-mono text-slate-400">${i.calories} kcal</span>
              </div>
            `).join("")}
          </div>

          <!-- Macros -->
          <div class="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Protein: <strong class="text-white">${rec.protein_g}g</strong></span>
            <span>Fibre: <strong class="text-white">${rec.fibre_g}g</strong></span>
            <span>Range: <strong class="text-slate-300">${rec.likely_range}</strong></span>
          </div>

          <p class="text-[10px] text-slate-500 italic">${rec.uncertainty_note}</p>
        </div>

        <button onclick='logRecommendedMeal(${JSON.stringify(rec)})' class="w-full bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-200 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 border border-slate-700">
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
        gram_weight: 150,
        calories: item.calories,
        cooking_oil_type: "none"
      });
    }

    showToast(`Logged "${rec.title}" to Dinner!`, "success");
    switchTab("dashboard");
  } catch (err) {
    showToast(err.message, "error");
  }
}


// ----------------------------------------------------
// 2. CONTEXTUAL AI CHAT (Section 27)
// ----------------------------------------------------

function renderAssistantChat() {
  const container = document.getElementById("ai-chat-messages");
  if (!container) return;

  container.innerHTML = assistantChatHistory.map(msg => `
    <div class="flex items-start space-x-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}">
      ${msg.sender === 'bot' ? `
        <div class="w-7 h-7 rounded-lg bg-brand-500 text-slate-950 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
          <i data-lucide="bot" class="w-4 h-4"></i>
        </div>
      ` : ''}

      <div class="max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
        msg.sender === 'user' ? 'bg-brand-600 text-slate-950 font-medium rounded-br-none' :
        'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none space-y-1.5'
      }">
        ${formatAssistantResponseMarkdown(msg.text)}
      </div>

      ${msg.sender === 'user' ? `
        <div class="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
          ${AppState.user ? AppState.user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      ` : ''}
    </div>
  `).join("");

  container.scrollTop = container.scrollHeight;
  lucide.createIcons();
}

function formatAssistantResponseMarkdown(text) {
  // Simple clean markdown parser for bold, lists, and line breaks
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n\d\. /g, '<br>• ');
  return html;
}

function sendAssistantChip(text) {
  const input = document.getElementById("ai-chat-input");
  if (input) {
    input.value = text;
    sendAssistantMessage();
  }
}

async function sendAssistantMessage() {
  const input = document.getElementById("ai-chat-input");
  if (!input || !input.value.trim()) return;

  const query = input.value.trim();
  input.value = "";

  assistantChatHistory.push({ sender: "user", text: query });
  renderAssistantChat();

  const sendBtn = document.getElementById("ai-chat-send-btn");
  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await apiCall("/api/assistant/chat", "POST", {
      query: query,
      date: AppState.currentDate
    });

    assistantChatHistory.push({ sender: "bot", text: res.response });
    renderAssistantChat();
  } catch (err) {
    assistantChatHistory.push({ sender: "bot", text: "Sorry, I encountered an error connecting to the nutrition engine: " + err.message });
    renderAssistantChat();
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}
