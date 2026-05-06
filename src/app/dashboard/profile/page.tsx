"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, cn } from "@/lib/utils";
import dayjs from "dayjs";
import {
  Mail,
  Briefcase,
  Calendar,
  Award,
  TrendingUp,
  Users,
  FileText,
  ArrowLeft,
  DollarSign,
  User,
} from "lucide-react";

interface Employee {
  id: string; name: string; email: string; employee_id: string;
  role: string; department: string; designation: string; team_id?: string;
  joining_date?: string; employment_type?: string; salary_structure?: string;
  base_salary?: number; salary_min?: number; salary_max?: number; salary_step?: number;
  hourly_rate?: number; daily_rate?: number; stipend_amount?: number;
  kpi_weight?: number; kra_weight?: number; behavioral_weight?: number;
  kpi_enabled?: boolean; enable_salary_linkage?: boolean; is_active: boolean;
}

interface KpiScore {
  id: string; kpi_score: number; kra_score: number; behavioral_score: number; final_score: number; month: number; year: number;
}

interface WalletData { earned_total: number; locked_amount: number; claimable_amount: number; this_month_payout?: number }
interface TeamData   { id: string; name: string; department: string }

export default function EmployeeProfile() {
  const { user } = useAuth();
  const { request } = useApi();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [kpiScore, setKpiScore] = useState<KpiScore | null>(null);
  const [wallet, setWallet]   = useState<WalletData | null>(null);
  const [team, setTeam]       = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let currentEmployee: Employee | null = null;
      
      try {
        const empRes = await request<any>({ url: `/api/employees/${user.id}` });
        if (empRes?.data) { 
          currentEmployee = empRes.data as Employee;
          setEmployee(currentEmployee); 
          setUsingFallback(false); 
        } else {
          throw new Error("No data");
        }
      } catch {
        currentEmployee = { id: user.id, name: user.name, email: user.email, employee_id: user.employee_id, role: user.role, department: user.department || "Not assigned", designation: user.designation || "Not specified", is_active: true };
        setEmployee(currentEmployee);
        setUsingFallback(true);
      }

      try {
        const kpiRes = await request<any>({ url: `/api/kpi?employeeId=${user.id}&month=${dayjs().month() + 1}&year=${dayjs().year()}` });
        if (kpiRes?.data?.[0]) setKpiScore(kpiRes.data[0] as KpiScore);
      } catch (err) {
        console.error("KPI Error:", err);
      }

      try {
        const walletRes = await request<{ wallet: WalletData }>({ url: "/api/wallet" });
        if (walletRes?.wallet) setWallet(walletRes.wallet);
      } catch {}
      
      // Fetch Team Info
      if (currentEmployee?.team_id) {
        try {
          const { data: teamData } = await supabase
            .from("teams")
            .select("id, name, department")
            .eq("id", currentEmployee.team_id)
            .single();
          if (teamData) setTeam(teamData as TeamData);
        } catch (err) {
          console.error("Team Fetch Error:", err);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, request]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`employee_${user.id}`)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "employees", filter: `id=eq.${user.id}` }, () => {
        const el = document.createElement("div");
        el.innerHTML = `<div style="position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:16px;border-radius:8px;z-index:9999;">Your profile was deleted. Logging out…</div>`;
        document.body.appendChild(el);
        setTimeout(() => supabase.auth.signOut().then(() => { window.location.href = "/login"; }), 2000);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  return (
    <DashboardShell
      title="My Profile"
      subtitle="Your professional information and performance overview."
      actions={
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">
            <ArrowLeft size={13} className="mr-1.5" /> Back
          </Button>
        </Link>
      }
    >
      <div className="space-y-5">

        {usingFallback && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/10">
            <span className="mt-0.5 text-amber-600 text-sm font-bold shrink-0">!</span>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Incomplete Profile Data</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                Profile is still syncing. Salary and employment details will appear once fully synchronized.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-theme-raised" />)}
          </div>
        ) : employee ? (
          <>
            {/* Header Card */}
            <div className="page-card flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-lg font-black">
                  {employee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-theme-fg leading-tight">{employee.name}</h2>
                  <p className="text-sm text-theme-muted mt-0.5">{employee.designation || "—"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                      employee.is_active
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-500"
                    )}>
                      <span className={cn("h-1 w-1 rounded-full", employee.is_active ? "bg-emerald-500" : "bg-red-500")} />
                      {employee.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="rounded-md bg-theme-raised px-2 py-0.5 text-[11px] font-semibold text-theme-fg">
                      {employee.role}
                    </span>
                    {employee.employment_type && (
                      <span className="rounded-md bg-theme-raised px-2 py-0.5 text-[11px] font-semibold text-theme-muted capitalize">
                        {employee.employment_type.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link href="/dashboard">
                <Button size="sm" variant="secondary">
                  Edit Profile
                </Button>
              </Link>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Contact */}
              <div className="page-card overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
                  <Mail size={15} className="text-theme-muted" />
                  <h3 className="text-sm font-semibold text-theme-fg">Contact Information</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <p className="text-xs text-theme-muted">Email Address</p>
                    <p className="text-sm font-semibold text-theme-fg mt-0.5 break-all">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-theme-muted">Employee ID</p>
                    <p className="text-sm font-mono font-bold text-theme-primary mt-0.5">{employee.employee_id}</p>
                  </div>
                  <div className="pt-2 border-t border-theme-border">
                    <a href={`mailto:${employee.email}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Mail size={12} className="mr-1.5" /> Send Email
                      </Button>
                    </a>
                  </div>
                </div>
              </div>

              {/* Professional */}
              <div className="page-card overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
                  <Briefcase size={15} className="text-theme-muted" />
                  <h3 className="text-sm font-semibold text-theme-fg">Professional Details</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <p className="text-xs text-theme-muted">Department</p>
                    <p className="text-sm font-semibold text-theme-fg mt-0.5">{employee.department || "Not assigned"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-theme-muted">Designation</p>
                    <p className="text-sm font-semibold text-theme-fg mt-0.5">{employee.designation || "Not specified"}</p>
                  </div>
                  <div className="pt-2 border-t border-theme-border">
                    <p className="text-xs text-theme-muted">Salary Structure</p>
                    <p className="text-sm font-semibold text-theme-fg mt-0.5 capitalize">
                      {employee.salary_structure?.replace(/_/g, " ") || "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employment */}
              <div className="page-card overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
                  <Calendar size={15} className="text-theme-muted" />
                  <h3 className="text-sm font-semibold text-theme-fg">Employment Information</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <p className="text-xs text-theme-muted">Joining Date</p>
                    <p className="text-sm font-semibold text-theme-fg mt-0.5">
                      {employee.joining_date ? dayjs(employee.joining_date).format("DD MMMM YYYY") : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-theme-muted">Employment Type</p>
                    <p className="text-sm font-semibold text-theme-fg mt-0.5 capitalize">
                      {employee.employment_type?.replace(/_/g, " ") || "Not set"}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-theme-border">
                    <p className="text-xs text-theme-muted">Tenure</p>
                    <p className="text-sm font-bold text-theme-primary mt-0.5">
                      {employee.joining_date ? `${dayjs().diff(dayjs(employee.joining_date), "months")} months` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team */}
              <div className="page-card overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
                  <Users size={15} className="text-theme-muted" />
                  <h3 className="text-sm font-semibold text-theme-fg">Team Information</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <p className="text-xs text-theme-muted">Team Name</p>
                    <p className="text-sm font-semibold text-theme-fg mt-0.5">{team?.name || "Not assigned to a team"}</p>
                  </div>
                  {team && (
                    <div>
                      <p className="text-xs text-theme-muted">Team Department</p>
                      <p className="text-sm font-semibold text-theme-fg mt-0.5">{team.department}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-theme-border">
                    <Link href="/dashboard">
                      <Button variant="outline" size="sm" className="w-full">
                        <Briefcase size={12} className="mr-1.5" /> View Assigned Projects
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance & Financial */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* KPI */}
              <div className="page-card overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
                  <Award size={15} className="text-theme-muted" />
                  <h3 className="text-sm font-semibold text-theme-fg">Current KPI Score</h3>
                </div>
                <div className="px-5 py-4">
                  {kpiScore ? (
                    <div className="space-y-3">
                      <div className="text-center py-2">
                        <p className="text-3xl font-black text-theme-primary">{kpiScore.final_score.toFixed(1)}%</p>
                        <p className="text-xs text-theme-muted mt-1">{dayjs().format("MMMM YYYY")}</p>
                      </div>
                      {[
                        { label: "KPI Score",        value: kpiScore.kpi_score,        color: "bg-sky-400" },
                        { label: "KRA Score",        value: kpiScore.kra_score,        color: "bg-emerald-400" },
                        { label: "Behavioral Score", value: kpiScore.behavioral_score, color: "bg-amber-400" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-theme-muted">{label}</span>
                            <span className="font-semibold text-theme-fg">{value.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-theme-raised">
                            <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-theme-subtle py-4 text-center">No KPI data available</p>
                  )}
                </div>
              </div>

              {/* Financial Overview */}
              <div className="page-card overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
                  <DollarSign size={15} className="text-theme-muted" />
                  <h3 className="text-sm font-semibold text-theme-fg">Financial Overview</h3>
                </div>
                <div className="px-5 py-4">
                  {wallet ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-theme-primary/10 border border-theme-primary/20 mb-2">
                         <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-theme-primary/80">Monthly Settlement</p>
                            <p className="text-2xl font-black text-theme-fg">{formatCurrency(wallet.this_month_payout || 0)}</p>
                            <p className="text-[9px] font-bold text-theme-muted mt-1 uppercase tracking-tighter">Current month payout calculated</p>
                         </div>
                         <div className="bg-theme-primary text-theme-surface h-10 w-10 flex items-center justify-center rounded-xl shadow-lg shadow-theme-primary/20">
                            <DollarSign size={20} />
                         </div>
                      </div>
                      <div>
                        <p className="text-xs text-theme-muted">Total Earned (Lifetime)</p>
                        <p className="text-sm font-bold text-theme-fg mt-0.5">{formatCurrency(wallet.earned_total)}</p>
                      </div>
                      <div className="space-y-2 pt-3 border-t border-theme-border">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-theme-muted">Claimable Balance</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(wallet.claimable_amount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-theme-muted">Locked in Vault</span>
                          <span className="font-bold text-amber-600">{formatCurrency(wallet.locked_amount)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-theme-subtle py-4 text-center">No wallet data available</p>
                  )}
                </div>
              </div>

              {/* Compensation */}
              <div className="page-card overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
                  <TrendingUp size={15} className="text-theme-muted" />
                  <h3 className="text-sm font-semibold text-theme-fg">Compensation</h3>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {employee.salary_min && employee.salary_max ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Base Range</p>
                          <p className="text-sm font-black text-theme-fg">{formatCurrency(employee.salary_min)} - {formatCurrency(employee.salary_max)}</p>
                        </div>
                        <Badge variant="info" className="text-[9px]">Performance Linked</Badge>
                      </div>
                      <div className="h-2 w-full bg-theme-raised rounded-full overflow-hidden flex">
                        <div className="h-full bg-theme-primary/40" style={{ width: '30%' }} />
                        <div className="h-full bg-theme-primary" style={{ width: '40%' }} />
                        <div className="h-full bg-theme-primary/40" style={{ width: '30%' }} />
                      </div>
                      <div className="flex justify-between text-[9px] font-black text-theme-muted uppercase tracking-tighter">
                        <span>Min Guaranteed</span>
                        <span>Target Range</span>
                        <span>Max Potential</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-theme-muted uppercase font-bold tracking-tighter mb-1 opacity-70">
                          {employee.salary_structure === "hourly" ? "Hourly Rate" : 
                           employee.salary_structure === "daily" ? "Daily Rate" : 
                           employee.salary_structure === "stipend" ? "Stipend Amount" : 
                           "Base Salary"}
                        </p>
                        <p className="text-2xl font-black text-theme-primary">
                          {employee.hourly_rate ? `₹${employee.hourly_rate}/hr` : 
                           employee.daily_rate ? `₹${employee.daily_rate}/day` : 
                           employee.stipend_amount ? formatCurrency(employee.stipend_amount) : 
                           formatCurrency(employee.base_salary || 0)}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-theme-border">
                        <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">Payment Frequency</p>
                        <p className="text-sm font-semibold text-theme-fg mt-0.5">
                          {employee.salary_structure === "hourly" ? "Cycle: Per Hour" : 
                           employee.salary_structure === "daily" ? "Cycle: Per Day" : 
                           "Cycle: Monthly Settlement"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* KPI Weights (if set) */}
            {employee.kpi_weight !== undefined && (
              <div className="page-card overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
                  <Award size={15} className="text-theme-muted" />
                  <h3 className="text-sm font-semibold text-theme-fg">Performance Weights</h3>
                </div>
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "KPI Weight",        value: employee.kpi_weight ?? 0,        color: "bg-sky-400",   textColor: "text-sky-600" },
                    { label: "KRA Weight",        value: employee.kra_weight ?? 0,        color: "bg-emerald-400", textColor: "text-emerald-600" },
                    { label: "Behavioral Weight", value: employee.behavioral_weight ?? 0, color: "bg-amber-400", textColor: "text-amber-600" },
                  ].map(({ label, value, color, textColor }) => (
                    <div key={label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-theme-muted">{label}</span>
                        <span className={cn("font-bold", textColor)}>{value}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-theme-raised">
                        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="page-card">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={15} className="text-theme-muted" />
                <h3 className="text-sm font-semibold text-theme-fg">Quick Links</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard/attendance">
                  <Button variant="secondary" size="sm">
                    <Calendar size={13} className="mr-1.5" /> Attendance
                  </Button>
                </Link>
                <Link href="/dashboard/incentives">
                  <Button variant="secondary" size="sm">
                    <Award size={13} className="mr-1.5" /> Incentives
                  </Button>
                </Link>
                <Link href="/dashboard/payslips">
                  <Button variant="secondary" size="sm">
                    <FileText size={13} className="mr-1.5" /> Payslips
                  </Button>
                </Link>
                <Link href="/dashboard/performance">
                  <Button variant="secondary" size="sm">
                    <TrendingUp size={13} className="mr-1.5" /> Performance
                  </Button>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="page-card py-16 text-center">
            <p className="text-sm font-semibold text-theme-muted">Limited profile data available</p>
            <p className="text-xs text-theme-subtle mt-1 max-w-md mx-auto">
              Your profile appears to have just been created. Please contact your administrator or check back shortly.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
