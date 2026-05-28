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

// ── AI helpers (Gemma via LOCAL_AI_ENDPOINT) ─────────────────

export async function callGemma(prompt: string): Promise<string> {
  const endpoint = process.env.LOCAL_AI_ENDPOINT;
  const model    = process.env.LOCAL_AI_MODEL    || "gemma4:e4b";
  const key      = process.env.AI_BRIDGE_KEY;

  if (!endpoint) return "";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!res.ok) return "";
  const data = await res.json();
  return data?.response || data?.output || "";
}

export async function classifyEmail(subject: string, preview: string, fromName: string) {
  const prompt = `Classify this email. Reply with ONLY a JSON object: {"category":"URGENT|WORK|FINANCE|FOLLOW_UP|GENERAL","priority":1-5,"sentiment":"POSITIVE|NEGATIVE|NEUTRAL","summary":"one sentence summary"}

From: ${fromName}
Subject: ${subject}
Preview: ${preview}

JSON:`;

  const raw = await callGemma(prompt);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return { category: "GENERAL", priority: 3, sentiment: "NEUTRAL", summary: preview?.slice(0, 100) };
}

export async function generateReplySuggestions(subject: string, body: string): Promise<string[]> {
  const prompt = `Suggest 3 short professional email replies (1-2 sentences each) for:
Subject: ${subject}
Body: ${body?.slice(0, 500)}

Reply with a JSON array of 3 strings. Example: ["Thanks for your email...", "Noted, we will...", "I appreciate..."]
JSON:`;

  const raw = await callGemma(prompt);
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return [
    "Thank you for your email. I'll get back to you shortly.",
    "Noted. I will review this and respond within 24 hours.",
    "Thanks for reaching out. Let me check and confirm.",
  ];
}

export async function summarizeThread(messages: { subject: string; from: string; body: string }[]): Promise<string> {
  const conversation = messages
    .slice(0, 5)
    .map((m) => `From: ${m.from}\nSubject: ${m.subject}\n${m.body?.slice(0, 300)}`)
    .join("\n---\n");

  const prompt = `Summarize this email thread in 2-3 sentences. Be concise and professional.\n\n${conversation}\n\nSummary:`;
  return callGemma(prompt);
}
