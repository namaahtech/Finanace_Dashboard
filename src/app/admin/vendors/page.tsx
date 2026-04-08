"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
 Building2, 
 Plus, 
 Search, 
 Filter, 
 ExternalLink, 
 Mail, 
 Phone, 
 IndianRupee,
 Layers,
 ChevronRight,
 User,
 MoreHorizontal
} from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const VENDORS = [
 { id: "VND-001", name: "Apex Infrastructure", category: "Hardware", contact: "Rajesh Kumar", email: "rajesh@apex.in", phone: "+91 98XXX XXXXX", totalSpend: 1250000, active: true },
 { id: "VND-002", name: "Nebula Cloud Services", category: "SaaS", contact: "Anita Sharma", email: "anita@nebula.io", phone: "+91 97XXX XXXXX", totalSpend: 450000, active: true },
 { id: "VND-003", name: "Green Space Facilities", category: "Maintenance", contact: "Suresh P.", email: "suresh@greenspace.com", phone: "+91 96XXX XXXXX", totalSpend: 85000, active: true },
 { id: "VND-004", name: "Prompt Logistics", category: "Delivery", contact: "Vikram Singh", email: "vikram@prompt.in", phone: "+91 95XXX XXXXX", totalSpend: 240000, active: false },
 { id: "VND-005", name: "Titan Legal Associates", category: "Legal", contact: "Meera Reddy", email: "meera@titan.legal", phone: "+91 94XXX XXXXX", totalSpend: 620000, active: true },
 { id: "VND-006", name: "Quantum Marketing", category: "Advertising", contact: "Arjun Das", email: "arjun@quantum.mkt", phone: "+91 93XXX XXXXX", totalSpend: 310000, active: true },
];

export default function VendorsPage() {
 const [search, setSearch] = useState("");
 const [category, setCategory] = useState("all");

 const filteredVendors = VENDORS.filter(v => {
 const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
 v.contact.toLowerCase().includes(search.toLowerCase());
 const matchesCategory = category === "all" || v.category === category;
 return matchesSearch && matchesCategory;
 });

 return (
 <DashboardShell 
 title="Vendor Ecosystem" 
 subtitle="Manage external partnerships, procurement logistics, and supplier relationships"
 actions={
 <button className="flex items-center gap-2 rounded-xl bg-theme-primary text-white dark:text-theme-fg px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
 <Plus size={16} strokeWidth={3} />
 Register Partner
 </button>
 }
 >
 <div className="flex flex-col gap-10">
 {/* Header Actions */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 relative group">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-sky-600 transition-colors" size={20} />
 <input 
 type="text" 
 placeholder="Search by partner name or contact personnel..."
 className="w-full bg-card border border-default rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-foreground outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 <div className="relative group">
 <select 
 className="w-full appearance-none bg-card border border-default rounded-2xl pl-14 pr-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-foreground outline-none focus:border-sky-500 transition-all cursor-pointer shadow-sm"
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 >
 <option value="all">Strategic Category: Global</option>
 <option value="Hardware">Infrastructure & Hardware</option>
 <option value="SaaS">Cloud & SaaS Subscriptions</option>
 <option value="Maintenance">Facility Maintenance</option>
 <option value="Legal">Legal & Compliance</option>
 <option value="Advertising">Advertising & PR</option>
 </select>
 <Layers className="absolute left-5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={20} />
 </div>
 </div>

 {/* Vendors Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 {filteredVendors.map((vendor) => (
 <div key={vendor.id} className="page-card !mb-0 p-0 overflow-hidden border border-default hover:border-sky-500/30 transition-all group hover:-translate-y-2 shadow-lg">
 <div className="p-8 border-b border-default bg-[hsl(var(--surface-raised))] relative flex justify-between items-start">
 <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform shadow-inner">
 <Building2 size={28} strokeWidth={2.5} />
 </div>
 <div className="flex flex-col items-end">
 <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] ${vendor.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-theme-raised text-theme-muted'}`}>
 {vendor.active ? 'Active' : 'Archived'}
 </div>
 <p className="text-[10px] font-black text-muted uppercase tracking-widest mt-2">ID: {vendor.id}</p>
 </div>
 </div>

 <div className="p-8 space-y-8">
 <div>
 <h3 className="text-xl font-black text-foreground tracking-tight group-hover:text-sky-600 transition-colors uppercase leading-tight mb-2">{vendor.name}</h3>
 <p className="text-[10px] font-black text-muted uppercase tracking-[0.4em]">{vendor.category}</p>
 </div>

 <div className="space-y-4 pt-6 border-t border-default">
 <div className="flex items-center gap-3 text-sm font-bold text-foreground/80">
 <User size={16} className="text-muted" />
 <span>{vendor.contact}</span>
 </div>
 <div className="flex items-center gap-3 text-xs font-black text-muted uppercase tracking-widest group/link cursor-pointer hover:text-sky-600 transition-colors">
 <Mail size={16} />
 <span>{vendor.email}</span>
 <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
 </div>
 <div className="flex items-center gap-3 text-xs font-black text-muted uppercase tracking-widest">
 <Phone size={16} />
 <span>{vendor.phone}</span>
 </div>
 </div>

 <div className="p-6 rounded-2xl bg-[hsl(var(--surface-raised))] border border-default flex justify-between items-center group/spend transition-all hover:bg-sky-500/5">
 <div>
 <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Lifetime Spend</p>
 <p className="text-lg font-black text-foreground tracking-tight">{formatCurrency(vendor.totalSpend)}</p>
 </div>
 <div className="w-10 h-10 rounded-full bg-background border border-default flex items-center justify-center text-muted group-hover/spend:bg-sky-500 group-hover/spend:text-white group-hover/spend:border-sky-500 transition-all duration-500">
 <ChevronRight size={20} strokeWidth={3} />
 </div>
 </div>
 </div>
 
 <div className="bg-background px-8 py-4 border-t border-default flex justify-between items-center">
 <button className="text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-sky-600 transition-colors">View All Invoices</button>
 <button className="p-2 text-muted hover:text-foreground">
 <MoreHorizontal size={16} />
 </button>
 </div>
 </div>
 ))}
 
 {/* Add Vendor Placeholder */}
 <div className="page-card !mb-0 p-8 border-2 border-dashed border-default flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-sky-500/50 hover:bg-sky-500/[0.02] transition-all">
 <div className="w-16 h-16 rounded-full bg-[hsl(var(--surface-raised))] flex items-center justify-center text-muted group-hover:scale-110 group-hover:text-sky-600 transition-all duration-500">
 <Plus size={32} strokeWidth={2} />
 </div>
 <div className="text-center">
 <p className="text-sm font-black text-foreground uppercase tracking-widest">New Strategic Partner</p>
 <p className="text-[10px] font-bold text-muted uppercase tracking-widest opacity-60">Expand Global Supply Chain</p>
 </div>
 </div>
 </div>
 </div>
 </DashboardShell>
 );
}
