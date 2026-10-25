import urllib.request
import urllib.parse
import json
import sys

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
    print("=== CALORA ADMIN, HISTORY & NKP AI COACH E2E VERIFICATION ===")
    
    # 1. Client Login (Ryan)
    print("\n[1] Testing Client Login (Ryan)...")
    status, res = request("/api/auth/login", "POST", {"email": "ryan@calora.app", "password": "calora123"})
    assert status == 200, f"Expected 200, got {status}: {res}"
    client_token = res["token"]
    client_user = res["user"]
    print(f"  [OK] Logged in as: {client_user['name']} (role: {client_user['role']})")
    assert client_user["role"] in ["client", "user"]

    # 2. Client History Endpoints
    print("\n[2] Testing Client Meal History API (/api/meals/history)...")
    status, res = request("/api/meals/history?days=14", "GET", token=client_token)
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert "history" in res
    print(f"  [OK] Received {len(res['history'])} days of meal history. Sample date: {res['history'][0]['date'] if res['history'] else 'None'}")

    print("\n[3] Testing Client Unified History Stream (/api/client/unified-history)...")
    status, res = request("/api/client/unified-history", "GET", token=client_token)
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert "timeline" in res
    print(f"  [OK] Received {len(res['timeline'])} unified timeline events across meals, weights, workouts, sleep.")

    # 3. Security Check: Client MUST NOT access Super-Admin Endpoints
    print("\n[4] Testing RBAC Security: Client accessing Admin Endpoint (/api/admin/users)...")
    status, res = request("/api/admin/users", "GET", token=client_token)
    assert status == 403, f"Expected 403 Forbidden for non-admin, got {status}: {res}"
    print(f"  [OK] Correctly rejected with HTTP {status}: {res.get('detail')}")

    # 4. Super-Admin Login
    print("\n[5] Testing Super-Admin Login (admin@calora.app)...")
    status, res = request("/api/auth/login", "POST", {"email": "admin@calora.app", "password": "admin123"})
    assert status == 200, f"Expected 200, got {status}: {res}"
    admin_token = res["token"]
    admin_user = res["user"]
    print(f"  [OK] Logged in as: {admin_user['name']} (role: {admin_user['role']})")
    assert admin_user["role"] == "admin"

    # 5. Super-Admin User Management
    print("\n[6] Testing Super-Admin Users List (/api/admin/users)...")
    status, users = request("/api/admin/users", "GET", token=admin_token)
    assert status == 200, f"Expected 200, got {status}: {users}"
    print(f"  [OK] Retrieved {len(users)} registered users.")

    # 6. Super-Admin Food DB Operations (CRUD)
    print("\n[7] Testing Super-Admin Food DB: Create Food...")
    test_food_payload = {
        "name": "E2E Test Mukimo Special",
        "category": "Kenyan meals",
        "source": "Kenya Food Composition Tables, 2018 (E2E Test)",
        "calories_per_100g": 185.0,
        "protein_per_100g": 4.5,
        "carbs_per_100g": 32.0,
        "fat_per_100g": 3.8,
        "fibre_per_100g": 5.2,
        "is_verified": 1
    }
    status, created_food = request("/api/admin/foods", "POST", test_food_payload, token=admin_token)
    assert status == 200, f"Expected 200, got {status}: {created_food}"
    food_id = created_food["id"]
    print(f"  [OK] Created food item ID: {food_id} ('{created_food['name']}')")

    print("\n[8] Testing Super-Admin Food DB: Update Food...")
    update_payload = {
        "name": "E2E Test Mukimo Special (Updated)",
        "category": "Kenyan meals",
        "calories_per_100g": 190.0,
        "protein_per_100g": 5.0,
        "carbs_per_100g": 33.0,
        "fat_per_100g": 4.0,
        "fibre_per_100g": 5.5,
        "is_verified": 1
    }
    status, updated_food = request(f"/api/admin/foods/{food_id}", "PUT", update_payload, token=admin_token)
    assert status == 200, f"Expected 200, got {status}: {updated_food}"
    assert updated_food["calories_per_100g"] == 190.0
    print(f"  [OK] Updated nutrients for food ID: {food_id}")

    print("\n[9] Testing Super-Admin Food DB: Delete Food...")
    status, del_res = request(f"/api/admin/foods/{food_id}", "DELETE", token=admin_token)
    assert status == 200, f"Expected 200, got {status}: {del_res}"
    print(f"  [OK] Successfully deleted test food item ID: {food_id}")

    # 7. Super-Admin Gyms and Audit Trail
    print("\n[10] Testing Super-Admin Gym Workspaces (/api/admin/gyms)...")
    status, gyms = request("/api/admin/gyms", "GET", token=admin_token)
    assert status == 200, f"Expected 200, got {status}: {gyms}"
    print(f"  [OK] Retrieved {len(gyms)} gym workspaces.")

    print("\n[11] Testing Super-Admin Audit Trail (/api/admin/audit-logs)...")
    status, audit_logs = request("/api/admin/audit-logs", "GET", token=admin_token)
    assert status == 200, f"Expected 200, got {status}: {audit_logs}"
    print(f"  [OK] Retrieved {len(audit_logs)} audit trail entries. Most recent action: {audit_logs[0]['action']}")

    # 8. NKP AI Coach Real-Time Telemetry & Nutrition Chat
    print("\n[12] Testing NKP AI Coach Context Recommendations...")
    status, recs = request("/api/assistant/recommendations?date_str=2026-10-23", "GET", token=client_token)
    assert status == 200, f"Expected 200, got {status}: {recs}"
    assert "context" in recs
    ctx = recs["context"]
    print(f"  [OK] Telemetry verified for {ctx['name']}: Consumed={ctx['consumed_calories']} kcal, Remaining={ctx['remaining_calories']} kcal, Protein gap={ctx['remaining_protein_g']}g, Steps={ctx.get('steps_today')}")

    print("\n[13] Testing NKP AI Coach Chat (/api/assistant/chat)...")
    chat_payload = {
        "query": "I only have 500 calories left today and need 30g of protein. Can I have Ndengu with chapati, or what would you suggest?",
        "date_str": "2026-10-23"
    }
    status, chat_res = request("/api/assistant/chat", "POST", chat_payload, token=client_token)
    assert status == 200, f"Expected 200, got {status}: {chat_res}"
    reply_text = chat_res.get("response") or chat_res.get("reply", "")
    print(f"  [OK] NKP AI Coach responded ({len(reply_text)} chars):")
    safe_preview = reply_text[:200].encode('ascii', 'replace').decode('ascii')
    print(f"    \"{safe_preview}...\"")
    assert "ndengu" in reply_text.lower() or "protein" in reply_text.lower() or "calories" in reply_text.lower()

    # 9. Copy Past Meal to Today
    print("\n[14] Testing Copy Meals to Today (/api/meals/copy-to-today)...")
    copy_payload = {
        "source_date": "2026-10-19"
    }
    status, copy_res = request("/api/meals/copy-to-today", "POST", copy_payload, token=client_token)
    assert status == 200, f"Expected 200, got {status}: {copy_res}"
    print(f"  [OK] Copied {copy_res.get('items_copied', 0)} meal items from 2026-10-19 into today's diary!")

    # Clean up temporary test meals copied into today so user's today diary remains clean
    from datetime import date
    import sqlite3
    today_str = date.today().isoformat()
    conn = sqlite3.connect("calora.db")
    c = conn.cursor()
    c.execute("DELETE FROM meal_items WHERE meal_id IN (SELECT id FROM meals WHERE user_id = 'user_ryan_001' AND date = ?)", (today_str,))
    c.execute("DELETE FROM meals WHERE user_id = 'user_ryan_001' AND date = ?", (today_str,))
    conn.commit()
    conn.close()
    print("  [OK] Cleaned up temporary test copied meals from today's diary.")

    print("\n==========================================================")
    print("ALL TESTS PASSED! ADMIN, CLIENT, HISTORY & NKP AI ARE 100% OPERATIONAL.")
    print("==========================================================")

if __name__ == "__main__":
    run_tests()
