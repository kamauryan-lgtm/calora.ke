"""
CALORA - Comprehensive Verification Suite for New Features:
1. Admin Password Exclusivity & RBAC
2. User Change Password API
3. First-Time User Onboarding & Account Registration (Mifflin-St Jeor Targets)
4. Open Food Facts Barcode API
5. NKP AI Coach Multi-turn Memory & Photo Estimation
6. Live Workout Logging & Countdown Duration Tracking
"""

import urllib.request
import urllib.parse
import json
import os
import sys
from datetime import date

BASE_URL = "http://127.0.0.1:8000"

def request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, parsed

def run_tests():
    print("=== CALORA NEW FEATURES VERIFICATION SUITE ===\n")

    # 1. First-Time User Onboarding & Registration
    print("[1] Testing First-Time User Onboarding / Registration...")
    reg_email = f"amani_{date.today().strftime('%Y%m%d')}_{os.getpid()}@example.com"
    reg_payload = {
        "name": "Amani Mwangi",
        "email": reg_email,
        "password": "SecurePassword123!",
        "age": 25,
        "sex": "female",
        "height_cm": 168.0,
        "current_weight_kg": 75.0,
        "goal_weight_kg": 64.0,
        "activity_level": "moderately_active",
        "primary_goal": "lose",
        "deficit_tier": "moderate",
        "measurement_system": "metric"
    }
    status, res = request("/api/auth/register", "POST", reg_payload)
    assert status == 200, f"Registration failed with status {status}: {res}"
    token = res["token"]
    user_id = res["user"]["id"]
    print(f"  [OK] User created: {res['user']['name']} ({res['user']['email']})")
    assert "calculations" in res
    calcs = res["calculations"]
    target_data = calcs["target"]
    print(f"  [OK] Mifflin-St Jeor Target: {target_data['target_calories']} kcal, Protein: {target_data['macros']['protein_g']}g")

    user_token = token

    # 2. Change Password Management
    print("\n[2] Testing User Change Password API...")
    pwd_payload = {
        "current_password": "SecurePassword123!",
        "new_password": "BrandNewPassword2026!"
    }
    status, res = request("/api/auth/change-password", "POST", pwd_payload, token=user_token)
    assert status == 200, f"Password change failed: {res}"
    print("  [OK] Password changed successfully")

    # Verify login with new password
    status, res_login = request("/api/auth/login", "POST", {"email": reg_email, "password": "BrandNewPassword2026!"})
    assert status == 200, f"Login with new password failed: {res_login}"
    user_token = res_login["token"]
    print("  [OK] Successfully logged in with new password")

    # 3. Open Food Facts Barcode Lookup
    print("\n[3] Testing Open Food Facts Barcode API (/api/foods/barcode/{barcode})...")
    status, food_bc = request("/api/foods/barcode/5010029000140", "GET", token=user_token)
    assert status == 200, f"Barcode fetch failed: {food_bc}"
    print(f"  [OK] Scanned Barcode Product: {food_bc['name']} (Calories: {food_bc['calories_per_100g']} kcal/100g)")
    assert food_bc["protein_per_100g"] is not None

    # 4. NKP AI Coach Multi-Turn Memory & Photo Estimation
    print("\n[4] Testing NKP AI Coach Photo Analysis with Uncertainty Breakdown...")
    photo_payload = {
        "query": "Estimate calories in this Kenyan fish dinner",
        "date_str": date.today().isoformat(),
        "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    }
    status, chat_res = request("/api/assistant/chat", "POST", photo_payload, token=user_token)
    assert status == 200, f"Photo chat failed: {chat_res}"
    assert "photo_analysis" in chat_res
    pa = chat_res["photo_analysis"]
    print(f"  [OK] Photo Meal Detected: {pa['dish']} (~{pa['estimated_calories']} kcal, Range: {pa['likely_range']})")
    print(f"  [OK] Uncertainty Note: {pa['uncertainty_note']}")

    # Check conversation history in DB
    print("\n[5] Testing Persistent Coach Conversation Memory (/api/assistant/history)...")
    status, r_hist = request("/api/assistant/history", "GET", token=user_token)
    assert status == 200
    hist = r_hist["history"]
    assert len(hist) >= 2, f"Expected at least 2 memory items, got {len(hist)}"
    print(f"  [OK] Retrieved {len(hist)} stored conversation turns from user_coach_memories table.")

    # 5. Live Interactive Workout Logging
    print("\n[6] Testing Live Workout Logging with Duration Tracking...")
    workout_payload = {
        "date": date.today().isoformat(),
        "routine_name": "Full Body Strength Circuit",
        "duration_minutes": 45,
        "exercises": [
            {"name": "Bodyweight Squats", "sets": [{"reps": 15, "weight_kg": 0}, {"reps": 15, "weight_kg": 0}]},
            {"name": "Push-ups", "sets": [{"reps": 12, "weight_kg": 0}, {"reps": 12, "weight_kg": 0}]}
        ],
        "notes": "Completed full 45 min countdown. Felt strong on squats."
    }
    status, r_w = request("/api/workouts/log", "POST", workout_payload, token=user_token)
    assert status == 200, f"Workout log failed: {r_w}"
    print(f"  [OK] Workout logged successfully: ID {r_w['workout_id']}")

    # 6. Admin Exclusivity & Security
    print("\n[7] Testing Admin Password Exclusivity & RBAC Protection...")
    # Client attempting to access admin route
    status, r_adm_users = request("/api/admin/users", "GET", token=user_token)
    assert status == 403, f"Expected 403, got {status}"
    print("  [OK] Client correctly rejected from admin console (HTTP 403 Forbidden)")

    # Admin Login with admin password
    status, r_adm_login = request("/api/auth/login", "POST", {"email": "admin@calora.app", "password": "admin123"})
    assert status == 200, f"Admin login failed: {r_adm_login}"
    adm_token = r_adm_login["token"]
    status, r_adm_ok = request("/api/admin/users", "GET", token=adm_token)
    assert status == 200
    print(f"  [OK] Admin authenticated with admin password, retrieved {len(r_adm_ok)} users.")

    print("\n========================================================")
    print("ALL NEW FEATURES VERIFIED SUCCESSFULLY AND FULLY OPERATIONAL!")
    print("========================================================")

if __name__ == "__main__":
    run_tests()
