"""
CALORA - FastAPI Backend Server
Philosophy: Accuracy over assumptions.
"""

import os
import json
import secrets
import urllib.request
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse

from app.database import (
    get_db_connection, init_database, seed_database_defaults,
    hash_password, verify_password
)
from app.auth import create_access_token, get_current_user, get_current_admin_user
from app.calculations import (
    calculate_bmr_mifflin_st_jeor, calculate_tdee, calculate_calorie_target,
    compute_item_uncertainty_and_range, compute_meal_aggregate,
    calculate_adaptive_energy_trend, COOKING_OIL_PROFILES, PREP_METHOD_MODIFIERS
)
from app.natural_language import parse_natural_language_log, simulate_photo_food_recognition
from app.ai_assistant import handle_assistant_query, generate_meal_recommendations, get_user_current_nutrition_context
from app.payment_service import initiate_mpesa_payment, process_payment_callback, record_refund_reversal
from app.email_service import generate_weekly_member_report_data, render_weekly_email_html, send_weekly_report_email
from app.models import (
    RegisterRequest, LoginRequest, ProfileUpdateRequest, CalculationPreviewRequest,
    LogItemRequest, QuickAddRequest, WeightLogRequest, NaturalLanguageRequest,
    PhotoDetectRequest, AssistantChatRequest, FoodReportRequest, AdminReportResolutionRequest,
    CreateCustomFoodRequest, CreateRecipeRequest, UpdateMealItemRequest, DuplicateMealItemRequest,
    CopyMealRequest, LogStepRequest, LogSleepRequest, LogWorkoutRequest, GenerateWorkoutRequest,
    GymRegisterRequest, GymBrandingUpdateRequest, GymPackageCreateRequest, GymPackageOrderRequest,
    GymSubscribeRequest, AdminUpdatePlanRequest, GymInviteRequest, MemberConsentUpdateRequest,
    InitiatePaymentRequest, PaymentCallbackRequest, SendTestEmailRequest,
    AdminUpdateUserRoleRequest, AdminCreateFoodRequest, AdminUpdateFoodRequest, CopyMealToTodayRequest,
    ChangePasswordRequest, AdminCreateExerciseRequest
)

# Initialize database tables and default seed data on startup
init_database()
seed_database_defaults()

app = FastAPI(
    title="CALORA API",
    description="Nutrition and Calorie Tracking with Accuracy, Transparency, and Uncertainty Awareness",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")


# ==========================================
# 1. AUTHENTICATION & ONBOARDING
# ==========================================

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email.lower(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_id = f"user_{secrets.token_hex(6)}"
    now_str = datetime.now().isoformat()
    pwd_hash = hash_password(req.password)

    cursor.execute("""
    INSERT INTO users (id, email, name, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, 'user', ?)
    """, (user_id, req.email.lower(), req.name, pwd_hash, now_str))

    # Calculate BMR, TDEE, Deficit & Macros
    bmr_res = calculate_bmr_mifflin_st_jeor(req.current_weight_kg, req.height_cm, req.age, req.sex)
    tdee_res = calculate_tdee(bmr_res["bmr"], req.activity_level)
    target_res = calculate_calorie_target(
        bmr_res["bmr"], tdee_res["tdee"], req.sex, req.current_weight_kg,
        req.primary_goal, req.deficit_tier
    )

    cursor.execute("""
    INSERT INTO user_profiles (
        user_id, age, sex, height_cm, current_weight_kg, goal_weight_kg,
        activity_level, primary_goal, deficit_tier, measurement_system,
        bmr, tdee, target_calories, protein_target_g, carbs_target_g,
        fat_target_g, fibre_target_g, safety_flag, safety_message, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, req.age, req.sex, req.height_cm, req.current_weight_kg, req.goal_weight_kg,
        req.activity_level, req.primary_goal, req.deficit_tier, req.measurement_system,
        bmr_res["bmr"], tdee_res["tdee"], target_res["target_calories"],
        target_res["macros"]["protein_g"], target_res["macros"]["carbs_g"],
        target_res["macros"]["fat_g"], target_res["macros"]["fibre_g"],
        1 if target_res["safety_flag"] else 0, target_res.get("safety_message"), now_str
    ))

    # Log starting weight
    cursor.execute("""
    INSERT INTO weight_logs (id, user_id, date, weight_kg, notes, created_at)
    VALUES (?, ?, ?, ?, 'Initial onboarding weight', ?)
    """, (f"wt_{secrets.token_hex(4)}", user_id, date.today().isoformat(), req.current_weight_kg, now_str))

    conn.commit()
    conn.close()

    token = create_access_token({"sub": user_id, "email": req.email.lower(), "name": req.name, "role": "user"})
    return {
        "status": "success",
        "token": token,
        "user": {"id": user_id, "email": req.email.lower(), "name": req.name, "role": "user"},
        "calculations": {
            "bmr": bmr_res,
            "tdee": tdee_res,
            "target": target_res
        }
    }


@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, email, name, password_hash, role FROM users WHERE email = ?", (req.email.lower(),))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row or not verify_password(user_row["password_hash"], req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = dict(user_row)
    token = create_access_token({"sub": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]})
    return {
        "status": "success",
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}
    }


@app.post("/api/auth/demo-login")
def demo_login(role: str = Query("user")):
    """Instant 1-click login for demonstration: 'user' (Ryan), 'admin', 'gym_owner', or 'coach'."""
    if role == "admin":
        email = "admin@calora.app"
    elif role in ("gym_owner", "owner"):
        email = "gym.owner@nairobihub.co.ke"
    elif role == "coach":
        email = "coach.brian@calora.app"
    else:
        email = "ryan@calora.app"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, name, role FROM users WHERE email = ?", (email,))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row:
        raise HTTPException(status_code=404, detail="Demo account not found")

    user = dict(user_row)
    token = create_access_token({"sub": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]})
    return {
        "status": "success",
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}
    }


@app.get("/api/auth/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],))
    prof_row = cursor.fetchone()
    conn.close()

    return {
        "user": user,
        "profile": dict(prof_row) if prof_row else None
    }


@app.post("/api/auth/change-password")
def change_user_password(req: ChangePasswordRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],))
    u = cursor.fetchone()
    if not u or not verify_password(u["password_hash"], req.current_password):
        conn.close()
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_hash = hash_password(req.new_password)
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Password updated successfully"}


# ==========================================
# 2. PROFILE & CALCULATION ENGINE
# ==========================================

@app.post("/api/calculations/preview")
def preview_calculations(req: CalculationPreviewRequest):
    """Transparent calculations preview showing equations, BMR, TDEE, Deficit, and Safety checks."""
    bmr_res = calculate_bmr_mifflin_st_jeor(req.weight_kg, req.height_cm, req.age, req.sex)
    tdee_res = calculate_tdee(bmr_res["bmr"], req.activity_level)
    target_res = calculate_calorie_target(
        bmr_res["bmr"], tdee_res["tdee"], req.sex, req.weight_kg,
        req.goal, req.deficit_tier
    )

    return {
        "bmr": bmr_res,
        "tdee": tdee_res,
        "target": target_res
    }


@app.get("/api/profile")
def get_profile(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")

    return dict(row)


@app.post("/api/profile/update")
def update_profile(req: ProfileUpdateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    bmr_res = calculate_bmr_mifflin_st_jeor(req.current_weight_kg, req.height_cm, req.age, req.sex)
    tdee_res = calculate_tdee(bmr_res["bmr"], req.activity_level)
    target_res = calculate_calorie_target(
        bmr_res["bmr"], tdee_res["tdee"], req.sex, req.current_weight_kg,
        req.primary_goal, req.deficit_tier
    )

    now_str = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if req.name:
        cursor.execute("UPDATE users SET name = ? WHERE id = ?", (req.name, user["id"]))

    cursor.execute("""
    UPDATE user_profiles SET
        age = ?, sex = ?, height_cm = ?, current_weight_kg = ?, goal_weight_kg = ?,
        activity_level = ?, primary_goal = ?, deficit_tier = ?, measurement_system = ?,
        dietary_preferences = ?, allergies = ?,
        bmr = ?, tdee = ?, target_calories = ?, protein_target_g = ?, carbs_target_g = ?,
        fat_target_g = ?, fibre_target_g = ?, safety_flag = ?, safety_message = ?, updated_at = ?
    WHERE user_id = ?
    """, (
        req.age, req.sex, req.height_cm, req.current_weight_kg, req.goal_weight_kg,
        req.activity_level, req.primary_goal, req.deficit_tier, req.measurement_system,
        req.dietary_preferences, req.allergies,
        bmr_res["bmr"], tdee_res["tdee"], target_res["target_calories"],
        target_res["macros"]["protein_g"], target_res["macros"]["carbs_g"],
        target_res["macros"]["fat_g"], target_res["macros"]["fibre_g"],
        1 if target_res["safety_flag"] else 0, target_res.get("safety_message"), now_str,
        user["id"]
    ))
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "calculations": {
            "bmr": bmr_res,
            "tdee": tdee_res,
            "target": target_res
        }
    }


# ==========================================
# 3. FOOD DATABASE & SEARCH
# ==========================================

@app.get("/api/foods/search")
def search_foods(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    verified_only: bool = Query(False),
    limit: int = Query(30)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    params = []
    sql = "SELECT * FROM food_items WHERE 1=1"

    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        sql += " AND (LOWER(name) LIKE ? OR LOWER(common_names) LIKE ? OR LOWER(category) LIKE ?)"
        params.extend([term, term, term])

    if category and category != "All":
        sql += " AND category = ?"
        params.append(category)

    if verified_only:
        sql += " AND is_verified = 1"

    sql += " ORDER BY is_verified DESC, name ASC LIMIT ?"
    params.append(limit)

    cursor.execute(sql, tuple(params))
    foods = [dict(r) for r in cursor.fetchall()]

    # Attach portions
    for f in foods:
        cursor.execute("SELECT * FROM food_portions WHERE food_id = ? ORDER BY is_default DESC, gram_weight ASC", (f["id"],))
        f["portions"] = [dict(p) for p in cursor.fetchall()]

    conn.close()
    return foods


@app.get("/api/foods/categories")
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT category FROM food_items ORDER BY category ASC")
    categories = [r[0] for r in cursor.fetchall()]
    conn.close()
    return categories


@app.get("/api/foods/barcode/{barcode}")
def get_food_by_barcode(barcode: str):
    code = barcode.strip()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM food_items WHERE barcode = ?", (code,))
    food_row = cursor.fetchone()

    if food_row:
        food = dict(food_row)
        cursor.execute("SELECT * FROM food_portions WHERE food_id = ? ORDER BY is_default DESC", (food["id"],))
        food["portions"] = [dict(p) for p in cursor.fetchall()]
        conn.close()
        return food

    # Fallback to Open Food Facts API
    try:
        url = f"https://world.openfoodfacts.org/api/v2/product/{code}.json"
        req = urllib.request.Request(url, headers={"User-Agent": "CALORA-Nutrition/1.0 (contact@calora.app)"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("status") == 1 and "product" in data:
                p = data["product"]
                product_name = p.get("product_name") or p.get("product_name_en") or f"Packaged Food ({code})"
                brand = p.get("brands") or "Verified Manufacturer"
                cat = p.get("categories", "").split(",")[0].strip() or "Packaged Foods"
                image_url = p.get("image_front_url") or p.get("image_url")

                nutr = p.get("nutriments", {})
                cal_val = nutr.get("energy-kcal_100g") or nutr.get("energy-kcal")
                if cal_val is None and nutr.get("energy_100g"):
                    try:
                        cal_val = float(nutr.get("energy_100g")) / 4.184
                    except Exception:
                        cal_val = 0.0
                cal_100 = float(cal_val or 0.0)
                prot_100 = float(nutr.get("proteins_100g") or nutr.get("proteins") or 0.0)
                carbs_100 = float(nutr.get("carbohydrates_100g") or nutr.get("carbohydrates") or 0.0)
                fat_100 = float(nutr.get("fat_100g") or nutr.get("fat") or 0.0)
                fibre_100 = float(nutr.get("fiber_100g") or nutr.get("fiber") or 0.0)

                new_food_id = f"food_off_{code}"
                now_str = datetime.now().isoformat()
                cursor.execute("""
                INSERT OR REPLACE INTO food_items (
                    id, name, common_names, category, cuisine, barcode,
                    calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g,
                    cooking_oil_default, default_prep_method, is_verified, source_id, image_url, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'International / Commercial', ?, ?, ?, ?, ?, ?, 'none', 'packaged', 1, 'src_usda', ?, ?, ?)
                """, (
                    new_food_id, f"{product_name} ({brand})", brand, cat, code,
                    round(cal_100, 1), round(prot_100, 1), round(carbs_100, 1), round(fat_100, 1), round(fibre_100, 1),
                    image_url, now_str, now_str
                ))

                cursor.execute("""
                INSERT OR REPLACE INTO food_portions (food_id, name, gram_weight, description, is_default)
                VALUES (?, 'Standard 100g Portion', 100.0, 'Standard 100g serving', 1)
                """, (new_food_id,))

                serving_qty = p.get("serving_quantity")
                if serving_qty:
                    try:
                        sq_float = float(serving_qty)
                        if sq_float > 0 and sq_float != 100.0:
                            cursor.execute("""
                            INSERT OR REPLACE INTO food_portions (food_id, name, gram_weight, description, is_default)
                            VALUES (?, '1 Package Serving', ?, ?, 0)
                            """, (new_food_id, sq_float, p.get("serving_size") or f"{sq_float}g package serving"))
                    except Exception:
                        pass

                conn.commit()

                cursor.execute("SELECT * FROM food_items WHERE id = ?", (new_food_id,))
                fresh_food = dict(cursor.fetchone())
                cursor.execute("SELECT * FROM food_portions WHERE food_id = ? ORDER BY is_default DESC", (new_food_id,))
                fresh_food["portions"] = [dict(pr) for pr in cursor.fetchall()]
                conn.close()
                return fresh_food
    except Exception as e:
        print("Open Food Facts fetch exception:", e)

    conn.close()
    raise HTTPException(status_code=404, detail=f"Barcode {code} not found in verified database or Open Food Facts")


@app.get("/api/foods/{food_id}")
def get_food_detail(food_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM food_items WHERE id = ?", (food_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Food item not found")

    food = dict(row)
    cursor.execute("SELECT * FROM food_portions WHERE food_id = ? ORDER BY is_default DESC", (food_id,))
    food["portions"] = [dict(p) for p in cursor.fetchall()]
    conn.close()

    return food


@app.post("/api/foods/custom")
def create_custom_food(req: CreateCustomFoodRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    food_id = f"custom_{secrets.token_hex(6)}"
    now_str = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO food_items (
        id, name, common_names, category, cuisine, country,
        calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
        fibre_per_100g, sugar_per_100g, sodium_mg_per_100g, default_prep_method,
        source, source_date, data_quality, confidence_level, data_origin,
        notes, is_verified, created_by, created_at
    ) VALUES (?, ?, ?, ?, 'Custom', 'User', ?, ?, ?, ?, ?, ?, ?, ?, 'User Created', ?, 'Medium', 'MEDIUM', 'user_entered', ?, 0, ?, ?)
    """, (
        food_id, req.name, req.common_names or "", req.category,
        req.calories_per_100g, req.protein_per_100g, req.carbs_per_100g, req.fat_per_100g,
        req.fibre_per_100g, req.sugar_per_100g, req.sodium_mg_per_100g, req.default_prep_method,
        now_str[:10], req.notes or "", user["id"], now_str
    ))

    # Add portions
    for p in req.portions:
        cursor.execute("""
        INSERT INTO food_portions (food_id, name, gram_weight, description, is_default)
        VALUES (?, ?, ?, ?, ?)
        """, (food_id, p["name"], p["gram_weight"], p.get("description", ""), 1 if p.get("is_default") else 0))

    conn.commit()
    conn.close()

    return {"status": "success", "food_id": food_id, "message": "Custom food created successfully"}


# ==========================================
# 4. DAILY DASHBOARD & MEAL LOGGING
# ==========================================

@app.get("/api/meals/date/{date_str}")
def get_meals_for_date(date_str: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    # User profile for targets
    cursor.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],))
    prof_row = cursor.fetchone()
    profile = dict(prof_row) if prof_row else {
        "target_calories": 2000,
        "protein_target_g": 140,
        "carbs_target_g": 220,
        "fat_target_g": 65,
        "fibre_target_g": 30
    }

    # Fetch meals and items
    cursor.execute("""
    SELECT m.id as meal_id, m.meal_type, mi.*
    FROM meals m
    JOIN meal_items mi ON m.id = mi.meal_id
    WHERE m.user_id = ? AND m.date = ?
    ORDER BY mi.created_at ASC
    """, (user["id"], date_str))

    rows = cursor.fetchall()

    grouped_meals = {
        "breakfast": [],
        "lunch": [],
        "dinner": [],
        "snack": []
    }

    all_items = []
    for r in rows:
        item = dict(r)
        item["calories"] = item["logged_calories"]
        item["main_uncertainties"] = json.loads(item["main_uncertainties"]) if item["main_uncertainties"] else []
        item["breakdown"] = json.loads(item["breakdown_json"]) if item["breakdown_json"] else []
        m_type = item["meal_type"]
        if m_type in grouped_meals:
            grouped_meals[m_type].append(item)
        all_items.append(item)

    # Compute daily aggregates
    aggregate = compute_meal_aggregate(all_items)

    # Group summaries
    meal_summaries = {}
    for m_type, items in grouped_meals.items():
        meal_summaries[m_type] = compute_meal_aggregate(items)

    conn.close()

    remaining_cal = profile["target_calories"] - aggregate["calories"]

    return {
        "date": date_str,
        "target": {
            "calories": profile["target_calories"],
            "protein_g": profile["protein_target_g"],
            "carbs_g": profile["carbs_target_g"],
            "fat_g": profile["fat_target_g"],
            "fibre_g": profile["fibre_target_g"]
        },
        "consumed": {
            "calories": aggregate["calories"],
            "range_low": aggregate["range_low"],
            "range_high": aggregate["range_high"],
            "range_display": aggregate["range_display"],
            "confidence": aggregate["confidence"],
            "main_uncertainties": aggregate["main_uncertainties"],
            "macros": aggregate["macros"]
        },
        "remaining": {
            "calories": max(0, remaining_cal),
            "raw_balance": remaining_cal,
            "protein_g": max(0, profile["protein_target_g"] - round(aggregate["macros"]["protein_g"])),
            "carbs_g": max(0, profile["carbs_target_g"] - round(aggregate["macros"]["carbs_g"])),
            "fat_g": max(0, profile["fat_target_g"] - round(aggregate["macros"]["fat_g"])),
            "fibre_g": max(0, profile["fibre_target_g"] - round(aggregate["macros"]["fibre_g"]))
        },
        "meals": grouped_meals,
        "meal_summaries": meal_summaries
    }


