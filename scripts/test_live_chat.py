import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Login
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/demo-login?role=user', method='POST')
token = json.loads(urllib.request.urlopen(req).read())['token']

queries = ['How many calories in pilau?', 'What exercises can I do for chest?']
for q in queries:
    chat_req = urllib.request.Request('http://127.0.0.1:8000/api/assistant/chat',
        data=json.dumps({'query': q, 'date_str': '2026-10-26'}).encode(),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='POST')
    resp = json.loads(urllib.request.urlopen(chat_req).read())
    print('Q:', q)
    print('A:', resp['response'][:160].replace('\n', ' '))
    print('-' * 50)
