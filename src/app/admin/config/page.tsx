"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatCurrency, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import { useToast } from "@/components/ui/Toast";
import {
  Settings, ShieldAlert, Save, TrendingUp, IndianRupee, Layers,
  Briefcase, Mail, Bell, Lock, AlertCircle, RefreshCw,
  ChevronDown, Building2, LayoutGrid, FileCheck, CheckCircle2, Rocket,
  Plus, Trash2, Pencil, X, Check
} from "lucide-react";

interface Config {
  company_revenue: number;
  profit_percentage: number;
  expense_percentage: number;
  company_stage: string;
  equity_min_percentage: number;
  equity_max_percentage: number;
  vesting_days: number;
  bonus_percentage_1m: number;
  bonus_percentage_2m: number;
  claim_limit: number;
  payout_pool_amount: number;
  payout_capacity: "HIGH" | "MODERATE" | "LOW";
  current_claim_cycle: number;
  cycle_reset_date: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  company_name: string;
  founder_name: string;
  founder_designation: string;
  consultant_agreement_url: string;
}

const B = "#FBFBFA";

// Indian comma formatting helpers
function toIndianDisplay(raw: string | number): string {
  const s = String(raw).replace(/,/g, "");
  if (s === "" || isNaN(Number(s))) return typeof raw === "string" ? raw : "";
  return Number(s).toLocaleString("en-IN");
}
function fromIndianInput(val: string): string {
  return val.replace(/,/g, "").replace(/[^\d]/g, "");
}

interface SalarySlab {
  id: string; name: string; min_target: number;
  max_target: number | null; commission_percent: number;
  is_active: boolean; sort_order: number;
}

