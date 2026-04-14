"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useCRMStore } from "@/store/crmStore";
import { 
  Plus, 
  FileText, 
  LayoutGrid, 
  Database,
  Search as SearchIcon,
  ChevronDown,
  MoreVertical,
  MoreHorizontal,
  Trash2,
  Copy,
  Edit2,
  Check,
  X,
  Phone,
  User,
  Columns,
  Tag,
  Briefcase,
  UserCheck,
  ChevronUp,
  Mail,
  Zap
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { validateGSTIN, extractPANFromGSTIN } from "@/lib/gst";
import { AlertTriangle } from "lucide-react";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from "@hello-pangea/dnd";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

// Indian Currency Formatter
const formatRupee = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Indian Number to Words Helper
const numberToIndianWords = (num: number) => {
  if (!num || num === 0) return "";
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} Lakh`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)} K`;
  return num.toString();
};

// Color Palette for Stages
const STAGE_COLORS = [
  { c: 'bg-emerald-500', b: 'bg-emerald-100', t: 'text-emerald-700' },
  { c: 'bg-rose-500', b: 'bg-rose-100', t: 'text-rose-700' },
  { c: 'bg-amber-500', b: 'bg-amber-100', t: 'text-amber-700' },
  { c: 'bg-blue-500', b: 'bg-blue-100', t: 'text-blue-700' },
  { c: 'bg-indigo-500', b: 'bg-indigo-100', t: 'text-indigo-700' },
  { c: 'bg-violet-500', b: 'bg-violet-100', t: 'text-violet-700' },
  { c: 'bg-pink-500', b: 'bg-pink-100', t: 'text-pink-700' },
  { c: 'bg-orange-500', b: 'bg-orange-100', t: 'text-orange-700' },
  { c: 'bg-cyan-500', b: 'bg-cyan-100', t: 'text-cyan-700' },
  { c: 'bg-slate-500', b: 'bg-slate-100', t: 'text-slate-700' },
];

// Custom Dropdown Component
function CustomSelect({ value, options, onChange, placeholder, icon, label, error }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o: any) => o.value === value);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded border border-black/10 bg-[#fbfbfa] px-2 text-[10px] font-bold text-black outline-none focus:border-black transition-all",
          error && "border-rose-500"
        )}
      >
        <span className="flex items-center gap-2 truncate pr-1">
          {selected ? (
              <div className="flex flex-col items-start leading-none">
                  <span className="font-black tracking-tight">{selected.value}</span>
                  <span className="text-[8px] opacity-40 uppercase">{selected.label}</span>
              </div>
          ) : <span className="text-black/30">{placeholder}</span>}
        </span>
        {open ? <ChevronUp size={10} className="text-black/20" /> : <ChevronDown size={10} className="text-black/20" />}
      </button>

      {open && (
        <div className="absolute top-full z-[100] mt-1 w-full max-h-40 overflow-y-auto rounded border border-black/10 bg-white shadow-xl p-1 animate-in zoom-in-95 duration-150">
          {options.length > 0 ? options.map((opt: any) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "flex w-full flex-col items-start rounded px-2 py-1.5 text-left transition-all",
                value === opt.value ? "bg-black text-white" : "text-black hover:bg-black/5"
              )}
            >
              <span className="text-[10px] font-black">{opt.value}</span>
              <span className={cn("text-[8px] font-bold uppercase", value === opt.value ? "text-white/60" : "text-black/40")}>{opt.label}</span>
            </button>
          )) : (
            <div className="px-2 py-3 text-center text-[8px] uppercase font-black tracking-widest text-black/20">No Results</div>
          )}
        </div>
      )}
    </div>
  );
}

// Render Helper for Employee Mapping
const EmployeeDisplay = ({ empId, empName, employees }: any) => {
  const emp = employees.find((e: any) => e.id === empId || e.employee_id === empId);
  const displayId = emp ? emp.employee_id : (empId ? "Syncing..." : "Unassigned");
  const displayName = emp ? emp.name : (empName || "Unassigned");
  return (
    <div className="flex flex-col leading-none">
      <span className="text-[11px] font-bold text-black/70 truncate w-32">{displayName}</span>
      <span className="text-[9px] font-bold text-black/30 mt-0.5">{displayId}</span>
    </div>
  );
};

// Initial data
const INITIAL_DATA = {
  columns: {
    "new": {
      id: "new", title: "New", color: "bg-emerald-500", pillBg: "bg-emerald-100", pillText: "text-emerald-700",
      items: [] as any[]
    },
    "contacted": {
      id: "contacted", title: "Discovery", color: "bg-rose-500", pillBg: "bg-rose-100", pillText: "text-rose-700",
      items: [] as any[]
    },
    "negotiation": {
      id: "negotiation", title: "Negotiation", color: "bg-amber-500", pillBg: "bg-amber-100", pillText: "text-amber-700",
      items: [] as any[]
    },
    "won": {
      id: "won", title: "Won", color: "bg-blue-500", pillBg: "bg-blue-100", pillText: "text-blue-700",
      items: [] as any[]
    },
    "lost": {
      id: "lost", title: "Lost", color: "bg-slate-500", pillBg: "bg-slate-100", pillText: "text-slate-700",
      items: [] as any[]
    }
  },
  columnOrder: ["new", "contacted", "negotiation", "won", "lost"]
};

interface DealItem {
  id: string;
  company: string;
  value: number;
  priority: 'Medium' | 'High' | 'Critical';
  priorityColor: string;
  leadName: string;
  leadPhone: string;
  empName: string;
  empId: string;
  stage: string;
  date: string;
  email: string;
  gstin: string;
  pan: string;
  address: string;
}

