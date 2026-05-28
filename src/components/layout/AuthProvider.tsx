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

// ─── Types ───────────────────────────────────────────────────

export type Role = "admin" | "hr" | "accounts" | "employee" | "intern";

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
}

export function getDashboardForRole(role: Role): string {
  switch (role) {
    case "admin":    return "/admin";
    case "hr":       return "/hr";
    case "accounts": return "/accounts";
    case "employee":
    case "intern":
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

        if (error || !session?.user) {
          if (mounted) setUser(null);
          return;
        }

        const { data: emp, error: empErr } = await supabase
          .from("employees")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (emp && !empErr && mounted) {
          setUser(emp as AuthUser);
          // Load permissions alongside the user (merged with per-employee overrides)
          const perms = await fetchPermissions(emp.role, emp.id);
          if (mounted) setPermissions(perms);
        } else if (mounted) {
          setUser(null);
        }
      } catch (err) {
        console.error("Session hydration error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    hydrateSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setPermissions(null);
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

  const login = useCallback(async (email: string, password: string) => {
    let loginEmail = email;

    // Try direct sign-in first
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    // If failed, check if it's a zoho/professional email and look up personal email
    if (authError || !authData.user) {
      try {
        const res = await fetch(`/api/auth/resolve-email?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const { personal_email } = await res.json();
          if (personal_email && personal_email !== email) {
            loginEmail = personal_email;
            const retry = await supabase.auth.signInWithPassword({ email: loginEmail, password });
            authData  = retry.data;
            authError = retry.error;
          }
        }
      } catch (_) {}
    }

    if (authError || !authData.user) {
      throw new Error(authError?.message || "Invalid credentials");
    }

    const { data: emp, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (empError || !emp) {
      await supabase.auth.signOut();
      throw new Error("No employee profile found for this account.");
    }

    setUser(emp as AuthUser);

    // Load permissions immediately after login (merged with per-employee overrides)
    const perms = await fetchPermissions(emp.role, emp.id);
    setPermissions(perms);

    // Route based on role
    router.push(getDashboardForRole(emp.role as Role));
  }, [router]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPermissions(null);
    router.push("/login");
  }, [router]);

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
