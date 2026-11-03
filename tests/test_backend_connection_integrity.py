"""
CALORA Backend Integration Test Suite
Validates:
1. Health check endpoint (status, database connectivity, real query check)
2. Sleep tracking endpoints (today, history, logging, DB persistence)
3. Steps tracking endpoints (today, logging)
4. Workout plan retrieval
5. Multi-tenant Gym workspace retrieval (valid gym and nonexistent slug)
6. Authentication & session verification (login, demo-login, JWT token)
7. Admin authorization & RBAC (admin access allowed, non-admin rejected with 403)
8. Invalid API route fallback (guaranteed structured JSON 404, never HTML)
"""

import unittest
import os
import sys
import json
from datetime import date

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import get_db_connection, init_database, seed_database_defaults
from app.main import (
    health_check, get_today_sleep, get_sleep_history, log_sleep,
    get_today_steps, list_workout_plans, get_gym_workspace,
    login, demo_login, get_current_user,
    get_admin_stats, api_unmapped_fallback, custom_404_handler
)
from app.auth import get_current_admin_user, verify_access_token
from app.models import LogSleepRequest, LoginRequest, LogStepRequest
from fastapi import HTTPException
from fastapi.responses import JSONResponse


class TestCaloraBackendIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_database()
        seed_database_defaults()
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = 'ryan@calora.app'")
        cls.client_user = dict(c.fetchone())
        c.execute("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
        cls.admin_user = dict(c.fetchone())
        conn.close()

    def test_01_health_endpoint(self):
        """Verify GET /api/health returns 200 JSON with real database verification."""
        resp = health_check()
        self.assertIsInstance(resp, JSONResponse)
        self.assertEqual(resp.status_code, 200)

        data = json.loads(resp.body.decode("utf-8"))
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["app_name"], "CALORA API")
        self.assertTrue(data["api_available"])
        self.assertEqual(data["database"]["status"], "connected")
        self.assertTrue(data["database"]["verified"])
        self.assertGreater(data["database"]["table_count"], 10)

    def test_02_sleep_today_endpoint(self):
        """Verify GET /api/sleep/today returns today's record with correct format."""
        today_str = date.today().isoformat()
        res = get_today_sleep(date_str=today_str, user=self.client_user)
        self.assertIsInstance(res, dict)
        self.assertIn("duration_minutes", res)
        self.assertIn("quality_rating", res)
        self.assertIn("bedtime", res)
        self.assertIn("wake_time", res)
        self.assertEqual(res["date"], today_str)

    def test_03_sleep_history_endpoint(self):
        """Verify GET /api/sleep/history returns history list and aggregates."""
        res = get_sleep_history(days=14, user=self.client_user)
        self.assertIsInstance(res, dict)
        self.assertIn("history", res)
        self.assertIn("average_duration_min", res)
        self.assertIn("average_quality", res)
        self.assertIsInstance(res["history"], list)

    def test_04_sleep_logging_and_database_persistence(self):
        """Verify sleep logging writes to the real database and calculates duration."""
        target_date = "2026-10-30"
        req = LogSleepRequest(
            date=target_date,
            bedtime="22:30",
            wake_time="06:30",
            quality_rating=5,
            notes="Automated integration test sleep log"
        )
        res = log_sleep(req, self.client_user)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["duration_minutes"], 480)

        # Verify record in SQLite database
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM sleep_logs WHERE user_id = ? AND date = ?", (self.client_user["id"], target_date))
        row = c.fetchone()
        conn.close()
        self.assertIsNotNone(row)
        self.assertEqual(row["duration_minutes"], 480)
        self.assertEqual(row["quality_rating"], 5)

    def test_05_steps_today_endpoint(self):
        """Verify GET /api/steps/today returns valid steps count."""
        today_str = date.today().isoformat()
        res = get_today_steps(date_str=today_str, user=self.client_user)
        self.assertIsInstance(res, dict)
        self.assertIn("steps_count", res)
        self.assertIn("goal_steps", res)
        self.assertIn("distance_km", res)

    def test_06_workout_plans_retrieval(self):
        """Verify GET /api/workouts/plans returns available plans."""
        plans = list_workout_plans()
        self.assertIsInstance(plans, list)
        self.assertGreaterEqual(len(plans), 1)
        plan = plans[0]
        self.assertIn("title", plan)
        self.assertIn("level", plan)

    def test_07_gym_workspace_retrieval_and_isolation(self):
        """Verify GET /api/gyms/workspace/nairobi-hub returns gym, branding, packages, coaches."""
        workspace = get_gym_workspace(slug="nairobi-hub")
        self.assertIn("gym", workspace)
        self.assertIn("branding", workspace)
        self.assertIn("packages", workspace)
        self.assertIn("coaches", workspace)
        self.assertEqual(workspace["gym"]["slug"], "nairobi-hub")

        # Test nonexistent gym returns 404 HTTPException
        with self.assertRaises(HTTPException) as ctx:
            get_gym_workspace(slug="nonexistent-gym-slug")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_08_authentication_flow(self):
        """Verify user login and demo login generate valid JWT tokens."""
        login_res = login(LoginRequest(email="ryan@calora.app", password="calora123"))
        self.assertEqual(login_res["status"], "success")
        self.assertIn("token", login_res)
        token = login_res["token"]

        payload = verify_access_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["sub"], self.client_user["id"])

        # Demo login as user
        demo_res = demo_login(role="user")
        self.assertEqual(demo_res["status"], "success")
        self.assertIn("token", demo_res)

        # Invalid login must fail with 401
        with self.assertRaises(HTTPException) as ctx:
            login(LoginRequest(email="nonexistent@calora.app", password="wrongpassword"))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_09_admin_authorization_rbac(self):
        """Verify admin endpoints are accessible to admin and forbidden to standard users."""
        stats = get_admin_stats(self.admin_user)
        self.assertIsInstance(stats, dict)
        self.assertIn("total_users", stats)
        self.assertIn("total_foods", stats)

        # Non-admin attempting admin access must be rejected with 403
        with self.assertRaises(HTTPException) as ctx:
            get_current_admin_user(self.client_user)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_10_unmapped_api_fallback_returns_json_404(self):
        """Verify missing API routes return structured JSON 404, NEVER HTML."""
        resp = api_unmapped_fallback("nonexistent/endpoint/test")
        self.assertIsInstance(resp, JSONResponse)
        self.assertEqual(resp.status_code, 404)

        data = json.loads(resp.body.decode("utf-8"))
        self.assertEqual(data["status"], "error")
        self.assertIn("API endpoint not found", data["detail"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
