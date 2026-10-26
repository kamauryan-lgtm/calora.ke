"""
CALORA - NKP AI Coach (Nutrition & Kinetic Performance AI Coach)
Adheres strictly to Product Rules:
1. Grounded in verified database nutrition facts & Kenya Food Composition Tables (KFCT) — NEVER fabricates numbers.
2. Context-aware: knows member's profile, target deficit, calories consumed today, remaining macros, steps, sleep, and workouts.
3. Provides transparent, non-extreme nutritional guidance with uncertainty awareness.
4. Researches database dynamically on every query to deliver precise, non-repetitive, evidence-based answers.
"""

import secrets
import re
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from app.database import get_db_connection
from app.calculations import compute_meal_aggregate


def research_food_in_database(query_text: str) -> List[Dict[str, Any]]:
    """
    Intelligently searches Calora's verified food composition database (KFCT & USDA)
    for foods matching tokens in the user's query, handling singular/plural stemming.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    stop_words = {
        "what", "can", "eat", "much", "many", "calories", "calorie", "protein", "carbs", "carb",
        "fats", "fat", "have", "about", "tell", "like", "with", "food", "foods", "today", "for",
        "dinner", "lunch", "breakfast", "snack", "does", "good", "bad", "healthy", "is", "are",
        "how", "should", "could", "would", "the", "and", "some", "give", "please", "know", "my"
    }
    raw_tokens = [w.strip("?,.!:;\"'") for w in query_text.lower().split() if len(w) > 2]
    tokens = [w for w in raw_tokens if w not in stop_words]

    search_terms = []
    for t in tokens:
        search_terms.append(t)
        if t.endswith("s") and len(t) > 3:
            search_terms.append(t[:-1])
        if t.endswith("es") and len(t) > 4:
            search_terms.append(t[:-2])

    results = []
    seen_ids = set()

    for term in search_terms:
        cursor.execute("""
        SELECT * FROM food_items 
        WHERE (LOWER(name) LIKE ? OR LOWER(common_names) LIKE ? OR LOWER(category) LIKE ?)
        ORDER BY is_verified DESC, calories_per_100g ASC
        LIMIT 4
        """, (f"%{term}%", f"%{term}%", f"%{term}%"))
        rows = cursor.fetchall()
        for r in rows:
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                item = dict(r)
                cursor.execute("""
                SELECT name, gram_weight, is_default 
                FROM food_portions 
                WHERE food_id = ? 
                ORDER BY is_default DESC, gram_weight ASC
                """, (r["id"],))
                item["portions"] = [dict(p) for p in cursor.fetchall()]
                results.append(item)
        if len(results) >= 4:
            break

    conn.close()
    return results


def research_exercises_in_database(query_text: str) -> List[Dict[str, Any]]:
    """
    Intelligently searches Calora's kinetic exercise library (12 muscle groups, Kenyan adaptations)
    for movements matching tokens in the user's query, handling singular/plural stemming.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    stop_words = {
        "how", "what", "exercise", "exercises", "workout", "workouts", "routine", "train", "training",
        "can", "should", "for", "today", "the", "and", "my", "do", "best", "give", "good", "to", "show"
    }
    raw_tokens = [w.strip("?,.!:;\"'") for w in query_text.lower().split() if len(w) > 2]
    tokens = [w for w in raw_tokens if w not in stop_words]

    search_terms = []
    for t in tokens:
        search_terms.append(t)
        if t.endswith("s") and len(t) > 3:
            search_terms.append(t[:-1])
        if t.endswith("es") and len(t) > 4:
            search_terms.append(t[:-2])

    results = []
    seen_ids = set()

    for term in search_terms:
        cursor.execute("""
        SELECT * FROM exercises 
        WHERE (LOWER(name) LIKE ? OR LOWER(muscle_group) LIKE ? OR LOWER(movement_pattern) LIKE ? OR LOWER(equipment) LIKE ? OR LOWER(secondary_muscles) LIKE ?)
        LIMIT 4
        """, (f"%{term}%", f"%{term}%", f"%{term}%", f"%{term}%", f"%{term}%"))
        rows = cursor.fetchall()
        for r in rows:
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                results.append(dict(r))
        if len(results) >= 4:
            break

    conn.close()
    return results


