import sqlite3

conn = sqlite3.connect('calora.db')
c = conn.cursor()

def test_exercise_search(query_text):
    stop_words = {'how', 'what', 'exercise', 'workout', 'routine', 'train', 'can', 'should', 'for', 'today', 'the', 'and', 'my', 'do'}
    raw_tokens = [w.strip('?,.!') for w in query_text.lower().split() if len(w) > 2]
    tokens = [w for w in raw_tokens if w not in stop_words]
    search_terms = []
    for t in tokens:
        search_terms.append(t)
        if t.endswith('s') and len(t) > 3:
            search_terms.append(t[:-1])
        if t.endswith('es') and len(t) > 4:
            search_terms.append(t[:-2])
            
    results = []
    seen = set()
    for term in search_terms:
        c.execute("""
        SELECT name, muscle_group, equipment, form_cues FROM exercises 
        WHERE LOWER(name) LIKE ? OR LOWER(muscle_group) LIKE ? OR LOWER(movement_pattern) LIKE ? OR LOWER(secondary_muscles) LIKE ?
        """, (f'%{term}%', f'%{term}%', f'%{term}%', f'%{term}%'))
        for r in c.fetchall():
            if r[0] not in seen:
                seen.add(r[0])
                results.append(r)
    print(f'Ex Query: "{query_text}" -> {len(results)} matches: {[r[0] for r in results[:3]]}')

test_exercise_search('How to do squats?')
test_exercise_search('What pushups should I do?')
test_exercise_search('Best lunges')
test_exercise_search('Chest exercises')
