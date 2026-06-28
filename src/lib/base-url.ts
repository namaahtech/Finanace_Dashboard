// Resolve the public base URL for building magic links.
// Order: the live request's own origin (so links match whatever domain the app is
// being used on — localhost in dev, the real domain in prod, automatically) →
// env override → localhost. No env juggling needed to switch environments.
export function baseUrlFrom(req?: { headers: Headers } | null): string {
  if (req) {
    const h = req.headers;
    const origin = h.get("origin");
    if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/+$/, "");
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ||
        (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}
