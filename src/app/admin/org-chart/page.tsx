"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
 Building2, 
 ChevronDown, 
 ChevronRight, 
 Crown, 
 Zap, 
 Users, 
 ShieldCheck,
 Search,
 Maximize2
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { CORPORATE_TEAMS } from "@/constants/teams";

interface Node {
 id: string;
 name: string;
 role: string;
 type: "root" | "dept" | "team";
 children?: Node[];
}

const ORG_DATA: Node = {
 id: "ceo",
 name: "Namaah Startup",
 role: "Chief Executive Officer",
 type: "root",
 children: [
 {
 id: "cto",
 name: "Engineering",
 role: "CTO",
 type: "dept",
 children: CORPORATE_TEAMS.filter(t => t.department === "Engineering").map(t => ({
 id: `team-${t.id}`,
 name: t.name,
 role: t.lead,
 type: "team" as const
 }))
 },
 {
 id: "cpo",
 name: "Product",
 role: "CPO",
 type: "dept",
 children: CORPORATE_TEAMS.filter(t => t.department === "Product").map(t => ({
 id: `team-${t.id}`,
 name: t.name,
 role: t.lead,
 type: "team" as const
 }))
 },
 {
 id: "cso",
 name: "Sales",
 role: "CSO",
 type: "dept",
 children: CORPORATE_TEAMS.filter(t => t.department === "Sales").map(t => ({
 id: `team-${t.id}`,
 name: t.name,
 role: t.lead,
 type: "team" as const
 }))
 },
 {
 id: "cmo",
 name: "Marketing",
 role: "CMO",
 type: "dept",
 children: CORPORATE_TEAMS.filter(t => t.department === "Marketing").map(t => ({
 id: `team-${t.id}`,
 name: t.name,
 role: t.lead,
 type: "team" as const
 }))
 },
 {
 id: "coo",
 name: "Operations",
 role: "COO",
 type: "dept",
 children: CORPORATE_TEAMS.filter(t => t.department === "Operations").map(t => ({
 id: `team-${t.id}`,
 name: t.name,
 role: t.lead,
 type: "team" as const
 }))
 },
 {
 id: "cfo",
 name: "Finance",
 role: "CFO",
 type: "dept",
 children: CORPORATE_TEAMS.filter(t => t.department === "Finance").map(t => ({
 id: `team-${t.id}`,
 name: t.name,
 role: t.lead,
 type: "team" as const
 }))
 },
 {
 id: "chro",
 name: "People",
 role: "CHRO",
 type: "dept",
 children: [
 ...CORPORATE_TEAMS.filter(t => t.department === "People").map(t => ({
 id: `team-${t.id}`,
 name: t.name,
 role: t.lead,
 type: "team" as const
 })),
 ...CORPORATE_TEAMS.filter(t => t.department === "Legal").map(t => ({
 id: `team-${t.id}`,
 name: t.name,
 role: t.lead,
 type: "team" as const
 }))
 ]
 }
 ]
};

