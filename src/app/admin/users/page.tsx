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
  X,
  CreditCard,
  Building,
  UserCheck,
  UserX,
  ShieldCheck,
  FileText,
  Zap,
  CalendarDays,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

const ROLE_BADGE: Record<string, "default" | "info" | "success" | "purple" | "warning" | "danger"> = {
  employee:    "default",
  hr:          "info",
  lead:        "success",
  super_admin: "purple",
  accounts:    "warning",
  sales:       "danger",
};

const ROLE_LABEL: Record<string, string> = {
  employee:    "Employee",
  hr:          "HR",
  lead:        "Team Lead",
  super_admin: "Super Admin",
  accounts:    "Accounts",
  sales:       "Sales",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

export default function AdminUsersPage() {
  const { request } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState({
    name: "", email: "", role: "employee",
    employeeId: "", department: "", designation: "", joiningDate: "",
  });

  async function load(q?: string) {
    setLoading(true);
    try {
      const url = `/api/users?${q ? `search=${q}` : ""}`;
      const res = await request<{ users: User[]; total: number }>({ url });
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setShowForm(false); };
    if (showForm) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showForm]);

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await request({ url: "/api/users", method: "POST", data: form });
      setShowForm(false);
      setForm({ name: "", email: "", role: "employee", employeeId: "", department: "", designation: "", joiningDate: "" });
      await load();
    } catch (err: unknown) {
      alert((err as Error).message ?? "Error creating employee");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(userId: string, current: boolean) {
    await request({ url: `/api/users/${userId}`, method: "PATCH", data: { isActive: !current } });
    await load();
  }

  const filteredUsers = users.filter((u) => {
    if (activeTab === "active")   return u.isActive;
    if (activeTab === "inactive") return !u.isActive;
    return true;
  });

  const activeCount   = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  return (
    <DashboardShell
      title="Employees"
      subtitle="Manage team members, roles, and account access."
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <UserPlus size={14} className="mr-1.5" /> Add Employee
        </Button>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total",    value: total || users.length, icon: Users,     color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Active",   value: activeCount,           icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Inactive", value: inactiveCount,         icon: UserX,     color: "text-red-500",     bg: "bg-red-500/10" },
            { label: "Roles",    value: new Set(users.map((u) => u.role)).size, icon: ShieldCheck, color: "text-sky-600", bg: "bg-sky-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={17} className={color} />
              </div>
              <div>
                <p className="text-xs text-theme-muted">{label}</p>
                <p className={cn("text-2xl font-black leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="page-card overflow-hidden p-0">

          {/* Table header: tabs + search */}
          <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
              {([
                { id: "all",      label: "All",      count: users.length },
                { id: "active",   label: "Active",   count: activeCount },
                { id: "inactive", label: "Inactive", count: inactiveCount },
              ] as { id: "all" | "active" | "inactive"; label: string; count: number }[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    activeTab === t.id
                      ? "bg-theme-surface text-theme-fg shadow-sm"
                      : "text-theme-muted hover:text-theme-fg"
                  )}
                >
                  {t.label}
                  <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                    activeTab === t.id ? "bg-theme-raised text-theme-fg" : "text-theme-subtle"
                  )}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
              <input
                type="text"
                placeholder="Search employees…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); load(e.target.value); }}
                className="h-8 w-52 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-theme-strong border-t-transparent" />
              <p className="text-xs text-theme-subtle">Loading employees…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                    <th className="px-5 py-3 font-semibold">Employee</th>
                    <th className="px-5 py-3 font-semibold">ID</th>
                    <th className="px-5 py-3 font-semibold">Department</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Joined</th>
                    <th className="px-5 py-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="group transition-colors hover:bg-theme-raised/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-theme-fg">{u.name}</p>
                            <p className="text-[10px] text-theme-subtle">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-theme-muted">{u.employeeId}</td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-medium text-theme-fg">{u.department}</p>
                        <p className="text-[10px] text-theme-subtle">{u.designation}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={ROLE_BADGE[u.role] ?? "default"}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-muted">{formatDate(u.joiningDate)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => toggleActive(u._id, u.isActive)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all",
                            u.isActive
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-red-500/10 hover:text-red-600 hover:border-red-200 dark:border-emerald-800 dark:hover:border-red-800"
                              : "bg-theme-raised text-theme-muted border-theme-border hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-200"
                          )}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-sm text-theme-subtle">
                        No employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">
              {filteredUsers.length} employee{filteredUsers.length !== 1 ? "s" : ""}
              {total > users.length ? ` of ${total}` : ""}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-theme-subtle">
              <UserCheck size={12} className="text-emerald-500" />
              {activeCount} active
            </div>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-theme-surface shadow-2xl border border-theme-border">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-theme-primary text-theme-surface">
                  <UserPlus size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-theme-fg">Add New Employee</h3>
                  <p className="text-[11px] text-theme-muted">Fill in the details to create a new account</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { key: "name",        label: "Full Name",    type: "text",  placeholder: "e.g. Aryan Sharma",  icon: <Users size={13} /> },
                    { key: "email",       label: "Email",        type: "email", placeholder: "aryan@namaah.tech",  icon: <FileText size={13} /> },
                    { key: "employeeId",  label: "Employee ID",  type: "text",  placeholder: "NM2024-001",         icon: <CreditCard size={13} /> },
                    { key: "designation", label: "Designation",  type: "text",  placeholder: "Senior Associate",   icon: <Zap size={13} /> },
                  ].map(({ key, label, type, placeholder, icon }) => (
                    <div key={key}>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-theme-muted">
                        {icon} {label}
                      </label>
                      <input
                        type={type}
                        required
                        placeholder={placeholder}
                        value={(form as Record<string, string>)[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-theme-muted">
                      <Building size={13} /> Department / Team
                    </label>
                    <Select onValueChange={(v) => setForm({ ...form, department: v })} value={form.department} required>
                      <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CORPORATE_TEAMS.map((t) => (
                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-theme-muted">
                      <CalendarDays size={13} /> Joining Date
                    </label>
                    <DatePicker
                      label=""
                      value={form.joiningDate}
                      onChange={(d) => setForm({ ...form, joiningDate: d })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-theme-muted">
                      <ShieldCheck size={13} /> Role
                    </label>
                    <Select onValueChange={(v) => setForm({ ...form, role: v })} value={form.role} required>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="lead">Team Lead</SelectItem>
                          <SelectItem value="accounts">Accounts</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-theme-border pt-4">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" loading={submitting}>Add Employee</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
