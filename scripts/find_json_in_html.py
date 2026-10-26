import os
import re

def find_json_stringify_in_html():
    js_dir = "static/js"
    for fname in os.listdir(js_dir):
        if not fname.endswith(".js"):
            continue
        with open(os.path.join(js_dir, fname), "r", encoding="utf-8") as f:
            lines = f.readlines()
        for idx, line in enumerate(lines):
            if "JSON.stringify" in line and ("onclick" in line or "innerHTML" in line or "`" in line):
                print(f"{fname}:{idx+1}: {line.strip()}")

if __name__ == "__main__":
    find_json_stringify_in_html()
