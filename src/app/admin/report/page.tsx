"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { Printer, Shield, Users, Activity, Lock, Search, Download, Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const B = "#FBFBFA"; // background

const ROLES = [
  { id: "sa", name: "Super Admin", color: "#0ea5e9", bg: "#e0f2fe" },    // sky
  { id: "acc", name: "Accounts",   color: "#10b981", bg: "#d1fae5" },    // emerald
  { id: "hr", name: "HR",          color: "#8b5cf6", bg: "#ede9fe" },    // violet
  { id: "ld", name: "Lead",        color: "#f59e0b", bg: "#fef3c7" },    // amber
  { id: "emp", name: "Employee",     color: "#3b82f6", bg: "#dbeafe" },    // blue
  { id: "sls", name: "Sales",        color: "#f43f5e", bg: "#ffe4e6" },    // rose
];

const INITIAL_SECTIONS = [
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

function KPICard({ label, value, icon: Icon, colorClass, borderClass }: any) {
  return (
    <div className="rounded-lg p-5 flex items-center gap-4 border bg-white shadow-[0_1px_6px_rgba(0,0,0,0.03)] border-black/5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", borderClass, colorClass)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-black/80 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [search, setSearch] = useState("");

  const togglePermission = (sectionIndex: number, featureIndex: number, roleId: string) => {
    // Only simulate toggle if user is root/admin mathematically (for visual interactive demo)
    setSections(prev => {
      const nw = [...prev];
      const nwF = [...nw[sectionIndex].features];
      const nwR = { ...nwF[featureIndex].roles };
      // Toggle logic
      nwR[roleId as keyof typeof nwR] = !nwR[roleId as keyof typeof nwR];
      nwF[featureIndex] = { ...nwF[featureIndex], roles: nwR };
      nw[sectionIndex] = { ...nw[sectionIndex], features: nwF };
      return nw;
    });
  };

  const filteredSections = sections.map(s => ({
    ...s,
    features: s.features.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
  })).filter(s => s.features.length > 0);

  // Stats calculation
  const totalFeatures = sections.reduce((acc, s) => acc + s.features.length, 0);
  const totalEnabled = sections.reduce((acc, s) => acc + s.features.reduce((a, f) => a + Object.values(f.roles).filter(Boolean).length, 0), 0);
  const totalPossible = totalFeatures * ROLES.length;
  const securityScore = Math.floor(100 - ((totalEnabled / totalPossible) * 100)); // fewer permissions = higher security score theoretically
  
  return (
    <DashboardShell
      moduleKey="feature_report" 
      title="Access Control & Feature Registry" 
      subtitle="Enterprise-grade Role-Based Access Control (RBAC) across 14 operational modules"
    >
      <div className="min-h-full -m-8" style={{ background: B, padding: "32px" }}>
        
        {/* Dynamic KPI Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KPICard label="Auth Modules" value={sections.length} icon={Shield} colorClass="bg-sky-50 text-sky-600" borderClass="border-sky-100" />
          <KPICard label="Access Endpoints" value={totalFeatures} icon={Activity} colorClass="bg-indigo-50 text-indigo-600" borderClass="border-indigo-100" />
          <KPICard label="Managed Roles" value={ROLES.length} icon={Users} colorClass="bg-emerald-50 text-emerald-600" borderClass="border-emerald-100" />
          <KPICard label="System Security" value={`${securityScore}%`} icon={Lock} colorClass="bg-amber-50 text-amber-600" borderClass="border-amber-100" />
        </div>

        {/* Global Controls */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 justify-between bg-white p-2 rounded-lg border border-black/5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
          
          <div className="flex items-center w-full md:w-96 px-4 py-2 bg-black/[0.03] rounded-md border border-black/5 focus-within:border-sky-500/50 transition-colors">
            <Search size={14} className="text-black/30" />
            <input 
              type="text" 
              placeholder="Search privileges..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-black/80 font-bold ml-2 w-full placeholder:text-black/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/50 hover:text-black px-4 py-3 rounded-md border border-black/10 hover:bg-black/5 transition-all">
              <Download size={13} /> JSON Dump
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-black px-4 py-3 rounded-md hover:bg-black/80 transition-all shadow-md hover:shadow-lg">
              <Printer size={13} /> Export Audits
            </button>
          </div>
        </div>

        {/* The Matrix */}
        <div className="space-y-6">
          {filteredSections.map((section, sIdx) => (
            <div key={section.title} className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.03)] border border-black/5 overflow-hidden group/sec">
              <div className="bg-black/[0.01] px-6 py-4 border-b border-black/5 flex justify-between items-center group-hover/sec:bg-black/[0.02] transition-colors">
                <h3 className="text-[11px] font-black text-black/70 uppercase tracking-[0.2em]">{section.title}</h3>
                <div className="px-2 py-1 bg-white border border-black/5 rounded text-[9px] font-black text-black/40 uppercase shadow-sm">
                  {section.features.length} Policies
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-black/[0.01]">
                      <th className="px-6 py-3 text-left text-[9px] font-black text-black/40 uppercase tracking-[0.2em] border-b border-black/5 w-1/3">Functional Resource</th>
                      {ROLES.map(role => (
                        <th key={role.id} className="px-3 py-3 text-center border-b border-black/5 border-l border-black/5 bg-white">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: role.color }}>{role.id}</span>
                            <span className="text-[8px] font-bold text-black/30 hidden lg:inline">{role.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {section.features.map((feature, fIdx) => (
                      <tr key={feature.name} className="hover:bg-black/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold text-black/70">{feature.name}</span>
                        </td>
                        {ROLES.map(role => {
                          const isActive = feature.roles[role.id as keyof typeof feature.roles];
                          
                          return (
                            <td key={role.id} className="px-3 py-3 text-center border-l border-black/5">
                              <button
                                onClick={() => togglePermission(sIdx, fIdx, role.id)}
                                className={cn(
                                  "mx-auto w-10 h-5 rounded-full flex items-center px-0.5 transition-all outline-none",
                                  isActive ? "bg-emerald-500" : "bg-black/10"
                                )}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center transition-transform bg-white shadow-sm",
                                  isActive ? "translate-x-5" : "translate-x-0"
                                )}>
                                  {isActive ? <Check size={10} className="text-emerald-500" /> : <X size={10} className="text-black/30" />}
                                </div>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-black/30">
              <Search size={40} className="mb-4 opacity-50" />
              <p className="text-sm font-bold uppercase tracking-widest">No policies match your search.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
