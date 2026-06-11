import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Edge auth gate.
//   - Unauthenticated users hitting any protected route are redirected to /login
//   - Authenticated users hitting /login are redirected to their role's home
//   - Public routes pass through untouched
//
// Page-level permission gating (moduleKey → can_view) still happens inside
// DashboardShell; this middleware only blocks unauthenticated access at the
// edge so users can't briefly see protected UI before the client redirects.

const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/forgot-credentials",
  "/onboarding",
  "/career",
  "/careers",
];

const PUBLIC_PREFIXES = [
  "/_next",
  "/api/auth",          // login / logout / resolve-email
  "/api/health",
  "/favicon",
  "/robots.txt",
  "/sitemap.xml",
  "/meet",              // public LiveKit meet rooms (token-gated server-side)
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return false; // root → server-side role router
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next.js internals + explicit public routes
  if (isPublic(pathname)) return NextResponse.next();

  // Bail out gracefully if Supabase env vars aren't set (e.g. preview build
  // for a branch that hasn't been linked). Without this, middleware would
  // throw on every request and crash the entire app.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  let session = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error && (error.message?.includes("Refresh Token") || error.message?.includes("refresh_token"))) {
      throw error;
    }
    session = data?.session || null;
  } catch (err) {
    console.error("Middleware session check failed:", err);
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "session_expired");
    if (pathname !== "/") redirectUrl.searchParams.set("next", pathname);
    
    const responseWithRedirect = NextResponse.redirect(redirectUrl);
    responseWithRedirect.cookies.delete("sb-access-token");
    responseWithRedirect.cookies.delete("sb-refresh-token");
    return responseWithRedirect;
  }

  // Unauthenticated → /login (preserve intended destination)
  if (!session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    if (pathname !== "/") redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Match everything except next internals, static assets, and image optimizer.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};
