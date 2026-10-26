import os
import re

def check_assets():
    index_html = os.path.join("static", "index.html")
    if not os.path.exists(index_html):
        print(f"Error: {index_html} not found!")
        return

    with open(index_html, "r", encoding="utf-8") as f:
        html = f.read()

    # Regex patterns for src and href
    patterns = [
        r'src=["\']([^"\']+)["\']',
        r'href=["\']([^"\']+)["\']',
    ]

    missing = []
    found = []

    for pattern in patterns:
        for match in re.finditer(pattern, html):
            path = match.group(1).strip()
            # Ignore absolute URLs, protocol-relative URLs, mailto, tel, anchor links, data URLs
            if path.startswith("http://") or path.startswith("https://") or path.startswith("//") or path.startswith("#") or path.startswith("mailto:") or path.startswith("tel:") or path.startswith("data:"):
                continue

            # Strip query string or hash
            clean_path = path.split("?")[0].split("#")[0]
            if not clean_path:
                continue

            # Resolve relative to static or root
            if clean_path.startswith("/"):
                # e.g., /static/css/style.css -> check both static/css/style.css and root
                rel = clean_path.lstrip("/")
                candidates = [
                    rel,
                    os.path.join("static", rel),
                    os.path.join("dist", rel)
                ]
                if rel.startswith("static/"):
                    candidates.append(rel[len("static/"):])
            else:
                candidates = [
                    os.path.join("static", clean_path),
                    clean_path,
                ]

            exists = any(os.path.exists(c) for c in candidates)
            if exists:
                found.append((path, [c for c in candidates if os.path.exists(c)][0]))
            else:
                missing.append(path)

    print(f"Total local references checked: {len(found) + len(missing)}")
    print(f"Valid references: {len(found)}")
    if missing:
        print(f"Missing references ({len(missing)}):")
        for m in missing:
            print(f"  - {m}")
    else:
        print("All asset references exist on disk!")

if __name__ == "__main__":
    check_assets()
