import os
import re

def check_js_assets():
    js_dir = os.path.join("static", "js")
    for fname in os.listdir(js_dir):
        if not fname.endswith(".js"):
            continue
        fpath = os.path.join(js_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        # Check Audio(...)
        audio_matches = re.findall(r'new\s+Audio\s*\(\s*["\']([^"\']+)["\']\s*\)', content)
        for a in audio_matches:
            if not (a.startswith("http") or a.startswith("data:")):
                clean = a.lstrip("/")
                candidates = [clean, os.path.join("static", clean)]
                if not any(os.path.exists(c) for c in candidates):
                    print(f"Warning in {fname}: Audio file not found: {a}")

        # Check Worker(...)
        worker_matches = re.findall(r'new\s+Worker\s*\(\s*["\']([^"\']+)["\']\s*\)', content)
        for w in worker_matches:
            if not (w.startswith("http") or w.startswith("data:")):
                clean = w.lstrip("/")
                candidates = [clean, os.path.join("static", clean)]
                if not any(os.path.exists(c) for c in candidates):
                    print(f"Warning in {fname}: Worker file not found: {w}")

        # Check for static file paths in string literals like '/static/...'
        static_literals = re.findall(r'["\'](/static/[^"\']+)["\']', content)
        for s in static_literals:
            clean = s.lstrip("/")
            candidates = [clean, os.path.join("static", clean[len("static/"):])]
            if not any(os.path.exists(c) for c in candidates):
                print(f"Warning in {fname}: Referenced path not found: {s}")

    print("JS asset references check complete!")

if __name__ == "__main__":
    check_js_assets()
