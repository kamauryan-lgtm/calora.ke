import os
import re

def inspect_routes_and_frontend():
    print("--- 1. Extracting Backend Routes from app/main.py ---")
    with open(os.path.join("app", "main.py"), "r", encoding="utf-8") as f:
        main_py = f.read()

    route_pattern = re.compile(r'@app\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']')
    routes = {}
    for m in route_pattern.finditer(main_py):
        method, path = m.group(1).upper(), m.group(2)
        norm_path = re.sub(r'\{[^}]+\}', '*', path)
        routes[(method, norm_path)] = path
    print(f"Found {len(routes)} defined backend endpoints in main.py.")

    print("\n--- 2. Extracting Frontend API Calls from static/js/ ---")
    js_dir = os.path.join("static", "js")
    
    # Matches apiCall('/endpoint', 'METHOD', ...) or apiCall(`/endpoint/${...}`, ...)
    # or fetch('...')
    call_pattern = re.compile(r'(?:apiCall|fetch)\s*\(\s*([`\'"])(.*?)\1(?:\s*,\s*[`\'"]([A-Z]+)[`\'"])?', re.DOTALL)

    all_calls = []
    for fname in os.listdir(js_dir):
        if not fname.endswith(".js"):
            continue
        with open(os.path.join(js_dir, fname), "r", encoding="utf-8") as f:
            content = f.read()

        for m in call_pattern.finditer(content):
            quote, raw_url, explicit_method = m.group(1), m.group(2), m.group(3)
            # Clean up template substitutions
            clean_url = re.sub(r'\$\{[^}]+\}', '*', raw_url).strip()
            # Remove query params
            clean_url = clean_url.split("?")[0]
            # Infer method if not provided
            method = explicit_method.upper() if explicit_method else "GET"
            all_calls.append((fname, method, clean_url, raw_url))

    print(f"Found {len(all_calls)} apiCall/fetch invocations in JS files.")

    # Match each call against defined routes
    unmatched = []
    matched_count = 0
    for fname, method, norm_url, raw_url in all_calls:
        if not norm_url.startswith("/api/"):
            # Could be static file or external
            continue
        
        matched = False
        for (r_method, r_path), orig in routes.items():
            # Create regex pattern for r_path
            # r_path has '*' for path params
            regex = "^" + re.escape(r_path).replace(r"\*", r"[^/]+") + "$"
            if re.match(regex, norm_url):
                # Also check method if explicit
                if method == r_method or method == "GET": # sometimes apiCall default
                    matched = True
                    break
        if not matched:
            # Let's check if path matches any method
            matching_methods = [r_method for (r_method, r_path) in routes.keys() if re.match("^" + re.escape(r_path).replace(r"\*", r"[^/]+") + "$", norm_url)]
            unmatched.append((fname, method, norm_url, raw_url, matching_methods))
        else:
            matched_count += 1

    print(f"Matched {matched_count} internal API calls.")
    if unmatched:
        print(f"\n[!] Found {len(unmatched)} potentially unmatched API calls:")
        for fname, method, norm_url, raw_url, matching_methods in unmatched:
            print(f"  [{fname}] {method} {norm_url} (Raw: {raw_url}) -> Available methods: {matching_methods}")
    else:
        print("[OK] All internal frontend API calls match backend routes!")

if __name__ == "__main__":
    inspect_routes_and_frontend()
