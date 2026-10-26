import sqlite3

def inspect_schema():
    conn = sqlite3.connect('calora.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND (name LIKE '%workout%' OR name LIKE '%exercise%')")
    for row in cursor.fetchall():
        print(f"--- Table: {row[0]} ---")
        print(row[1])
        print()

    # Also check rows count
    for tbl in ["exercises", "workout_plans", "user_workout_logs"]:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
            print(f"Row count for {tbl}: {cursor.fetchone()[0]}")
        except Exception as e:
            print(f"Error checking {tbl}: {e}")

if __name__ == "__main__":
    inspect_schema()
