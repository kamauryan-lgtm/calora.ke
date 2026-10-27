"""
CALORA Live Server HTTP Integration Test Suite
Follows strict safety and verification guidelines:
1. Runs read-only GET tests first.
2. Uses application's intended authentication rules (JWT Bearer token and fallback).
3. Uses an isolated test database (CALORA_DB_PATH) so real data is never touched.
4. Verifies sleep endpoint, history endpoint, trailing-slash, and JSON 404 responses.
5. Verifies steps and workout endpoints without mutating data.
6. Captures server startup errors and logs if backend fails.
7. Safely terminates only the test server process.
8. Reports each test as PASS or FAIL clearly.
"""

import os
import sys
import time
import json
import shutil
import urllib.request
import urllib.error
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.auth import create_access_token

PORT = 8000
SERVER_URL = f"http://127.0.0.1:{PORT}"
TEST_DB_NAME = "test_calora_integration.db"
TEST_DB_PATH = os.path.join(BASE_DIR, TEST_DB_NAME)
ORIGINAL_DB = os.path.join(BASE_DIR, "calora.db")

results = []

def record(name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append((name, status, detail))
    print(f"[{status}] {name}{f' - {detail}' if detail else ''}")

def http_get(path: str, headers: dict = None) -> tuple:
    url = f"{SERVER_URL}{path}"
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            content_type = resp.headers.get("content-type", "")
            data = resp.read().decode("utf-8")
            return resp.status, content_type, data
    except urllib.error.HTTPError as e:
        content_type = e.headers.get("content-type", "")
        data = e.read().decode("utf-8")
        return e.code, content_type, data

def http_post(path: str, payload: dict, headers: dict = None) -> tuple:
    url = f"{SERVER_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            content_type = resp.headers.get("content-type", "")
            data = resp.read().decode("utf-8")
            return resp.status, content_type, data
    except urllib.error.HTTPError as e:
        content_type = e.headers.get("content-type", "")
        data = e.read().decode("utf-8")
        return e.code, content_type, data

def run():
    print("=" * 65)
    print("CALORA LIVE SERVER INTEGRATION TEST SUITE")
    print(f"Target: {SERVER_URL}")
    print("=" * 65)

    # 1. Setup isolated test database
    if os.path.exists(ORIGINAL_DB):
        shutil.copy2(ORIGINAL_DB, TEST_DB_PATH)
        print(f"Isolated test database created: {TEST_DB_PATH}")
    else:
        print("[ERROR] Original database calora.db not found.")
        sys.exit(1)

    env = os.environ.copy()
    env["CALORA_DB_PATH"] = TEST_DB_PATH
    env["PORT"] = str(PORT)

    # 2. Launch live server process
    proc = subprocess.Popen(
        [sys.executable, "run.py"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=BASE_DIR,
        text=True
    )

    # Wait for server readiness
    started = False
    for attempt in range(15):
        time.sleep(0.5)
        # Check if process died prematurely
        if proc.poll() is not None:
            stdout, stderr = proc.communicate()
            print("[ERROR] Server process terminated prematurely during startup:")
            print("STDOUT:", stdout[:500])
            print("STDERR:", stderr[:500])
            break
        try:
            status, ct, data = http_get("/")
            if status == 200:
                started = True
                print(f"Live backend server is listening and ready (attempt {attempt + 1}).")
                break
        except Exception:
            continue

    if not started:
        print("[FAIL] Backend server failed to start on port", PORT)
        if proc.poll() is None:
            proc.terminate()
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)
        sys.exit(1)

    try:
        token = create_access_token({
            "sub": "user_ryan_001",
            "email": "ryan@calora.app",
            "name": "Ryan",
            "role": "user"
        })
        auth_headers = {"Authorization": f"Bearer {token}"}

        # ----------------------------------------------------
        # PHASE 1: READ-ONLY GET TESTS
        # ----------------------------------------------------
        print("\n--- Phase 1: Read-Only GET Endpoint Tests ---")

        # Test 1: Unauthenticated GET /api/sleep/today?date_str=2026-10-27
        status, ct, body = http_get("/api/sleep/today?date_str=2026-10-27")
        try:
            parsed = json.loads(body)
            passed = (status == 200 and "application/json" in ct and parsed.get("date") == "2026-10-27" and "duration_minutes" in parsed)
            record("1. Direct unauthenticated GET /api/sleep/today?date_str=2026-10-27 returns 200 JSON", passed, f"Status: {status}, Date: {parsed.get('date')}, Duration: {parsed.get('duration_minutes')}m")
        except Exception as e:
            record("1. Direct unauthenticated GET /api/sleep/today?date_str=2026-10-27 returns 200 JSON", False, str(e))

        # Test 2: Authenticated GET /api/sleep/today?date_str=2026-10-27
        status, ct, body = http_get("/api/sleep/today?date_str=2026-10-27", headers=auth_headers)
        try:
            parsed = json.loads(body)
            passed = (status == 200 and "application/json" in ct and parsed.get("date") == "2026-10-27")
            record("2. Authenticated GET /api/sleep/today with JWT Bearer returns 200 JSON", passed, f"Status: {status}, Quality: {parsed.get('quality_rating')}/5")
        except Exception as e:
            record("2. Authenticated GET /api/sleep/today with JWT Bearer returns 200 JSON", False, str(e))

        # Test 3: Trailing slash /api/sleep/today/
        status, ct, body = http_get("/api/sleep/today/?date_str=2026-10-27")
        try:
            parsed = json.loads(body)
            passed = (status == 200 and "application/json" in ct and "duration_minutes" in parsed)
            record("3. Trailing slash GET /api/sleep/today/ returns 200 JSON", passed, f"Status: {status}")
        except Exception as e:
            record("3. Trailing slash GET /api/sleep/today/ returns 200 JSON", False, str(e))

        # Test 4: Sleep History GET /api/sleep/history?days=7
        status, ct, body = http_get("/api/sleep/history?days=7", headers=auth_headers)
        try:
            parsed = json.loads(body)
            passed = (status == 200 and "application/json" in ct and "history" in parsed and "average_duration_min" in parsed)
            record("4. GET /api/sleep/history?days=7 returns 200 JSON with history & averages", passed, f"Count: {len(parsed.get('history', []))}, Avg: {parsed.get('average_duration_min')}m")
        except Exception as e:
            record("4. GET /api/sleep/history?days=7 returns 200 JSON with history & averages", False, str(e))

        # Test 5: Steps endpoint GET /api/steps/today?date_str=2026-10-27
        status, ct, body = http_get("/api/steps/today?date_str=2026-10-27", headers=auth_headers)
        try:
            parsed = json.loads(body)
            passed = (status == 200 and "application/json" in ct and "steps_count" in parsed)
            record("5. Read-only GET /api/steps/today returns 200 JSON", passed, f"Steps: {parsed.get('steps_count')}")
        except Exception as e:
            record("5. Read-only GET /api/steps/today returns 200 JSON", False, str(e))

        # Test 6: Workout plans endpoint GET /api/workouts/plans
        status, ct, body = http_get("/api/workouts/plans")
        try:
            parsed = json.loads(body)
            passed = (status == 200 and "application/json" in ct and isinstance(parsed, list))
            record("6. Read-only GET /api/workouts/plans returns 200 JSON", passed, f"Plans loaded: {len(parsed)}")
        except Exception as e:
            record("6. Read-only GET /api/workouts/plans returns 200 JSON", False, str(e))

        # Test 7: Nonexistent route GET /api/nonexistent_verification_path returns 404 JSON (NOT HTML)
        status, ct, body = http_get("/api/nonexistent_verification_path")
        try:
            passed = (status == 404 and "application/json" in ct and not body.strip().startswith("<"))
            record("7. Nonexistent /api/* route returns 404 JSON (never HTML)", passed, f"Status: {status}, Content-Type: {ct}")
        except Exception as e:
            record("7. Nonexistent /api/* route returns 404 JSON (never HTML)", False, str(e))

        # ----------------------------------------------------
        # PHASE 2: ISOLATED WRITE & DURATION TEST (Isolated DB)
        # ----------------------------------------------------
        print("\n--- Phase 2: Isolated Sleep Logging & Duration Test ---")

        # Test 8: Sleep log across midnight (23:15 to 07:15 = 480 mins)
        log_payload = {
            "date": "2099-01-01",  # Future test date isolated in test db
            "bedtime": "23:15",
            "wake_time": "07:15",
            "quality_rating": 5,
            "goal_minutes": 480,
            "notes": "Isolated test sleep record"
        }
        status, ct, body = http_post("/api/sleep/log", log_payload, headers=auth_headers)
        try:
            parsed = json.loads(body)
            passed = (status == 200 and parsed.get("status") == "success" and parsed.get("duration_minutes") == 480 and parsed.get("hours") == "8h 0m")
            record("8. POST /api/sleep/log calculates duration across midnight and logs to SQLite", passed, f"Duration: {parsed.get('duration_minutes')}m ({parsed.get('hours')})")
        except Exception as e:
            record("8. POST /api/sleep/log calculates duration across midnight and logs to SQLite", False, str(e))

        # Test 9: Verify retrieve of newly logged sleep record in isolated DB
        status, ct, body = http_get("/api/sleep/today?date_str=2099-01-01", headers=auth_headers)
        try:
            parsed = json.loads(body)
            passed = (status == 200 and parsed.get("duration_minutes") == 480 and parsed.get("quality_rating") == 5 and parsed.get("notes") == "Isolated test sleep record")
            record("9. GET /api/sleep/today reflects newly saved record correctly", passed, f"Quality: {parsed.get('quality_rating')}, Duration: {parsed.get('duration_minutes')}m")
        except Exception as e:
            record("9. GET /api/sleep/today reflects newly saved record correctly", False, str(e))

    finally:
        # 3. Clean termination of only the server process started by this script
        print("\nTerminating test server process...")
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
        print("Server process terminated.")

        # 4. Clean up isolated test database
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
                print(f"Isolated test database {TEST_DB_NAME} cleaned up successfully.")
            except Exception as e:
                print(f"Warning: could not remove {TEST_DB_NAME}: {e}")

    # 5. Final summary
    print("\n" + "=" * 65)
    print("FINAL TEST RESULTS SUMMARY:")
    all_passed = True
    for name, status, detail in results:
        det_str = f" ({detail})" if detail else ""
        print(f"  {status}: {name}{det_str}")
        if status != "PASS":
            all_passed = False
    print("=" * 65)

    if all_passed:
        print("[ALL TESTS PASSED] The CALORA Sleep API is fully verified and functioning properly!")
        return True
    else:
        print("[SOME TESTS FAILED] Please inspect the failures above.")
        return False

if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)