const ActionMenu = ({ children, align = "end", onRename, onDuplicate, onDelete, onConvert, deleteLabel = "Delete" }: any) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="min-w-[180px] bg-white border border-black/5 rounded-lg shadow-xl p-1 z-50 animate-in fade-in zoom-in duration-200" sideOffset={5} align={align}>
        {onConvert && <DropdownMenu.Item onClick={onConvert} className="flex items-center gap-2 px-3 py-2 text-[11px] font-black text-emerald-600 hover:bg-emerald-50 outline-none cursor-pointer rounded transition-colors uppercase tracking-tight"><UserCheck size={12} className="text-emerald-500" /> Convert to Client</DropdownMenu.Item>}
        {onRename && <DropdownMenu.Item onClick={onRename} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-black/70 hover:bg-black/5 outline-none cursor-pointer rounded transition-colors"><Edit2 size={12} className="text-black/30" /> Rename/Edit</DropdownMenu.Item>}
        {onDuplicate && <DropdownMenu.Item onClick={onDuplicate} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-black/70 hover:bg-black/5 outline-none cursor-pointer rounded transition-colors"><Copy size={12} className="text-black/30" /> Duplicate</DropdownMenu.Item>}
        {(onRename || onDuplicate || onConvert) && <DropdownMenu.Separator className="h-[1px] bg-black/5 my-1" />}
        {onDelete && <DropdownMenu.Item onClick={onDelete} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 outline-none cursor-pointer rounded transition-colors"><Trash2 size={12} /> {deleteLabel}</DropdownMenu.Item>}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

const ConfirmDialog = ({ isOpen, title, onConfirm, onCancel }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[250] animate-in slide-in-from-top-4 fade-in duration-500">
      <div className="bg-white border border-black/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] px-2 py-1.5 flex items-center gap-4 min-w-[320px]">
        <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0 ml-1">
          <Trash2 size={14} />
        </div>
        <div className="flex flex-col pr-4">
           <span className="text-[10px] font-black text-black uppercase tracking-tighter leading-none">{title}</span>
           <span className="text-[9px] font-bold text-black/30 uppercase mt-0.5">Permanent Action</span>
        </div>
        <div className="flex items-center gap-1">
           <button onClick={onCancel} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors rounded-full hover:bg-black/5">No</button>
           <button onClick={onConfirm} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white hover:bg-rose-600 transition-colors rounded-full shadow-lg shadow-rose-200">Confirm Delete</button>
        </div>
      </div>
    </div>
  );
};

export default function CRMPipelinePage() {
  const { addConvertedClient } = useCRMStore();
  const [data, setData] = useState<any>(INITIAL_DATA);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<'board' | 'database'>('board');
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; itemId: string | null }>({ isOpen: false, itemId: null });
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Inline States
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [addingToTable, setAddingToTable] = useState(false);
  const [isAddingStage, setIsAddingStage] = useState(false);
  
  const [inlineForm, setInlineForm] = useState({
    company: "",
    value: 0,
    leadName: "",
    leadPhone: "",
    email: "",
    gstin: "",
    pan: "",
    address: "",
    empId: "",
    empName: "",
    priority: "Medium",
    priorityColor: "bg-blue-100 text-blue-700"
  });

  const validatePhone = (val: string) => {
    return val.replace(/[^0-9+]/g, '').slice(0, 13);
  };

  const [newColumnForm, setNewColumnForm] = useState({
    title: "",
    color: STAGE_COLORS[9].c, // Slate default
    pillBg: STAGE_COLORS[9].b,
    pillText: STAGE_COLORS[9].t
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsReady(true);
    fetchEmployees();
    fetchLeads();

    const channel = supabase
      .channel('crm_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchEmployees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeads = async () => {
    const { data: dbLeads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      showToast("Error fetching leads", "error");
    } else {
      // Create a fresh clone of columns from INITIAL_DATA
      const newColumns: any = {};
      Object.keys(INITIAL_DATA.columns).forEach(key => {
        newColumns[key] = { ...INITIAL_DATA.columns[key as keyof typeof INITIAL_DATA.columns], items: [] };
      });
      
      (dbLeads || []).forEach(lead => {
        const item: DealItem = {
          id: lead.id,
          company: lead.company || lead.name,
          value: Number(lead.value),
          leadName: lead.lead_name,
          leadPhone: lead.lead_phone,
          stage: lead.stage,
          priority: lead.priority as any,
          priorityColor: lead.priority === 'Critical' ? 'bg-rose-100 text-rose-600' : lead.priority === 'High' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500',
          empName: lead.emp_name || "Unassigned",
          empId: lead.emp_id || "", 
          email: lead.email || "",
          gstin: lead.gstin || "",
          pan: lead.pan || "",
          address: lead.address || "",
          date: new Date(lead.created_at).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })
        };
        const boardStage = lead.stage.toLowerCase();
        if (newColumns[boardStage]) {
          newColumns[boardStage].items.push(item);
        }
      });
      setData((prev: any) => ({ ...prev, columns: newColumns }));
    }
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_id, name')
      .order('employee_id');
    if (error) showToast("Failed to fetch employees", "error");
    else setEmployees(data || []);
  };

  const startInlineAdd = (columnId: string | null = null) => {
    setAddingToColumn(columnId);
    setAddingToTable(columnId === null && view === 'database');
    setInlineForm({ 
      company: "", 
      value: 0, 
      leadName: "", 
      leadPhone: "", 
      email: "",
      gstin: "",
      pan: "",
      address: "",
      empId: "", 
      empName: "", 
      priority: "Medium", 
      priorityColor: "bg-blue-100 text-blue-700" 
    });
  };

  const cancelInlineAdd = () => {
    setAddingToColumn(null);
    setAddingToTable(false);
  };

  const startInlineStage = () => {
    setIsAddingStage(true);
    setNewColumnForm({ title: "", color: STAGE_COLORS[9].c, pillBg: STAGE_COLORS[9].b, pillText: STAGE_COLORS[9].t });
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: scrollContainerRef.current.scrollWidth, behavior: 'smooth' });
      }
    }, 100);
  };

  const saveInlineAdd = async () => {
    if (!inlineForm.company) return;
    const colId = addingToColumn || "new";
    
    // Find UUID for employee
    const empRecord = employees.find(e => e.employee_id === inlineForm.empId);
    const database_emp_id = empRecord?.id || null;

    const { error } = await supabase
      .from('leads')
      .insert([{
        company: inlineForm.company,
        name: inlineForm.company,
        value: inlineForm.value,
        lead_name: inlineForm.leadName,
        lead_phone: inlineForm.leadPhone,
        email: inlineForm.email,
        gstin: inlineForm.gstin,
        pan: inlineForm.pan,
        address: inlineForm.address,
        stage: colId,
        priority: inlineForm.priority,
        emp_id: database_emp_id,
        emp_name: inlineForm.empName
      }]);

    if (error) {
      console.error("Lead Capture Error:", error);
      showToast(`Failed to save: ${error.message}`, "error");
    } else {
      showToast("Lead captured successfully", "success");
      fetchLeads(); // Force instant refresh
      cancelInlineAdd();
    }
  };

  const handlePriorityChange = (priority: string, isEditing: boolean = false) => {
    const color = priority === 'Critical' ? 'bg-rose-100 text-rose-700' : priority === 'High' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
    if (isEditing) {
      setEditValues({ ...editValues, priority, priorityColor: color });
    } else {
      setInlineForm({ ...inlineForm, priority, priorityColor: color });
    }
  };

  const handleEmpIdChange = (empId: string, isEditing: boolean = false) => {
    const emp = employees.find(e => e.employee_id === empId);
    if (isEditing) {
      setEditValues({ ...editValues, empId, empName: emp ? emp.name : "" });
    } else {
      setInlineForm({ ...inlineForm, empId, empName: emp ? emp.name : "" });
    }
  };

  const saveInlineStage = () => {
    if (!newColumnForm.title) return;
    const colId = newColumnForm.title.toUpperCase().replace(/\s+/g, "_");
    const newData = { ...data };
    newData.columns[colId] = { id: colId, ...newColumnForm, items: [] };
    newData.columnOrder.push(colId);
    setData(newData);
    setIsAddingStage(false);
  };

  const handleDeleteColumn = (colId: string) => {
    const newData = { ...data };
    delete newData.columns[colId];
    newData.columnOrder = newData.columnOrder.filter((id: string) => id !== colId);
    setData(newData);
  };

  const handleConvertToClient = async (item: DealItem) => {
    const empRecord = employees.find(e => e.employee_id === item.empId);
    const database_emp_id = empRecord?.id || null;

    const { error } = await supabase
      .from('clients')
      .insert([{
        name: item.company,
        company: item.company,
        company_name: item.company,
        lead_name: item.leadName,
        contact_person: item.leadName, // Added to fix not-null constraint
        lead_phone: item.leadPhone,
        value: item.value,
        emp_id: database_emp_id,
        status: 'Active',
        email: item.email,
        gstin: item.gstin,
        pan: item.pan,
        address: item.address,
        tier: item.priority === 'Critical' ? 'Strategic' : item.priority === 'High' ? 'Key Account' : 'Standard',
        from_pipeline: true,
        converted_at: new Date().toISOString()
      }]);

    if (error) {
      showToast(`Conversion failed: ${error.message}`, "error");
      return;
    }

    await supabase.from('leads').delete().eq('id', item.id);
    fetchLeads(); // Force instant refresh
    setNotification(`${item.company} successfully converted to Client Registry`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRename = (item: DealItem) => {
    setEditingId(item.id);
    setEditValues({ ...item });
  };

  const saveEdit = async () => {
    if (!editingId || !editValues) return;
    
    // Find UUID for employee
    const empRecord = employees.find(e => e.employee_id === editValues.empId);
    const database_emp_id = empRecord?.id || null;

    const { error } = await supabase
      .from('leads')
      .update({
        company: editValues.company,
        name: editValues.company,
        value: editValues.value,
        lead_name: editValues.leadName,
        lead_phone: editValues.leadPhone,
        priority: editValues.priority,
        email: editValues.email,
        gstin: editValues.gstin,
        pan: editValues.pan,
        address: editValues.address,
        emp_id: database_emp_id,
        emp_name: editValues.empName
      })
      .eq('id', editingId);

    if (error) {
      console.error("Lead Update Error:", error);
      showToast(`Update failed: ${error.message}`, "error");
    } else {
      showToast("Lead details updated", "success");
      fetchLeads(); // Force instant refresh
      setEditingId(null);
      setEditValues(null);
    }
  };

  const handleDuplicate = async (item: DealItem, columnId: string) => {
    // Find UUID for employee
    const empRecord = employees.find(e => e.employee_id === item.empId || e.id === item.empId);
    const database_emp_id = empRecord?.id || null;

    const { error } = await supabase.from('leads').insert([{
      company: `${item.company} (Copy)`,
      name: `${item.company} (Copy)`,
      value: item.value,
      lead_name: item.leadName,
      lead_phone: item.leadPhone,
      email: item.email,
      gstin: item.gstin,
      pan: item.pan,
      stage: columnId,
      priority: item.priority,
      emp_id: database_emp_id,
      emp_name: item.empName
    }]);

    if (error) {
      showToast("Duplicate failed", "error");
    } else {
      showToast("Lead duplicated successfully", "success");
      fetchLeads(); // Force instant refresh
    }
  };

  const handleDelete = (itemId: string) => {
    setConfirmDialog({ isOpen: true, itemId });
  };

  const confirmDelete = async () => {
    if (!confirmDialog.itemId) return;
    const { error } = await supabase.from('leads').delete().eq('id', confirmDialog.itemId);
    if (error) {
      showToast("Delete failed", "error");
    } else {
      showToast("Lead deleted permanently", "success");
      fetchLeads();
    }
    setConfirmDialog({ isOpen: false, itemId: null });
  };

  const filteredData = useMemo(() => {
    if (!search) return data;
    const filteredCols: any = {};
    data.columnOrder.forEach((colId: string) => {
      const col = data.columns[colId];
      filteredCols[colId] = {
        ...col,
        items: col.items.filter((item: any) => 
          item.company.toLowerCase().includes(search.toLowerCase()) ||
          item.leadName.toLowerCase().includes(search.toLowerCase()) ||
          item.empName.toLowerCase().includes(search.toLowerCase()) ||
          item.empId.toLowerCase().includes(search.toLowerCase())
        )
      };
    });
    return { ...data, columns: filteredCols };
  }, [data, search]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    // 1. OPTIMISTIC UI UPDATE
    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    if (start === finish) {
      const newItems = Array.from(start.items);
      const [removed] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, removed);
      
      const newColumn = { ...start, items: newItems };
      setData((prev: any) => ({
        ...prev,
        columns: { ...prev.columns, [newColumn.id]: newColumn }
      }));
    } else {
      const startItems = Array.from(start.items);
      const [removed] = startItems.splice(source.index, 1);
      const newStart = { ...start, items: startItems };

      const finishItems = Array.from(finish.items);
      const [itemToMove] = (data.columns[source.droppableId].items as any[]).filter(i => i.id === draggableId);
      
      // Update the item's local stage
      const updatedItem = { ...itemToMove, stage: finish.id };
      finishItems.splice(destination.index, 0, updatedItem);
      const newFinish = { ...finish, items: finishItems };

      setData((prev: any) => ({
        ...prev,
        columns: {
          ...prev.columns,
          [newStart.id]: newStart,
          [newFinish.id]: newFinish
        }
      }));

      // 2. DATABASE SYNC
      const { error } = await supabase
        .from('leads')
        .update({ stage: finish.id })
        .eq('id', draggableId);
      
      if (error) {
        showToast("Database Sync failed", "error");
        fetchLeads(); // Revert to server state
      }
    }
  };

  if (!isReady) return null;

  return (
    <DashboardShell title="Sales Pipeline Tracking" subtitle="Enterprise Administration: Synchronized attribution with dynamic stage management">
      <div className="flex flex-col h-full font-sans bg-[#fbfbfa] -m-8 p-8 relative">
        
        {/* Custom Confirmation Dialog */}
        <ConfirmDialog 
          isOpen={confirmDialog.isOpen} 
          title="Security Check: Permanent Deletion" 
          message="Are you sure you want to remove this lead? This action is permanent and cannot be reversed." 
          onCancel={() => setConfirmDialog({ isOpen: false, itemId: null })} 
          onConfirm={confirmDelete} 
        />
        {/* Premium Notification */}
        {notification && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 border border-white/20 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check size={12} strokeWidth={4} /></div>
             <span className="text-[11px] font-black uppercase tracking-widest">{notification}</span>
          </div>
        )}

        {/* Top Navigation */}
        <div className="flex items-center gap-1 border-b border-black/5 mb-6">
          <button onClick={() => setView('board')} className={cn("flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all font-bold", view === 'board' ? "border-b-2 border-black text-black" : "text-black/40 hover:bg-black/5")}>
            <LayoutGrid size={16} /> Lead Pipeline
          </button>
          <button onClick={() => setView('database')} className={cn("flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all font-bold", view === 'database' ? "border-b-2 border-black text-black" : "text-black/40 hover:bg-black/5")}>
            <Database size={16} /> Database view
          </button>
          <div className="flex-grow" />
          <div className="flex items-center gap-4">
             <div className="relative group w-48">
                <SearchIcon size={14} className="absolute left-1 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
                <input type="text" placeholder="Filter attribution..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent pl-6 pr-2 py-1 text-xs font-bold text-black outline-none border-b border-transparent focus:border-black/10 transition-all placeholder:text-black/20" />
             </div>
             {view === 'board' && (
               <button onClick={startInlineStage} className="flex items-center gap-2 rounded bg-black text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 shadow-md transition-all animate-in fade-in duration-300"><Plus size={14} /> New Stage</button>
             )}
          </div>
        </div>

        {view === 'board' ? (
          <div ref={scrollContainerRef} className="flex gap-4 pb-12 flex-grow items-start">
            <DragDropContext onDragEnd={onDragEnd}>
              {filteredData.columnOrder.map((columnId: string) => {
                const column = filteredData.columns[columnId];
                const columnTotal = column.items.reduce((sum: number, item: any) => sum + item.value, 0);

                return (
                  <div key={column.id} className="flex-shrink-0 w-72 flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1 group/header">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3.5 h-3.5 rounded-sm shadow-sm", column.color)} />
                        <h4 className="text-sm font-semibold text-black/70">{column.title}</h4>
                        <span className="text-xs font-medium text-black/30 ml-1">{column.items.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-black/30 opacity-0 group-hover/header:opacity-100 transition-opacity">{formatRupee(columnTotal)}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                           <button onClick={() => startInlineAdd(column.id)} className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black"><Plus size={14} /></button>
                           <ActionMenu align="end" onDelete={() => handleDeleteColumn(column.id)} deleteLabel="Delete Stage">
                              <button className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black"><MoreHorizontal size={14} /></button>
                           </ActionMenu>
                        </div>
                      </div>
                    </div>

                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className={cn("flex flex-col gap-2 min-h-[100px] transition-colors rounded-lg", snapshot.isDraggingOver ? "bg-black/5" : "bg-transparent")}>
                          {column.items.map((item: DealItem, index: number) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={cn("group p-3 bg-white border border-black/10 rounded-lg shadow-sm hover:shadow-md transition-all relative", snapshot.isDragging && "shadow-xl ring-1 ring-black/5", editingId === item.id && "ring-2 ring-black")}>
                                  {editingId !== item.id && (
                                    <ActionMenu align="end" onConvert={() => handleConvertToClient(item)} onRename={() => handleRename(item)} onDuplicate={() => handleDuplicate(item, column.id)} onDelete={() => handleDelete(item.id)}>
                                      <button className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded text-black/20 hover:text-black opacity-0 group-hover:opacity-100 z-10"><MoreVertical size={14} /></button>
                                    </ActionMenu>
                                  )}
                                  <div className="flex items-start gap-2 mb-2 pr-6">
                                    <FileText size={14} className="text-black/30 mt-0.5" />
                                    {editingId === item.id ? (
                                      <input autoFocus value={editValues.company} onChange={(e) => setEditValues({ ...editValues, company: e.target.value })} className="w-full text-[13px] font-bold text-black outline-none border-b border-black/20" />
                                    ) : (
                                      <h5 className="text-[13px] font-bold text-black leading-snug">{item.company}</h5>
                                    )}
                                  </div>
                                  <div className="space-y-3 pl-5 mt-1 border-l-2 border-black/[0.03]">
                                    {editingId === item.id ? (
                                      <div className="space-y-3">
                                        <div className="space-y-2">
                                           <div className="flex items-center gap-2"><span className="text-[10px] uppercase font-black text-black/30 w-16">Value</span><input type="number" value={editValues.value} onChange={(e) => setEditValues({ ...editValues, value: Number(e.target.value) })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 flex-grow" /></div>
                                           <div className="flex items-center gap-2"><span className="text-[10px] uppercase font-black text-black/30 w-16">Contact</span><input value={editValues.leadName} onChange={(e) => setEditValues({ ...editValues, leadName: e.target.value })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 flex-grow" /></div>
                                           <div className="flex items-center gap-2"><span className="text-[10px] uppercase font-black text-black/30 w-16">Phone</span><input value={editValues.leadPhone} onChange={(e) => setEditValues({ ...editValues, leadPhone: e.target.value })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 flex-grow" /></div>
                                           <div className="flex items-center gap-2"><span className="text-[10px] uppercase font-black text-black/30 w-16">Email</span><input value={editValues.email} onChange={(e) => setEditValues({ ...editValues, email: e.target.value })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 flex-grow" /></div>
                                           <div className="flex items-center gap-2">
                                             <span className="text-[10px] uppercase font-black text-black/30 w-16">GSTIN</span>
                                             <div className="relative flex-grow">
                                               <input 
                                                 value={editValues.gstin} 
                                                 onChange={(e) => {
                                                   const v = e.target.value.toUpperCase();
                                                   setEditValues({ ...editValues, gstin: v, pan: extractPANFromGSTIN(v) || editValues.pan });
                                                 }} 
                                                 className={cn("bg-transparent text-[11px] font-bold outline-none border-b w-full uppercase", 
                                                   editValues.gstin && !validateGSTIN(editValues.gstin) ? "border-rose-500" : "border-black/10"
                                                 )} 
                                               />
                                               {editValues.gstin && !validateGSTIN(editValues.gstin) && <AlertTriangle size={10} className="absolute right-0 top-1 text-rose-500" />}
                                             </div>
                                           </div>
                                           <div className="flex items-center gap-2"><span className="text-[10px] uppercase font-black text-black/30 w-16">PAN</span><input value={editValues.pan} onChange={(e) => setEditValues({ ...editValues, pan: e.target.value.toUpperCase() })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 flex-grow uppercase" /></div>
                                           <div className="flex items-center gap-2"><span className="text-[10px] uppercase font-black text-black/30 w-16">Address</span><input placeholder="Billing Address" value={editValues.address} onChange={(e) => setEditValues({ ...editValues, address: e.target.value })} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 flex-grow" /></div>
                                           <div className="flex items-center gap-2 pt-1"><span className="text-[10px] uppercase font-black text-black/30 w-16">Priority</span><CustomSelect value={editValues.priority} onChange={(v: string) => handlePriorityChange(v, true)} placeholder="Rank" options={[{value: 'Medium', label: 'Medium Rank'}, {value: 'High', label: 'High Rank'}, {value: 'Critical', label: 'Critical Rank'}]} /></div>
                                           <div className="flex items-center gap-2 pt-1"><span className="text-[10px] uppercase font-black text-black/30 w-16">Assign</span><div className="flex flex-col gap-1 flex-grow"><CustomSelect value={editValues.empId} onChange={(v: string) => handleEmpIdChange(v, true)} placeholder="Select ID" options={employees.map(e => ({ value: e.employee_id, label: e.name }))} /></div></div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1"><button onClick={saveEdit} className="px-2 py-1 bg-black text-white text-[10px] font-black rounded flex items-center gap-1"><Check size={10} /> Save</button><button onClick={() => setEditingId(null)} className="px-2 py-1 text-black/40 text-[10px] font-black hover:text-black">Cancel</button></div>
                                      </div>
                                    ) : (
                                      <>
                                        <div><p className="text-[12px] font-bold text-black/80">{formatRupee(item.value)}</p></div>
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 text-[11px] font-bold text-black/50"><User size={10} className="text-black/30" /> <span>{item.leadName}</span></div>
                                          <div className="flex items-center gap-2 text-[11px] font-bold text-black/50"><Phone size={10} className="text-black/30" /> <span>{item.leadPhone}</span></div>
                                        </div>
                                        <div className="pt-2 border-t border-black/5 mt-2 flex items-center justify-between">
                                          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-[8px] font-black text-black/40 border border-black/5">{String(item.empName)[0]}</div><EmployeeDisplay empId={item.empId} empName={item.empName} employees={employees} /></div>
                                          <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shadow-sm", item.priorityColor)}>{item.priority}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {/* INLINE GHOST Card IN COLUMN */}
                          {addingToColumn === column.id ? (
                            <div className="p-4 bg-white border-2 border-black rounded-lg space-y-3 animate-in fade-in duration-300 shadow-xl shadow-black/5">
                               <input autoFocus placeholder="Company Name" value={inlineForm.company} onChange={(e) => setInlineForm({...inlineForm, company: e.target.value})} className="w-full text-[13px] font-bold border-b-2 border-black/5 focus:border-black outline-none pb-1 transition-all placeholder:text-black/20" />
                               <div className="space-y-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-black/30 uppercase w-12">Value</span>
                                    <div className="relative flex-grow flex items-center gap-2">
                                      <div className="relative flex-grow">
                                        <span className="absolute left-0 text-[10px] font-bold text-black/30 top-1/2 -translate-y-1/2">₹</span>
                                        <input type="number" placeholder="Enter Amount" value={inlineForm.value || ""} onChange={(e) => setInlineForm({...inlineForm, value: Number(e.target.value)})} className="w-full pl-3 text-[10px] font-bold border-b border-black/5 outline-none" />
                                      </div>
                                      {inlineForm.value > 0 && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded animate-in fade-in zoom-in duration-300">({numberToIndianWords(inlineForm.value)})</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12">Contact</span><input placeholder="Person Name" value={inlineForm.leadName} onChange={(e) => setInlineForm({...inlineForm, leadName: e.target.value})} className="w-full text-[10px] font-bold border-b border-black/5 outline-none" /></div>
                                  <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12">Phone</span><input placeholder="+91 ..." value={inlineForm.leadPhone} onChange={(e) => setInlineForm({...inlineForm, leadPhone: validatePhone(e.target.value)})} className="w-full text-[10px] font-bold border-b border-black/5 outline-none" /></div>
                                  <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12">Email</span><input placeholder="mail@example.com" value={inlineForm.email} onChange={(e) => setInlineForm({...inlineForm, email: e.target.value})} className="w-full text-[10px] font-bold border-b border-black/5 outline-none" /></div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-black/30 uppercase w-12">GSTIN</span>
                                    <div className="relative flex-grow">
                                      <input 
                                        placeholder="27AAAAA0000A1Z5" 
                                        value={inlineForm.gstin} 
                                        onChange={(e) => {
                                          const v = e.target.value.toUpperCase();
                                          setInlineForm({...inlineForm, gstin: v, pan: extractPANFromGSTIN(v) || inlineForm.pan});
                                        }} 
                                        className={cn("w-full text-[10px] font-bold border-b outline-none uppercase", 
                                          inlineForm.gstin && !validateGSTIN(inlineForm.gstin) ? "border-rose-500" : "border-black/5"
                                        )} 
                                      />
                                      {inlineForm.gstin && !validateGSTIN(inlineForm.gstin) && <AlertTriangle size={10} className="absolute right-0 top-1 text-rose-500" />}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12">PAN</span><input placeholder="ABCDE1234F" value={inlineForm.pan} onChange={(e) => setInlineForm({...inlineForm, pan: e.target.value.toUpperCase()})} className="w-full text-[10px] font-bold border-b border-black/5 outline-none uppercase" /></div>
                                   <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12">Address</span><input placeholder="Billing Address" value={inlineForm.address} onChange={(e) => setInlineForm({...inlineForm, address: e.target.value})} className="w-full text-[10px] font-bold border-b border-black/5 outline-none" /></div>
                                  <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12 font-black">Rank</span><CustomSelect value={inlineForm.priority} onChange={(v: string) => handlePriorityChange(v)} placeholder="Rank" options={[{value: 'Medium', label: 'Medium Rank'}, {value: 'High', label: 'High Rank'}, {value: 'Critical', label: 'Critical Rank'}]} /></div>
                                  <div className="pt-1">
                                     <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-black/30 uppercase w-12">Assign</span>
                                        <CustomSelect 
                                          value={inlineForm.empId} 
                                          onChange={(v: string) => handleEmpIdChange(v)} 
                                          placeholder="Select ID" 
                                          options={employees.map(e => ({ value: e.employee_id, label: e.name }))} 
                                        />
                                     </div>
                                  </div>
                               </div>
                               <div className="flex items-center gap-3 pt-2 border-t border-black/5">
                                 <button onClick={saveInlineAdd} className="bg-black text-white text-[10px] font-black uppercase px-4 py-2 rounded shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"><Check size={12} /> Save</button>
                                 <button onClick={cancelInlineAdd} className="text-black/40 text-[10px] font-black uppercase hover:text-black transition-colors">Cancel</button>
                               </div>
                            </div>
                          ) : (
                            <button onClick={() => startInlineAdd(column.id)} className="flex items-center gap-2 px-2 py-1.5 mt-1 text-black/40 hover:bg-black/5 rounded-md transition-all group font-bold text-[11px]"><Plus size={14} /> New</button>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </DragDropContext>
            
            {/* INLINE STAGE GHOST */}
            {isAddingStage ? (
              <div className="flex-shrink-0 w-72 p-4 bg-white border-2 border-black rounded-lg animate-in fade-in slide-in-from-right-4 duration-300 shadow-xl shadow-black/5">
                 <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-3">Add New Stage</p>
                 <input autoFocus placeholder="Stage Name (e.g. Legal)" value={newColumnForm.title} onChange={(e) => setNewColumnForm({...newColumnForm, title: e.target.value})} className="w-full text-sm font-bold border-b-2 border-black/10 focus:border-black outline-none pb-2 transition-all mb-4" />
                 
                 <p className="text-[8px] font-black text-black/40 uppercase mb-2">Stage Atmosphere</p>
                 <div className="flex flex-wrap gap-2.5 mb-6">
                    {STAGE_COLORS.map(color => (
                       <button key={color.c} onClick={() => setNewColumnForm({...newColumnForm, color: color.c, pillBg: color.b, pillText: color.t})} className={cn("w-5 h-5 rounded-full border-2 transition-all hover:scale-110 shadow-sm", color.c, newColumnForm.color === color.c ? "border-black scale-110 ring-2 ring-black/5" : "border-transparent opacity-60 hover:opacity-100")} />
                    ))}
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button onClick={saveInlineStage} className="bg-black text-white text-[10px] font-black uppercase px-4 py-2 rounded flex-grow active:scale-95 transition-all shadow-md">Add Stage</button>
                    <button onClick={() => setIsAddingStage(false)} className="bg-black/5 text-black/40 text-[10px] font-black uppercase px-4 py-2 rounded hover:bg-black/10 transition-colors">X</button>
                 </div>
              </div>
            ) : (
              <button onClick={startInlineStage} className="flex-shrink-0 w-72 h-10 border border-dashed border-black/10 rounded-lg flex items-center justify-center gap-2 text-black/30 hover:bg-black/5 hover:text-black transition-all group font-black uppercase text-[10px] tracking-widest"><Plus size={16} /> Add New Stage</button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-black/10 rounded-lg flex-grow overflow-auto scrollbar-hide">
             <table className="w-full text-left border-collapse min-w-[1300px]">
                <thead><tr className="border-b-2 border-black/5"><th className="px-4 py-3 text-xs font-black text-black/30 w-12 border-r border-black/5"></th>{['Deal/Company', 'Status', 'Value', 'Company Contact Person', 'Phone', 'Email', 'GSTIN', 'PAN', 'Address', 'Assigned Employee (ID)', 'Priority', 'Date'].map(header => (<th key={header} className="px-4 py-3 text-xs font-black text-black/30 border-r border-black/5 hover:bg-black/5 cursor-pointer group transition-colors"><div className="flex items-center justify-between">{header} <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div></th>))}</tr></thead>
                <tbody>
                   {data.columnOrder.flatMap((colId: string) => data.columns[colId].items.map((item: any) => ({ ...item, column: data.columns[colId], colId }))).map((deal: any) => (
                      <tr key={deal.id} className={cn("border-b border-black/5 transition-colors group", editingId === deal.id ? "bg-black/[0.04]" : "hover:bg-black/[0.01]")}>
                         <td className="px-4 py-3 border-r border-black/5 text-center">{editingId === deal.id ? (<div className="flex gap-1"><button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button><button onClick={() => setEditingId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><X size={14} /></button></div>) : (<ActionMenu align="start" onConvert={() => handleConvertToClient(deal)} onRename={() => handleRename(deal)} onDuplicate={() => handleDuplicate(deal, deal.colId)} onDelete={() => handleDelete(deal.id)}><button className="opacity-10 group-hover:opacity-100 hover:bg-black/5 p-1 rounded transition-all"><MoreVertical size={14} /></button></ActionMenu>)}</td>
                         <td className="px-4 py-3 border-r border-black/5"><div className="flex items-center gap-2"><FileText size={14} className="text-black/30" />{editingId === deal.id ? (<input className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.company} onChange={(e) => setEditValues({ ...editValues, company: e.target.value })} />) : (<span className="text-[13px] font-bold text-black">{deal.company}</span>)}</div></td>
                         <td className="px-4 py-3 border-r border-black/5"><span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight shadow-sm", deal.column.pillBg, deal.column.pillText)}>{deal.column.title}</span></td>
                         <td className="px-4 py-3 border-r border-black/5 text-[13px] font-bold text-black/80">{editingId === deal.id ? (<input type="number" className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.value} onChange={(e) => setEditValues({ ...editValues, value: Number(e.target.value) })} />) : formatRupee(deal.value)}</td>
                         <td className="px-4 py-3 border-r border-black/5">{editingId === deal.id ? (<input className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.leadName} onChange={(e) => setEditValues({ ...editValues, leadName: e.target.value })} />) : (<span className="text-[12px] font-bold text-black/60">{deal.leadName}</span>)}</td>
                         <td className="px-4 py-3 border-r border-black/5">{editingId === deal.id ? (<input className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.leadPhone} onChange={(e) => setEditValues({ ...editValues, leadPhone: e.target.value })} />) : (<span className="text-[12px] font-bold text-black/60">{deal.leadPhone}</span>)}</td>
                         <td className="px-4 py-3 border-r border-black/5">{editingId === deal.id ? (<input className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.email || ""} onChange={(e) => setEditValues({ ...editValues, email: e.target.value })} />) : (<span className="text-[12px] font-bold text-black/60">{deal.email || "—"}</span>)}</td>
                         <td className="px-4 py-3 border-r border-black/5">
                            {editingId === deal.id ? (
                              <div className="relative">
                                <input className={cn("bg-transparent text-[13px] font-bold text-black outline-none w-full border-b uppercase", editValues.gstin && !validateGSTIN(editValues.gstin) ? "border-rose-500" : "border-black/20")} value={editValues.gstin || ""} onChange={(e) => {
                                  const v = e.target.value.toUpperCase();
                                  setEditValues({ ...editValues, gstin: v, pan: extractPANFromGSTIN(v) || editValues.pan });
                                }} />
                                {editValues.gstin && !validateGSTIN(editValues.gstin) && <AlertTriangle size={10} className="absolute right-0 top-1 text-rose-500" />}
                              </div>
                            ) : (<span className="text-[12px] font-bold text-black/60">{deal.gstin || "—"}</span>)}
                         </td>
                         <td className="px-4 py-3 border-r border-black/5">{editingId === deal.id ? (<input className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20 uppercase" value={editValues.pan || ""} onChange={(e) => setEditValues({ ...editValues, pan: e.target.value.toUpperCase() })} />) : (<span className="text-[12px] font-bold text-black/60">{deal.pan || "—"}</span>)}</td>
                          <td className="px-4 py-3 border-r border-black/5">{editingId === deal.id ? (<input className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.address || ""} onChange={(e) => setEditValues({ ...editValues, address: e.target.value })} />) : (<span className="text-[12px] font-bold text-black/60">{deal.address || "—"}</span>)}</td>
                         <td className="px-4 py-3 border-r border-black/5"><div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-black/50 border border-black/5 flex-shrink-0">{deal.empName[0]}</div>{editingId === deal.id ? (<div className="flex flex-col gap-1 w-full"><CustomSelect value={editValues.empId} onChange={(v: string) => handleEmpIdChange(v, true)} placeholder="ID" options={employees.map(e => ({ value: e.employee_id, label: `${e.name} (${e.employee_id})` }))} /></div>) : (<EmployeeDisplay empId={deal.empId} empName={deal.empName} employees={employees} />)}</div></td>
                         <td className="px-4 py-3 border-r border-black/5">{editingId === deal.id ? (<CustomSelect value={editValues.priority} onChange={(v: string) => handlePriorityChange(v, true)} placeholder="Rank" options={[{value: 'Medium', label: 'Medium Rank'}, {value: 'High', label: 'High Rank'}, {value: 'Critical', label: 'Critical Rank'}]} />) : (<span className={cn("px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap uppercase tracking-tighter shadow-sm", deal.priorityColor)}>{deal.priority}</span>)}</td>
                         <td className="px-4 py-3 text-[12px] font-bold text-black/40 whitespace-nowrap">{deal.date}</td>
                      </tr>
                   ))}
                   
                   {/* INLINE GHOST ROW IN TABLE */}
                   {addingToTable ? (
                      <tr className="bg-black/[0.05] ring-2 ring-black ring-inset">
                         <td className="px-4 py-3 border-r border-black/5 text-center"><div className="flex flex-col gap-1"><button onClick={saveInlineAdd} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button><button onClick={cancelInlineAdd} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><X size={14} /></button></div></td>
                         <td className="px-4 py-3 border-r border-black/5"><input autoFocus placeholder="Company Name" value={inlineForm.company} onChange={(e) => setInlineForm({...inlineForm, company: e.target.value})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/20 w-full" /></td>
                         <td className="px-4 py-3 border-r border-black/5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-black text-white uppercase animate-pulse">Assigning..</span></td>
                         <td className="px-4 py-3 border-r border-black/5">
                            <div className="flex flex-col gap-1">
                                <div className="relative">
                                    <span className="absolute left-0 text-xs font-bold text-black/30">₹</span>
                                    <input type="number" placeholder="Value" value={inlineForm.value || ""} onChange={(e) => setInlineForm({...inlineForm, value: Number(e.target.value)})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/20 w-full pl-3" />
                                </div>
                                {inlineForm.value > 0 && <span className="text-[9px] font-black text-emerald-600 self-start">{numberToIndianWords(inlineForm.value)}</span>}
                            </div>
                         </td>
                         <td className="px-4 py-3 border-r border-black/5"><input placeholder="Contact Person" value={inlineForm.leadName} onChange={(e) => setInlineForm({...inlineForm, leadName: e.target.value})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/10 w-full" /></td>
                         <td className="px-4 py-3 border-r border-black/5"><input placeholder="Phone" value={inlineForm.leadPhone} onChange={(e) => setInlineForm({...inlineForm, leadPhone: validatePhone(e.target.value)})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/10 w-full" /></td>
                         <td className="px-4 py-3 border-r border-black/5"><input placeholder="Email" value={inlineForm.email} onChange={(e) => setInlineForm({...inlineForm, email: e.target.value})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/10 w-full" /></td>
                         <td className="px-4 py-3 border-r border-black/5">
                            <div className="relative">
                               <input placeholder="GSTIN" value={inlineForm.gstin} onChange={(e) => {
                                 const v = e.target.value.toUpperCase();
                                 setInlineForm({...inlineForm, gstin: v, pan: extractPANFromGSTIN(v) || inlineForm.pan});
                               }} className={cn("bg-transparent text-[13px] font-bold outline-none border-b w-full uppercase", inlineForm.gstin && !validateGSTIN(inlineForm.gstin) ? "border-rose-500" : "border-black/10")} />
                               {inlineForm.gstin && !validateGSTIN(inlineForm.gstin) && <AlertTriangle size={10} className="absolute right-0 top-1 text-rose-500" />}
                            </div>
                         </td>
                         <td className="px-4 py-3 border-r border-black/5"><input placeholder="PAN" value={inlineForm.pan} onChange={(e) => setInlineForm({...inlineForm, pan: e.target.value.toUpperCase()})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/10 w-full uppercase" /></td>
                          <td className="px-4 py-3 border-r border-black/5"><input placeholder="Address" value={inlineForm.address} onChange={(e) => setInlineForm({...inlineForm, address: e.target.value})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/10 w-full" /></td>
                         <td className="px-4 py-3 border-r border-black/5"><div className="flex flex-col gap-1"><CustomSelect value={inlineForm.empId} onChange={(v: string) => handleEmpIdChange(v)} placeholder="Select ID" options={employees.map(e => ({ value: e.employee_id, label: e.name }))} /></div></td>
                         <td className="px-4 py-3 border-r border-black/5"><CustomSelect value={inlineForm.priority} onChange={(v: string) => handlePriorityChange(v)} placeholder="Rank" options={[{value: 'Medium', label: 'Medium Rank'}, {value: 'High', label: 'High Rank'}, {value: 'Critical', label: 'Critical Rank'}]} /></td>
                         <td className="px-4 py-3 text-[10px] text-black/30 font-bold uppercase italic animate-pulse">Draft Mode</td>
                      </tr>
                   ) : (
                      <tr onClick={() => startInlineAdd()} className="hover:bg-black/[0.02] transition-colors group cursor-pointer text-black/30 hover:text-black">
                         <td className="px-4 py-3 border-r border-black/5 text-center"></td>
                         <td colSpan={8} className="px-4 py-3 text-sm font-bold flex items-center gap-2 font-black uppercase tracking-widest"><Plus size={14} /> Add New Lead</td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </DashboardShell>
  );
}
