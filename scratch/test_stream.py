import os
import requests
import json
import time
from dotenv import load_dotenv

# Load dotenv relative to the file path
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.env.local"))
load_dotenv(dotenv_path=env_path)
openrouter_key = os.getenv("MY_OPENROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY")

prompt = "say hi"
model = "nvidia/nemotron-3-super-120b-a12b:free"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {openrouter_key}",
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Namaah Nexus Test"
}

payload = {
    "model": model,
    "messages": [{"role": "user", "content": prompt}],
    "stream": True
}

start = time.time()
print(f"Starting stream test for model: {model}")

try:
    # Set connect timeout to 8 seconds, and read timeout (for first chunk) to 12 seconds
    res = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        stream=True,
        timeout=(8, 12)
    )
    
    if not res.ok:
        print(f"Failed with status: {res.status_code}, error: {res.text}")
        exit(1)
        
    print(f"Headers received in {time.time() - start:.2f}s. Reading stream...")
    
    full_content = []
    # Read line by line
    for line in res.iter_lines():
        if line:
            # Lines are byte strings starting with b"data: "
            line_str = line.decode('utf-8').strip()
            if line_str.startswith("data: "):
                data_json = line_str[6:]
                if data_json == "[DONE]":
                    break
                try:
                    data = json.loads(data_json)
                    choice = data.get("choices", [{}])[0]
                    delta = choice.get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        full_content.append(content)
                        # Print in real-time
                        print(content, end="", flush=True)
                except Exception as e:
                    # sometimes metadata or keep-alive lines are sent
                    pass
                    
    print(f"\n\nStream finished! Total time: {time.time() - start:.2f}s")
    print("Full Content:", "".join(full_content))
    
except Exception as e:
    print(f"\nException: {e}")
