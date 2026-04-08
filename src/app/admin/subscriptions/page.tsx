"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
 CreditCard, 
 Plus, 
 Search, 
 Calendar, 
 AlertTriangle, 
 TrendingUp, 
 Users,
 Settings2,
 Bell,
 CheckCircle2,
 RefreshCw
} from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const SUBSCRIPTIONS = [
 { id: 1, name: "Google Workspace", team: "Operations", cost: 12000, cycle: "Monthly", renewal: "Apr 28, 2026", status: "active", category: "Productivity", users: 85 },
 { id: 2, name: "AWS Production", team: "Engineering", cost: 85000, cycle: "Monthly", renewal: "Apr 22, 2026", status: "expiring", category: "Infrastructure", users: 12 },
 { id: 3, name: "Slack Enterprise", team: "Human Capital", cost: 45000, cycle: "Monthly", renewal: "May 05, 2026", status: "active", category: "Communication", users: 82 },
 { id: 4, name: "Zoom Pro", team: "Sales", cost: 8500, cycle: "Monthly", renewal: "Apr 15, 2026", status: "active", category: "Meetings", users: 15 },
 { id: 5, name: "Adobe Creative Cloud", team: "Marketing", cost: 18000, cycle: "Annual", renewal: "Jun 12, 2026", status: "active", category: "Creative", users: 5 },
 { id: 6, name: "Figma Professional", team: "Product", cost: 9500, cycle: "Monthly", renewal: "Apr 20, 2026", status: "inactive", category: "Design", users: 8 },
];

export default function SubscriptionsPage() {
 const [search, setSearch] = useState("");

 const filtered = SUBSCRIPTIONS.filter(s => 
 s.name.toLowerCase().includes(search.toLowerCase()) || 
 s.team.toLowerCase().includes(search.toLowerCase())
 );

 return (
 <DashboardShell 
 title="Subscription Inventory" 
 subtitle="Full lifecycle oversight of SaaS, license allocation, and recurring operational expenditure"
 actions={
 <button className="flex items-center gap-2 rounded-xl bg-theme-primary text-white dark:text-theme-fg px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
 <Plus size={16} strokeWidth={3} />
 New Subscription
 </button>
 }
 >
 <div className="flex flex-col gap-8">
 {/* Metric Banner */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="page-card !mb-0 p-8 border-l-4 border-l-sky-600 bg-sky-500/5 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
 <TrendingUp size={80} strokeWidth={1} />
 </div>
 <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em] mb-2">Monthly Committed Spend</p>
 <h3 className="text-3xl font-black text-foreground tracking-tighter">₹1,78,000<span className="text-sm font-bold opacity-40 ml-2">/mo</span></h3>
 </div>
 
 <div className="page-card !mb-0 p-8 border-l-4 border-l-amber-500 bg-amber-500/5 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
 <AlertTriangle size={80} strokeWidth={1} />
 </div>
 <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-2">Renewal Alerts (72h)</p>
 <h3 className="text-3xl font-black text-foreground tracking-tighter">02 <span className="text-sm font-bold opacity-40 ml-2">Critical</span></h3>
 </div>

 <div className="page-card !mb-0 p-8 border-l-4 border-l-emerald-500 bg-emerald-500/5 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
 <CheckCircle2 size={80} strokeWidth={1} />
 </div>
 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-2">Resource Utilization</p>
 <h3 className="text-3xl font-black text-foreground tracking-tighter">94.2% <span className="text-sm font-bold opacity-40 ml-2">Efficiency</span></h3>
 </div>
 </div>

 {/* Search & Bulk Actions */}
 <div className="flex flex-col md:row-row justify-between items-center gap-6">
 <div className="relative w-full md:w-96">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
 <input 
 type="text" 
 placeholder="Find inventory by name, team, or category..."
 className="w-full bg-card border border-default rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all shadow-sm"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 <div className="flex gap-4">
 <button className="p-4 rounded-2xl bg-card border border-default text-muted hover:text-foreground hover:border-sky-500/30 transition-all">
 <RefreshCw size={18} />
 </button>
 <button className="p-4 rounded-2xl bg-card border border-default text-muted hover:text-foreground hover:border-sky-500/30 transition-all">
 <Settings2 size={18} />
 </button>
 </div>
 </div>

 {/* Subscription Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 {filtered.map((sub) => (
 <div key={sub.id} className="page-card !mb-0 p-0 overflow-hidden border border-default shadow-xl group hover:border-sky-500/20 transition-all">
 <div className="p-6 bg-[hsl(var(--surface-raised))] border-b border-default flex justify-between items-start">
 <div className="flex items-center gap-4">
 <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
 sub.status === 'expiring' ? 'bg-amber-500/10 text-amber-600' : 
 sub.status === 'inactive' ? 'bg-theme-raised text-theme-muted' : 'bg-sky-500/10 text-sky-600'
 }`}>
 <CreditCard size={24} strokeWidth={2.5} />
 </div>
 <div>
 <h4 className="text-sm font-black text-foreground uppercase tracking-wider">{sub.name}</h4>
 <p className="text-[10px] font-black text-muted uppercase tracking-widest">{sub.team}</p>
 </div>
 </div>
 <button className="text-muted hover:text-sky-600 transition-colors">
 <Bell size={16} />
 </button>
 </div>

 <div className="p-8 space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <p className="text-[9px] font-black text-muted uppercase tracking-[0.2em] mb-1">Commitment</p>
 <p className="text-xl font-black text-foreground tracking-tight">{formatCurrency(sub.cost)}<span className="text-[10px] opacity-40 uppercase ml-1">/{sub.cycle}</span></p>
 </div>
 <div className="text-right">
 <p className="text-[9px] font-black text-muted uppercase tracking-[0.2em] mb-1">Impact</p>
 <div className="flex items-center gap-2 justify-end">
 <Users size={12} className="text-muted" />
 <span className="text-xs font-black text-foreground">{sub.users} SEATS</span>
 </div>
 </div>
 </div>

 <div className="space-y-4 pt-6 border-t border-default">
 <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-background border border-default/50">
 <div className="flex items-center gap-2">
 <Calendar size={14} className="text-muted" />
 <span className="text-[10px] font-black text-muted uppercase tracking-widest">Renewal Epoch</span>
 </div>
 <span className={`text-[10px] font-black uppercase tracking-widest ${sub.status === 'expiring' ? 'text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full' : 'text-foreground'}`}>
 {sub.renewal}
 </span>
 </div>
 </div>
 
 <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.4em] text-muted opacity-60">
 <span>Category: {sub.category}</span>
 <div className="flex gap-1 items-center">
 <div className={`w-1.5 h-1.5 rounded-full ${sub.status === 'active' ? 'bg-emerald-500' : sub.status === 'expiring' ? 'bg-amber-500 animate-pulse' : 'bg-theme-subtle/80'}`} />
 {sub.status}
 </div>
 </div>
 </div>

 <div className="bg-[hsl(var(--surface-raised))] p-4 border-t border-default flex justify-center">
 <button className="text-[9px] font-black uppercase tracking-[0.3em] text-sky-600 hover:text-sky-700 transition-colors">Configure License Logic</button>
 </div>
 </div>
 ))}
 </div>
 </div>
 </DashboardShell>
 );
}
