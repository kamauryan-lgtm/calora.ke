import os
import re

def verify_js_syntax():
    js_dir = os.path.join("static", "js")
    all_ok = True

    for fname in os.listdir(js_dir):
        if not fname.endswith(".js"):
            continue
        fpath = os.path.join(js_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            code = f.read()

        # Check bracket balancing (ignoring comments and strings)
        stack = []
        in_s_quote = False
        in_d_quote = False
        in_template = False
        in_line_comment = False
        in_block_comment = False
        escape = False

        line_num = 1
        i = 0
        n = len(code)
        syntax_err = None

        while i < n:
            ch = code[i]
            if ch == '\n':
                line_num += 1
                if in_line_comment:
                    in_line_comment = False
                escape = False
                i += 1
                continue

            if escape:
                escape = False
                i += 1
                continue

            if ch == '\\':
                if in_s_quote or in_d_quote or in_template:
                    escape = True
                i += 1
                continue

            if in_line_comment:
                i += 1
                continue

            if in_block_comment:
                if ch == '*' and i + 1 < n and code[i+1] == '/':
                    in_block_comment = False
                    i += 2
                    continue
                i += 1
                continue

            if in_s_quote:
                if ch == "'":
                    in_s_quote = False
                i += 1
                continue

            if in_d_quote:
                if ch == '"':
                    in_d_quote = False
                i += 1
                continue

            if in_template:
                if ch == '`':
                    in_template = False
                i += 1
                continue

            # Check comments
            if ch == '/' and i + 1 < n:
                if code[i+1] == '/':
                    in_line_comment = True
                    i += 2
                    continue
                elif code[i+1] == '*':
                    in_block_comment = True
                    i += 2
                    continue

            # Check strings
            if ch == "'":
                in_s_quote = True
                i += 1
                continue
            if ch == '"':
                in_d_quote = True
                i += 1
                continue
            if ch == '`':
                in_template = True
                i += 1
                continue

            # Stack for brackets
            if ch in '({[':
                stack.append((ch, line_num))
            elif ch in ')}]':
                if not stack:
                    syntax_err = f"Unmatched closing '{ch}' at line {line_num}"
                    break
                open_ch, open_line = stack.pop()
                expected = {')': '(', '}': '{', ']': '['}[ch]
                if open_ch != expected:
                    syntax_err = f"Mismatched bracket: expected '{expected}' for '{ch}' at line {line_num}, but got '{open_ch}' from line {open_line}"
                    break

            i += 1

        if not syntax_err:
            if in_s_quote:
                syntax_err = f"Unterminated single quote in {fname}"
            elif in_d_quote:
                syntax_err = f"Unterminated double quote in {fname}"
            elif in_template:
                syntax_err = f"Unterminated template literal in {fname}"
            elif in_block_comment:
                syntax_err = f"Unterminated block comment in {fname}"
            elif stack:
                ch, ln = stack[-1]
                syntax_err = f"Unclosed bracket '{ch}' from line {ln} in {fname}"

        if syntax_err:
            print(f"[FAIL] {fname}: {syntax_err}")
            all_ok = False
        else:
            print(f"[PASS] {fname}: Balanced brackets and quotes.")

    if all_ok:
        print("\nAll JavaScript files passed syntax and structure verification!")

if __name__ == "__main__":
    verify_js_syntax()
