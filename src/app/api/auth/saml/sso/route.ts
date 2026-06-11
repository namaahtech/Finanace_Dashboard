import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateSAMLResponse } from "@/lib/saml";

export async function GET(req: NextRequest) {
  return handleSAMLRequest(req);
}

export async function POST(req: NextRequest) {
  return handleSAMLRequest(req);
}

async function handleSAMLRequest(req: NextRequest) {
  const session = await getSession();
  const nextUrl = req.nextUrl;
  const currentOrigin = nextUrl.origin;

  // Silent mode: the assertion is POSTed to Zoho from a hidden iframe so the user
  // never leaves the workspace. We render a bare, invisible auto-submit form
  // (no visible "Connecting to Zoho" UI) — the parent page has already routed the
  // user straight to their dashboard.
  const silentMode = nextUrl.searchParams.get("mode") === "silent";

  // 1. If not authenticated, redirect to login page with a return pointer
  if (!session?.userId) {
    const ssoPath = `${nextUrl.pathname}${nextUrl.search}`;
    const loginUrl = new URL(`/login`, currentOrigin);
    loginUrl.searchParams.set("next", ssoPath);
    return NextResponse.redirect(loginUrl.toString());
  }

  const supabase = getSupabaseAdmin();

  // 2. Fetch the user's active employee profile
  const { data: user, error: userErr } = await supabase
    .from("employees")
    .select("id, zoho_email, is_active, status, role")
    .eq("id", session.userId)
    .maybeSingle();

  if (userErr || !user) {
    return new NextResponse("User profile not found.", { status: 404 });
  }

  if (user.status === "disabled" || user.is_active === false) {
    return new NextResponse("Account deactivated.", { status: 403 });
  }

  // 3. Extract RelayState (destination after login — our dashboard route)
  let relayState = "";
  if (req.method === "GET") {
    relayState = nextUrl.searchParams.get("RelayState") || nextUrl.searchParams.get("relayState") || "/dashboard";
  } else {
    try {
      const formData = await req.formData();
      relayState = (formData.get("RelayState") as string) || (formData.get("relayState") as string) || "/dashboard";
    } catch {
      relayState = "/dashboard";
    }
  }

  // Ensure RelayState points to our origin (trusted paths only)
  if (relayState.startsWith("http://") || relayState.startsWith("https://")) {
    try {
      const parsedRelay = new URL(relayState);
      if (parsedRelay.origin !== currentOrigin && !parsedRelay.hostname.endsWith(".zoho.in") && !parsedRelay.hostname.endsWith(".zoho.com")) {
        relayState = "/dashboard";
      }
    } catch {
      relayState = "/dashboard";
    }
  }

  // Build the absolute fallback URL (where we redirect if SAML is not configured)
  const fallbackUrl = new URL(relayState.startsWith("/") ? relayState : `/${relayState}`, currentOrigin).toString();

  // Log audit event for this professional login (non-blocking)
  supabase.from("audit_logs").insert({
    actor_id:    user.id,
    user_id:     user.id,
    action:      "login_professional_zoho",
    table_name:  "employees",
    record_id:   user.id,
    target_type: "login",
    new_values:  {
      email:    user.zoho_email,
      method:   "professional_email_saml_sso",
      note:     "User signed in using company Zoho mail ID — SAML SSO flow triggered",
    },
  }).then(undefined, () => {});

  // 4. If user has no Zoho email, skip SAML and redirect directly
  if (!user.zoho_email) {
    return NextResponse.redirect(fallbackUrl);
  }

  // 5. Fetch SAML configuration
  const { data: config } = await supabase
    .from("zoho_config")
    .select("saml_enabled, saml_issuer, saml_acs_url, saml_private_key, saml_certificate, zoid, org_id")
    .maybeSingle();

  if (!config || !config.saml_enabled || !config.saml_private_key || !config.saml_certificate) {
    // SAML SSO not configured in our system — redirect directly (no error)
    console.log("[SAML SSO] SAML not configured, redirecting directly to:", relayState);
    return NextResponse.redirect(fallbackUrl);
  }

  // 6. Resolve the ACS URL (Zoho's SAML Assertion Consumer Service endpoint)
  let acsUrl = config.saml_acs_url;
  const zoid = config.zoid || config.org_id;

  if (!acsUrl) {
    const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.in";
    acsUrl = zoid ? `${accountsUrl}/samlresponse/${zoid}` : `${accountsUrl}/samlresponse`;
  } else if (zoid && acsUrl.endsWith("/samlresponse") && !acsUrl.includes(zoid)) {
    acsUrl = `${acsUrl}/${zoid}`;
  }

  // 7. Generate signed SAML assertion
  let samlResponse = "";
  try {
    samlResponse = generateSAMLResponse(
      user.zoho_email,
      acsUrl,
      config.saml_issuer || "namaah-nexus",
      config.saml_private_key,
      config.saml_certificate
    );
  } catch (err: any) {
    console.error("[SAML SSO] Signature generation failed:", err);
    // On signing error, fall back to direct redirect rather than showing an error
    return NextResponse.redirect(fallbackUrl);
  }

  console.log(`[SAML SSO] Submitting SAML assertion for ${user.zoho_email} → ${acsUrl}${silentMode ? " (silent/iframe)" : ""}`);

  // 7b. Stamp the one-time activation. Set only when currently NULL so the silent
  //     trigger fires exactly once (first company-mail login) and never again.
  supabase
    .from("employees")
    .update({ zoho_activated_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("zoho_activated_at", null)
    .then(({ error }) => {
      if (error) {
        // Column may not exist yet (pre-migration) — non-fatal, log and continue.
        console.warn("[SAML SSO] Could not stamp zoho_activated_at:", error.message);
      } else {
        supabase.from("audit_logs").insert({
          actor_id:    user.id,
          user_id:     user.id,
          action:      "zoho_sso_first_activation",
          table_name:  "employees",
          record_id:   user.id,
          target_type: "login",
          new_values:  {
            email:  user.zoho_email,
            mode:   silentMode ? "silent_iframe" : "full_redirect",
            note:   "First company-mail login — silent Zoho SAML SSO fired to activate Last Sign In",
          },
        }).then(undefined, () => {});
      }
    });

  // 8. Silent mode → bare invisible auto-submit form (stay inside the workspace).
  if (silentMode) {
    const silentHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>.</title></head>
<body style="margin:0;background:transparent">
  <form id="samlForm" method="POST" action="${acsUrl}">
    <input type="hidden" name="SAMLResponse" value="${samlResponse}" />
    <input type="hidden" name="RelayState" value="${relayState}" />
  </form>
  <script>document.getElementById('samlForm').submit();</script>
</body></html>`;
    return new NextResponse(silentHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // 8b. Full-page fallback — render an auto-submit page that POSTs the SAML assertion to Zoho
  //    After Zoho processes it, Zoho redirects to RelayState (our dashboard).
  //
  //    If Zoho rejects the assertion (certificate not configured in Zoho Admin Console),
  //    the fallback JS timer redirects the user directly to the dashboard after 8 seconds
  //    so they are never stuck on this page.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connecting to Zoho | Namaah Nexus</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card: #111827;
      --primary: #3b82f6;
      --primary-glow: rgba(59, 130, 246, 0.15);
      --text: #f3f4f6;
      --muted: #6b7280;
      --border: rgba(59, 130, 246, 0.2);
      --success: #10b981;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      background-image: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.08), transparent);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    .card {
      text-align: center;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 28px;
      padding: 48px 40px;
      width: 360px;
      box-shadow: 0 32px 64px -12px rgba(0,0,0,0.6), 0 0 80px var(--primary-glow);
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--primary), transparent);
      opacity: 0.8;
    }
    .logo {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: linear-gradient(135deg, #1d4ed8, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      box-shadow: 0 8px 24px rgba(59,130,246,0.4);
    }
    .logo svg { width: 28px; height: 28px; fill: white; }
    .spinner {
      position: relative;
      width: 64px;
      height: 64px;
      margin: 0 auto 28px;
    }
    .ring {
      position: absolute;
      inset: 0;
      border: 3px solid transparent;
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 1s cubic-bezier(0.6,0,0.4,1) infinite;
    }
    .ring:nth-child(2) {
      inset: 8px;
      border-top-color: transparent;
      border-right-color: rgba(59,130,246,0.4);
      animation-duration: 1.4s;
      animation-direction: reverse;
    }
    .ring-dot {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 10px; height: 10px;
      background: var(--primary);
      border-radius: 50%;
      box-shadow: 0 0 16px var(--primary);
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.7); }
    }
    h2 {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 13px;
      color: var(--muted);
      font-weight: 500;
      line-height: 1.5;
    }
    .steps {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-align: left;
    }
    .step {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: var(--muted);
      padding: 8px 12px;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.05);
      transition: all 0.3s;
    }
    .step.active { color: var(--text); border-color: var(--border); background: rgba(59,130,246,0.05); }
    .step.done { color: var(--success); }
    .step-icon {
      width: 20px; height: 20px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: 9px;
    }
    .step.active .step-icon { background: rgba(59,130,246,0.2); color: var(--primary); }
    .step.done .step-icon { background: rgba(16,185,129,0.2); color: var(--success); }
    .fallback {
      margin-top: 24px;
      font-size: 11px;
      color: var(--muted);
    }
    .fallback a { color: var(--primary); text-decoration: none; }
    .fallback a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    </div>
    <div class="spinner">
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring-dot"></div>
    </div>
    <h2>Connecting to Zoho Mail</h2>
    <p class="subtitle">Setting up your secure session automatically...</p>

    <div class="steps">
      <div class="step done" id="step1">
        <div class="step-icon">✓</div>
        <span>Login verified</span>
      </div>
      <div class="step active" id="step2">
        <div class="step-icon">⟳</div>
        <span>Activating Zoho session</span>
      </div>
      <div class="step" id="step3">
        <div class="step-icon">→</div>
        <span>Redirecting to dashboard</span>
      </div>
    </div>

    <p class="fallback">
      Taking too long? <a href="${fallbackUrl}" id="directLink">Go directly →</a>
    </p>
  </div>

  <form id="samlForm" method="POST" action="${acsUrl}">
    <input type="hidden" name="SAMLResponse" value="${samlResponse}" />
    <input type="hidden" name="RelayState" value="${relayState}" />
  </form>

  <script>
    // Step animation
    setTimeout(function() {
      document.getElementById('step2').classList.remove('active');
      document.getElementById('step2').classList.add('done');
      document.getElementById('step2').querySelector('.step-icon').textContent = '✓';
      document.getElementById('step3').classList.add('active');
    }, 1500);

    // Submit SAML form to Zoho
    setTimeout(function() {
      document.getElementById('samlForm').submit();
    }, 200);

    // Fallback: if Zoho doesn't redirect back within 8s, go directly
    // (happens if SAML cert is not configured in Zoho Admin Console)
    setTimeout(function() {
      window.location.href = '${fallbackUrl}';
    }, 8000);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
