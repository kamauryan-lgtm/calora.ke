"""
CALORA Application Server Runner
Starts the verified FastAPI backend on host 0.0.0.0 and configured port.
"""

import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")

    print(f"=" * 60)
    print(f"CALORA Nutrition & Calorie Tracking Platform")
    print(f"Philosophy: Accuracy over assumptions.")
    print(f"=" * 60)
    print(f"Server URL:       http://localhost:{port}")
    print(f"Health Check:     http://localhost:{port}/api/health")
    print(f"Interactive Docs: http://localhost:{port}/docs")
    print(f"=" * 60)

    try:
        uvicorn.run("app.main:app", host=host, port=port, reload=False)
    except OSError as e:
        if "10048" in str(e) or "already in use" in str(e).lower():
            print(f"\n[ERROR] Port {port} is already in use by another application or server process.")
            print(f"To run on another port, set the PORT environment variable: $env:PORT={port + 1}; python run.py")
        else:
            print(f"\n[ERROR] Server failed to bind to {host}:{port}: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nCALORA server stopped cleanly.")
        sys.exit(0)
