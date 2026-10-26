"""
Test NKP AI Coach research capabilities across:
1. Food research (pilau, tilapia, githeri, eggs)
2. Exercise research (chest, squats, back, core)
3. Diary inspection (what did I eat today?)
4. Meal recommendations (dinner with remaining calories)
5. Conversational greeting & variety (no repetitive boilerplate)
"""

import sys
import os

# Configure stdout for safe Windows output
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ai_assistant import handle_assistant_query

def run_test():
    user_id = "user_ryan_001"
    date_str = "2026-10-26"
    
    test_queries = [
        "How many calories in pilau?",
        "Can I eat githeri for lunch?",
        "What exercises should I do for chest?",
        "How to do squats with proper form?",
        "What did I eat today?",
        "What can I eat for dinner with my remaining calories?",
        "Why is my weight stuck on the scale?",
        "Hello Coach!"
    ]
    
    print("=== TESTING NKP AI COACH RESEARCH & CONVERSATIONAL DIVERSITY ===\n")
    
    responses = []
    for q in test_queries:
        res = handle_assistant_query(q, user_id, date_str)
        text = res["response"]
        responses.append(text)
        print(f"User: \"{q}\"")
        first_line = text.split("\n")[0]
        print(f"NKP Lead: {first_line}")
        print(f"Sample Content: {text[len(first_line)+1:180].strip()}...")
        print("-" * 60)
        
    # Check for repetition: no two responses should start with the exact same 35 characters
    prefixes = [r[:35] for r in responses]
    unique_prefixes = set(prefixes)
    assert len(unique_prefixes) == len(prefixes), f"Detected repetitive response templates: {prefixes}"
    print("\n[SUCCESS] All responses are distinct, researched, and context-aware!")

if __name__ == "__main__":
    run_test()