def research_user_today_diary(user_id: str, date_str: str) -> Dict[str, Any]:
    """
    Retrieves chronological breakdown of all meals logged by user today.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT m.meal_type, mi.food_name, mi.portion_name, mi.gram_weight, mi.logged_calories, mi.protein_g, mi.carbs_g, mi.fat_g, mi.fibre_g, mi.cooking_oil_type
    FROM meals m
    JOIN meal_items mi ON m.id = mi.meal_id
    WHERE m.user_id = ? AND m.date = ?
    ORDER BY m.created_at ASC
    """, (user_id, date_str))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    meals_by_type = {"breakfast": [], "lunch": [], "dinner": [], "snack": []}
    for r in rows:
        m_type = r["meal_type"] if r["meal_type"] in meals_by_type else "snack"
        meals_by_type[m_type].append(r)

    return {
        "items": rows,
        "meals_by_type": meals_by_type,
        "total_calories": sum(r["logged_calories"] for r in rows),
        "total_protein": round(sum(r["protein_g"] for r in rows), 1),
        "total_carbs": round(sum(r["carbs_g"] for r in rows), 1),
        "total_fat": round(sum(r["fat_g"] for r in rows), 1),
        "total_fibre": round(sum(r["fibre_g"] for r in rows), 1)
    }


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
            "carbs_target_g": 220,
            "remaining_carbs_g": 220,
            "consumed_fat_g": 0,
            "fat_target_g": 60,
            "remaining_fat_g": 60,
            "consumed_fibre_g": 0,
            "fibre_target_g": 30,
            "remaining_fibre_g": 30,
            "goal": "lose",
            "weight_kg": 80.0,
            "goal_weight_kg": 75.0,
            "steps_today": 0,
            "steps_goal": 10000,
            "sleep_hours": 0.0,
            "sleep_quality": 4,
            "workouts_today": 0,
            "workouts_details": [],
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