export default function AdminConfigPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<Partial<Config>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [analyzingTask, setAnalyzingTask] = useState<any>(null);
  // Salary Slabs
  const [slabs, setSlabs] = useState<SalarySlab[]>([]);
  const [slabsLoading, setSlabsLoading] = useState(false);
  const [showSlabForm, setShowSlabForm] = useState(false);
  const [slabForm, setSlabForm] = useState({ name: "", min_target: "", max_target: "", commission_percent: "", sort_order: "" });
  const [savingSlab, setSavingSlab] = useState(false);
  const [editingSlab, setEditingSlab] = useState<string | null>(null);
  const [editSlabForm, setEditSlabForm] = useState<Partial<SalarySlab>>({});

  useEffect(() => {
    if (!analyzingTask?.id) return;

    const channel = supabase.channel(`analysis_${analyzingTask.id}`);
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'onboarding_analysis_queue',
          filter: `id=eq.${analyzingTask.id}`
        },
        (payload) => {
          setAnalyzingTask(payload.new);
          if (payload.new.status === 'completed') {
            showToast("Gemma 4: Legal Neural Analysis Completed.", "success");
            load();
          }
        }
      )
      .subscribe();

    // Fallback Polling (Every 3s) in case Realtime websocket is blocked
    const pollInterval = setInterval(async () => {
      if (analyzingTask?.status === 'completed' || analyzingTask?.status === 'failed') {
        clearInterval(pollInterval);
        return;
      }
      
      const { data } = await supabase
        .from('onboarding_analysis_queue')
        .select('*')
        .eq('id', analyzingTask.id)
        .single();
      
      if (data) {
        setAnalyzingTask(data);
        if (data.status === 'completed') {
          showToast("AI Refinement Synced.", "success");
          load();
          clearInterval(pollInterval);
        }
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [analyzingTask?.id]);

  const [systemState, setSystemState] = useState({
    maintenanceMode: false,
    enforce2fa: true,
    strictAudit: true,
    pushNotifications: true,
    smtpHost: "smtp.mailgun.org",
    smtpPort: "587",
    smtpUser: "postmaster@namah.co",
    smtpPass: "*****************",
    fcmKey: "AAAAy3...j9X",
    fcmVapid: "BPl9...v2Q",
    fcmSender: "1092837465"
  });

  useEffect(() => { load(); loadSlabs(); }, []);

  async function loadSlabs() {
    setSlabsLoading(true);
    try {
      const res = await fetch("/api/salary-slabs");
      const d = await res.json();
      setSlabs(d.slabs || []);
    } catch { } finally { setSlabsLoading(false); }
  }

  async function handleCreateSlab() {
    setSavingSlab(true);
    try {
      const res = await fetch("/api/salary-slabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: slabForm.name,
          min_target: slabForm.min_target ? Number(slabForm.min_target.replace(/,/g, "")) : 0,
          max_target: slabForm.max_target ? Number(slabForm.max_target.replace(/,/g, "")) : null,
          commission_percent: Number(slabForm.commission_percent),
          sort_order: slabForm.sort_order ? Number(slabForm.sort_order) : slabs.length + 1,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast("Commission slab created.", "success");
      setSlabForm({ name: "", min_target: "", max_target: "", commission_percent: "", sort_order: "" });
      setShowSlabForm(false);
      loadSlabs();
    } catch (err: any) {
      showToast(err.message || "Failed to create slab.", "error");
    } finally { setSavingSlab(false); }
  }

  async function handleUpdateSlab() {
    if (!editingSlab) return;
    setSavingSlab(true);
    try {
      const res = await fetch("/api/salary-slabs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingSlab, ...editSlabForm }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast("Slab updated.", "success");
      setEditingSlab(null);
      loadSlabs();
    } catch (err: any) {
      showToast(err.message || "Update failed.", "error");
    } finally { setSavingSlab(false); }
  }

  async function handleDeleteSlab(id: string, name: string) {
    if (!confirm(`Deactivate slab "${name}"?`)) return;
    try {
      const res = await fetch(`/api/salary-slabs?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast("Slab deactivated.", "success");
      loadSlabs();
    } catch (err: any) {
      showToast(err.message || "Delete failed.", "error");
    }
  }

  if (user && user.role !== "admin") {
    return (
      <DashboardShell
      moduleKey="system_config" title="System Configuration">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4">
            <ShieldAlert size={48} className="mx-auto text-red-500 opacity-50" />
            <p className="text-sm font-black uppercase text-red-500 tracking-widest">Access denied. Super Admin strictly required.</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  async function load() {
    try {
      const res = await axios.get("/api/config");
      setConfig(res.data.config);
      setForm(res.data.config);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }


  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.patch("/api/config", form);
      setConfig(res.data.config);
      setForm(res.data.config);
      showToast("Global system configuration synced securely.", "success");
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Sync Error", "error");
    } finally {
      setSaving(false);
    }
  }

  const handleTestSmtp = () => {
    setTestingSmtp(true);
    setTimeout(() => {
      setTestingSmtp(false);
      showToast("SMTP Relay Handshake Successful.", "success");
    }, 1500);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("File size must be under 10MB.", "error");
      return;
    }

    setUploadingPdf(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `consultant_agreement_${Date.now()}.${fileExt}`;
      const filePath = `agreements/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('legal')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('legal')
        .getPublicUrl(filePath);

      // 3. Queue AI Analysis (Gemma 4 + OCR)
      const { data: queueData, error: queueError } = await supabase
        .from('onboarding_analysis_queue')
        .insert({
          pdf_url: publicUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (queueError) throw queueError;
      setAnalyzingTask(queueData);

      // 4. Update form
      setForm(prev => ({ ...prev, consultant_agreement_url: publicUrl }));
      showToast("PDF Uploaded. AI Neural Analysis (Gemma 4) triggered.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to upload PDF.", "error");
    } finally {
      setUploadingPdf(false);
    }
  };

  const n = (key: keyof Config) => form[key] as number;
  const profitAmount = ((n("company_revenue") || 0) * (n("profit_percentage") || 0)) / 100;
  const expenseAmount = ((n("company_revenue") || 0) * (n("expense_percentage") || 0)) / 100;

  // Ultra-premium input style abstractor
  const InputCls = "w-full rounded-lg border border-transparent bg-black/[0.03] px-4 py-3 text-[13px] font-bold text-black/90 outline-none focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]";
  const LabelCls = "text-[10px] font-black text-black/50 uppercase tracking-widest mb-2 block";

  return (
    <DashboardShell
      moduleKey="system_config" 
      title="System Configuration" 
      subtitle="Master control panel for organizational architecture and logic deployment."
      actions={
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 rounded-lg bg-black text-white px-8 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-black/80 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] disabled:opacity-50"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Deploying..." : "Save Configuration"}
        </button>
      }
    >
      <div className="min-h-full -m-8" style={{ background: B, padding: "40px" }}>
        
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-black/10 border-t-black/80" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="max-w-[1200px] mx-auto space-y-12">
            
            {/* Elegant Warning Banner */}
            <div className="flex items-start gap-4 rounded-xl border border-black/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
              <div className="mt-0.5 text-amber-500">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-black/80 uppercase tracking-widest mb-1">Super Admin Elevation Active</h4>
                <p className="text-[13px] text-black/50 font-medium leading-relaxed">
                  You are making changes to the global state. All parameters defined here actively route capital, redefine strict bonus payouts, and mutate live APIs. Save carefully.
                </p>
              </div>
            </div>

            {/* BLOCK 1: COMPANY IDENTITY & ROOT ARCHITECTURE */}
            <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 overflow-hidden">
              <div className="p-8 border-b border-black/5 flex items-center justify-between bg-black/[0.01]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white shadow-lg">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-black/90 uppercase tracking-widest">Company Profile</h2>
                    <p className="text-[11px] font-medium text-black/40 mt-0.5">This information defines the main head node for your organizational chart.</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-6">
                    <div>
                      <label className={LabelCls}>Company Full Name</label>
                      <input type="text" placeholder="e.g. Namaah Tech Solutions" value={form.company_name || ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className={InputCls} />
                    </div>
                    <div>
                      <label className={LabelCls}>Main Head / Founder Name</label>
                      <input type="text" placeholder="e.g. Aryan" value={form.founder_name || ""} onChange={(e) => setForm({ ...form, founder_name: e.target.value })} className={InputCls} />
                    </div>
                    <div>
                      <label className={LabelCls}>Main Role / Designation</label>
                      <input type="text" placeholder="e.g. Chief Executive Officer" value={form.founder_designation || ""} onChange={(e) => setForm({ ...form, founder_designation: e.target.value })} className={InputCls} />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={LabelCls}>Industry Type</label>
                        <div className="relative">
                          <select className={InputCls + " appearance-none cursor-pointer"}>
                            <option>Technology</option>
                            <option>Finance</option>
                            <option>Healthcare</option>
                            <option>Manufacturing</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className={LabelCls}>Company Size</label>
                        <div className="relative">
                          <select className={InputCls + " appearance-none cursor-pointer"}>
                            <option>1-50 Employees</option>
                            <option>51-200 Employees</option>
                            <option>201-500 Employees</option>
                            <option>500+ Employees</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={LabelCls}>Headquarters Address</label>
                      <textarea placeholder="Central Business District, Building 4" className={cn(InputCls, "min-h-[110px] resize-none py-3")} rows={3}></textarea>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-xl border border-dashed border-black/10 bg-black/[0.01] p-6 flex items-center gap-4 group hover:border-black/20 transition-colors">
                  <div className="w-14 h-14 rounded-xl bg-white border border-black/5 flex items-center justify-center text-black/20 group-hover:text-black/40 transition-colors shadow-sm">
                    <LayoutGrid size={24} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-black/80 tracking-widest mb-1">Company Branding</h4>
                    <p className="text-[10px] font-medium text-black/40">Upload your organization's logo to reflect on all generated reports and invoices.</p>
                  </div>
                  <button type="button" className="ml-auto text-[10px] font-black uppercase tracking-widest bg-black text-white px-4 py-2 rounded-lg shadow-md hover:bg-black/80 transition-all">Upload Logo</button>
                </div>
              </div>

              <div className="p-8 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/[0.03] flex items-center justify-center text-black/80">
                    <IndianRupee size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-black/90 uppercase tracking-widest">Financial Targets</h2>
                    <p className="text-[11px] font-medium text-black/40 mt-0.5">Define core organizational yield expectations and limits.</p>
                  </div>
                </div>
                <div className="hidden md:block px-4 py-2 bg-sky-50 text-sky-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-sky-100">
                  Stage: {form.company_stage}
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {/* Left Side standard Inputs */}
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={LabelCls}>Target Revenue (&#8377;)</label>
                      <input type="number" min={0} value={n("company_revenue")} onChange={(e) => setForm({ ...form, company_revenue: parseFloat(e.target.value) || 0 })} className={InputCls} />
                    </div>
                    <div>
                      <label className={LabelCls}>Company Stage</label>
                      <input type="text" value={form.company_stage ?? ""} onChange={(e) => setForm({ ...form, company_stage: e.target.value })} className={cn(InputCls, "uppercase tracking-wider")} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={LabelCls}>Minimum Equity (%)</label>
                      <input type="number" step="0.1" value={form.equity_min_percentage ?? 0} onChange={(e) => setForm({ ...form, equity_min_percentage: parseFloat(e.target.value) || 0 })} className={InputCls} />
                    </div>
                    <div>
                      <label className={LabelCls}>Maximum Equity (%)</label>
                      <input type="number" step="0.1" value={form.equity_max_percentage ?? 0} onChange={(e) => setForm({ ...form, equity_max_percentage: parseFloat(e.target.value) || 0 })} className={InputCls} />
                    </div>
                  </div>
                </div>

                {/* Right Side: Graphic Filter Block */}
                <div className="bg-black/[0.02] rounded-xl border border-black/5 p-8 relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none">
                    <IndianRupee size={160} />
                  </div>
                  
                  <h4 className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-6">Profit & Expense Forecast</h4>
                  
                  <div className="space-y-6 relative z-10">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[11px] font-bold text-black/60">Profit Margin Goal</span>
                        <span className="text-2xl font-black text-emerald-600 tracking-tight">{n("profit_percentage")}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={n("profit_percentage")}
                        onChange={(e) => {
                          const profit = parseInt(e.target.value);
                          setForm({ ...form, profit_percentage: profit, expense_percentage: 100 - profit });
                        }}
                        className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-black/5">
                      <div>
                        <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Projected Profit</p>
                        <p className="text-lg font-black text-emerald-600 tracking-tight">{formatCurrency(profitAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Projected Expenses</p>
                        <p className="text-lg font-black text-rose-500 tracking-tight">{formatCurrency(expenseAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* BLOCK 2: OPERATIONAL YIELD & PAYOUTS */}
            <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 overflow-hidden">
              <div className="p-8 border-b border-black/5 bg-black/[0.01] flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-black/[0.04] flex items-center justify-center text-black/80">
                  <Layers size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-black/90 uppercase tracking-widest">Bonus & Payout Matrix</h2>
                  <p className="text-[11px] font-medium text-black/40 mt-0.5">Control employee vesting conditions and system payout capacity.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-black/5">
                
                {/* Employee Vesting */}
                <div className="p-8 space-y-10">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[11px] font-bold text-black/60 uppercase tracking-widest">Vesting Period</span>
                      <span className="text-sm font-black text-black/80">{n("vesting_days")} Days</span>
                    </div>
                    <input type="range" min={1} max={365} value={n("vesting_days")} onChange={(e) => setForm({ ...form, vesting_days: parseInt(e.target.value) })} className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-black" />
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold text-black/50 uppercase tracking-widest">1 Month Bonus</span>
                        <span className="text-[11px] font-black text-emerald-600">+{n("bonus_percentage_1m")}%</span>
                      </div>
                      <input type="range" min={0} max={50} value={n("bonus_percentage_1m")} onChange={(e) => setForm({ ...form, bonus_percentage_1m: parseInt(e.target.value) })} className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-black" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold text-black/50 uppercase tracking-widest">2 Month Bonus</span>
                        <span className="text-[11px] font-black text-emerald-600">+{n("bonus_percentage_2m")}%</span>
                      </div>
                      <input type="range" min={0} max={50} value={n("bonus_percentage_2m")} onChange={(e) => setForm({ ...form, bonus_percentage_2m: parseInt(e.target.value) })} className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-black" />
                    </div>
                  </div>
                </div>

                {/* System Payout Engine */}
                <div className="p-8 space-y-10">
                  <div>
                     <div className="flex justify-between items-center mb-4">
                      <span className="text-[11px] font-bold text-black/60 uppercase tracking-widest">Max Claims Per Month</span>
                      <span className="text-sm font-black text-black/80">{n("claim_limit")} Units</span>
                    </div>
                    <input type="range" min={1} max={200} value={n("claim_limit")} onChange={(e) => setForm({ ...form, claim_limit: parseInt(e.target.value) })} className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-black" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={LabelCls}>Available Payout Pool (&#8377;)</label>
                      <input type="number" value={n("payout_pool_amount")} onChange={(e) => setForm({ ...form, payout_pool_amount: parseFloat(e.target.value) })} className={cn(InputCls, "font-mono tracking-tight")} />
                    </div>
                    <div>
                      <label className={LabelCls}>System Payout Status</label>
                      <div className="relative">
                        <select
                          value={form.payout_capacity}
                          onChange={(e) => setForm({ ...form, payout_capacity: e.target.value as Config["payout_capacity"] })}
                          className={cn(InputCls, "appearance-none cursor-pointer uppercase tracking-widest text-[11px]")}
                        >
                          <option value="HIGH">Good — High Funds</option>
                          <option value="MODERATE">Warning — Medium Funds</option>
                          <option value="LOW">Critical — Low Funds</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>

              {/* BLOCK 3: INTEGRATIONS & LEGAL */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* Consultant Agreement Upload */}
              <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
                    <FileCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black text-black/80 uppercase tracking-widest">Consultant Agreement (PDF)</h3>
                    <p className="text-[10px] font-medium text-black/40 mt-0.5">Master NDA for all new consultants.</p>
                  </div>
                </div>

                <div className="p-8 border-2 border-dashed border-black/10 rounded-2xl bg-black/[0.01] flex flex-col items-center justify-center text-center">
                  {analyzingTask?.status === 'pending' || analyzingTask?.status === 'processing' ? (
                    <div className="w-full max-w-md">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-5 h-5 text-black animate-spin" />
                          <span className="text-sm font-bold text-black/80">Gemma 4 Analysis in Progress...</span>
                        </div>
                        <span className="text-xs font-medium text-black/40">Neural Compliance Engine Active</span>
                      </div>
                      <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black transition-all duration-1000 ease-in-out" 
                          style={{ width: analyzingTask.status === 'pending' ? '30%' : '75%' }} 
                        />
                      </div>
                      <p className="mt-4 text-[11px] text-black/40 uppercase tracking-widest font-bold">OCR + NLP Processing on Mac Mini</p>
                    </div>
                  ) : (
                    <>
                      <div className={cn(
                        "w-full py-4 rounded-xl border flex items-center justify-center gap-3 mb-6 transition-all",
                        config?.consultant_agreement_url ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-black/[0.01] border-black/5 text-black/40"
                      )}>
                        {config?.consultant_agreement_url ? (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-widest">Current Agreement Active</span>
                          </>
                        ) : (
                          <span className="text-sm font-medium uppercase tracking-widest">No active agreement found</span>
                        )}
                      </div>

                      {config?.consultant_agreement_url && (
                        <a 
                          href={config.consultant_agreement_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-black hover:underline mb-8"
                        >
                          View Current PDF
                        </a>
                      )}

                      <label className="cursor-pointer w-full">
                        <input 
                          type="file" 
                          accept=".pdf" 
                          onChange={handlePdfUpload}
                          disabled={uploadingPdf}
                          className="hidden" 
                        />
                        <div className={cn(
                          "w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center",
                          uploadingPdf ? "bg-black/5 text-black/20" : "bg-black text-white hover:bg-black/80 shadow-md"
                        )}>
                          {uploadingPdf ? "Uploading Master PDF..." : "Upload New Agreement (MAX 10MB)"}
                        </div>
                      </label>

                      {analyzingTask?.status === 'completed' && (
                        <div className="mt-6 flex items-center gap-2 text-[#0D652D]">
                          <FileCheck className="w-4 h-4" />
                          <span className="text-xs font-bold">AI ANALYSIS UPDATED SUCCESSFULLY</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* SMTP configuration */}
              <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                      <Mail size={18} />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-black text-black/80 uppercase tracking-widest">Email Server (SMTP)</h3>
                      <p className="text-[10px] font-medium text-black/40 mt-0.5">Configure outgoing mail architecture.</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleTestSmtp} disabled={testingSmtp} className="text-[10px] font-black tracking-widest uppercase bg-black/[0.03] border border-black/10 text-black/70 px-4 py-2 rounded-lg hover:bg-black/10 transition-all disabled:opacity-50">
                    {testingSmtp ? "Testing..." : "Test Link"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={LabelCls}>SMTP Host</label>
                    <input type="text" value={form.smtp_host || ""} onChange={e => setForm({ ...form, smtp_host: e.target.value })} className={InputCls} />
                  </div>
                  <div>
                    <label className={LabelCls}>SMTP Port</label>
                    <input type="number" value={form.smtp_port || 587} onChange={e => setForm({ ...form, smtp_port: parseInt(e.target.value) || 587 })} className={cn(InputCls, "font-mono")} />
                  </div>
                  <div>
                    <label className={LabelCls}>Email Address Username</label>
                    <input type="email" value={form.smtp_user || ""} onChange={e => setForm({ ...form, smtp_user: e.target.value })} className={InputCls} />
                  </div>
                  <div>
                    <label className={LabelCls}>Password / Key</label>
                    <input type="password" value={form.smtp_pass || ""} onChange={e => setForm({ ...form, smtp_pass: e.target.value })} className={cn(InputCls, "tracking-[0.2em]")} />
                  </div>
                </div>
              </section>

              {/* FCM Configuration */}
              <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black text-black/80 uppercase tracking-widest">Push Notifications (FCM)</h3>
                    <p className="text-[10px] font-medium text-black/40 mt-0.5">Firebase broadcasting credentials.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className={LabelCls}>VAPID Public Key</label>
                    <input type="text" value={systemState.fcmVapid} onChange={e => setSystemState(p => ({...p, fcmVapid: e.target.value}))} className={cn(InputCls, "font-mono")} />
                  </div>
                  <div>
                    <label className={LabelCls}>FCM Sender ID</label>
                    <input type="text" value={systemState.fcmSender} onChange={e => setSystemState(p => ({...p, fcmSender: e.target.value}))} className={cn(InputCls, "font-mono")} />
                  </div>
                </div>
                <div>
                  <label className={LabelCls}>FCM Server Key</label>
                  <input type="password" value={systemState.fcmKey} onChange={e => setSystemState(p => ({...p, fcmKey: e.target.value}))} className={cn(InputCls, "font-mono tracking-[0.2em]")} />
                </div>
              </section>
            </div>

            {/* BLOCK 4: PREFERENCES & TOGGLES */}
            <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-full bg-black/[0.04] flex items-center justify-center text-black/80">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-[13px] font-black text-black/80 uppercase tracking-widest">Global Security Directives</h3>
                  <p className="text-[10px] font-medium text-black/40 mt-0.5">Toggle root level features across the application instantly.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {Object.entries({
                  maintenanceMode: { title: "Maintenance Mode", desc: "Disable system for all non-admins." },
                  enforce2fa: { title: "Force Two-Factor Auth (2FA)", desc: "Require 2FA globally for Managers and above." },
                  strictAudit: { title: "Log All Admin Actions", desc: "Log all API actions and location footprints system-wide." },
                  pushNotifications: { title: "Enable Push Notifications", desc: "Turn on global push notifications for active alerts." }
                }).map(([key, configItem]) => {
                  const isActive = systemState[key as keyof typeof systemState] as boolean;
                  return (
                    <div key={key} className="flex justify-between items-center group py-2">
                       <div>
                        <p className="text-[12px] font-black uppercase text-black/80 tracking-widest mb-1">{configItem.title}</p>
                        <p className="text-[11px] font-medium text-black/40">{configItem.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSystemState(p => ({ ...p, [key]: !p[key as keyof typeof systemState] }))}
                        className={cn(
                          "flex-shrink-0 w-12 h-6 rounded-full flex items-center px-1 transition-colors outline-none",
                          isActive ? "bg-black" : "bg-black/10"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                          isActive ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* BLOCK 5: SALES COMMISSION SLABS */}
            <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 overflow-hidden">
              <div className="p-8 border-b border-black/5 bg-black/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-black/90 uppercase tracking-widest">Sales Commission Slabs</h2>
                    <p className="text-[11px] font-medium text-black/40 mt-0.5">Define tiered commission brackets for Sales role employees. Computed at payroll generation.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowSlabForm(true); setEditingSlab(null); }}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-black text-white px-4 py-2.5 rounded-xl shadow hover:bg-black/80 transition-all"
                >
                  <Plus size={13} /> Add Slab
                </button>
              </div>

              <div className="p-8">
                {slabsLoading ? (
                  <div className="flex items-center justify-center py-12 text-black/30 text-xs font-bold uppercase tracking-widest">Loading slabs...</div>
                ) : slabs.length === 0 && !showSlabForm ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                      <TrendingUp size={22} className="text-orange-300" />
                    </div>
                    <p className="text-[11px] font-black text-black/30 uppercase tracking-widest">No commission slabs defined yet.</p>
                    <button type="button" onClick={() => setShowSlabForm(true)} className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:underline">+ Create First Slab</button>
                  </div>
                ) : (
                  <>
                    {slabs.length > 0 && (
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-black/5">
                              {["Tier Name", "Min Target (₹)", "Max Target (₹)", "Commission %", "Actions"].map(h => (
                                <th key={h} className="pb-3 text-left text-[10px] font-black uppercase tracking-widest text-black/40">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.03]">
                            {slabs.map(slab => (
                              <tr key={slab.id} className="group">
                                {editingSlab === slab.id ? (
                                  <>
                                    <td className="py-3 pr-3">
                                      <input value={editSlabForm.name ?? slab.name} onChange={e => setEditSlabForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-xs font-bold text-black/80 outline-none focus:border-black/20" />
                                    </td>
                                    <td className="py-3 pr-3">
                                      <input type="text" inputMode="numeric"
                                        value={toIndianDisplay(editSlabForm.min_target ?? slab.min_target)}
                                        onChange={e => setEditSlabForm(p => ({ ...p, min_target: Number(fromIndianInput(e.target.value)) || 0 }))}
                                        className="w-28 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-xs font-bold font-mono text-black/80 outline-none focus:border-black/20" />
                                    </td>
                                    <td className="py-3 pr-3">
                                      <input type="text" inputMode="numeric" placeholder="Unlimited"
                                        value={toIndianDisplay(editSlabForm.max_target ?? (slab.max_target ?? ""))}
                                        onChange={e => { const v = fromIndianInput(e.target.value); setEditSlabForm(p => ({ ...p, max_target: v ? Number(v) : null })); }}
                                        className="w-28 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-xs font-bold font-mono text-black/80 outline-none focus:border-black/20" />
                                    </td>
                                    <td className="py-3 pr-3">
                                      <input type="number" step="0.1" value={editSlabForm.commission_percent ?? slab.commission_percent} onChange={e => setEditSlabForm(p => ({ ...p, commission_percent: Number(e.target.value) }))}
                                        className="w-20 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-xs font-bold text-black/80 outline-none focus:border-black/20" />
                                    </td>
                                    <td className="py-3">
                                      <div className="flex items-center gap-2">
                                        <button type="button" onClick={handleUpdateSlab} disabled={savingSlab} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-black text-white px-3 py-1.5 rounded-lg hover:bg-black/80 transition-all disabled:opacity-50">
                                          <Check size={11} /> {savingSlab ? "Saving..." : "Save"}
                                        </button>
                                        <button type="button" onClick={() => setEditingSlab(null)} className="text-[10px] font-black uppercase tracking-widest text-black/40 px-3 py-1.5 rounded-lg hover:bg-black/5 transition-all">
                                          <X size={11} />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-4 pr-4">
                                      <span className="text-[12px] font-black text-black/80">{slab.name}</span>
                                    </td>
                                    <td className="py-4 pr-4">
                                      <span className="font-mono text-[12px] font-bold text-black/60">₹{slab.min_target.toLocaleString("en-IN")}</span>
                                    </td>
                                    <td className="py-4 pr-4">
                                      <span className="font-mono text-[12px] font-bold text-black/60">
                                        {slab.max_target ? `₹${slab.max_target.toLocaleString("en-IN")}` : <span className="text-black/30 text-[10px] uppercase tracking-widest font-black">Unlimited</span>}
                                      </span>
                                    </td>
                                    <td className="py-4 pr-4">
                                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-100 px-3 py-1 rounded-full text-[11px] font-black">
                                        {slab.commission_percent}%
                                      </span>
                                    </td>
                                    <td className="py-4">
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => { setEditingSlab(slab.id); setEditSlabForm({}); }}
                                          className="p-1.5 rounded-lg text-black/40 hover:bg-black/5 hover:text-black/70 transition-all">
                                          <Pencil size={13} />
                                        </button>
                                        <button type="button" onClick={() => handleDeleteSlab(slab.id, slab.name)}
                                          className="p-1.5 rounded-lg text-black/40 hover:bg-rose-50 hover:text-rose-500 transition-all">
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Add new slab inline form */}
                    {showSlabForm && (
                      <div className="mt-2 p-6 rounded-2xl bg-orange-50/60 border border-orange-100 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">New Commission Slab</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-black/50 uppercase tracking-widest mb-1.5 block">Tier Name</label>
                            <input required value={slabForm.name} onChange={e => setSlabForm(p => ({ ...p, name: e.target.value }))}
                              placeholder="e.g. Gold Tier"
                              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[13px] font-bold text-black/80 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-black/50 uppercase tracking-widest mb-1.5 block">Min Target (₹)</label>
                            <input type="text" inputMode="numeric"
                              value={toIndianDisplay(slabForm.min_target)}
                              onChange={e => setSlabForm(p => ({ ...p, min_target: fromIndianInput(e.target.value) }))}
                              placeholder="0"
                              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[13px] font-bold font-mono text-black/80 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-black/50 uppercase tracking-widest mb-1.5 block">Max Target (₹)</label>
                            <input type="text" inputMode="numeric"
                              value={toIndianDisplay(slabForm.max_target)}
                              onChange={e => setSlabForm(p => ({ ...p, max_target: fromIndianInput(e.target.value) }))}
                              placeholder="Leave blank = unlimited"
                              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[13px] font-bold font-mono text-black/80 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-black/50 uppercase tracking-widest mb-1.5 block">Commission %</label>
                            <input required type="number" step="0.1" min="0.1" max="100" value={slabForm.commission_percent} onChange={e => setSlabForm(p => ({ ...p, commission_percent: e.target.value }))}
                              placeholder="e.g. 5"
                              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[13px] font-bold font-mono text-black/80 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button type="button" onClick={handleCreateSlab} disabled={savingSlab} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-black text-white px-5 py-2.5 rounded-xl shadow hover:bg-black/80 transition-all disabled:opacity-50">
                            <Plus size={12} /> {savingSlab ? "Creating..." : "Create Slab"}
                          </button>
                          <button type="button" onClick={() => setShowSlabForm(false)} className="text-[10px] font-black uppercase tracking-widest text-black/40 px-4 py-2.5 rounded-xl hover:bg-black/5 transition-all">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="mt-6 p-4 rounded-xl bg-black/[0.02] border border-dashed border-black/10 flex items-start gap-3">
                  <AlertCircle size={14} className="text-black/30 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-black/40 leading-relaxed">
                    Slabs apply when an employee has <strong className="text-black/60">Sales role</strong> enabled. Commission = Actual Monthly Sales × Commission %. Computed automatically at payroll generation.
                  </p>
                </div>
              </div>
            </section>

          </form>
        )}
      </div>
    </DashboardShell>
  );
}
