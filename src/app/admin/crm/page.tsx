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
  UserCheck
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
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

// Employee Master Data
const EMPLOYEES = [
  { id: "EMP-402", name: "Vijay Kumar" },
  { id: "EMP-215", name: "Ananya Sharma" },
  { id: "EMP-108", name: "Rohan Das" },
  { id: "EMP-612", name: "Siddharth Malhotra" },
  { id: "EMP-901", name: "Priya Singh" },
];

// Initial data
const INITIAL_DATA = {
  columns: {
    "NEW": {
      id: "NEW", title: "New", color: "bg-emerald-500", pillBg: "bg-emerald-100", pillText: "text-emerald-700",
      items: [
        { id: "deal-1", company: "Zomato India", value: 1250000, priority: "High", priorityColor: "bg-purple-100 text-purple-700", leadName: "Rahul Jakhar", leadPhone: "+91 98765 43210", empName: "Vijay Kumar", empId: "EMP-402", date: "Apr 05, 2026" },
        { id: "deal-2", company: "Rivian Automotive", value: 4500000, priority: "Critical", priorityColor: "bg-rose-100 text-rose-700", leadName: "Sarah Miller", leadPhone: "+1 (555) 012-3456", empName: "Ananya Sharma", empId: "EMP-215", date: "Apr 08, 2026" },
      ]
    },
    "DISCOVERY": {
      id: "DISCOVERY", title: "Discovery", color: "bg-rose-500", pillBg: "bg-rose-100", pillText: "text-rose-700",
      items: [
        { id: "deal-3", company: "Paytm Payments", value: 850000, priority: "Medium", priorityColor: "bg-blue-100 text-blue-700", leadName: "Vivek Gupta", leadPhone: "+91 88888 77777", empName: "Rohan Das", empId: "EMP-108", date: "Mar 28, 2026" },
      ]
    },
    "NEGOTIATION": {
      id: "NEGOTIATION", title: "Negotiation", color: "bg-amber-500", pillBg: "bg-amber-100", pillText: "text-amber-700",
      items: [
        { id: "deal-4", company: "BYJU'S Learning", value: 3200000, priority: "High", priorityColor: "bg-purple-100 text-purple-700", leadName: "Sneha Roy", leadPhone: "+91 91234 56789", empName: "Vijay Kumar", empId: "EMP-402", date: "Apr 01, 2026" },
        { id: "deal-5", company: "Ola Electric", value: 950000, priority: "Medium", priorityColor: "bg-blue-100 text-blue-700", leadName: "Bhavish Aggarwal", leadPhone: "+91 90000 11111", empName: "Siddharth Malhotra", empId: "EMP-612", date: "Apr 04, 2026" },
      ]
    },
    "WON": {
      id: "WON", title: "Won", color: "bg-blue-500", pillBg: "bg-blue-100", pillText: "text-blue-700",
      items: [
        { id: "deal-6", company: "Tesla Energy", value: 45000000, priority: "Critical", priorityColor: "bg-rose-100 text-rose-700", leadName: "Elon Musk", leadPhone: "+1 (702) 555-0199", empName: "Ananya Sharma", empId: "EMP-215", date: "Apr 07, 2026" },
      ]
    },
    "LOST": {
      id: "LOST", title: "Lost", color: "bg-slate-500", pillBg: "bg-slate-100", pillText: "text-slate-700",
      items: [
        { id: "deal-7", company: "Swiggy Limited", value: 1500000, priority: "High", priorityColor: "bg-purple-100 text-purple-700", leadName: "Harsha Majety", leadPhone: "+91 99000 00000", empName: "Vijay Kumar", empId: "EMP-402", date: "Mar 15, 2026" },
      ]
    }
  },
  columnOrder: ["NEW", "DISCOVERY", "NEGOTIATION", "WON", "LOST"]
};