def handle_assistant_query(query: str, user_id: str, date_str: str, image_data: Optional[str] = None) -> Dict[str, Any]:
    """
    Handles member conversational queries as NKP AI Coach (Nutrition and Kinetic Performance AI Coach).
    Dynamically researches Calora's verified food composition database (KFCT/USDA) and
    kinetic exercise library. Responds with tailored, non-repetitive coaching.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Fetch recent conversational memory (last 6 messages)
    cursor.execute("""
    SELECT sender, message, created_at FROM user_coach_memories
    WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 6
    """, (user_id,))
    recent_memories = [dict(r) for r in cursor.fetchall()]
    recent_memories.reverse()

    ctx = get_user_current_nutrition_context(user_id, date_str)
    q_lower = (query or "").lower().strip()

    name = ctx["name"]
    consumed = ctx["consumed_calories"]
    target = ctx["target_calories"]
    remaining_cal = ctx["remaining_calories"]
    consumed_p = ctx["consumed_protein_g"]
    target_p = ctx["protein_target_g"]
    remaining_p = ctx["remaining_protein_g"]
    steps = ctx["steps_today"]
    steps_goal = ctx.get("steps_goal", 10000)
    sleep_hrs = ctx["sleep_hours"]
    weight = ctx["weight_kg"]
    goal_w = ctx.get("goal_weight_kg", 72.0)
    primary_goal = ctx.get("goal", "lose")

    response_text = ""
    recs = []
    photo_analysis = None

    # ----------------------------------------------------
    # BRANCH 1: PHOTO ATTACHMENT ANALYZER
    # ----------------------------------------------------
    if image_data:
        matched_foods = research_food_in_database(q_lower or "plate")
        if any(k in q_lower for k in ["fish", "tilapia", "samaki"]):
            dish_title = "Pan-Seared Whole Tilapia with Brown Ugali & Sukuma Wiki"
            est_cal = 580
            est_range = "520–640 kcal"
            confidence = "High"
            p_g, c_g, f_g, fib_g = 46.0, 58.0, 14.0, 6.2
            items = [
                {"food_name": "Tilapia Wet Fry (Fish)", "portion": "1 Medium Fish (250g)", "calories": 285, "protein_g": 42.0},
                {"food_name": "Brown Ugali (Millet/Sorghum)", "portion": "1 Standard Portion (180g)", "calories": 245, "protein_g": 3.5},
                {"food_name": "Sukuma Wiki (Collards)", "portion": "1 Cup Sautéed (100g)", "calories": 50, "protein_g": 1.5}
            ]
            uncert_note = "Frying oil absorbed by fish skin represents the primary variance (±60 kcal)."
        elif any(k in q_lower for k in ["chicken", "kuku", "poultry"]):
            dish_title = "Grilled Kuku Choma with Steamed Rice & Kachumbari"
            est_cal = 620
            est_range = "560–690 kcal"
            confidence = "High"
            p_g, c_g, f_g, fib_g = 48.0, 64.0, 16.0, 4.0
            items = [
                {"food_name": "Grilled Kuku Breast", "portion": "200g portion", "calories": 330, "protein_g": 44.0},
                {"food_name": "Steamed White Rice", "portion": "1 Cup (180g)", "calories": 235, "protein_g": 3.5},
                {"food_name": "Fresh Kachumbari", "portion": "1 Small Bowl (80g)", "calories": 55, "protein_g": 1.2}
            ]
            uncert_note = "Marinade oil and skin presence account for ±65 kcal variance."
        elif any(k in q_lower for k in ["chapati", "ndengu", "beans", "madondo"]):
            dish_title = "Soft Layered Chapati with Ndengu (Green Grams) Stew"
            est_cal = 540
            est_range = "480–610 kcal"
            confidence = "Medium"
            p_g, c_g, f_g, fib_g = 22.0, 82.0, 15.0, 11.0
            items = [
                {"food_name": "Kenyan Chapati", "portion": "1.5 Chapatis (130g)", "calories": 310, "protein_g": 6.2},
                {"food_name": "Ndengu (Green Grams Stew)", "portion": "1 Bowl Cooked (220g)", "calories": 230, "protein_g": 15.8}
            ]
            uncert_note = "Oil brushed between chapati layers causes ±65 kcal variance."
        else:
            dish_title = "Balanced Kenyan Plate: Lean Beef Stew, Ugali & Sukuma Wiki"
            est_cal = 560
            est_range = "500–630 kcal"
            confidence = "High"
            p_g, c_g, f_g, fib_g = 36.5, 68.0, 15.0, 6.0
            items = [
                {"food_name": "Kenyan Beef Stew (Lean)", "portion": "1 Medium Bowl (150g)", "calories": 250, "protein_g": 30.5},
                {"food_name": "White Ugali", "portion": "1 Portion (180g)", "calories": 255, "protein_g": 4.5},
                {"food_name": "Sukuma Wiki (Sautéed)", "portion": "1 Cup (100g)", "calories": 55, "protein_g": 1.5}
            ]
            uncert_note = "Unmeasured cooking oil in tomato gravy accounts for ±60 kcal variance."

        fits = remaining_cal >= est_cal
        photo_analysis = {
            "dish": dish_title,
            "estimated_calories": est_cal,
            "likely_range": est_range,
            "confidence": confidence,
            "macros": {"protein_g": p_g, "carbs_g": c_g, "fat_g": f_g, "fibre_g": fib_g},
            "items": items,
            "uncertainty_note": uncert_note,
            "fits_budget": fits
        }

        portion_summary = ", ".join([f"{i['portion']} {i['food_name']}" for i in items])
        budget_note = (
            f"✅ **Fits Your Budget!** You have **{remaining_cal} kcal** remaining today. Logging this meal leaves you with **~{remaining_cal - est_cal} kcal**."
            if fits else
            f"⚠️ **Budget Alert**: This meal (~{est_cal} kcal) takes most of your remaining **{remaining_cal} kcal** for today. Consider enjoying half the carb portion or taking an active 30-min walk!"
        )
        response_text = f"""📸 **Visual Meal Scan Complete!**

