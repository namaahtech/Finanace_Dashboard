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

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "employee" | "hr" | "lead" | "super_admin" | "accounts" | "sales" | "manager";
  employee_id: string;
  department: string;
  designation: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On Mount: Check Supabase Authentication Status natively
  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
          if (mounted) setUser(null);
          return;
        }

        // Cross-verify with Employee Architecture Matrix
        const { data: emp, error: empErr } = await supabase
          .from("employees")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (emp && !empErr && mounted) {
          setUser(emp as AuthUser);
        } else if (mounted) {
          setUser(null);
        }
      } catch (err) {
        console.error("Hydration Error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    hydrateSession();

    // Secure persistent listener for live token changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") setUser(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // 1. Direct Handshake with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || "Invalid Key Exchange");
    }

    // 2. Fetch internal mapping
    const { data: emp, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (empError || !emp) {
      // Revert if mapped profile doesn't exist
      await supabase.auth.signOut();
      throw new Error("No architectural employee profile mapped to this credential.");
    }

    setUser(emp as AuthUser);

    // 3. Dynamic Router Injection
    if (emp.role === "employee") router.push("/dashboard");
    else if (emp.role === "lead") router.push("/lead/dashboard");
    else if (emp.role === "manager") router.push("/manager/dashboard");
    else router.push("/admin");
  }, [router]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
