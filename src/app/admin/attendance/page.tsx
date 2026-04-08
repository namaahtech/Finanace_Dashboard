"use client";

import React, { useState } from "react";
import { 
 Users, 
 Clock, 
 FileText, 
 ChevronRight, 
 Calendar, 
 Search, 
 Filter,
 ArrowUpRight,
 ShieldCheck,
 Building2,
 PieChart,
 HardDrive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/layout/DashboardShell";

// --- Mock Data: Attendance & Log Sheets ---
const ROLES = ["Executive", "Operations", "Finance", "Sales", "Product", "HR"];

const ROLE_STATS = {
 Executive: { attendance: 98, logProgress: 100, employees: 8, active: 8 },
 Operations: { attendance: 92, logProgress: 85, employees: 42, active: 38 },
 Finance: { attendance: 95, logProgress: 92, employees: 15, active: 14 },
 Sales: { attendance: 88, logProgress: 78, employees: 56, active: 49 },
 Product: { attendance: 94, logProgress: 94, employees: 28, active: 27 },
 HR: { attendance: 99, logProgress: 98, employees: 12, active: 12 },
};

const EMPLOYEES = [
 { id: "1", name: "Priya Sharma", role: "Product", clockIn: "08:55 AM", clockOut: "06:05 PM", hours: "9.1", compliance: 98, status: "Present" },
 { id: "2", name: "Amit Verma", role: "Sales", clockIn: "09:15 AM", clockOut: "06:30 PM", hours: "9.2", compliance: 85, status: "Late" },
 { id: "3", name: "Divya Menon", role: "Executive", clockIn: "08:30 AM", clockOut: "05:45 PM", hours: "9.2", compliance: 100, status: "Present" },
 { id: "4", name: "Kartik Verma", role: "Operations", clockIn: "09:00 AM", clockOut: "06:15 PM", hours: "9.2", compliance: 92, status: "Present" },
 { id: "5", name: "Neha Kapoor", role: "Finance", clockIn: "09:45 AM", clockOut: "06:30 PM", hours: "8.7", compliance: 78, status: "Late" },
 { id: "6", name: "Rohan Gupta", role: "HR", clockIn: "09:05 AM", clockOut: "06:00 PM", hours: "8.9", compliance: 94, status: "Present" },
];

export default function AdminAttendancePage() {
 const [selectedRole, setSelectedRole] = useState("Executive");
 const stats = ROLE_STATS[selectedRole as keyof typeof ROLE_STATS];

 return (
 <DashboardShell
 title="Attendance Command Center"
 subtitle="Universal workforce monitoring and log-sheet telemetry."
 actions={
 <div className="flex gap-3">
 <div className="flex bg-theme-primary rounded-xl p-1 shadow-lg border border-theme-strong">
 <button className="px-4 py-2 bg-theme-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
 Live Feed
 </button>
 <button className="px-4 py-2 text-theme-subtle hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
 History
 </button>
 </div>
 <button className="flex items-center gap-2 px-6 py-2.5 bg-theme-surface text-theme-fg text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-theme-raised transition-all shadow-xl">
 <Calendar size={12} />
 Export Report
 </button>
 </div>
 }
 >
 <div className="flex flex-col gap-6">
 
 {/* Role Navigation Switcher */}
 <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
 {ROLES.map((role) => (
 <button
 key={role}
 onClick={() => setSelectedRole(role)}
 className={cn(
 "group relative px-6 py-8 rounded-2xl transition-all duration-500 overflow-hidden flex flex-col items-center text-center",
 selectedRole === role 
 ? "bg-theme-primary text-white shadow-2xl scale-105 z-10" 
 : "bg-theme-surface text-theme-subtle hover:bg-theme-page hover:text-theme-fg"
 )}
 >
 {/* Background Glow */}
 {selectedRole === role && (
 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent animate-pulse" />
 )}
 
 <div className={cn(
 "p-3 rounded-xl mb-4 transition-transform duration-500 group-hover:scale-110",
 selectedRole === role ? "bg-theme-surface/80" : "bg-theme-raised"
 )}>
 {role === "Executive" && <ShieldCheck size={20} />}
 {role === "Operations" && <HardDrive size={20} />}
 {role === "Finance" && <Building2 size={20} />}
 {role === "Sales" && <Users size={20} />}
 {role === "Product" && <PieChart size={20} />}
 {role === "HR" && <Users size={20} />}
 </div>
 
 <h3 className="text-xs font-black uppercase tracking-widest mb-1">{role}</h3>
 <p className="text-[10px] font-bold opacity-60">Unit Lead</p>
 </button>
 ))}
 </div>

 {/* Global Telemetry Matrix */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 group enterprise-card bg-theme-primary border-theme-strong p-8 flex flex-col justify-between overflow-hidden relative">
 <div className="absolute top-0 right-0 p-8 transform translate-x-1/4 -translate-y-1/4 rotate-12 opacity-5 pointer-events-none">
 <Clock size={320} className="text-white" />
 </div>
 
 <div>
 <div className="flex items-center gap-2 mb-8">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-[10px] font-black text-theme-subtle uppercase tracking-[0.3em]">Sector Performance {selectedRole}</span>
 </div>
 
 <div className="grid grid-cols-2 gap-12 mb-12">
 <div>
 <h2 className="text-5xl font-black text-white tracking-tighter mb-2">{stats.attendance}%</h2>
 <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest leading-loose">Daily Attendance Velocity</p>
 <div className="mt-6 h-1 w-full bg-theme-primary rounded-full overflow-hidden">
 <div className="h-full bg-indigo-500 rounded-full animate-shimmer" style={{ width: `${stats.attendance}%` }} />
 </div>
 </div>
 <div>
 <h2 className="text-5xl font-black text-white tracking-tighter mb-2">{stats.logProgress}%</h2>
 <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest leading-loose">Log Sheet Progress Rail</p>
 <div className="mt-6 h-1 w-full bg-theme-primary rounded-full overflow-hidden">
 <div className="h-full bg-emerald-500 rounded-full animate-shimmer" style={{ width: `${stats.logProgress}%` }} />
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-8 border-t border-theme-strong pt-8">
 <div>
 <span className="block text-[8px] font-black text-theme-muted uppercase tracking-widest mb-1">Total Unit Headcount</span>
 <span className="text-xl font-black text-white">{stats.employees} Personnel</span>
 </div>
 <div className="w-px bg-theme-primary" />
 <div>
 <span className="block text-[8px] font-black text-theme-muted uppercase tracking-widest mb-1">Status: Operational</span>
 <span className="text-xl font-black text-white">{stats.active} On-Field</span>
 </div>
 </div>
 </div>

 <div className="enterprise-card bg-theme-surface p-8 flex flex-col justify-between group">
 <div className="mb-8">
 <div className="flex items-center justify-between mb-8">
 <h3 className="text-[10px] font-black text-theme-fg uppercase tracking-widest">Compliance Drift</h3>
 <div className="p-2 bg-theme-raised rounded-lg group-hover:bg-theme-primary group-hover:text-white transition-colors">
 <ArrowUpRight size={16} />
 </div>
 </div>
 <p className="text-[9px] font-bold text-theme-subtle uppercase tracking-widest leading-relaxed mb-6">Real-time monitoring of policy adherence across decentralized units.</p>
 <div className="space-y-4">
 {[1, 2, 3].map(i => (
 <div key={i} className="flex flex-col gap-2">
 <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-theme-muted">
 <span>Phase {i} Strategy</span>
 <span>{90 + i}%</span>
 </div>
 <div className="h-1 w-full bg-theme-raised rounded-full overflow-hidden">
 <div className="h-full bg-theme-primary" style={{ width: `${90 + i}%` }} />
 </div>
 </div>
 ))}
 </div>
 </div>
 <button className="w-full py-4 text-[10px] font-black text-theme-fg uppercase tracking-widest border border-theme-border rounded-xl hover:bg-theme-primary hover:text-white transition-all">
 Access Deep Telemetry
 </button>
 </div>
 </div>

 {/* Detailed Administrative Log Sheet */}
 <div className="enterprise-card bg-theme-surface overflow-hidden p-0">
 <div className="p-8 border-b border-theme-border flex items-center justify-between">
 <h3 className="text-xs font-black text-theme-fg uppercase tracking-widest flex items-center gap-3">
 <FileText size={16} className="text-theme-subtle" />
 Unified Attendance Log Sheet
 </h3>
 <div className="flex items-center gap-4">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-subtle" size={14} />
 <input 
 type="text" 
 placeholder="SEARCH PERSONNEL..." 
 className="pl-10 pr-4 py-2 bg-theme-page border-none rounded-lg text-[9px] font-black uppercase tracking-widest focus:ring-1 focus:ring-slate-200 outline-none w-64"
 />
 </div>
 <button className="p-2 bg-theme-page text-theme-subtle hover:text-theme-fg rounded-lg transition-all">
 <Filter size={16} />
 </button>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="bg-theme-page text-[9px] text-theme-muted font-black uppercase tracking-[0.2em]">
 <th className="px-8 py-4">Personnel</th>
 <th className="px-8 py-4">Functional Role</th>
 <th className="px-8 py-4">Clock-In Hub</th>
 <th className="px-8 py-4">Clock-Out Hub</th>
 <th className="px-8 py-4">Total Cycles</th>
 <th className="px-8 py-4">Compliance Score</th>
 <th className="px-8 py-4 text-right">State</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {EMPLOYEES.map((person) => (
 <tr key={person.id} className="group hover:bg-theme-page transition-colors cursor-pointer">
 <td className="px-8 py-4">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-theme-primary text-white flex items-center justify-center text-[10px] font-black uppercase">
 {person.name.split(' ').map(n => n[0]).join('')}
 </div>
 <span className="text-xs font-black tracking-tight text-theme-fg">{person.name}</span>
 </div>
 </td>
 <td className="px-8 py-4">
 <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">{person.role} Unit</span>
 </td>
 <td className="px-8 py-4 font-mono text-[10px] text-theme-subtle">{person.clockIn}</td>
 <td className="px-8 py-4 font-mono text-[10px] text-theme-subtle">{person.clockOut}</td>
 <td className="px-8 py-4 font-mono text-[10px] text-theme-subtle">{person.hours} hrs</td>
 <td className="px-8 py-4 text-xs font-black text-theme-fg">{person.compliance}%</td>
 <td className="px-8 py-4 text-right">
 <div className={cn(
 "inline-flex items-center px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
 person.status === "Present" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
 )}>
 {person.status}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="p-6 bg-theme-page border-t border-theme-border flex items-center justify-center">
 <button className="text-[10px] font-black text-theme-subtle uppercase tracking-[0.3em] hover:text-theme-fg transition-colors flex items-center gap-2">
 Syncing Unified Records
 <ChevronRight size={14} />
 </button>
 </div>
 </div>
 </div>

 <style jsx global>{`
 @keyframes shimmer {
 0% { opacity: 0.5; }
 50% { opacity: 1; }
 100% { opacity: 0.5; }
 }
 .animate-shimmer {
 animation: shimmer 2s infinite ease-in-out;
 }
 `}</style>
 </DashboardShell>
 );
}