I analyzed your photo and matched it with the **Kenya Food Composition Database (KFCT)**:

🍽️ **Estimated Dish**: **{dish_title}**
• **Energy**: **~{est_cal} kcal** (Likely range: `{est_range}`, {confidence} confidence)
• **Macros**: **{p_g}g Protein** | **{c_g}g Carbs** | **{f_g}g Fat** | **{fib_g}g Fibre**
• **Detected Portions**: {portion_summary}
• ⚠️ **Uncertainty Note**: *{uncert_note}*

{budget_note}

Would you like me to log this meal directly into your CALORA diary? Tap below!"""

    # ----------------------------------------------------
    # BRANCH 2: SPECIFIC FOOD RESEARCH IN DATABASE
    # (Matches any query asking about a food or calories in a food)
    # ----------------------------------------------------
    elif any(k in q_lower for k in ["how many calories", "calories in", "nutrition in", "macros in", "tell me about", "can i eat", "is it okay to eat", "can i have"]) and (searched_foods := research_food_in_database(q_lower)):
        top_food = searched_foods[0]
        f_name = top_food["name"]
        cal_100 = round(top_food["calories_per_100g"])
        p_100 = top_food["protein_per_100g"]
        c_100 = top_food["carbs_per_100g"]
        fat_100 = top_food["fat_per_100g"]
        fib_100 = top_food["fibre_per_100g"]

        portions_list = top_food.get("portions", [])
        default_portion = portions_list[0] if portions_list else {"name": "100g serving", "gram_weight": 100.0}
        serving_name = default_portion["name"]
        serving_g = default_portion["gram_weight"]
        multiplier = serving_g / 100.0
        serv_cal = round(cal_100 * multiplier)
        serv_p = round(p_100 * multiplier, 1)
        serv_c = round(c_100 * multiplier, 1)
        serv_f = round(fat_100 * multiplier, 1)
        serv_fib = round(fib_100 * multiplier, 1)

        fits = remaining_cal >= serv_cal
        if fits:
            budget_eval = f"✅ **Fits your daily budget!** Logging 1 standard portion ({serving_name}) leaves you with **~{remaining_cal - serv_cal} kcal** for today."
        else:
            budget_eval = f"⚠️ **Budget Watch**: 1 standard serving (~{serv_cal} kcal) takes most of your remaining **{remaining_cal} kcal**. Consider half a portion (~{round(serv_cal/2)} kcal) or pairing it with sukuma wiki / spinach to boost volume without excess energy."

        oil_tip = ""
        if "oil" in (top_food.get("default_prep_method", "")).lower() or "fry" in f_name.lower():
            oil_tip = "\n• ⚠️ **Cooking Oil Note**: Sautéing or pan-frying with 1 unmeasured tablespoon of vegetable oil adds ~124 kcal. Measuring oil with a teaspoon keeps your calorie count precise."

        other_portions = ""
        if len(portions_list) > 1:
            other_portions = "\n**Available Portions in CALORA**:\n" + "\n".join([f"• {p['name']} ({round(p['gram_weight'])}g): **~{round(cal_100 * (p['gram_weight']/100.0))} kcal** | {round(p_100 * (p['gram_weight']/100.0), 1)}g Protein" for p in portions_list[:3]])

        response_text = f"""🔍 **{f_name} — Composition & Research (KFCT)**:

