import { NextRequest, NextResponse } from "next/server";

// Only these personal email domains are accepted
const ALLOWED_DOMAINS = new Set([
  // Gmail
  "gmail.com",
  // Yahoo
  "yahoo.com", "yahoo.in", "yahoo.co.in", "yahoo.co.uk",
  // Zoho personal
  "zoho.com", "zoho.in",
  // Outlook / Microsoft
  "outlook.com", "outlook.in", "hotmail.com", "live.com",
]);

// Common typo → correct domain
const TYPO_MAP: Record<string, string> = {
  "gmali.com": "gmail.com", "gmai.com": "gmail.com", "gmial.com": "gmail.com",
  "gmail.co": "gmail.com", "gmail.cm": "gmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com",
  "outloo.com": "outlook.com", "outlok.com": "outlook.com",
};

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ valid: false, reason: "Invalid email format." });
  }

  const domain = email.split("@")[1];

  // Typo correction first
  if (TYPO_MAP[domain]) {
    const corrected = email.replace(`@${domain}`, `@${TYPO_MAP[domain]}`);
    return NextResponse.json({
      valid: false,
      reason: `Looks like a typo — did you mean ${corrected}?`,
      suggestion: corrected,
    });
  }

  // Domain allowlist check
  if (!ALLOWED_DOMAINS.has(domain)) {
    return NextResponse.json({
      valid: false,
      reason: `Only Gmail, Yahoo, Zoho, and Outlook personal emails are allowed. "${domain}" is not accepted.`,
    });
  }

  return NextResponse.json({ valid: true });
}
