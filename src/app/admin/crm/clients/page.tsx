"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useCRMStore, ConvertedClient } from "@/store/crmStore";
import {
  Search as SearchIcon,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  Check,
  X,
  UserCheck,
  Phone,
  User,
  TrendingUp,
  Users,
  RefreshCw,
  ChevronDown,
  Mail,
  ArrowRightLeft,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { validateGSTIN, extractPANFromGSTIN } from "@/lib/gst";
import { AlertTriangle } from "lucide-react";

const formatRupee = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const TIER_STYLES: Record<string, string> = {
  Strategic: "bg-purple-100 text-purple-700",
  "Key Account": "bg-sky-100 text-sky-700",
  Standard: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Churned: "bg-rose-100 text-rose-700",
};

const ClientActionMenu = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button className="opacity-10 group-hover:opacity-100 hover:bg-black/5 p-1 rounded transition-all">
        <MoreVertical size={14} className="text-black/50" />
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="min-w-[160px] bg-white border border-black/5 rounded-lg shadow-xl p-1 z-50 animate-in fade-in zoom-in duration-200" sideOffset={5} align="end">
        <DropdownMenu.Item onClick={onEdit} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-black/70 hover:bg-black/5 outline-none cursor-pointer rounded transition-colors">
          <Edit2 size={12} className="text-black/30" /> Edit Client
        </DropdownMenu.Item>
        <DropdownMenu.Separator className="h-[1px] bg-black/5 my-1" />
        <DropdownMenu.Item onClick={onDelete} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 outline-none cursor-pointer rounded transition-colors">
          <Trash2 size={12} /> Remove Client
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

export default function CRMClientsPage() {
  const [convertedClients, setConvertedClients] = useState<ConvertedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ConvertedClient>>({});

  // Realtime Sync
  useEffect(() => {
    fetchClients();

    const channel = supabase
      .channel('clients_page_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast("Error fetching clients", "error");
    } else {
      // Map database fields to UI model
      const mapped = (data || []).map((c: any) => ({
        id: c.id,
        company: c.name || c.company || "Unknown",
        leadName: c.lead_name || "N/A",
        leadPhone: c.lead_phone || "N/A",
        value: Number(c.value || 0),
        empName: c.emp_id || "Direct", // In a real app, join with employees
        empId: c.emp_id || "",
        status: (c.status as any) || "Active",
        tier: (c.tier as any) || "Standard",
        convertedDate: c.converted_at ? new Date(c.converted_at).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }) : new Date(c.created_at).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }),
        fromPipeline: !!c.from_pipeline,
        gstin: c.gstin || "",
        pan: c.pan || "",
        email: c.email || "",
        address: c.address || ""
      }));
      setConvertedClients(mapped);
    }
    setLoading(false);
  };

  // Inline ghost row state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({
    company: "",
    leadName: "",
    leadPhone: "",
    value: 0,
    empName: "",
    empId: "",
    status: "Active" as ConvertedClient["status"],
    tier: "Standard" as ConvertedClient["tier"],
    gstin: "",
    pan: "",
    email: "",
    address: ""
  });

  const filtered = useMemo(() => {
    return convertedClients.filter((c) => {
      const matchSearch =
        !search ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.leadName.toLowerCase().includes(search.toLowerCase()) ||
        c.empName.toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === "All" || c.tier === tierFilter;
      return matchSearch && matchTier;
    });
  }, [convertedClients, search, tierFilter]);

  // Stats
  const totalRevenue = convertedClients.reduce((s, c) => s + c.value, 0);
  const totalClients = convertedClients.length;
  const activeClients = convertedClients.filter((c) => c.status === "Active").length;
  const convertedThisMonth = convertedClients.filter((c) => c.fromPipeline).length;

  const handleSaveNew = async () => {
    if (!newForm.company) return;
    const { error } = await supabase
      .from('clients')
      .insert([{
        name: newForm.company,
        company: newForm.company,
        lead_name: newForm.leadName,
        lead_phone: newForm.leadPhone,
        email: newForm.email,
        address: newForm.address,
        value: newForm.value,
        status: newForm.status,
        tier: newForm.tier,
        from_pipeline: false,
        gstin: newForm.gstin,
        pan: newForm.pan
      }]);

    if (error) {
      showToast("Failed to add client", "error");
    } else {
      showToast("Client added to registry", "success");
      setNewForm({ company: "", leadName: "", leadPhone: "", value: 0, empName: "", empId: "", status: "Active", tier: "Standard", gstin: "", pan: "", email: "", address: "" });
      setIsAddingNew(false);
    }
  };

  const handleStartEdit = (client: ConvertedClient) => {
    setEditingId(client.id);
    setEditValues({ ...client });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from('clients')
      .update({
        name: editValues.company,
        company: editValues.company,
        lead_name: editValues.leadName,
        lead_phone: editValues.leadPhone,
        value: editValues.value,
        status: editValues.status,
        tier: editValues.tier,
        gstin: editValues.gstin,
        pan: editValues.pan,
        email: editValues.email,
        address: editValues.address
      })
      .eq('id', editingId);

    if (error) {
        showToast("Update failed", "error");
    } else {
        showToast("Client records synced", "success");
        setEditingId(null);
        setEditValues({});
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) showToast("Deletion failed", "error");
    else showToast("Client record removed", "success");
  };

  const STATS = [
    { label: "Total Revenue", value: formatRupee(totalRevenue), icon: TrendingUp, accent: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Clients", value: String(totalClients), icon: Users, accent: "text-sky-600", bg: "bg-sky-50" },
    { label: "Active Accounts", value: `${activeClients}/${totalClients}`, icon: UserCheck, accent: "text-violet-600", bg: "bg-violet-50" },
    { label: "From Pipeline", value: String(convertedThisMonth), icon: ArrowRightLeft, accent: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <DashboardShell
      moduleKey="crm_clients"
      title="Client Registry"
      subtitle="Live enterprise client manifest — synchronized with the Sales Pipeline"
    >
      <div className="flex flex-col gap-6 font-sans bg-[#fbfbfa] -m-8 p-8 min-h-full">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white rounded-lg p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-[0_2px_12px_rgba(0,0,0,0.07)] transition-shadow">
              <div>
                <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-xl font-black text-black/80 tracking-tight">{s.value}</p>
              </div>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", s.bg)}>
                <s.icon size={16} className={s.accent} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Controls ── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-grow max-w-xs group">
            <SearchIcon size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-black/25 group-focus-within:text-black transition-colors" />
            <input
              type="text"
              placeholder="Search client, contact, employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent pl-7 pr-2 py-1.5 text-xs font-bold text-black outline-none border-b border-black/5 focus:border-black/20 transition-all placeholder:text-black/20"
            />
          </div>
          <div className="flex items-center gap-1">
            {["All", "Strategic", "Key Account", "Standard"].map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={cn("px-3 py-1 text-[10px] font-black rounded uppercase tracking-widest transition-all", tierFilter === t ? "bg-black text-white" : "text-black/30 hover:text-black hover:bg-black/5")}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-grow" />
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded hover:opacity-90 active:scale-95 transition-all shadow-md"
          >
            <Plus size={13} /> Add Client
          </button>
        </div>

        {/* ── Main Table ── */}
        <div className="bg-white rounded-lg shadow-[0_1px_8px_rgba(0,0,0,0.05)] overflow-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="w-10 px-4 py-3 border-r border-black/[0.04]"></th>
                {["Company", "Contact Person", "Phone", "Mail ID", "Revenue (₹)", "Assigned Employee", "Status", "Tier", "Date", "GSTIN", "PAN", "Address", "Pipeline Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-black text-black/30 uppercase tracking-widest border-r border-black/[0.04] whitespace-nowrap">
                    <div className="flex items-center gap-1">{h} <ChevronDown size={10} className="opacity-40" /></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, idx) => {
                const isEditing = editingId === client.id;
                return (
                  <tr
                    key={client.id}
                    className={cn(
                      "border-b border-black/[0.04] transition-colors group",
                      idx % 2 === 1 ? "bg-black/[0.01]" : "bg-white",
                      isEditing ? "bg-black/[0.03] ring-1 ring-inset ring-black/10" : "hover:bg-black/[0.015]"
                    )}
                  >
                    <td className="px-4 py-3 border-r border-black/[0.04] text-center">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={handleSaveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={12} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><X size={12} /></button>
                        </div>
                      ) : (
                        <ClientActionMenu onEdit={() => handleStartEdit(client)} onDelete={() => handleRemove(client.id)} />
                      )}
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-black/5 flex items-center justify-center text-[9px] font-black text-black/40 flex-shrink-0">
                          {client.company[0]}
                        </div>
                        {isEditing ? (
                          <input value={editValues.company || ""} onChange={(e) => setEditValues({ ...editValues, company: e.target.value })} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/20 w-full" />
                        ) : (
                          <span className="text-[13px] font-bold text-black/80">{client.company}</span>
                        )}
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      {isEditing ? (
                        <input value={editValues.leadName || ""} onChange={(e) => setEditValues({ ...editValues, leadName: e.target.value })} className="bg-transparent text-[12px] font-bold outline-none border-b border-black/10 w-full" />
                      ) : (
                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-black/60">
                          <User size={10} className="text-black/20" /> {client.leadName}
                        </div>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      {isEditing ? (
                        <input value={editValues.leadPhone || ""} onChange={(e) => setEditValues({ ...editValues, leadPhone: e.target.value })} className="bg-transparent text-[12px] font-bold outline-none border-b border-black/10 w-full" />
                      ) : (
                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-black/50">
                          <Phone size={10} className="text-black/20" /> {client.leadPhone}
                        </div>
                      )}
                    </td>

                    {/* Mail ID */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      {isEditing ? (
                        <input value={editValues.email || ""} onChange={(e) => setEditValues({ ...editValues, email: e.target.value })} className="bg-transparent text-[12px] font-bold outline-none border-b border-black/10 w-full" />
                      ) : (
                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-black/50">
                          <Mail size={10} className="text-black/20" /> {client.email || "—"}
                        </div>
                      )}
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      {isEditing ? (
                        <input type="number" value={editValues.value || ""} onChange={(e) => setEditValues({ ...editValues, value: Number(e.target.value) })} className="bg-transparent text-[12px] font-bold outline-none border-b border-black/10 w-full" />
                      ) : (
                        <span className="text-[12px] font-black text-emerald-600">{formatRupee(client.value)}</span>
                      )}
                    </td>

                    {/* Assigned Employee */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-black/5 flex items-center justify-center text-[8px] font-black text-black/40 flex-shrink-0">
                          {client.empName[0]}
                        </div>
                        <div className="flex flex-col leading-none">
                          <span className="text-[11px] font-bold text-black/70">{client.empName}</span>
                          <span className="text-[10px] font-bold text-black/40 mt-0.5">{client.empId}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      {isEditing ? (
                        <select value={editValues.status || "Active"} onChange={(e) => setEditValues({ ...editValues, status: e.target.value as ConvertedClient["status"] })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10">
                          <option>Active</option><option>Pending</option><option>Churned</option>
                        </select>
                      ) : (
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight", STATUS_STYLES[client.status])}>{client.status}</span>
                      )}
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      {isEditing ? (
                        <select value={editValues.tier || "Standard"} onChange={(e) => setEditValues({ ...editValues, tier: e.target.value as ConvertedClient["tier"] })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10">
                          <option>Standard</option><option>Key Account</option><option>Strategic</option>
                        </select>
                      ) : (
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight", TIER_STYLES[client.tier])}>{client.tier}</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 border-r border-black/[0.04] text-[11px] font-bold text-black/40 whitespace-nowrap">
                      {client.convertedDate}
                    </td>

                    {/* GSTIN */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      {isEditing ? (
                        <div className="relative">
                          <input value={editValues.gstin || ""} onChange={(e) => {
                            const v = e.target.value.toUpperCase();
                            setEditValues({ ...editValues, gstin: v, pan: extractPANFromGSTIN(v) || editValues.pan });
                          }} className={cn("bg-transparent text-[11px] font-bold outline-none border-b w-full uppercase", 
                            editValues.gstin && !validateGSTIN(editValues.gstin) ? "border-rose-500" : "border-black/10"
                          )} />
                          {editValues.gstin && !validateGSTIN(editValues.gstin) && <AlertTriangle size={10} className="absolute right-0 top-1 text-rose-500" />}
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-black/50">{client.gstin || "—"}</span>
                      )}
                    </td>

                    {/* PAN */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      {isEditing ? (
                        <input value={editValues.pan || ""} onChange={(e) => setEditValues({ ...editValues, pan: e.target.value.toUpperCase() })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 w-full uppercase" />
                      ) : (
                        <span className="text-[11px] font-bold text-black/50">{client.pan || "—"}</span>
                      )}
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3 border-r border-black/[0.04]">
                      {isEditing ? (
                        <input value={editValues.address || ""} onChange={(e) => setEditValues({ ...editValues, address: e.target.value })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 w-full" />
                      ) : (
                        <span className="text-[11px] font-bold text-black/50 truncate max-w-[150px]" title={client.address}>{client.address || "—"}</span>
                      )}
                    </td>

                    {/* From Pipeline badge */}
                    <td className="px-4 py-3 border-r border-black/[0.04] text-center">
                      {client.fromPipeline && (
                        <div className="flex items-center justify-center">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded uppercase tracking-tight">
                            <Check size={8} strokeWidth={3} /> Pipeline
                          </span>
                        </div>
                      )}
                    </td>

                    {/* View link */}
                    <td className="px-4 py-3 text-right">
                      <button className="text-[10px] font-black text-black/20 hover:text-black uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* ── Inline Ghost Row ── */}
              {isAddingNew ? (
                <tr className="border-b border-black/[0.04] bg-black/[0.04] ring-2 ring-inset ring-black animate-in fade-in duration-300">
                  <td className="px-4 py-3 border-r border-black/[0.04] text-center">
                    <div className="flex gap-1">
                      <button onClick={handleSaveNew} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={12} /></button>
                      <button onClick={() => setIsAddingNew(false)} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><X size={12} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <input autoFocus placeholder="Company Name" value={newForm.company} onChange={(e) => setNewForm({ ...newForm, company: e.target.value })} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/20 w-full placeholder:text-black/20" />
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <input placeholder="Contact Person" value={newForm.leadName} onChange={(e) => setNewForm({ ...newForm, leadName: e.target.value })} className="bg-transparent text-[12px] font-bold outline-none border-b border-black/10 w-full placeholder:text-black/20" />
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <input placeholder="+91 ..." value={newForm.leadPhone} onChange={(e) => setNewForm({ ...newForm, leadPhone: e.target.value })} className="bg-transparent text-[12px] font-bold outline-none border-b border-black/10 w-full placeholder:text-black/20" />
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <input placeholder="mail@example.com" value={newForm.email || ""} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} className="bg-transparent text-[12px] font-bold outline-none border-b border-black/10 w-full placeholder:text-black/20" />
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <input type="number" placeholder="Value" value={newForm.value || ""} onChange={(e) => setNewForm({ ...newForm, value: Number(e.target.value) })} className="bg-transparent text-[12px] font-bold outline-none border-b border-black/10 w-full placeholder:text-black/20" />
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <input placeholder="Employee Name" value={newForm.empName} onChange={(e) => setNewForm({ ...newForm, empName: e.target.value })} className="bg-transparent text-[12px] font-bold outline-none border-b border-black/10 w-full placeholder:text-black/20" />
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <select value={newForm.status} onChange={(e) => setNewForm({ ...newForm, status: e.target.value as ConvertedClient["status"] })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 w-full">
                      <option>Active</option><option>Pending</option><option>Churned</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <select value={newForm.tier} onChange={(e) => setNewForm({ ...newForm, tier: e.target.value as ConvertedClient["tier"] })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 w-full">
                      <option>Standard</option><option>Key Account</option><option>Strategic</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <span className="text-[11px] font-bold text-black/20 italic">Today</span>
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <div className="relative">
                      <input 
                        placeholder="GSTIN" 
                        value={newForm.gstin} 
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          const pan = extractPANFromGSTIN(val);
                          setNewForm({ ...newForm, gstin: val, pan: pan || newForm.pan });
                        }} 
                        className={cn("bg-transparent text-[11px] font-bold outline-none border-b w-full uppercase", 
                          newForm.gstin && !validateGSTIN(newForm.gstin) ? "border-rose-500" : "border-black/10"
                        )} 
                      />
                      {newForm.gstin && !validateGSTIN(newForm.gstin) && <AlertTriangle size={10} className="absolute right-0 top-1 text-rose-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <input placeholder="PAN" value={newForm.pan} onChange={(e) => setNewForm({ ...newForm, pan: e.target.value.toUpperCase() })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 w-full uppercase" />
                  </td>
                  <td className="px-4 py-3 border-r border-black/[0.04]">
                    <input placeholder="Billing Address" value={newForm.address} onChange={(e) => setNewForm({ ...newForm, address: e.target.value })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 w-full" />
                  </td>
                  <td className="px-4 py-3 text-[10px] text-black/25 font-black uppercase italic animate-pulse whitespace-nowrap">Draft Mode...</td>
                </tr>
              ) : (
                <tr onClick={() => setIsAddingNew(true)} className="hover:bg-black/[0.015] transition-colors cursor-pointer group border-b border-dashed border-black/10">
                  <td className="px-4 py-3 border-r border-black/[0.04]"></td>
                  <td colSpan={12} className="px-4 py-3">
                    <div className="flex items-center gap-2 text-[11px] font-black text-black/25 uppercase tracking-widest group-hover:text-black transition-colors">
                      <Plus size={13} /> Add New Client
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-black text-black/20 uppercase tracking-widest">
            {filtered.length} of {totalClients} clients — {convertedThisMonth} converted from pipeline
          </p>
          <p className="text-[10px] font-black text-black/20 uppercase tracking-widest">
            Total Portfolio: {formatRupee(totalRevenue)}
          </p>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </DashboardShell>
  );
}
