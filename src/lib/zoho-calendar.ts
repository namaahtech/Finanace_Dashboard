import { getSupabaseAdmin } from "@/lib/supabase";

const ZOHO_ACCOUNTS_URL  = process.env.ZOHO_ACCOUNTS_URL  || "https://accounts.zoho.in";
const ZOHO_CALENDAR_URL  = process.env.ZOHO_CALENDAR_URL  || "https://calendar.zoho.in/api/v1";

// ── Token management for Calendar ────────────────────────────────────────────

export async function getCalendarToken(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: cfg } = await supabase
    .from("zoho_calendar_config")
    .select("access_token, refresh_token, token_expiry, client_id, client_secret, id")
    .eq("is_connected", true)
    .maybeSingle();

  if (!cfg?.access_token) return null;

  const expiry     = cfg.token_expiry ? new Date(cfg.token_expiry) : null;
  const soonExpires = expiry && expiry <= new Date(Date.now() + 5 * 60 * 1000);

  if (soonExpires && cfg.refresh_token) {
    try {
      const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: cfg.refresh_token,
          client_id:     cfg.client_id,
          client_secret: cfg.client_secret,
          grant_type:    "refresh_token",
        }),
      });
      const json = await res.json();
      if (json?.access_token) {
        await supabase.from("zoho_calendar_config").update({
          access_token:  json.access_token,
          token_expiry:  new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString(),
          updated_at:    new Date().toISOString(),
        }).eq("id", cfg.id);
        return json.access_token;
      }
    } catch {}
  }

  return cfg.access_token;
}

export function buildCalendarOAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    scope:         "ZohoCalendar.calendar.ALL,ZohoCalendar.event.ALL",
    redirect_uri:  redirectUri,
    access_type:   "offline",
    prompt:        "consent",
  });
  return `${ZOHO_ACCOUNTS_URL}/oauth/v2/auth?${params.toString()}`;
}

// ── Zoho Calendar API helpers ─────────────────────────────────────────────────

async function calGet(token: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${ZOHO_CALENDAR_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  if (!res.ok) throw new Error(`Zoho Calendar GET ${path} → ${res.status}`);
  return res.json();
}

async function calPost(token: string, path: string, body: unknown) {
  const res = await fetch(`${ZOHO_CALENDAR_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization:  `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Zoho Calendar POST ${path} → ${res.status}`);
  return res.json();
}

// ── Get events for a user ─────────────────────────────────────────────────────

export async function getZohoEvents(token: string, calendarUid: string, params: {
  startTime: string;
  endTime:   string;
  limit?:    number;
}): Promise<any[]> {
  try {
    const res = await calGet(token, `/calendars/${calendarUid}/events`, {
      sdate: params.startTime,
      edate: params.endTime,
      range: String(params.limit || 50),
    });
    return res?.events || [];
  } catch {
    return [];
  }
}

// ── Create an event ───────────────────────────────────────────────────────────

export async function createZohoEvent(token: string, calendarUid: string, event: {
  title:       string;
  description?: string;
  startTime:   string;
  endTime:     string;
  allDay?:     boolean;
  attendees?:  string[];
  recurrence?: string;
}) {
  const body: any = {
    title:       event.title,
    description: event.description || "",
    dateandtime: {
      start:    event.startTime,
      end:      event.endTime,
      timezone: "Asia/Kolkata",
    },
    isallday: event.allDay || false,
  };
  if (event.attendees?.length) {
    body.attendees = event.attendees.map(e => ({ email: e }));
  }
  if (event.recurrence) {
    body.recurrence = event.recurrence;
  }
  return calPost(token, `/calendars/${calendarUid}/events`, body);
}

// ── Statutory recurring events seed data ────────────────────────────────────

export const STATUTORY_EVENTS = [
  {
    title:       "Generate Payslips",
    description: "Monthly payslip generation deadline",
    dayOfMonth:  28,
    color:       "#ef4444",
    calendar_type: "statutory" as const,
    department:  "Accounts",
    recurrence:  "FREQ=MONTHLY;BYMONTHDAY=28",
  },
  {
    title:       "TDS Payment Deadline",
    description: "Monthly TDS deposit to government",
    dayOfMonth:  7,
    color:       "#f97316",
    calendar_type: "statutory" as const,
    department:  "Accounts",
    recurrence:  "FREQ=MONTHLY;BYMONTHDAY=7",
  },
  {
    title:       "GSTR-1 Filing",
    description: "Monthly GST return filing",
    dayOfMonth:  11,
    color:       "#eab308",
    calendar_type: "statutory" as const,
    department:  "Accounts",
    recurrence:  "FREQ=MONTHLY;BYMONTHDAY=11",
  },
  {
    title:       "GSTR-3B Filing",
    description: "Monthly GST summary return",
    dayOfMonth:  20,
    color:       "#eab308",
    calendar_type: "statutory" as const,
    department:  "Accounts",
    recurrence:  "FREQ=MONTHLY;BYMONTHDAY=20",
  },
  {
    title:       "PF / ESI Payment",
    description: "Monthly Provident Fund and ESI deposit",
    dayOfMonth:  15,
    color:       "#8b5cf6",
    calendar_type: "statutory" as const,
    department:  "Accounts",
    recurrence:  "FREQ=MONTHLY;BYMONTHDAY=15",
  },
];

// Quarterly dates: Advance Tax
export const ADVANCE_TAX_DATES = [
  { month: 6,  day: 15, year: 2026 },
  { month: 9,  day: 15, year: 2026 },
  { month: 12, day: 15, year: 2026 },
  { month: 3,  day: 15, year: 2027 },
];

// Quarterly: TDS Return
export const TDS_RETURN_DATES = [
  { month: 7,  day: 31, year: 2026 },
  { month: 10, day: 31, year: 2026 },
  { month: 1,  day: 31, year: 2027 },
  { month: 5,  day: 31, year: 2027 },
];
