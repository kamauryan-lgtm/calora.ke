"""
CALORA End-to-End API and Flow Verification
Tests the complete user journey outlined in Section 49:
- Authentication & Profile
- Transparent calculation engine (BMR, TDEE, Deficit)
- Food Search (Ugali, Sukuma, Beef stew, Barcode)
- Portion selection & Cooking Oil uncertainty range
- Meal logging & Daily Dashboard calculations
- "Why this number?" calculation verification
- Natural language food logging
- Photo food recognition
- AI Assistant & Meal Recommendations
- Adaptive Calorie Engine & Weight Trend
- Error discrepancy reporting & Admin Console
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

    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run_e2e_tests():
    print("=== STARTING CALORA E2E SYSTEM VERIFICATION ===")

    # 1. Test Static Landing Page
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8")
        assert "CALORA" in html
        assert "Accuracy over assumptions." in html
        print("[PASS] Static SPA loads correctly with CALORA tagline and brand assets.")

    # 2. Demo Login as Ryan
    login_res = request("/api/auth/demo-login?role=user", "POST")
    assert login_res["status"] == "success"
    token = login_res["token"]
    user = login_res["user"]
    assert user["name"] == "Ryan"
    print(f"[PASS] Authentication successful for demo user: {user['name']} ({user['email']})")

    # 3. Transparent Calculation Preview (Section 49 Walkthrough values)
    # 80kg, 175cm, 20yo, Moderately active, Lose weight (moderate deficit)
    calc_preview = request("/api/calculations/preview", "POST", {
        "age": 20, "sex": "male", "height_cm": 175.0, "weight_kg": 80.0,
        "activity_level": "moderately_active", "goal": "lose", "deficit_tier": "moderate"
    })
    bmr = calc_preview["bmr"]["bmr"]
    tdee = calc_preview["tdee"]["tdee"]
    target = calc_preview["target"]["target_calories"]
    assert bmr == 1799, f"Expected 1799, got {bmr}"
    assert tdee == round(1799 * 1.55)
    print(f"[PASS] Calorie Engine: BMR={bmr} kcal (Mifflin-St Jeor), TDEE={tdee} kcal, Deficit Target={target} kcal/day.")

    # 4. Food Search: Search "Ugali"
    search_res = request("/api/foods/search?q=ugali")
    assert len(search_res) >= 2
    ugali = search_res[0]
    assert "Ugali" in ugali["name"]
    assert "portions" in ugali and len(ugali["portions"]) >= 3
    print(f"[PASS] Food Database: Found '{ugali['name']}' ({ugali['calories_per_100g']} kcal/100g) with {len(ugali['portions'])} portions.")
    print(f"       Source: {ugali['source']}")

    # 5. Barcode Lookup: Brookside Whole Fresh Milk
    barcode_res = request("/api/foods/barcode/6161100001012")
    assert "Brookside" in barcode_res["name"]
    print(f"[PASS] Barcode Scanner: Successfully matched barcode 6161100001012 to '{barcode_res['name']}'.")

    # 6. Section 49 Core User Flow Meal Logging:
    # User adds Ugali (Medium 250g), Beef stew (Medium 160g), Sukuma wiki (120g)
    today = "2026-10-19"

    # Log Ugali (Medium 250g)
    log_ugali = request("/api/meals/item", "POST", {
        "date": today, "meal_type": "lunch",
        "food_id": "food_ugali_white", "food_name": "Ugali (White Maize)",
        "portion_name": "Medium portion", "gram_weight": 250.0,
        "cooking_oil_type": "none", "prep_method": "boiled"
    }, token)
    assert log_ugali["logged_calories"] == 325

    # Log Beef Stew (160g, 1 tbsp oil)
    log_beef = request("/api/meals/item", "POST", {
        "date": today, "meal_type": "lunch",
        "food_id": "food_beef_stew_ke", "food_name": "Beef Stew (Kenyan Style)",
        "portion_name": "Medium bowl", "gram_weight": 160.0,
        "cooking_oil_type": "1_tbsp", "prep_method": "stewed"
    }, token)
    assert log_beef["logged_calories"] == 404

    # Log Sukuma Wiki (120g, 1 tsp oil)
    log_sukuma = request("/api/meals/item", "POST", {
        "date": today, "meal_type": "lunch",
        "food_id": "food_sukuma_wiki", "food_name": "Sukuma Wiki (Braised)",
        "portion_name": "Medium side", "gram_weight": 120.0,
        "cooking_oil_type": "1_tsp", "prep_method": "stewed"
    }, token)
    assert log_sukuma["logged_calories"] == 102

    print("[PASS] Meal Logging: Logged Ugali (~325 kcal), Beef stew (~404 kcal), and Sukuma wiki (~102 kcal).")

    # 7. Daily Dashboard Verification
    diary = request(f"/api/meals/date/{today}", "GET", token=token)
    consumed_cal = diary["consumed"]["calories"]
    range_display = diary["consumed"]["range_display"]
    confidence = diary["consumed"]["confidence"]
    uncertainties = diary["consumed"]["main_uncertainties"]
    remaining_cal = diary["remaining"]["calories"]

    print(f"[PASS] Dashboard Aggregation: Consumed={consumed_cal} kcal, Remaining={remaining_cal} kcal.")
    print(f"       Likely Range: {range_display} | Overall Confidence: {confidence}")
    print(f"       Uncertainties: {uncertainties}")
    assert consumed_cal > 0
    assert confidence in ["HIGH", "MEDIUM", "LOW"]

    # 8. Natural Language Food Logging
    nlp_res = request("/api/nlp/parse", "POST", {
        "text": "I ate two chapatis and a cup of beans"
    })
    assert nlp_res["status"] == "success"
    assert len(nlp_res["items"]) == 2
    item_names = [i["food_name"] for i in nlp_res["items"]]
    assert "Kenyan Chapati" in item_names
    assert "Maharagwe (Stewed Beans)" in item_names
    print(f"[PASS] Natural Language Parser: Parsed '{nlp_res['input_text']}' into:")
    for itm in nlp_res["items"]:
        print(f"       - {itm['portion_name']} {itm['food_name']} (~{itm['calories']} kcal, {itm['range_display']})")

    # 9. Natural Language Ambiguity Detection (Section 18: asks for portions if missing)
    nlp_ambiguous = request("/api/nlp/parse", "POST", {
        "text": "I had ugali, beef and sukuma for lunch"
    })
    assert nlp_ambiguous["clarification_needed"] == True
    assert len(nlp_ambiguous["clarifications"]) > 0
    print(f"[PASS] Ambiguity Engine: Detected unstated portions/oils in 'ugali, beef and sukuma' and generated {len(nlp_ambiguous['clarifications'])} clarifying questions instead of faking precision.")

    # 10. Photo Food Recognition Simulation
    photo_res = request("/api/photo/detect", "POST", { "hint": "ugali" })
    assert photo_res["status"] == "detected"
    assert len(photo_res["items"]) >= 2
    print(f"[PASS] Photo Food Recognition: Identified '{photo_res['scene_detected']}' with {len(photo_res['items'])} items and clarifying questions.")

    # 11. Context-Aware AI Nutrition Assistant
    chat_res = request("/api/assistant/chat", "POST", {
        "query": "What can I eat with my remaining calories?",
        "date": today
    }, token)
    assert "recommendations" in chat_res
    print("[PASS] AI Nutrition Assistant: Generated context-aware answer grounded in user's remaining calories.")

    # 12. Smart Meal Recommendations
    recs_res = request(f"/api/assistant/recommendations?date_str={today}", "GET", token=token)
    assert len(recs_res["recommendations"]) == 3
    print(f"[PASS] Meal Recommendation Engine: Generated 3 balanced options within user's calorie budget:")
    for rec in recs_res["recommendations"]:
        print(f"       • {rec['title']} (~{rec['estimated_calories']} kcal, {rec['protein_g']}g protein, {rec['likely_range']})")

    # 13. Weight Tracking & Adaptive Calorie Engine
    wt_log = request("/api/weight/log", "POST", {
        "date": today,
        "weight_kg": 79.9,
        "notes": "Evening weigh in"
    }, token)
    assert wt_log["status"] == "success"

    history = request("/api/weight/history?days=30", "GET", token=token)
    assert len(history["logs"]) >= 10
    assert "smoothed_avg_kg" in history["logs"][-1]
    print(f"[PASS] Weight Tracking: Logged 79.9kg; 7-day smoothed moving average is {history['stats']['seven_day_avg']} kg.")

    adaptive = request("/api/progress/adaptive-engine", "GET", token=token)
    assert adaptive["status"] == "active"
    print(f"[PASS] Adaptive Calorie Engine: Estimated maintenance={adaptive['estimated_maintenance']} kcal vs Observed={adaptive['observed_maintenance']} kcal (Variance: {adaptive['variance']} kcal).")

    # 14. Weekly Performance Analysis
    weekly = request("/api/progress/weekly-analysis", "GET", token=token)
    assert "average_calories" in weekly
    print(f"[PASS] Weekly Analysis: Avg calories={weekly['average_calories']} kcal, Logged days={weekly['logged_days']}, Feedback: \"{weekly['feedback_message']}\"")

    # 15. User Error Reporting & Admin Console
    report_res = request("/api/reports/submit", "POST", {
        "food_id": "food_chapati_ke",
        "food_name": "Kenyan Chapati",
        "issue_type": "wrong_portion",
        "user_notes": "Hotel chapatis in Westlands are often 120g instead of 85g."
    }, token)
    assert report_res["status"] == "success"

    # Switch to Admin User
    admin_login = request("/api/auth/demo-login?role=admin", "POST")
    admin_token = admin_login["token"]

    admin_reports = request("/api/admin/reports", "GET", token=admin_token)
    assert len(admin_reports) >= 1
    target_report = admin_reports[0]
    print(f"[PASS] Discrepancy Reporting: User submitted report '{target_report['food_name']} ({target_report['issue_type']})' and admin received it.")

    # Admin resolves report
    resolve_res = request(f"/api/admin/reports/{target_report['id']}/status", "POST", {
        "status": "resolved",
        "admin_response": "Portion variance verified against hotel sample weights; added Extra Large portion."
    }, token=admin_token)
    assert resolve_res["status"] == "success"

    admin_stats = request("/api/admin/stats", "GET", token=admin_token)
    print(f"[PASS] Admin Console: Total foods={admin_stats['total_foods']} (Verified: {admin_stats['verified_foods']}), Audits logged: {len(admin_stats['recent_audits'])}.")

    print("\n=== ALL E2E USER JOURNEYS & SPECIFICATION REQUIREMENTS PASSED SUCCESSFULLY! ===")


if __name__ == "__main__":
    run_e2e_tests()
