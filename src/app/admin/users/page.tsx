"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import { formatDate, cn } from "@/lib/utils";
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  ChevronRight,
  X,
  CreditCard,
  Building,
  UserCheck,
  Zap,
  Clock
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { CORPORATE_TEAMS } from "@/constants/teams";

interface User {
  _id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  department: string;
  designation: string;
  joiningDate: string;
  isActive: boolean;
}

const roleColors: Record<string, string> = {
  employee: "default",
  hr: "info",
  lead: "success",
  super_admin: "purple",
};

export default function AdminUsersPage() {
  const { request } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "authorized" | "revoked">("all");
  const [form, setForm] = useState({
    name: "", email: "", role: "employee",
    employeeId: "", department: "", designation: "", joiningDate: "",
  });

  async function load(q?: string) {
    setLoading(true);
    try {
      const url = `/api/users?${q ? `search=${q}` : ""}`;
      const res = await request<{ users: User[], total: number }>({ url });
      setUsers(res.users);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowForm(false);
    };
    if (showForm) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showForm]);

  useEffect(() => { load(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await request({ url: "/api/users", method: "POST", data: form });
      setShowForm(false);
      setForm({ name: "", email: "", role: "employee", employeeId: "", department: "", designation: "", joiningDate: "" });
      await load();
    } catch (err: any) {
      alert(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(userId: string, current: boolean) {
    await request({ url: `/api/users/${userId}`, method: "PATCH", data: { isActive: !current } });
    await load();
  }

  const filteredUsers = users.filter(u => {
    if (activeTab === "authorized") return u.isActive;
    if (activeTab === "revoked") return !u.isActive;
    return true;
  });

  return (
    <DashboardShell 
      title="Employee Central" 
      subtitle="Corporate lifecycle management and organizational mapping."
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <UserPlus size={14} className="mr-2" /> Add New Member
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Enrollment Modal Overlay */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="enterprise-card w-full max-w-4xl bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-visible">
               {/* Modal Header */}
               <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-slate-900 text-white rounded-lg">
                        <UserCheck size={18} />
                     </div>
                     <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">New Member Registration</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuring impact identity credentials</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                  >
                     <X size={20} className="text-slate-400 group-hover:text-slate-900" />
                  </button>
               </div>

               {/* Modal Content / Form */}
               <div className="p-8">
                  <form onSubmit={handleCreate} className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {[
                           { key: "name", label: "Full Identity Name", type: "text", placeholder: "e.g. Aryan Sharma", icon: <Users size={14} /> },
                           { key: "email", label: "Corporate Email Address", type: "email", placeholder: "aryan@namaah.tech", icon: <FileText size={14} /> },
                           { key: "employeeId", label: "Global Employee ID", type: "text", placeholder: "NP2024-001", icon: <CreditCard size={14} /> },
                           { key: "designation", label: "Corporate Rank / Role", type: "text", placeholder: "Senior Associate", icon: <Zap size={14} /> },
                        ].map(({ key, label, type, placeholder, icon }) => (
                           <div key={key} className="space-y-1.5">
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="text-slate-300">{icon}</span>
                                 <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">{label}</label>
                              </div>
                              <input
                                 type={type}
                                 required
                                 placeholder={placeholder}
                                 value={(form as Record<string, string>)[key]}
                                 onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                 className="w-full rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all font-semibold"
                              />
                           </div>
                        ))}

                        <div className="space-y-1.5 overflow-visible">
                           <div className="flex items-center gap-2 mb-1">
                              <Building size={14} className="text-slate-300" />
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Functional Unit / Team</label>
                           </div>
                           <Select 
                              onValueChange={(val) => setForm({ ...form, department: val })}
                              value={form.department}
                              required
                           >
                              <SelectTrigger>
                                 <SelectValue placeholder="SELECT ASSIGNED TEAM" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectGroup>
                                    {CORPORATE_TEAMS.map(team => (
                                       <SelectItem key={team.id} value={team.name}>{team.name.toUpperCase()}</SelectItem>
                                    ))}
                                 </SelectGroup>
                              </SelectContent>
                           </Select>
                        </div>

                        <DatePicker 
                           label="Company Onboarding Date" 
                           value={form.joiningDate}
                           onChange={(date) => setForm({ ...form, joiningDate: date })} 
                        />

                        <div className="space-y-1.5 overflow-visible">
                           <div className="flex items-center gap-2 mb-1">
                              <ShieldCheck size={14} className="text-slate-300" />
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Clearance Level</label>
                           </div>
                           <Select 
                              onValueChange={(val) => setForm({ ...form, role: val })}
                              value={form.role}
                              required
                           >
                              <SelectTrigger>
                                 <SelectValue placeholder="SET CLEARANCE LEVEL" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectGroup>
                                    <SelectItem value="employee">STANDARD MEMBER</SelectItem>
                                    <SelectItem value="hr">HUMAN RESOURCES (HR)</SelectItem>
                                    <SelectItem value="lead">FUNCTIONAL LEAD</SelectItem>
                                    <SelectItem value="super_admin">SYSTEM ARCHITECT</SelectItem>
                                 </SelectGroup>
                              </SelectContent>
                           </Select>
                        </div>
                     </div>
                     
                     <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                           Cancel Request
                        </Button>
                        <Button type="submit" loading={submitting} size="lg" className="px-12">
                           Finalize Registration
                        </Button>
                     </div>
                  </form>
               </div>
            </div>
          </div>
        )}

        {/* Directory Controls & Tabs */}
        <div className="enterprise-card overflow-hidden bg-white">
           <div className="border-b border-slate-100 p-6 flex flex-col md:flex-row gap-6 justify-between items-center">
              <div className="flex bg-slate-50 p-1 rounded-lg self-start">
                 {[
                   { id: "all", label: "All Members", icon: <Users size={12} /> },
                   { id: "authorized", label: "Authorized", icon: <ShieldCheck size={12} /> },
                   { id: "revoked", label: "Revoked", icon: <ShieldAlert size={12} /> },
                 ].map((tab) => (
                   <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={cn(
                       "flex items-center gap-2 px-5 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                       activeTab === tab.id 
                         ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                         : "text-slate-400 hover:text-slate-600"
                     )}
                   >
                     {tab.icon} {tab.label}
                   </button>
                 ))}
              </div>
              
              <form onSubmit={handleSearch} className="relative w-full md:w-80 group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter personnel roster..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-100 bg-slate-50 pl-10 pr-4 py-2.5 text-[11px] text-slate-900 outline-none focus:bg-white focus:border-slate-300 transition-all font-semibold"
                />
              </form>
           </div>

          {loading ? (
            <div className="p-20 text-center">
               <div className="h-10 w-10 animate-spin mx-auto rounded-full border-[3px] border-slate-900 border-t-transparent" />
               <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Active Roster...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="pl-6">Impact Identity</th>
                    <th>Global ID</th>
                    <th>Functional Unit</th>
                    <th>Clearance</th>
                    <th>Audit Date</th>
                    <th className="pr-6">Stream Access</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="group hover:bg-slate-50 transition-all border-b border-slate-50/50 last:border-0">
                      <td className="pl-6 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[11px] shadow-lg shadow-slate-200">
                              {u.name.split(' ').map(n => n[0]).join('')}
                           </div>
                           <div className="flex flex-col">
                              <span className="font-extrabold text-slate-900 group-hover:text-slate-700 transition-colors uppercase tracking-tight text-xs">{u.name}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{u.email}</span>
                           </div>
                        </div>
                      </td>
                      <td className="font-black text-[10px] text-slate-400 tracking-[0.2em]">{u.employeeId}</td>
                      <td>
                         <div className="flex flex-col">
                            <span className="text-xs font-extrabold text-slate-900 tracking-tight">{u.department.toUpperCase()}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{u.designation}</span>
                         </div>
                      </td>
                      <td>
                        <Badge variant={(roleColors[u.role] as "default" | "info" | "purple" | "success") ?? "default"}>
                          {u.role.replace("_", " ").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="text-[10px] font-bold text-slate-400 tabular-nums uppercase">{formatDate(u.joiningDate)}</td>
                      <td className="pr-6">
                        <button
                          onClick={() => toggleActive(u._id, u.isActive)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all w-full justify-between group/btn shadow-sm",
                            u.isActive 
                              ? "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100" 
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                          )}
                        >
                          {u.isActive ? "Authorized" : "Revoked"}
                          {u.isActive && <ChevronRight size={10} className="group-hover/btn:translate-x-1 transition-transform" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                           <FileText size={40} className="text-slate-100" />
                           <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Corporate record set is empty</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
             <span>Roster Aggregate: {filteredUsers.length} Units</span>
             <span className="flex items-center gap-2 animate-pulse"><ShieldCheck size={10} /> Database Encrypted</span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