const NodeCard = ({ node, isExpanded, onToggle, isRoot = false }: { 
 node: Node; 
 isExpanded: boolean; 
 onToggle: () => void;
 isRoot?: boolean;
}) => {
 return (
 <div 
 className="flex flex-col items-center relative group"
 data-node-id={node.id}
 >
 {/* Connector line (top) */}
 {!isRoot && (
 <div className="flex flex-col items-center">
 <div className="h-8 w-[1.5px] bg-theme-primary/20 group-hover:bg-theme-primary/20 transition-colors duration-300" />
 <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-slate-900/30 group-hover:border-t-slate-900/60 -mt-[1px]" />
 </div>
 )}
 
 <div 
 onClick={node.children ? onToggle : undefined}
 className={cn(
 "enterprise-card px-6 py-4 flex flex-col items-center min-w-[200px] cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative z-10",
 isRoot ? "bg-theme-primary text-white border-theme-strong" : "bg-theme-surface",
 isExpanded && !isRoot && "border-theme-strong/50 shadow-lg"
 )}
 >
 <div className="flex items-center gap-3 mb-2">
 <div className={cn(
 "p-2 rounded-lg transition-transform duration-500 group-hover:rotate-12",
 isRoot ? "bg-theme-surface/80" : "bg-theme-page text-theme-fg"
 )}>
 {node.type === "root" && <Crown size={16} />}
 {node.type === "dept" && <Building2 size={16} />}
 {node.type === "team" && <Users size={16} />}
 </div>
 <div>
 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 m-0">{node.type}</h4>
 <h3 className="text-xs font-black uppercase tracking-tight m-0">{node.name}</h3>
 </div>
 {node.children && (
 <div className="ml-2 opacity-30">
 {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
 </div>
 )}
 </div>
 <p className={cn(
 "text-[9px] font-bold uppercase tracking-widest",
 isRoot ? "text-theme-subtle" : "text-theme-muted"
 )}>{node.role}</p>
 </div>

 {/* Connector lines (bottom cluster) */}
 {isExpanded && node.children && node.children.length > 0 && (
 <div className="h-8 w-[1.5px] bg-theme-primary/20 group-hover:bg-theme-primary/20 transition-colors duration-300 mt-0" />
 )}
 </div>
 );
};

export default function OrgChartPage() {
 const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["ceo"]));
 const [zoom, setZoom] = useState(0.75);
 const scrollRef = useRef<HTMLDivElement>(null);
 const chartRef = useRef<HTMLDivElement>(null);
 const [isDragging, setIsDragging] = useState(false);
 const [startX, setStartX] = useState(0);
 const [startY, setStartY] = useState(0);
 const [scrollLeft, setScrollLeft] = useState(0);
 const [scrollTop, setScrollTop] = useState(0);
 const [lastInteractedId, setLastInteractedId] = useState<string | null>(null);

 // Advanced Spatial Focus Engine
 useEffect(() => {
 if (!scrollRef.current || !chartRef.current || !lastInteractedId) return;
 
 const isExpanding = expandedIds.has(lastInteractedId);
 
 const timeout = setTimeout(() => {
 const nodeElement = document.querySelector(`[data-node-id="${lastInteractedId}"]`);
 if (nodeElement && scrollRef.current) {
 const rect = nodeElement.getBoundingClientRect();
 const containerRect = scrollRef.current.getBoundingClientRect();
 
 // Calculate target positions
 const targetScrollLeft = scrollRef.current.scrollLeft + (rect.left - containerRect.left) - (containerRect.width / 2) + (rect.width / 2);
 const targetScrollTop = scrollRef.current.scrollTop + (rect.top - containerRect.top) - (containerRect.height / 4);

 // Advanced Cinematic Transition
 if (isExpanding) {
 setZoom(1.0); // Focus Zoom
 scrollRef.current.scrollTo({
 left: targetScrollLeft,
 top: targetScrollTop,
 behavior: 'smooth'
 });
 } else {
 setZoom(0.75); // Context Zoom-out
 scrollRef.current.scrollTo({
 left: (scrollRef.current.scrollWidth / 2) - (scrollRef.current.clientWidth / 2),
 top: 0,
 behavior: 'smooth'
 });
 }
 }
 }, 100);

 return () => clearTimeout(timeout);
 }, [expandedIds, lastInteractedId]);

 const onMouseDown = (e: React.MouseEvent) => {
 if ((e.target as HTMLElement).closest('button')) return;
 if (!scrollRef.current) return;
 setIsDragging(true);
 setStartX(e.pageX - scrollRef.current.offsetLeft);
 setStartY(e.pageY - scrollRef.current.offsetTop);
 setScrollLeft(scrollRef.current.scrollLeft);
 setScrollTop(scrollRef.current.scrollTop);
 };

 const onMouseLeaveOrUp = () => {
 setIsDragging(false);
 };

 const onMouseMove = (e: React.MouseEvent) => {
 if (!isDragging || !scrollRef.current) return;
 e.preventDefault();
 const x = e.pageX - scrollRef.current.offsetLeft;
 const y = e.pageY - scrollRef.current.offsetTop;
 const walkX = (x - startX) * 1.5;
 const walkY = (y - startY) * 1.5;
 scrollRef.current.scrollLeft = scrollLeft - walkX;
 scrollRef.current.scrollTop = scrollTop - walkY;
 };

 const onWheel = (e: React.WheelEvent) => {
 if (e.ctrlKey || e.metaKey) {
 e.preventDefault();
 const delta = e.deltaY > 0 ? -0.1 : 0.1;
 setZoom(prev => Math.min(Math.max(0.2, prev + delta), 2));
 }
 };

 const toggleNode = (id: string) => {
 const next = new Set(expandedIds);
 if (next.has(id)) {
 next.delete(id);
 } else {
 next.add(id);
 }
 setExpandedIds(next);
 };

 const renderTree = (node: Node, isRoot = false) => {
 const isExpanded = expandedIds.has(node.id);
 
 return (
 <div key={node.id} className="flex flex-col items-center shrink-0">
 <NodeCard 
 node={node} 
 isExpanded={isExpanded} 
 onToggle={() => toggleNode(node.id)}
 isRoot={isRoot}
 />
 
 {isExpanded && node.children && (
 <div className="relative pt-8 flex flex-col items-center w-full">
 {/* Parent to Bridge Stem */}
 <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-[1.5px] bg-theme-primary/20" />
 
 {/* The Dynamic Bridge Rail */}
 {node.children.length > 1 && (
 <div 
 className="absolute top-8 bg-theme-primary/20 h-[1.5px]" 
 style={{
 left: `${(100 / node.children.length) / 2}%`,
 right: `${(100 / node.children.length) / 2}%`
 }}
 />
 )}
 
 <div className="flex gap-4 items-start justify-center px-4 w-full">
 {node.children.map((child) => renderTree(child))}
 </div>
 </div>
 )}
 </div>
 );
 };

 return (
 <DashboardShell
 title="Architecture & Hierarchy"
 subtitle="Strategic organizational mapping with optimized fit."
 actions={
 <div className="flex gap-4 items-center">
 {/* Granular Zoom Rail */}
 <div className="flex bg-theme-raised border border-theme-border rounded-xl p-1 gap-1 shadow-inner overflow-x-auto scrollbar-hide max-w-[400px]">
 {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(z => (
 <button 
 key={z}
 onClick={() => setZoom(z)}
 className={cn(
 "px-2.5 py-1.5 min-w-[44px] text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center whitespace-nowrap",
 Math.abs(zoom - z) < 0.05 ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg"
 )}
 >
 {Math.round(z * 100)}%
 </button>
 ))}
 </div>

 <button 
 onClick={() => {
 setExpandedIds(new Set(["ceo"]));
 setZoom(0.7);
 setLastInteractedId(null);
 if (scrollRef.current) {
 scrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
 }
 }}
 className="flex items-center gap-2 px-4 py-2.5 bg-theme-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg shrink-0"
 >
 <Maximize2 size={12} />
 Reset View
 </button>
 </div>
 }
 >
 <div className="enterprise-card bg-theme-page border-theme-border min-h-[78vh] flex flex-col relative overflow-hidden">
 {/* Navigation Breadcrumb / Legend */}
 <div className="absolute top-6 left-6 flex items-center gap-6 z-20 pointer-events-none bg-theme-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-theme-border shadow-sm">
 {["Engineering", "Product", "Sales", "Ops"].map(d => (
 <div key={d} className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-theme-primary" />
 <span className="text-[9px] font-black text-theme-fg uppercase tracking-widest">{d}</span>
 </div>
 ))}
 </div>

 {/* The Unified Scrollable Matrix */}
 <div 
 ref={scrollRef}
 onMouseDown={onMouseDown}
 onMouseUp={onMouseLeaveOrUp}
 onMouseLeave={onMouseLeaveOrUp}
 onMouseMove={onMouseMove}
 onWheel={onWheel}
 className={cn(
 "w-full h-full overflow-auto p-12 custom-scrollbar select-none bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]",
 isDragging ? "cursor-grabbing" : "cursor-grab"
 )}
 >
 <div 
 ref={chartRef}
 style={{ 
 transform: `scale(${zoom})`,
 transformOrigin: 'top center',
 transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
 }}
 className="inline-flex min-w-full justify-center pt-8 pb-32"
 >
 {renderTree(ORG_DATA, true)}
 </div>
 </div>

 {/* Dynamic Telemetry Footer */}
 <div className="absolute bottom-6 right-6 flex items-center gap-4 text-[10px] font-black text-theme-subtle uppercase tracking-[0.2em] select-none pointer-events-none bg-theme-surface/80 backdrop-blur-sm px-4 py-2 rounded-full border border-theme-border">
 <span>Scale: {Math.round(zoom * 100)}%</span>
 <div className="w-px h-3 bg-theme-overlay" />
 <span>Panning: {isDragging ? "Active" : "Stable"}</span>
 </div>
 </div>

 <style jsx global>{`
 .custom-scrollbar::-webkit-scrollbar {
 width: 8px;
 height: 8px;
 }
 .custom-scrollbar::-webkit-scrollbar-track {
 background: #f8fafc;
 }
 .custom-scrollbar::-webkit-scrollbar-thumb {
 background: #cbd5e1;
 border-radius: 10px;
 border: 2px solid #f8fafc;
 }
 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
 background: #94a3b8;
 }
 `}</style>
 
 {/* Legend Footer */}
 <div className="flex justify-between items-center mt-6 px-2">
 <div className="flex items-center gap-8">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-theme-primary" />
 <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Executive Core</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-theme-subtle/80" />
 <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Functional Hubs</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-theme-overlay" />
 <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Execution Units</span>
 </div>
 </div>
 <div className="flex items-center gap-2 text-emerald-600">
 <ShieldCheck size={14} />
 <span className="text-[10px] font-black uppercase tracking-widest">Organization Structure Verified</span>
 </div>
 </div>
 </DashboardShell>
 );
}
