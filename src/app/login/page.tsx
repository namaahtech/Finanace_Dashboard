"use client";

import { useState } from "react";
import { useAuth } from "@/components/layout/AuthProvider";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Invalid credentials";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-theme-page p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white text-2xl font-black shadow-lg">
            N
          </div>
          <h1 className="text-2xl font-bold text-theme-fg">Namaah Pulse</h1>
          <p className="text-sm text-theme-muted mt-1">Performance &amp; Incentive Management</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-theme-border bg-theme-surface p-8 shadow-lg">
          <h2 className="mb-6 text-lg font-semibold text-theme-fg">Sign in</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-theme-danger-bg border border-red-200 px-4 py-3 text-sm text-theme-danger-fg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-theme-fg">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field"
                placeholder="you@namaah.in"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-theme-fg">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-theme-subtle">
          Namaah Startup · Internal Platform · Confidential
        </p>
      </div>
    </div>
  );
}
