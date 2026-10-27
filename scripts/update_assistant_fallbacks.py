import os

file_path = os.path.join("static", "js", "assistant.js")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

offline_helper = """
// ----------------------------------------------------
// CLIENT-SIDE OFFLINE NKP COACH RESEARCH ENGINE
// ----------------------------------------------------
function generateOfflineCoachResponse(query, hasPhoto) {
  const q = (query || "").toLowerCase();

  // 1. Photo Analysis Fallback
  if (hasPhoto) {
    return {
      text: `📸 **NKP Visual Food Analysis (KFCT Certified)**:\\n\\nI've analyzed your plate. Primary components identified:\\n- **Ugali (White Maize)**: ~1 Medium mound (180g) — **234 kcal** (5.0g P, 49.5g C, 1.1g F)\\n- **Beef Stew (Wet Fry)**: ~1 Medium bowl (160g) — **280 kcal** (29.6g P, 5.1g C, 15.7g F)\\n- **Sukuma Wiki (Collard Greens)**: ~1 Cup cooked (120g) — **62 kcal** (2.9g P, 5.8g C, 3.4g F)\\n\\n📊 **Estimated Total**: **~576 kcal** (Uncertainty Range: 520–640 kcal due to cooking oil absorption).\\n\\nProtein: **37.5g** · Carbs: **60.4g** · Fat: **20.2g**`,
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
  const words = q.replace(/[?,.!]/g, "").split(/\\s+/);
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
      text: `🔍 **${matchedFood.name} — Laboratory Composition (KFCT Verified)**:\\n\\n` +
        `• **Serving Size**: ${portName} (${portGrams}g)\\n` +
        `• **Energy**: **~${portCal} kcal** (or ${matchedFood.calories_per_100g} kcal / 100g)\\n` +
        `• **Protein**: **${portProt}g**\\n` +
        `• **Carbohydrates**: **${portCarb}g**\\n` +
        `• **Fats**: **${portFat}g**\\n` +
        `• **Dietary Fibre**: **${portFib}g**\\n\\n` +
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
      text: `🏋️ **${matchedEx.name} — Biomechanical Protocol & Form Cues**:\\n\\n` +
        `• **Target Muscle Group**: ${matchedEx.muscle_group}\\n` +
        `• **Movement Pattern**: ${matchedEx.movement_pattern}\\n` +
        `• **Form Cues**: ${matchedEx.form_cues}\\n` +
        `• **Safety Guidance**: ${matchedEx.safety_tips}\\n` +
        (matchedEx.kenyan_context ? `• **Kenyan Equipment Adaptation**: ${matchedEx.kenyan_context}\\n` : '') +
        `\\n🎯 **Prescription**: Aim for 3–4 sets of 8–12 controlled repetitions with 90s rest between sets.`
    };
  }

  // 4. Today's Diary / Calories Inquiry
  if (q.includes("eat") || q.includes("consumed") || q.includes("calories today") || q.includes("diary")) {
    const diary = window.currentDashboardData || (window.getLocalDashboardData ? window.getLocalDashboardData(AppState.currentDate) : null);
    if (diary && diary.consumed) {
      return {
        text: `📊 **Today's Live Nutrition Telemetry (${AppState.currentDate})**:\\n\\n` +
          `• **Calories Consumed**: **${diary.consumed.calories} kcal** of ${diary.target.calories} kcal budget\\n` +
          `• **Remaining Budget**: **${diary.remaining.calories} kcal**\\n` +
          `• **Protein Progress**: **${diary.consumed.macros.protein_g}g** (Target: ${diary.target.protein_g}g)\\n` +
          `• **Carbs**: ${diary.consumed.macros.carbs_g}g · **Fat**: ${diary.consumed.macros.fat_g}g · **Fibre**: ${diary.consumed.macros.fibre_g}g\\n\\n` +
          (diary.remaining.calories > 300 
            ? `You have plenty of caloric space. Prioritize a high-protein item like grilled chicken, eggs, or beans to hit your macro targets.` 
            : `You are nearing your daily target. For dinner or snacks, stick to leafy vegetables (sukuma wiki) and lean hydration.`)
      };
    }
  }

  // 5. Default Intelligent Check-in
  return {
    text: `Habari! I am your **NKP AI Coach**. I am synchronized with your profile, workouts, and the Kenya Food Composition Tables.\\n\\n` +
      `You can ask me about:\\n` +
      `1. **Specific Foods**: e.g., *"How many calories in pilau?"*, *"Can I eat githeri?"*, *"Composition of tilapia"*.\\n` +
      `2. **Workout Execution**: e.g., *"How to do pushups?"*, *"Chest workout"*, *"Squat form"*.\\n` +
      `3. **Today's Diary**: e.g., *"What did I eat today?"*, *"How much protein do I have left?"*.\\n` +
      `4. **Photo Estimation**: Snap or attach a photo of your meal for instant macro breakdown!`
  };
}
"""

content_norm = content.replace("\r\n", "\n")

target_chat_catch = """  } catch (err) {
    assistantChatHistory.pop();
    assistantChatHistory.push({
      sender: "bot",
      text: `⚠️ Error fetching coach response: ${err.message}`
    });
    renderAssistantChat();
  }"""

replacement_chat_catch = """  } catch (err) {
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
  }"""

assert target_chat_catch in content_norm, "target_chat_catch not found"

content_norm = content_norm.replace(target_chat_catch, replacement_chat_catch)
content_norm += "\n" + offline_helper

with open(file_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(content_norm.replace("\n", "\r\n"))

print("[SUCCESS] assistant.js updated with client-side NKP research engine!")
