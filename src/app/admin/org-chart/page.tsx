"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Crown,
  Users,
  ShieldCheck,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CORPORATE_TEAMS } from "@/constants/teams";
import { Button } from "@/components/ui/Button";

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
      id: "cto", name: "Engineering", role: "CTO", type: "dept",
      children: CORPORATE_TEAMS.filter((t) => t.department === "Engineering").map((t) => ({
        id: `team-${t.id}`, name: t.name, role: t.lead, type: "team" as const,
      })),
    },
    {
      id: "cpo", name: "Product", role: "CPO", type: "dept",
      children: CORPORATE_TEAMS.filter((t) => t.department === "Product").map((t) => ({
        id: `team-${t.id}`, name: t.name, role: t.lead, type: "team" as const,
      })),
    },
    {
      id: "cso", name: "Sales", role: "CSO", type: "dept",
      children: CORPORATE_TEAMS.filter((t) => t.department === "Sales").map((t) => ({
        id: `team-${t.id}`, name: t.name, role: t.lead, type: "team" as const,
      })),
    },
    {
      id: "cmo", name: "Marketing", role: "CMO", type: "dept",
      children: CORPORATE_TEAMS.filter((t) => t.department === "Marketing").map((t) => ({
        id: `team-${t.id}`, name: t.name, role: t.lead, type: "team" as const,
      })),
    },
    {
      id: "coo", name: "Operations", role: "COO", type: "dept",
      children: CORPORATE_TEAMS.filter((t) => t.department === "Operations").map((t) => ({
        id: `team-${t.id}`, name: t.name, role: t.lead, type: "team" as const,
      })),
    },
    {
      id: "cfo", name: "Finance", role: "CFO", type: "dept",
      children: CORPORATE_TEAMS.filter((t) => t.department === "Finance").map((t) => ({
        id: `team-${t.id}`, name: t.name, role: t.lead, type: "team" as const,
      })),
    },
    {
      id: "chro", name: "People", role: "CHRO", type: "dept",
      children: [
        ...CORPORATE_TEAMS.filter((t) => t.department === "People").map((t) => ({
          id: `team-${t.id}`, name: t.name, role: t.lead, type: "team" as const,
        })),
        ...CORPORATE_TEAMS.filter((t) => t.department === "Legal").map((t) => ({
          id: `team-${t.id}`, name: t.name, role: t.lead, type: "team" as const,
        })),
      ],
    },
  ],
};

