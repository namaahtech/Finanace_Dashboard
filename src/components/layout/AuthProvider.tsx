"use client";

import {
 createContext,
 useContext,
 useEffect,
 useState,
 useCallback,
} from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface AuthUser {
 id: string;
 name: string;
 email: string;
 role: "employee" | "hr" | "lead" | "super_admin";
 employeeId: string;
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

 useEffect(() => {
 axios
 .get("/api/auth/me")
 .then((res) => setUser(res.data.user))
 .catch(() => setUser(null))
 .finally(() => setLoading(false));
 }, []);

 const login = useCallback(async (email: string, password: string) => {
 const res = await axios.post("/api/auth/login", { email, password });
 const { user: u } = res.data;
 setUser(u);
 if (u.role === "employee") router.push("/dashboard");
 else if (u.role === "lead") router.push("/admin/kpi");
 else router.push("/admin");
 }, [router]);

 const logout = useCallback(async () => {
 await axios.post("/api/auth/logout");
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
