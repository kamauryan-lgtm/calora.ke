"""
End-to-end verification script for:
1. Whole Workout Programme retrieval and structure (all scheduled days and exercises)
2. Interactive Workout Logging with duration and volume
3. Admin Exercise Management (RBAC security, Add Exercise, Delete Exercise, Audit Logging)
"""

import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def request(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_json = json.loads(content)
        except Exception:
            err_json = {"detail": content}
        return e.code, err_json

def run_tests():
    print("=== CALORA WORKOUT PROGRAMME & ADMIN EXERCISE TEST SUITE ===\n")
    
    # 1. Test Workout Plans & Programmes
    print("1. Fetching Workout Plans & Programme Schedules...")
    status, plans = request("/api/workouts/plans")
    assert status == 200, f"Expected 200, got {status}: {plans}"
    assert len(plans) >= 3, f"Expected at least 3 plans, got {len(plans)}"
    
    for plan in plans:
        print(f"   [OK] Plan: '{plan['title']}' ({plan['level']})")
        assert "schedule" in plan, f"Plan {plan['id']} missing 'schedule'"
        schedule = plan["schedule"]
        assert len(schedule) > 0, f"Plan {plan['id']} schedule is empty"
        print(f"     - {len(schedule)} Training Days defined:")
        for day in schedule:
            exercises = day.get("exercises", [])
            print(f"       * {day.get('title', 'Day')} -> {len(exercises)} exercises")
            assert len(exercises) > 0, f"Day {day} has no exercises"
            for ex in exercises:
                assert "name" in ex, f"Exercise missing name: {ex}"
    print("   [PASS] All workout plans have full programme schedules!\n")

    # 2. Test User Login & Admin Login
    print("2. Authenticating User and Admin accounts...")
    status, user_auth = request("/api/auth/login", method="POST", data={"email": "ryan@calora.app", "password": "calora123"})
    assert status == 200, f"Failed user login: {user_auth}"
    user_token = user_auth["token"]
    print("   [OK] Client logged in: ryan@calora.app")

    status, admin_auth = request("/api/auth/login", method="POST", data={"email": "admin@calora.app", "password": "admin123"})
    assert status == 200, f"Failed admin login: {admin_auth}"
    admin_token = admin_auth["token"]
    print("   [OK] Super-Admin logged in: admin@calora.app")
    print("   [PASS] Authentication successful!\n")

    # 3. Test RBAC: Non-admin trying to add an exercise
    print("3. Testing RBAC Security: Non-Admin creating exercise...")
    exercise_payload = {
        "name": "Bulgarian Split Squats (Water Bottles)",
        "muscle_group": "Quads",
        "secondary_muscles": "Glutes, Core",
        "equipment": "Household",
        "difficulty": "Intermediate",
        "movement_pattern": "Squat",
        "form_cues": "Chest tall, rear foot on couch, front knee tracking second toe.",
        "safety_tips": "Do not let front knee collapse inward.",
        "kenyan_context": "Elevate rear foot on dining chair or sofa, hold 5L water bottles."
    }
    status, res = request("/api/admin/exercises", method="POST", data=exercise_payload, token=user_token)
    assert status == 403, f"Expected 403 Forbidden for non-admin, got {status}: {res}"
    print(f"   [OK] Non-admin correctly rejected with 403 Forbidden: {res.get('detail')}")
    print("   [PASS] RBAC protection verified!\n")

    # 4. Super-Admin creating exercise
    print("4. Super-Admin creating new Exercise...")
    status, create_res = request("/api/admin/exercises", method="POST", data=exercise_payload, token=admin_token)
    assert status == 200, f"Expected 200, got {status}: {create_res}"
    ex_id = create_res["id"]
    print(f"   [OK] Exercise created successfully! ID: {ex_id}, Name: {create_res['name']}")

    # 5. Admin listing exercises and verifying search
    print("5. Verifying Exercise in Admin and Public library...")
    status, ex_list = request(f"/api/admin/exercises?search=Bulgarian", token=admin_token)
    assert status == 200, f"Expected 200, got {status}"
    found = any(e["id"] == ex_id for e in ex_list)
    assert found, f"Created exercise {ex_id} not found in search results: {ex_list}"
    print(f"   [OK] Found '{ex_list[0]['name']}' in admin exercise library with Kenyan setup: {ex_list[0]['kenyan_context']}")

    # Also check public endpoint
    status, pub_list = request("/api/workouts/exercises?search=Bulgarian")
    assert status == 200, f"Expected 200, got {status}"
    assert any(e["id"] == ex_id for e in pub_list), "Not in public exercise library"
    print("   [OK] Exercise accessible in public /api/workouts/exercises")
    print("   [PASS] Exercise creation & discovery verified!\n")

    # 6. Test Workout Logging with Duration & Sets
    print("6. Testing Workout Session Logging (as Client)...")
    log_payload = {
        "date": "2026-10-26",
        "routine_name": "Kenyan Home Starter - Day 1: Full Body Strength & Core",
        "plan_id": "plan_kenyan_home_starter",
        "duration_minutes": 35,
        "exercises": [
            {
                "name": "Air Squats",
                "sets": [
                    {"reps": 15, "weight_kg": 0, "completed": True},
                    {"reps": 15, "weight_kg": 0, "completed": True},
                    {"reps": 15, "weight_kg": 0, "completed": True}
                ]
            },
            {
                "name": "Jerrycan Single-Arm Rows",
                "sets": [
                    {"reps": 12, "weight_kg": 10, "completed": True},
                    {"reps": 12, "weight_kg": 10, "completed": True}
                ]
            }
        ],
        "notes": "35-minute countdown tracker finished strong. Rested 45s between sets."
    }
    status, log_res = request("/api/workouts/log", method="POST", data=log_payload, token=user_token)
    assert status == 200, f"Expected 200, got {status}: {log_res}"
    print(f"   [OK] Workout logged: ID={log_res.get('workout_id')}, Volume={log_res.get('volume_kg')} kg")

    # Check workout history
    status, history = request("/api/workouts/history", token=user_token)
    assert status == 200, f"Expected 200, got {status}"
    assert len(history) > 0, "Workout history is empty"
    assert history[0]["routine_name"] == log_payload["routine_name"], f"Unexpected routine name: {history[0]['routine_name']}"
    assert history[0]["duration_minutes"] == 35, f"Unexpected duration: {history[0]['duration_minutes']}"
    print(f"   [OK] Workout recorded in history: duration={history[0]['duration_minutes']}m, date={history[0]['date']}")
    print("   [PASS] Live workout logging & history verified!\n")

    # 7. Test Admin Deleting Exercise
    print("7. Testing Admin Deletion of Exercise...")
    # First, non-admin deletion should fail
    status, res = request(f"/api/admin/exercises/{ex_id}", method="DELETE", token=user_token)
    assert status == 403, f"Expected 403 for non-admin delete, got {status}: {res}"
    print("   [OK] Non-admin deletion rejected with 403 Forbidden")

    # Super-Admin deletion should succeed
    status, del_res = request(f"/api/admin/exercises/{ex_id}", method="DELETE", token=admin_token)
    assert status == 200, f"Expected 200, got {status}: {del_res}"
    print(f"   [OK] Super-Admin deleted exercise: {del_res.get('message')}")

    # Verify exercise is no longer in library
    status, ex_list = request(f"/api/admin/exercises?search=Bulgarian", token=admin_token)
    assert status == 200
    assert not any(e["id"] == ex_id for e in ex_list), f"Exercise {ex_id} still exists after delete!"
    print("   [OK] Exercise confirmed removed from database")

    # Verify audit logs captured both creation and deletion
    status, audit_logs = request("/api/admin/audit-logs?limit=10", token=admin_token)
    assert status == 200
    actions = [a["action"] for a in audit_logs]
    assert "EXERCISE_CREATED" in actions, "EXERCISE_CREATED not in audit logs"
    assert "EXERCISE_DELETED" in actions, "EXERCISE_DELETED not in audit logs"
    print("   [OK] Audit logs verified: both EXERCISE_CREATED and EXERCISE_DELETED recorded!")
    print("   [PASS] Exercise deletion & audit trail verified!\n")

    print("======================================================")
    print("ALL TESTS PASSED! WORKOUT PROGRAMMES & ADMIN EXERCISES FULLY FUNCTIONAL!")
    print("======================================================")

if __name__ == "__main__":
    run_tests()
