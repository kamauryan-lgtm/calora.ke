import os
import re

def check_script_tags():
    with open("static/index.html", "r", encoding="utf-8") as f:
        html = f.read()

    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)
    print("Scripts loaded in static/index.html:")
    for s in scripts:
        print(f"  - {s}")

    js_files = [f"static/js/{f}" for f in os.listdir("static/js") if f.endswith(".js")]
    print("\nFiles in static/js/:")
    for f in js_files:
        print(f"  - {f}")

    # Check for files in static/js not loaded in index.html
    unloaded = []
    for f in js_files:
        base = os.path.basename(f)
        if not any(base in s for s in scripts):
            unloaded.append(f)

    if unloaded:
        print(f"\n[NOTE] Files in static/js/ not explicitly in index.html: {unloaded}")
    else:
        print("\nAll static/js/ files are loaded in index.html.")

if __name__ == "__main__":
    check_script_tags()
