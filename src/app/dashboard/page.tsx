"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { calculateCompanyScore, getCompanyMultiplier, getEmployeeMultiplier } from "@/lib/incentiveMath";
import {
 IndianRupee,
 Award,
 TrendingUp,
 Building2,
 Clock3,
 CalendarDays,
 ArrowUpRight
} from "lucide-react";

interface WalletData {
 wallet: {
 earned_total: number;
 locked_amount: number;
 claimable_amount: number;
 held_amount: number;
 claimed_amount: number;
 };
}

interface IncentiveData {
 incentives: Array<{
 _id: string;
 amount: number;
 base_amount: number;
 status: string;
 month: number;
 year: number;
 }>;
}

interface ConfigData {
 company_revenue: number;
 expense_percentage: number;
 revenue_achievement_percentage: number;
 collections_percentage: number;
 delivery_health_percentage: number;
 payout_pool_amount: number;
}

interface KpiData {
 scores: Array<{
 month: number;
 year: number;
 final_score: number;
 }>;
}

export default function EmployeeDashboard() {
 const { user } = useAuth();
 const { request } = useApi();
 const [wallet, setWallet] = useState<WalletData["wallet"] | null>(null);
 const [config, setConfig] = useState<ConfigData | null>(null);
 const [kpi, setKpi] = useState<KpiData["scores"]>([]);
 const [incentiveData, setIncentiveData] = useState<IncentiveData | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 if (!user) return;
 async function load() {
 try {
 const [walletRes, configRes, kpiRes, incentiveRes] = await Promise.all([
 request<WalletData>({ url: "/api/wallet" }),
 request<ConfigData>({ url: "/api/config" }),
 request<KpiData>({ url: "/api/kpi" }),
 request<IncentiveData>({ url: "/api/incentives" }),
 ]);
 setWallet(walletRes.wallet);
 setConfig(configRes);
 setKpi(kpiRes.scores ?? []);
 setIncentiveData(incentiveRes);
 } finally {
 setLoading(false);
 }
 }
 load();
 }, [user, request]);

 if (loading) {
 return (
 <DashboardShell title="My Dashboard">
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-strong border-t-transparent" />
 </div>
 </DashboardShell>
 );
 }

 const latestKpi = kpi[0];
 const employeeScore = latestKpi?.final_score ?? 80;
 const companyScore = config
 ? calculateCompanyScore(
 config.revenue_achievement_percentage,
 config.collections_percentage,
 config.delivery_health_percentage
 )
 : 72;
 const employeeMultiplier = getEmployeeMultiplier(employeeScore);
 const companyMultiplier = getCompanyMultiplier(companyScore);
 const totalMultiplier = parseFloat((employeeMultiplier * companyMultiplier).toFixed(2));
 const baseIncentive = incentiveData?.incentives?.[0]?.base_amount ?? 10000;
 const finalIncentive = Math.round(baseIncentive * totalMultiplier);

 const stats = [
 { label: "My Current Score", value: `${employeeScore}%`, icon: <TrendingUp size={18} className="text-emerald-600" />, trend: "Active", color: "emerald" },
 { label: "Company Health", value: `${companyScore}%`, icon: <Building2 size={18} className="text-blue-600" />, trend: "Corporate", color: "blue" },
 { label: "Projected Payout", value: formatCurrency(finalIncentive), icon: <Award size={18} className="text-purple-600" />, trend: "Expected", color: "purple" },
 { label: "Aggregate Yield", value: formatCurrency(wallet?.earned_total ?? 0), icon: <IndianRupee size={18} className="text-theme-muted" />, trend: "Lifetime", color: "slate" },
 ];

 return (
 <DashboardShell 
 title="My Performance"
 subtitle="Detailed overview of your current metrics and organizational multipliers."
 actions={
 <div className="flex gap-2">
 <Link href="/dashboard/incentives">
 <Button variant="primary" size="md">
 <Award size={14} className="mr-2" /> View Incentives
 </Button>
 </Link>
 </div>
 }
 >
 <div className="space-y-10">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 {stats.map((s) => (
 <div key={s.label} className="page-card !p-6">
 <div className="flex justify-between items-start mb-4">
 <div className={`p-2.5 rounded-md bg-${s.color}-50`}>
 {s.icon}
 </div>
 <span className="text-[10px] font-bold text-theme-subtle border border-theme-border px-2 py-0.5 rounded uppercase">{s.trend}</span>
 </div>
 <div>
 <p className="text-[10px] font-bold text-theme-subtle uppercase tracking-widest mb-1">{s.label}</p>
 <p className="text-2xl font-bold text-theme-fg tracking-tight">{s.value}</p>
 </div>
 </div>
 ))}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
 {/* Multiplier Stack */}
 <div className="page-card p-10 space-y-10 border-none bg-theme-primary text-white shadow-2xl">
 <div>
 <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-theme-subtle mb-2">Total Multiplier Stack</p>
 <h2 className="text-5xl font-black tracking-tighter">{totalMultiplier}x</h2>
 </div>
 
 <div className="grid grid-cols-2 gap-8 border-t border-theme-strong pt-10">
 <div>
 <p className="text-[10px] font-bold text-theme-subtle uppercase tracking-widest mb-2">Personal Factor</p>
 <p className="text-2xl font-bold text-emerald-400 tracking-tight">{employeeMultiplier.toFixed(1)}x</p>
 <p className="text-[10px] text-theme-muted mt-1">Based on {employeeScore}% score</p>
 </div>
 <div>
 <p className="text-[10px] font-bold text-theme-subtle uppercase tracking-widest mb-2">Company Factor</p>
 <p className="text-2xl font-bold text-blue-400 tracking-tight">{companyMultiplier.toFixed(1)}x</p>
 <p className="text-[10px] text-theme-muted mt-1">Based on {companyScore}% health</p>
 </div>
 </div>

 <div className="bg-theme-surface/80 rounded-lg p-6 border border-white/10 flex justify-between items-center">
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-theme-subtle mb-1">Authorised Payout</p>
 <p className="text-2xl font-bold text-white tracking-tighter">{formatCurrency(finalIncentive)}</p>
 </div>
 <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
 <ArrowUpRight size={20} className="text-white" />
 </div>
 </div>
 </div>

 {/* Performance Visualization area (placeholder for now) */}
 <div className="page-card p-10 flex flex-col justify-between">
 <div>
 <h3 className="text-[10px] font-bold text-theme-subtle uppercase tracking-[0.3em] mb-6">Mission Status</h3>
 <p className="text-sm text-theme-muted leading-relaxed max-w-sm">
 Your current trajectory is <span className="text-theme-fg font-bold uppercase tracking-tight">high performance</span>. 
 Calculated incentives are based on the latest verified metrics from the {new Date().toLocaleString('en-IN', { month: 'long' })} cycle.
 </p>
 </div>
 
 <div className="space-y-6 pt-10">
 <div className="flex justify-between items-center border-b border-theme-border pb-4">
 <span className="text-xs font-medium text-theme-muted flex items-center gap-2">
 <Clock3 size={14} /> Settlement Date
 </span>
 <span className="text-xs font-bold text-theme-fg">11 May 2026</span>
 </div>
 <div className="flex justify-between items-center border-b border-theme-border pb-4">
 <span className="text-xs font-medium text-theme-muted flex items-center gap-2">
 <IndianRupee size={14} /> Base Component
 </span>
 <span className="text-xs font-bold text-theme-fg">{formatCurrency(baseIncentive)}</span>
 </div>
 <div className="flex justify-between items-center pb-4">
 <span className="text-xs font-medium text-theme-muted flex items-center gap-2">
 <CalendarDays size={14} /> Tracking Cycle
 </span>
 <span className="text-xs font-bold text-theme-fg">Current Q2</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </DashboardShell>
 );
}
