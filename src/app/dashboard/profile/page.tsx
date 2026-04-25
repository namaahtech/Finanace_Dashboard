"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import dayjs from "dayjs";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Award,
  TrendingUp,
  Users,
  Building2,
  FileText,
  ArrowLeft,
  Edit3,
  Clock,
  DollarSign,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  role: string;
  department: string;
  designation: string;
  team_id?: string;
  joining_date?: string;
  employment_type?: string;
  salary_structure?: string;
  base_salary?: number;
  salary_min?: number;
  salary_max?: number;
  salary_step?: number;
  hourly_rate?: number;
  daily_rate?: number;
  stipend_amount?: number;
  kpi_weight?: number;
  kra_weight?: number;
  behavioral_weight?: number;
  kpi_enabled?: boolean;
  enable_salary_linkage?: boolean;
  is_active: boolean;
}

interface KpiScore {
  id: string;
  kpi_score: number;
  kra_score: number;
  behavioral_score: number;
  final_score: number;
  month: number;
  year: number;
}

interface WalletData {
  earned_total: number;
  locked_amount: number;
  claimable_amount: number;
}

interface TeamData {
  id: string;
  name: string;
  department: string;
}

export default function EmployeeProfile() {
  const { user } = useAuth();
  const { request } = useApi();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [kpiScore, setKpiScore] = useState<KpiScore | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch complete employee data from API
      try {
        const empRes = await request<any>({ url: `/api/employees/${user.id}` });

        if (empRes?.data) {
          setEmployee(empRes.data as Employee);
          setUsingFallback(false);
        } else {
          throw new Error("No data returned");
        }
      } catch (apiErr: any) {
        // Fall back to auth context - no error logging to avoid console spam
        const employeeData: Employee = {
          id: user.id,
          name: user.name,
          email: user.email,
          employee_id: user.employee_id,
          role: user.role,
          department: user.department || "Not assigned",
          designation: user.designation || "Not specified",
          is_active: true,
        };
        setEmployee(employeeData);
        setUsingFallback(true);
      }

      // Fetch KPI and wallet separately (non-critical, don't fail if missing)
      try {
        const kpiRes = await request<any>({ url: `/api/kpi?month=${dayjs().month() + 1}&year=${dayjs().year()}` });
        if (kpiRes?.data?.[0]) {
          setKpiScore(kpiRes.data[0] as KpiScore);
        }
      } catch (e) {
        // Silently fail for non-critical data
      }

      try {
        const walletRes = await request<{ wallet: WalletData }>({ url: "/api/wallet" });
        if (walletRes?.wallet) setWallet(walletRes.wallet);
      } catch (e) {
        // Silently fail for non-critical data
      }
    } finally {
      setLoading(false);
    }
  }, [user, request]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Real-time subscription: detect if employee is deleted
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`employee_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'employees',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          // Show notification
          const notification = document.createElement('div');
          notification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px; border-radius: 8px; z-index: 9999;">
              Your employee profile was deleted. Logging out...
            </div>
          `;
          document.body.appendChild(notification);

          // Auto-logout after 2 seconds
          setTimeout(() => {
            supabase.auth.signOut().then(() => {
              window.location.href = '/login';
            });
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const getStatusColor = (status: boolean) => {
    return status ? "text-emerald-600" : "text-red-600";
  };

  const getStatusLabel = (status: boolean) => {
    return status ? "Active" : "Inactive";
  };

  return (
    <DashboardShell
      title="Employee Profile"
      subtitle="View and manage your professional information"
      actions={
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="font-black uppercase tracking-widest text-[10px] h-9">
            <ArrowLeft size={14} className="mr-2" /> Back
          </Button>
        </Link>
      }
    >
      <div className="space-y-6 animate-in fade-in duration-700">
        {usingFallback && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-black text-amber-600">!</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-700 mb-1">Incomplete Profile Data</p>
              <p className="text-xs text-amber-600">Your profile information is still being synced. Salary details and other employment information will appear once fully synchronized. Please refresh the page if data doesn't update within a few moments.</p>
            </div>
          </div>
        )}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-theme-raised animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : employee ? (
          <>
            {/* Header Card */}
            <div className="enterprise-card bg-gradient-to-r from-theme-primary/10 to-theme-primary/5 p-8 border border-theme-primary/20 shadow-xl rounded-2xl">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-theme-primary/20 border-2 border-theme-primary flex items-center justify-center">
                      <span className="text-2xl font-black text-theme-primary">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-black text-theme-fg mb-1">{employee.name}</h1>
                      <p className="text-sm font-bold text-theme-primary uppercase tracking-widest">{employee.designation}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <span className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                      getStatusColor(employee.is_active)
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                        : "bg-red-500/10 border-red-500/20 text-red-600"
                    )}>
                      {getStatusLabel(employee.is_active)}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-theme-raised border border-theme-border text-theme-fg">
                      {employee.role}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-theme-page border border-theme-border text-theme-muted">
                      {employee.employment_type}
                    </span>
                  </div>
                </div>

                <Link href="/dashboard">
                  <Button className="font-black uppercase tracking-widest text-[10px] h-10">
                    <Edit3 size={14} className="mr-2" /> Edit Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Contact & Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Information */}
              <div className="enterprise-card bg-theme-surface p-6 border border-theme-border shadow-lg rounded-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-5 flex items-center gap-2">
                  <Mail size={14} className="text-theme-primary" />
                  Contact Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Email Address</p>
                    <p className="text-sm font-semibold text-theme-fg break-all">{employee.email}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Employee ID</p>
                    <p className="text-sm font-mono font-bold text-theme-primary">{employee.employee_id}</p>
                  </div>

                  <div className="pt-2 border-t border-theme-border/30">
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-2">Quick Actions</p>
                    <div className="flex gap-2">
                      <a href={`mailto:${employee.email}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-[10px] font-bold h-8">
                          <Mail size={12} className="mr-1" /> Email
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="enterprise-card bg-theme-surface p-6 border border-theme-border shadow-lg rounded-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-5 flex items-center gap-2">
                  <Briefcase size={14} className="text-theme-primary" />
                  Professional Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Department</p>
                    <p className="text-sm font-semibold text-theme-fg">{employee.department || "Not assigned"}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Designation</p>
                    <p className="text-sm font-semibold text-theme-fg">{employee.designation || "Not specified"}</p>
                  </div>

                  <div className="pt-2 border-t border-theme-border/30">
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Salary Structure</p>
                    <p className="text-sm font-semibold text-theme-fg capitalize">{employee.salary_structure?.replace(/_/g, " ") || "Not set"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Employment & Team Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employment Information */}
              <div className="enterprise-card bg-theme-surface p-6 border border-theme-border shadow-lg rounded-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-5 flex items-center gap-2">
                  <Calendar size={14} className="text-theme-primary" />
                  Employment Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Joining Date</p>
                    <p className="text-sm font-semibold text-theme-fg">
                      {employee.joining_date
                        ? dayjs(employee.joining_date).format("DD MMMM YYYY")
                        : "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Employment Type</p>
                    <p className="text-sm font-semibold text-theme-fg capitalize">{employee.employment_type?.replace(/_/g, " ") || "Not set"}</p>
                  </div>

                  <div className="pt-2 border-t border-theme-border/30">
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Tenure</p>
                    <p className="text-sm font-bold text-theme-primary">
                      {employee.joining_date
                        ? `${dayjs().diff(dayjs(employee.joining_date), "months")} months`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Information */}
              <div className="enterprise-card bg-theme-surface p-6 border border-theme-border shadow-lg rounded-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-5 flex items-center gap-2">
                  <Users size={14} className="text-theme-primary" />
                  Team Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Team Name</p>
                    <p className="text-sm font-semibold text-theme-fg">{team?.name || "Not assigned to a team"}</p>
                  </div>

                  {team && (
                    <div>
                      <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Team Department</p>
                      <p className="text-sm font-semibold text-theme-fg">{team.department}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-theme-border/30">
                    <Link href="/dashboard/projects">
                      <Button variant="outline" size="sm" className="w-full text-[10px] font-bold h-8">
                        <Briefcase size={12} className="mr-1" /> View Assigned Projects
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance & Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* KPI Score Card */}
              <div className="enterprise-card bg-theme-surface p-6 border border-theme-border shadow-lg rounded-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-5 flex items-center gap-2">
                  <Award size={14} className="text-theme-primary" />
                  Current KPI Score
                </h3>

                {kpiScore ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-black text-theme-primary mb-2">{kpiScore.final_score.toFixed(1)}%</div>
                      <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                        {dayjs().format("MMMM YYYY")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-theme-muted">KPI Score</span>
                        <span className="text-xs font-black text-theme-fg">{kpiScore.kpi_score.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-theme-page rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${kpiScore.kpi_score}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-theme-muted">KRA Score</span>
                        <span className="text-xs font-black text-theme-fg">{kpiScore.kra_score.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-theme-page rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${kpiScore.kra_score}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-theme-muted">Behavioral Score</span>
                        <span className="text-xs font-black text-theme-fg">{kpiScore.behavioral_score.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-theme-page rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${kpiScore.behavioral_score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-theme-muted">No KPI data available</p>
                )}
              </div>

              {/* Financial Overview */}
              <div className="enterprise-card bg-theme-surface p-6 border border-theme-border shadow-lg rounded-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-5 flex items-center gap-2">
                  <DollarSign size={14} className="text-theme-primary" />
                  Financial Overview
                </h3>

                {wallet ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-2">Total Earned</p>
                      <p className="text-2xl font-black text-emerald-600">{formatCurrency(wallet.earned_total)}</p>
                    </div>

                    <div className="pt-3 border-t border-theme-border/30 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-theme-muted">Claimable</span>
                        <span className="text-sm font-black text-emerald-600">{formatCurrency(wallet.claimable_amount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-theme-muted">Locked</span>
                        <span className="text-sm font-bold text-amber-600">{formatCurrency(wallet.locked_amount)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-theme-muted">No wallet data available</p>
                )}
              </div>

              {/* Base Salary Card */}
              <div className="enterprise-card bg-theme-surface p-6 border border-theme-border shadow-lg rounded-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-5 flex items-center gap-2">
                  <TrendingUp size={14} className="text-theme-primary" />
                  Compensation
                </h3>

                <div className="space-y-4">
                  {employee.salary_structure === "stipend" ? (
                    <>
                      <div>
                        <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-2">Stipend Range</p>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <p className="text-[10px] text-theme-muted mb-1">Min</p>
                            <p className="text-lg font-black text-emerald-600">{formatCurrency(employee.salary_min || 0)}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-theme-muted mb-1">Max</p>
                            <p className="text-lg font-black text-theme-primary">{formatCurrency(employee.salary_max || 0)}</p>
                          </div>
                        </div>
                      </div>
                      {employee.enable_salary_linkage && (
                        <div className="pt-3 border-t border-theme-border/30">
                          <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-2">Salary Linked to KPI/KRA</p>
                          <p className="text-xs font-semibold text-emerald-600">✓ Enabled</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-2">
                          {employee.salary_structure === "hourly" ? "Hourly Rate" : employee.salary_structure === "daily" ? "Daily Rate" : "Base Salary"}
                        </p>
                        <p className="text-2xl font-black text-theme-primary">
                          {employee.hourly_rate ? `₹${employee.hourly_rate}/hr` : employee.daily_rate ? `₹${employee.daily_rate}/day` : formatCurrency(employee.base_salary || 0)}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-theme-border/30">
                        <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-2">Payment Frequency</p>
                        <p className="text-sm font-semibold text-theme-fg capitalize">Monthly</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Salary Range & KPI Weights */}
            {(employee.salary_min || employee.kpi_weight) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Salary Range */}
                {employee.salary_structure === "stipend" && (
                  <div className="enterprise-card bg-theme-surface p-6 border border-theme-border shadow-lg rounded-2xl">
                    <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-5 flex items-center gap-2">
                      <DollarSign size={14} className="text-theme-primary" />
                      Salary Range Details
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Minimum Salary</p>
                        <p className="text-lg font-black text-emerald-600">{formatCurrency(employee.salary_min || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Maximum Salary</p>
                        <p className="text-lg font-black text-theme-primary">{formatCurrency(employee.salary_max || 0)}</p>
                      </div>
                      {employee.salary_step && (
                        <div>
                          <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Increment Step</p>
                          <p className="text-sm font-semibold text-theme-fg">{formatCurrency(employee.salary_step)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* KPI Weights */}
                {employee.kpi_weight !== undefined && (
                  <div className="enterprise-card bg-theme-surface p-6 border border-theme-border shadow-lg rounded-2xl">
                    <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-5 flex items-center gap-2">
                      <Award size={14} className="text-theme-primary" />
                      Performance Weights
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">KPI Weight</span>
                          <span className="text-xs font-black text-blue-600">{employee.kpi_weight}%</span>
                        </div>
                        <div className="h-2 w-full bg-theme-page rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${employee.kpi_weight}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">KRA Weight</span>
                          <span className="text-xs font-black text-emerald-600">{employee.kra_weight}%</span>
                        </div>
                        <div className="h-2 w-full bg-theme-page rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${employee.kra_weight}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Behavioral Weight</span>
                          <span className="text-xs font-black text-amber-600">{employee.behavioral_weight}%</span>
                        </div>
                        <div className="h-2 w-full bg-theme-page rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${employee.behavioral_weight}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional Information */}
            <div className="enterprise-card bg-theme-page/30 p-6 border border-theme-border rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-theme-primary/10 border border-theme-primary/20">
                  <FileText size={18} className="text-theme-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg mb-2">Quick Links</h3>
                  <p className="text-[10px] text-theme-muted mb-4">Access other sections of your profile</p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/dashboard/attendance">
                      <Button variant="outline" size="sm" className="text-[10px] font-bold h-8">
                        <Calendar size={12} className="mr-1" /> Attendance
                      </Button>
                    </Link>
                    <Link href="/dashboard/incentives">
                      <Button variant="outline" size="sm" className="text-[10px] font-bold h-8">
                        <Award size={12} className="mr-1" /> Incentives
                      </Button>
                    </Link>
                    <Link href="/dashboard/payslips">
                      <Button variant="outline" size="sm" className="text-[10px] font-bold h-8">
                        <FileText size={12} className="mr-1" /> Payslips
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-theme-muted font-bold">Limited profile data available</p>
            <p className="text-sm text-theme-muted text-center max-w-md">
              Your profile appears to have just been created. Please contact your administrator or check back shortly for full profile details.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
