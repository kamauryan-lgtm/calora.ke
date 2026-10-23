"""
CALORA - Relational Database Architecture (SQLite)
Implements all core tables specified in the Master Architecture:
users, user_profiles, food_items, food_portions, food_sources,
recipes, recipe_ingredients, meals, meal_items, daily_logs,
weight_logs, saved_meals, custom_foods, food_reports, audit_logs.
"""

import sqlite3
import os
import json
import hashlib
import secrets
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "calora.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_password(password: str) -> str:
    """PBKDF2 HMAC SHA-256 secure hash with random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


def verify_password(stored_password_hash: str, provided_password: str) -> bool:
    try:
        salt, key_hex = stored_password_hash.split("$")
        key = hashlib.pbkdf2_hmac("sha256", provided_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac_compare(key.hex(), key_hex)
    except Exception:
        return False


def hmac_compare(a: str, b: str) -> bool:
    import hmac
    return hmac.compare_digest(a, b)


def init_database():
    """Create all required relational tables and indexes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL,
        last_login TEXT
    )
    """)

    # 2. User Profiles
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        age INTEGER NOT NULL,
        sex TEXT NOT NULL,
        height_cm REAL NOT NULL,
        current_weight_kg REAL NOT NULL,
        goal_weight_kg REAL NOT NULL,
        activity_level TEXT NOT NULL,
        primary_goal TEXT NOT NULL,
        deficit_tier TEXT NOT NULL DEFAULT 'moderate',
        measurement_system TEXT NOT NULL DEFAULT 'metric',
        dietary_preferences TEXT,
        allergies TEXT,
        bmr REAL NOT NULL,
        tdee REAL NOT NULL,
        target_calories INTEGER NOT NULL,
        protein_target_g INTEGER NOT NULL,
        carbs_target_g INTEGER NOT NULL,
        fat_target_g INTEGER NOT NULL,
        fibre_target_g INTEGER NOT NULL,
        safety_flag INTEGER DEFAULT 0,
        safety_message TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 3. Food Sources
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        authority TEXT NOT NULL,
        citation TEXT NOT NULL,
        verification_date TEXT NOT NULL,
        quality_score TEXT NOT NULL
    )
    """)

    # 4. Food Items
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        common_names TEXT,
        category TEXT NOT NULL,
        cuisine TEXT NOT NULL,
        country TEXT NOT NULL,
        calories_per_100g REAL NOT NULL,
        protein_per_100g REAL NOT NULL,
        carbs_per_100g REAL NOT NULL,
        fat_per_100g REAL NOT NULL,
        fibre_per_100g REAL NOT NULL,
        sugar_per_100g REAL DEFAULT 0,
        sodium_mg_per_100g REAL DEFAULT 0,
        default_prep_method TEXT NOT NULL DEFAULT 'boiled',
        source TEXT NOT NULL,
        source_date TEXT NOT NULL,
        data_quality TEXT NOT NULL DEFAULT 'High',
        confidence_level TEXT NOT NULL DEFAULT 'HIGH',
        data_origin TEXT NOT NULL DEFAULT 'verified',
        barcode TEXT,
        notes TEXT,
        is_verified INTEGER DEFAULT 1,
        created_by TEXT,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_food_name ON food_items (name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_food_barcode ON food_items (barcode)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_food_category ON food_items (category)")

    # 5. Food Portions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_portions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_id TEXT NOT NULL,
        name TEXT NOT NULL,
        gram_weight REAL NOT NULL,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        FOREIGN KEY (food_id) REFERENCES food_items (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_portion_food ON food_portions (food_id)")

    # 6. Meals (Diary headers per day & meal type)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals (user_id, date)")

    # 7. Meal Items (Individual food items within a meal log)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meal_items (
        id TEXT PRIMARY KEY,
        meal_id TEXT NOT NULL,
        food_id TEXT,
        food_name TEXT NOT NULL,
        portion_name TEXT NOT NULL,
        gram_weight REAL NOT NULL,
        cooking_oil_type TEXT NOT NULL DEFAULT 'none',
        prep_method TEXT NOT NULL DEFAULT 'boiled',
        logged_calories INTEGER NOT NULL,
        range_low INTEGER NOT NULL,
        range_high INTEGER NOT NULL,
        confidence_level TEXT NOT NULL,
        main_uncertainties TEXT NOT NULL, -- JSON array
        protein_g REAL NOT NULL,
        carbs_g REAL NOT NULL,
        fat_g REAL NOT NULL,
        fibre_g REAL NOT NULL,
        data_origin TEXT NOT NULL DEFAULT 'verified',
        source_citation TEXT NOT NULL,
        breakdown_json TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (meal_id) REFERENCES meals (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON meal_items (meal_id)")

    # 8. Weight Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weight_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_logs (user_id, date)")

    # 9. Recipes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        servings INTEGER NOT NULL DEFAULT 4,
        total_calories INTEGER NOT NULL,
        total_protein_g REAL NOT NULL,
        total_carbs_g REAL NOT NULL,
        total_fat_g REAL NOT NULL,
        total_fibre_g REAL NOT NULL,
        per_serving_calories INTEGER NOT NULL,
        per_serving_protein_g REAL NOT NULL,
        per_serving_carbs_g REAL NOT NULL,
        per_serving_fat_g REAL NOT NULL,
        per_serving_fibre_g REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 10. Recipe Ingredients
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        food_id TEXT,
        ingredient_name TEXT NOT NULL,
        gram_weight REAL NOT NULL,
        oil_type TEXT DEFAULT 'none',
        calories INTEGER NOT NULL,
        protein_g REAL NOT NULL,
        carbs_g REAL NOT NULL,
        fat_g REAL NOT NULL,
        fibre_g REAL NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
    )
    """)

    # 11. Saved Meals (Quick combo templates)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS saved_meals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        items_json TEXT NOT NULL,
        estimated_calories INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 12. Food Reports (User error reports: "This calorie value looks wrong")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        food_id TEXT NOT NULL,
        food_name TEXT NOT NULL,
        issue_type TEXT NOT NULL, -- wrong_portion, wrong_food, wrong_prep, wrong_nutrition, duplicate, other
        user_notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending', -- pending, investigated, resolved, rejected
        admin_response TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 13. Audit Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        admin_user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_entity TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 14. Gyms
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gyms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        contact_phone TEXT,
        contact_email TEXT,
        tier TEXT DEFAULT 'standard',
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL
    )
    """)

    # 15. Gym Members
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gym_members (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        membership_number TEXT,
        status TEXT DEFAULT 'active',
        joined_at TEXT NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gym_members_gym ON gym_members (gym_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gym_members_user ON gym_members (user_id)")

    # 16. Coaches
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coaches (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        specialization TEXT NOT NULL,
        bio TEXT,
        certifications TEXT,
        phone TEXT,
        max_clients INTEGER DEFAULT 25,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 17. Gym Coach Assignments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gym_coach_assignments (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        coach_id TEXT NOT NULL,
        role TEXT DEFAULT 'head_coach',
        assigned_at TEXT NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE,
        FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gca_gym ON gym_coach_assignments (gym_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gca_coach ON gym_coach_assignments (coach_id)")

    # 18. Coach Client Assignments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coach_client_assignments (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        gym_id TEXT,
        status TEXT DEFAULT 'active',
        assigned_by TEXT NOT NULL DEFAULT 'admin',
        share_food_logs INTEGER DEFAULT 1,
        share_workouts INTEGER DEFAULT 1,
        share_wellness INTEGER DEFAULT 1,
        notes TEXT,
        assigned_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE SET NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cca_coach ON coach_client_assignments (coach_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cca_client ON coach_client_assignments (client_id)")

    # 19. Coach Notes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coach_notes (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        note_type TEXT DEFAULT 'general',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cn_client ON coach_notes (client_id)")

    # 20. Coach Check-ins
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coach_check_ins (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled',
        feedback TEXT,
        compliance_score INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 21. Coach Follow-up Tasks
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coach_follow_up_tasks (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        is_completed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 22. Exercises
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        secondary_muscles TEXT,
        equipment TEXT NOT NULL,
        difficulty TEXT NOT NULL DEFAULT 'Beginner',
        movement_pattern TEXT NOT NULL,
        form_cues TEXT NOT NULL,
        safety_tips TEXT NOT NULL,
        kenyan_context TEXT,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ex_muscle ON exercises (muscle_group)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ex_equip ON exercises (equipment)")

    # 23. Workout Plans
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workout_plans (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        goal TEXT NOT NULL,
        level TEXT NOT NULL,
        days_per_week INTEGER NOT NULL DEFAULT 3,
        estimated_duration_min INTEGER NOT NULL DEFAULT 45,
        equipment_needed TEXT NOT NULL,
        schedule_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # 24. User Workout Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_workout_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        routine_name TEXT NOT NULL,
        plan_id TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 45,
        total_volume_kg REAL NOT NULL DEFAULT 0,
        exercises_json TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_uwl_user_date ON user_workout_logs (user_id, date)")

    # 25. Daily Step Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_step_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        steps_count INTEGER NOT NULL,
        distance_km REAL NOT NULL,
        active_minutes INTEGER NOT NULL DEFAULT 30,
        goal_steps INTEGER NOT NULL DEFAULT 10000,
        calories_burned INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_steps_user_date ON daily_step_logs (user_id, date)")

    # 26. Sleep Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sleep_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        bedtime TEXT NOT NULL,
        wake_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        quality_rating INTEGER NOT NULL,
        goal_minutes INTEGER NOT NULL DEFAULT 480,
        notes TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_logs (user_id, date)")

    # 27. Subscription Plans
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_kes INTEGER NOT NULL,
        billing_cycle TEXT NOT NULL DEFAULT 'monthly',
        max_members INTEGER NOT NULL,
        features_json TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 28. Gym Subscriptions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gym_subscriptions (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active', -- trialing, active, past_due, canceled, grace_period
        current_period_start TEXT NOT NULL,
        current_period_end TEXT NOT NULL,
        trial_end TEXT,
        cancel_at_period_end INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gym_sub_gym ON gym_subscriptions (gym_id)")

    # 29. Gym Branding & Workspace
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gym_branding (
        gym_id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        logo_url TEXT,
        primary_color TEXT DEFAULT '#10b981',
        secondary_color TEXT DEFAULT '#0f172a',
        banner_url TEXT,
        tagline TEXT,
        welcome_message TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE
    )
    """)

    # 30. Gym Invites
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gym_invites (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member', -- member, coach, staff, owner
        invite_code TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, revoked, expired
        created_at TEXT NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gym_inv_code ON gym_invites (invite_code)")

    # 31. Gym Packages
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gym_packages (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price_kes INTEGER NOT NULL,
        duration_days INTEGER NOT NULL DEFAULT 30,
        is_available INTEGER DEFAULT 1,
        eligibility TEXT DEFAULT 'all_members',
        terms TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gym_pkg_gym ON gym_packages (gym_id)")

    # 32. Gym Orders
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gym_orders (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        package_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        amount_kes INTEGER NOT NULL,
        currency TEXT DEFAULT 'KES',
        status TEXT NOT NULL DEFAULT 'completed', -- pending, completed, failed, refunded
        payment_method TEXT DEFAULT 'mpesa',
        payment_ref TEXT,
        idempotency_key TEXT UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE,
        FOREIGN KEY (package_id) REFERENCES gym_packages (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gym_ord_gym ON gym_orders (gym_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gym_ord_user ON gym_orders (user_id)")

    # 33. Payment Transactions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        reference TEXT UNIQUE NOT NULL,
        provider TEXT NOT NULL DEFAULT 'mpesa_daraja',
        transaction_type TEXT NOT NULL, -- gym_subscription, package_order, plus_subscription
        entity_id TEXT NOT NULL,
        user_id TEXT,
        amount_kes INTEGER NOT NULL,
        phone_number TEXT,
        status TEXT NOT NULL DEFAULT 'successful', -- pending, successful, failed, refunded, reversed
        provider_metadata_json TEXT,
        idempotency_key TEXT UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_ref ON payment_transactions (reference)")

    # 34. Revenue Ledger
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS revenue_ledger (
        id TEXT PRIMARY KEY,
        entry_type TEXT NOT NULL, -- gym_subscription, package_sale, platform_commission, gym_payout, refund
        gym_id TEXT,
        amount_kes INTEGER NOT NULL,
        platform_share_kes INTEGER NOT NULL DEFAULT 0,
        gym_share_kes INTEGER NOT NULL DEFAULT 0,
        order_id TEXT,
        transaction_id TEXT,
        status TEXT DEFAULT 'settled', -- settled, pending_settlement, reversed
        description TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rev_gym ON revenue_ledger (gym_id)")

    # 35. Gym Settlements
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gym_settlements (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        total_sales_kes INTEGER NOT NULL,
        platform_commission_kes INTEGER NOT NULL DEFAULT 0,
        payout_amount_kes INTEGER NOT NULL,
        status TEXT DEFAULT 'approved', -- pending, approved, paid
        payout_reference TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE
    )
    """)

    # 36. Billing Invoices
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS billing_invoices (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        invoice_number TEXT UNIQUE NOT NULL,
        plan_id TEXT NOT NULL,
        amount_kes INTEGER NOT NULL,
        status TEXT DEFAULT 'paid', -- paid, open, void
        due_date TEXT NOT NULL,
        paid_at TEXT,
        invoice_pdf_url TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE
    )
    """)

    # 37. Member Consent Settings
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS member_consent_settings (
        user_id TEXT NOT NULL,
        gym_id TEXT NOT NULL,
        share_nutrition_summary INTEGER DEFAULT 1,
        share_weight_trend INTEGER DEFAULT 1,
        share_detailed_food_logs INTEGER DEFAULT 0,
        share_workouts INTEGER DEFAULT 1,
        receive_weekly_email INTEGER DEFAULT 1,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, gym_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (gym_id) REFERENCES gyms (id) ON DELETE CASCADE
    )
    """)

    # Safe column migrations for gyms table
    try:
        cursor.execute("ALTER TABLE gyms ADD COLUMN slug TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE gyms ADD COLUMN owner_id TEXT")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()


def seed_database_defaults():
    """Populate default sources, foods, portions, and demo users if empty."""
    from app.seed_data import FOOD_SOURCES, SEED_FOODS, DEFAULT_SAVED_MEALS
    from app.calculations import calculate_bmr_mifflin_st_jeor, calculate_tdee, calculate_calorie_target

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Check sources
    cursor.execute("SELECT COUNT(*) FROM food_sources")
    if cursor.fetchone()[0] == 0:
        for s in FOOD_SOURCES:
            cursor.execute(
                "INSERT INTO food_sources (id, name, authority, citation, verification_date, quality_score) VALUES (?, ?, ?, ?, ?, ?)",
                (s["id"], s["name"], s["authority"], s["citation"], s["verification_date"], s["quality_score"])
            )

    # 2. Check foods
    cursor.execute("SELECT COUNT(*) FROM food_items")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        for f in SEED_FOODS:
            cursor.execute("""
            INSERT INTO food_items (
                id, name, common_names, category, cuisine, country,
                calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
                fibre_per_100g, sugar_per_100g, sodium_mg_per_100g, default_prep_method,
                source, source_date, data_quality, confidence_level, data_origin,
                barcode, notes, is_verified, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (
                f["id"], f["name"], f.get("common_names", ""), f["category"], f["cuisine"], f["country"],
                f["calories_per_100g"], f["protein_per_100g"], f["carbs_per_100g"], f["fat_per_100g"],
                f["fibre_per_100g"], f.get("sugar_per_100g", 0.0), f.get("sodium_mg_per_100g", 0.0),
                f["default_prep_method"], f["source"], f["source_date"], f["data_quality"],
                f["confidence_level"], f["data_origin"], f.get("barcode"), f.get("notes", ""), now_str
            ))

            for p in f.get("portions", []):
                cursor.execute("""
                INSERT INTO food_portions (food_id, name, gram_weight, description, is_default)
                VALUES (?, ?, ?, ?, ?)
                """, (f["id"], p["name"], p["gram_weight"], p.get("description", ""), 1 if p.get("is_default") else 0))

    # 3. Seed Demo Users
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        now = datetime.now()
        now_str = now.isoformat()

        # Admin user
        admin_id = "user_admin_001"
        admin_pass = hash_password("admin123")
        cursor.execute("""
        INSERT INTO users (id, email, name, password_hash, role, created_at)
        VALUES (?, 'admin@calora.app', 'Calora System Admin', ?, 'admin', ?)
        """, (admin_id, admin_pass, now_str))

        # Ryan demo user (matches section 49 prompt walkthrough)
        ryan_id = "user_ryan_001"
        ryan_pass = hash_password("calora123")
        cursor.execute("""
        INSERT INTO users (id, email, name, password_hash, role, created_at)
        VALUES (?, 'ryan@calora.app', 'Ryan', ?, 'user', ?)
        """, (ryan_id, ryan_pass, now_str))

        # Ryan's Profile: 20 yrs old, male, 80kg, 175cm, moderately active, lose weight (moderate deficit)
        bmr_res = calculate_bmr_mifflin_st_jeor(80.0, 175.0, 20, "male")
        tdee_res = calculate_tdee(bmr_res["bmr"], "moderately_active")
        # Target for moderate deficit:
        target_res = calculate_calorie_target(bmr_res["bmr"], tdee_res["tdee"], "male", 80.0, "lose", "moderate")

        cursor.execute("""
        INSERT INTO user_profiles (
            user_id, age, sex, height_cm, current_weight_kg, goal_weight_kg,
            activity_level, primary_goal, deficit_tier, measurement_system,
            bmr, tdee, target_calories, protein_target_g, carbs_target_g,
            fat_target_g, fibre_target_g, safety_flag, safety_message, updated_at
        ) VALUES (?, 20, 'male', 175.0, 80.0, 72.0, 'moderately_active', 'lose', 'moderate', 'metric',
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ryan_id, bmr_res["bmr"], tdee_res["tdee"], target_res["target_calories"],
            target_res["macros"]["protein_g"], target_res["macros"]["carbs_g"],
            target_res["macros"]["fat_g"], target_res["macros"]["fibre_g"],
            1 if target_res["safety_flag"] else 0, target_res.get("safety_message"), now_str
        ))

        # Seed saved meal templates for Ryan
        for sm in DEFAULT_SAVED_MEALS:
            cursor.execute("""
            INSERT INTO saved_meals (id, user_id, name, description, items_json, estimated_calories, created_at)
            VALUES (?, ?, ?, ?, ?, 650, ?)
            """, (f"sm_{secrets.token_hex(4)}", ryan_id, sm["name"], sm["description"], json.dumps(sm["items"]), now_str))

        # Seed historical weight logs (14 days of realistic gradual progress with minor daily water fluctuations)
        # Starting 14 days ago at 82.4 kg, smoothing down to 80.0 kg today
        base_date = (now - timedelta(days=14)).date()
        weight_schedule = [
            (0, 82.4), (1, 82.2), (2, 82.5), (3, 82.0), (4, 81.8),
            (5, 81.9), (6, 81.5), (7, 81.3), (8, 81.4), (9, 81.0),
            (10, 80.8), (11, 80.9), (12, 80.5), (13, 80.2), (14, 80.0)
        ]
        for day_offset, wt in weight_schedule:
            d_str = (base_date + timedelta(days=day_offset)).isoformat()
            cursor.execute("""
            INSERT INTO weight_logs (id, user_id, date, weight_kg, notes, created_at)
            VALUES (?, ?, ?, ?, 'Morning weigh-in after waking', ?)
            """, (f"wt_{d_str}", ryan_id, d_str, wt, now_str))

        # Seed realistic meal logs for today (Breakfast already logged: 2 boiled eggs + 1 Nduma + Kenyan tea = ~349 kcal)
        today_str = date.today().isoformat()
        meal_id_b = f"meal_{ryan_id}_{today_str}_breakfast"
        cursor.execute("""
        INSERT INTO meals (id, user_id, date, meal_type, created_at)
        VALUES (?, ?, ?, 'breakfast', ?)
        """, (meal_id_b, ryan_id, today_str, now_str))

        cursor.execute("""
        INSERT INTO meal_items (
            id, meal_id, food_id, food_name, portion_name, gram_weight,
            cooking_oil_type, prep_method, logged_calories, range_low, range_high,
            confidence_level, main_uncertainties, protein_g, carbs_g, fat_g, fibre_g,
            data_origin, source_citation, breakdown_json, notes, created_at
        ) VALUES (
            'item_demo_1', ?, 'food_egg_boiled', 'Chicken Egg (Boiled)', '2 Large Eggs', 100.0,
            'none', 'boiled', 143, 136, 150,
            'HIGH', '["Minimal (standard eggs)"]', 12.6, 0.7, 9.5, 0.0,
            'verified', 'USDA FoodData Central (#171287)', '[]', 'Breakfast hard boiled', ?
        )
        """, (meal_id_b, now_str))

        cursor.execute("""
        INSERT INTO meal_items (
            id, meal_id, food_id, food_name, portion_name, gram_weight,
            cooking_oil_type, prep_method, logged_calories, range_low, range_high,
            confidence_level, main_uncertainties, protein_g, carbs_g, fat_g, fibre_g,
            data_origin, source_citation, breakdown_json, notes, created_at
        ) VALUES (
            'item_demo_2', ?, 'food_nduma', 'Nduma (Steamed Arrowroots)', '1 Medium piece', 140.0,
            'none', 'steamed', 157, 145, 170,
            'HIGH', '["Minimal (steamed root)"]', 2.1, 37.1, 0.3, 5.7,
            'verified', 'Kenya Food Composition Tables (KFCT), 2018', '[]', 'Steamed morning nduma', ?
        )
        """, (meal_id_b, now_str))

        # Seed sample food report for admin review
        cursor.execute("""
        INSERT INTO food_reports (
            id, user_id, food_id, food_name, issue_type, user_notes, status, created_at
        ) VALUES (
            'report_sample_1', ?, 'food_chapati_ke', 'Kenyan Chapati', 'wrong_portion',
            'In some local restaurants, chapatis are made extra thick (over 120g). Could we add an "Extra Large / Hotel" portion option?',
            'pending', ?
        )
        """, (ryan_id, now_str))

    # 4. Seed Exercises & Workout Plans
    from app.workout_coach_seed import SEED_EXERCISES, SEED_WORKOUT_PLANS, SEED_GYMS, SEED_COACHES
    cursor.execute("SELECT COUNT(*) FROM exercises")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        for ex in SEED_EXERCISES:
            cursor.execute("""
            INSERT INTO exercises (
                id, name, muscle_group, secondary_muscles, equipment,
                difficulty, movement_pattern, form_cues, safety_tips, kenyan_context, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ex["id"], ex["name"], ex["muscle_group"], ex["secondary_muscles"],
                ex["equipment"], ex["difficulty"], ex["movement_pattern"],
                ex["form_cues"], ex["safety_tips"], ex["kenyan_context"], now_str
            ))

    cursor.execute("SELECT COUNT(*) FROM workout_plans")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        for wp in SEED_WORKOUT_PLANS:
            cursor.execute("""
            INSERT INTO workout_plans (
                id, title, description, goal, level, days_per_week,
                estimated_duration_min, equipment_needed, schedule_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                wp["id"], wp["title"], wp["description"], wp["goal"], wp["level"],
                wp["days_per_week"], wp["estimated_duration_min"], wp["equipment_needed"],
                json.dumps(wp["schedule"]), now_str
            ))

    # 5. Seed Gyms
    cursor.execute("SELECT COUNT(*) FROM gyms")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        for g in SEED_GYMS:
            cursor.execute("""
            INSERT INTO gyms (id, name, location, code, contact_phone, contact_email, tier, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (g["id"], g["name"], g["location"], g["code"], g["contact_phone"], g["contact_email"], g["tier"], g["status"], now_str))

    # 6. Seed Coaches & Accounts
    cursor.execute("SELECT COUNT(*) FROM coaches")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        coach_pwd = hash_password("coach123")
        for c in SEED_COACHES:
            # Check if user account exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (c["email"],))
            row = cursor.fetchone()
            if not row:
                u_id = f"user_{c['id']}"
                cursor.execute("""
                INSERT INTO users (id, email, name, password_hash, role, created_at)
                VALUES (?, ?, ?, ?, 'coach', ?)
                """, (u_id, c["email"], c["name"], coach_pwd, now_str))
            else:
                u_id = row[0]
                cursor.execute("UPDATE users SET role = 'coach' WHERE id = ?", (u_id,))

            cursor.execute("""
            INSERT INTO coaches (id, user_id, specialization, bio, certifications, phone, max_clients, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (c["id"], u_id, c["specialization"], c["bio"], c["certifications"], c["phone"], c["max_clients"], now_str))

            if c.get("gym_id"):
                cursor.execute("""
                INSERT INTO gym_coach_assignments (id, gym_id, coach_id, role, assigned_at)
                VALUES (?, ?, ?, 'head_coach', ?)
                """, (f"gca_{c['id']}", c["gym_id"], c["id"], now_str))

    # 7. Seed Coach-Client Assignment (Coach Brian <-> Ryan)
    cursor.execute("SELECT COUNT(*) FROM coach_client_assignments")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        # Find ryan
        cursor.execute("SELECT id FROM users WHERE email = 'ryan@calora.app'")
        r_user = cursor.fetchone()
        if r_user:
            ryan_id = r_user[0]
            cursor.execute("""
            INSERT INTO coach_client_assignments (
                id, coach_id, client_id, gym_id, status, assigned_by,
                share_food_logs, share_workouts, share_wellness, notes, assigned_at, updated_at
            ) VALUES (
                'cca_demo_001', 'coach_brian_001', ?, 'gym_nairobi_hub', 'active', 'admin',
                1, 1, 1, 'Client focusing on sustainable 500 kcal deficit and home bodyweight progressive overload.', ?, ?
            )
            """, (ryan_id, now_str, now_str))

            # Coach notes
            cursor.execute("""
            INSERT INTO coach_notes (id, coach_id, client_id, note_type, title, content, created_at)
            VALUES (
                'note_1', 'coach_brian_001', ?, 'nutrition', 'Calorie Deficit Adherence',
                'Ryan is doing great hitting his protein target of 130g! Advised him to continue measuring cooking oil in beef stews with a teaspoon.', ?
            )
            """, (ryan_id, now_str))
            cursor.execute("""
            INSERT INTO coach_notes (id, coach_id, client_id, note_type, title, content, created_at)
            VALUES (
                'note_2', 'coach_brian_001', ?, 'workout', 'Pushup Progression',
                'Incline pushups looking very solid. Ready to transition to floor pushups next Monday.', ?
            )
            """, (ryan_id, now_str))

            # Coach check-in
            upcoming_fri = (date.today() + timedelta(days=(4 - date.today().weekday()) % 7)).isoformat()
            cursor.execute("""
            INSERT INTO coach_check_ins (id, coach_id, client_id, scheduled_date, status, feedback, compliance_score, created_at)
            VALUES ('checkin_1', 'coach_brian_001', ?, ?, 'scheduled', 'Weekly bodyweight review and calorie adjustment check-in.', 92, ?)
            """, (ryan_id, upcoming_fri, now_str))

            # Follow up tasks
            cursor.execute("""
            INSERT INTO coach_follow_up_tasks (id, coach_id, client_id, title, due_date, is_completed, created_at)
            VALUES ('task_1', 'coach_brian_001', ?, 'Hit 8,000 steps daily average for 5 consecutive days', ?, 1, ?)
            """, (ryan_id, (date.today() + timedelta(days=2)).isoformat(), now_str))
            cursor.execute("""
            INSERT INTO coach_follow_up_tasks (id, coach_id, client_id, title, due_date, is_completed, created_at)
            VALUES ('task_2', 'coach_brian_001', ?, 'Log 3 full-body home workout sessions this week', ?, 0, ?)
            """, (ryan_id, (date.today() + timedelta(days=5)).isoformat(), now_str))

    # 8. Seed Step Logs for Ryan (7 days)
    cursor.execute("SELECT COUNT(*) FROM daily_step_logs")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM users WHERE email = 'ryan@calora.app'")
        r_user = cursor.fetchone()
        if r_user:
            ryan_id = r_user[0]
            now = datetime.now()
            now_str = now.isoformat()
            today = date.today()
            step_schedule = [
                (6, 8450, 6.2, 42, 310),
                (5, 9200, 6.8, 48, 340),
                (4, 7800, 5.7, 38, 290),
                (3, 10540, 7.8, 55, 395),
                (2, 8900, 6.5, 45, 330),
                (1, 11200, 8.3, 60, 420),
                (0, 8650, 6.4, 44, 325)
            ]
            for days_ago, steps, dist, act_min, cals in step_schedule:
                d_str = (today - timedelta(days=days_ago)).isoformat()
                cursor.execute("""
                INSERT INTO daily_step_logs (id, user_id, date, steps_count, distance_km, active_minutes, goal_steps, calories_burned, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 10000, ?, 'Brisk walking around Nairobi CBD & Arboretum', ?)
                """, (f"step_{ryan_id}_{d_str}", ryan_id, d_str, steps, dist, act_min, cals, now_str))

    # 9. Seed Sleep Logs for Ryan (7 days)
    cursor.execute("SELECT COUNT(*) FROM sleep_logs")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM users WHERE email = 'ryan@calora.app'")
        r_user = cursor.fetchone()
        if r_user:
            ryan_id = r_user[0]
            now_str = datetime.now().isoformat()
            today = date.today()
            sleep_schedule = [
                (6, "23:00", "06:45", 465, 4),
                (5, "22:45", "06:30", 465, 5),
                (4, "23:15", "07:00", 465, 4),
                (3, "22:30", "06:30", 480, 5),
                (2, "23:30", "06:45", 435, 3),
                (1, "22:45", "06:45", 480, 5),
                (0, "22:30", "06:30", 480, 5)
            ]
            for days_ago, bedtime, wake_time, dur_min, rating in sleep_schedule:
                d_str = (today - timedelta(days=days_ago)).isoformat()
                cursor.execute("""
                INSERT INTO sleep_logs (id, user_id, date, bedtime, wake_time, duration_minutes, quality_rating, goal_minutes, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 480, 'Restful sleep, consistent bedtime', ?)
                """, (f"sleep_{ryan_id}_{d_str}", ryan_id, d_str, bedtime, wake_time, dur_min, rating, now_str))

    # 10. Seed User Workout Logs for Ryan
    cursor.execute("SELECT COUNT(*) FROM user_workout_logs")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM users WHERE email = 'ryan@calora.app'")
        r_user = cursor.fetchone()
        if r_user:
            ryan_id = r_user[0]
            now_str = datetime.now().isoformat()
            today = date.today()
            # Workout 2 days ago
            w1_date = (today - timedelta(days=2)).isoformat()
            w1_exercises = [
                {"name": "Air Squats", "sets": [{"reps": 15, "weight_kg": 0, "rpe": 7}, {"reps": 15, "weight_kg": 0, "rpe": 8}, {"reps": 15, "weight_kg": 0, "rpe": 8}]},
                {"name": "Incline Pushups (Couch/Chair)", "sets": [{"reps": 12, "weight_kg": 0, "rpe": 7}, {"reps": 10, "weight_kg": 0, "rpe": 8}, {"reps": 10, "weight_kg": 0, "rpe": 9}]},
                {"name": "Jerrycan Bent Rows", "sets": [{"reps": 12, "weight_kg": 5, "rpe": 7}, {"reps": 12, "weight_kg": 5, "rpe": 8}, {"reps": 12, "weight_kg": 5, "rpe": 8}]},
                {"name": "Forearm Plank", "sets": [{"reps": 40, "weight_kg": 0, "rpe": 8}, {"reps": 35, "weight_kg": 0, "rpe": 9}]}
            ]
            cursor.execute("""
            INSERT INTO user_workout_logs (id, user_id, date, routine_name, plan_id, duration_minutes, total_volume_kg, exercises_json, notes, created_at)
            VALUES (?, ?, ?, 'Full Body Strength & Core', 'plan_kenyan_home_starter', 38, 180.0, ?, 'Great energy, finished with 5-minute stretch.', ?)
            """, (f"uwl_{ryan_id}_{w1_date}", ryan_id, w1_date, json.dumps(w1_exercises), now_str))

    # 11. Seed Subscription Plans (Starter: KES 2,500, Growth: KES 5,000, Pro: KES 10,000)
    cursor.execute("SELECT COUNT(*) FROM subscription_plans")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        plans = [
            ("plan_starter", "Starter", 2500, "monthly", 50, json.dumps(["branded_workspace", "coach_roster", "consent_reports", "package_store", "weekly_emails"]), 1, now_str, now_str),
            ("plan_growth", "Growth", 5000, "monthly", 200, json.dumps(["branded_workspace", "coach_roster", "consent_reports", "package_store", "weekly_emails", "custom_packages", "csv_export"]), 1, now_str, now_str),
            ("plan_pro", "Pro", 10000, "monthly", 500, json.dumps(["branded_workspace", "coach_roster", "consent_reports", "package_store", "weekly_emails", "custom_packages", "csv_export", "multi_branch", "priority_support"]), 1, now_str, now_str)
        ]
        for p in plans:
            cursor.execute("""
            INSERT INTO subscription_plans (id, name, price_kes, billing_cycle, max_members, features_json, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, p)

    # 12. Seed Gym Owner Account
    cursor.execute("SELECT id FROM users WHERE email = 'gym.owner@nairobihub.co.ke'")
    owner_row = cursor.fetchone()
    now_str = datetime.now().isoformat()
    if not owner_row:
        owner_id = "user_gym_owner_001"
        owner_pwd = hash_password("owner123")
        cursor.execute("""
        INSERT INTO users (id, email, name, password_hash, role, created_at)
        VALUES (?, 'gym.owner@nairobihub.co.ke', 'Kimani Waitathu (Nairobi Hub Owner)', ?, 'gym_owner', ?)
        """, (owner_id, owner_pwd, now_str))
    else:
        owner_id = owner_row[0]

    # Update gyms with owner and slug
    cursor.execute("UPDATE gyms SET slug = 'nairobi-hub', owner_id = ? WHERE id = 'gym_nairobi_hub'", (owner_id,))
    cursor.execute("UPDATE gyms SET slug = 'kilimani-power' WHERE id = 'gym_kilimani_power'")
    cursor.execute("UPDATE gyms SET slug = 'mombasa-coastal' WHERE id = 'gym_mombasa_coastal'")

    # 13. Seed Gym Subscriptions
    cursor.execute("SELECT COUNT(*) FROM gym_subscriptions")
    if cursor.fetchone()[0] == 0:
        now = datetime.now()
        now_str = now.isoformat()
        end_30d = (now + timedelta(days=30)).isoformat()
        end_14d = (now + timedelta(days=14)).isoformat()

        cursor.execute("""
        INSERT INTO gym_subscriptions (id, gym_id, plan_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at, updated_at)
        VALUES ('gsub_001', 'gym_nairobi_hub', 'plan_growth', 'active', ?, ?, NULL, 0, ?, ?)
        """, (now_str, end_30d, now_str, now_str))

        cursor.execute("""
        INSERT INTO gym_subscriptions (id, gym_id, plan_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at, updated_at)
        VALUES ('gsub_002', 'gym_kilimani_power', 'plan_starter', 'active', ?, ?, NULL, 0, ?, ?)
        """, (now_str, end_30d, now_str, now_str))

        cursor.execute("""
        INSERT INTO gym_subscriptions (id, gym_id, plan_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at, updated_at)
        VALUES ('gsub_003', 'gym_mombasa_coastal', 'plan_starter', 'trialing', ?, ?, ?, 0, ?, ?)
        """, (now_str, end_14d, end_14d, now_str, now_str))

    # 14. Seed Gym Branding
    cursor.execute("SELECT COUNT(*) FROM gym_branding")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO gym_branding (gym_id, slug, logo_url, primary_color, secondary_color, banner_url, tagline, welcome_message, updated_at)
        VALUES ('gym_nairobi_hub', 'nairobi-hub', '/static/favicon.svg', '#10b981', '#064e3b', '', 'Westlands Premier Functional & Strength Hub', 'Welcome to the Nairobi Fitness Hub Calora Community! Track your nutrition accurately and achieve your target weight sustainably.', ?)
        """, (now_str,))
        cursor.execute("""
        INSERT INTO gym_branding (gym_id, slug, logo_url, primary_color, secondary_color, banner_url, tagline, welcome_message, updated_at)
        VALUES ('gym_kilimani_power', 'kilimani-power', '/static/favicon.svg', '#3b82f6', '#1e3a8a', '', 'Powerlifting & Conditioning Center', 'Welcome Kilimani athletes! Clean calories fuel strong lifts.', ?)
        """, (now_str,))

    # 15. Seed Additional Gym Members & Consent
    cursor.execute("SELECT id FROM users WHERE email = 'ryan@calora.app'")
    r_user = cursor.fetchone()
    if r_user:
        ryan_id = r_user[0]
        # Link Ryan to Nairobi Fitness Hub
        cursor.execute("SELECT id FROM gym_members WHERE gym_id = 'gym_nairobi_hub' AND user_id = ?", (ryan_id,))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO gym_members (id, gym_id, user_id, membership_number, status, joined_at)
            VALUES ('gm_ryan_001', 'gym_nairobi_hub', ?, 'NFH-2024-88', 'active', ?)
            """, (ryan_id, now_str))

        # Ryan consent
        cursor.execute("""
        INSERT OR REPLACE INTO member_consent_settings (user_id, gym_id, share_nutrition_summary, share_weight_trend, share_detailed_food_logs, share_workouts, receive_weekly_email, updated_at)
        VALUES (?, 'gym_nairobi_hub', 1, 1, 1, 1, 1, ?)
        """, (ryan_id, now_str))

    # Seed demo member Sarah Wanjiku
    cursor.execute("SELECT id FROM users WHERE email = 'sarah@calora.app'")
    sarah_row = cursor.fetchone()
    if not sarah_row:
        sarah_id = "user_sarah_002"
        cursor.execute("""
        INSERT INTO users (id, email, name, password_hash, role, created_at)
        VALUES (?, 'sarah@calora.app', 'Sarah Wanjiku', ?, 'user', ?)
        """, (sarah_id, hash_password("calora123"), now_str))
        cursor.execute("""
        INSERT INTO user_profiles (
            user_id, age, sex, height_cm, current_weight_kg, goal_weight_kg,
            activity_level, primary_goal, deficit_tier, measurement_system,
            bmr, tdee, target_calories, protein_target_g, carbs_target_g,
            fat_target_g, fibre_target_g, updated_at
        ) VALUES (?, 28, 'female', 165.0, 68.0, 60.0, 'lightly_active', 'lose', 'moderate', 'metric',
                  1420.0, 1952.0, 1550, 115, 175, 45, 28, ?)
        """, (sarah_id, now_str))
        cursor.execute("""
        INSERT INTO gym_members (id, gym_id, user_id, membership_number, status, joined_at)
        VALUES ('gm_sarah_002', 'gym_nairobi_hub', ?, 'NFH-2024-92', 'active', ?)
        """, (sarah_id, now_str))
        cursor.execute("""
        INSERT INTO member_consent_settings (user_id, gym_id, share_nutrition_summary, share_weight_trend, share_detailed_food_logs, share_workouts, receive_weekly_email, updated_at)
        VALUES (?, 'gym_nairobi_hub', 1, 1, 0, 1, 1, ?)
        """, (sarah_id, now_str))

    # 16. Seed Gym Packages
    cursor.execute("SELECT COUNT(*) FROM gym_packages")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        pkgs = [
            ("pkg_nfh_001", "gym_nairobi_hub", "4-Week Calorie Deficit & Macro Coaching", "Direct weekly meal plan audits with Coach Brian, daily macro calibrations, and accountability check-ins.", 3500, 28, 1, "all_members", "Cancel anytime before 1st checkin.", now_str),
            ("pkg_nfh_002", "gym_nairobi_hub", "Competition Recomposition & Hypertrophy Camp", "Comprehensive strength periodization with weekly body composition tracking and nutrient timing.", 6000, 45, 1, "all_members", "Requires 3+ gym sessions per week.", now_str),
            ("pkg_nfh_003", "gym_nairobi_hub", "High-Protein Kenyan Meal Prep Starter Box", "Pre-weighed Kenyan whole foods (boneless chicken breast, lean beef cuts, Ndengu & Nduma) delivered to gym locker.", 4200, 14, 1, "all_members", "Deliveries every Monday and Thursday morning.", now_str),
            ("pkg_kpg_001", "gym_kilimani_power", "Powerlifting Nutrition & Peaking Protocol", "Pre-meet hydration, glycogen replenishment strategies, and meet day fuel plan.", 4500, 30, 1, "all_members", "Ideal for registered lifters.", now_str)
        ]
        for pkg in pkgs:
            cursor.execute("""
            INSERT INTO gym_packages (id, gym_id, name, description, price_kes, duration_days, is_available, eligibility, terms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, pkg)

    # 17. Seed Orders, Transactions, Revenue Ledger & Invoices
    cursor.execute("SELECT COUNT(*) FROM gym_orders")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        # Seed Ryan's package order
        order_id = "ord_demo_001"
        tx_id = "tx_mpesa_001"
        cursor.execute("SELECT id FROM users WHERE email = 'ryan@calora.app'")
        r_user = cursor.fetchone()
        if r_user:
            ryan_id = r_user[0]
            cursor.execute("""
            INSERT INTO gym_orders (id, gym_id, package_id, user_id, amount_kes, currency, status, payment_method, payment_ref, idempotency_key, created_at)
            VALUES (?, 'gym_nairobi_hub', 'pkg_nfh_001', ?, 3500, 'KES', 'completed', 'mpesa', 'QA881923K', 'idem_ord_001', ?)
            """, (order_id, ryan_id, now_str))

            cursor.execute("""
            INSERT INTO payment_transactions (id, reference, provider, transaction_type, entity_id, user_id, amount_kes, phone_number, status, provider_metadata_json, idempotency_key, created_at, updated_at)
            VALUES (?, 'QA881923K', 'mpesa_daraja', 'package_order', ?, ?, 3500, '254700123456', 'successful', '{"MpesaReceiptNumber":"QA881923K"}', 'idem_tx_001', ?, ?)
            """, (tx_id, order_id, ryan_id, now_str, now_str))

            # Revenue Ledger:
            # Pilot gym has 0% platform commission: 100% gym share
            cursor.execute("""
            INSERT INTO revenue_ledger (id, entry_type, gym_id, amount_kes, platform_share_kes, gym_share_kes, order_id, transaction_id, status, description, created_at)
            VALUES ('rev_ord_001', 'package_sale', 'gym_nairobi_hub', 3500, 0, 3500, ?, ?, 'pending_settlement', 'Package Sale: 4-Week Calorie Deficit & Macro Coaching', ?)
            """, (order_id, tx_id, now_str))

        # Ledger entries for Gym SaaS subscriptions (100% Calora platform revenue)
        cursor.execute("""
        INSERT INTO revenue_ledger (id, entry_type, gym_id, amount_kes, platform_share_kes, gym_share_kes, order_id, transaction_id, status, description, created_at)
        VALUES ('rev_sub_001', 'gym_subscription', 'gym_nairobi_hub', 5000, 5000, 0, NULL, 'tx_sub_001', 'settled', 'Calora Growth SaaS Subscription - Nairobi Fitness Hub', ?)
        """, (now_str,))
        cursor.execute("""
        INSERT INTO revenue_ledger (id, entry_type, gym_id, amount_kes, platform_share_kes, gym_share_kes, order_id, transaction_id, status, description, created_at)
        VALUES ('rev_sub_002', 'gym_subscription', 'gym_kilimani_power', 2500, 2500, 0, NULL, 'tx_sub_002', 'settled', 'Calora Starter SaaS Subscription - Kilimani Powerhouse', ?)
        """, (now_str,))

        # Billing Invoices
        cursor.execute("""
        INSERT INTO billing_invoices (id, gym_id, invoice_number, plan_id, amount_kes, status, due_date, paid_at, created_at)
        VALUES ('inv_001', 'gym_nairobi_hub', 'INV-2026-001', 'plan_growth', 5000, 'paid', ?, ?, ?)
        """, (now_str, now_str, now_str))
        cursor.execute("""
        INSERT INTO billing_invoices (id, gym_id, invoice_number, plan_id, amount_kes, status, due_date, paid_at, created_at)
        VALUES ('inv_002', 'gym_kilimani_power', 'INV-2026-002', 'plan_starter', 2500, 'paid', ?, ?, ?)
        """, (now_str, now_str, now_str))

        # Settlement statement for Nairobi Fitness Hub
        cursor.execute("""
        INSERT INTO gym_settlements (id, gym_id, period_start, period_end, total_sales_kes, platform_commission_kes, payout_amount_kes, status, payout_reference, created_at)
        VALUES ('stl_001', 'gym_nairobi_hub', ?, ?, 3500, 0, 3500, 'approved', 'PENDING_BATCH_04', ?)
        """, ((now - timedelta(days=7)).isoformat(), now_str, now_str))

    conn.commit()
    conn.close()
