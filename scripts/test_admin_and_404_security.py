import os
import sys
import json
from datetime import date

sys.stdout.reconfigure(encoding="utf-8")
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

print("=== CALORA 404 RESOLUTION & ADMIN SECURITY VERIFICATION ===")

from app.main import (
    app, search_foods, get_admin_users_list, update_user_role,
    update_user_status, update_user_restrictions, assistant_chat
)
from app.auth import create_access_token, verify_access_token, get_current_user, get_current_admin_user
from app.database import get_db_connection, init_database
from app.models import (
    AdminUpdateUserRoleRequest, AdminUpdateUserStatusRequest,
    AdminUpdateUserRestrictionsRequest, AssistantChatRequest
)
from fastapi import HTTPException

# Ensure DB is up to date
init_database()

# -------------------------------------------------------------
# 1. TEST 404 BACKEND ERROR PREVENTION (JSON vs HTML)
# -------------------------------------------------------------
print("\n[1/5] Testing 404 Backend Handling & Path Normalization...")
from app.main import serve_spa

# Requesting an unmapped /api route to serve_spa
spa_api_resp = serve_spa("api/nonexistent_route_test")
assert spa_api_resp.status_code == 404, f"Expected 404, got {spa_api_resp.status_code}"
assert "application/json" in spa_api_resp.media_type, "Expected application/json response for /api 404"
body_data = json.loads(spa_api_resp.body.decode("utf-8"))
assert "detail" in body_data
print(f" [OK] Unmapped /api route returns clean JSON 404: {body_data['detail']}")

# Verify Netlify redirect rules in dist/_redirects
with open("dist/_redirects", "r", encoding="utf-8") as f:
    redir_content = f.read()
assert "/api/*  /static/api/404.json                 404!" in redir_content
print(" [OK] Netlify _redirects configured with 404! JSON fallback (prevents HTML error page)")

# -------------------------------------------------------------
# 2. TEST PRIVATE ADMIN ACCESS & RBAC ENFORCEMENT
# -------------------------------------------------------------
print("\n[2/5] Testing Role-Based Access Control on Admin Endpoints...")
conn = get_db_connection()
cursor = conn.cursor()

# Get regular user and admin user
cursor.execute("SELECT id, email, name, role FROM users WHERE role = 'admin' LIMIT 1")
admin_row = cursor.fetchone()
assert admin_row, "Admin user not found in database"
admin_user = dict(admin_row)

cursor.execute("SELECT id, email, name, role FROM users WHERE role != 'admin' LIMIT 1")
client_row = cursor.fetchone()
assert client_row, "Client user not found in database"
client_user = dict(client_row)
conn.close()

# Verify regular user cannot pass get_current_admin_user
try:
    get_current_admin_user(client_user)
    assert False, "Client user was able to bypass admin gate!"
except HTTPException as e:
    assert e.status_code == 403, f"Expected 403, got {e.status_code}"
    print(f" [OK] Regular user blocked with 403: {e.detail}")

# Verify admin user passes
admin_res = get_current_admin_user(admin_user)
assert admin_res["role"] == "admin"
print(f" [OK] Authenticated admin verified successfully ({admin_user['name']})")

# -------------------------------------------------------------
# 3. TEST ADMIN USER MANAGEMENT (ROLES & SELF-DEMOTION PROTECTION)
# -------------------------------------------------------------
print("\n[3/5] Testing Admin User Management & Role Changes...")
users = get_admin_users_list(search=None, role=None, status=None, admin=admin_user)
assert isinstance(users, list) and len(users) > 0
print(f" [OK] Admin retrieved {len(users)} registered users.")

# Promote client to coach
orig_role = client_user["role"]
role_req = AdminUpdateUserRoleRequest(role="coach")
res_role = update_user_role(client_user["id"], role_req, admin=admin_user)
assert res_role["new_role"] == "coach"
print(f" [OK] Promoted {client_user['name']} to coach.")

# Revert role back
revert_req = AdminUpdateUserRoleRequest(role=orig_role)
update_user_role(client_user["id"], revert_req, admin=admin_user)
print(f" [OK] Reverted {client_user['name']} back to {orig_role}.")

