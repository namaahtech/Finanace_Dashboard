"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  Settings, Check, X, ExternalLink, RefreshCw, Loader2, Shield,
  Mail, Globe, Key, AlertTriangle, CheckCircle2, Clock, Zap,
  Copy, Eye, EyeOff,
} from "lucide-react";

type Config = {
  is_connected: boolean;
  mail_domain: string;
  admin_account_id: string;
  connected_at: string;
  token_expiry: string;
};

type DomainInfo = {
  current_domain: string | null;
  domain_synced_at: string | null;
  zoho_domains: { name: string; isPrimary: boolean; isVerified: boolean }[];
  is_connected: boolean;
};

export default function MailConfigPage() {
  const { showToast } = useToast();

  const [config,      setConfig]      = useState<Config | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const [domainInfo,   setDomainInfo]   = useState<DomainInfo | null>(null);
  const [domainInput,  setDomainInput]  = useState("");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainSyncing,setDomainSyncing]= useState(false);

  const [clientId,     setClientId]     = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [mailDomain,   setMailDomain]   = useState("mail.namaah.io");
  const [redirectUri,  setRedirectUri]  = useState(
    typeof window !== "undefined" ? `${window.location.origin}/api/mail/auth/callback` : ""
  );
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    fetch("/api/mail/auth/connect")
      .then(r => r.json())
      .then(d => {
        setConfig(d.config);
        if (d.config?.mail_domain) setMailDomain(d.config.mail_domain);
        setLoading(false);
      });
    // Load domain info
    fetch("/api/mail/config/domain")
      .then(r => r.json())
      .then(d => {
        setDomainInfo(d);
        if (d.current_domain) { setDomainInput(d.current_domain); setMailDomain(d.current_domain); }
      })
      .catch(() => {});
  }, []);

  async function handleSyncDomain() {
    setDomainSyncing(true);
    try {
      const res  = await fetch("/api/mail/config/domain", { method: "PUT" });
      const data = await res.json();
      if (data.domain) {
        setDomainInput(data.domain);
        setMailDomain(data.domain);
        setDomainInfo(prev => prev ? { ...prev, current_domain: data.domain } : null);
        showToast(`Domain synced: ${data.domain}`, "success");
      } else {
        showToast(data.error || "Sync failed.", "error");
      }
    } finally {
      setDomainSyncing(false);
    }
  }

  async function handleSaveDomain() {
    if (!domainInput.includes(".")) { showToast("Enter a valid domain.", "warning"); return; }
    setDomainSaving(true);
    try {
      const res  = await fetch("/api/mail/config/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput }),
      });
      const data = await res.json();
      if (data.success) {
        setMailDomain(data.domain);
        setDomainInfo(prev => prev ? { ...prev, current_domain: data.domain } : null);
        showToast(`Domain set to ${data.domain}`, "success");
      } else {
        showToast(data.error || "Save failed.", "error");
      }
    } finally {
      setDomainSaving(false);
    }
  }

  async function handleConnect() {
    if (!clientId || !clientSecret) {
      showToast("Client ID and Secret are required.", "warning"); return;
    }
    setSaving(true);
    try {
      const res  = await fetch("/api/mail/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret, mailDomain, redirectUri }),
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        showToast(data.error || "Failed to initiate OAuth.", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTestLoading(true);
    try {
      const res  = await fetch("/api/mail/inbox?limit=1");
      const data = await res.json();
      if (data.connected) {
        showToast("Connection successful! Zoho Mail is working.", "success");
      } else {
        showToast("Connection test failed. Please re-connect.", "error");
      }
    } finally {
      setTestLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "connected") {
      showToast("Zoho Mail connected successfully!", "success");
      fetch("/api/mail/auth/connect").then(r=>r.json()).then(d => setConfig(d.config));
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("error")) {
      const errMap: Record<string,string> = {
        no_code:        "OAuth flow did not return a code.",
        no_config:      "No configuration found. Please save credentials first.",
        token_failed:   "Token exchange failed. Check your credentials.",
      };
      showToast(errMap[params.get("error")!] || `OAuth error: ${params.get("error")}`, "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const isConnected = config?.is_connected;
  const tokenExpiry = config?.token_expiry ? new Date(config.token_expiry) : null;
  const tokenValid  = tokenExpiry ? tokenExpiry > new Date() : false;

  return (
    <DashboardShell
      moduleKey="mail_config"
      title="Mail Config"
      subtitle="Connect and configure Zoho Mail for your organization."
      actions={
        isConnected ? (
          <button onClick={testConnection} disabled={testLoading}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-theme-border bg-theme-raised text-xs font-semibold text-theme-muted hover:text-theme-fg transition-all">
            {testLoading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Test Connection
          </button>
        ) : null
      }
    >
      <div className="max-w-3xl space-y-6">
        {/* Connection Status */}
        <div className={cn(
          "rounded-2xl border p-5",
          isConnected
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-amber-500/20 bg-amber-500/5"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
              isConnected ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500")}>
              {loading ? <Loader2 size={22} className="animate-spin" /> : isConnected ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
            </div>
            <div className="flex-1">
              <p className={cn("text-base font-black", isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                {loading ? "Checking…" : isConnected ? "Zoho Mail Connected" : "Zoho Mail Not Connected"}
              </p>
              <p className="text-xs text-theme-muted mt-0.5">
                {isConnected
                  ? `Domain: ${config?.mail_domain} · Account ID: ${config?.admin_account_id || "—"}`
                  : "Enter your Zoho OAuth credentials below to connect."}
              </p>
            </div>
            {isConnected && tokenExpiry && (
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-theme-muted font-semibold">Token expires</p>
                <p className={cn("text-xs font-bold", tokenValid ? "text-emerald-500" : "text-rose-500")}>
                  {tokenValid ? tokenExpiry.toLocaleTimeString() : "Expired — will auto-refresh"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="page-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-xl bg-theme-primary/10 flex items-center justify-center text-xs font-black text-theme-primary flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-bold text-theme-fg">Create Zoho Developer App</p>
                <p className="text-xs text-theme-muted">Get OAuth credentials from Zoho API Console</p>
              </div>
              <a href="https://api-console.zoho.in/" target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-theme-border text-theme-muted hover:text-theme-fg text-xs font-semibold transition-all">
                Zoho Console <ExternalLink size={11} />
              </a>
            </div>
            <div className="rounded-xl bg-theme-raised border border-theme-border p-4 text-xs text-theme-muted space-y-1.5">
              <p className="font-semibold text-theme-fg mb-2">Setup Guide:</p>
              <p>1. Go to <strong>api-console.zoho.in</strong> → Add Client → Server-based Application</p>
              <p>2. Set Authorized Redirect URI to:</p>
              <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-theme-page border border-theme-border font-mono text-[11px]">
                <span className="flex-1 truncate">{redirectUri}</span>
                <button onClick={() => { navigator.clipboard.writeText(redirectUri); showToast("Copied!", "success"); }}
                  className="p-1 rounded hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all"><Copy size={11} /></button>
              </div>
              <p>3. Enable scopes: <strong>ZohoMail.messages.ALL, ZohoMail.accounts.ALL, ZohoMail.organization.ALL</strong></p>
              <p>4. Copy Client ID and Client Secret</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="page-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-xl bg-theme-primary/10 flex items-center justify-center text-xs font-black text-theme-primary flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-bold text-theme-fg">Enter OAuth Credentials</p>
                <p className="text-xs text-theme-muted">Credentials are encrypted and stored securely</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-theme-muted">
                  <Key size={11} /> Client ID *
                </label>
                <input value={clientId} onChange={(e) => setClientId(e.target.value)}
                  placeholder="1000.XXXXXXXXXXXX"
                  className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-page text-sm text-theme-fg outline-none focus:border-theme-primary font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-theme-muted">
                  <Shield size={11} /> Client Secret *
                </label>
                <div className="relative">
                  <input value={clientSecret} onChange={(e) => setClientSecret(e.target.value)}
                    type={showSecret ? "text" : "password"}
                    placeholder="Your client secret"
                    className="w-full h-10 pl-3 pr-10 rounded-xl border border-theme-border bg-theme-page text-sm text-theme-fg outline-none focus:border-theme-primary font-mono" />
                  <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-fg">
                    {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-theme-muted">
                  <Globe size={11} /> Mail Domain
                </label>
                <input value={mailDomain} onChange={(e) => setMailDomain(e.target.value)}
                  placeholder="namaah.in"
                  className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-page text-sm text-theme-fg outline-none focus:border-theme-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-theme-muted">
                  <Mail size={11} /> Redirect URI
                </label>
                <input value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-page text-xs text-theme-fg outline-none focus:border-theme-primary font-mono" />
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="page-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-xl bg-theme-primary/10 flex items-center justify-center text-xs font-black text-theme-primary flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-bold text-theme-fg">Authorize & Connect</p>
                <p className="text-xs text-theme-muted">You'll be redirected to Zoho to authorize the connection</p>
              </div>
            </div>

            <button onClick={handleConnect} disabled={saving || !clientId || !clientSecret}
              className="flex items-center gap-2 w-full justify-center py-3 rounded-xl bg-theme-primary text-white text-sm font-bold hover:bg-theme-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
              {isConnected ? "Re-authorize Zoho Mail" : "Connect to Zoho Mail"}
            </button>

            {isConnected && (
              <p className="text-center text-[11px] text-theme-muted mt-3">
                ✓ Connected on {config?.connected_at ? new Date(config.connected_at).toLocaleDateString() : "—"} ·{" "}
                <button onClick={testConnection} disabled={testLoading} className="text-theme-primary hover:underline">
                  Test now
                </button>
              </p>
            )}
          </div>

          {/* Domain Management */}
          <div className="page-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                <Globe size={15} className="text-sky-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-theme-fg">Mail Domain for New Employees</p>
                <p className="text-xs text-theme-muted">
                  All new employee mailboxes are created under this domain in Zoho Admin Console.
                  {domainInfo?.domain_synced_at && (
                    <span className="ml-1 text-emerald-500">
                      · Last synced {new Date(domainInfo.domain_synced_at).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={handleSyncDomain}
                disabled={domainSyncing || !domainInfo?.is_connected}
                title="Auto-detect domain from Zoho"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-theme-border text-xs font-semibold text-theme-muted hover:text-sky-500 hover:border-sky-500/40 transition-all disabled:opacity-40"
              >
                {domainSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Auto-detect from Zoho
              </button>
            </div>

            {/* Verified domains from Zoho */}
            {domainInfo?.zoho_domains?.length ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {domainInfo.zoho_domains.map(d => (
                  <button
                    key={d.name}
                    onClick={() => setDomainInput(d.name)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition-all",
                      domainInput === d.name
                        ? "bg-theme-primary text-white border-theme-primary"
                        : "bg-theme-raised border-theme-border text-theme-muted hover:text-theme-fg",
                    )}
                  >
                    {d.isVerified && <Check size={11} />}
                    {d.name}
                    {d.isPrimary && <span className="text-[9px] uppercase tracking-wider opacity-60">primary</span>}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                placeholder="e.g. mail.namaah.io"
                className="flex-1 h-10 px-3 rounded-xl border border-theme-border bg-theme-page text-sm text-theme-fg outline-none focus:border-theme-primary font-mono"
              />
              <button
                onClick={handleSaveDomain}
                disabled={domainSaving || !domainInput}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-theme-primary text-white text-sm font-bold hover:bg-theme-primary/90 transition-all disabled:opacity-50"
              >
                {domainSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save Domain
              </button>
            </div>

            <p className="mt-2 text-[11px] text-theme-muted">
              New employees will get <strong className="text-theme-fg font-mono">firstname.lastname@{domainInput || "mail.namaah.io"}</strong> as their Zoho mail address.
            </p>
          </div>

          {/* Employee Email Provisioning Info */}
          <div className="page-card border-theme-primary/20 bg-theme-primary/3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-theme-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap size={15} className="text-theme-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-theme-fg mb-1">Auto Email Provisioning</p>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Once Zoho Mail is connected, adding a new employee in{" "}
                  <strong className="text-theme-fg">Employees → Add Employee</strong>{" "}
                  will automatically create a Zoho Mail account in the format{" "}
                  <strong className="text-theme-primary font-mono">firstname.lastname@{mailDomain}</strong>.
                  This can be toggled off per employee.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