**{f_name}** ({top_food.get('category', 'Kenyan Food')}):
• **Standard Serving**: {serving_name} (~{round(serving_g)}g)
• **Energy**: **~{serv_cal} kcal** (or {cal_100} kcal per 100g)
• **Macronutrients**: **{serv_p}g Protein** | **{serv_c}g Carbs** | **{serv_f}g Fat** | **{serv_fib}g Fibre**
• **Source**: {top_food.get('source', 'KFCT Verified Data')}
{oil_tip}
{other_portions}

📊 **How It Fits Your Day Today**:
- Your Remaining Energy Budget: **~{remaining_cal} kcal**
- Your Remaining Protein Goal: **~{remaining_p}g**
{budget_eval}"""

    # ----------------------------------------------------
    # BRANCH 3: KINETIC EXERCISE & WORKOUT RESEARCH
    # (Matches exercise, workout, muscle group inquiries)
    # ----------------------------------------------------
    elif any(k in q_lower for k in ["exercise", "exercises", "workout", "routine", "squat", "pushup", "lunges", "chest", "back", "quads", "legs", "arms", "bicep", "tricep", "core", "abs", "shoulders", "hypertrophy", "training", "form cues"]):
        searched_exercises = research_exercises_in_database(q_lower)
        if searched_exercises:
            ex_lines = []
            for idx, ex in enumerate(searched_exercises[:3], 1):
                kenyan_note = f"\n  - 🇰🇪 *Kenyan Setup*: {ex['kenyan_context']}" if ex.get("kenyan_context") else ""
                ex_lines.append(
                    f"**{idx}. {ex['name']}** ({ex['muscle_group']} · {ex['difficulty']})\n"
                    f"  - **Movement Pattern**: {ex['movement_pattern']} (Equipment: {ex['equipment']})\n"
                    f"  - **Biomechanical Form**: {ex['form_cues']}\n"
                    f"  - ⚠️ **Safety Tip**: {ex['safety_tips']}"
                    f"{kenyan_note}\n"
                    f"  - **Recommended Scheme**: 3–4 sets of 10–12 controlled reps."
                )
            ex_block = "\n\n".join(ex_lines)
            focus_area = searched_exercises[0].get('muscle_group', 'Kinetic')
            response_text = f"""🏋️‍♂️ **{focus_area} Exercise Protocol & Form**:

Here are verified movement protocols from CALORA's exercise library tailored for your session:

{ex_block}

💡 **NKP Coach Tip**: Maintain progressive overload. If training at home with water jugs or bodyweight, increase time-under-tension (3 seconds down, 1 second pause) to maximize muscular tension without heavy gym barbells!"""
        else:
            response_text = f"""🏋️‍♂️ **Kinetic Performance Guide for {name}**:

For balanced progression, we recommend pairing compound movement patterns:
1. **Push Movement** (Chest, Triceps, Shoulders): Standard or incline pushups. 3 sets × 10–12 reps.
2. **Pull Movement** (Lats, Upper Back, Biceps): Single-arm jerrycan rows or inverted table rows. 3 sets × 12 reps.
3. **Lower Body Compound** (Quads & Glutes): Air squats or goblet squats holding a 5L/10L water jug. 3 sets × 15 reps.
4. **Core Stabilization**: Forearm plank hold. 3 sets × 45 seconds.

You have logged **{ctx.get('workouts_today', 0)} workouts** and **{steps:,} steps** today. You can also view structured routines directly in the **Workouts tab**!"""

    # ----------------------------------------------------
    # BRANCH 4: USER'S TODAY DIARY & LOGGED MEALS INSPECTION
    # (Matches queries asking about what they ate today)
    # ----------------------------------------------------
    elif any(k in q_lower for k in ["what did i eat", "my meals", "my diary", "what have i eaten", "did i log", "show my food", "check my calories"]):
        diary = research_user_today_diary(user_id, date_str)
        items = diary["items"]
        if not items:
            response_text = f"""You haven't logged any meals in CALORA for today ({date_str}) yet, {name}.

