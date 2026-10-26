with open("static/index.html", "r", encoding="utf-8") as f:
    html = f.read()

print("Viewport meta tag present:", "viewport" in html)
print("Mobile nav present:", "mobile-nav" in html or "bottom-nav" in html or "sm:hidden" in html)
print("PWA manifest link present:", 'rel="manifest"' in html)
print("Service Worker registration present:", 'serviceWorker' in html)

# Check for fixed widths like w-[1000px] or style="width: ...px" that would cause horizontal scroll on mobile
import re
fixed_widths = re.findall(r'(?:class=["\'][^"\']*\bw-\[(\d+)px\][^"\']*["\']|style=["\'][^"\']*\bwidth:\s*(\d+)px[^"\']*["\'])', html)
big_fixed = [w[0] or w[1] for w in fixed_widths if int(w[0] or w[1]) > 380]
print(f"Fixed widths exceeding 380px: {big_fixed}")
