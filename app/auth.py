"""
CALORA - Secure Authentication & Session Management
Zero-dependency, tamper-proof signed JSON Web Tokens using HMAC-SHA256.
"""

import json
import base64
import hmac
import hashlib
import time
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends

SECRET_KEY = "calora-production-secret-key-accuracy-over-assumptions-2026"


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def base64url_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding < 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def create_access_token(payload: Dict[str, Any], expires_in_seconds: int = 86400 * 14) -> str:
    """Create a signed JWT with expiration (14 days default)."""
    header = {"alg": "HS256", "typ": "JWT"}
    body = {**payload, "exp": int(time.time()) + expires_in_seconds, "iat": int(time.time())}

    header_b64 = base64url_encode(json.dumps(header).encode("utf-8"))
    body_b64 = base64url_encode(json.dumps(body).encode("utf-8"))

    signing_input = f"{header_b64}.{body_b64}"
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64url_encode(signature)

    return f"{signing_input}.{sig_b64}"


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify signature and expiration of JWT."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None
        header_b64, body_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{body_b64}"

        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input.encode("utf-8"), hashlib.sha256).digest()
        provided_sig = base64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, provided_sig):
            return None

        body = json.loads(base64url_decode(body_b64).decode("utf-8"))
        if body.get("exp", 0) < time.time():
            return None  # expired

        return body
    except Exception:
        return None


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI dependency to extract current authenticated user."""
    from app.database import get_db_connection

    if not authorization:
        # Fallback to demo Ryan if testing unauthenticated
        raise HTTPException(status_code=401, detail="Authentication token required")

    token = authorization.replace("Bearer ", "").strip()
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    user_id = payload["sub"]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, name, role FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=401, detail="User account not found")

    return dict(row)


def get_current_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Dependency verifying user has admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator privileges required")
    return current_user
