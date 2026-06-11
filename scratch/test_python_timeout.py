import os
import requests
import time
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")
openrouter_key = os.getenv("MY_OPENROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY")

prompt = "say hi"
model = "nvidia/nemotron-3-ultra-550b-a55b:free"

start = time.time()
print(f"Starting test for model: {model} with timeout=(6, 22)")

try:
    res = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {openrouter_key}",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Namaah Nexus"
        },
        json={
            "model": model,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a professional legal AI assistant that outputs clean, compliant, and beautifully designed HTML. Never include markdown fences."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        },
        timeout=(6, 22)
    )
    duration = time.time() - start
    print(f"Success! Status: {res.status_code}, Time: {duration:.2f}s")
    if res.ok:
        print("Response:", res.json().get("choices", [{}])[0].get("message", {}).get("content"))
    else:
        print("Error content:", res.text)
except Exception as e:
    duration = time.time() - start
    print(f"Exception after {duration:.2f}s: {e}")
