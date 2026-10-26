import sqlite3
import json

def inspect_plans():
    conn = sqlite3.connect('calora.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, level, goal, estimated_duration_min, schedule_json FROM workout_plans")
    for r in cursor.fetchall():
        print(f"=== {r[0]}: {r[1]} ({r[2]}, {r[3]}, ~{r[4]}m) ===")
        try:
            sched = json.loads(r[5])
            print(json.dumps(sched, indent=2)[:500])
        except Exception as e:
            print("schedule_json error:", e, r[5][:100])
        print()

if __name__ == "__main__":
    inspect_plans()
