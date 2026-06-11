"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, LogOut } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

export type Role = "admin" | "hr" | "accounts" | "employee" | "intern" | "dept_lead" | "team_lead";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  employee_id: string;
  department: string;
  designation: string;
  is_dept_lead: boolean;
  is_team_lead: boolean;
  managed_department_id: string | null;
  managed_team_id: string | null;
  is_active?: boolean;
  deactivated_by?: string | null;
  deactivated_at?: string | null;
  deactivator?: {
    name: string;
    email: string;
    employee_id: string;
    role: string;
  } | null;
  zoho_email?: string | null;
  personal_email?: string | null;
}

export function getDashboardForRole(role: Role): string {
  switch (role) {
    case "admin":    return "/admin";
    case "hr":       return "/hr";
    case "accounts": return "/accounts";
    case "employee":
    case "intern":
    case "dept_lead":
    case "team_lead":
    default:         return "/dashboard";
  }
}

export interface PermissionNode {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

// moduleKey → what the user can do
export type PermissionMap = Record<string, PermissionNode>;

interface AuthContextType {
  user: AuthUser | null;
  permissions: PermissionMap | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Helper — fetch effective permissions (role defaults merged with per-employee overrides) ─
async function fetchPermissions(role: string, employeeId?: string): Promise<PermissionMap | null> {
  try {
    const qs = new URLSearchParams({ role });
    if (employeeId) qs.set("employee_id", employeeId);
    const res = await fetch(`/api/permissions?${qs.toString()}`);
    if (!res.ok) return null;
    const { permissions } = await res.json();
    return permissions ?? null;
  } catch {
    return null;
  }
}

// ─── Provider ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<PermissionMap | null>(null);
  const [loading, setLoading]         = useState(true);
  const [isRemoved, setIsRemoved]     = useState(false);
  const [removedMessage, setRemovedMessage] = useState("");
  const router = useRouter();

  // Reload permissions for the currently logged-in user
  const refreshPermissions = useCallback(async () => {
    if (!user) return;
    const perms = await fetchPermissions(user.role, user.id);
    setPermissions(perms);
  }, [user]);

  // On mount: hydrate from existing Supabase session
  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          const isStaleToken =
            error.message?.includes("Refresh Token") ||
            error.message?.includes("refresh_token") ||
            error.message?.includes("Invalid Refresh Token");

          if (isStaleToken) {
            // Expected: stale browser cookie after re-deploy or DB reset.
            // Sign out silently and send to login — no console.error so the
            // Next.js dev overlay doesn't surface this as a bug.
            await supabase.auth.signOut().catch(() => {});
            if (mounted) { setUser(null); setPermissions(null); }
            router.replace("/login");
            return;
          }
          // Unexpected error — log it
          console.warn("[AuthProvider] Session error:", error.message);
        }

        if (!session?.user) {
          if (mounted) setUser(null);
          return;
        }

        const { data: emp, error: empErr } = await supabase
          .from("employees")
          .select("*, deactivator:deactivated_by(name, email, employee_id, role)")
          .eq("id", session.user.id)
          .single();

        if (empErr) {
          if (empErr.message?.includes("not authorized") || empErr.code === "PGRST116") {
            await supabase.auth.signOut().catch(() => {});
            if (mounted) { setUser(null); setPermissions(null); }
            router.replace("/login?error=unauthorized");
            return;
          }
          console.warn("[AuthProvider] Profile load error:", empErr.message);
        }

