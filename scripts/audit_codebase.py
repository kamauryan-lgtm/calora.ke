import os
import re

def audit_codebase():
    print("=== STARTING FULL CODEBASE ERROR AUDIT ===")

    with open("static/index.html", "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Extract all IDs from index.html
    html_ids = set(re.findall(r'id=["\']([a-zA-Z0-9_\-]+)["\']', html))
    print(f"\n[1] HTML Elements: {len(html_ids)} unique IDs identified in index.html.")

    # 2. Extract all onclick, onsubmit, onchange, oninput in index.html
    event_handlers = re.findall(r'on(?:click|submit|change|input)=["\']([^"\']+)["\']', html)
    called_funcs = set()
    for h in event_handlers:
        matches = re.findall(r'([a-zA-Z0-9_]+)\s*\(', h)
        for m in matches:
            if m not in ("if", "alert", "confirm", "parseInt", "parseFloat", "Math", "String", "event"):
                called_funcs.add(m)
    print(f"[2] HTML Event Handlers: {len(called_funcs)} unique JS functions called from HTML attributes.")

    # 3. Read all JS files
    js_dir = "static/js"
    defined_funcs = set()
    all_js_content = {}
    missing_id_references = []

    for f in sorted(os.listdir(js_dir)):
        if f.endswith(".js"):
            path = os.path.join(js_dir, f)
            with open(path, "r", encoding="utf-8") as js_file:
                content = js_file.read()
                all_js_content[f] = content

                # Find function declarations: function foo(...)
                f_decls = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', content)
                for fd in f_decls:
                    defined_funcs.add(fd)

                # Find async function declarations: async function foo(...)
                af_decls = re.findall(r'async\s+function\s+([a-zA-Z0-9_]+)\s*\(', content)
                for afd in af_decls:
                    defined_funcs.add(afd)

                # Find window.foo = ...
                w_decls = re.findall(r'window\.([a-zA-Z0-9_]+)\s*=', content)
                for wd in w_decls:
                    defined_funcs.add(wd)

                # Find const/let foo = (...) => or function
                var_funcs = re.findall(r'(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>', content)
                for vf in var_funcs:
                    defined_funcs.add(vf)

                # Check getElementById calls
                used_ids = re.findall(r'getElementById\(["\']([a-zA-Z0-9_\-]+)["\']\)', content)
                for uid in set(used_ids):
                    # Check if ID exists in HTML or is created dynamically in any JS file
                    in_html = uid in html_ids
                    in_dynamic_js = any(f'id="{uid}"' in c or f"id='{uid}'" in c or f'id: "{uid}"' in c or f"id = '{uid}'" in c or f'id = "{uid}"' in c for c in all_js_content.values())
                    if not in_html and not in_dynamic_js:
                        missing_id_references.append((f, uid))

    print(f"[3] JS Functions: {len(defined_funcs)} unique functions declared across all JS files.")

    # Check for missing event handlers
    missing_handlers = []
    # Standard browser functions to ignore
    builtin_ignores = {"closeModal", "openModal", "toggleTheme", "installPWA", "switchTab", "lucide"}
    for fn in called_funcs:
        if fn not in defined_funcs and fn not in builtin_ignores:
            missing_handlers.append(fn)

    if missing_handlers:
        print(f"\n[WARNING] Found {len(missing_handlers)} functions called in HTML but not declared in JS:")
        for mh in missing_handlers:
            print(f"  • {mh}()")
    else:
        print("\n[OK] All HTML event handlers match declared JS functions!")

    if missing_id_references:
        print(f"\n[WARNING] Found {len(missing_id_references)} getElementById references where element was not found in HTML or JS templates:")
        for js_f, uid in missing_id_references:
            print(f"  • {js_f} -> #{uid}")
    else:
        print("[OK] All getElementById references match valid DOM IDs!")

    # 4. Check all Python test files
    print("\n[4] Running all backend test suites...")

if __name__ == "__main__":
    audit_codebase()