// ─── Node Card ────────────────────────────────────────────
function NodeCard({
  node,
  isExpanded,
  onToggle,
  isRoot = false,
}: {
  node: Node;
  isExpanded: boolean;
  onToggle: () => void;
  isRoot?: boolean;
}) {
  return (
    <div className="flex flex-col items-center relative group" data-node-id={node.id}>
      {/* Top connector */}
      {!isRoot && (
        <div className="flex flex-col items-center">
          <div className="h-7 w-px bg-theme-border" />
          <div className="h-0 w-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-theme-border -mt-px" />
        </div>
      )}

      <button
        onClick={node.children ? onToggle : undefined}
        className={cn(
          "relative z-10 flex min-w-[180px] flex-col items-center rounded-2xl border px-5 py-4 transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-lg",
          isRoot
            ? "bg-theme-primary text-theme-surface border-theme-primary shadow-md"
            : isExpanded
            ? "bg-theme-surface border-theme-strong shadow-sm"
            : "bg-theme-surface border-theme-border hover:border-theme-strong"
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            isRoot ? "bg-theme-surface/20" : "bg-theme-raised"
          )}>
            {node.type === "root" && <Crown size={14} className={isRoot ? "text-theme-surface" : "text-theme-fg"} />}
            {node.type === "dept" && <Building2 size={14} className="text-theme-fg" />}
            {node.type === "team" && <Users size={14} className="text-theme-fg" />}
          </div>
          <div className="text-left">
            <p className={cn("text-[10px] font-semibold opacity-60 uppercase tracking-wide",
              isRoot ? "text-theme-surface" : "text-theme-muted"
            )}>
              {node.type}
            </p>
            <p className={cn("text-xs font-bold leading-tight",
              isRoot ? "text-theme-surface" : "text-theme-fg"
            )}>
              {node.name}
            </p>
          </div>
          {node.children && (
            <div className={cn("ml-1 opacity-40", isRoot ? "text-theme-surface" : "text-theme-fg")}>
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </div>
          )}
        </div>
        <p className={cn("text-[10px]", isRoot ? "text-theme-surface/70" : "text-theme-muted")}>
          {node.role}
        </p>
      </button>

      {/* Bottom connector to children */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="h-7 w-px bg-theme-border" />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
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

  function toggleNode(id: string) {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setStartY(e.pageY - scrollRef.current.offsetTop);
    setScrollLeft(scrollRef.current.scrollLeft);
    setScrollTop(scrollRef.current.scrollTop);
  };

  const onMouseLeaveOrUp = () => setIsDragging(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const y = e.pageY - scrollRef.current.offsetTop;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
    scrollRef.current.scrollTop  = scrollTop  - (y - startY) * 1.5;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((prev) => Math.min(Math.max(0.2, prev + (e.deltaY > 0 ? -0.1 : 0.1)), 2));
    }
  };

  function renderTree(node: Node, isRoot = false): React.ReactNode {
    const isExpanded = expandedIds.has(node.id);
    return (
      <div key={node.id} className="flex flex-col items-center shrink-0">
        <NodeCard node={node} isExpanded={isExpanded} onToggle={() => toggleNode(node.id)} isRoot={isRoot} />
        {isExpanded && node.children && (
          <div className="relative flex flex-col items-center w-full pt-0">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-theme-border"
                style={{
                  left: `${(100 / node.children.length) / 2}%`,
                  right: `${(100 / node.children.length) / 2}%`,
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
  }

  return (
    <DashboardShell
      title="Org Chart"
      subtitle="Company hierarchy and team structure."
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-theme-border bg-theme-raised p-0.5 gap-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-theme-muted hover:text-theme-fg transition-colors"
            >
              <ZoomIn size={14} />
            </button>
            <div className="flex h-7 min-w-[48px] items-center justify-center rounded-md bg-theme-surface px-2 text-xs font-semibold text-theme-fg shadow-sm">
              {Math.round(zoom * 100)}%
            </div>
            <button
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-theme-muted hover:text-theme-fg transition-colors"
            >
              <ZoomOut size={14} />
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setExpandedIds(new Set(["ceo"]));
              setZoom(0.75);
              if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth" });
            }}
          >
            <Maximize2 size={13} className="mr-1.5" /> Reset
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Chart canvas */}
        <div className="page-card min-h-[70vh] overflow-hidden p-0 relative">
          <div
            ref={scrollRef}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseLeaveOrUp}
            onMouseLeave={onMouseLeaveOrUp}
            onMouseMove={onMouseMove}
            onWheel={onWheel}
            className={cn(
              "h-full min-h-[70vh] w-full overflow-auto p-12 select-none",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            style={{
              backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <div
              ref={chartRef}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.3s ease",
              }}
              className="inline-flex min-w-full justify-center pt-8 pb-32"
            >
              {renderTree(ORG_DATA, true)}
            </div>
          </div>

          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-theme-border bg-theme-surface/80 px-3 py-1.5 backdrop-blur-sm text-xs text-theme-muted select-none pointer-events-none">
            <span>Scale: {Math.round(zoom * 100)}%</span>
            <span className="text-theme-border">·</span>
            <span>{isDragging ? "Panning" : "Drag to pan · Ctrl+scroll to zoom"}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-5">
            {[
              { dot: "bg-theme-primary", label: "Company" },
              { dot: "bg-theme-muted",   label: "Department" },
              { dot: "bg-theme-border",  label: "Team" },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", dot)} />
                <span className="text-xs text-theme-muted">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <ShieldCheck size={13} />
            <span className="text-xs">Structure verified</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        [data-node-id] { }
      `}</style>
    </DashboardShell>
  );
}
