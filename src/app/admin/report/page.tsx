"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { Printer, CheckCircle, XCircle, Shield, Users, User } from "lucide-react";

const check = <CheckCircle size={16} className="inline text-emerald-500" />;
const cross = <XCircle size={16} className="inline text-red-400" />;

const sections = [
 {
 title: "M01: Employee & Team Management",
 features: [
 { name: "View organizational directory", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 { name: "Manage team structures & departments", roles: { sa: true, acc: false, hr: true, ld: false, emp: false, sls: false } },
 { name: "Interactive org chart view", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 ],
 },
 {
 title: "M02: Attendance & Leaves",
 features: [
 { name: "Daily clock-in / clock-out logging", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 { name: "Leave request submission", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 { name: "Leave approval & balance mgmt", roles: { sa: true, acc: false, hr: true, ld: true, emp: false, sls: false } },
 ],
 },
 {
 title: "M03: KPI / KRA & Performance",
 features: [
 { name: "View performance history & trends", roles: { sa: true, acc: false, hr: true, ld: true, emp: true, sls: false } },
 { name: "Enter KPI / KRA scores", roles: { sa: true, acc: false, hr: true, ld: true, emp: false, sls: false } },
 { name: "Set monthly team targets", roles: { sa: true, acc: false, hr: false, ld: true, emp: false, sls: false } },
 ],
 },
 {
 title: "M04: Incentives & Payroll",
 features: [
 { name: "Run organizational payroll", roles: { sa: true, acc: true, hr: false, ld: false, emp: false, sls: false } },
 { name: "Issue performance incentive grants", roles: { sa: true, acc: true, hr: false, ld: false, emp: false, sls: false } },
 { name: "View individual payslips", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 ],
 },
 {
 title: "M05: Claims & Reimbursements",
 features: [
 { name: "Submit expense reimbursement", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 { name: "Claim vested incentives", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 { name: "Financial approval & processing", roles: { sa: true, acc: true, hr: false, ld: false, emp: false, sls: false } },
 ],
 },
 {
 title: "M06: Invoicing & Purchases",
 features: [
 { name: "Create & dispatch client invoices", roles: { sa: true, acc: true, hr: false, ld: false, emp: false, sls: false } },
 { name: "Vendor records & purchase orders", roles: { sa: true, acc: true, hr: false, ld: false, emp: false, sls: false } },
 ],
 },
 {
 title: "M07: Subscription Tracker",
 features: [
 { name: "Global SaaS / utility inventory", roles: { sa: true, acc: true, hr: false, ld: false, emp: false, sls: false } },
 { name: "Renewal alerts & cost allocation", roles: { sa: true, acc: true, hr: false, ld: true, emp: false, sls: false } },
 ],
 },
 {
 title: "M08: Team Budget Management",
 features: [
 { name: "Set monthly operational budgets", roles: { sa: true, acc: true, hr: false, ld: false, emp: false, sls: false } },
 { name: "Budget vs Actuals real-time tracker", roles: { sa: true, acc: true, hr: false, ld: true, emp: false, sls: false } },
 ],
 },
 {
 title: "M09 & M10: CRM & Pipeline",
 features: [
 { name: "Lead acquisition & pipeline kanban", roles: { sa: true, acc: false, hr: false, ld: false, emp: false, sls: true } },
 { name: "Client records & deal closure", roles: { sa: true, acc: true, hr: false, ld: false, emp: false, sls: true } },
 ],
 },
 {
 title: "M11 & M12: Internal Comms",
 features: [
 { name: "Secure organizational messaging", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 { name: "Schedule meetings & Google Meet sync", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 ],
 },
 {
 title: "M13: Mobile Extension",
 features: [
 { name: "Field clock-in / clock-out (Flutter)", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 { name: "Mobile push notifications (FCM)", roles: { sa: true, acc: true, hr: true, ld: true, emp: true, sls: true } },
 ],
 },
 {
 title: "M14: System & Security",
 features: [
 { name: "Global archetype configuration", roles: { sa: true, acc: false, hr: false, ld: false, emp: false, sls: false } },
 { name: "SQL schema & RLS policy mgmt", roles: { sa: true, acc: false, hr: false, ld: false, emp: false, sls: false } },
 { name: "Financial audit logs", roles: { sa: true, acc: true, hr: false, ld: false, emp: false, sls: false } },
 ],
 },
];

function Cell({ value }: { value: boolean }) {
 return (
 <td className="px-4 py-4 text-center border-l border-default/30 first:border-l-0">
 <div className="flex justify-center">
 {value ? (
 <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
 <CheckCircle size={14} strokeWidth={3} />
 </div>
 ) : (
 <div className="w-5 h-5 rounded-full bg-red-400/5 flex items-center justify-center text-red-300 dark:text-red-900/40">
 <XCircle size={14} strokeWidth={2} />
 </div>
 )}
 </div>
 </td>
 );
}

export default function ReportPage() {
 const { user } = useAuth();

 return (
 <DashboardShell 
 title="Organizational Authority Report" 
 subtitle="Comprehensive access matrix across all 14 operational modules for the current business cycle"
 actions={
 <button
 onClick={() => window.print()}
 className="flex items-center gap-2 rounded-xl bg-theme-primary text-white dark:text-theme-fg px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl"
 >
 <Printer size={15} />
 Export Authorization Registry
 </button>
 }
 >
 <div className="flex flex-col gap-10">
 {/* Role legend */}
 <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 print:grid-cols-6">
 {[
 { role: "Super Admin", color: "sky", desc: "System Root" },
 { role: "Accounts", color: "emerald", desc: "Finance Ops" },
 { role: "HR", color: "purple", desc: "Talent Mgmt" },
 { role: "Lead", color: "amber", desc: "Team Strategy" },
 { role: "Employee", color: "blue", desc: "Operations" },
 { role: "Sales", color: "rose", desc: "Growth Engine" },
 ].map((item) => (
 <div key={item.role} className="page-card !mb-0 p-4 border-t-4 border-t-current flex flex-col items-center text-center group transition-transform hover:-translate-y-1" style={{ color: `var(--${item.color}-600)` }}>
 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground mb-1">{item.role}</span>
 <span className="text-[8px] font-black opacity-50 uppercase tracking-widest leading-none">{item.desc}</span>
 </div>
 ))}
 </div>

 {/* Feature sections */}
 <div className="space-y-10">
 {sections.map((section) => (
 <div key={section.title} className="page-card !mb-0 p-0 shadow-xl overflow-hidden border border-default relative group/sec transition-all hover:border-sky-500/20 print:break-inside-avoid">
 <div className="bg-[hsl(var(--surface-raised))] px-6 py-4 border-b border-default flex justify-between items-center group-hover/sec:bg-surface transition-colors">
 <h3 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">{section.title}</h3>
 <div className="w-2 h-2 rounded-full bg-sky-500/20 group-hover/sec:bg-sky-500 transition-colors animate-pulse" />
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-background/50">
 <th className="px-6 py-3 text-left text-[9px] font-black text-muted uppercase tracking-[0.2em] border-b border-default">Functional Authority Registry</th>
 <th className="px-4 py-3 text-center text-[8px] font-black text-sky-600 uppercase tracking-widest border-b border-default border-l border-default/30">SA</th>
 <th className="px-4 py-3 text-center text-[8px] font-black text-emerald-600 uppercase tracking-widest border-b border-default border-l border-default/30">ACC</th>
 <th className="px-4 py-3 text-center text-[8px] font-black text-purple-600 uppercase tracking-widest border-b border-default border-l border-default/30">HR</th>
 <th className="px-4 py-3 text-center text-[8px] font-black text-amber-600 uppercase tracking-widest border-b border-default border-l border-default/30">LD</th>
 <th className="px-4 py-3 text-center text-[8px] font-black text-blue-600 uppercase tracking-widest border-b border-default border-l border-default/30">EMP</th>
 <th className="px-4 py-3 text-center text-[8px] font-black text-rose-600 uppercase tracking-widest border-b border-default border-l border-default/30">SLS</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-default/10">
 {section.features.map((feature) => (
 <tr key={feature.name} className="hover:bg-sky-500/[0.02] transition-colors group/row">
 <td className="px-6 py-4">
 <div className="flex flex-col">
 <span className="text-[11px] font-bold text-foreground">{feature.name}</span>
 </div>
 </td>
 <Cell value={feature.roles.sa} />
 <Cell value={feature.roles.acc} />
 <Cell value={feature.roles.hr} />
 <Cell value={feature.roles.ld} />
 <Cell value={feature.roles.emp} />
 <Cell value={feature.roles.sls} />
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 ))}
 </div>

 {/* Footer */}
 <div className="p-8 rounded-3xl bg-theme-primary text-white dark:text-theme-fg relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-8 opacity-5">
 <Shield size={100} strokeWidth={1} />
 </div>
 <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-4">Registry Manifest Authentication</p>
 <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
 <div className="space-y-1">
 <p className="text-xs font-bold">Authorized for Production Environment</p>
 <p className="text-[10px] opacity-60">Namaah Pulse Core Ecosystem — Authorized Personnel Registry</p>
 </div>
 <div className="text-right">
 <p className="text-[10px] font-black uppercase tracking-widest">Temporal Signature</p>
 <p className="text-xs font-bold uppercase">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
 </div>
 </div>
 </div>
 </div>
 </DashboardShell>
 );
}
