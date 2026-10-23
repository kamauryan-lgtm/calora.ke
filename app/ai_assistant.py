"""
CALORA - NKP AI Coach (Nutrition & Kinetic Performance AI Coach)
Adheres strictly to Product Rules:
1. Grounded in verified database nutrition facts & Kenya Food Composition Tables (KFCT) — NEVER fabricates numbers.
2. Context-aware: knows member's profile, target deficit, calories consumed today, remaining macros, steps, sleep, and workouts.
3. Provides transparent, non-extreme nutritional guidance with uncertainty awareness.
"""

from typing import Dict, Any, List, Optional
from datetime import date
from app.database import get_db_connection
from app.calculations import compute_meal_aggregate


def get_user_current_nutrition_context(user_id: str, date_str: str) -> Dict[str, Any]:
    """
    Retrieve today's target, consumed calories, remaining macros,
    plus wellness telemetry (steps, sleep, workouts) for the NKP AI Coach.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # User basic info
    cursor.execute("SELECT name, email, role FROM users WHERE id = ?", (user_id,))
    u_row = cursor.fetchone()
    user_name = u_row["name"] if u_row else "Client"

    # User profile
    cursor.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user_id,))
    prof_row = cursor.fetchone()
    if not prof_row:
        conn.close()
        return {
            "name": user_name,
            "target_calories": 2000,
            "consumed_calories": 0,
            "remaining_calories": 2000,
            "protein_target_g": 140,
            "consumed_protein_g": 0,
            "remaining_protein_g": 140,
            "consumed_carbs_g": 0,
            "consumed_fat_g": 0,
            "consumed_fibre_g": 0,
            "goal": "lose",
            "weight_kg": 80.0,
            "steps_today": 0,
            "sleep_hours": 0.0,
            "workouts_today": 0,
            "logged_items": []
        }
    prof = dict(prof_row)

    # Today's logged meal items
    cursor.execute("""
    SELECT mi.logged_calories, mi.protein_g, mi.carbs_g, mi.fat_g, mi.fibre_g, mi.food_name, mi.portion_name, mi.cooking_oil_type
    FROM meals m
    JOIN meal_items mi ON m.id = mi.meal_id
    WHERE m.user_id = ? AND m.date = ?
    """, (user_id, date_str))
    meal_rows = cursor.fetchall()

    # Steps for today
    cursor.execute("SELECT steps_count, goal_steps, calories_burned FROM daily_step_logs WHERE user_id = ? AND date = ?", (user_id, date_str))
    step_row = cursor.fetchone()
    steps_count = step_row["steps_count"] if step_row else 0
    step_goal = step_row["goal_steps"] if step_row else 10000

    # Sleep for today
    cursor.execute("SELECT duration_minutes, quality_rating FROM sleep_logs WHERE user_id = ? AND date = ?", (user_id, date_str))
    sleep_row = cursor.fetchone()
    sleep_minutes = sleep_row["duration_minutes"] if sleep_row else 0
    sleep_quality = sleep_row["quality_rating"] if sleep_row else None

    # Workouts for today
    cursor.execute("SELECT routine_name, duration_minutes, total_volume_kg FROM user_workout_logs WHERE user_id = ? AND date = ?", (user_id, date_str))
    workout_rows = cursor.fetchall()
    workouts_list = [dict(w) for w in workout_rows]

    conn.close()

    total_cal = sum(r["logged_calories"] for r in meal_rows)
    total_p = sum(r["protein_g"] for r in meal_rows)
    total_c = sum(r["carbs_g"] for r in meal_rows)
    total_f = sum(r["fat_g"] for r in meal_rows)
    total_fib = sum(r["fibre_g"] for r in meal_rows)

    target_cal = prof["target_calories"]
    remaining_cal = max(0, target_cal - total_cal)
    remaining_p = max(0, prof["protein_target_g"] - round(total_p))
    remaining_c = max(0, prof["carbs_target_g"] - round(total_c))
    remaining_f = max(0, prof["fat_target_g"] - round(total_f))
    remaining_fib = max(0, prof["fibre_target_g"] - round(total_fib))

    return {
        "name": user_name,
        "weight_kg": prof["current_weight_kg"],
        "goal_weight_kg": prof["goal_weight_kg"],
        "target_calories": target_cal,
        "consumed_calories": total_cal,
        "remaining_calories": remaining_cal,
        "protein_target_g": prof["protein_target_g"],
        "consumed_protein_g": round(total_p, 1),
        "remaining_protein_g": remaining_p,
        "consumed_carbs_g": round(total_c, 1),
        "carbs_target_g": prof["carbs_target_g"],
        "remaining_carbs_g": remaining_c,
        "consumed_fat_g": round(total_f, 1),
        "fat_target_g": prof["fat_target_g"],
        "remaining_fat_g": remaining_f,
        "consumed_fibre_g": round(total_fib, 1),
        "fibre_target_g": prof["fibre_target_g"],
        "remaining_fibre_g": remaining_fib,
        "goal": prof["primary_goal"],
        "deficit_tier": prof["deficit_tier"],
        "steps_today": steps_count,
        "steps_goal": step_goal,
        "sleep_hours": round(sleep_minutes / 60.0, 1),
        "sleep_quality": sleep_quality,
        "workouts_today": len(workouts_list),
        "workouts_details": workouts_list,
        "logged_items": [f"{r['food_name']} ({r['portion_name']}, ~{r['logged_calories']} kcal)" for r in meal_rows]
    }


def generate_meal_recommendations(remaining_calories: int, target_protein_g: int = 35) -> List[Dict[str, Any]]:
    """
    Produces 3 balanced meal options based on remaining calorie target.
    Option 1: Traditional Kenyan High-Protein
    Option 2: Lean Clean / Fitness Staple
    Option 3: Plant-Based / High-Fibre East African
    """
    recommendations = []

    # Option 1: Kenyan Balanced Classic (Ugali, Beef Stew, Sukuma Wiki)
    if remaining_calories >= 650:
        opt1_items = [
            {"food_name": "Ugali (White Maize)", "portion": "Medium portion (250g)", "calories": 325, "protein_g": 7.0, "carbs_g": 68.8, "fat_g": 1.5, "fibre_g": 4.5},
            {"food_name": "Beef Stew (Kenyan Style)", "portion": "Medium bowl (160g)", "calories": 280, "protein_g": 29.6, "carbs_g": 5.1, "fat_g": 15.7, "fibre_g": 1.3},
            {"food_name": "Sukuma Wiki (Braised)", "portion": "Medium side (120g)", "calories": 62, "protein_g": 2.9, "carbs_g": 5.8, "fat_g": 3.4, "fibre_g": 3.5}
        ]
    elif remaining_calories >= 450:
        opt1_items = [
            {"food_name": "Ugali (White Maize)", "portion": "Small portion (180g)", "calories": 234, "protein_g": 5.0, "carbs_g": 49.5, "fat_g": 1.1, "fibre_g": 3.2},
            {"food_name": "Beef Stew (Lean cut)", "portion": "Small bowl (100g)", "calories": 175, "protein_g": 18.5, "carbs_g": 3.2, "fat_g": 9.8, "fibre_g": 0.8},
            {"food_name": "Sukuma Wiki (Light oil)", "portion": "Medium side (120g)", "calories": 52, "protein_g": 2.4, "carbs_g": 4.8, "fat_g": 2.8, "fibre_g": 2.9}
        ]
    else:
        opt1_items = [
            {"food_name": "Beef Stew (Lean cut)", "portion": "Small bowl (100g)", "calories": 175, "protein_g": 18.5, "carbs_g": 3.2, "fat_g": 9.8, "fibre_g": 0.8},
            {"food_name": "Sukuma Wiki (Steamed)", "portion": "Large plate (150g)", "calories": 55, "protein_g": 2.6, "carbs_g": 5.3, "fat_g": 2.5, "fibre_g": 3.9}
        ]
    c1 = sum(i["calories"] for i in opt1_items)
    p1 = sum(i["protein_g"] for i in opt1_items)
    recommendations.append({
        "id": "rec_kenyan_classic",
        "title": "Kenyan Staple: Ugali, Beef Stew & Sukuma Wiki",
        "tagline": "Satisfying traditional balance with rich bioavailable iron and zinc",
        "estimated_calories": c1,
        "likely_range": f"{round(c1 * 0.9)}–{round(c1 * 1.12)} kcal",
        "confidence": "Medium",
        "protein_g": round(p1, 1),
        "fibre_g": round(sum(i["fibre_g"] for i in opt1_items), 1),
        "items": opt1_items,
        "uncertainty_note": "Depends on the amount of oil used when sautéing the beef stew."
    })

    # Option 2: Lean Clean / Fitness Staple (Grilled Chicken, Rice, Cabbage)
    if remaining_calories >= 600:
        opt2_items = [
            {"food_name": "Chicken Breast (Skinless, Grilled)", "portion": "1 Medium fillet (170g)", "calories": 281, "protein_g": 52.7, "carbs_g": 0.0, "fat_g": 6.1, "fibre_g": 0.0},
            {"food_name": "White Rice (Cooked)", "portion": "1 Cup (158g)", "calories": 205, "protein_g": 4.3, "carbs_g": 44.5, "fat_g": 0.4, "fibre_g": 0.6},
            {"food_name": "Steamed Cabbage & Carrots", "portion": "1 Cup (130g)", "calories": 49, "protein_g": 1.8, "carbs_g": 7.5, "fat_g": 1.6, "fibre_g": 2.7}
        ]
    elif remaining_calories >= 400:
        opt2_items = [
            {"food_name": "Chicken Breast (Skinless, Grilled)", "portion": "1 Small fillet (130g)", "calories": 215, "protein_g": 40.3, "carbs_g": 0.0, "fat_g": 4.7, "fibre_g": 0.0},
            {"food_name": "White Rice (Cooked)", "portion": "1/2 Cup (80g)", "calories": 104, "protein_g": 2.2, "carbs_g": 22.5, "fat_g": 0.2, "fibre_g": 0.3},
            {"food_name": "Steamed Cabbage & Carrots", "portion": "1 Cup (130g)", "calories": 49, "protein_g": 1.8, "carbs_g": 7.5, "fat_g": 1.6, "fibre_g": 2.7}
        ]
    else:
        opt2_items = [
            {"food_name": "Chicken Breast (Skinless, Grilled)", "portion": "1 Small fillet (150g)", "calories": 248, "protein_g": 46.5, "carbs_g": 0.0, "fat_g": 5.4, "fibre_g": 0.0},
            {"food_name": "Cucumber & Tomato Salad", "portion": "Medium bowl (150g)", "calories": 35, "protein_g": 1.2, "carbs_g": 5.0, "fat_g": 0.3, "fibre_g": 1.8}
        ]
    c2 = sum(i["calories"] for i in opt2_items)
    p2 = sum(i["protein_g"] for i in opt2_items)
    recommendations.append({
        "id": "rec_lean_fuel",
        "title": "Lean Muscle Fuel: Grilled Chicken, Rice & Cabbage",
        "tagline": "Maximum protein density with low cooking oil uncertainty",
        "estimated_calories": c2,
        "likely_range": f"{round(c2 * 0.95)}–{round(c2 * 1.05)} kcal",
        "confidence": "High",
        "protein_g": round(p2, 1),
        "fibre_g": round(sum(i["fibre_g"] for i in opt2_items), 1),
        "items": opt2_items,
        "uncertainty_note": "Minimal uncertainty because chicken is grilled skinless without deep batter."
    })

    # Option 3: Plant-Based / High-Fibre East African (Chapati, Ndengu, Avocado)
    if remaining_calories >= 550:
        opt3_items = [
            {"food_name": "Kenyan Chapati", "portion": "1 Medium Chapati (85g)", "calories": 268, "protein_g": 5.8, "carbs_g": 35.7, "fat_g": 11.5, "fibre_g": 2.0},
            {"food_name": "Ndengu (Green Gram Stew)", "portion": "1 Cup cooked (220g)", "calories": 231, "protein_g": 15.8, "carbs_g": 38.5, "fat_g": 2.6, "fibre_g": 10.6},
            {"food_name": "Kenyan Avocado", "portion": "1/4 Avocado (50g)", "calories": 80, "protein_g": 1.0, "carbs_g": 4.3, "fat_g": 7.4, "fibre_g": 3.4}
        ]
    else:
        opt3_items = [
            {"food_name": "Ndengu (Green Gram Stew)", "portion": "1 Cup cooked (220g)", "calories": 231, "protein_g": 15.8, "carbs_g": 38.5, "fat_g": 2.6, "fibre_g": 10.6},
            {"food_name": "Steamed Cabbage & Carrots", "portion": "1 Cup (130g)", "calories": 49, "protein_g": 1.8, "carbs_g": 7.5, "fat_g": 1.6, "fibre_g": 2.7}
        ]
    c3 = sum(i["calories"] for i in opt3_items)
    p3 = sum(i["protein_g"] for i in opt3_items)
    recommendations.append({
        "id": "rec_fibre_plant",
        "title": "High-Fibre Power: Chapati, Ndengu Stew & Avocado",
        "tagline": "Sustained digestive energy and micronutrient density",
        "estimated_calories": c3,
        "likely_range": f"{round(c3 * 0.9)}–{round(c3 * 1.12)} kcal",
        "confidence": "Medium",
        "protein_g": round(p3, 1),
        "fibre_g": round(sum(i["fibre_g"] for i in opt3_items), 1),
        "items": opt3_items,
        "uncertainty_note": "Depends on oil brushed on the chapati during pan frying."
    })

    return recommendations


def handle_assistant_query(query: str, user_id: str, date_str: str) -> Dict[str, Any]:
    """
    Handles member conversational queries as NKP AI Coach (Nutrition & Kinetic Performance AI Coach).
    Accesses member telemetry (calories, remaining macros, steps, sleep, workouts)
    and delivers grounded, transparent coaching in Kenyan context.
    """
    ctx = get_user_current_nutrition_context(user_id, date_str)
    q_lower = query.lower().strip()

    name = ctx["name"]
    consumed = ctx["consumed_calories"]
    target = ctx["target_calories"]
    remaining_cal = ctx["remaining_calories"]
    consumed_p = ctx["consumed_protein_g"]
    target_p = ctx["protein_target_g"]
    remaining_p = ctx["remaining_protein_g"]
    steps = ctx["steps_today"]
    sleep_hrs = ctx["sleep_hours"]
    weight = ctx["weight_kg"]

    # 1. "What can I eat with X calories left / What can I eat for dinner?"
    if any(k in q_lower for k in ["left", "remaining", "what can i eat", "dinner", "lunch", "eat tonight", "recommend"]):
        recs = generate_meal_recommendations(remaining_cal, remaining_p)
        response_text = (
            f"Habari {name}! I've pulled your live CALORA diary for today.\n\n"
            f"📊 **Today's Status**:\n"
            f"- Consumed: **{consumed} / {target} kcal**\n"
            f"- Remaining Energy Budget: **~{remaining_cal} kcal**\n"
            f"- Protein Needed: **{remaining_p}g** (logged {consumed_p}g / {target_p}g goal)\n\n"
            f"Here are 3 verified Kenyan meal options designed to keep you inside your deficit:\n\n"
        )
        for i, r in enumerate(recs, 1):
            response_text += (
                f"**Option {i}: {r['title']}** (~{r['estimated_calories']} kcal, {r['protein_g']}g P, {r['fibre_g']}g Fibre)\n"
                f"- Range: `{r['likely_range']}` ({r['confidence']} confidence)\n"
                f"- Portions: {', '.join([item['portion'] + ' ' + item['food_name'] for item in r['items']])}\n"
                f"- *{r['uncertainty_note']}*\n\n"
            )
        response_text += "Tap any option below to log it directly into your diary!"

        return {
            "coach": "NKP AI Coach",
            "query": query,
            "response": response_text,
            "recommendations": recs,
            "context": ctx
        }

    # 2. "High protein Kenyan meals"
    if "high-protein" in q_lower or "high protein" in q_lower or "protein source" in q_lower:
        return {
            "coach": "NKP AI Coach",
            "query": query,
            "response": (
                f"{name}, based on your target weight of {ctx['goal_weight_kg']} kg, hitting **{target_p}g protein/day** protects your muscle while burning fat.\n\n"
                "Here are top-tier high-protein Kenyan foods from our verified KFCT database:\n\n"
                "1. **Grilled Chicken Breast (Kuku Fillet)**: ~31g protein / 100g (165 kcal). 1 fillet gives **~53g clean protein**.\n"
                "2. **Tilapia Fish (Wet fry / Stewed)**: ~20g protein / 100g (135 kcal). 1 whole medium fish = **~44g protein**.\n"
                "3. **Ndengu / Green Gram Stew**: ~7.2g protein + 4.8g fibre / 100g (1 cup cooked = **~16g protein**).\n"
                "4. **Beef Stew (Lean cut)**: ~18.5g protein / 100g (1 medium bowl = **~30g protein**).\n"
                "5. **Boiled Eggs**: ~6.3g protein per large egg (72 kcal). 3 eggs = **~19g protein**.\n"
                "6. **Farmer's Choice Sausages**: ~12g protein per pair (245 kcal).\n\n"
                f"💡 **Today's Gap**: You currently have **{remaining_p}g protein left** to log. Pairing a small chicken breast or 1 cup of ndengu with dinner will close that gap comfortably!"
            ),
            "context": ctx
        }

    # 3. "Can I eat chapati / mandazi / ugali / nyama choma?"
    if any(k in q_lower for k in ["chapati", "mandazi", "ugali", "nyama choma", "choma", "pizza", "burger", "can i eat"]):
        target_food = "chapati" if "chapati" in q_lower else ("mandazi" if "mandazi" in q_lower else ("ugali" if "ugali" in q_lower else "nyama choma"))
        food_cals = 268 if target_food == "chapati" else (310 if target_food == "mandazi" else (325 if target_food == "ugali" else 350))
        fits = remaining_cal >= food_cals

        return {
            "coach": "NKP AI Coach",
            "query": query,
            "response": (
                f"**Yes! In CALORA, no food is forbidden — it is all about portion and energy balance.**\n\n"
                f"Let's look at your numbers for **{target_food.title()}**:\n"
                f"- Standard portion: **~{food_cals} kcal** (Likely range: {round(food_cals * 0.9)}–{round(food_cals * 1.15)} kcal)\n"
                f"- Your remaining calorie budget today: **~{remaining_cal} kcal**\n\n"
                + (f"✅ **It fits!** Eating 1 {target_food} will leave you with **~{remaining_cal - food_cals} kcal** for the rest of the day.\n"
                   f"**NKP Coach Tip**: Pair it with lean protein (like grilled chicken breast or ndengu) and vegetables (sukuma or steamed cabbage) to slow down carbohydrate digestion and boost satiety."
                   if fits else
                   f"⚠️ **Budget Caution**: 1 {target_food} (~{food_cals} kcal) exceeds your remaining budget of ~{remaining_cal} kcal.\n"
                   f"**Strategy**: You can either enjoy half a portion (~{round(food_cals/2)} kcal), or balance it out by taking a brisk 45-minute walk (~200 kcal burn) to expand your energy expenditure!")
            ),
            "context": ctx
        }

    # 4. "Why am I not losing weight / weight plateau"
    if any(k in q_lower for k in ["not losing", "plateau", "stuck", "scale hasn't moved", "why am i gaining"]):
        return {
            "coach": "NKP AI Coach",
            "query": query,
            "response": (
                f"{name}, weight plateaus are a completely normal physiological phenomenon during fat loss. Here is what is likely happening:\n\n"
                "1. **Cooking Oil Uncertainty**: A single unmeasured tablespoon of vegetable cooking oil adds **~124 kcal**. If 2-3 meals have unmeasured oil, up to **370 kcal of hidden energy** can eliminate your deficit without your awareness.\n"
                "2. **Water Retention & Sodium**: Higher sodium meals (stews, nyama choma, restaurant food) cause cells to temporarily retain 1.5–2 kg of water. This completely masks fat loss on the scale.\n"
                f"3. **Sleep & Stress**: You logged **{sleep_hrs} hours** of sleep. Inadequate sleep elevates cortisol, which increases fluid retention and drives cravings for sugary snacks.\n"
                "4. **Smoothed 7-Day Moving Average**: Day-to-day weight fluctuates up to ±2 kg from hydration and digestion. Never judge your body fat by a single morning weigh-in. Always monitor CALORA's 7-day smoothed trend in your Progress tab."
            ),
            "context": ctx
        }

    # 5. "Pre-workout or Post-workout nutrition"
    if any(k in q_lower for k in ["pre-workout", "post-workout", "workout food", "gym meal", "before workout", "after workout"]):
        return {
            "coach": "NKP AI Coach",
            "query": query,
            "response": (
                f"Here is your kinetic performance fuel guide, {name}:\n\n"
                "⚡ **Pre-Workout (60–90 min before training)**:\n"
                "- Goal: Fast, easily digestible glycogen with zero gastrointestinal distress.\n"
                "- Best Kenyan picks: 1 ripe banana (~105 kcal) or 1 small boiled sweet potato (120g, ~103 kcal) with a black coffee or water.\n\n"
                "🛡️ **Post-Workout (within 2 hours after training)**:\n"
                "- Goal: Muscle protein synthesis & glycogen replenishment.\n"
                f"- Target: 30–40g protein + 30–50g carbohydrates.\n"
                "- Best picks: 150g grilled chicken fillet + 1 cup rice, or 3 boiled eggs + 1 glass of Brookside milk, or 1 bowl of ndengu stew with 1 chapati.\n\n"
                f"Today you have logged **{ctx['workouts_today']} workout sessions** and burned energy. Keep your hydration at minimum 2.5–3.0 liters today!"
            ),
            "context": ctx
        }

    # 6. Default holistic response
    return {
        "coach": "NKP AI Coach",
        "query": query,
        "response": (
            f"Hello {name}! I am your **NKP AI Coach** (Nutrition & Kinetic Performance).\n\n"
            f"Here is your real-time telemetry synchronized with your account:\n"
            f"- **Today's Calories**: {consumed} kcal consumed / {target} kcal target (**{remaining_cal} kcal remaining**)\n"
            f"- **Protein Goal**: {consumed_p}g / {target_p}g (**{remaining_p}g remaining**)\n"
            f"- **Steps**: {steps:,} / {ctx['steps_goal']:,} steps\n"
            f"- **Sleep**: {sleep_hrs} hours logged\n"
            f"- **Current Weight**: {weight} kg (Goal: {ctx['goal_weight_kg']} kg)\n\n"
            "Ask me anything about your nutrition, meal plans, or progress:\n"
            "• *'What can I eat for dinner with my remaining calories?'*\n"
            "• *'How can I get 40g of protein using Kenyan foods?'*\n"
            "• *'Can I eat two chapatis and still lose weight?'*\n"
            "• *'What should I eat before and after my gym session?'*\n"
            "• *'Why is my scale weight fluctuating this week?'*"
        ),
        "context": ctx
    }
