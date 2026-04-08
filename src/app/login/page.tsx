"use client";

import { useState } from "react";
import { useAuth } from "@/components/layout/AuthProvider";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
 const { login } = useAuth();
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setLoading(true);
 setError("");
 try {
 await login(email, password);
 } catch (err: unknown) {
 const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Invalid credentials";
 setError(msg);
 } finally {
 setLoading(false);
 }
 }

 return (
 <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
 <div className="w-full max-w-md">
 <div className="mb-8 text-center">
 <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white text-2xl font-bold shadow-lg">
 N
 </div>
 <h1 className="text-2xl font-bold text-theme-fg">Namaah Pulse</h1>
 <p className="text-sm text-theme-muted dark:text-theme-subtle mt-1">
 Performance & Incentive Management
 </p>
 </div>

 <div className="rounded-2xl border border-theme-border bg-theme-surface p-8 shadow-lg dark:border-theme-border
 <h2 className="mb-6 text-lg font-semibold text-theme-fg dark:text-theme-subtle">Sign in</h2>

 {error && (
 <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
 {error}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="mb-1.5 block text-sm font-medium text-theme-fg dark:text-theme-subtle">
 Email
 </label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 className="w-full rounded-lg border border-theme-border bg-theme-surface px-4 py-2.5 text-sm text-theme-fg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 "
 placeholder="Enter your email"
 />
 </div>

 <div>
 <label className="mb-1.5 block text-sm font-medium text-theme-fg dark:text-theme-subtle">
 Password
 </label>
 <input
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 className="w-full rounded-lg border border-theme-border bg-theme-surface px-4 py-2.5 text-sm text-theme-fg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 "
 placeholder="••••••••"
 />
 </div>

 <Button type="submit" loading={loading} className="w-full">
 Sign in
 </Button>
 </form>
 </div>
 </div>
 </div>
 );
}
