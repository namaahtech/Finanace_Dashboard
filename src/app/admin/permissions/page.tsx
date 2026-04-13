"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  Shield, 
  Eye, 
  PlusSquare, 
  Edit3, 
  Trash2, 
  Download,
  Users,
  ChevronRight,
  Save,
  Lock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type PermissionNode = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
};

type RolePermissions = {
  [key: string]: {
    [module: string]: PermissionNode;
  };
};

const ROLES = [
  { id: "super_admin", name: "Super Admin", members: 2, description: "Full system orchestration and root access." },
  { id: "hr", name: "HR Manager", members: 4, description: "Personnel lifecycle and attendance oversight." },
  { id: "lead", name: "Team Lead", members: 12, description: "Operational management of specific sub-nodes." },
  { id: "accounts", name: "Accounts", members: 3, description: "Financial ledgers, payroll, and invoicing." },
  { id: "sales", name: "Sales Head", members: 5, description: "Pipeline management and client relations." },
  { id: "employee", name: "Standard Employee", members: 48, description: "Personal workspace and self-service portal." },
];

const MODULES = [
  { id: "org", name: "Organization", permissions: ["User Management", "Team Architecture", "Org Chart", "System Config"] },
  { id: "ops", name: "Operations", permissions: ["Attendance Tracks", "KPI / KRA Matrix", "Claims Processing", "Tasking"] },
  { id: "fin", name: "Finance", permissions: ["Payroll Engine", "Invoicing", "Budgeting", "Reimbursements"] },
  { id: "sys", name: "System", permissions: ["Analytics Depth", "Security Logs", "Audit Trails", "API Access"] },
];

export default function PermissionsPage() {
  const { showToast } = useToast();
  const [activeRole, setActiveRole] = useState("super_admin");
  const [permissions, setPermissions] = useState<RolePermissions>({
    super_admin: MODULES.reduce((acc, mod) => {
      mod.permissions.forEach(p => {
        acc[p] = { view: true, create: true, edit: true, delete: true, export: true };
      });
      return acc;
    }, {} as any),
  });

  const [saving, setSaving] = useState(false);

  const togglePermission = (role: string, permission: string, type: keyof PermissionNode) => {
    // Prevent editing Super Admin for demo safety or logic
    if (role === "super_admin") {
      showToast("Root permissions are immutable for Super Admin.", "warning");
      return;
    }

    setPermissions(prev => {
      const rolePerms = prev[role] || {};
      const node = rolePerms[permission] || { view: false, create: false, edit: false, delete: false, export: false };
      
      return {
        ...prev,
        [role]: {
          ...rolePerms,
          [permission]: {
            ...node,
            [type]: !node[type]
          }
        }
      };
    });
  };

  const currentPerms = permissions[activeRole] || {};

  async function handleCommit() {
    setSaving(true);
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    showToast(`Matrix recalibrated for ${ROLES.find(r => r.id === activeRole)?.name}.`, "success");
  }

  return (
    <DashboardShell
      title="Access Control"
      subtitle="Define hierarchical granular permissions for enterprise roles."
      actions={
        <Button 
          onClick={handleCommit} 
          loading={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-10 px-8 font-bold text-xs"
        >
          <Save size={14} className="mr-2" /> Save Permissions
        </Button>
      }
    >
      <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-200px)]">
        {/* SIDEBAR ROLE SELECTION */}
        <div className="w-full lg:w-80 space-y-4">
          <div className="flex items-center gap-2 mb-6 px-2">
            <Shield size={18} className="text-zinc-900" />
            <h3 className="text-sm font-bold text-zinc-900">User Roles</h3>
          </div>
          
          <div className="space-y-2">
            {ROLES.map((role) => {
              const isActive = activeRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={cn(
                    "w-full text-left p-5 transition-all duration-300 border border-transparent rounded-[24px] group",
                    isActive 
                      ? "bg-white text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-emerald-500 scale-[1.02] z-10" 
                      : "bg-theme-surface hover:bg-theme-raised/50 text-theme-fg border-theme-border/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-[10px] font-bold uppercase", isActive ? "text-emerald-600" : "text-theme-muted")}>
                      {role.members} staff members
                    </span>
                    <ChevronRight size={14} className={cn("transition-transform", isActive ? "rotate-90 text-emerald-600" : "text-theme-muted group-hover:translate-x-1")} />
                  </div>
                  <h4 className="text-sm font-bold mb-1">{role.name}</h4>
                  <p className={cn("text-[11px] font-medium leading-relaxed opacity-70", isActive ? "text-zinc-600" : "text-theme-muted")}>
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* PERMISSION MATRIX */}
        <div className="flex-1 bg-theme-surface border border-theme-border/50 shadow-sm overflow-hidden">
          <div className="bg-white border-b border-theme-border p-6 flex items-center justify-between rounded-t-[32px]">
            <div className="flex items-center gap-4">
               <div className="h-10 w-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full">
                  <Lock size={18} />
               </div>
               <div>
                  <h3 className="text-sm font-bold text-zinc-900">Manage Access: {ROLES.find(r => r.id === activeRole)?.name}</h3>
                  <p className="text-[11px] font-medium text-zinc-500 mt-0.5">Control module level permissions below.</p>
               </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-page/50 text-[9px] font-black uppercase tracking-[0.2em] text-theme-muted border-b border-theme-border">
                  <th className="px-8 py-5 w-64 border-r border-theme-border/50">Module / Permission</th>
                  <th className="px-6 py-5 text-center"><div className="flex flex-col items-center gap-2"><Eye size={12}/>View</div></th>
                  <th className="px-6 py-5 text-center"><div className="flex flex-col items-center gap-2"><PlusSquare size={12}/>Create</div></th>
                  <th className="px-6 py-5 text-center"><div className="flex flex-col items-center gap-2"><Edit3 size={12}/>Edit</div></th>
                  <th className="px-6 py-5 text-center"><div className="flex flex-col items-center gap-2"><Trash2 size={12}/>Delete</div></th>
                  <th className="px-6 py-5 text-center"><div className="flex flex-col items-center gap-2"><Download size={12}/>Export</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {MODULES.map((module) => (
                  <>
                    <tr key={module.id} className="bg-theme-raised/20">
                      <td colSpan={6} className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-theme-fg bg-theme-raised/40">
                        {module.name} Scope
                      </td>
                    </tr>
                    {module.permissions.map((p) => {
                      const node = currentPerms[p] || { view: false, create: false, edit: false, delete: false, export: false };
                      return (
                        <tr key={p} className="group hover:bg-theme-raised/10 transition-colors">
                          <td className="px-8 py-4 border-r border-theme-border/50">
                            <span className="text-xs font-bold text-theme-fg">{p}</span>
                          </td>
                          {(["view", "create", "edit", "delete", "export"] as const).map((type) => (
                            <td key={type} className="px-6 py-4 text-center">
                              <button
                                onClick={() => togglePermission(activeRole, p, type)}
                                className={cn(
                                  "w-10 h-10 rounded-full mx-auto flex items-center justify-center transition-all duration-300",
                                  node[type] ? "bg-emerald-50 text-emerald-600" : "bg-theme-raised/50 text-zinc-300 hover:bg-zinc-100"
                                )}
                              >
                                {node[type] ? (
                                  <CheckCircle2 size={18} className="animate-in zoom-in-50" />
                                ) : (
                                  <XCircle size={18} />
                                )}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
