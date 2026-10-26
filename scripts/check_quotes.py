with open("static/js/assistant.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    # Count quotes
    single_quotes = line.count("'") - line.count("\\'")
    # If odd number of single quotes, print line
    if single_quotes % 2 != 0:
        print(f"Line {idx+1}: {line.strip()}")