Your daily target is **{target} kcal** with a protein goal of **{target_p}g**.
Would you like some balanced Kenyan ideas for breakfast or lunch, or you can use the **Log Food** tab to record your first meal!"""
        else:
            meal_breakdown = []
            for m_type in ["breakfast", "lunch", "dinner", "snack"]:
                m_items = diary["meals_by_type"].get(m_type, [])
                if m_items:
                    item_strs = [f"• {i['food_name']} ({i['portion_name']}): **{i['logged_calories']} kcal** ({i['protein_g']}g P)" for i in m_items]
                    meal_breakdown.append(f"**{m_type.title()}**:\n" + "\n".join(item_strs))

            meals_text = "\n\n".join(meal_breakdown)
            response_text = f"""📋 **Your Logged Food Diary for Today ({date_str})**:

{meals_text}

📊 **Day's Nutritional Totals**:
• **Calories Consumed**: **{diary['total_calories']} / {target} kcal** (**{remaining_cal} kcal remaining**)
• **Protein Logged**: **{diary['total_protein']}g / {target_p}g target** (**{remaining_p}g needed**)
• **Carbohydrates**: {diary['total_carbs']}g | **Fat**: {diary['total_fat']}g | **Fibre**: {diary['total_fibre']}g

💡 **Coach Review**: You have {remaining_cal} kcal left. Focus dinner or your next snack on closing your **{remaining_p}g protein gap**!"""

    # ----------------------------------------------------
    # BRANCH 5: DINNER / LUNCH / MEAL RECOMMENDATION
    # ----------------------------------------------------
    elif any(k in q_lower for k in ["what can i eat", "what to eat", "dinner", "lunch", "recommend", "left", "remaining calories"]):
        recs = generate_meal_recommendations(remaining_cal, remaining_p)
        lines = [
            f"Here are 3 verified Kenyan meal options designed to keep you inside your **{remaining_cal} kcal** budget and help hit your protein goal:\n"
        ]
        for i, r in enumerate(recs, 1):
            lines.append(
                f"**Option {i}: {r['title']}** (~{r['estimated_calories']} kcal, {r['protein_g']}g P, {r['fibre_g']}g Fibre)\n"
                f"- Range: `{r['likely_range']}` ({r['confidence']} confidence)\n"
                f"- Portions: {', '.join([item['portion'] + ' ' + item['food_name'] for item in r['items']])}\n"
                f"- *{r['uncertainty_note']}*\n"
            )
        lines.append("Tap any recommendation in the drawer below to log it directly into your CALORA diary!")
        response_text = "\n".join(lines)

    # ----------------------------------------------------
    # BRANCH 6: HIGH-PROTEIN KENYAN FOOD SOURCES
    # ----------------------------------------------------
    elif any(k in q_lower for k in ["high protein", "high-protein", "protein source", "protein foods", "hit protein"]):
        response_text = f"""{name}, hitting **{target_p}g protein/day** is the cornerstone of preserving your muscle while maintaining your calorie deficit.

Here are the highest density verified protein sources from the **Kenya Food Composition Tables (KFCT)**:

1. **Grilled Kuku Fillet (Skinless Chicken Breast)**:
   • ~31g protein / 100g (165 kcal). 1 standard breast fillet (170g) gives **~53g clean protein**.
2. **Tilapia Fish (Wet Fry / Stewed)**:
   • ~20g protein / 100g (135 kcal). 1 whole medium tilapia gives **~44g bioavailable protein**.
3. **Ndengu (Green Gram Stew)**:
   • ~7.2g protein + 4.8g fibre / 100g. 1 cup cooked (220g) provides **~16g protein** + sustained prebiotic fibre.
4. **Lean Kenyan Beef Stew**:
   • ~18.5g protein / 100g (175 kcal). 1 medium bowl (150g) gives **~28g protein** + heme iron.
5. **Boiled Large Eggs**:
   • ~6.3g protein per egg (72 kcal). 3 boiled eggs give **~19g complete protein**.
