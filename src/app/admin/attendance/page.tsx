"use client";

import React, { useState } from "react";
import {
  Users,
  Clock,
  CalendarDays,
  Search,
  Filter,
  Download,
  UserCheck,
  UserX,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// --- Mock Data ---
const DEPARTMENTS = ["All", "Executive", "Operations", "Finance", "Sales", "Product", "HR"];

const ATTENDANCE_RECORDS = [
  { id: "1", name: "Priya Sharma", dept: "Product", clockIn: "08:55 AM", clockOut: "06:05 PM", hours: 9.1, compliance: 98, status: "present" },
  { id: "2", name: "Amit Verma", dept: "Sales", clockIn: "09:15 AM", clockOut: "06:30 PM", hours: 9.2, compliance: 85, status: "late" },
  { id: "3", name: "Divya Menon", dept: "Executive", clockIn: "08:30 AM", clockOut: "05:45 PM", hours: 9.2, compliance: 100, status: "present" },
  { id: "4", name: "Kartik Verma", dept: "Operations", clockIn: "09:00 AM", clockOut: "06:15 PM", hours: 9.2, compliance: 92, status: "present" },
  { id: "5", name: "Neha Kapoor", dept: "Finance", clockIn: "09:45 AM", clockOut: "06:30 PM", hours: 8.7, compliance: 78, status: "late" },
  { id: "6", name: "Rohan Gupta", dept: "HR", clockIn: "09:05 AM", clockOut: "06:00 PM", hours: 8.9, compliance: 94, status: "present" },
  { id: "7", name: "Sanya Iyer", dept: "Product", clockIn: "—", clockOut: "—", hours: 0, compliance: 0, status: "absent" },
  { id: "8", name: "Dev Mehta", dept: "Sales", clockIn: "10:10 AM", clockOut: "06:00 PM", hours: 7.8, compliance: 72, status: "late" },
  { id: "9", name: "Ananya Pillai", dept: "Engineering", clockIn: "08:45 AM", clockOut: "06:20 PM", hours: 9.5, compliance: 97, status: "present" },
  { id: "10", name: "Manish Rao", dept: "Finance", clockIn: "08:58 AM", clockOut: "05:50 PM", hours: 8.8, compliance: 95, status: "present" },
];

const statusBadge: Record<string, "success" | "warning" | "danger"> = {
  present: "success",
  late: "warning",
  absent: "danger",
};

export default function AdminAttendancePage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  const filtered = ATTENDANCE_RECORDS.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.dept.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || r.dept === deptFilter;
    return matchSearch && matchDept;
  });

  const present = ATTENDANCE_RECORDS.filter((r) => r.status === "present").length;
  const late = ATTENDANCE_RECORDS.filter((r) => r.status === "late").length;
  const absent = ATTENDANCE_RECORDS.filter((r) => r.status === "absent").length;
  const avgCompliance = Math.round(
    ATTENDANCE_RECORDS.filter((r) => r.compliance > 0).reduce((s, r) => s + r.compliance, 0) /
      ATTENDANCE_RECORDS.filter((r) => r.compliance > 0).length
  );

  return (
    <DashboardShell
      title="Attendance"
      subtitle="Daily attendance log and workforce compliance."
      actions={
        <Button variant="secondary" size="sm">
          <Download size={14} className="mr-2" />
          Export Report
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Employees", value: ATTENDANCE_RECORDS.length, icon: Users, color: "text-theme-fg", bg: "bg-theme-raised" },
            { label: "Present", value: present, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Late", value: late, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
            { label: "Absent", value: absent, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-4">
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xs text-theme-muted">{label}</p>
                <p className={cn("text-2xl font-black", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Compliance Bar */}
        <div className="page-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-theme-muted" />
              <span className="text-xs font-semibold text-theme-fg">Overall Compliance</span>
            </div>
            <span className="text-sm font-black text-theme-fg">{avgCompliance}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-theme-raised">
            <div
              className="h-full rounded-full bg-theme-primary transition-all"
              style={{ width: `${avgCompliance}%` }}
            />
          </div>
          <div className="mt-3 flex gap-6">
            {[
              { label: "Present", count: present, color: "bg-emerald-500" },
              { label: "Late", count: late, color: "bg-amber-500" },
              { label: "Absent", count: absent, color: "bg-red-500" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", color)} />
                <span className="text-xs text-theme-muted">
                  {label}: <span className="font-semibold text-theme-fg">{count}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Department filter tabs */}
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                deptFilter === dept
                  ? "bg-theme-primary text-theme-surface shadow-sm"
                  : "bg-theme-raised text-theme-muted hover:text-theme-fg"
              )}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Attendance Table */}
        <div className="page-card overflow-hidden p-0">
          {/* Table Header */}
          <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-theme-muted" />
              <h3 className="text-sm font-semibold text-theme-fg">
                Attendance Log
                <span className="ml-2 text-xs font-normal text-theme-muted">
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all w-52"
                />
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-page text-theme-muted hover:text-theme-fg transition-colors">
                <Filter size={13} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-6 py-3 font-semibold">Employee</th>
                  <th className="px-6 py-3 font-semibold">Department</th>
                  <th className="px-6 py-3 font-semibold">Clock In</th>
                  <th className="px-6 py-3 font-semibold">Clock Out</th>
                  <th className="px-6 py-3 font-semibold">Hours</th>
                  <th className="px-6 py-3 font-semibold">Compliance</th>
                  <th className="px-6 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-theme-subtle">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((person) => (
                    <tr
                      key={person.id}
                      className="group cursor-pointer transition-colors hover:bg-theme-raised/50"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black uppercase">
                            {person.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-xs font-semibold text-theme-fg">{person.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-theme-muted">{person.dept}</span>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-theme-fg">{person.clockIn}</td>
                      <td className="px-6 py-3 font-mono text-xs text-theme-fg">{person.clockOut}</td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-semibold text-theme-fg">
                          {person.hours > 0 ? `${person.hours}h` : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {person.compliance > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-theme-raised">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  person.compliance >= 90
                                    ? "bg-emerald-500"
                                    : person.compliance >= 75
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                )}
                                style={{ width: `${person.compliance}%` }}
                              />
                            </div>
                            <span className="text-xs text-theme-muted">{person.compliance}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-theme-subtle">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Badge variant={statusBadge[person.status]}>
                          {person.status.charAt(0).toUpperCase() + person.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-6 py-3">
            <span className="text-xs text-theme-subtle">Showing {filtered.length} of {ATTENDANCE_RECORDS.length} employees</span>
            <button className="flex items-center gap-1 text-xs text-theme-muted hover:text-theme-fg transition-colors">
              View full history <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