        if (emp && !empErr && mounted) {
          setUser(emp as AuthUser);
          const perms = await fetchPermissions(emp.role, emp.id);
          if (mounted) setPermissions(perms);
        } else if (mounted) {
          setUser(null);
        }
      } catch (err: any) {
        const isStaleToken =
          err.message?.includes("Refresh Token") ||
          err.message?.includes("refresh_token") ||
          err.message?.includes("Invalid Refresh Token");

        if (isStaleToken) {
          await supabase.auth.signOut().catch(() => {});
          if (mounted) { setUser(null); setPermissions(null); }
          router.replace("/login");
        } else {
          console.warn("[AuthProvider] Hydration error:", err.message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    hydrateSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          if (event === "SIGNED_OUT") {
            setUser(null);
            setPermissions(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Real-time permissions sync — listens for DB changes on the role_permissions table.
  // When an admin saves permissions for a role, all logged-in users with that role
  // receive the update and immediately re-fetch their permissions.
  useEffect(() => {
    if (!user?.role) return;

    const channel = supabase
      .channel("permissions_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_permissions", filter: `role=eq.${user.role}` },
        async () => {
          const perms = await fetchPermissions(user.role, user.id);
          if (perms) setPermissions(perms);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_permissions", filter: `employee_id=eq.${user.id}` },
        async () => {
          const perms = await fetchPermissions(user.role, user.id);
          if (perms) setPermissions(perms);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.role, user?.id]);

  // Real-time employee status sync — listens to account activation/deactivation & deletion in real-time
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`employee_status_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees", filter: `id=eq.${user.id}` },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setIsRemoved(true);
            setRemovedMessage("You have been removed from the organization or company.");
            await supabase.auth.signOut();
          } else if (payload.eventType === "UPDATE") {
            const nextActive = payload.new.is_active;
            const nextStatus = payload.new.status;
            const nextDeactivatedBy = payload.new.deactivated_by;

            if (nextActive === false || nextStatus === "disabled") {
              setIsRemoved(true);
              setRemovedMessage("Your account has been deactivated. Please contact your administrator.");
              await supabase.auth.signOut();
            } else if (nextActive === true) {
              setUser(prev => prev ? { 
                ...prev, 
                is_active: true, 
                deactivated_by: null, 
                deactivated_at: null,
                deactivator: null 
              } as any : null);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    // 1. Run server-side pre-login checks to bypass RLS and apply onboarding guards
    const preLoginRes = await fetch("/api/auth/pre-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const preLoginData = await preLoginRes.json();
    if (!preLoginRes.ok) {
      throw new Error(preLoginData.error || "Authorization check failed.");
    }

    const { emailToAuth, isProfessionalLogin, zoho_email } = preLoginData;

    // 2. Authenticate against Supabase Auth using the correct identity email returned by the server
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    });

    // Fallback: if it fails, try signing in with their original input email (for legacy users)
    if ((authError || !authData.user) && emailToAuth !== email) {
      const retry = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (retry.data?.user && !retry.error) {
        authData = retry.data;
        authError = null;
      }
    }

    if (authError || !authData.user) {
      throw new Error(authError?.message || "Invalid credentials");
    }

    // 3. Fetch employee profile (since we are authenticated, the SELECT policy will permit this read)
    const { data: emp, error: empErr } = await supabase
      .from("employees")
      .select("*, deactivator:deactivated_by(name, email, employee_id, role)")
      .eq("id", authData.user.id)
      .single();

    if (empErr || !emp) {
      throw new Error("Unable to retrieve employee profile.");
    }

    // 4. Fetch onboarding status to route correctly
    const { data: onboarding } = await supabase
      .from("user_onboarding")
      .select("status")
      .eq("user_id", emp.id)
      .maybeSingle();

    const onboardingCompleted = onboarding?.status === "completed";

    setUser(emp as AuthUser);

    // Load permissions immediately after login (merged with per-employee overrides)
    const perms = await fetchPermissions(emp.role, emp.id);
    setPermissions(perms);

    // 5. Determine target route based on onboarding status
    const targetRoute = !onboardingCompleted
      ? "/onboarding"
      : getDashboardForRole(emp.role as Role);

    // 6. FIRST company-mail login → silently activate the user's Zoho session ONCE.
    //    Goal: flip the user's "Last Sign In" in the Zoho Admin Console from
    //    "Never signed in" → a real timestamp, WITHOUT the user ever leaving the
    //    workspace. We do this by POSTing a signed SAML assertion to Zoho's ACS
    //    from a hidden, off-screen iframe while the parent window routes the user
    //    straight to their dashboard.
    //
    //    "Once only" is gated on employees.zoho_activated_at: the SAML route stamps
    //    it the first time it fires, so subsequent logins skip the trigger entirely.
    //
    //    NOTE: For Zoho to accept the assertion (and update Last Sign In), the IdP
    //    certificate must be registered in the Zoho Admin Console under
    //    Security → Custom Authentication / SAML. Until then the assertion is sent
    //    but silently rejected by Zoho — no user-facing error either way.
    const alreadyActivated = Boolean((emp as any).zoho_activated_at);
    if (isProfessionalLogin && (zoho_email || emp.zoho_email) && !alreadyActivated) {
      // Persist the iron-session server-side so /api/auth/saml/sso can read userId
      // from the np_session cookie when the iframe requests it.
      try {
        const { data: sbSession } = await supabase.auth.getSession();
        if (sbSession?.session?.access_token) {
          await fetch("/api/auth/save-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token:  sbSession.session.access_token,
              refresh_token: sbSession.session.refresh_token,
              employee_id:   emp.id,
              role:          emp.role,
              email:         emp.email,
            }),
          });
        }
      } catch (e) {
        console.warn("[SAML] save-session failed, silent Zoho activation may not work:", e);
      }

      // Fire the SAML assertion to Zoho in a hidden iframe — the user stays here.
      try {
        const frame = document.createElement("iframe");
        frame.setAttribute("aria-hidden", "true");
        frame.style.cssText =
          "position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none;left:-9999px;top:-9999px";
        frame.src = `/api/auth/saml/sso?mode=silent&RelayState=${encodeURIComponent(targetRoute)}`;
        document.body.appendChild(frame);
        // Clean up after the assertion has been delivered to Zoho.
        setTimeout(() => { frame.remove(); }, 15000);
      } catch (e) {
        console.warn("[SAML] silent Zoho activation iframe failed:", e);
      }
    }

    // Route the user straight into the workspace — no full-page redirect to Zoho.
    router.push(targetRoute);
  }, [router]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPermissions(null);
    router.push("/login");
  }, [router]);

  if (isRemoved) {
    return <RemovedOverlay message={removedMessage} />;
  }

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

function RemovedOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 text-slate-100 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-red-500/20 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
          <ShieldAlert size={32} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-black tracking-tight text-white uppercase">Access Revoked</h2>
          <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">
            Security Policy Enforcement
          </p>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed font-medium">
          {message}
        </p>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-500 leading-normal text-left font-medium space-y-1">
          <p className="font-bold text-slate-400">⚠️ NOTICE:</p>
          <p>Your workspace session has been terminated. You can no longer access company resources, logs, or correspondence from this device.</p>
        </div>

        <button
          onClick={() => {
            window.location.href = "/login?revoked=true";
          }}
          className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogOut size={14} />
          Exit Workspace
        </button>
      </div>
    </div>
  );
}