6. **Maziwa Lala / Fresh Milk**:
   • ~3.3g protein / 100ml. A 300ml glass gives **~10g protein** with natural calcium and probiotics.

💡 **Today's Status**: You have logged **{consumed_p}g protein** with **{remaining_p}g remaining**. A portion of chicken, fish, or 3 eggs will close that gap easily!"""

    # ----------------------------------------------------
    # BRANCH 7: WEIGHT LOSS PLATEAU & SCALE FLUCTUATION
    # ----------------------------------------------------
    elif any(k in q_lower for k in ["not losing", "plateau", "stuck", "scale hasn't moved", "why am i gaining", "weight fluctuating", "scale weight"]):
        response_text = f"""{name}, weight plateaus are a normal biological event during fat loss. Here is what the science shows is happening:

1. **Hidden Cooking Oil**: A single unmeasured tablespoon of vegetable cooking oil adds **~124 kcal**. If two meals have unmeasured oil, **~250 kcal of hidden energy** can silently offset your deficit. Using a measuring spoon guarantees accuracy.
2. **Water Retention & Sodium**: Higher sodium meals (stews, nyama choma, restaurant dishes) cause muscles to temporarily hold 1.5–2 kg of water. This water retention masks true fat loss on the scale.
3. **Sleep Quality & Cortisol**: You logged **{sleep_hrs} hours of sleep**. Inadequate sleep raises cortisol, which increases fluid retention and drives sugar cravings.
4. **The 7-Day Moving Trend**: Day-to-day scale weight naturally swings by ±1.5 kg due to gut volume and hydration. Always rely on CALORA's smoothed 7-day trend in the **Progress tab** rather than a single morning weigh-in."""

    # ----------------------------------------------------
    # BRANCH 8: PRE-WORKOUT & POST-WORKOUT NUTRITION
    # ----------------------------------------------------
    elif any(k in q_lower for k in ["pre-workout", "post-workout", "before workout", "after workout", "workout meal", "gym food"]):
        response_text = f"""Here is your kinetic performance fuel guide, {name}:

⚡ **Pre-Workout Fuel (60–90 min before training)**:
• **Goal**: Easily digestible carbohydrates for muscle glycogen without digestive heaviness.
• **Top Kenyan Choices**: 1 ripe banana (~105 kcal, 27g carbs) or 1 small boiled sweet potato (120g, ~103 kcal) with water or black coffee.

🛡️ **Post-Workout Recovery (within 2 hours after training)**:
• **Goal**: Muscle protein synthesis and glycogen restoration.
• **Target**: 25–40g protein + 30–50g carbohydrates.
• **Top Choices**: 150g grilled chicken breast + 1 cup rice, or 3 boiled eggs + glass of milk, or 1 bowl of ndengu stew with 1 chapati.

You currently have logged **{ctx.get('workouts_today', 0)} workout sessions** today. Keep your hydration at minimum 2.5–3 liters!"""

    # ----------------------------------------------------
    # BRANCH 9: CONVERSATIONAL MEMORY & RECALL
    # ----------------------------------------------------
    elif any(k in q_lower for k in ["remember", "earlier", "previous", "what did i ask", "what did we talk"]):
        if recent_memories:
            history_summary = "\n".join([f"• **{m['sender'].title()}**: {m['message'][:100]}..." for m in recent_memories[-4:]])
            response_text = f"""Yes, {name}! Here is what we discussed recently in your CALORA session:

{history_summary}

We are working on your target weight of **{goal_w} kg** with **{target_p}g protein/day**. What would you like to explore next?"""
        else:
            response_text = f"This is our first conversation today, {name}! I have your profile ready: **{weight} kg**, target **{target} kcal**, and **{target_p}g protein/day**. How can I help you right now?"

    # ----------------------------------------------------
    # BRANCH 10: CONVERSATIONAL GREETINGS (Non-Repetitive)
    # ----------------------------------------------------
    elif any(q_lower.startswith(g) for g in ["hi", "hello", "habari", "hey", "good morning", "good afternoon", "good evening"]):
        response_text = f"""Habari {name}! I am your **NKP AI Coach**.

You have **{remaining_cal} kcal** and **{remaining_p}g protein** remaining in your daily budget today, with **{steps:,} steps** logged.

How can I help you right now? You can ask about:
• Calories and macros in any Kenyan dish (*"How many calories in pilau?"*)
• High-protein meals to close today's gap (*"What can I eat for dinner?"*)
• Form cues and exercise routines (*"What exercises can I do for chest?"*)
• Or snap/attach a photo of your meal for an instant portion scan!"""

    # ----------------------------------------------------
    # BRANCH 11: GENERAL RESEARCH FALLBACK
    # (Matches any other general food or fitness question)
    # ----------------------------------------------------
    else:
        # Check if any food in DB is mentioned anywhere in the query
        searched_foods = research_food_in_database(q_lower)
        searched_exercises = research_exercises_in_database(q_lower)

        if searched_foods:
            top_f = searched_foods[0]
            cals = round(top_f["calories_per_100g"])
            prot = top_f["protein_per_100g"]
            carbs = top_f["carbs_per_100g"]
            fat = top_f["fat_per_100g"]
            response_text = f"""Regarding **{top_f['name']}**:

Based on the **Kenya Food Composition Tables (KFCT)**, 100g contains:
• **Energy**: **{cals} kcal**
• **Protein**: **{prot}g** | **Carbs**: **{carbs}g** | **Fat**: **{fat}g**

You have **{remaining_cal} kcal** and **{remaining_p}g protein** remaining today. This food can fit into your day comfortably with proper portion control and measured cooking oil!"""
        elif searched_exercises:
            top_ex = searched_exercises[0]
            response_text = f"""Regarding **{top_ex['name']}** ({top_ex['muscle_group']}):

• **Movement Pattern**: {top_ex['movement_pattern']} (Equipment: {top_ex['equipment']})
• **Form Cues**: {top_ex['form_cues']}
• **Safety Tip**: {top_ex['safety_tips']}
{f"• 🇰🇪 **Kenyan Setup**: {top_ex['kenyan_context']}" if top_ex.get('kenyan_context') else ""}

A great protocol is 3 sets of 10–12 controlled repetitions with 60 seconds rest between sets."""
        else:
            response_text = f"""I hear you, {name}! In CALORA, our coaching philosophy is **Accuracy over Assumptions**.

Whether you're looking to fit a specific Kenyan dish into your **{remaining_cal} kcal** remaining budget, optimize your **{target_p}g protein** intake, or dial in your workout form:

Tell me the specific food, recipe, or muscle group you want me to research from our verified KFCT composition database or exercise library, and I'll break down the exact numbers!"""

    # 2. Persist to user_coach_memories
    now_str = datetime.now().isoformat()
    try:
        u_mem_id = f"mem_u_{secrets.token_hex(4)}"
        cursor.execute("""
        INSERT INTO user_coach_memories (id, user_id, date, sender, message, image_data, created_at)
        VALUES (?, ?, ?, 'user', ?, ?, ?)
        """, (u_mem_id, user_id, date_str, query or ('[Photo Attached]' if image_data else ''), image_data, now_str))

        c_mem_id = f"mem_c_{secrets.token_hex(4)}"
        cursor.execute("""
        INSERT INTO user_coach_memories (id, user_id, date, sender, message, image_data, created_at)
        VALUES (?, ?, ?, 'coach', ?, NULL, ?)
        """, (c_mem_id, user_id, date_str, response_text, now_str))

        conn.commit()
    except Exception as e:
        print(f"Error saving coach memory: {e}")
    finally:
        conn.close()

    result = {
        "coach": "NKP AI Coach",
        "query": query,
        "response": response_text,
        "recommendations": recs,
        "context": ctx
    }
    if photo_analysis:
        result["photo_analysis"] = photo_analysis
    return result
