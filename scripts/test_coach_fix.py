import urllib.request
import json

def test_coach_default_query():
    # 1. Login as user
    req = urllib.request.Request(
        "http://localhost:8000/api/auth/demo-login?role=user",
        data=b"{}",
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        token = data["token"]
        print(f"Logged in: {data['user']['name']}")

    # 2. Test assistant chat with generic query that hits Case H (Default holistic response)
    chat_payload = json.dumps({
        "query": "Hello coach, what is my status?",
        "date_str": "2026-10-25"
    }).encode("utf-8")

    req_chat = urllib.request.Request(
        "http://localhost:8000/api/assistant/chat",
        data=chat_payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="POST"
    )
    with urllib.request.urlopen(req_chat) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("[SUCCESS] Coach response received without 500 error!")
        print("Response preview:")
        print(res["response"][:250])

if __name__ == "__main__":
    test_coach_default_query()
