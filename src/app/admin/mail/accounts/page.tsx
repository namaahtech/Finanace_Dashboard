"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  Mail, Users, Plus, Search, RefreshCw, Check, X, Loader2,
  Zap, UserCheck, AlertTriangle, Copy, ExternalLink,
} from "lucide-react";

type MailAccount = {
  id: string;
  employee_id: string;
  zoho_account_id: string | null;
  email_address: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  employee: { id: string; name: string; email: string; designation: string } | null;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  designation: string;
};

function getInitials(name: string) {
  return (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function MailAccountsPage() {
  const { showToast } = useToast();

  const [accounts,   setAccounts]   = useState<MailAccount[]>([]);
  const [employees,  setEmployees]  = useState<Employee[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [connected,  setConnected]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating,   setCreating]   = useState(false);

  // Manual creation form
  const [selEmpId,   setSelEmpId]   = useState("");
  const [empSearch,  setEmpSearch]  = useState("");
  const [empResults, setEmpResults] = useState<Employee[]>([]);
  const [customEmail, setCustomEmail] = useState("");
  const [useCustom,   setUseCustom]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsRes, configRes] = await Promise.all([
        fetch("/api/mail/accounts/create-employee"),
        fetch("/api/mail/auth/connect"),
      ]);
      const accountsData = await accountsRes.json();
      const configData   = await configRes.json();
      setAccounts(accountsData.data || []);
      setConnected(configData.config?.is_connected === true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function searchEmployees(q: string) {
    setEmpSearch(q);
    if (!q || q.length < 2) { setEmpResults([]); return; }
    const { data } = await supabase
      .from("employees")
      .select("id,name,email,designation")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8);
    setEmpResults(data || []);
  }

  function selectEmployee(emp: Employee) {
    setSelEmpId(emp.id);
    setEmpSearch(emp.name);
    setEmpResults([]);
    if (!useCustom) {
      const parts = emp.name.trim().toLowerCase().split(/\s+/);
      const local = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
      setCustomEmail(`${local}@namaah.in`);
    }
  }

  async function handleCreate() {
    if (!selEmpId) { showToast("Select an employee first.", "warning"); return; }
    setCreating(true);
    try {
      const emp = empResults.find(e => e.id === selEmpId) || employees.find(e => e.id === selEmpId);
      const body: Record<string, string> = { employee_id: selEmpId, name: emp?.name || "", domain: "namaah.in" };
      if (useCustom && customEmail) body.email = customEmail;

      const res  = await fetch("/api/mail/accounts/create-employee", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.already_exists) {
          showToast(`Already provisioned: ${data.email_address}`, "info");
        } else {
          showToast(`Zoho Mail created: ${data.email_address}`, "success");
        }
        setShowCreate(false);
        setSelEmpId("");
        setEmpSearch("");
        setCustomEmail("");
        setUseCustom(false);
        await load();
      } else {
        showToast(data.error || "Failed to create mail account.", "error");
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(account: MailAccount) {
    const { error } = await supabase
      .from("zoho_mail_accounts")
      .update({ is_active: !account.is_active })
      .eq("id", account.id);
    if (error) { showToast("Failed to update status.", "error"); return; }
    setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, is_active: !a.is_active } : a));
    showToast(`Account ${account.is_active ? "deactivated" : "activated"}.`, "success");
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email);
    showToast("Copied!", "success");
  }

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    return !q
      || a.email_address.toLowerCase().includes(q)
      || a.display_name.toLowerCase().includes(q)
      || a.employee?.name?.toLowerCase().includes(q) || false;
  });

  const activeCount = accounts.filter(a => a.is_active).length;

  return (
    <DashboardShell
      moduleKey="mail_accounts"
      title="Mail Accounts"
      subtitle="Manage Zoho Mail accounts provisioned for your employees."
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => load()} disabled={loading}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-theme-border bg-theme-raised text-xs font-semibold text-theme-muted hover:text-theme-fg transition-all">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowCreate(true)} disabled={!connected}
            title={!connected ? "Connect Zoho Mail first (Mail Config)" : ""}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus size={13} /> Create Account
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Accounts",  value: accounts.length, icon: Mail,      color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Active",          value: activeCount,      icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Inactive",        value: accounts.length - activeCount, icon: X, color: "text-rose-500", bg: "bg-rose-500/10" },
            { label: "Zoho Synced",     value: accounts.filter(a => !!a.zoho_account_id).length, icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-xs text-theme-muted">{label}</p>
                <p className={cn("text-xl font-bold leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Not connected banner */}
        {!loading && !connected && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Zoho Mail Not Connected</p>
              <p className="text-xs text-theme-muted mt-0.5">
                Go to <strong className="text-theme-fg">Comms → Mail Config</strong> to connect Zoho Mail before provisioning accounts.
              </p>
            </div>
          </div>
        )}

        {/* Accounts Table */}
        <div className="page-card p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-theme-border bg-theme-raised/30">
            <p className="text-xs font-bold text-theme-fg">
              {filtered.length} account{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search accounts..."
                className="h-8 w-60 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-primary transition-all" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-theme-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Mail size={32} className="mx-auto text-theme-muted opacity-30" />
              <p className="text-sm font-semibold text-theme-fg">No mail accounts provisioned</p>
              <p className="text-xs text-theme-muted">
                {connected
                  ? 'Click "Create Account" to provision a Zoho Mail address for an employee.'
                  : "Connect Zoho Mail first, then create accounts for your employees."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-page text-left text-xs font-semibold text-theme-muted">
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Mail Address</th>
                    <th className="px-5 py-3">Zoho Account ID</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/30">
                  {filtered.map(account => (
                    <tr key={account.id} className="group hover:bg-theme-raised/30 transition-all duration-200">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-bold shadow-sm">
                            {getInitials(account.display_name)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-theme-fg">{account.display_name}</p>
                            <p className="text-[10px] text-theme-muted">{account.employee?.designation || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-theme-fg">{account.email_address}</span>
                          <button onClick={() => copyEmail(account.email_address)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all">
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {account.zoho_account_id ? (
                          <span className="flex items-center gap-1.5 text-xs text-theme-muted font-mono">
                            <Zap size={11} className="text-blue-500" />
                            {account.zoho_account_id.slice(0, 16)}…
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500 font-semibold">Pending Sync</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-muted">
                        {new Date(account.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => toggleActive(account)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-[10px] font-black transition-all",
                            account.is_active
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                              : "bg-theme-raised text-theme-muted hover:bg-rose-500/10 hover:text-rose-500"
                          )}>
                          {account.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Mail size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-theme-fg">Create Zoho Mail Account</p>
                  <p className="text-xs text-theme-muted">Provision a mail address for an employee</p>
                </div>
              </div>
              <button onClick={() => { setShowCreate(false); setSelEmpId(""); setEmpSearch(""); setCustomEmail(""); setUseCustom(false); }}
                className="p-1.5 rounded-lg text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Employee Search */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-theme-muted flex items-center gap-1.5">
                  <Users size={11} /> Select Employee
                </label>
                <div className="relative">
                  <input value={empSearch} onChange={e => searchEmployees(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-page text-sm text-theme-fg outline-none focus:border-theme-primary transition-all" />
                  {empResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl border border-theme-border bg-theme-surface shadow-xl overflow-hidden">
                      {empResults.map(emp => (
                        <button key={emp.id} onClick={() => selectEmployee(emp)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-theme-raised transition-all">
                          <div className="h-7 w-7 rounded-full bg-theme-primary flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-theme-fg">{emp.name}</p>
                            <p className="text-[10px] text-theme-muted">{emp.designation} · {emp.email}</p>
                          </div>
                          {selEmpId === emp.id && <Check size={12} className="ml-auto text-theme-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Preview */}
              {selEmpId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-theme-muted flex items-center gap-1.5">
                      <Mail size={11} /> Mail Address
                    </label>
                    <button onClick={() => setUseCustom(!useCustom)}
                      className="text-[10px] font-bold text-theme-primary hover:underline">
                      {useCustom ? "Use auto-generated" : "Customize"}
                    </button>
                  </div>
                  {useCustom ? (
                    <input value={customEmail} onChange={e => setCustomEmail(e.target.value)}
                      placeholder="firstname.lastname@namaah.in"
                      className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-page text-sm font-mono text-theme-fg outline-none focus:border-theme-primary transition-all" />
                  ) : (
                    <div className="h-10 px-3 flex items-center rounded-xl border border-theme-border/50 bg-theme-raised text-sm font-mono text-theme-fg">
                      {customEmail || "—"}
                    </div>
                  )}
                  <p className="text-[10px] text-theme-muted">Auto-generated from employee name · format: firstname.lastname@namaah.in</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowCreate(false); setSelEmpId(""); setEmpSearch(""); setCustomEmail(""); setUseCustom(false); }}
                  className="flex-1 h-10 rounded-xl border border-theme-border text-xs font-semibold text-theme-muted hover:text-theme-fg hover:bg-theme-raised transition-all">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={!selEmpId || creating}
                  className="flex-1 h-10 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {creating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  {creating ? "Creating…" : "Create Mail Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
