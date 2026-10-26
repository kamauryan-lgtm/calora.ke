import os
import re

def scan_all_onclick_interpolations():
    js_dir = "static/js"
    for fname in os.listdir(js_dir):
        if not fname.endswith(".js"):
            continue
        with open(os.path.join(js_dir, fname), "r", encoding="utf-8") as f:
            lines = f.readlines()
        for idx, line in enumerate(lines):
            # Match onclick or other on* event with template literal interpolation
            m = re.search(r'on[a-z]+=([\'"])(.*?)\1', line)
            if m and "${" in m.group(2):
                print(f"{fname}:{idx+1}: {line.strip()}")

if __name__ == "__main__":
    scan_all_onclick_interpolations()