# Test Self-Demotion Protection
try:
    demote_req = AdminUpdateUserRoleRequest(role="client")
    update_user_role(admin_user["id"], demote_req, admin=admin_user)
    assert False, "Admin was able to demote themselves!"
except HTTPException as e:
    assert e.status_code == 400
    print(f" [OK] Self-demotion protection enforced: {e.detail}")

# -------------------------------------------------------------
# 4. TEST USER SUSPENSION & IMMEDIATE ACCESS BLOCKING
# -------------------------------------------------------------
print("\n[4/5] Testing Account Suspension & Access Revocation...")
# Test self-suspension protection
try:
    suspend_self = AdminUpdateUserStatusRequest(status="suspended")
    update_user_status(admin_user["id"], suspend_self, admin=admin_user)
    assert False, "Admin was able to suspend themselves!"
except HTTPException as e:
    assert e.status_code == 400
    print(f" [OK] Self-suspension protection enforced: {e.detail}")

# Suspend client user
suspend_req = AdminUpdateUserStatusRequest(status="suspended", reason="Testing security enforcement")
res_suspend = update_user_status(client_user["id"], suspend_req, admin=admin_user)
assert res_suspend["new_status"] == "suspended"
print(f" [OK] Suspended user account {client_user['name']}")

# Verify suspended user cannot authenticate via get_current_user
token = create_access_token({"sub": client_user["id"], "email": client_user["email"]})
try:
    get_current_user(authorization=f"Bearer {token}")
    assert False, "Suspended user was able to access API!"
except HTTPException as e:
    assert e.status_code == 403
    print(f" [OK] Suspended user token immediately rejected: {e.detail}")

# Reactivate user account
reactivate_req = AdminUpdateUserStatusRequest(status="active", reason="Reactivating account")
update_user_status(client_user["id"], reactivate_req, admin=admin_user)
print(f" [OK] Reactivated {client_user['name']}")

# Verify access restored
restored_user = get_current_user(authorization=f"Bearer {token}")
assert restored_user["status"] == "active"
print(f" [OK] User access restored successfully")

# -------------------------------------------------------------
# 5. TEST FEATURE RESTRICTIONS (BLOCKING AI COACH / WORKOUTS)
# -------------------------------------------------------------
print("\n[5/5] Testing Granular Feature Restrictions...")
# Restrict AI Coach
restrict_req = AdminUpdateUserRestrictionsRequest(restricted_features=["ai_coach"])
res_restrict = update_user_restrictions(client_user["id"], restrict_req, admin=admin_user)
assert "ai_coach" in res_restrict["restricted_features"]
print(f" [OK] Restricted 'ai_coach' for {client_user['name']}")

# Test user attempting AI Coach chat
restricted_user_dict = get_current_user(authorization=f"Bearer {token}")
chat_req = AssistantChatRequest(query="How many calories in pilau?")
try:
    assistant_chat(chat_req, user=restricted_user_dict)
    assert False, "User accessed restricted feature!"
except HTTPException as e:
    assert e.status_code == 403
    print(f" [OK] Blocked restricted feature with 403: {e.detail}")

# Clear restrictions
clear_req = AdminUpdateUserRestrictionsRequest(restricted_features=[])
update_user_restrictions(client_user["id"], clear_req, admin=admin_user)
cleared_user_dict = get_current_user(authorization=f"Bearer {token}")
chat_res = assistant_chat(chat_req, user=cleared_user_dict)
assert "response" in chat_res
print(f" [OK] Restrictions cleared; feature access verified!")

# Verify UI Privacy
with open("static/index.html", "r", encoding="utf-8") as f:
    ui_html = f.read()

assert "admin-auth-guard" not in ui_html, "Found admin-auth-guard in index.html"
assert '<span>Admin Portal</span>' not in ui_html, "Found visible Admin Portal button in index.html"
print(" [OK] Verified zero public admin links or buttons in user interface!")

print("\n=== ALL SECURITY AND BACKEND ERROR CHECKS PASSED PERFECTLY! ===")
