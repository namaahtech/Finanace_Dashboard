"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layout/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Mail, Lock, Eye, EyeOff, Activity, BarChart3, Zap, Shield } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-theme-page">

      {/* Left panel — branding */}
      <div className="relative hidden lg:flex lg:w-[520px] flex-col justify-between overflow-hidden bg-slate-950 p-12 shrink-0">
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-indigo-600/15 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/30">
            <Activity size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Namaah Panel</span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold leading-snug tracking-tight text-white">
              Manage performance.<br />
              <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                Automate payouts.
              </span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Real-time incentive tracking, team analytics, and automated disbursements — all in one place.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: BarChart3, label: "Live KPI Dashboards",   desc: "Instant visibility into team performance" },
              { icon: Zap,       label: "Automated Incentives",   desc: "Accurate, transparent payouts every cycle" },
              { icon: Shield,    label: "Role-Based Access",      desc: "Secure admin and employee portals" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Icon size={15} className="text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center gap-3 text-xs text-slate-600">
          <span>© 2026 Namaah Startup</span>
          <span className="h-1 w-1 rounded-full bg-slate-700" />
          <span>Internal use only</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 shadow-lg">
            <Activity size={22} className="text-sky-400" />
          </div>
          <span className="text-xl font-bold text-theme-fg">Namaah Panel</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-theme-fg">Welcome back</h1>
            <p className="mt-1 text-sm text-theme-muted">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">!</div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-theme-fg">Work Email</label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-subtle" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@namaah.in"
                  className="field pl-10 py-2.5"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-theme-fg">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-sky-600 hover:text-sky-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-subtle" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="field pl-10 pr-10 py-2.5"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-subtle hover:text-theme-fg transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} variant="primary" className="w-full py-2.5 text-sm font-semibold">
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-[11px] font-medium uppercase tracking-widest text-theme-subtle">
            Confidential · Internal use only
          </p>
        </div>
      </div>
    </div>
  );
}
