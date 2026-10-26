"""
CALORA - Netlify Build Script
Prepares the complete 'dist' directory for static publishing on Netlify.
Ensures both root asset paths and /static/ prefixed paths resolve seamlessly.
"""

import os
import shutil

def build():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(root_dir, "static")
    dist_dir = os.path.join(root_dir, "dist")

    print(f"Building CALORA for Netlify deployment...")
    print(f"Source: {static_dir}")
    print(f"Destination: {dist_dir}")

    # Remove existing dist directory if present
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)

    os.makedirs(dist_dir, exist_ok=True)

    # 1. Copy all contents of static/ into dist/
    for item in os.listdir(static_dir):
        s = os.path.join(static_dir, item)
        d = os.path.join(dist_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

    # Keep root index.html synchronized with Calora's static/index.html
    shutil.copy2(os.path.join(static_dir, "index.html"), os.path.join(root_dir, "index.html"))

    # 2. Also create a nested dist/static directory so that assets linked via
    #    /static/... continue to work without relying on URL rewrites
    nested_static = os.path.join(dist_dir, "static")
    shutil.copytree(static_dir, nested_static)

    # 3. Create _redirects file for Netlify
    redirects_path = os.path.join(dist_dir, "_redirects")
    with open(redirects_path, "w", encoding="utf-8") as f:
        f.write("# CALORA Netlify Redirect Rules\n")
        f.write("# 1. Direct API requests to Netlify Serverless Function (or external backend)\n")
        f.write("/api/*  /.netlify/functions/api/api/:splat  200\n")
        f.write("\n# 2. SPA client-side fallback\n")
        f.write("/*      /index.html                          200\n")

    # 4. Create robots.txt
    robots_path = os.path.join(dist_dir, "robots.txt")
    with open(robots_path, "w", encoding="utf-8") as f:
        f.write("User-agent: *\nAllow: /\n")

    print("[SUCCESS] CALORA static bundle compiled into 'dist/' successfully!")
    print(f"Files in dist: {len(os.listdir(dist_dir))} root items, nested static mirror included.")

if __name__ == "__main__":
    build()
