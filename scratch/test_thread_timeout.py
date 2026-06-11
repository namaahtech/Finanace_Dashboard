import os
import requests
import time
import threading
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")
openrouter_key = os.getenv("MY_OPENROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY")

prompt = "say hi"
model = "nvidia/nemotron-3-ultra-550b-a55b:free"

def call_with_timeout(model_name, timeout_sec):
    result = {}
    
    def target():
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
                    "model": model_name,
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
                timeout=timeout_sec
            )
            result['response'] = res
        except Exception as e:
            result['error'] = e

    thread = threading.Thread(target=target)
    thread.daemon = True
    start_time = time.time()
    thread.start()
    thread.join(timeout=timeout_sec)
    
    duration = time.time() - start_time
    if thread.is_alive():
        return None, f"THREAD_TIMEOUT (took {duration:.2f}s)"
    
    if 'error' in result:
        return None, f"ERROR: {result['error']} (took {duration:.2f}s)"
        
    return result.get('response'), f"SUCCESS (took {duration:.2f}s)"

print("Starting thread timeout test...")
res, msg = call_with_timeout(model, 10)
print("Result message:", msg)
if res:
    print("Response Status:", res.status_code)
