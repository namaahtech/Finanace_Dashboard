"use client";

import { useState, useEffect } from "react";
import {
  Users, LayoutGrid, X, Search, ChevronDown, Check,
  UserCircle2, ShieldCheck, ChevronRight, Target, Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import dayjs from "dayjs";

interface DelegationModalProps {
  project: any;
  teams: any[];
  employees: any[];
  onClose: () => void;
  onSuccess: () => void;
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export function DelegationModal({
  project,
  teams,
  employees,
  onClose,
  onSuccess,
}: DelegationModalProps) {
  const [selectedTeams] = useState<string[]>(project.teamIds || []);
  const [leadAssignments, setLeadAssignments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    project.project_teams?.forEach((pt: any) => {
      if (pt.lead_id) initial[pt.team_id] = pt.lead_id;
    });
    return initial;
  });
  const [teamScopes, setTeamScopes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    project.project_teams?.forEach((pt: any) => {
      if (pt.scope_description) initial[pt.team_id] = pt.scope_description;
    });
    return initial;
  });
  const [assignedMembers, setAssignedMembers] = useState<Record<string, string[]>>({});
  const [canManagerDelegate, setCanManagerDelegate] = useState(project.can_manager_delegate || false);
  const [canLeadDelegate, setCanLeadDelegate] = useState(project.can_lead_delegate || false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    const mustAssignLeads =
      (user?.role === "super_admin" && !canManagerDelegate) || user?.role === "manager";

    if (mustAssignLeads && selectedTeams.some((tid) => !leadAssignments[tid])) {
      showToast("Please assign a team lead for every team, or allow manager to edit.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await supabase.from("project_teams").delete().eq("project_id", project.id);

      if (selectedTeams.length > 0) {
        const { error } = await supabase.from("project_teams").insert(
          selectedTeams.map((tid) => ({
            project_id: project.id,
            team_id: tid,
            lead_id: leadAssignments[tid],
            scope_description:
              teamScopes[tid] ||
              `Initial scope for ${teams.find((t) => t.id === tid)?.name}`,
            status: "pending",
          }))
        );
        if (error) throw error;

        const strategicTasks = selectedTeams
          .filter((tid) => leadAssignments[tid])
          .map((tid) => ({
            project_id: project.id,
            title: `[STRATEGIC] ${project.name}: ${teams.find((t) => t.id === tid)?.name} Phase`,
            description: teamScopes[tid] || "Complete assigned project phase deliverables.",
            status: "TODO",
            priority: "High",
            assigned_to: leadAssignments[tid],
            task_type: "strategic",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

        if (strategicTasks.length > 0) {
          const { error: taskError } = await supabase
            .from("project_tasks")
            .insert(strategicTasks);
          if (taskError) console.warn("Task generation warning:", taskError);
        }

        const allMemberIds = Object.values(assignedMembers).flat();
        if (allMemberIds.length > 0) {
          const membersToInsert = Array.from(new Set(allMemberIds)).map((uid) => ({
            project_id: project.id,
            employee_id: uid,
            role: "Member",
          }));
          await supabase
            .from("project_members")
            .upsert(membersToInsert, { onConflict: "project_id,employee_id" });
        }

        await supabase
          .from("projects")
          .update({
            workflow_status: "delegated",
            can_manager_delegate: canManagerDelegate,
            can_lead_delegate: canLeadDelegate,
          })
          .eq("id", project.id);
      }

      showToast("Teams assigned successfully. Team leads have been notified.", "success");
      onSuccess();
    } catch (err: any) {
      showToast(err.message || "Assignment failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-theme-surface shadow-2xl border border-theme-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ maxHeight: "90vh" }}
      >
        {/* ── HEADER ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-theme-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-primary text-theme-surface shadow-sm">
              <LayoutGrid size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-fg">Assign Teams</h3>
              <p className="text-xs text-theme-muted flex items-center gap-1">
                {project.name} <ChevronRight size={11} /> Team Assignment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-theme-muted border border-theme-border rounded-md px-2 py-0.5">ESC</span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">

          {/* Created by */}
          <div className="rounded-2xl border border-theme-border bg-theme-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-theme-fg">Admin</p>
                  <p className="text-xs text-theme-muted">
                    Created by{" "}
                    <span className="text-theme-primary font-semibold">
                      {employees?.find((e) => e.id === project.assigned_by)?.name ||
                        project.assigned_by_name ||
                        "System Administrator"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-theme-muted">
                {dayjs(project.created_at).format("MMM DD, YYYY · HH:mm")}
              </div>
            </div>
          </div>

          {/* Permission toggles */}
          {user?.role === "super_admin" && (
            <div className="rounded-2xl border border-theme-border bg-theme-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                    <Target size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-theme-fg">Manager</p>
                    <p className="text-xs text-theme-muted">Allow manager to edit team assignments</p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={canManagerDelegate}
                    onChange={(e) => setCanManagerDelegate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 rounded-full bg-theme-raised transition-all peer-checked:bg-theme-primary after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
            </div>
          )}

          {(user?.role === "manager" || user?.role === "super_admin") && (
            <div className="rounded-2xl border border-theme-border bg-theme-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-theme-fg">Team Lead</p>
                    <p className="text-xs text-theme-muted">Allow team leads to assign employees</p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={canLeadDelegate}
                    onChange={(e) => setCanLeadDelegate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 rounded-full bg-theme-raised transition-all peer-checked:bg-theme-primary after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
            </div>
          )}

          {/* Assigned teams (read-only) */}
          {selectedTeams.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-theme-muted">Assigned teams</p>
                <span className="rounded-md bg-theme-raised border border-theme-border px-2 py-0.5 text-[10px] font-semibold text-theme-muted">
                  Read only
                </span>
              </div>
              <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-theme-border bg-theme-raised/30 p-3">
                {selectedTeams.map((tid) => {
                  const team = teams.find((t) => t.id === tid);
                  return (
                    <div key={tid} className="flex items-center gap-2 rounded-lg bg-theme-surface border border-theme-border px-2.5 py-1 shadow-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-theme-primary" />
                      <span className="text-xs font-semibold text-theme-fg">{team?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-team assignment cards */}
          {selectedTeams.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-theme-muted">Team assignments</p>

              {selectedTeams.map((tid) => {
                const team = teams.find((t) => t.id === tid);
                const teamLeads = employees.filter((e) => {
                  const r = e.role?.toLowerCase() || "";
                  const isInTeam = e.team_id === tid || e.department_id === tid;
                  const isLeadRole =
                    r.includes("lead") ||
                    r.includes("manager") ||
                    r.includes("head") ||
                    r.includes("supervisor");
                  return isInTeam && isLeadRole;
                });
                const teamEmployees = employees.filter(
                  (e) => e.team_id === tid || e.department_id === tid
                );
                const isEditable =
                  user?.role === "super_admin" ||
                  (user?.role === "manager" && canManagerDelegate) ||
                  (user?.role === "lead" && canLeadDelegate);

                return (
                  <div
                    key={tid}
                    className={cn(
                      "rounded-2xl border bg-theme-surface p-4 shadow-sm space-y-4",
                      isEditable
                        ? "border-theme-border"
                        : "border-theme-border/50 opacity-90"
                    )}
                  >
                    {/* Team header */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold text-sm shadow-sm">
                        {team?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-theme-fg">{team?.name}</p>
                        <p className="text-xs text-theme-muted">Team</p>
                      </div>
                    </div>

                    {/* Lead selector */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-theme-muted">Team lead</p>
                      {isEditable ? (
                        <LeadSelect
                          value={leadAssignments[tid]}
                          options={teamLeads}
                          onChange={(val) =>
                            setLeadAssignments({ ...leadAssignments, [tid]: val })
                          }
                        />
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-theme-border bg-theme-raised px-3 py-2 text-xs text-theme-muted">
                          <UserCircle2 size={14} />
                          {employees.find((e) => e.id === leadAssignments[tid])?.name ||
                            "No lead assigned"}
                        </div>
                      )}
                    </div>

                    {/* Members + scope */}
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-theme-muted">Team members</p>
                        {isEditable ? (
                          <MultiSelect
                            icon={<Users size={14} className="text-theme-primary" />}
                            placeholder="Select members…"
                            value={assignedMembers[tid] || []}
                            onChange={(vals) =>
                              setAssignedMembers({ ...assignedMembers, [tid]: vals })
                            }
                            options={teamEmployees.map((e) => ({
                              label: e.name,
                              value: e.id,
                            }))}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1.5 min-h-[36px] rounded-xl border border-theme-border bg-theme-raised p-2.5">
                            {(assignedMembers[tid] || []).length > 0 ? (
                              (assignedMembers[tid] || []).map((uid) => (
                                <span
                                  key={uid}
                                  className="rounded-md bg-theme-surface border border-theme-border px-2 py-0.5 text-[10px] font-semibold text-theme-fg"
                                >
                                  {employees.find((e) => e.id === uid)?.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-theme-muted italic">
                                No members assigned
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-theme-muted">Work scope</p>
                        {isEditable ? (
                          <textarea
                            value={teamScopes[tid] || ""}
                            onChange={(e) =>
                              setTeamScopes({ ...teamScopes, [tid]: e.target.value })
                            }
                            placeholder={`What should the ${team?.name} team do?`}
                            rows={3}
                            className="w-full rounded-xl border border-theme-border bg-theme-raised px-3 py-2 text-xs text-theme-fg outline-none focus:border-theme-primary transition-all resize-none"
                          />
                        ) : (
                          <div className="min-h-[64px] rounded-xl border border-theme-border bg-theme-raised px-3 py-2 text-xs text-theme-muted italic">
                            {teamScopes[tid] || "No scope provided."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-theme-border px-6 py-4">
          <Button variant="secondary" onClick={onClose} className="rounded-xl text-xs font-semibold">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={submitting}
            className="rounded-xl text-xs font-semibold px-6"
          >
            Save & Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

function LeadSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: any[];
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((o) => o.id === value);

  const filtered = options.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-theme-border bg-theme-raised px-3 py-2 text-xs font-medium text-theme-fg flex items-center justify-between hover:border-theme-primary/50 transition-all"
      >
        <div className="flex items-center gap-2">
          <UserCircle2
            size={14}
            className={selected ? "text-theme-primary" : "text-theme-muted"}
          />
          <span className={selected ? "text-theme-fg" : "text-theme-muted"}>
            {selected
              ? `${selected.name} (${selected.role})`
              : "Select a team lead…"}
          </span>
        </div>
        <ChevronDown
          size={13}
          className={cn("transition-transform text-theme-muted", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9000]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-[9001] rounded-xl border border-theme-border bg-theme-surface shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-2 border-b border-theme-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-muted" size={12} />
                <input
                  autoFocus
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-theme-border bg-theme-raised pl-7 pr-3 py-1.5 text-xs outline-none focus:border-theme-primary"
                />
              </div>
            </div>
            <div className="max-h-44 overflow-y-auto custom-scrollbar">
              {filtered.length > 0 ? (
                filtered.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      onChange(o.id);
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-theme-raised flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-theme-fg">{o.name}</p>
                      <p className="text-[10px] text-theme-muted">{o.role}</p>
                    </div>
                    {o.id === value && <Check size={12} className="text-theme-primary" />}
                  </button>
                ))
              ) : (
                <div className="px-3 py-5 text-center text-xs text-theme-muted">
                  No matching leads found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
