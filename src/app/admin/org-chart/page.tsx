"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
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
import { Button } from "@/components/ui/Button";

interface Node {
  id: string;
  name: string;
  role: string;
  type: "root" | "dept" | "team";
  children?: Node[];
}

type Position = "only" | "first" | "middle" | "last";

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
  const hasChildren = node.children && node.children.length > 0;

  const typeLabel =
    node.type === "root"
      ? "HQ Root"
      : node.type === "dept"
      ? "Department"
      : hasChildren
      ? "Lead Team"
      : "Sub-Team";

  return (
    <button
      onClick={hasChildren ? onToggle : undefined}
      className={cn(
        "relative z-10 flex min-w-[180px] max-w-[200px] flex-col items-center rounded-2xl border px-5 py-4 transition-all duration-200 shadow-sm text-left",
        hasChildren ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg" : "cursor-default",
        isRoot
          ? "bg-gray-900 border-gray-800 shadow-xl ring-4 ring-black/10"
          : isExpanded
          ? "bg-theme-surface border-gray-400 shadow-md ring-1 ring-gray-300/50"
          : "bg-theme-surface border-gray-200 hover:border-gray-400"
      )}
    >
      <div className="mb-2.5 flex items-center gap-2.5 w-full">
        <div className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border shadow-sm",
          isRoot
            ? "bg-white/10 border-white/20 text-white"
            : "bg-gray-100 border-gray-200 text-gray-700"
        )}>
          {node.type === "root" && <Crown size={14} />}
          {node.type === "dept" && <Building2 size={14} />}
          {node.type === "team" && <Users size={14} />}
        </div>
        <div className="text-left min-w-0 flex-1">
          <p className={cn(
            "text-[8px] font-black uppercase tracking-[0.15em] leading-none mb-0.5",
            isRoot ? "text-white/50" : "text-gray-400"
          )}>
            {typeLabel}
          </p>
          <p className={cn(
            "text-[13px] font-bold leading-tight truncate",
            isRoot ? "text-white" : "text-gray-900"
          )}>
            {node.name}
          </p>
        </div>
        {hasChildren && (
          <div className={cn("flex-shrink-0 ml-auto", isRoot ? "text-white/40" : "text-gray-400")}>
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </div>
        )}
      </div>

      <div className={cn(
        "w-full rounded-lg px-2.5 py-1.5 text-center",
        isRoot ? "bg-white/10" : "bg-gray-50 border border-gray-100"
      )}>
        <p className={cn(
          "text-[10px] font-semibold uppercase tracking-wider truncate",
          isRoot ? "text-white/70" : "text-gray-500"
        )}>
          {node.role}
        </p>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function OrgChartPage() {
  const [orgData, setOrgData] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["root_node"]));
  const [zoom, setZoom] = useState(0.75);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  async function hydrateChart() {
    try {
      setLoading(true);
      const [{ data: config }, { data: teamsData }] = await Promise.all([
        supabase.from("system_config").select("*").limit(1).single(),
        supabase.from("teams").select("*"),
      ]);

      const seen = new Set<string>();
      const teams = (teamsData || []).filter((t: any) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      const buildTree = (parentId: string | null): Node[] =>
        teams
          .filter((t: any) => t.parent_id === parentId)
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            role: t.head_designation || (t.type === "department" ? "Dept Head" : "Team Lead"),
            type: t.type === "department" ? ("dept" as const) : ("team" as const),
            children: buildTree(t.id),
          }));

      const root: Node = {
        id: "root_node",
        name: config?.company_name || "Company",
        role: [config?.founder_name, config?.founder_designation].filter(Boolean).join(" \u00b7 ") || "CEO",
        type: "root",
        children: buildTree(null),
      };

      setOrgData(root);
    } catch (err) {
      console.error("Org Chart Hydration Error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    hydrateChart();
    const sub = supabase
      .channel("org-chart-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, hydrateChart)
      .on("postgres_changes", { event: "*", schema: "public", table: "system_config" }, hydrateChart)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

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
    scrollRef.current.scrollTop = scrollTop - (y - startY) * 1.5;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((p) => Math.min(Math.max(0.2, p + (e.deltaY > 0 ? -0.1 : 0.1)), 2));
    }
  };

  // ── Proper DSA Tree Renderer with flex-1 bridge connectors ──
  function renderTree(node: Node, isRoot = false, pos: Position = "only"): React.ReactNode {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = isExpanded && node.children && node.children.length > 0;

    // Horizontal bridge segments (left-half / right-half) based on sibling position
    const lineColor = "bg-gray-800";
    const showLeftBridge = pos === "last" || pos === "middle";
    const showRightBridge = pos === "first" || pos === "middle";

    return (
      <div className="flex flex-col items-center shrink-0 flex-1 min-w-[200px]">

        {/* ── TOP: Horizontal bridge then stem ── */}
        {!isRoot && (
          <>
            {/* Horizontal bridge row — left half + right half */}
            <div className="flex w-full h-px">
              <div className={cn("flex-1 h-px", showLeftBridge ? lineColor : "bg-transparent")} />
              <div className={cn("flex-1 h-px", showRightBridge ? lineColor : "bg-transparent")} />
            </div>
            {/* Vertical stem from bridge to card */}
            <div className={cn("w-px h-7", lineColor)} />
          </>
        )}

        {/* ── NODE ── */}
        <NodeCard
          node={node}
          isExpanded={isExpanded}
          onToggle={() => toggleNode(node.id)}
          isRoot={isRoot}
        />

        {/* ── BOTTOM: stem from card + children ── */}
        {hasChildren && (
          <>
            {/* Stem down from node */}
            <div className={cn("w-px h-7", lineColor)} />

            {/* Children row */}
            <div className="flex w-full items-start">
              {node.children!.map((child, i, arr) => {
                const childPos: Position =
                  arr.length === 1
                    ? "only"
                    : i === 0
                    ? "first"
                    : i === arr.length - 1
                    ? "last"
                    : "middle";
                return (
                  <div key={child.id} className="flex flex-col items-center flex-1 min-w-[200px]">
                    {renderTree(child, false, childPos)}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <DashboardShell
      title="Dynamic Org Chart"
      subtitle="Live enterprise hierarchy automatically mapped from PostgreSQL."
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-theme-border bg-theme-raised p-0.5 gap-0.5">
            <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))} className="p-1.5 hover:bg-theme-page rounded-md transition-colors text-theme-muted hover:text-theme-fg">
              <ZoomOut size={14} />
            </button>
            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center">
              {Math.round(zoom * 100)}%
            </div>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="p-1.5 hover:bg-theme-page rounded-md transition-colors text-theme-muted hover:text-theme-fg">
              <ZoomIn size={14} />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setZoom(0.75); setExpandedIds(new Set(["root_node"])); }}>
            <Maximize2 size={14} className="mr-1.5" /> Reset
          </Button>
        </div>
      }
    >
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeaveOrUp}
        onMouseUp={onMouseLeaveOrUp}
        onMouseMove={onMouseMove}
        onWheel={onWheel}
        className={cn(
          "relative h-[76vh] w-full overflow-hidden rounded-3xl border border-theme-border shadow-inner",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{
          backgroundColor: "var(--color-theme-page, #f8f9fb)",
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.18) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
        }}
      >
        {loading && !orgData ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-800 border-t-transparent" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 animate-pulse">
                Hydrating Matrix...
              </p>
            </div>
          </div>
        ) : orgData ? (
          <div
            ref={chartRef}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center top",
              transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
            className="flex flex-col items-center p-16 min-w-max"
          >
            {renderTree(orgData, true)}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3">
              <ShieldCheck size={48} className="mx-auto text-gray-300" />
              <p className="text-sm font-bold text-gray-400">No organizational nodes detected.</p>
              <p className="text-xs text-gray-300">Create departments and teams in the Teams section.</p>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
