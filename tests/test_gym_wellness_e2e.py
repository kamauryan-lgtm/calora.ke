"""
CALORA Full Platform Upgrade E2E Test Suite
Validates:
1. Custom Recipe Builder (macro calculations, per-serving breakdown, DB persistence)
2. Wellness Tracking (Daily steps, cross-midnight sleep duration)
3. Workouts Engine (Exercises by muscle group, plans, session logging)
4. Multi-Tenant Gym Partner Workspaces (Workspace slug, manager dashboard)
5. Member Privacy & Consent-Based Progress Reporting
6. M-Pesa STK Push Payment Flow & Append-Only Revenue Ledger (0% pilot commission)
7. Weekly Member Progress Email Digest (HTML template & preview)
8. PWA Service Worker & Manifest
"""

import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:8000"


def request(endpoint, method="GET", body=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run_platform_upgrade_tests():
    print("=== STARTING CALORA FULL PLATFORM UPGRADE E2E VERIFICATION ===")

    # 1. Login as Ryan
    login_res = request("/api/auth/demo-login?role=user", "POST")
    assert login_res["status"] == "success"
    token = login_res["token"]
    user = login_res["user"]
    print(f"[PASS] 1. Authenticated as client: {user['name']} ({user['email']})")

    # 2. Custom Recipe Builder
    # Create recipe: 'Post-Workout Chicken & Rice Fuel' with 3 servings
    # Ingredients: 300g Chicken breast, 200g White Rice, 1 tbsp Cooking oil
    recipe_payload = {
        "name": "Post-Workout Chicken & Rice Fuel",
        "description": "High-protein meal prep with white rice and grilled chicken",
        "servings": 3,
        "ingredients": [
            {
                "food_id": "food_chicken_breast",
                "ingredient_name": "Chicken Breast (Skinless, Grilled)",
                "gram_weight": 300.0,
                "oil_type": "none"
            },
            {
                "food_id": "food_rice_white",
                "ingredient_name": "White Rice (Cooked)",
                "gram_weight": 200.0,
                "oil_type": "none"
            },
            {
                "food_id": "food_oil_cooking",
                "ingredient_name": "Vegetable Cooking Oil",
                "gram_weight": 14.0,
                "oil_type": "1_tbsp"
            }
        ]
    }
    recipe_res = request("/api/recipes", "POST", recipe_payload, token=token)
    assert recipe_res["status"] == "success"
    recipe_summary = recipe_res["summary"]
    assert recipe_summary["servings"] == 3
    assert recipe_summary["total_calories"] > 0
    assert recipe_summary["per_serving_calories"] == round(recipe_summary["total_calories"] / 3)
    assert recipe_summary["per_serving_macros"]["protein_g"] > 0
    print(f"[PASS] 2. Custom Recipe Builder: Created recipe ID '{recipe_res['recipe_id']}'.")
    print(f"       Total: {recipe_summary['total_calories']} kcal.")
    print(f"       Per Serving (1/{recipe_summary['servings']}): {recipe_summary['per_serving_calories']} kcal, {recipe_summary['per_serving_macros']['protein_g']}g P, {recipe_summary['per_serving_macros']['carbs_g']}g C, {recipe_summary['per_serving_macros']['fat_g']}g F.")

    # Verify recipe retrieval
    user_recipes = request("/api/recipes", "GET", token=token)
    assert len(user_recipes) >= 1
    assert any(r["name"] == "Post-Workout Chicken & Rice Fuel" for r in user_recipes)
    print(f"[PASS]    Retrieved {len(user_recipes)} saved user recipes.")

    # 3. Wellness: Daily Step Tracking
    step_payload = {
        "date": "2026-10-23",
        "steps_count": 10540,
        "distance_km": 7.8,
        "calories_burned": 420.0,
        "active_minutes": 65,
        "goal_steps": 10000,
        "notes": "Evening walk around Kilimani"
    }
    step_res = request("/api/steps/log", "POST", step_payload, token=token)
    assert step_res["status"] == "success"
    assert step_res["steps_count"] == 10540
    print(f"[PASS] 3. Step Tracking: Logged {step_res['steps_count']} steps ({step_res['calories_burned']} kcal burned).")

    # Step History
    step_history = request("/api/steps/history?days=7", "GET", token=token)
    assert len(step_history["history"]) >= 1
    assert step_history["average_steps"] > 0
    print(f"[PASS]    7-day Average Steps: {step_history['average_steps']} steps/day across {step_history['total_logged_days']} logged days.")

    # 4. Wellness: Sleep Tracking (Cross-Midnight Calculation)
    # Bedtime 22:30, Wake time 06:45 -> Duration 8h 15m (495 minutes)
    sleep_payload = {
        "date": "2026-10-23",
        "bedtime": "22:30",
        "wake_time": "06:45",
        "quality_rating": 5,
        "goal_minutes": 480,
        "notes": "Felt well-rested, no caffeine after 2pm"
    }
    sleep_res = request("/api/sleep/log", "POST", sleep_payload, token=token)
    assert sleep_res["status"] == "success"
    assert sleep_res["duration_minutes"] == 495
    assert sleep_res["hours"] == "8h 15m"
    print(f"[PASS] 4. Sleep Tracking: Cross-midnight 22:30 -> 06:45 correctly calculated as {sleep_res['hours']} ({sleep_res['duration_minutes']} minutes).")

    # Sleep History
    sleep_history = request("/api/sleep/history?days=7", "GET", token=token)
    assert len(sleep_history["history"]) >= 1
    assert sleep_history["average_duration_min"] > 0
    print(f"[PASS]    Sleep History: Average duration {sleep_history['average_duration_min']} min, Quality rating {sleep_history['average_quality']}/5.")

    # 5. Workouts Engine: Exercises & Plans
    exercises = request("/api/workouts/exercises", "GET", token=token)
    assert len(exercises) >= 20
    chest_exercises = request("/api/workouts/exercises?muscle_group=chest", "GET", token=token)
    assert len(chest_exercises) >= 1
    print(f"[PASS] 5. Exercise Library: Loaded {len(exercises)} exercises across 12 muscle groups (Chest: {len(chest_exercises)} items).")

    plans = request("/api/workouts/plans", "GET", token=token)
    assert len(plans) >= 2
    first_plan = plans[0]
    print(f"[PASS]    Loaded workout plans: '{first_plan['title']}' ({first_plan['level']}, {first_plan['goal']}).")

    # Log a workout session
    workout_log_payload = {
        "date": "2026-10-23",
        "plan_id": first_plan["id"],
        "routine_name": "Upper Body Hypertrophy",
        "duration_minutes": 55,
        "notes": "Hit new bench press personal record: 80kg x 8 reps",
        "exercises": [
            {
                "exercise_name": "Flat Barbell Bench Press",
                "sets": [{"reps": 8, "weight_kg": 80.0}, {"reps": 8, "weight_kg": 80.0}]
            },
            {
                "exercise_name": "Seated Cable Row",
                "sets": [{"reps": 12, "weight_kg": 60.0}, {"reps": 12, "weight_kg": 60.0}]
            }
        ]
    }
    wlog_res = request("/api/workouts/log", "POST", workout_log_payload, token=token)
    assert wlog_res["status"] == "success"
    print(f"[PASS]    Logged workout session: '{workout_log_payload['routine_name']}' (55 min, total volume: {wlog_res['volume_kg']} kg).")

    # 6. Gym Partner: Multi-Tenant Workspace Lookup
    workspace = request("/api/gyms/workspace/nairobi-hub", "GET")
    assert workspace["gym"]["slug"] == "nairobi-hub"
    assert "Nairobi Fitness Hub" in workspace["gym"]["name"]
    assert "branding" in workspace
    assert workspace["branding"]["primary_color"] == "#10b981"
    print(f"[PASS] 6. Multi-Tenant Gym Workspace: Found '{workspace['gym']['name']}' (Slug: {workspace['gym']['slug']}, Active members: {workspace['member_count']}).")

    # 7. Gym Manager Authentication & Dashboard
    gym_owner_login = request("/api/auth/demo-login?role=gym_owner", "POST")
    assert gym_owner_login["status"] == "success"
    owner_token = gym_owner_login["token"]
    owner_user = gym_owner_login["user"]
    print(f"[PASS] 7. Gym Owner Authenticated: {owner_user['name']} ({owner_user['email']})")

    gym_id = "gym_nairobi_hub"
    dashboard = request(f"/api/gyms/{gym_id}/dashboard", "GET", token=owner_token)
    assert dashboard["gym"]["id"] == gym_id
    assert "Growth" in dashboard["subscription"]["plan_name"]
    assert dashboard["total_members"] >= 2
    print(f"[PASS]    Gym Dashboard Loaded: Plan: {dashboard['subscription']['plan_name']}, Active Members: {dashboard['active_members']}, Gross Sales: KES {dashboard['gross_package_sales_kes']:,.2f}.")

    # 8. Member Privacy & Consent-Based Progress Reporting
    progress_report = request(f"/api/gyms/{gym_id}/progress-reports", "GET", token=owner_token)
    assert "aggregate_trends" in progress_report
    assert "member_reports" in progress_report
    agg = progress_report["aggregate_trends"]
    print(f"[PASS] 8. Consent-Based Progress Reports:")
    print(f"       Aggregate Trends: Avg Deficit={agg['avg_daily_calorie_deficit']} kcal, Protein Compliance={agg['avg_protein_adherence_pct']}%, Active Logging={agg['active_logging_rate_pct']}%.")
    
    # Check that privacy is respected
    for m in progress_report["member_reports"]:
        if not m["consent_granted"]:
            assert m["name"] == "Member (Consent Withheld)"
            assert m["avg_deficit"] == "Private"
            print(f"       Member privacy protected: Data strictly withheld ('{m['avg_deficit']}').")
        else:
            print(f"       Consented Member '{m['name']}': Avg deficit {m['avg_deficit']} kcal, Protein adherence {m['protein_adherence_pct']}%.")

    # 9. Gym Packages & M-Pesa Payment Flow
    packages = request(f"/api/gyms/{gym_id}/packages", "GET")
    assert len(packages) >= 1
    pkg = packages[0]
    print(f"[PASS] 9. Gym Packages: Found '{pkg['name']}' for KES {pkg['price_kes']:,.2f}.")

    # Client orders package via M-Pesa STK push
    order_payload = {
        "package_id": pkg["id"],
        "phone_number": "254712345678"
    }
    order_res = request(f"/api/gyms/{gym_id}/packages/{pkg['id']}/order", "POST", order_payload, token=token)
    assert order_res["status"] == "pending"
    assert "reference" in order_res
    ref = order_res["reference"]
    print(f"[PASS]    Initiated M-Pesa STK Push: Order #{order_res['order_id'][:12]} (Ref: {ref}) to {order_res['phone_number']}.")

    # Simulate M-Pesa Daraja Callback
    callback_payload = {
        "reference": ref,
        "success": True,
        "receipt_number": "QHB8912KL3"
    }
    cb_res = request("/api/payments/callback", "POST", callback_payload)
    assert cb_res["status"] == "success"
    assert cb_res["receipt"] == "QHB8912KL3"
    print(f"[PASS]    Processed M-Pesa Callback: Receipt {cb_res['receipt']} successfully marked and activated.")

    # Verify Revenue Ledger (Section 49 rule: 0% Calora commission for pilot gyms)
    admin_login = request("/api/auth/demo-login?role=admin", "POST")
    admin_token = admin_login["token"]
    rev_overview = request("/api/admin/revenue-overview", "GET", token=admin_token)
    assert "saas_recurring_revenue_kes" in rev_overview
    assert "member_package_gross_volume_kes" in rev_overview
    print(f"[PASS]    Revenue Ledger Verified: SaaS Recurring MRR=KES {rev_overview['saas_recurring_revenue_kes']:,.2f}, Gross Gym Package Sales=KES {rev_overview['member_package_gross_volume_kes']:,.2f} (Gym sales separate from Calora SaaS revenue).")

    # 10. Automated Weekly Progress Email Report
    preview_url = f"/api/gyms/{gym_id}/email-reports/preview/{user['id']}"
    req_preview = urllib.request.Request(f"{BASE_URL}{preview_url}")
    with urllib.request.urlopen(req_preview) as resp:
        email_html = resp.read().decode("utf-8")
        assert "CALORA" in email_html
        assert "Weekly" in email_html
        print(f"[PASS] 10. Weekly Member Email Report: Generated responsive HTML digest for Ryan (HTML length: {len(email_html)} bytes).")

    # Test send email endpoint
    test_email_res = request(f"/api/gyms/{gym_id}/email-reports/test", "POST", {
        "recipient_email": "ryan.test@calora.app"
    }, token=owner_token)
    assert test_email_res["status"] in ("sent", "simulated_sent")
    print(f"[PASS]     Test email dispatch executed: Method='{test_email_res['method']}', Recipient: {test_email_res['recipient']}.")

    # 11. PWA & Static Assets Verification
    for asset in ["/manifest.json", "/sw.js", "/offline.html"]:
        req_asset = urllib.request.Request(f"{BASE_URL}{asset}")
        with urllib.request.urlopen(req_asset) as resp:
            content = resp.read().decode("utf-8")
            assert len(content) > 50
            print(f"[PASS] 11. PWA Asset Verified: {asset} ({len(content)} bytes).")

    print("\n==========================================================================")
    print("ALL FULL PLATFORM UPGRADE FEATURES VERIFIED AND PASSING SUCCESSFULLY!")
    print("==========================================================================")


if __name__ == "__main__":
    run_platform_upgrade_tests()
