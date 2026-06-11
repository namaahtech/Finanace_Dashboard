const fetch = require('node-fetch'); // we can also just use global fetch if node is v18+
require('dotenv').config({ path: '.env.local' });

const openrouterKey = process.env.MY_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

if (!openrouterKey) {
  console.error("OpenRouter API key not found in .env.local");
  process.exit(1);
}

const models = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "qwen/qwen3-coder:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
  "poolside/laguna-m.1:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "moonshotai/kimi-k2.6:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "openai/gpt-oss-20b:free",
  "poolside/laguna-xs.2:free",
  "nex-agi/nex-n2-pro:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "meta-llama/llama-3.2-3b-instruct:free"
];

async function testModel(model) {
  const start = Date.now();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Namaah Nexus Test"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "say hi" }],
        max_tokens: 5
      }),
      signal: controller.signal
    });

    clearTimeout(id);
    const duration = Date.now() - start;

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      return { model, success: true, duration, text, status: res.status };
    } else {
      const text = await res.text();
      return { model, success: false, duration, error: text, status: res.status };
    }
  } catch (err) {
    clearTimeout(id);
    const duration = Date.now() - start;
    return { model, success: false, duration, error: err.message || err };
  }
}

async function runTests() {
  console.log("Testing OpenRouter free models concurrently...");
  const results = await Promise.all(models.map(m => testModel(m)));
  
  console.log("\n--- Successful Models ---");
  results
    .filter(r => r.success)
    .sort((a, b) => a.duration - b.duration)
    .forEach(r => {
      console.log(`✓ ${r.model} - ${r.duration}ms - Response: "${r.text}"`);
    });

  console.log("\n--- Failed Models ---");
  results
    .filter(r => !r.success)
    .forEach(r => {
      console.log(`✗ ${r.model} - Status: ${r.status || 'N/A'} - Error: ${r.error}`);
    });
}

runTests();
