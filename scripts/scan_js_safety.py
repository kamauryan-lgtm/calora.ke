import os
import re

def scan_js_null_safety():
    print("=== SCANNING JAVASCRIPT NULL SAFETY ===")
    js_dir = "static/js"
    potential_issues = []

    with open("static/index.html", "r", encoding="utf-8") as f:
        html = f.read()

    # Extract all HTML IDs
    html_ids = set(re.findall(r'id=["\']([a-zA-Z0-9_\-]+)["\']', html))

    for f in sorted(os.listdir(js_dir)):
        if f.endswith(".js"):
            path = os.path.join(js_dir, f)
            with open(path, "r", encoding="utf-8") as js_file:
                lines = js_file.readlines()
                for line_idx, line in enumerate(lines, 1):
                    # Check for direct chained property access like document.getElementById("foo").value
                    matches = re.findall(r'document\.getElementById\(["\']([a-zA-Z0-9_\-]+)["\']\)\.([a-zA-Z0-9_]+)', line)
                    for el_id, prop in matches:
                        # If el_id is NOT in index.html, it will throw a TypeError in browser!
                        if el_id not in html_ids:
                            potential_issues.append((f, line_idx, el_id, prop, line.strip()))

    if potential_issues:
        print(f"Found {len(potential_issues)} potential null-reference crashes in JS:")
        for js_f, line_idx, el_id, prop, line in potential_issues:
            print(f"  [{js_f}:{line_idx}] document.getElementById('{el_id}').{prop} (ID '#{el_id}' not found in index.html)")
    else:
        print("[ALL CLEAR] Zero unvalidated direct chained property accesses to missing HTML elements found in JS files!")

if __name__ == "__main__":
    scan_js_null_safety()
