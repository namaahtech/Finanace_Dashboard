"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
 Building2, 
 Users, 
 Plus, 
 Search, 
 MoreHorizontal, 
 Crown, 
 TrendingUp, 
 PieChart,
 UserCheck,
 ChevronRight,
 X
} from "lucide-react";
import { 
 Select, 
 SelectContent, 
 SelectGroup, 
 SelectItem, 
 SelectTrigger, 
 SelectValue 
} from "@/components/ui/Select";
import { useState, useEffect } from "react";
import { CORPORATE_TEAMS as TEAMS } from "@/constants/teams";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const DEPT_COLORS: Record<string, "default" | "info" | "success" | "purple"> = {
 Engineering: "info",
 Product: "purple",
 Sales: "success",
 Marketing: "default",
 Operations: "default",
 Finance: "success",
 People: "purple",
 Legal: "default",
};

export default function TeamsPage() {
 const [search, setSearch] = useState("");
 const [deptFilter, setDeptFilter] = useState("All");
 const [showForm, setShowForm] = useState(false);
 const [form, setForm] = useState({
 name: "", department: "", lead: "", members: "", budget: ""
 });

 useEffect(() => {
 const handleEsc = (e: KeyboardEvent) => {
 if (e.key === "Escape") setShowForm(false);
 };
 if (showForm) window.addEventListener("keydown", handleEsc);
 return () => window.removeEventListener("keydown", handleEsc);
 }, [showForm]);

 const departments = ["All", ...Array.from(new Set(TEAMS.map((t) => t.department)))];
 const filtered = TEAMS.filter((t) => {
 const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
 t.lead.toLowerCase().includes(search.toLowerCase());
 const matchDept = deptFilter === "All" || t.department === deptFilter;
 return matchSearch && matchDept;
 });

 const totalMembers = TEAMS.reduce((s, t) => s + t.members, 0);
 const totalBudget = TEAMS.reduce((s, t) => s + t.budget, 0);

 return (
 <DashboardShell
 title="Company Teams"
 subtitle="Manage and organize your functional teams."
 actions={
 <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
 <Plus size={14} className="mr-2" /> Create New Team
 </Button>
 }
 >
 <div className="space-y-8">
 {/* Establishment Modal Overlay */}
 {showForm && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-primary/20 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="enterprise-card w-full max-w-2xl bg-theme-surface shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-visible">
 {/* Modal Header */}
 <div className="flex justify-between items-center px-8 py-5 border-b border-theme-border bg-theme-raised/50">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-theme-primary text-white rounded-lg">
 <Building2 size={18} />
 </div>
 <div>
 <h3 className="text-sm font-black text-theme-fg uppercase tracking-[0.2em]">Create New Team</h3>
 <p className="text-[10px] text-theme-subtle font-bold uppercase tracking-widest mt-1">Add a new team to the company roster</p>
 </div>
 </div>
 <button 
 onClick={() => setShowForm(false)}
 className="p-2 hover:bg-theme-raised rounded-full transition-colors group"
 >
 <X size={20} className="text-theme-subtle group-hover:text-theme-fg" />
 </button>
 </div>

 {/* Modal Content / Form */}
 <div className="p-8">
 <form className="space-y-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
 {[
 { key: "name", label: "Team Name", type: "text", placeholder: "e.g. Backend Dev", icon: <Building2 size={14} /> },
 { key: "lead", label: "Team Lead", type: "text", placeholder: "e.g. Arjun Singh", icon: <Crown size={14} /> },
 ].map(({ key, label, type, placeholder, icon }) => (
 <div key={key} className="space-y-1.5">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-theme-subtle">{icon}</span>
 <label className="text-[10px] font-extrabold text-theme-muted uppercase tracking-widest">{label}</label>
 </div>
 <input
 type={type}
 required
 placeholder={placeholder}
 value={(form as Record<string, string>)[key]}
 onChange={(e) => setForm({ ...form, [key]: e.target.value })}
 className="w-full rounded-lg border border-theme-border bg-theme-page px-4 py-3 text-xs text-theme-fg outline-none focus:bg-theme-surface focus:border-theme-strong transition-all font-semibold"
 />
 </div>
 ))}

 <div className="space-y-1.5 overflow-visible">
 <div className="flex items-center gap-2 mb-1">
 <TrendingUp size={14} className="text-theme-subtle" />
 <label className="text-[10px] font-extrabold text-theme-muted uppercase tracking-widest">Department</label>
 </div>
 <Select 
 onValueChange={(val) => setForm({ ...form, department: val })}
 value={form.department}
 required
 >
 <SelectTrigger>
 <SelectValue placeholder="SELECT DEPARTMENT" />
 </SelectTrigger>
 <SelectContent>
 <SelectGroup>
 {Array.from(new Set(TEAMS.map(t => t.department))).map(dept => (
 <SelectItem key={dept} value={dept}>{dept.toUpperCase()}</SelectItem>
 ))}
 </SelectGroup>
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
 <div className="space-y-1.5">
 <div className="flex items-center gap-2 mb-1">
 <Users size={14} className="text-theme-subtle" />
 <label className="text-[10px] font-extrabold text-theme-muted uppercase tracking-widest">Total Members</label>
 </div>
 <input
 type="number"
 required
 placeholder="e.g. 5"
 value={form.members}
 onChange={(e) => setForm({ ...form, members: e.target.value })}
 className="w-full rounded-lg border border-theme-border bg-theme-page px-4 py-3 text-xs text-theme-fg outline-none focus:bg-theme-surface focus:border-theme-strong transition-all font-semibold"
 />
 </div>
 <div className="space-y-1.5">
 <div className="flex items-center gap-2 mb-1">
 <PieChart size={14} className="text-theme-subtle" />
 <label className="text-[10px] font-extrabold text-theme-muted uppercase tracking-widest">Monthly Budget</label>
 </div>
 <input
 type="text"
 required
 placeholder="e.g. 100000"
 value={form.budget}
 onChange={(e) => setForm({ ...form, budget: e.target.value })}
 className="w-full rounded-lg border border-theme-border bg-theme-page px-4 py-3 text-xs text-theme-fg outline-none focus:bg-theme-surface focus:border-theme-strong transition-all font-semibold"
 />
 </div>
 </div>
 </div>
 
 <div className="flex justify-end gap-3 pt-6 border-t border-theme-border">
 <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
 Cancel
 </Button>
 <Button type="button" size="lg" className="px-12" onClick={() => setShowForm(false)}>
 Create Team
 </Button>
 </div>
 </form>
 </div>
 </div>
 </div>
 )}
 {/* Executive Overview Stats */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 {[
 { label: "Active Teams", value: TEAMS.length, icon: <Building2 size={20} />, trend: "+2.4%" },
 { label: "Total Members", value: totalMembers, icon: <Users size={20} />, trend: "+12" },
 { label: "Departments", value: departments.length - 1, icon: <TrendingUp size={20} />, trend: "Steady" },
 { label: "Total Budget", value: `₹${(totalBudget / 100000).toFixed(1)}L`, icon: <PieChart size={20} />, trend: "+5.1%" },
 ].map((s) => (
 <div key={s.label} className="enterprise-card p-6 bg-theme-surface flex flex-col justify-between">
 <div className="flex justify-between items-start mb-4">
 <div className="p-2.5 bg-theme-page rounded-lg text-theme-fg border border-theme-border">
 {s.icon}
 </div>
 <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-widest">{s.trend}</span>
 </div>
 <div>
 <p className="text-[10px] font-extrabold text-theme-subtle uppercase tracking-[0.2em] mb-1">{s.label}</p>
 <p className="text-2xl font-black text-theme-fg tabular-nums">{s.value}</p>
 </div>
 </div>
 ))}
 </div>

 {/* Global Filter Matrix */}
 <div className="enterprise-card bg-theme-surface overflow-hidden">
 <div className="p-6 flex flex-col lg:flex-row gap-6 justify-between items-center border-b border-theme-border">
 <div className="flex flex-wrap gap-2">
 {departments.map((d) => (
 <button
 key={d}
 onClick={() => setDeptFilter(d)}
 className={cn(
 "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
 deptFilter === d 
 ? "bg-theme-primary text-white shadow-lg shadow-slate-200" 
 : "bg-theme-page text-theme-subtle hover:text-theme-muted border border-theme-border"
 )}
 >
 {d}
 </button>
 ))}
 </div>
 
 <div className="relative w-full lg:w-96 group">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-subtle group-focus-within:text-theme-fg transition-colors" />
 <input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search units or functional leads..."
 className="w-full rounded-lg border border-theme-border bg-theme-page pl-10 pr-4 py-3 text-xs text-theme-fg outline-none focus:bg-theme-surface focus:border-theme-strong transition-all font-semibold"
 />
 </div>
 </div>

 {/* Units Data Matrix */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-slate-50 border-t border-theme-border">
 {filtered.map((team) => (
 <div key={team.id} className="p-8 hover:bg-theme-raised/50 transition-all group relative overflow-hidden">
 <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
 <button className="p-2 hover:bg-theme-surface rounded-lg border border-theme-border transition-colors">
 <MoreHorizontal size={16} className="text-theme-subtle" />
 </button>
 </div>

 <div className="flex items-center gap-4 mb-8">
 <div className="w-14 h-14 rounded-2xl bg-theme-primary text-white flex items-center justify-center font-black text-lg shadow-xl shadow-slate-200 transition-transform group-hover:scale-105">
 {team.name.slice(0, 2).toUpperCase()}
 </div>
 <div>
 <h4 className="text-sm font-black text-theme-fg uppercase tracking-tight group-hover:text-theme-fg transition-colors">{team.name}</h4>
 <Badge variant={DEPT_COLORS[team.department] || "default"} className="mt-1.5 border-none px-0 tracking-[0.2em] font-black opacity-60">
 {team.department.toUpperCase()}
 </Badge>
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between p-3 bg-theme-page rounded-xl border border-theme-border/50">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-theme-surface flex items-center justify-center shadow-sm border border-theme-border">
 <Crown size={12} className="text-theme-fg" />
 </div>
 <div className="flex flex-col">
 <span className="text-[9px] font-black text-theme-subtle uppercase tracking-widest">Team Lead</span>
 <span className="text-[11px] font-bold text-theme-fg">{team.lead}</span>
 </div>
 </div>
 <Button variant="secondary" size="sm" className="h-7 w-7 p-0 flex items-center justify-center rounded-lg">
 <UserCheck size={12} />
 </Button>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="p-4 rounded-xl border border-theme-border bg-theme-surface shadow-sm">
 <span className="text-[9px] font-black text-theme-subtle uppercase tracking-widest block mb-1">Members</span>
 <div className="flex items-center justify-between">
 <span className="text-lg font-black text-theme-fg tabular-nums">{team.members}</span>
 <Users size={14} className="text-theme-subtle" />
 </div>
 </div>
 <div className="p-4 rounded-xl border border-theme-border bg-theme-surface shadow-sm">
 <span className="text-[9px] font-black text-theme-subtle uppercase tracking-widest block mb-1">Budget</span>
 <div className="flex items-center justify-between">
 <span className="text-lg font-black text-theme-fg tabular-nums">₹{(team.budget / 1000).toFixed(0)}K</span>
 <TrendingUp size={14} className="text-theme-subtle" />
 </div>
 </div>
 </div>
 </div>

 <button className="w-full mt-6 py-3 border-t border-theme-border flex items-center justify-between text-[10px] font-black text-theme-subtle uppercase tracking-[0.2em] group-hover:text-theme-fg transition-colors">
 View Team Analytics
 <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
 </button>
 </div>
 ))}
 </div>

 {filtered.length === 0 && (
 <div className="flex flex-col items-center justify-center py-32 text-center">
 <Building2 size={60} className="text-theme-subtle mb-6" />
 <p className="text-[11px] font-black text-theme-subtle uppercase tracking-[0.4em]">No Organizational Units Match Criteria</p>
 </div>
 )}
 </div>
 
 {/* Footer Audit Metadata */}
 <div className="flex justify-between items-center text-[10px] font-black text-theme-subtle uppercase tracking-[0.3em] px-2">
 <div className="flex items-center gap-4">
 <span>Sync Status: Real-Time</span>
 <span>Primary Clusters: {departments.length - 1}</span>
 </div>
 <div className="flex items-center gap-2 text-theme-fg animate-pulse">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 Organizational Blueprint Verified
 </div>
 </div>
 </div>
 </DashboardShell>
 );
}
