import { getSupabaseAdmin } from "@/lib/supabase";

const ZOHO_ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.in";
const ZOHO_MAIL_API_URL = process.env.ZOHO_MAIL_API_URL || "https://mail.zoho.in/api";

// ── Token management ─────────────────────────────────────────

export async function getActiveToken(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: config } = await supabase
    .from("zoho_config")
    .select("id, access_token, refresh_token, token_expiry, client_id, client_secret, is_connected")
    .eq("is_connected", true)
    .maybeSingle();

  if (!config?.access_token) return null;

  const expiresAt = config.token_expiry ? new Date(config.token_expiry) : null;
  const soonExpires = expiresAt && expiresAt <= new Date(Date.now() + 5 * 60 * 1000);

  if (soonExpires && config.refresh_token) {
    const refreshed = await refreshAccessToken(
      config.client_id,
      config.client_secret,
      config.refresh_token
    );
    if (refreshed?.access_token) {
      await supabase.from("zoho_config").update({
        access_token: refreshed.access_token,
        token_expiry: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", config.id);
      return refreshed.access_token;
    }
    return null;
  }

  return config.access_token;
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<any> {
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<any> {
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

export function buildOAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "ZohoMail.messages.ALL,ZohoMail.accounts.ALL,ZohoMail.organization.ALL,ZohoMail.folders.ALL",
    redirect_uri: redirectUri,
    access_type: "offline",
    prompt: "consent",
  });
  return `${ZOHO_ACCOUNTS_URL}/oauth/v2/auth?${params.toString()}`;
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
