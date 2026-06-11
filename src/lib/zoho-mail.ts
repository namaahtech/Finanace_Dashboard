import {
  ZOHO_API,
  buildZohoOAuthUrl,
  exchangeCodeForTokens,
  getZohoToken,
  refreshAccessToken,
} from "@/lib/zoho-auth";

const ZOHO_MAIL_API_URL = ZOHO_API.mail;

// ── Token management (unified — see zoho-auth.ts) ────────────
// Mail uses the single shared connection. These re-exports keep existing
// call sites working while the token/OAuth logic lives in one place.

export { exchangeCodeForTokens, refreshAccessToken };

/** @deprecated use getZohoToken() from "@/lib/zoho-auth" — kept for back-compat. */
export const getActiveToken = getZohoToken;

/** Mail connect URL — now requests the unified scope set (Mail + Calendar + …). */
export function buildOAuthUrl(clientId: string, redirectUri: string): string {
  return buildZohoOAuthUrl(clientId, redirectUri);
}

// ── HTTP helpers ─────────────────────────────────────────────

export async function zohoGet(token: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${ZOHO_MAIL_API_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho GET ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

export async function zohoPost(token: string, path: string, body: unknown) {
  const res = await fetch(`${ZOHO_MAIL_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

export async function zohoPatch(token: string, path: string, body: unknown) {
  const res = await fetch(`${ZOHO_MAIL_API_URL}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho PATCH ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

export async function zohoDelete(token: string, path: string) {
  const res = await fetch(`${ZOHO_MAIL_API_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho DELETE ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── AI helpers (MoonshotAI Kimi K2.6 via OpenRouter with Gemma Fallback) ─────────────────

export function stripHtml(html: string): string {
  if (!html) return "";
  // Remove style blocks
  let clean = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // Remove script blocks
  clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  // Remove HTML comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");
  // Remove HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  clean = clean
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Normalize whitespace
  clean = clean.replace(/\s+/g, " ").trim();
  return clean;
}

/**
 * System prompt enforcing English-only output, professional accuracy,
 * and strict structured response format.
 */
const AI_SYSTEM_PROMPT = `You are a highly accurate professional business AI assistant for Namaah — a corporate HR and operations platform.

STRICT RULES — follow these without exception:
1. LANGUAGE: You MUST respond ONLY in English. Regardless of what language the input email is written in, your output MUST always be in English only. Never output any other language.
2. ACCURACY: Be precise, factual, and context-aware. Do not hallucinate or guess information not present in the input.
3. FORMAT: Always respond strictly in the exact JSON format requested. Do not add markdown code fences, explanations, or any text outside the JSON.
4. PROFESSIONALISM: Maintain a formal, corporate business tone at all times.
5. ENGLISH ONLY: If input contains non-English text, still respond fully in English.`;

export async function callGemma(
  prompt: string,
  opts?: { systemPrompt?: string; maxTokens?: number; temperature?: number; models?: string[] }
): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.MY_OPENROUTER_API_KEY;
  if (openrouterKey) {
    // 18-model waterfall — skips rate-limited models instantly, no long waits
    const DEFAULT_CHAIN = [
      // Tier 1 — strongest, best for structured/writing tasks
      "moonshotai/kimi-k2.6:free",
      "deepseek/deepseek-r1-0528:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "qwen/qwen3-235b-a22b:free",
      "deepseek/deepseek-chat-v3-0324:free",
      // Tier 2 — large generalist models
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen2.5-72b-instruct:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "tngtech/deepseek-r1t-chimera:free",
      "thudm/glm-4-32b:free",
      // Tier 3 — mid-size reliable fallbacks
      "qwen/qwen3-14b:free",
      "google/gemma-3-27b-it:free",
      "meta-llama/llama-3.1-70b-instruct:free",
      "qwen/qwen2.5-7b-instruct:free",
      // Tier 4 — small but always available
      "google/gemma-3-12b-it:free",
      "google/gemma-2-9b-it:free",
      "mistralai/mistral-7b-instruct:free",
      "meta-llama/llama-3.1-8b-instruct:free",
    ];

    const modelChain = opts?.models ?? DEFAULT_CHAIN;

    for (const model of modelChain) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "Namaah Nexus",
            "Accept-Language": "en",
          },
          body: JSON.stringify({
            model,
            temperature: opts?.temperature ?? 0.2,
            top_p: 0.9,
            max_tokens: opts?.maxTokens ?? 1024,
            messages: [
              { role: "system", content: opts?.systemPrompt ?? AI_SYSTEM_PROMPT },
              { role: "user",   content: prompt },
            ],
          }),
        });

        // 429 = rate-limited → skip instantly to next model, no wait
        if (res.status === 429) {
          console.warn(`[OpenRouter] ${model} → 429, trying next...`);
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.warn(`[OpenRouter] ${model} → ${res.status}: ${errText.slice(0, 120)}`);
          continue;
        }

        const data    = await res.json();
        const content = data?.choices?.[0]?.message?.content || "";
        if (content) {
          console.info(`[OpenRouter] ✓ ${model}`);
          return content;
        }
        console.warn(`[OpenRouter] ${model} → empty response, trying next...`);

      } catch (e: any) {
        console.warn(`[OpenRouter] ${model} → exception: ${e.message}`);
      }
    }

    console.warn("[OpenRouter] All 18 models exhausted.");
  }

  // ── Local Gemma fallback (Ollama /api/generate) ─────────────
  const endpoint = process.env.LOCAL_AI_ENDPOINT;
  const model    = process.env.LOCAL_AI_MODEL || "gemma4:e4b";
  const key      = process.env.AI_BRIDGE_KEY;

  if (!endpoint) return "";

  console.info(`[Gemma] OpenRouter exhausted — using local model ${model}`);

  try {
    const sysPrompt = opts?.systemPrompt ?? AI_SYSTEM_PROMPT;
    // Ollama /api/generate supports a top-level "system" field
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        model,
        system: sysPrompt,
        prompt,
        stream: false,
        options: {
          temperature: opts?.temperature ?? 0.4,
          num_predict: opts?.maxTokens   ?? 4096, // Gemma is unlimited — let it write full HTML
        },
      }),
    });

    if (!res.ok) {
      console.warn(`[Gemma] ${res.status} from local endpoint`);
      return "";
    }
    const data = await res.json();
    const output = data?.response || data?.output || data?.choices?.[0]?.message?.content || "";
    if (output) console.info(`[Gemma] ✓ local response (${output.length} chars)`);
    return output;
  } catch (e: any) {
    console.warn("[Gemma] local endpoint error:", e.message);
    return "";
  }
}

export async function classifyEmail(subject: string, preview: string, fromName: string) {
  const cleanBody = stripHtml(preview);
  const prompt = `TASK: Classify the following business email into exactly one category and analyze its properties.

EMAIL DETAILS:
- From: ${fromName}
- Subject: ${subject}
- Content: ${cleanBody?.slice(0, 1200)}

CLASSIFICATION RULES:
- category: Choose EXACTLY ONE of: URGENT (requires immediate action within 24h), WORK (general work tasks, projects, meetings), FINANCE (invoices, payments, budgets, expenses), FOLLOW_UP (follow-ups, reminders, pending actions), GENERAL (newsletters, announcements, FYI)
- priority: Integer from 1 (highest urgency) to 5 (lowest urgency). URGENT = 1, most WORK = 2-3, GENERAL = 4-5
- sentiment: POSITIVE (good news, approvals, appreciation), NEGATIVE (complaints, rejections, issues, urgency), NEUTRAL (informational, routine)
- summary: One clear, concise English sentence summarizing the core message (max 100 chars)

OUTPUT: Respond with ONLY a valid JSON object. No markdown. No explanation. English only.
{"category":"...","priority":...,"sentiment":"...","summary":"..."}`;

  const raw = await callGemma(prompt);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return { category: "GENERAL", priority: 3, sentiment: "NEUTRAL", summary: cleanBody?.slice(0, 100) || preview?.slice(0, 100) };
}

export async function generateReplySuggestions(subject: string, body: string): Promise<string[]> {
  const cleanBody = stripHtml(body);
  const prompt = `TASK: Generate exactly 3 professional email reply suggestions in English for the following received business email.

RECEIVED EMAIL:
- Subject: ${subject}
- Body: ${cleanBody?.slice(0, 2500)}

REPLY GUIDELINES:
- Each reply must be 1-2 sentences maximum
- Replies must be professional, polite, and directly relevant to the email content
- Cover different tones/approaches: e.g., one confirming/acknowledging, one requesting more info, one with a concrete next step
- ALL replies MUST be written in English only — never any other language
- Do NOT include greetings like "Dear..." or signatures — just the core reply body
- Make replies specific to the actual email content, not generic filler

OUTPUT: Respond with ONLY a valid JSON array of exactly 3 strings. No markdown. No explanation. English only.
["reply 1","reply 2","reply 3"]`;

  const raw = await callGemma(prompt);
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return [
    "Thank you for your email. I'll review the details and get back to you shortly.",
    "Noted. I will follow up on this within 24 hours.",
    "Appreciate you reaching out. Could you please provide any additional details so I can assist you better?",
  ];
}

export async function summarizeThread(messages: { subject: string; from: string; body: string }[]): Promise<string> {
  const conversation = messages
    .slice(0, 5)
    .map((m) => `From: ${m.from}\nSubject: ${m.subject}\nContent: ${stripHtml(m.body)?.slice(0, 1200)}`)
    .join("\n---\n");

  const prompt = `TASK: Summarize the following email thread in 2-3 concise sentences in English.

EMAIL THREAD:
${conversation}

SUMMARY RULES:
- Be factual and concise — only include information present in the thread
- Identify the main topic, key decisions, and any pending action items
- Output in English only — regardless of the language the emails are written in
- Professional corporate tone

OUTPUT: Respond with ONLY the summary text in plain English. No JSON. No markdown.
Summary:`;
  return callGemma(prompt);
}

