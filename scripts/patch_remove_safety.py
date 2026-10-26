import os
import re

def fix_null_safety():
    js_dir = "static/js"
    modified_files = {}

    for f in sorted(os.listdir(js_dir)):
        if f.endswith(".js"):
            path = os.path.join(js_dir, f)
            with open(path, "r", encoding="utf-8") as js_file:
                content = js_file.read()

            orig_content = content

            # Replace document.getElementById('...').remove() with document.getElementById('...')?.remove()
            content = re.sub(
                r'document\.getElementById\((["\'][a-zA-Z0-9_\-]+["\'])\)\.remove\(\)',
                r'document.getElementById(\1)?.remove()',
                content
            )

            # Check if content changed
            if content != orig_content:
                with open(path, "w", encoding="utf-8") as js_file:
                    js_file.write(content)
                modified_files[f] = True
                print(f"Patched .remove() null safety in {f}")

    print("Completed .remove() patching.")

if __name__ == "__main__":
    fix_null_safety()
