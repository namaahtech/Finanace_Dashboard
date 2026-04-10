"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Search, MoreVertical, Edit2, Trash2,
  XCircle, AlertCircle, Calendar, Building2, 
  LayoutGrid, X, ChevronDown, Timer, Target, 
  CalendarDays, Check, Palette, Clock, Building, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { DatePicker } from "@/components/ui/DatePicker";
import dayjs from "dayjs";

// ─── Types ───────────────────────────────────────────────
interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color_code: string;
  valid_from: string | null;
  valid_to: string | null;
  department: string | null;
  team_id: string | null;
  is_active: boolean;
  member_count?: number;
}

interface TeamNode { 
  id: string; 
  name: string; 
  type: 'department' | 'team';
  parent_id: string | null;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  designation: string;
  shift_id: string | null;
}

// ─── Custom Dropdown ────────────────────────────────────
function CustomSelect({ value, options, onChange, placeholder, icon, label }: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="space-y-2" ref={ref}>
      {label && <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-theme-muted">{icon}{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-[46px] w-full items-center justify-between rounded-2xl border border-theme-border bg-theme-page px-4 text-sm font-bold text-theme-fg outline-none focus:border-theme-strong transition-all overflow-hidden"
        >
          <span className="flex items-center gap-2 truncate pr-2">
            {!label && icon}
            {selected ? selected.label : <span className="text-theme-muted font-normal">{placeholder}</span>}
          </span>
          <ChevronDown size={14} className={cn("flex-shrink-0 text-theme-muted transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute top-full z-[1000] mt-1.5 w-full max-h-48 overflow-y-auto rounded-2xl border border-theme-border bg-theme-surface shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-1.5 animate-in slide-in-from-top-1 duration-200">
            {options.length > 0 ? options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                  value === opt.value ? "bg-theme-primary text-theme-surface" : "text-theme-fg hover:bg-theme-raised"
                )}
              >
                <span className="truncate uppercase">{opt.label}</span>
                {value === opt.value && <Check size={12} className="flex-shrink-0" />}
              </button>
            )) : (
              <div className="px-3 py-4 text-center text-[10px] uppercase font-black tracking-widest text-theme-muted opacity-50">No Options Available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shift Action Menu ──────────────────────────────────
function ShiftCardMenu({ onEdit, onDelete }: { onEdit: () => void, onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 px-1.5 rounded-lg hover:bg-theme-raised text-theme-muted transition-all"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-[100] w-40 bg-theme-surface rounded-2xl shadow-2xl border border-theme-border p-1.5 animate-in zoom-in-95 duration-150">
           <button onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); }}
             className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold text-theme-fg hover:bg-theme-raised transition-all group">
             <Edit2 size={13} className="text-theme-muted group-hover:text-theme-primary transition-colors" /> Edit Protocol
           </button>
           <button onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
             className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-black text-rose-500 hover:bg-rose-50 transition-all">
             <Trash2 size={13} /> Delete Protocol
           </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────
export default function ShiftManagementPage() {
  const { showToast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orgNodes, setOrgNodes] = useState<TeamNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Shift | null>(null);
  
  // Modal State
  const [showDefineModal, setShowDefineModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    start_time: "09:00",
    end_time: "18:00",
    color_code: "#10b981",
    valid_from: dayjs().format("YYYY-MM-DD"),
    valid_to: dayjs().add(1, 'year').format("YYYY-MM-DD"),
    department_id: "",
    team_id: ""
  });

  async function loadData() {
    setLoading(true);
    try {
      const { data: shiftsData } = await supabase.from("shifts").select("*").order("start_time");
      const { data: empData } = await supabase.from("employees").select("id, name, employee_id, department, designation, shift_id").order("name");
      const { data: nodesData } = await supabase.from("teams").select("id, name, type, parent_id");
      
      const shiftsWithCount = shiftsData?.map(s => ({
        ...s,
        member_count: empData?.filter(e => e.shift_id === s.id).length || 0
      }));

      setShifts(shiftsWithCount || []);
      setEmployees(empData || []);
      setOrgNodes(nodesData || []);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === "Escape") {
        setShowDefineModal(false);
        setDeleteConfirm(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  async function handleSaveShift() {
    if (!shiftForm.name) return showToast("Protocol name is mandatory", "warning");
    setSubmitting(true);
    try {
      const deptNode = orgNodes.find(n => n.id === shiftForm.department_id);
      const payload = {
        name: shiftForm.name,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        color_code: shiftForm.color_code,
        valid_from: shiftForm.valid_from,
        valid_to: shiftForm.valid_to,
        department: deptNode ? deptNode.name : null,
        team_id: shiftForm.team_id || null
      };

      if (editingShiftId) {
        const { error } = await supabase.from("shifts").update(payload).eq("id", editingShiftId);
        if (error) throw error;
        showToast("Shift protocol re-indexed successfully", "success");
      } else {
        const { error } = await supabase.from("shifts").insert([payload]);
        if (error) throw error;
        showToast("New shift protocol established successfully", "success");
      }

      setShowDefineModal(false);
      setEditingShiftId(null);
      loadData();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("shifts").delete().eq("id", deleteConfirm.id);
      if (error) throw error;
      showToast(`Protocol "${deleteConfirm.name}" decommissioned.`, "success");
      setDeleteConfirm(null);
      loadData();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                          e.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchesShift = selectedShiftFilter === "all" ? true : e.shift_id === selectedShiftFilter;
    if (selectedShiftFilter === "unassigned") return matchesSearch && !e.shift_id;
    return matchesSearch && matchesShift;
  });

  const departments = orgNodes.filter(n => n.type === 'department');
  const teams = orgNodes.filter(n => n.type === 'team');

  return (
    <DashboardShell
      title="Shift Management"
      subtitle="Define precisely targeted operational temporal cycles."
      actions={
        <Button variant="primary" size="sm" onClick={() => {
            setEditingShiftId(null);
            setShiftForm({
              name: "", start_time: "09:00", end_time: "18:00", color_code: "#10b981",
              valid_from: dayjs().format("YYYY-MM-DD"), valid_to: dayjs().add(1, 'year').format("YYYY-MM-DD"),
              department_id: "", team_id: ""
            });
            setShowDefineModal(true);
        }}>
          <Plus size={14} className="mr-1.5" /> Define Shift
        </Button>
      }
    >
      <div className="space-y-8">
        {/* SHIFT REGISTRY CARDS */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shifts.map(shift => (
            <div key={shift.id} onClick={() => setSelectedShiftFilter(shift.id)}
              className={cn("relative page-card group cursor-pointer border-l-4 transition-all hover:shadow-xl hover:-translate-y-1", 
                selectedShiftFilter === shift.id ? "border-zinc-900 bg-zinc-50" : "border-theme-border"
              )}
              style={{ borderLeftColor: shift.color_code }}>
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-theme-raised flex items-center justify-center shadow-sm">
                  <Clock size={18} style={{ color: shift.color_code }} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-[9px] font-black px-2 py-0.5 tracking-widest">{shift.member_count} ACTIVE</Badge>
                  <ShiftCardMenu 
                    onDelete={() => setDeleteConfirm(shift)}
                    onEdit={() => {
                        const node = orgNodes.find(n => n.name === shift.department && n.type === 'department');
                        setEditingShiftId(shift.id);
                        setShiftForm({
                            name: shift.name,
                            start_time: shift.start_time.slice(0, 5),
                            end_time: shift.end_time.slice(0, 5),
                            color_code: shift.color_code,
                            valid_from: shift.valid_from || dayjs().format("YYYY-MM-DD"),
                            valid_to: shift.valid_to || dayjs().add(1,'year').format("YYYY-MM-DD"),
                            department_id: node ? node.id : "",
                            team_id: shift.team_id || ""
                        });
                        setShowDefineModal(true);
                    }}
                  />
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-[15px] font-black text-theme-fg uppercase italic tracking-tight">{shift.name}</h3>
                <p className="text-[11px] font-black text-theme-muted mt-1 uppercase tracking-widest tabular-nums opacity-60">
                   {dayjs(`2000-01-01 ${shift.start_time}`).format("hh:mm A")} — {dayjs(`2000-01-01 ${shift.end_time}`).format("hh:mm A")}
                </p>
              </div>
              
              <div className="mt-6 pt-4 border-t border-theme-border/50 flex flex-col gap-2">
                {shift.department && (
                  <div className="flex items-center gap-2 text-[10px] font-black text-theme-subtle uppercase tracking-wider">
                    <Building2 size={11} className="text-theme-muted" /> {shift.department}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[10px] font-black text-theme-muted uppercase tracking-wider">
                  <Calendar size={11} className="opacity-40" /> {dayjs(shift.valid_from).format("MMM DD, YYYY")} — {dayjs(shift.valid_to).format("MMM DD")}
                </div>
              </div>
            </div>
          ))}

          <div onClick={() => setSelectedShiftFilter("unassigned")}
            className={cn("page-card border-dashed border-2 cursor-pointer flex flex-col items-center justify-center py-8 hover:bg-theme-raised/50 transition-all", 
              selectedShiftFilter === "unassigned" ? "border-amber-500 bg-amber-500/5 shadow-inner" : "border-theme-border opacity-50 opacity-40"
            )}>
            <AlertCircle size={24} className="text-amber-500 mb-3" />
            <h3 className="text-xs font-black text-theme-fg tracking-widest uppercase">Unassigned Pool</h3>
            <p className="text-[10px] font-bold text-theme-muted mt-1 uppercase opacity-60">Pending Temporal Assignment</p>
          </div>
        </div>

        {/* OPERATION MANNING TABLE */}
        <div className="page-card p-0 overflow-hidden shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-theme-border px-8 py-6 sm:flex-row sm:items-center sm:justify-between bg-theme-raised/10">
            <div className="flex items-center gap-4">
              <div className="h-5 w-1.5 bg-theme-primary rounded-full shadow-lg shadow-theme-primary/20" />
              <div>
                <h3 className="text-sm font-black text-theme-fg tracking-tighter uppercase italic">Operational Manning Registry</h3>
                <p className="text-[10px] text-theme-muted font-bold uppercase tracking-widest opacity-60">Session: {dayjs().format("DD MMM YYYY")}</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted" size={14} />
              <input type="text" placeholder="Search Personnel Deployment..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-72 rounded-2xl border border-theme-border bg-theme-page pl-11 pr-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-strong transition-all shadow-sm" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page/30 text-left text-[10px] font-black uppercase tracking-widest text-theme-muted">
                  <th className="px-8 py-5">Personnel</th>
                  <th className="px-8 py-5">Architecture Entity</th>
                  <th className="px-8 py-5 text-center">Assigned Protocol</th>
                  <th className="px-8 py-5 text-center">Temporal Rules</th>
                  <th className="px-8 py-5 text-right">Deployment Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/50">
                {loading ? (
                    <tr><td colSpan={5} className="px-8 py-20 text-center animate-pulse text-[10px] font-black text-theme-muted uppercase tracking-[0.2em]">Synchronizing Protocol Matrix...</td></tr>
                ) : filteredEmployees.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-20 text-center text-xs font-bold text-theme-muted">Target sector has no active deployments.</td></tr>
                ) : filteredEmployees.map(emp => {
                  const currentShift = shifts.find(s => s.id === emp.shift_id);
                  return (
                    <tr key={emp.id} className="group hover:bg-theme-raised/30 transition-all duration-300">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-theme-primary text-theme-surface text-[11px] font-black shadow-lg">
                             {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-black text-theme-fg">{emp.name}</p>
                            <p className="text-[10px] text-theme-muted font-mono font-bold">{emp.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[11px] font-bold text-theme-fg uppercase tracking-tight">
                         {emp.department} <span className="mx-2 text-theme-border">/</span> <span className="text-theme-muted font-normal italic lowercase">{emp.designation}</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {currentShift ? (
                          <span style={{ backgroundColor: `${currentShift.color_code}15`, color: currentShift.color_code, borderColor: `${currentShift.color_code}30` }} 
                            className="inline-flex items-center rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest shadow-sm">
                            {currentShift.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-rose-500 font-black text-[9px] uppercase tracking-widest opacity-60">
                             <XCircle size={12} /> Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center tabular-nums text-[11px] font-black text-theme-fg italic">
                        {currentShift ? <span>{dayjs(`2000-01-01 ${currentShift.start_time}`).format("hh:mm A")} — {dayjs(`2000-01-01 ${currentShift.end_time}`).format("hh:mm A")}</span> : "—"}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <select className="bg-theme-raised/50 text-[10px] font-black uppercase text-theme-primary border-none outline-none cursor-pointer hover:bg-theme-primary hover:text-white px-3 py-2 rounded-xl transition-all shadow-sm"
                          value={emp.shift_id || ""} onChange={(e) => {
                             const sid = e.target.value || null;
                             supabase.from("employees").update({ shift_id: sid }).eq("id", emp.id).then(() => {
                               showToast("Protocol Deployment Updated", "success");
                               loadData();
                             });
                          }}>
                          <option value="">CHANGE SLOT...</option>
                          {shifts.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                          <option value="">RECALL TO POOL</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DEFINE/EDIT SHIFT MODAL */}
      {showDefineModal && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="w-full max-w-2xl bg-theme-surface rounded-[40px] shadow-[0_32px_120px_-20px_rgba(0,0,0,0.6)] border border-theme-border animate-in zoom-in-95 duration-400">
              <div className="flex items-center justify-between border-b border-theme-border bg-theme-raised/30 px-10 py-8 rounded-t-[40px]">
                 <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-theme-primary text-theme-surface shadow-2xl">
                      {editingShiftId ? <Edit2 size={24} /> : <Timer size={28} />}
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-theme-fg tracking-tighter uppercase italic">{editingShiftId ? 'Edit Shift Protocol' : 'Deploy New Protocol'}</h3>
                       <p className="text-[10px] text-theme-muted font-black uppercase tracking-[0.2em] opacity-60">Temporal Configuration Matrix</p>
                    </div>
                 </div>
                 <button onClick={() => setShowDefineModal(false)} className="rounded-[20px] p-3 text-theme-muted hover:bg-theme-raised active:scale-90 transition-all">
                    <X size={24} strokeWidth={3} />
                 </button>
              </div>
              
              <div className="p-10">
                 <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div className="space-y-2">
                       <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-theme-muted"><Target size={13} strokeWidth={3} /> Protocol Alias</label>
                       <input type="text" placeholder="e.g. Night Vanguard" value={shiftForm.name} onChange={(e) => setShiftForm({...shiftForm, name: e.target.value})}
                          className="h-[52px] w-full rounded-2xl border border-theme-border bg-theme-page px-5 text-sm font-black text-theme-fg outline-none focus:border-theme-primary transition-all shadow-inner" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-theme-muted"><Clock size={13} /> Commencement</label>
                          <input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({...shiftForm, start_time: e.target.value})} className="h-[52px] w-full rounded-2xl border border-theme-border bg-theme-page px-5 text-sm font-black text-theme-fg outline-none shadow-inner" />
                       </div>
                       <div className="space-y-2">
                          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-theme-muted"><Clock size={13} /> Termination</label>
                          <input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({...shiftForm, end_time: e.target.value})} className="h-[52px] w-full rounded-2xl border border-theme-border bg-theme-page px-5 text-sm font-black text-theme-fg outline-none shadow-inner" />
                       </div>
                    </div>

                    <CustomSelect 
                      label="Deployment Sector" icon={<Building size={13} />} placeholder="Select Department"
                      value={shiftForm.department_id} onChange={(v) => setShiftForm({...shiftForm, department_id: v, team_id: ""})} 
                      options={[{ label: "Global/Any Sector", value: "" }, ...departments.map(d => ({ label: d.name, value: d.id }))]}
                    />

                    <CustomSelect 
                      label="Operational Squad" icon={<LayoutGrid size={13} />} placeholder="Select Unit"
                      value={shiftForm.team_id} onChange={(v) => {
                         const team = teams.find(t => t.id === v);
                         if (team && !shiftForm.department_id) setShiftForm({...shiftForm, team_id: v, department_id: team.parent_id || ""});
                         else setShiftForm({...shiftForm, team_id: v});
                      }} 
                      options={[{ label: "Global/Any Squad", value: "" }, ...teams.filter(t => !shiftForm.department_id || t.parent_id === shiftForm.department_id).map(t => ({ label: t.name, value: t.id }))]}
                    />

                    <div className="space-y-2">
                       <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-theme-muted"><CalendarDays size={13} /> Active From</label>
                       <DatePicker value={shiftForm.valid_from} onChange={(d) => setShiftForm({...shiftForm, valid_from: d})} label="" />
                    </div>

                    <div className="space-y-2">
                       <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-theme-muted"><CalendarDays size={13} /> Active Until</label>
                       <DatePicker value={shiftForm.valid_to} onChange={(d) => setShiftForm({...shiftForm, valid_to: d})} label="" />
                    </div>

                    <div className="sm:col-span-2 space-y-3">
                       <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-theme-muted"><Palette size={13} /> Protocol Signature Color</label>
                       <div className="flex flex-wrap gap-4 pt-1">
                          {['#10b981', '#0ea5e9', '#f59e0b', '#6366f1', '#f43f5e', '#8b5cf6', '#000000'].map(c => (
                             <button key={c} onClick={() => setShiftForm({...shiftForm, color_code: c})}
                                className={cn("h-11 w-11 rounded-[18px] border-4 transition-all hover:scale-110 shadow-lg", shiftForm.color_code === c ? "border-theme-primary scale-110 shadow-2xl" : "border-white/50")}
                                style={{ backgroundColor: c }}>
                               {shiftForm.color_code === c && <Check size={14} className="mx-auto text-white drop-shadow-lg" strokeWidth={4} />}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="flex justify-end gap-4 border-t border-theme-border pt-10 mt-10">
                    <Button type="button" variant="secondary" onClick={() => setShowDefineModal(false)} className="rounded-[20px] px-10 h-14 font-black uppercase tracking-[0.1em] text-[10px] opacity-60 hover:opacity-100 italic">Abort</Button>
                    <Button onClick={handleSaveShift} loading={submitting} className="rounded-[20px] px-12 h-14 font-black uppercase tracking-[0.1em] text-[10px] shadow-2xl shadow-theme-primary/40 italic">
                      {editingShiftId ? 'Update Protocol' : 'Deploy Protocol'}
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRMATION PILL (MATCHING PLATFORM STYLE) */}
      {deleteConfirm && (
        <div className="fixed inset-x-0 top-8 z-[9000] flex justify-center px-4 animate-in slide-in-from-top-8 duration-300">
           <div className="flex items-center gap-6 bg-white px-8 py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-full border border-zinc-200 min-w-[460px]">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 flex items-center justify-center bg-rose-50 text-rose-600 rounded-full shadow-inner">
                    <Trash2 size={20} />
                 </div>
                 <div className="flex flex-col">
                    <p className="text-sm font-black text-zinc-900 tracking-tight">Decommission <span className="text-rose-600 italic">"{deleteConfirm.name}"</span>?</p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest opacity-60">All personnel will be recalled to pool.</p>
                 </div>
              </div>
              
              <div className="flex items-center gap-3 ml-auto">
                 <button onClick={() => setDeleteConfirm(null)} disabled={submitting}
                    className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">
                    Abort
                 </button>
                 <button onClick={handleDeleteConfirm} disabled={submitting}
                    className="px-7 py-2.5 bg-rose-600 hover:bg-rose-700 text-[10px] font-black uppercase tracking-widest text-white rounded-full shadow-xl shadow-rose-200 transition-all active:scale-95">
                    {submitting ? "PURGING..." : "CONFIRM DECOMMISSION"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </DashboardShell>
  );
}