interface DealItem {
  id: string;
  company: string;
  value: number;
  priority: string;
  priorityColor: string;
  leadName: string;
  leadPhone: string;
  empName: string;
  empId: string;
  date: string;
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

export default function CRMPipelinePage() {
  const { addConvertedClient } = useCRMStore();
  const [data, setData] = useState<any>(INITIAL_DATA);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<'board' | 'database'>('board');
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Inline States
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [addingToTable, setAddingToTable] = useState(false);
  const [isAddingStage, setIsAddingStage] = useState(false);
  
  const [inlineForm, setInlineForm] = useState({
    company: "",
    value: 0,
    leadName: "",
    leadPhone: "",
    empId: "",
    empName: "",
    priority: "Medium",
    priorityColor: "bg-blue-100 text-blue-700"
  });

  const [newColumnForm, setNewColumnForm] = useState({
    title: "",
    color: STAGE_COLORS[9].c, // Slate default
    pillBg: STAGE_COLORS[9].b,
    pillText: STAGE_COLORS[9].t
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const startInlineAdd = (columnId: string | null = null) => {
    setAddingToColumn(columnId);
    setAddingToTable(columnId === null && view === 'database');
    setInlineForm({ company: "", value: 0, leadName: "", leadPhone: "", empId: "", empName: "", priority: "Medium", priorityColor: "bg-blue-100 text-blue-700" });
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

  const saveInlineAdd = () => {
    if (!inlineForm.company) return;
    const colId = addingToColumn || "NEW";
    const newItem: DealItem = {
      ...inlineForm,
      id: `deal-${Date.now()}`,
      date: new Date().toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })
    };
    const newData = { ...data };
    newData.columns[colId].items.push(newItem);
    setData(newData);
    cancelInlineAdd();
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
    const emp = EMPLOYEES.find(e => e.id === empId);
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

  const handleConvertToClient = (item: DealItem) => {
    // Remove from pipeline
    const newData = { ...data };
    Object.keys(newData.columns).forEach(colId => {
      const col = newData.columns[colId];
      col.items = col.items.filter((i: any) => i.id !== item.id);
    });
    setData(newData);

    // Add to shared CRM store → appears live in Client Registry
    addConvertedClient({
      id: `CL-${Date.now()}`,
      company: item.company,
      value: item.value,
      leadName: item.leadName,
      leadPhone: item.leadPhone,
      empName: item.empName,
      empId: item.empId,
      convertedDate: new Date().toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }),
      status: "Active",
      tier: item.priority === 'Critical' ? 'Strategic' : item.priority === 'High' ? 'Key Account' : 'Standard',
      fromPipeline: true,
    });

    // Show premium notification
    setNotification(`${item.company} successfully converted to Client Registry`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRename = (item: DealItem) => {
    setEditingId(item.id);
    setEditValues({ ...item });
  };

  const saveEdit = () => {
    if (!editingId || !editValues) return;
    const newData = { ...data };
    Object.keys(newData.columns).forEach(colId => {
      const col = newData.columns[colId];
      const index = col.items.findIndex((i: any) => i.id === editingId);
      if (index !== -1) col.items[index] = { ...editValues };
    });
    setData(newData);
    setEditingId(null);
    setEditValues(null);
  };

  const handleDuplicate = (item: DealItem, columnId: string) => {
    const newItem = { ...item, id: `deal-${Date.now()}`, company: `${item.company} (Copy)` };
    const newData = { ...data };
    newData.columns[columnId].items.push(newItem);
    setData(newData);
  };

  const handleDelete = (itemId: string) => {
    const newData = { ...data };
    Object.keys(newData.columns).forEach(colId => {
      const col = newData.columns[colId];
      col.items = col.items.filter((i: any) => i.id !== itemId);
    });
    setData(newData);
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

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];
    if (start === finish) {
      const newItems = Array.from(start.items);
      const [removed] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, removed);
      setData({ ...data, columns: { ...data.columns, [start.id]: { ...start, items: newItems } } });
      return;
    }
    const startItems = Array.from(start.items);
    const [removed] = startItems.splice(source.index, 1);
    const finishItems = Array.from(finish.items);
    finishItems.splice(destination.index, 0, removed);
    setData({
      ...data,
      columns: { 
        ...data.columns, 
        [start.id]: { ...start, items: startItems },
        [finish.id]: { ...finish, items: finishItems }
      }
    });
  };

  if (!isReady) return null;

  const totalValue = data.columnOrder.reduce((sum: number, colId: string) => 
    sum + data.columns[colId].items.reduce((s: number, i: any) => s + i.value, 0), 0
  );

  return (
    <DashboardShell title="Sales Pipeline Tracking" subtitle="Enterprise Administration: Synchronized attribution with dynamic stage management">
      <div className="flex flex-col h-full font-sans bg-[#fbfbfa] -m-8 p-8 overflow-hidden relative">
        
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
          <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto pb-12 scrollbar-hide flex-grow items-start">
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
                                           <div className="flex items-center gap-2 pt-1"><span className="text-[10px] uppercase font-black text-black/30 w-16">Priority</span><select value={editValues.priority} onChange={(e) => handlePriorityChange(e.target.value, true)} className="bg-white text-[11px] font-bold border border-black/10 rounded outline-none w-full"><option>Medium</option><option>High</option><option>Critical</option></select></div>
                                           <div className="flex items-center gap-2 pt-1"><span className="text-[10px] uppercase font-black text-black/30 w-16">Assign</span><div className="flex flex-col gap-1 flex-grow"><select value={editValues.empId} onChange={(e) => handleEmpIdChange(e.target.value, true)} className="bg-white text-[11px] font-bold border border-black/10 rounded outline-none w-full">{EMPLOYEES.map(e => (<option key={e.id} value={e.id}>{e.id}</option>))}</select><p className="text-[9px] font-black text-black/40 uppercase">{editValues.empName}</p></div></div>
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
                                          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-[8px] font-black text-black/40 border border-black/5">{item.empName[0]}</div><span className="text-[10px] font-black text-black/60">{item.empName} <span className="text-black/50 font-bold">({item.empId})</span></span></div>
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
                                 <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12">Value</span><div className="relative flex-grow"><span className="absolute left-0 text-[10px] font-bold text-black/30">₹</span><input type="number" placeholder="Enter Amount" value={inlineForm.value || ""} onChange={(e) => setInlineForm({...inlineForm, value: Number(e.target.value)})} className="w-full pl-3 text-[10px] font-bold border-b border-black/5 outline-none" /></div></div>
                                 <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12">Contact</span><input placeholder="Person Name" value={inlineForm.leadName} onChange={(e) => setInlineForm({...inlineForm, leadName: e.target.value})} className="w-full text-[10px] font-bold border-b border-black/5 outline-none" /></div>
                                 <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12">Phone</span><input placeholder="+91 ..." value={inlineForm.leadPhone} onChange={(e) => setInlineForm({...inlineForm, leadPhone: e.target.value})} className="w-full text-[10px] font-bold border-b border-black/5 outline-none" /></div>
                                 <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12 font-black">Rank</span><select value={inlineForm.priority} onChange={(e) => handlePriorityChange(e.target.value)} className="text-[10px] font-black bg-[#fbfbfa] border border-black/10 rounded p-1 flex-grow cursor-pointer outline-none"><option>Medium</option><option>High</option><option>Critical</option></select></div>
                                 <div className="pt-1">
                                    <div className="flex items-center gap-2"><span className="text-[10px] font-black text-black/30 uppercase w-12">Assign</span><select value={inlineForm.empId} onChange={(e) => handleEmpIdChange(e.target.value)} className="text-[10px] border border-black/10 bg-[#fbfbfa] rounded outline-none p-1 flex-grow font-bold focus:border-black transition-all"><option value="">Select ID</option>{EMPLOYEES.map(e => (<option key={e.id} value={e.id}>{e.id}</option>))}</select></div>
                                    {inlineForm.empName && <p className="text-[9px] font-black text-black/40 uppercase mt-1 pl-14">{inlineForm.empName}</p>}
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
                <thead><tr className="border-b-2 border-black/5"><th className="px-4 py-3 text-xs font-black text-black/30 w-12 border-r border-black/5"></th>{['Deal/Company', 'Status', 'Value', 'Company Contact Person', 'Phone', 'Assigned Employee (ID)', 'Priority', 'Date'].map(header => (<th key={header} className="px-4 py-3 text-xs font-black text-black/30 border-r border-black/5 hover:bg-black/5 cursor-pointer group transition-colors"><div className="flex items-center justify-between">{header} <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div></th>))}</tr></thead>
                <tbody>
                   {data.columnOrder.flatMap((colId: string) => data.columns[colId].items.map((item: any) => ({ ...item, column: data.columns[colId], colId }))).map((deal: any) => (
                      <tr key={deal.id} className={cn("border-b border-black/5 transition-colors group", editingId === deal.id ? "bg-black/[0.04]" : "hover:bg-black/[0.01]")}>
                         <td className="px-4 py-3 border-r border-black/5 text-center">{editingId === deal.id ? (<div className="flex gap-1"><button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button><button onClick={() => setEditingId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><X size={14} /></button></div>) : (<ActionMenu align="start" onConvert={() => handleConvertToClient(deal)} onRename={() => handleRename(deal)} onDuplicate={() => handleDuplicate(deal, deal.colId)} onDelete={() => handleDelete(deal.id)}><button className="opacity-10 group-hover:opacity-100 hover:bg-black/5 p-1 rounded transition-all"><MoreVertical size={14} /></button></ActionMenu>)}</td>
                         <td className="px-4 py-3 border-r border-black/5"><div className="flex items-center gap-2"><FileText size={14} className="text-black/30" />{editingId === deal.id ? (<input className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.company} onChange={(e) => setEditValues({ ...editValues, company: e.target.value })} />) : (<span className="text-[13px] font-bold text-black">{deal.company}</span>)}</div></td>
                         <td className="px-4 py-3 border-r border-black/5"><span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight shadow-sm", deal.column.pillBg, deal.column.pillText)}>{deal.column.title}</span></td>
                         <td className="px-4 py-3 border-r border-black/5 text-[13px] font-bold text-black/80">{editingId === deal.id ? (<input type="number" className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.value} onChange={(e) => setEditValues({ ...editValues, value: Number(e.target.value) })} />) : formatRupee(deal.value)}</td>
                         <td className="px-4 py-3 border-r border-black/5">{editingId === deal.id ? (<input className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.leadName} onChange={(e) => setEditValues({ ...editValues, leadName: e.target.value })} />) : (<span className="text-[12px] font-bold text-black/60">{deal.leadName}</span>)}</td>
                         <td className="px-4 py-3 border-r border-black/5">{editingId === deal.id ? (<input className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-b border-black/20" value={editValues.leadPhone} onChange={(e) => setEditValues({ ...editValues, leadPhone: e.target.value })} />) : (<span className="text-[12px] font-bold text-black/60">{deal.leadPhone}</span>)}</td>
                         <td className="px-4 py-3 border-r border-black/5"><div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-black/50 border border-black/5 flex-shrink-0">{deal.empName[0]}</div>{editingId === deal.id ? (<div className="flex flex-col gap-1 w-full"><select value={editValues.empId} onChange={(e) => handleEmpIdChange(e.target.value, true)} className="bg-transparent text-[11px] font-bold text-black outline-none border-b border-black/10">{EMPLOYEES.map(e => (<option key={e.id} value={e.id}>{e.id}</option>))}</select><p className="text-[9px] font-black text-black/40">{editValues.empName}</p></div>) : (<div className="flex flex-col leading-none"><span className="text-[11px] font-bold text-black/70">{deal.empName}</span><span className="text-[10px] font-bold text-black/60 mt-1">{deal.empId}</span></div>)}</div></td>
                         <td className="px-4 py-3 border-r border-black/5">{editingId === deal.id ? (<select value={editValues.priority} onChange={(e) => handlePriorityChange(e.target.value, true)} className="bg-transparent text-[11px] font-bold text-black outline-none border-b border-black/10 w-full"><option>Medium</option><option>High</option><option>Critical</option></select>) : (<span className={cn("px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap uppercase tracking-tighter shadow-sm", deal.priorityColor)}>{deal.priority}</span>)}</td>
                         <td className="px-4 py-3 text-[12px] font-bold text-black/40 whitespace-nowrap">{deal.date}</td>
                      </tr>
                   ))}
                   
                   {/* INLINE GHOST ROW IN TABLE */}
                   {addingToTable ? (
                      <tr className="bg-black/[0.05] ring-2 ring-black ring-inset">
                         <td className="px-4 py-3 border-r border-black/5 text-center"><div className="flex flex-col gap-1"><button onClick={saveInlineAdd} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button><button onClick={cancelInlineAdd} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><X size={14} /></button></div></td>
                         <td className="px-4 py-3 border-r border-black/5"><input autoFocus placeholder="Company Name" value={inlineForm.company} onChange={(e) => setInlineForm({...inlineForm, company: e.target.value})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/20 w-full" /></td>
                         <td className="px-4 py-3 border-r border-black/5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-black text-white uppercase animate-pulse">Assigning..</span></td>
                         <td className="px-4 py-3 border-r border-black/5"><div className="relative"><span className="absolute left-0 text-xs font-bold text-black/30">₹</span><input type="number" placeholder="Value" value={inlineForm.value || ""} onChange={(e) => setInlineForm({...inlineForm, value: Number(e.target.value)})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/10 w-full pl-3" /></div></td>
                         <td className="px-4 py-3 border-r border-black/5"><input placeholder="Contact Person" value={inlineForm.leadName} onChange={(e) => setInlineForm({...inlineForm, leadName: e.target.value})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/10 w-full" /></td>
                         <td className="px-4 py-3 border-r border-black/5"><input placeholder="Phone" value={inlineForm.leadPhone} onChange={(e) => setInlineForm({...inlineForm, leadPhone: e.target.value})} className="bg-transparent text-[13px] font-bold outline-none border-b border-black/10 w-full" /></td>
                         <td className="px-4 py-3 border-r border-black/5"><div className="flex flex-col gap-1"><select value={inlineForm.empId} onChange={(e) => handleEmpIdChange(e.target.value)} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 w-full"><option value="">Select ID</option>{EMPLOYEES.map(e => (<option key={e.id} value={e.id}>{e.id}</option>))}</select><p className="text-[9px] font-black text-black/50 uppercase">{inlineForm.empName}</p></div></td>
                         <td className="px-4 py-3 border-r border-black/5"><select value={inlineForm.priority} onChange={(e) => handlePriorityChange(e.target.value)} className="bg-transparent text-[11px] font-bold outline-none border-b border-black/10 w-full"><option>Medium</option><option>High</option><option>Critical</option></select></td>
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
