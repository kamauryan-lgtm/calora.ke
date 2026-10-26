import os

def check_refs():
    found = []
    for root, dirs, files in os.walk('.'):
        if '.git' in root or '__pycache__' in root:
            continue
        for f in files:
            p = os.path.join(root, f)
            try:
                with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                if 'mindgames' in content.lower() or 'mind-games' in content.lower() or 'c:\\pfolio' in content.lower():
                    found.append(p)
            except Exception:
                pass
    print("Found references to mindgames in Calora:", found)

if __name__ == "__main__":
    check_refs()