@app.post("/api/meals/item")
def log_meal_item(req: LogItemRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Log an item into the user's diary.
    Calculates transparent range, confidence, oil impact, and source attribution.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find or create meal header
    cursor.execute("SELECT id FROM meals WHERE user_id = ? AND date = ? AND meal_type = ?", (user["id"], req.date, req.meal_type))
    meal_row = cursor.fetchone()
    now_str = datetime.now().isoformat()

    if meal_row:
        meal_id = meal_row["id"]
    else:
        meal_id = f"meal_{secrets.token_hex(6)}"
        cursor.execute("INSERT INTO meals (id, user_id, date, meal_type, created_at) VALUES (?, ?, ?, ?, ?)",
                       (meal_id, user["id"], req.date, req.meal_type, now_str))

    # Retrieve food data if food_id exists
    food = None
    if req.food_id:
        cursor.execute("SELECT * FROM food_items WHERE id = ?", (req.food_id,))
        f_row = cursor.fetchone()
        if f_row:
            food = dict(f_row)

    if food:
        cal_calc = compute_item_uncertainty_and_range(
            base_calories_per_100g=food["calories_per_100g"],
            gram_weight=req.gram_weight,
            confidence_level=req.confidence_level or food["confidence_level"],
            cooking_oil_type=req.cooking_oil_type,
            prep_method=req.prep_method or food["default_prep_method"],
            data_origin=req.data_origin or food["data_origin"]
        )

        # Macro calculations
        # Add oil fat (1 tbsp = 14g fat, 1 tsp = 4.5g fat, unknown = 12g fat)
        oil_info = COOKING_OIL_PROFILES.get(req.cooking_oil_type, COOKING_OIL_PROFILES["none"])
        oil_fat = oil_info["fat_g"]

        protein_g = round((food["protein_per_100g"] * req.gram_weight) / 100.0, 1)
        carbs_g = round((food["carbs_per_100g"] * req.gram_weight) / 100.0, 1)
        fat_g = round(((food["fat_per_100g"] * req.gram_weight) / 100.0) + oil_fat, 1)
        fibre_g = round((food["fibre_per_100g"] * req.gram_weight) / 100.0, 1)
        source_citation = food["source"]
        confidence = cal_calc["confidence"]
        data_origin = food["data_origin"]
        breakdown_json = json.dumps(cal_calc["breakdown"])
        main_uncertainties = cal_calc["main_uncertainties"]
        logged_cal = cal_calc["logged_calories"]
        range_low = cal_calc["range_low"]
        range_high = cal_calc["range_high"]

    else:
        # Fallback for manual / quick name without database food
        logged_cal = req.calories or 200
        range_low = round(logged_cal * 0.85)
        range_high = round(logged_cal * 1.15)
        protein_g = 0.0
        carbs_g = 0.0
        fat_g = 0.0
        fibre_g = 0.0
        source_citation = "User manual entry"
        confidence = "LOW"
        data_origin = "user_entered"
        breakdown_json = "[]"
        main_uncertainties = ["User self-reported values"]

    item_id = f"item_{secrets.token_hex(6)}"
    cursor.execute("""
    INSERT INTO meal_items (
        id, meal_id, food_id, food_name, portion_name, gram_weight,
        cooking_oil_type, prep_method, logged_calories, range_low, range_high,
        confidence_level, main_uncertainties, protein_g, carbs_g, fat_g, fibre_g,
        data_origin, source_citation, breakdown_json, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item_id, meal_id, req.food_id, req.food_name, req.portion_name, req.gram_weight,
        req.cooking_oil_type, req.prep_method, logged_cal, range_low, range_high,
        confidence, json.dumps(main_uncertainties), protein_g, carbs_g, fat_g, fibre_g,
        data_origin, source_citation, breakdown_json, req.notes or "", now_str
    ))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "item_id": item_id,
        "logged_calories": logged_cal,
        "range_display": f"{range_low}–{range_high} kcal",
        "confidence": confidence,
        "main_uncertainties": main_uncertainties
    }


@app.delete("/api/meals/item/{item_id}")
def delete_meal_item(item_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Ensure item belongs to user
    cursor.execute("""
    SELECT mi.id FROM meal_items mi
    JOIN meals m ON mi.meal_id = m.id
    WHERE mi.id = ? AND m.user_id = ?
    """, (item_id, user["id"]))

    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")

    cursor.execute("DELETE FROM meal_items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()

    return {"status": "success", "message": "Item deleted"}


@app.post("/api/meals/quick-add")
def quick_add(req: QuickAddRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find or create meal header
    cursor.execute("SELECT id FROM meals WHERE user_id = ? AND date = ? AND meal_type = ?", (user["id"], req.date, req.meal_type))
    meal_row = cursor.fetchone()
    now_str = datetime.now().isoformat()

    if meal_row:
        meal_id = meal_row["id"]
    else:
        meal_id = f"meal_{secrets.token_hex(6)}"
        cursor.execute("INSERT INTO meals (id, user_id, date, meal_type, created_at) VALUES (?, ?, ?, ?, ?)",
                       (meal_id, user["id"], req.date, req.meal_type, now_str))

    item_id = f"item_quick_{secrets.token_hex(6)}"
    r_low = round(req.calories * 0.9)
    r_high = round(req.calories * 1.1)

    cursor.execute("""
    INSERT INTO meal_items (
        id, meal_id, food_id, food_name, portion_name, gram_weight,
        cooking_oil_type, prep_method, logged_calories, range_low, range_high,
        confidence_level, main_uncertainties, protein_g, carbs_g, fat_g, fibre_g,
        data_origin, source_citation, breakdown_json, notes, created_at
    ) VALUES (?, ?, NULL, ?, 'Quick Add Entry', 0, 'none', 'standard', ?, ?, ?, 'MEDIUM',
              '["User direct entry (unverified)"]', ?, ?, ?, 0.0, 'user_entered',
              'User Quick Add Entry', '[]', ?, ?)
    """, (
        item_id, meal_id, req.name or "Quick Calorie Entry", req.calories, r_low, r_high,
        req.protein_g, req.carbs_g, req.fat_g, req.notes or "", now_str
    ))

    conn.commit()
    conn.close()

    return {"status": "success", "item_id": item_id}


@app.get("/api/meals/saved")
def get_saved_meals(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM saved_meals WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))
    rows = cursor.fetchall()

    saved = []
    for r in rows:
        d = dict(r)
        d["items"] = json.loads(d["items_json"]) if d["items_json"] else []
        saved.append(d)

    conn.close()
    return saved


@app.post("/api/meals/saved/log")
def log_saved_meal(data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    saved_meal_id = data.get("saved_meal_id")
    target_date = data.get("date", date.today().isoformat())
    target_meal_type = data.get("meal_type", "lunch")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM saved_meals WHERE id = ? AND user_id = ?", (saved_meal_id, user["id"]))
    sm_row = cursor.fetchone()
    if not sm_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Saved meal not found")

    items = json.loads(sm_row["items_json"])
    conn.close()

    for itm in items:
        req = LogItemRequest(
            date=target_date,
            meal_type=target_meal_type,
            food_id=itm["food_id"],
            food_name=itm.get("food_name", "Item"),
            portion_name=itm.get("portion_name", "Standard portion"),
            gram_weight=itm.get("gram_weight", 100.0),
            cooking_oil_type=itm.get("oil", "none")
        )
        log_meal_item(req, user)

    return {"status": "success", "message": f"Logged {sm_row['name']} to {target_meal_type}"}


# ==========================================
# 5. RECIPE BUILDER
# ==========================================

@app.get("/api/recipes")
def get_recipes(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))
    recipes = [dict(r) for r in cursor.fetchall()]

    for rec in recipes:
        cursor.execute("SELECT * FROM recipe_ingredients WHERE recipe_id = ?", (rec["id"],))
        rec["ingredients"] = [dict(i) for i in cursor.fetchall()]

    conn.close()
    return recipes


@app.post("/api/recipes")
def create_recipe(req: CreateRecipeRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Calculates total recipe calories and per-serving breakdown.
    Formula: Total calories / Servings
    """
    total_cal = 0
    total_p = 0.0
    total_c = 0.0
    total_f = 0.0
    total_fib = 0.0

    conn = get_db_connection()
    cursor = conn.cursor()

    processed_ingredients = []
    for ing in req.ingredients:
        food_id = ing.get("food_id")
        gram_weight = ing.get("gram_weight", 100.0)
        oil = ing.get("oil_type", "none")

        cursor.execute("SELECT * FROM food_items WHERE id = ?", (food_id,))
        f_row = cursor.fetchone()
        if f_row:
            food = dict(f_row)
            cal_calc = compute_item_uncertainty_and_range(
                base_calories_per_100g=food["calories_per_100g"],
                gram_weight=gram_weight,
                cooking_oil_type=oil
            )
            oil_info = COOKING_OIL_PROFILES.get(oil, COOKING_OIL_PROFILES["none"])

            cal = cal_calc["logged_calories"]
            p = (food["protein_per_100g"] * gram_weight) / 100.0
            c = (food["carbs_per_100g"] * gram_weight) / 100.0
            f = ((food["fat_per_100g"] * gram_weight) / 100.0) + oil_info["fat_g"]
            fib = (food["fibre_per_100g"] * gram_weight) / 100.0
            name = food["name"]
        else:
            cal = ing.get("calories", 100)
            p = ing.get("protein_g", 0.0)
            c = ing.get("carbs_g", 0.0)
            f = ing.get("fat_g", 0.0)
            fib = ing.get("fibre_g", 0.0)
            name = ing.get("ingredient_name", "Custom item")

        total_cal += cal
        total_p += p
        total_c += c
        total_f += f
        total_fib += fib

        processed_ingredients.append({
            "food_id": food_id,
            "name": name,
            "gram_weight": gram_weight,
            "oil": oil,
            "cal": cal,
            "p": round(p, 1),
            "c": round(c, 1),
            "f": round(f, 1),
            "fib": round(fib, 1)
        })

    servings = max(1, req.servings)
    per_serv_cal = round(total_cal / servings)
    per_serv_p = round(total_p / servings, 1)
    per_serv_c = round(total_c / servings, 1)
    per_serv_f = round(total_f / servings, 1)
    per_serv_fib = round(total_fib / servings, 1)

    rec_id = f"recipe_{secrets.token_hex(6)}"
    now_str = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO recipes (
        id, user_id, name, description, servings,
        total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fibre_g,
        per_serving_calories, per_serving_protein_g, per_serving_carbs_g, per_serving_fat_g, per_serving_fibre_g,
        created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        rec_id, user["id"], req.name, req.description or "", servings,
        total_cal, round(total_p, 1), round(total_c, 1), round(total_f, 1), round(total_fib, 1),
        per_serv_cal, per_serv_p, per_serv_c, per_serv_f, per_serv_fib, now_str
    ))

    for pi in processed_ingredients:
        cursor.execute("""
        INSERT INTO recipe_ingredients (
            id, recipe_id, food_id, ingredient_name, gram_weight, oil_type,
            calories, protein_g, carbs_g, fat_g, fibre_g
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"ri_{secrets.token_hex(6)}", rec_id, pi["food_id"], pi["name"], pi["gram_weight"], pi["oil"],
            pi["cal"], pi["p"], pi["c"], pi["f"], pi["fib"]
        ))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "recipe_id": rec_id,
        "summary": {
            "servings": servings,
            "total_calories": total_cal,
            "per_serving_calories": per_serv_cal,
            "per_serving_macros": {
                "protein_g": per_serv_p,
                "carbs_g": per_serv_c,
                "fat_g": per_serv_f,
                "fibre_g": per_serv_fib
            }
        }
    }


# ==========================================
# 6. NATURAL LANGUAGE & PHOTO RECOGNITION
# ==========================================

@app.post("/api/nlp/parse")
def parse_natural_language(req: NaturalLanguageRequest):
    return parse_natural_language_log(req.text)


@app.post("/api/photo/detect")
def detect_photo_food(req: PhotoDetectRequest):
    return simulate_photo_food_recognition(req.image_data, req.hint)


# ==========================================
# 7. WEIGHT TRACKING & ADAPTIVE ENGINE
# ==========================================

@app.post("/api/weight/log")
def log_weight(req: WeightLogRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    cursor.execute("SELECT id FROM weight_logs WHERE user_id = ? AND date = ?", (user["id"], req.date))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("UPDATE weight_logs SET weight_kg = ?, notes = ?, created_at = ? WHERE id = ?",
                       (req.weight_kg, req.notes or "", now_str, existing["id"]))
    else:
        cursor.execute("INSERT INTO weight_logs (id, user_id, date, weight_kg, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                       (f"wt_{secrets.token_hex(4)}", user["id"], req.date, req.weight_kg, req.notes or "", now_str))

    # Also update profile current_weight_kg to latest date
    cursor.execute("""
    UPDATE user_profiles SET current_weight_kg = ?, updated_at = ?
    WHERE user_id = ?
    """, (req.weight_kg, now_str, user["id"]))

    conn.commit()
    conn.close()

    return {"status": "success", "date": req.date, "weight_kg": req.weight_kg}


@app.get("/api/weight/history")
def get_weight_history(days: int = Query(30), user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT date, weight_kg, notes FROM weight_logs
    WHERE user_id = ?
    ORDER BY date ASC
    """, (user["id"],))

    rows = [dict(r) for r in cursor.fetchall()]

    # User profile for goals
    cursor.execute("SELECT current_weight_kg, goal_weight_kg FROM user_profiles WHERE user_id = ?", (user["id"],))
    prof_row = cursor.fetchone()
    conn.close()

    if not rows:
        return {
            "logs": [],
            "stats": {
                "start_weight": 80.0,
                "current_weight": 80.0,
                "goal_weight": 72.0,
                "total_change": 0.0,
                "seven_day_avg": 80.0
            }
        }

    # Calculate 7-day rolling moving average for each data point
    enriched_logs = []
    for i, item in enumerate(rows):
        # Look back up to 7 entries
        window = [r["weight_kg"] for r in rows[max(0, i - 6):i + 1]]
        avg = sum(window) / len(window)
        enriched_logs.append({
            "date": item["date"],
            "weight_kg": item["weight_kg"],
            "smoothed_avg_kg": round(avg, 2),
            "notes": item["notes"]
        })

    start_wt = rows[0]["weight_kg"]
    current_wt = rows[-1]["weight_kg"]
    goal_wt = prof_row["goal_weight_kg"] if prof_row else 72.0
    total_change = round(current_wt - start_wt, 2)
    seven_day_avg = enriched_logs[-1]["smoothed_avg_kg"]

    return {
        "logs": enriched_logs,
        "stats": {
            "start_weight": start_wt,
            "current_weight": current_wt,
            "goal_weight": goal_wt,
            "total_change": total_change,
            "seven_day_avg": seven_day_avg
        }
    }


@app.get("/api/progress/adaptive-engine")
def get_adaptive_engine_data(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get profile
    cursor.execute("SELECT tdee FROM user_profiles WHERE user_id = ?", (user["id"],))
    prof_row = cursor.fetchone()
    tdee = prof_row["tdee"] if prof_row else 2450.0

    # Get weight logs
    cursor.execute("SELECT date, weight_kg FROM weight_logs WHERE user_id = ? ORDER BY date ASC", (user["id"],))
    weight_logs = [dict(r) for r in cursor.fetchall()]

    # Get daily calorie intakes
    cursor.execute("""
    SELECT m.date, SUM(mi.logged_calories) as calories
    FROM meals m
    JOIN meal_items mi ON m.id = mi.meal_id
    WHERE m.user_id = ?
    GROUP BY m.date
    """, (user["id"],))
    daily_intakes = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return calculate_adaptive_energy_trend(weight_logs, daily_intakes, tdee)


@app.get("/api/progress/weekly-analysis")
def get_weekly_analysis(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Weekly factual & non-judgmental analysis:
    - Average intake vs target
    - Logged days (e.g. 6/7)
    - Net weight trend
    - Protein target reached
    - Helpful constructive insights
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT target_calories, protein_target_g FROM user_profiles WHERE user_id = ?", (user["id"],))
    prof = dict(cursor.fetchone() or {"target_calories": 1950, "protein_target_g": 130})

    # Last 7 days
    end_date = date.today()
    start_date = end_date - timedelta(days=6)

    cursor.execute("""
    SELECT m.date, SUM(mi.logged_calories) as calories, SUM(mi.protein_g) as protein, SUM(mi.fibre_g) as fibre
    FROM meals m
    JOIN meal_items mi ON m.id = mi.meal_id
    WHERE m.user_id = ? AND m.date >= ? AND m.date <= ?
    GROUP BY m.date
    """, (user["id"], start_date.isoformat(), end_date.isoformat()))
    daily_data = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT date, weight_kg FROM weight_logs
    WHERE user_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC
    """, (user["id"], (start_date - timedelta(days=1)).isoformat(), end_date.isoformat()))
    weights = [dict(r) for r in cursor.fetchall()]

    conn.close()

    logged_days = len(daily_data)
    if logged_days == 0:
        avg_cal = 0
        avg_protein = 0
        avg_fibre = 0
        protein_days_hit = 0
    else:
        avg_cal = round(sum(d["calories"] for d in daily_data) / logged_days)
        avg_protein = round(sum(d["protein"] for d in daily_data) / logged_days)
        avg_fibre = round(sum(d["fibre"] for d in daily_data) / logged_days)
        protein_days_hit = sum(1 for d in daily_data if d["protein"] >= prof["protein_target_g"] * 0.9)

    wt_change = 0.0
    if len(weights) >= 2:
        wt_change = round(weights[-1]["weight_kg"] - weights[0]["weight_kg"], 2)

    diff = avg_cal - prof["target_calories"] if logged_days > 0 else 0
    if abs(diff) <= 100:
        tone_message = "Your weekly average intake closely matched your target. Excellent consistency."
    elif diff > 0:
        tone_message = f"Your weekly average was {diff} kcal above target. That's a small difference ({round(diff * 7 / 7700.0, 2)}kg theoretical fat balance). Consistency over time matters far more than perfection."
    else:
        tone_message = f"Your weekly average was {abs(diff)} kcal below target. Ensure you are getting adequate energy and not feeling fatigued."

    return {
        "period": f"{start_date.strftime('%b %d')} – {end_date.strftime('%b %d, %Y')}",
        "logged_days": f"{logged_days}/7",
        "average_calories": avg_cal,
        "target_calories": prof["target_calories"],
        "average_protein": avg_protein,
        "protein_target": prof["protein_target_g"],
        "protein_days_hit": f"{protein_days_hit}/{logged_days}" if logged_days > 0 else "0/7",
        "average_fibre": avg_fibre,
        "weight_trend_kg": wt_change,
        "feedback_message": tone_message,
        "supportive_insights": [
            "Logging consistency was maintained for most meals.",
            "Adequate protein intake protected lean body mass during deficit.",
            "Water fluctuations were smoothed out in the 7-day average curve."
        ]
    }


# ==========================================
# 8. AI NUTRITION ASSISTANT & RECOMMENDATIONS
# ==========================================

@app.post("/api/assistant/chat")
def assistant_chat(req: AssistantChatRequest, user: Dict[str, Any] = Depends(get_current_user)):
    target_date = req.date or req.date_str or date.today().isoformat()
    return handle_assistant_query(req.query, user["id"], target_date, req.image_data)


@app.get("/api/assistant/history")
def get_assistant_history(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, user_id, date, sender, message, image_data, created_at
    FROM user_coach_memories
    WHERE user_id = ?
    ORDER BY created_at ASC LIMIT 50
    """, (user["id"],))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"history": rows}


@app.get("/api/assistant/recommendations")
def get_recommendations(date_str: str = Query(None), user: Dict[str, Any] = Depends(get_current_user)):
    d = date_str or date.today().isoformat()
    ctx = get_user_current_nutrition_context(user["id"], d)
    recs = generate_meal_recommendations(ctx["remaining_calories"], ctx["remaining_protein_g"])
    return {
        "context": ctx,
        "recommendations": recs
    }


# ==========================================
# 9. ERROR REPORTING & ADMIN PANEL
# ==========================================

@app.post("/api/reports/submit")
def submit_food_report(req: FoodReportRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    rep_id = f"report_{secrets.token_hex(6)}"
    now_str = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO food_reports (
        id, user_id, food_id, food_name, issue_type, user_notes, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    """, (rep_id, user["id"], req.food_id, req.food_name, req.issue_type, req.user_notes, now_str))

    conn.commit()
    conn.close()

    return {"status": "success", "report_id": rep_id, "message": "Thank you. CALORA admins investigate all reported nutrition discrepancies."}


@app.get("/api/admin/reports")
def get_admin_reports(status: Optional[str] = Query(None), admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    if status and status != "All":
        cursor.execute("SELECT * FROM food_reports WHERE status = ? ORDER BY created_at DESC", (status,))
    else:
        cursor.execute("SELECT * FROM food_reports ORDER BY created_at DESC")

    reports = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return reports


@app.post("/api/admin/reports/{report_id}/status")
def update_report_status(
    report_id: str,
    req: AdminReportResolutionRequest,
    admin: Dict[str, Any] = Depends(get_current_admin_user)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    cursor.execute("""
    UPDATE food_reports SET status = ?, admin_response = ?, resolved_at = ?
    WHERE id = ?
    """, (req.status, req.admin_response, now_str, report_id))

    # Audit log
    cursor.execute("""
    INSERT INTO audit_logs (id, admin_user_id, action, target_entity, target_id, details, created_at)
    VALUES (?, ?, 'update_report_status', 'food_reports', ?, ?, ?)
    """, (f"audit_{secrets.token_hex(4)}", admin["id"], report_id, f"Set status to {req.status}: {req.admin_response}", now_str))

    conn.commit()
    conn.close()

    return {"status": "success", "report_id": report_id}


@app.get("/api/admin/stats")
def get_admin_stats(admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM food_items")
    total_foods = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM food_items WHERE is_verified = 1")
    verified_foods = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM food_reports WHERE status = 'pending'")
    pending_reports = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM meal_items")
    total_logged_items = cursor.fetchone()[0]

    cursor.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10")
    recent_audits = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "total_foods": total_foods,
        "verified_foods": verified_foods,
        "estimated_or_custom": total_foods - verified_foods,
        "total_users": total_users,
        "pending_reports": pending_reports,
        "total_logged_items": total_logged_items,
        "recent_audits": recent_audits
    }


# ==========================================
# 10. FOOD LOGGING EXTENSIONS (Edit, Duplicate, Cross-Day Copy)
# ==========================================

@app.put("/api/meals/item/{item_id}")
def update_meal_item(item_id: str, req: UpdateMealItemRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT mi.*, m.user_id FROM meal_items mi
    JOIN meals m ON mi.meal_id = m.id
    WHERE mi.id = ?
    """, (item_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Meal item not found")

    if row["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Forbidden")

    item = dict(row)
    new_food_name = req.food_name or item["food_name"]
    new_portion_name = req.portion_name or item["portion_name"]
    new_gram_weight = req.gram_weight if req.gram_weight is not None else item["gram_weight"]
    new_oil = req.cooking_oil_type or item["cooking_oil_type"]
    new_prep = req.prep_method or item["prep_method"]
    new_notes = req.notes if req.notes is not None else item["notes"]

    # If food_id is present, recompute with uncertainty range
    food_id = item["food_id"]
    if food_id:
        cursor.execute("SELECT * FROM food_items WHERE id = ?", (food_id,))
        f_row = cursor.fetchone()
        if f_row:
            food = dict(f_row)
            cal_calc = compute_item_uncertainty_and_range(food["calories_per_100g"], new_gram_weight, new_oil, new_prep)
            new_calories = cal_calc["logged_calories"]
            range_low = cal_calc["range_low"]
            range_high = cal_calc["range_high"]
            conf = cal_calc["confidence_level"]
            uncert = json.dumps(cal_calc["main_uncertainties"])

            oil_info = COOKING_OIL_PROFILES.get(new_oil, COOKING_OIL_PROFILES["none"])
            new_p = round((food["protein_per_100g"] * new_gram_weight) / 100.0, 1)
            new_c = round((food["carbs_per_100g"] * new_gram_weight) / 100.0, 1)
            new_f = round(((food["fat_per_100g"] * new_gram_weight) / 100.0) + oil_info["fat_g"], 1)
            new_fib = round((food["fibre_per_100g"] * new_gram_weight) / 100.0, 1)
        else:
            new_calories = req.logged_calories or item["logged_calories"]
            range_low = int(new_calories * 0.9)
            range_high = int(new_calories * 1.1)
            conf = item["confidence_level"]
            uncert = item["main_uncertainties"]
            new_p = req.protein_g if req.protein_g is not None else item["protein_g"]
            new_c = req.carbs_g if req.carbs_g is not None else item["carbs_g"]
            new_f = req.fat_g if req.fat_g is not None else item["fat_g"]
            new_fib = req.fibre_g if req.fibre_g is not None else item["fibre_g"]
    else:
        new_calories = req.logged_calories or item["logged_calories"]
        range_low = int(new_calories * 0.9)
        range_high = int(new_calories * 1.1)
        conf = "MEDIUM"
        uncert = json.dumps(["User-entered estimate"])
        new_p = req.protein_g if req.protein_g is not None else item["protein_g"]
        new_c = req.carbs_g if req.carbs_g is not None else item["carbs_g"]
        new_f = req.fat_g if req.fat_g is not None else item["fat_g"]
        new_fib = req.fibre_g if req.fibre_g is not None else item["fibre_g"]

    cursor.execute("""
    UPDATE meal_items
    SET food_name = ?, portion_name = ?, gram_weight = ?, cooking_oil_type = ?,
        prep_method = ?, logged_calories = ?, range_low = ?, range_high = ?,
        confidence_level = ?, main_uncertainties = ?, protein_g = ?, carbs_g = ?,
        fat_g = ?, fibre_g = ?, notes = ?
    WHERE id = ?
    """, (
        new_food_name, new_portion_name, new_gram_weight, new_oil, new_prep,
        new_calories, range_low, range_high, conf, uncert, new_p, new_c, new_f, new_fib,
        new_notes, item_id
    ))

    conn.commit()
    conn.close()
    return {"status": "success", "item_id": item_id, "updated_calories": new_calories}


@app.post("/api/meals/item/{item_id}/duplicate")
def duplicate_meal_item(item_id: str, req: DuplicateMealItemRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT mi.*, m.user_id, m.date, m.meal_type FROM meal_items mi
    JOIN meals m ON mi.meal_id = m.id
    WHERE mi.id = ?
    """, (item_id,))
    row = cursor.fetchone()
    if not row or row["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")

    item = dict(row)
    target_date = req.target_date or date.today().isoformat()
    target_meal_type = req.target_meal_type or item["meal_type"]
    now_str = datetime.now().isoformat()

    # Find or create target meal header
    cursor.execute("SELECT id FROM meals WHERE user_id = ? AND date = ? AND meal_type = ?", (user["id"], target_date, target_meal_type))
    m_row = cursor.fetchone()
    if m_row:
        meal_id = m_row[0]
    else:
        meal_id = f"meal_{user['id']}_{target_date}_{target_meal_type}_{secrets.token_hex(3)}"
        cursor.execute("INSERT INTO meals (id, user_id, date, meal_type, created_at) VALUES (?, ?, ?, ?, ?)", (meal_id, user["id"], target_date, target_meal_type, now_str))

    new_item_id = f"item_{secrets.token_hex(6)}"
    cursor.execute("""
    INSERT INTO meal_items (
        id, meal_id, food_id, food_name, portion_name, gram_weight,
        cooking_oil_type, prep_method, logged_calories, range_low, range_high,
        confidence_level, main_uncertainties, protein_g, carbs_g, fat_g, fibre_g,
        data_origin, source_citation, breakdown_json, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_item_id, meal_id, item["food_id"], item["food_name"], item["portion_name"],
        item["gram_weight"], item["cooking_oil_type"], item["prep_method"], item["logged_calories"],
        item["range_low"], item["range_high"], item["confidence_level"], item["main_uncertainties"],
        item["protein_g"], item["carbs_g"], item["fat_g"], item["fibre_g"], item["data_origin"],
        item["source_citation"], item["breakdown_json"], item["notes"], now_str
    ))

    conn.commit()
    conn.close()
    return {"status": "success", "new_item_id": new_item_id, "target_date": target_date, "target_meal_type": target_meal_type}


@app.post("/api/meals/copy")
def copy_meal_day(req: CopyMealRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    if req.source_meal_type == "all":
        cursor.execute("SELECT id, meal_type FROM meals WHERE user_id = ? AND date = ?", (user["id"], req.source_date))
        source_meals = [dict(r) for r in cursor.fetchall()]
    else:
        cursor.execute("SELECT id, meal_type FROM meals WHERE user_id = ? AND date = ? AND meal_type = ?", (user["id"], req.source_date, req.source_meal_type))
        source_meals = [dict(r) for r in cursor.fetchall()]

    if not source_meals:
        conn.close()
        raise HTTPException(status_code=404, detail="No source meals found on that date")

    now_str = datetime.now().isoformat()
    copied_count = 0

    for sm in source_meals:
        target_type = req.target_meal_type if req.target_meal_type and req.source_meal_type != "all" else sm["meal_type"]
        cursor.execute("SELECT id FROM meals WHERE user_id = ? AND date = ? AND meal_type = ?", (user["id"], req.target_date, target_type))
        tm_row = cursor.fetchone()
        if tm_row:
            target_meal_id = tm_row[0]
        else:
            target_meal_id = f"meal_{user['id']}_{req.target_date}_{target_type}_{secrets.token_hex(3)}"
            cursor.execute("INSERT INTO meals (id, user_id, date, meal_type, created_at) VALUES (?, ?, ?, ?, ?)", (target_meal_id, user["id"], req.target_date, target_type, now_str))

        cursor.execute("SELECT * FROM meal_items WHERE meal_id = ?", (sm["id"],))
        items = [dict(i) for i in cursor.fetchall()]

        for item in items:
            new_id = f"item_{secrets.token_hex(6)}"
            cursor.execute("""
            INSERT INTO meal_items (
                id, meal_id, food_id, food_name, portion_name, gram_weight,
                cooking_oil_type, prep_method, logged_calories, range_low, range_high,
                confidence_level, main_uncertainties, protein_g, carbs_g, fat_g, fibre_g,
                data_origin, source_citation, breakdown_json, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_id, target_meal_id, item["food_id"], item["food_name"], item["portion_name"],
                item["gram_weight"], item["cooking_oil_type"], item["prep_method"], item["logged_calories"],
                item["range_low"], item["range_high"], item["confidence_level"], item["main_uncertainties"],
                item["protein_g"], item["carbs_g"], item["fat_g"], item["fibre_g"], item["data_origin"],
                item["source_citation"], item["breakdown_json"], item["notes"], now_str
            ))
            copied_count += 1

    conn.commit()
    conn.close()
    return {"status": "success", "copied_items_count": copied_count, "target_date": req.target_date}


# ==========================================
# 11. STEPS & SLEEP TRACKING
# ==========================================

@app.get("/api/steps/today")
def get_today_steps(date_str: Optional[str] = Query(None), user: Dict[str, Any] = Depends(get_current_user)):
    d = date_str or date.today().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM daily_step_logs WHERE user_id = ? AND date = ?", (user["id"], d))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "user_id": user["id"],
        "date": d,
        "steps_count": 0,
        "distance_km": 0.0,
        "active_minutes": 0,
        "goal_steps": 10000,
        "calories_burned": 0,
        "notes": ""
    }


@app.get("/api/steps/history")
def get_steps_history(days: int = Query(14), user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM daily_step_logs WHERE user_id = ? ORDER BY date DESC LIMIT ?", (user["id"], days))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    rows.reverse()
    avg_steps = round(sum(r["steps_count"] for r in rows) / max(1, len(rows))) if rows else 0
    return {"history": rows, "average_steps": avg_steps, "total_logged_days": len(rows)}


@app.post("/api/steps/log")
def log_daily_steps(req: LogStepRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    dist = req.distance_km if req.distance_km is not None else round(req.steps_count * 0.00075, 2)
    cals = req.calories_burned if req.calories_burned is not None else round(req.steps_count * 0.038)
    goal = req.goal_steps or 10000
    active = req.active_minutes or 30

    cursor.execute("""
    INSERT INTO daily_step_logs (id, user_id, date, steps_count, distance_km, active_minutes, goal_steps, calories_burned, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
        steps_count = excluded.steps_count,
        distance_km = excluded.distance_km,
        active_minutes = excluded.active_minutes,
        goal_steps = excluded.goal_steps,
        calories_burned = excluded.calories_burned,
        notes = excluded.notes
    """, (f"step_{user['id']}_{req.date}", user["id"], req.date, req.steps_count, dist, active, goal, cals, req.notes or "", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "date": req.date, "steps_count": req.steps_count, "calories_burned": cals}


@app.get("/api/sleep/today")
def get_today_sleep(date_str: Optional[str] = Query(None), user: Dict[str, Any] = Depends(get_current_user)):
    d = date_str or date.today().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sleep_logs WHERE user_id = ? AND date = ?", (user["id"], d))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "user_id": user["id"],
        "date": d,
        "bedtime": "22:30",
        "wake_time": "06:30",
        "duration_minutes": 480,
        "quality_rating": 4,
        "goal_minutes": 480,
        "notes": ""
    }


@app.get("/api/sleep/history")
def get_sleep_history(days: int = Query(14), user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sleep_logs WHERE user_id = ? ORDER BY date DESC LIMIT ?", (user["id"], days))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    rows.reverse()
    avg_min = round(sum(r["duration_minutes"] for r in rows) / max(1, len(rows))) if rows else 480
    avg_quality = round(sum(r["quality_rating"] for r in rows) / max(1, len(rows)), 1) if rows else 4.0
    return {"history": rows, "average_duration_min": avg_min, "average_quality": avg_quality}


@app.post("/api/sleep/log")
def log_sleep(req: LogSleepRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    try:
        b_h, b_m = [int(p) for p in req.bedtime.split(":")]
        w_h, w_m = [int(p) for p in req.wake_time.split(":")]
        b_total = b_h * 60 + b_m
        w_total = w_h * 60 + w_m
        duration_minutes = (w_total - b_total) if w_total >= b_total else (1440 - b_total + w_total)
    except Exception:
        duration_minutes = 480

    cursor.execute("""
    INSERT INTO sleep_logs (id, user_id, date, bedtime, wake_time, duration_minutes, quality_rating, goal_minutes, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
        bedtime = excluded.bedtime,
        wake_time = excluded.wake_time,
        duration_minutes = excluded.duration_minutes,
        quality_rating = excluded.quality_rating,
        goal_minutes = excluded.goal_minutes,
        notes = excluded.notes
    """, (f"sleep_{user['id']}_{req.date}", user["id"], req.date, req.bedtime, req.wake_time, duration_minutes, req.quality_rating, req.goal_minutes or 480, req.notes or "", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "date": req.date, "duration_minutes": duration_minutes, "hours": f"{duration_minutes//60}h {duration_minutes%60}m"}


# ==========================================
# 12. WORKOUTS, EXERCISE LIBRARY & GENERATOR
# ==========================================

@app.get("/api/workouts/exercises")
def list_exercises(
    muscle_group: Optional[str] = Query(None),
    equipment: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM exercises WHERE 1=1"
    params = []

    if muscle_group and muscle_group != "all":
        query += " AND LOWER(muscle_group) = LOWER(?)"
        params.append(muscle_group)
    if equipment and equipment != "all":
        query += " AND LOWER(equipment) = LOWER(?)"
        params.append(equipment)
    if difficulty and difficulty != "all":
        query += " AND LOWER(difficulty) = LOWER(?)"
        params.append(difficulty)
    if search:
        query += " AND (name LIKE ? OR form_cues LIKE ? OR kenyan_context LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])

    query += " ORDER BY muscle_group, name"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@app.get("/api/workouts/plans")
def list_workout_plans():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM workout_plans ORDER BY created_at")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    for r in rows:
        r["schedule"] = json.loads(r["schedule_json"])
    return rows


@app.post("/api/workouts/generate")
def generate_workout_routine(req: GenerateWorkoutRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM exercises")
    all_ex = [dict(r) for r in cursor.fetchall()]
    conn.close()

    equip_set = set(req.available_equipment)
    if "Household" in equip_set:
        equip_set.add("Bodyweight")

    filtered = [e for e in all_ex if e["equipment"] in equip_set or e["equipment"] == "Bodyweight"]
    if not filtered:
        filtered = all_ex

    patterns = ["Squat", "Push", "Pull", "Hinge", "Core", "Carry"]
    selected = []
    for pat in patterns:
        matches = [e for e in filtered if e["movement_pattern"] == pat]
        if matches:
            selected.append(matches[0])

    schedule = [
        {"day": "Day 1: Full Body Power & Form", "exercises": selected[:4]},
        {"day": "Day 2: Cardio, Core & Mobility", "exercises": [e for e in filtered if e["muscle_group"] in ("Core", "Full Body")][:4]},
        {"day": "Day 3: Strength & Conditioning", "exercises": selected[2:] + selected[:2]}
    ]

    return {
        "title": f"Custom {req.goal.replace('_', ' ').title()} Routine",
        "level": req.level,
        "days_per_week": req.days_per_week,
        "equipment": req.available_equipment,
        "schedule": schedule
    }


@app.post("/api/workouts/log")
def log_user_workout(req: LogWorkoutRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    w_id = f"uwl_{user['id']}_{secrets.token_hex(4)}"

    vol = 0.0
    for ex in req.exercises:
        for s in ex.get("sets", []):
            vol += s.get("reps", 0) * s.get("weight_kg", 0)

    cursor.execute("""
    INSERT INTO user_workout_logs (id, user_id, date, routine_name, plan_id, duration_minutes, total_volume_kg, exercises_json, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (w_id, user["id"], req.date, req.routine_name, req.plan_id, req.duration_minutes, vol, json.dumps(req.exercises), req.notes or "", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "workout_id": w_id, "volume_kg": vol}


@app.get("/api/workouts/history")
def get_user_workouts(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_workout_logs WHERE user_id = ? ORDER BY date DESC LIMIT 20", (user["id"],))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    for r in rows:
        r["exercises"] = json.loads(r["exercises_json"])
    return rows


# ==========================================
# 13. GYM PARTNER, ONBOARDING & WORKSPACES
# ==========================================

@app.post("/api/gyms/register")
def register_gym(req: GymRegisterRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM gyms WHERE code = ? OR slug = ?", (req.code, req.slug))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="A gym with this code or workspace slug already exists")

    cursor.execute("SELECT id FROM users WHERE email = ?", (req.owner_email.lower(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Owner email already registered")

    gym_id = f"gym_{secrets.token_hex(4)}"
    owner_id = f"user_owner_{secrets.token_hex(4)}"
    now_str = datetime.now().isoformat()
    trial_end = (datetime.now() + timedelta(days=14)).isoformat()

    # Create Owner Account
    cursor.execute("""
    INSERT INTO users (id, email, name, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, 'gym_owner', ?)
    """, (owner_id, req.owner_email.lower(), req.owner_name, hash_password(req.owner_password), now_str))

    # Create Gym
    cursor.execute("""
    INSERT INTO gyms (id, name, location, code, slug, owner_id, contact_phone, contact_email, tier, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    """, (gym_id, req.name, req.location, req.code, req.slug, owner_id, req.contact_phone, req.contact_email, req.tier or "standard", now_str))

    # Default Branding
    cursor.execute("""
    INSERT INTO gym_branding (gym_id, slug, logo_url, primary_color, secondary_color, banner_url, tagline, welcome_message, updated_at)
    VALUES (?, ?, '/static/favicon.svg', '#10b981', '#064e3b', '', 'Official Calora Community Partner', 'Welcome to our workspace! Fuel clean, train hard.', ?)
    """, (gym_id, req.slug, now_str))

    # Starter Plan Subscription (14-day trial)
    cursor.execute("""
    INSERT INTO gym_subscriptions (id, gym_id, plan_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at, updated_at)
    VALUES (?, ?, 'plan_starter', 'trialing', ?, ?, ?, 0, ?, ?)
    """, (f"gsub_{secrets.token_hex(4)}", gym_id, now_str, trial_end, trial_end, now_str, now_str))

    conn.commit()
    conn.close()

    token = create_access_token({"sub": owner_id, "email": req.owner_email.lower(), "name": req.owner_name, "role": "gym_owner"})
    return {
        "status": "success",
        "gym_id": gym_id,
        "slug": req.slug,
        "token": token,
        "owner": {"id": owner_id, "name": req.owner_name, "role": "gym_owner"}
    }


@app.get("/api/gyms/all")
def list_all_gyms():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT g.*, gb.primary_color, gb.tagline, gb.logo_url
    FROM gyms g
    LEFT JOIN gym_branding gb ON g.id = gb.gym_id
    WHERE g.status = 'active'
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@app.get("/api/gyms/workspace/{slug}")
def get_gym_workspace(slug: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gyms WHERE slug = ?", (slug,))
    g_row = cursor.fetchone()
    if not g_row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Gym workspace '{slug}' not found")

    gym = dict(g_row)
    gym_id = gym["id"]

    cursor.execute("SELECT * FROM gym_branding WHERE gym_id = ?", (gym_id,))
    b_row = cursor.fetchone()
    branding = dict(b_row) if b_row else {}

    cursor.execute("SELECT * FROM gym_packages WHERE gym_id = ? AND is_available = 1", (gym_id,))
    packages = [dict(p) for p in cursor.fetchall()]

    cursor.execute("""
    SELECT c.id, c.specialization, c.bio, u.name as coach_name, gca.role
    FROM gym_coach_assignments gca
    JOIN coaches c ON gca.coach_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE gca.gym_id = ?
    """, (gym_id,))
    coaches = [dict(c) for c in cursor.fetchall()]

    cursor.execute("SELECT COUNT(*) FROM gym_members WHERE gym_id = ? AND status = 'active'", (gym_id,))
    member_count = cursor.fetchone()[0]

    conn.close()
    return {
        "gym": gym,
        "branding": branding,
        "packages": packages,
        "coaches": coaches,
        "member_count": member_count
    }


@app.get("/api/gyms/{gym_id}/branding")
def get_gym_branding(gym_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gym_branding WHERE gym_id = ?", (gym_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


@app.put("/api/gyms/{gym_id}/branding")
def update_gym_branding(gym_id: str, req: GymBrandingUpdateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    cursor.execute("""
    UPDATE gym_branding
    SET primary_color = COALESCE(?, primary_color),
        secondary_color = COALESCE(?, secondary_color),
        tagline = COALESCE(?, tagline),
        welcome_message = COALESCE(?, welcome_message),
        logo_url = COALESCE(?, logo_url),
        updated_at = ?
    WHERE gym_id = ?
    """, (req.primary_color, req.secondary_color, req.tagline, req.welcome_message, req.logo_url, now_str, gym_id))

    conn.commit()
    conn.close()
    return {"status": "success", "gym_id": gym_id}


@app.get("/api/gyms/{gym_id}/members")
def get_gym_members(gym_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT gm.id, gm.membership_number, gm.status, gm.joined_at, u.name, u.email,
           mcs.share_nutrition_summary, mcs.share_weight_trend, mcs.receive_weekly_email
    FROM gym_members gm
    JOIN users u ON gm.user_id = u.id
    LEFT JOIN member_consent_settings mcs ON gm.user_id = mcs.user_id AND gm.gym_id = mcs.gym_id
    WHERE gm.gym_id = ?
    ORDER BY gm.joined_at DESC
    """, (gym_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@app.post("/api/gyms/{gym_id}/invites")
def create_gym_invite(gym_id: str, req: GymInviteRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    inv_id = f"inv_{secrets.token_hex(4)}"
    code = f"CALORA-{secrets.token_hex(3).upper()}"
    now_str = datetime.now().isoformat()
    exp_str = (datetime.now() + timedelta(days=7)).isoformat()

    cursor.execute("""
    INSERT INTO gym_invites (id, gym_id, email, role, invite_code, expires_at, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    """, (inv_id, gym_id, req.email.lower(), req.role, code, exp_str, now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "invite_code": code, "expires_at": exp_str, "invite_url": f"http://localhost:8000/invite/{code}"}


@app.post("/api/gyms/invites/accept/{invite_code}")
def accept_gym_invite(invite_code: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    cursor.execute("SELECT * FROM gym_invites WHERE invite_code = ? AND status = 'pending'", (invite_code,))
    inv = cursor.fetchone()
    if not inv:
        conn.close()
        raise HTTPException(status_code=404, detail="Invalid or expired invitation code")

    gym_id = inv["gym_id"]

    cursor.execute("SELECT id FROM gym_members WHERE gym_id = ? AND user_id = ?", (gym_id, user["id"]))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO gym_members (id, gym_id, user_id, membership_number, status, joined_at)
        VALUES (?, ?, ?, ?, 'active', ?)
        """, (f"gm_{secrets.token_hex(4)}", gym_id, user["id"], f"MEM-{secrets.token_hex(3).upper()}", now_str))

        cursor.execute("""
        INSERT OR IGNORE INTO member_consent_settings (user_id, gym_id, share_nutrition_summary, share_weight_trend, share_detailed_food_logs, share_workouts, receive_weekly_email, updated_at)
        VALUES (?, ?, 1, 1, 0, 1, 1, ?)
        """, (user["id"], gym_id, now_str))

    cursor.execute("UPDATE gym_invites SET status = 'accepted' WHERE invite_code = ?", (invite_code,))
    conn.commit()
    conn.close()
    return {"status": "success", "gym_id": gym_id, "message": "Successfully joined gym workspace"}


# ==========================================
# 14. GYM MANAGER DASHBOARD & CONSENT-BASED PROGRESS REPORTS
# ==========================================

@app.get("/api/gyms/{gym_id}/dashboard")
def get_gym_dashboard_overview(gym_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM gyms WHERE id = ?", (gym_id,))
    gym = dict(cursor.fetchone() or {})

    cursor.execute("SELECT COUNT(*) FROM gym_members WHERE gym_id = ?", (gym_id,))
    total_members = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM gym_members WHERE gym_id = ? AND status = 'active'", (gym_id,))
    active_members = cursor.fetchone()[0]

    cursor.execute("""
    SELECT gs.*, sp.name as plan_name, sp.price_kes, sp.max_members
    FROM gym_subscriptions gs
    JOIN subscription_plans sp ON gs.plan_id = sp.id
    WHERE gs.gym_id = ?
    """, (gym_id,))
    sub = dict(cursor.fetchone() or {})

    cursor.execute("SELECT SUM(amount_kes) FROM gym_orders WHERE gym_id = ? AND status = 'completed'", (gym_id,))
    gross_sales = cursor.fetchone()[0] or 0

    cursor.execute("""
    SELECT c.id, u.name, c.specialization, gca.role
    FROM gym_coach_assignments gca
    JOIN coaches c ON gca.coach_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE gca.gym_id = ?
    """, (gym_id,))
    coaches = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "gym": gym,
        "total_members": total_members,
        "active_members": active_members,
        "subscription": sub,
        "gross_package_sales_kes": gross_sales,
        "coaches": coaches
    }


@app.get("/api/gyms/{gym_id}/progress-reports")
def get_gym_consent_progress_reports(gym_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Consent-based member progress reports for Gym Managers.
    Calculates aggregate trends across the whole gym.
    Individual detailed progress is only returned if member has granted consent.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT gm.user_id, u.name, u.email, up.target_calories, up.protein_target_g,
           up.current_weight_kg, up.goal_weight_kg, up.primary_goal,
           mcs.share_nutrition_summary, mcs.share_weight_trend, mcs.share_detailed_food_logs
    FROM gym_members gm
    JOIN users u ON gm.user_id = u.id
    LEFT JOIN user_profiles up ON gm.user_id = up.user_id
    LEFT JOIN member_consent_settings mcs ON gm.user_id = mcs.user_id AND gm.gym_id = mcs.gym_id
    WHERE gm.gym_id = ? AND gm.status = 'active'
    """, (gym_id,))
    members = [dict(r) for r in cursor.fetchall()]

    today = date.today()
    week_ago = (today - timedelta(days=7)).isoformat()
    today_str = today.isoformat()

    member_reports = []
    total_deficits = []
    protein_compliance_scores = []
    weight_trends = {"losing": 0, "maintaining": 0, "gaining": 0}

    for m in members:
        uid = m["user_id"]
        has_nutrition_consent = bool(m.get("share_nutrition_summary", 1))
        has_weight_consent = bool(m.get("share_weight_trend", 1))

        # 7-day calories
        cursor.execute("""
        SELECT mi.logged_calories, mi.protein_g
        FROM meals ml
        JOIN meal_items mi ON ml.id = mi.meal_id
        WHERE ml.user_id = ? AND ml.date >= ? AND ml.date <= ?
        """, (uid, week_ago, today_str))
        items = cursor.fetchall()

        cals = sum(i["logged_calories"] for i in items)
        prot = sum(i["protein_g"] for i in items)
        days_logged = len(set(i[0] for i in items)) or 1
        avg_cals = round(cals / max(1, days_logged))
        avg_p = round(prot / max(1, days_logged))

        target_cals = m.get("target_calories") or 2000
        target_p = m.get("protein_target_g") or 130
        deficit = target_cals - avg_cals if avg_cals > 0 else 0
        prot_adherence = min(100, round((avg_p / target_p) * 100)) if target_p else 0

        # Steps
        cursor.execute("SELECT AVG(steps_count) FROM daily_step_logs WHERE user_id = ? AND date >= ?", (uid, week_ago))
        avg_steps = round(cursor.fetchone()[0] or 0)

        # Workouts
        cursor.execute("SELECT COUNT(*) FROM user_workout_logs WHERE user_id = ? AND date >= ?", (uid, week_ago))
        w_count = cursor.fetchone()[0] or 0

        if deficit > 100:
            weight_trends["losing"] += 1
        elif deficit < -100:
            weight_trends["gaining"] += 1
        else:
            weight_trends["maintaining"] += 1

        total_deficits.append(deficit)
        protein_compliance_scores.append(prot_adherence)

        if has_nutrition_consent:
            member_reports.append({
                "user_id": uid,
                "name": m["name"],
                "consent_granted": True,
                "target_calories": target_cals,
                "avg_calories": avg_cals,
                "avg_deficit": deficit,
                "avg_protein_g": avg_p,
                "protein_adherence_pct": prot_adherence,
                "avg_steps": avg_steps,
                "workouts_count": w_count,
                "goal": m.get("primary_goal", "lose"),
                "share_detailed_food_logs": bool(m.get("share_detailed_food_logs", 0))
            })
        else:
            member_reports.append({
                "user_id": uid,
                "name": "Member (Consent Withheld)",
                "consent_granted": False,
                "avg_deficit": "Private",
                "avg_protein_g": "Private",
                "protein_adherence_pct": "Private",
                "avg_steps": "Private",
                "workouts_count": "Private",
                "goal": "Private"
            })

    conn.close()

    avg_gym_deficit = round(sum(total_deficits) / max(1, len(total_deficits))) if total_deficits else 0
    avg_gym_protein_adherence = round(sum(protein_compliance_scores) / max(1, len(protein_compliance_scores))) if protein_compliance_scores else 0

    return {
        "gym_id": gym_id,
        "total_active_members": len(members),
        "aggregate_trends": {
            "avg_daily_calorie_deficit": avg_gym_deficit,
            "avg_protein_adherence_pct": avg_gym_protein_adherence,
            "weight_trend_distribution": weight_trends,
            "active_logging_rate_pct": round((len([d for d in total_deficits if d != 0]) / max(1, len(members))) * 100)
        },
        "member_reports": member_reports
    }


# ==========================================
# 15. GYM SUBSCRIPTIONS & BILLING
# ==========================================

@app.get("/api/gyms/plans")
def list_subscription_plans():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_kes ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    for r in rows:
        r["features"] = json.loads(r["features_json"])
    return rows


@app.put("/api/admin/plans/{plan_id}")
def update_subscription_plan(plan_id: str, req: AdminUpdatePlanRequest, admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    cursor.execute("""
    UPDATE subscription_plans
    SET price_kes = ?, max_members = ?, features_json = COALESCE(?, features_json), is_active = ?, updated_at = ?
    WHERE id = ?
    """, (req.price_kes, req.max_members, req.features_json, req.is_active or 1, now_str, plan_id))

    conn.commit()
    conn.close()
    return {"status": "success", "plan_id": plan_id}


@app.post("/api/gyms/{gym_id}/subscribe")
def subscribe_gym_plan(gym_id: str, req: GymSubscribeRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM subscription_plans WHERE id = ?", (req.plan_id,))
    plan = cursor.fetchone()
    conn.close()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")

    # Initiate M-Pesa STK Push
    result = initiate_mpesa_payment(
        phone_number=req.phone_number,
        amount_kes=plan["price_kes"],
        transaction_type="gym_subscription",
        entity_id=gym_id,
        user_id=user["id"],
        idempotency_key=req.idempotency_key
    )
    return result


@app.get("/api/gyms/{gym_id}/subscription")
def get_gym_subscription(gym_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT gs.*, sp.name as plan_name, sp.price_kes, sp.max_members, sp.features_json
    FROM gym_subscriptions gs
    JOIN subscription_plans sp ON gs.plan_id = sp.id
    WHERE gs.gym_id = ?
    """, (gym_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {"status": "none"}
    res = dict(row)
    res["features"] = json.loads(res["features_json"])
    return res


@app.get("/api/gyms/{gym_id}/invoices")
def get_gym_invoices(gym_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM billing_invoices WHERE gym_id = ? ORDER BY created_at DESC", (gym_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


# ==========================================
# 16. GYM PACKAGES, SALES & REFUNDS
# ==========================================

@app.get("/api/gyms/{gym_id}/packages")
def list_gym_packages(gym_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gym_packages WHERE gym_id = ? AND is_available = 1", (gym_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@app.post("/api/gyms/{gym_id}/packages")
def create_gym_package(gym_id: str, req: GymPackageCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    pkg_id = f"pkg_{secrets.token_hex(4)}"
    now_str = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO gym_packages (id, gym_id, name, description, price_kes, duration_days, is_available, eligibility, terms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    """, (pkg_id, gym_id, req.name, req.description, req.price_kes, req.duration_days, req.eligibility or "all_members", req.terms or "", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "package_id": pkg_id}


@app.post("/api/gyms/{gym_id}/packages/{pkg_id}/order")
def order_gym_package(gym_id: str, pkg_id: str, req: GymPackageOrderRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gym_packages WHERE id = ? AND gym_id = ?", (pkg_id, gym_id))
    pkg = cursor.fetchone()
    if not pkg:
        conn.close()
        raise HTTPException(status_code=404, detail="Package not found")

    order_id = f"ord_{secrets.token_hex(6)}"
    now_str = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO gym_orders (id, gym_id, package_id, user_id, amount_kes, currency, status, payment_method, idempotency_key, created_at)
    VALUES (?, ?, ?, ?, ?, 'KES', 'pending', 'mpesa', ?, ?)
    """, (order_id, gym_id, pkg_id, user["id"], pkg["price_kes"], req.idempotency_key, now_str))

    conn.commit()
    conn.close()

    # Initiate M-Pesa STK Push
    result = initiate_mpesa_payment(
        phone_number=req.phone_number,
        amount_kes=pkg["price_kes"],
        transaction_type="package_order",
        entity_id=order_id,
        user_id=user["id"],
        idempotency_key=req.idempotency_key
    )
    result["order_id"] = order_id
    return result


@app.get("/api/gyms/{gym_id}/orders")
def get_gym_orders(gym_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT go.*, gp.name as package_name, u.name as member_name, u.email as member_email
    FROM gym_orders go
    JOIN gym_packages gp ON go.package_id = gp.id
    JOIN users u ON go.user_id = u.id
    WHERE go.gym_id = ?
    ORDER BY go.created_at DESC
    """, (gym_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@app.post("/api/gyms/orders/{order_id}/refund")
def refund_gym_order(order_id: str, reason: str = Query("Customer requested cancellation"), admin: Dict[str, Any] = Depends(get_current_admin_user)):
    res = record_refund_reversal(order_id, admin["id"], reason)
    return res


# ==========================================
# 17. KENYAN PAYMENT GATEWAY WEBHOOK & TRANSACTIONS
# ==========================================

@app.post("/api/payments/initiate")
def initiate_payment(req: InitiatePaymentRequest, user: Dict[str, Any] = Depends(get_current_user)):
    return initiate_mpesa_payment(
        phone_number=req.phone_number,
        amount_kes=req.amount_kes,
        transaction_type=req.transaction_type,
        entity_id=req.entity_id,
        user_id=user["id"],
        idempotency_key=req.idempotency_key
    )


@app.post("/api/payments/callback")
def payment_webhook_callback(req: PaymentCallbackRequest):
    """
    Safaricom Daraja / Payment Provider Webhook Handler.
    Verifies reference, applies business activation, writes append-only ledger entries.
    """
    return process_payment_callback(
        reference=req.reference,
        success=req.success,
        receipt_number=req.receipt_number,
        failure_reason=req.failure_reason
    )


@app.get("/api/payments/transactions")
def get_transactions(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    if user["role"] == "admin":
        cursor.execute("SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 50")
    else:
        cursor.execute("SELECT * FROM payment_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", (user["id"],))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


# ==========================================
# 18. REVENUE LEDGER & SETTLEMENTS
# ==========================================

@app.get("/api/gyms/{gym_id}/settlements")
def get_gym_settlements(gym_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gym_settlements WHERE gym_id = ? ORDER BY created_at DESC", (gym_id,))
    rows = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT SUM(gym_share_kes) FROM revenue_ledger
    WHERE gym_id = ? AND entry_type = 'package_sale' AND status = 'pending_settlement'
    """, (gym_id,))
    pending_payout = cursor.fetchone()[0] or 0

    conn.close()
    return {"settlements": rows, "pending_payout_liability_kes": pending_payout}


@app.get("/api/admin/revenue-overview")
def get_admin_revenue_overview(admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total Platform SaaS Revenue
    cursor.execute("SELECT SUM(platform_share_kes) FROM revenue_ledger WHERE entry_type = 'gym_subscription'")
    saas_revenue = cursor.fetchone()[0] or 0

    # Total Member Package Gross Volume
    cursor.execute("SELECT SUM(amount_kes) FROM revenue_ledger WHERE entry_type = 'package_sale'")
    pkg_gross_volume = cursor.fetchone()[0] or 0

    # Total Platform Commission
    cursor.execute("SELECT SUM(platform_share_kes) FROM revenue_ledger WHERE entry_type = 'package_sale'")
    commission_earned = cursor.fetchone()[0] or 0

    # Pending Settlement Liabilities to Partner Gyms
    cursor.execute("SELECT SUM(gym_share_kes) FROM revenue_ledger WHERE entry_type = 'package_sale' AND status = 'pending_settlement'")
    pending_liabilities = cursor.fetchone()[0] or 0

    # Total Refunded
    cursor.execute("SELECT SUM(amount_kes) FROM revenue_ledger WHERE entry_type = 'refund'")
    total_refunded = abs(cursor.fetchone()[0] or 0)

    # Recent Ledger Entries
    cursor.execute("SELECT * FROM revenue_ledger ORDER BY created_at DESC LIMIT 25")
    recent_entries = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "saas_recurring_revenue_kes": saas_revenue,
        "member_package_gross_volume_kes": pkg_gross_volume,
        "platform_commission_earned_kes": commission_earned,
        "pending_settlement_liabilities_kes": pending_liabilities,
        "total_refunded_kes": total_refunded,
        "recent_ledger": recent_entries
    }


# ==========================================
# 19. MEMBER CONSENT CONTROL
# ==========================================

@app.get("/api/gyms/{gym_id}/my-consent")
def get_my_gym_consent(gym_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM member_consent_settings WHERE user_id = ? AND gym_id = ?", (user["id"], gym_id))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "user_id": user["id"],
        "gym_id": gym_id,
        "share_nutrition_summary": 1,
        "share_weight_trend": 1,
        "share_detailed_food_logs": 0,
        "share_workouts": 1,
        "receive_weekly_email": 1
    }


@app.put("/api/gyms/{gym_id}/my-consent")
def update_my_gym_consent(gym_id: str, req: MemberConsentUpdateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO member_consent_settings (user_id, gym_id, share_nutrition_summary, share_weight_trend, share_detailed_food_logs, share_workouts, receive_weekly_email, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, gym_id) DO UPDATE SET
        share_nutrition_summary = excluded.share_nutrition_summary,
        share_weight_trend = excluded.share_weight_trend,
        share_detailed_food_logs = excluded.share_detailed_food_logs,
        share_workouts = excluded.share_workouts,
        receive_weekly_email = excluded.receive_weekly_email,
        updated_at = excluded.updated_at
    """, (
        user["id"], gym_id,
        1 if req.share_nutrition_summary else 0,
        1 if req.share_weight_trend else 0,
        1 if req.share_detailed_food_logs else 0,
        1 if req.share_workouts else 0,
        1 if req.receive_weekly_email else 0,
        now_str
    ))

    conn.commit()
    conn.close()
    return {"status": "success", "gym_id": gym_id, "message": "Consent settings updated."}


# ==========================================
# 20. AUTOMATED WEEKLY EMAIL REPORTS
# ==========================================

@app.get("/api/gyms/{gym_id}/email-reports/preview/{user_id}")
def preview_member_weekly_email(gym_id: str, user_id: str):
    data = generate_weekly_member_report_data(user_id, gym_id)
    html = render_weekly_email_html(data)
    return HTMLResponse(content=html)


@app.post("/api/gyms/{gym_id}/email-reports/test")
def send_test_weekly_email(gym_id: str, req: SendTestEmailRequest, user: Dict[str, Any] = Depends(get_current_user)):
    res = send_weekly_report_email(user["id"], gym_id, req.recipient_email or user["email"])
    return res


@app.post("/api/gyms/{gym_id}/email-reports/send-weekly")
def send_weekly_reports_to_members(gym_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Dispatches automated weekly email reports to all active members of the gym
    who have enabled 'receive_weekly_email' in their consent settings.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT gm.user_id, u.email
    FROM gym_members gm
    JOIN users u ON gm.user_id = u.id
    LEFT JOIN member_consent_settings mcs ON gm.user_id = mcs.user_id AND gm.gym_id = mcs.gym_id
    WHERE gm.gym_id = ? AND gm.status = 'active' AND COALESCE(mcs.receive_weekly_email, 1) = 1
    """, (gym_id,))
    recipients = [dict(r) for r in cursor.fetchall()]
    conn.close()

    results = []
    for r in recipients:
        res = send_weekly_report_email(r["user_id"], gym_id, r["email"])
        results.append({"user_id": r["user_id"], "email": r["email"], "result": res["status"]})

    return {
        "status": "success",
        "gym_id": gym_id,
        "dispatched_count": len(results),
        "details": results
    }


# ==========================================
# 21. SUPER-ADMIN CONSOLE MANAGEMENT API
# ==========================================

@app.get("/api/admin/users")
def get_admin_users_list(search: Optional[str] = Query(None), role: Optional[str] = Query(None), admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT u.id, u.email, u.name, u.role, u.created_at,
           up.age, up.sex, up.current_weight_kg, up.goal_weight_kg, up.target_calories, up.primary_goal, up.deficit_tier
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE 1=1
    """
    params = []
    if search:
        s = f"%{search}%"
        query += " AND (u.name LIKE ? OR u.email LIKE ?)"
        params.extend([s, s])
    if role and role != "all":
        query += " AND u.role = ?"
        params.append(role)

    query += " ORDER BY u.created_at DESC"
    cursor.execute(query, params)
    users = [dict(r) for r in cursor.fetchall()]

    for u in users:
        cursor.execute("SELECT COUNT(*) FROM meals WHERE user_id = ?", (u["id"],))
        u["total_meals_logged"] = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_workout_logs WHERE user_id = ?", (u["id"],))
        u["total_workouts_logged"] = cursor.fetchone()[0]

    conn.close()
    return users


@app.put("/api/admin/users/{user_id}/role")
def update_user_role(user_id: str, req: AdminUpdateUserRoleRequest, admin: Dict[str, Any] = Depends(get_current_admin_user)):
    allowed_roles = ["client", "user", "coach", "gym_owner", "admin"]
    if req.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {allowed_roles}")

    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    cursor.execute("SELECT name, role FROM users WHERE id = ?", (user_id,))
    target = cursor.fetchone()
    if not target:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    old_role = target["role"]
    cursor.execute("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", (req.role, now_str, user_id))

    # Audit log
    cursor.execute("""
    INSERT INTO audit_logs (id, admin_user_id, action, target_entity, target_id, details, created_at)
    VALUES (?, ?, 'USER_ROLE_CHANGED', 'users', ?, ?, ?)
    """, (f"audit_{secrets.token_hex(4)}", admin["id"], user_id, f"Changed role of {target['name']} from {old_role} to {req.role}", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "user_id": user_id, "new_role": req.role}


@app.get("/api/admin/foods")
def list_admin_foods(search: Optional[str] = Query(None), category: Optional[str] = Query(None), is_verified: Optional[int] = Query(None), admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM food_items WHERE 1=1"
    params = []
    if search:
        s = f"%{search}%"
        query += " AND (name LIKE ? OR common_names LIKE ? OR source LIKE ?)"
        params.extend([s, s, s])
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
    if is_verified is not None:
        query += " AND is_verified = ?"
        params.append(is_verified)

    query += " ORDER BY is_verified DESC, name ASC"
    cursor.execute(query, params)
    foods = [dict(r) for r in cursor.fetchall()]

    for f in foods:
        cursor.execute("SELECT * FROM food_portions WHERE food_id = ? ORDER BY gram_weight ASC", (f["id"],))
        f["portions"] = [dict(p) for p in cursor.fetchall()]

    conn.close()
    return foods


@app.post("/api/admin/foods")
def create_admin_food_item(req: AdminCreateFoodRequest, admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    food_id = f"food_{secrets.token_hex(5)}"

    cursor.execute("""
    INSERT INTO food_items (
        id, name, common_names, category, cuisine, country,
        calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
        fibre_per_100g, sugar_per_100g, sodium_mg_per_100g, default_prep_method,
        source, source_date, data_quality, confidence_level, data_origin,
        notes, is_verified, created_by, created_at
    ) VALUES (?, ?, ?, ?, 'Kenyan', 'Kenya', ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, ?, 'High', 'HIGH', 'admin_verified', '', ?, ?, ?)
    """, (
        food_id, req.name, req.name, req.category,
        req.calories_per_100g, req.protein_per_100g, req.carbs_per_100g, req.fat_per_100g, req.fibre_per_100g,
        req.prep_method or "Boiled / Stewed", req.source or "Kenya Food Composition Tables, 2018",
        now_str[:10], req.is_verified or 1, admin["id"], now_str
    ))

    # Add default portions if provided or create standard 100g portion
    portions = req.portions or [
        {"name": "100 grams", "gram_weight": 100.0, "is_default": 1},
        {"name": "Medium portion (150g)", "gram_weight": 150.0, "is_default": 0}
    ]
    for p in portions:
        cursor.execute("""
        INSERT INTO food_portions (food_id, name, gram_weight, description, is_default)
        VALUES (?, ?, ?, ?, ?)
        """, (food_id, p["name"], p["gram_weight"], p.get("description", ""), 1 if p.get("is_default") else 0))

    cursor.execute("""
    INSERT INTO audit_logs (id, admin_user_id, action, target_entity, target_id, details, created_at)
    VALUES (?, ?, 'FOOD_ITEM_CREATED', 'food_items', ?, ?, ?)
    """, (f"audit_{secrets.token_hex(4)}", admin["id"], food_id, f"Created food item '{req.name}' ({req.calories_per_100g} kcal/100g)", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "id": food_id, "food_id": food_id, "name": req.name}

@app.put("/api/admin/foods/{food_id}")
def update_admin_food_item(food_id: str, req: AdminUpdateFoodRequest, admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM food_items WHERE id = ?", (food_id,))
    target = cursor.fetchone()
    if not target:
        conn.close()
        raise HTTPException(status_code=404, detail="Food item not found")

    now_str = datetime.now().isoformat()
    fields = []
    values = []

    if req.name is not None:
        fields.append("name = ?")
        values.append(req.name)
    if req.category is not None:
        fields.append("category = ?")
        values.append(req.category)
    if req.calories_per_100g is not None:
        fields.append("calories_per_100g = ?")
        values.append(req.calories_per_100g)
    if req.protein_per_100g is not None:
        fields.append("protein_per_100g = ?")
        values.append(req.protein_per_100g)
    if req.carbs_per_100g is not None:
        fields.append("carbs_per_100g = ?")
        values.append(req.carbs_per_100g)
    if req.fat_per_100g is not None:
        fields.append("fat_per_100g = ?")
        values.append(req.fat_per_100g)
    if req.fibre_per_100g is not None:
        fields.append("fibre_per_100g = ?")
        values.append(req.fibre_per_100g)
    if req.is_verified is not None:
        fields.append("is_verified = ?")
        values.append(req.is_verified)

    if fields:
        values.append(food_id)
        cursor.execute(f"UPDATE food_items SET {', '.join(fields)} WHERE id = ?", values)
        cursor.execute("""
        INSERT INTO audit_logs (id, admin_user_id, action, target_entity, target_id, details, created_at)
        VALUES (?, ?, 'FOOD_ITEM_UPDATED', 'food_items', ?, ?, ?)
        """, (f"audit_{secrets.token_hex(4)}", admin["id"], food_id, f"Updated nutrients for '{target['name']}'", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "id": food_id, "food_id": food_id, "calories_per_100g": req.calories_per_100g}


@app.delete("/api/admin/foods/{food_id}")
def delete_admin_food_item(food_id: str, admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM food_items WHERE id = ?", (food_id,))
    target = cursor.fetchone()
    if not target:
        conn.close()
        raise HTTPException(status_code=404, detail="Food item not found")

    food_name = target["name"]
    cursor.execute("DELETE FROM food_portions WHERE food_id = ?", (food_id,))
    cursor.execute("DELETE FROM food_items WHERE id = ?", (food_id,))

    now_str = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO audit_logs (id, admin_user_id, action, target_entity, target_id, details, created_at)
    VALUES (?, ?, 'FOOD_ITEM_DELETED', 'food_items', ?, ?, ?)
    """, (f"audit_{secrets.token_hex(4)}", admin["id"], food_id, f"Deleted food item '{food_name}'", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Deleted food item {food_name}"}


@app.get("/api/admin/gyms")
def list_admin_gyms(admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT g.*, u.name as owner_name, u.email as owner_email,
           sp.name as plan_name, sp.price_kes as plan_price_kes, gs.status as subscription_status,
           gb.primary_color, gb.logo_url
    FROM gyms g
    LEFT JOIN users u ON g.owner_id = u.id
    LEFT JOIN gym_subscriptions gs ON g.id = gs.gym_id
    LEFT JOIN subscription_plans sp ON gs.plan_id = sp.id
    LEFT JOIN gym_branding gb ON g.id = gb.gym_id
    ORDER BY g.created_at DESC
    """)
    gyms = [dict(r) for r in cursor.fetchall()]

    for gym in gyms:
        cursor.execute("SELECT COUNT(*) FROM gym_members WHERE gym_id = ? AND status = 'active'", (gym["id"],))
        gym["active_members"] = cursor.fetchone()[0]

        cursor.execute("SELECT SUM(amount_kes) FROM gym_orders WHERE gym_id = ? AND status = 'completed'", (gym["id"],))
        gym["gross_package_sales"] = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(*) FROM gym_packages WHERE gym_id = ?", (gym["id"],))
        gym["packages_count"] = cursor.fetchone()[0]

    conn.close()
    return gyms


@app.get("/api/admin/audit-logs")
def get_audit_logs(limit: int = Query(50), admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return logs


@app.get("/api/admin/exercises")
def list_admin_exercises(
    muscle_group: Optional[str] = Query(None),
    equipment: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: Dict[str, Any] = Depends(get_current_admin_user)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM exercises WHERE 1=1"
    params = []
    if muscle_group and muscle_group != "all":
        query += " AND LOWER(muscle_group) = LOWER(?)"
        params.append(muscle_group)
    if equipment and equipment != "all":
        query += " AND LOWER(equipment) = LOWER(?)"
        params.append(equipment)
    if difficulty and difficulty != "all":
        query += " AND LOWER(difficulty) = LOWER(?)"
        params.append(difficulty)
    if search:
        query += " AND (name LIKE ? OR form_cues LIKE ? OR kenyan_context LIKE ? OR muscle_group LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])
    query += " ORDER BY muscle_group, name"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@app.post("/api/admin/exercises")
def create_admin_exercise(req: AdminCreateExerciseRequest, admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    ex_id = f"ex_{secrets.token_hex(5)}"

    cursor.execute("""
    INSERT INTO exercises (
        id, name, muscle_group, secondary_muscles, equipment, difficulty,
        movement_pattern, form_cues, safety_tips, kenyan_context, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ex_id, req.name.strip(), req.muscle_group.strip(), req.secondary_muscles,
        req.equipment.strip(), req.difficulty.strip(), req.movement_pattern.strip(),
        req.form_cues.strip(), req.safety_tips.strip(), req.kenyan_context, now_str
    ))

    cursor.execute("""
    INSERT INTO audit_logs (id, admin_user_id, action, target_entity, target_id, details, created_at)
    VALUES (?, ?, 'EXERCISE_CREATED', 'exercises', ?, ?, ?)
    """, (f"audit_{secrets.token_hex(4)}", admin["id"], ex_id, f"Created exercise '{req.name.strip()}' ({req.muscle_group})", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "id": ex_id, "name": req.name.strip(), "message": f"Created exercise {req.name.strip()}"}


@app.delete("/api/admin/exercises/{exercise_id}")
def delete_admin_exercise(exercise_id: str, admin: Dict[str, Any] = Depends(get_current_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM exercises WHERE id = ?", (exercise_id,))
    target = cursor.fetchone()
    if not target:
        conn.close()
        raise HTTPException(status_code=404, detail="Exercise not found")

    ex_name = target["name"]
    cursor.execute("DELETE FROM exercises WHERE id = ?", (exercise_id,))

    now_str = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO audit_logs (id, admin_user_id, action, target_entity, target_id, details, created_at)
    VALUES (?, ?, 'EXERCISE_DELETED', 'exercises', ?, ?, ?)
    """, (f"audit_{secrets.token_hex(4)}", admin["id"], exercise_id, f"Deleted exercise '{ex_name}'", now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Deleted exercise {ex_name}"}


# ==========================================
# 22. CLIENT UNIFIED ACTIVITY & FOOD HISTORY
# ==========================================

@app.get("/api/meals/history")
def get_client_meals_history(days: int = Query(14), user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns daily aggregated food diary history for the user,
    including total consumed calories, target, macro breakdown, and meal items.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    today = date.today()
    start_date = (today - timedelta(days=days)).isoformat()

    cursor.execute("""
    SELECT m.date, m.id as meal_id, m.meal_type,
           mi.id as item_id, mi.food_name, mi.portion_name, mi.gram_weight,
           mi.cooking_oil_type, mi.prep_method, mi.logged_calories,
           mi.protein_g, mi.carbs_g, mi.fat_g, mi.fibre_g,
           mi.confidence_level as confidence, mi.main_uncertainties as main_uncertainty
    FROM meals m
    JOIN meal_items mi ON m.id = mi.meal_id
    WHERE m.user_id = ? AND m.date >= ?
    ORDER BY m.date DESC, m.created_at DESC
    """, (user["id"], start_date))
    rows = cursor.fetchall()

    cursor.execute("SELECT target_calories, protein_target_g, carbs_target_g, fat_target_g, fibre_target_g FROM user_profiles WHERE user_id = ?", (user["id"],))
    prof_row = cursor.fetchone()
    target_cals = prof_row["target_calories"] if prof_row else 2000
    target_p = prof_row["protein_target_g"] if prof_row else 140

    conn.close()

    # Group by date
    history_by_date = {}
    for r in rows:
        d = r["date"]
        if d not in history_by_date:
            history_by_date[d] = {
                "date": d,
                "target_calories": target_cals,
                "target_protein_g": target_p,
                "total_calories": 0,
                "total_protein_g": 0.0,
                "total_carbs_g": 0.0,
                "total_fat_g": 0.0,
                "total_fibre_g": 0.0,
                "items_count": 0,
                "meals": {"breakfast": [], "lunch": [], "dinner": [], "snack": []}
            }

        day = history_by_date[d]
        cals = r["logged_calories"]
        p = r["protein_g"]
        c = r["carbs_g"]
        f = r["fat_g"]
        fib = r["fibre_g"]

        day["total_calories"] += cals
        day["total_protein_g"] += p
        day["total_carbs_g"] += c
        day["total_fat_g"] += f
        day["total_fibre_g"] += fib
        day["items_count"] += 1

        m_type = r["meal_type"] if r["meal_type"] in day["meals"] else "lunch"
        day["meals"][m_type].append({
            "item_id": r["item_id"],
            "food_name": r["food_name"],
            "portion_name": r["portion_name"],
            "gram_weight": r["gram_weight"],
            "calories": cals,
            "protein_g": round(p, 1),
            "carbs_g": round(c, 1),
            "fat_g": round(f, 1),
            "fibre_g": round(fib, 1),
            "cooking_oil": r["cooking_oil_type"],
            "confidence": r["confidence"],
            "main_uncertainty": r["main_uncertainty"]
        })

    # Finalize rounds and deficit
    result = []
    for d, data in sorted(history_by_date.items(), reverse=True):
        data["total_protein_g"] = round(data["total_protein_g"], 1)
        data["total_carbs_g"] = round(data["total_carbs_g"], 1)
        data["total_fat_g"] = round(data["total_fat_g"], 1)
        data["total_fibre_g"] = round(data["total_fibre_g"], 1)
        data["deficit_kcal"] = data["target_calories"] - data["total_calories"]
        data["is_deficit"] = data["deficit_kcal"] >= 0
        result.append(data)

    return {"days": len(result), "history": result}


@app.get("/api/client/unified-history")
def get_client_unified_activity_history(limit: int = Query(50), user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns a unified chronological activity timeline of everything the client has done:
    Meals logged, Workouts completed, Steps achieved, Sleep tracked, and Weight weigh-ins.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    timeline = []

    # 1. Meals
    cursor.execute("""
    SELECT m.date, m.created_at, m.meal_type, mi.food_name, mi.portion_name, mi.logged_calories
    FROM meals m
    JOIN meal_items mi ON m.id = mi.meal_id
    WHERE m.user_id = ?
    ORDER BY m.created_at DESC LIMIT 30
    """, (user["id"],))
    for r in cursor.fetchall():
        timeline.append({
            "type": "meal",
            "category": "Diet & Nutrition",
            "date": r["date"],
            "created_at": r["created_at"],
            "title": f"Logged {r['meal_type'].title()}: {r['food_name']}",
            "summary": f"{r['portion_name']} (~{r['logged_calories']} kcal)",
            "calories": r["logged_calories"],
            "badge": "food",
            "icon": "utensils"
        })

    # 2. Workouts
    cursor.execute("""
    SELECT date, routine_name, duration_minutes, total_volume_kg, created_at
    FROM user_workout_logs
    WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 20
    """, (user["id"],))
    for r in cursor.fetchall():
        timeline.append({
            "type": "workout",
            "category": "Fitness Training",
            "date": r["date"],
            "created_at": r["created_at"],
            "title": f"Workout: {r['routine_name']}",
            "summary": f"{r['duration_minutes']} minutes active (Volume: {r['total_volume_kg']:,.0f} kg)",
            "volume_kg": r["total_volume_kg"],
            "badge": "workout",
            "icon": "dumbbell"
        })

    # 3. Steps
    cursor.execute("""
    SELECT date, steps_count, distance_km, calories_burned, created_at
    FROM daily_step_logs
    WHERE user_id = ?
    ORDER BY date DESC LIMIT 14
    """, (user["id"],))
    for r in cursor.fetchall():
        timeline.append({
            "type": "steps",
            "category": "Daily Activity",
            "date": r["date"],
            "created_at": r["created_at"] or f"{r['date']}T20:00:00",
            "title": f"Daily Step Goal: {r['steps_count']:,} steps",
            "summary": f"{r['distance_km']} km covered ({r['calories_burned']} kcal burned)",
            "steps": r["steps_count"],
            "badge": "wellness",
            "icon": "footprints"
        })

    # 4. Sleep
    cursor.execute("""
    SELECT date, bedtime, wake_time, duration_minutes, quality_rating, created_at
    FROM sleep_logs
    WHERE user_id = ?
    ORDER BY date DESC LIMIT 14
    """, (user["id"],))
    for r in cursor.fetchall():
        h = r["duration_minutes"] // 60
        m = r["duration_minutes"] % 60
        timeline.append({
            "type": "sleep",
            "category": "Rest & Recovery",
            "date": r["date"],
            "created_at": r["created_at"] or f"{r['date']}T07:00:00",
            "title": f"Sleep Session: {h}h {m}m",
            "summary": f"Bedtime {r['bedtime']} to {r['wake_time']} (Quality rating: {r['quality_rating']}/5)",
            "duration_minutes": r["duration_minutes"],
            "badge": "wellness",
            "icon": "moon"
        })

    # 5. Weight Logs
    cursor.execute("""
    SELECT date, weight_kg, notes, created_at
    FROM weight_logs
    WHERE user_id = ?
    ORDER BY date DESC LIMIT 15
    """, (user["id"],))
    for r in cursor.fetchall():
        timeline.append({
            "type": "weight",
            "category": "Body Progress",
            "date": r["date"],
            "created_at": r["created_at"] or f"{r['date']}T08:00:00",
            "title": f"Weigh-In: {r['weight_kg']} kg",
            "summary": f"Morning scale reading ({r['notes'] or 'Standard weigh-in'})",
            "weight_kg": r["weight_kg"],
            "badge": "progress",
            "icon": "scale"
        })

    conn.close()

    # Sort descending by date/created_at
    timeline.sort(key=lambda x: x.get("created_at") or x["date"], reverse=True)
    return {"total_events": len(timeline), "timeline": timeline[:limit]}


@app.post("/api/meals/copy-to-today")
def copy_meal_to_today(req: CopyMealToTodayRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Copy meals from a past date directly into today's diary."""
    today_str = date.today().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT m.meal_type, mi.food_id, mi.food_name, mi.portion_name, mi.gram_weight, mi.cooking_oil_type
    FROM meals m
    JOIN meal_items mi ON m.id = mi.meal_id
    WHERE m.user_id = ? AND m.date = ?
    """
    params = [user["id"], req.source_date]
    if req.meal_type:
        query += " AND m.meal_type = ?"
        params.append(req.meal_type)

    cursor.execute(query, params)
    items = cursor.fetchall()
    conn.close()

    if not items:
        raise HTTPException(status_code=404, detail="No meal items found for source date")

    copied_count = 0
    for itm in items:
        log_req = LogItemRequest(
            date=today_str,
            meal_type=itm["meal_type"],
            food_id=itm["food_id"],
            food_name=itm["food_name"],
            portion_name=itm["portion_name"],
            gram_weight=itm["gram_weight"],
            cooking_oil_type=itm["cooking_oil_type"] or "none"
        )
        log_meal_item(log_req, user)
        copied_count += 1

    return {"status": "success", "copied_count": copied_count, "target_date": today_str}


# ==========================================
# 23. SPA STATIC FILE ROUTING
# ==========================================

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    """Serve SPA index.html for all frontend routes."""
    # Check if a static file is requested
    potential_file = os.path.join(STATIC_DIR, full_path)
    if full_path and os.path.isfile(potential_file):
        return FileResponse(potential_file)

    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "CALORA API Running. Frontend static files pending."}
