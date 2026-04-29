"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Crown,
  Users,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface OrgNode {
  id: string;
  name: string;
  role: string;
  type: "root" | "dept" | "team" | "employee";
  employee_id?: string;
  matrix_role?: string;
  children?: OrgNode[];
}

function collectIds(node: OrgNode): string[] {
  return [node.id, ...(node.children?.flatMap(collectIds) ?? [])];
}

// ─── Node Card ─────────────────────────────────────────────
function NodeCard({
  node,
  isExpanded,
  hasChildren,
  onToggle,
  isRoot = false,
}: {
  node: OrgNode;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  isRoot?: boolean;
}) {
  const typeLabel =
    node.type === "root" ? "HQ Root" :
    node.type === "dept" ? "Department" :
    node.type === "employee" ? "Employee" :
    hasChildren ? "Lead Team" : "Sub-Team";

  return (
    <div
      onClick={hasChildren ? onToggle : undefined}
      className={cn(
        "relative flex min-w-[176px] max-w-[210px] flex-col rounded-2xl border px-4 py-3 transition-all duration-200 select-none",
        hasChildren ? "cursor-pointer" : "cursor-default",
        isRoot
          ? "bg-[hsl(222,47%,11%)] border-[hsl(222,47%,18%)] shadow-xl"
          : isExpanded && hasChildren
          ? "bg-theme-surface border-[hsl(var(--border-strong))] shadow-md ring-1 ring-[hsl(var(--border-strong))/0.4]"
          : "bg-theme-surface border-theme-border shadow-sm hover:border-[hsl(var(--border-strong))] hover:shadow-md"
      )}
    >
      {/* Header: icon + name + chevron */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={cn(
          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg",
          isRoot ? "bg-white/10 text-white/80" : "bg-theme-raised text-theme-muted"
        )}>
          {node.type === "root" && <Crown size={13} />}
          {node.type === "dept" && <Building2 size={13} />}
          {node.type === "team" && <Users size={13} />}
          {node.type === "employee" && <ShieldCheck size={13} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-[9px] font-semibold uppercase tracking-widest leading-none mb-0.5",
            isRoot ? "text-white/40" : "text-theme-subtle"
          )}>
            {typeLabel}
          </p>
          <p className={cn(
            "text-[13px] font-bold leading-snug truncate",
            isRoot ? "text-white" : "text-theme-fg"
          )}>
            {node.name}
          </p>
        </div>
        {hasChildren && (
          <div className={cn(
            "flex-shrink-0 transition-transform duration-200",
            isExpanded ? "rotate-90" : "",
            isRoot ? "text-white/30" : "text-theme-subtle"
          )}>
            <ChevronRight size={12} />
          </div>
        )}
      </div>

      {/* Role & Info badge */}
      <div className={cn(
        "rounded-lg px-2.5 py-1 text-center space-y-0.5",
        isRoot ? "bg-white/10" : "bg-theme-raised"
      )}>
        <p className={cn(
          "text-[10px] font-black truncate uppercase tracking-widest",
          isRoot ? "text-white/60" : "text-theme-muted"
        )}>
          {node.matrix_role || node.role}
        </p>
        {node.employee_id && (
          <p className="text-[9px] font-bold text-theme-primary/60 tracking-widest uppercase">
            ID: {node.employee_id}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tree Node (recursive) ─────────────────────────────────
function TreeNode({
  node,
  expandedIds,
  onToggle,
  isRoot = false,
}: {
  node: OrgNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  isRoot?: boolean;
}) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = !!(node.children && node.children.length > 0);
  const showChildren = isExpanded && hasChildren;

  return (
    <div className="org-node flex flex-col items-center">
      <NodeCard
        node={node}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        onToggle={() => onToggle(node.id)}
        isRoot={isRoot}
      />

      {showChildren && (
        <div className="org-children">
          {node.children!.map((child) => (
            <div key={child.id} className="org-child">
              <div className="org-stem" />
              <TreeNode node={child} expandedIds={expandedIds} onToggle={onToggle} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────
export default function OrgChartPage() {
  const [orgData, setOrgData] = useState<OrgNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["root_node"]));
  const [zoom, setZoom] = useState(0.75);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const drag = useRef({ x: 0, y: 0, sl: 0, st: 0 });

  async function hydrateChart() {
    try {
      setLoading(true);
      const [{ data: config }, { data: teamsData }, { data: employeesData }] = await Promise.all([
        supabase.from("system_config").select("*").limit(1).single(),
        supabase.from("teams").select("*"),
        supabase.from("employees").select("id, name, employee_id, designation, matrix_role, team_id, department"),
      ]);

      const teams = teamsData || [];
      const employees = employeesData || [];

      const buildTree = (parentId: string | null): OrgNode[] => {
        const childrenTeams = teams
          .filter((t: any) => t.parent_id === parentId)
          .map((t: any) => {
             const teamEmployees = employees
               .filter((e: any) => e.team_id === t.id)
               .map((e: any) => ({
                 id: e.id,
                 name: e.name,
                 employee_id: e.employee_id,
                 role: e.designation,
                 matrix_role: e.matrix_role,
                 type: "employee" as const,
               }));

             return {
               id: t.id,
               name: t.name,
               role: t.head_designation || (t.type === "department" ? "Dept Head" : "Team Lead"),
               type: t.type === "department" ? ("dept" as const) : ("team" as const),
               children: [...teamEmployees, ...buildTree(t.id)],
             };
          });
        
        return childrenTeams;
      };

      // Also handle employees directly under the root/top-level if needed
      // But standard structure is Root -> Dept -> Team -> Employee

      const root: OrgNode = {
        id: "root_node",
        name: config?.company_name || "Namaah Nexus HQ",
        role: [config?.founder_name, config?.founder_designation].filter(Boolean).join(" · ") || "CEO",
        type: "root",
        children: buildTree(null),
      };

      setOrgData(root);
    } catch (err) {
      console.error("OrgChart:", err);
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
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function expandAll() {
    if (orgData) setExpandedIds(new Set(collectIds(orgData)));
  }
  function collapseAll() {
    setExpandedIds(new Set(["root_node"]));
  }
  function reset() {
    setZoom(0.75);
    collapseAll();
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
      scrollRef.current.scrollTop = 0;
    }
  }

  // ── Pan handlers ──
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".org-node")) return;
    isDragging.current = true;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      sl: scrollRef.current?.scrollLeft ?? 0,
      st: scrollRef.current?.scrollTop ?? 0,
    };
    if (scrollRef.current) scrollRef.current.style.cursor = "grabbing";
  };
  const onMouseUp = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = drag.current.sl - (e.clientX - drag.current.x);
    scrollRef.current.scrollTop  = drag.current.st - (e.clientY - drag.current.y);
  };
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((p) => Math.min(2, Math.max(0.2, p + (e.deltaY > 0 ? -0.08 : 0.08))));
    }
  };

  return (
    <>
      {/* Org connector styles */}
      <style>{`
        /* Vertical stem FROM parent DOWN to children's horizontal bar */
        .org-children {
          display: flex;
          flex-direction: row;
          position: relative;
          padding-top: 36px;
        }
        .org-children::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 36px;
          background: hsl(var(--border-strong));
          border-radius: 1px;
        }

        /* Each child column */
        .org-child {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 224px;
          padding: 0 16px;
          position: relative;
        }

        /* Horizontal bar through each child's top edge */
        .org-child::before,
        .org-child::after {
          content: '';
          position: absolute;
          top: 0;
          height: 2px;
          background: hsl(var(--border-strong));
          width: 50%;
        }
        .org-child::before { right: 50%; }
        .org-child::after  { left:  50%; }

        /* Clip first/last child half-bars (clean ends) */
        .org-child:first-child::before { display: none; }
        .org-child:last-child::after   { display: none; }
        /* Single child — no horizontal bar needed */
        .org-child:only-child::before,
        .org-child:only-child::after   { display: none; }

        /* Vertical stem FROM horizontal bar DOWN to child node */
        .org-stem {
          width: 2px;
          height: 36px;
          background: hsl(var(--border-strong));
          border-radius: 1px;
          flex-shrink: 0;
        }
        /* Single child: parent's ::before already covers the gap */
        .org-child:only-child > .org-stem {
          height: 0;
        }
      `}</style>

      <DashboardShell
        title="Dynamic Org Chart"
        subtitle="Live enterprise hierarchy automatically mapped from PostgreSQL."
        actions={
          <div className="flex items-center gap-2">
            {/* Collapse / Expand */}
            <div className="flex rounded-lg border border-theme-border bg-theme-raised p-0.5 gap-0.5">
              <button
                onClick={collapseAll}
                title="Collapse all"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-theme-muted hover:bg-theme-page hover:text-theme-fg transition-colors"
              >
                <Minus size={12} /> Collapse
              </button>
              <button
                onClick={expandAll}
                title="Expand all"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-theme-muted hover:bg-theme-page hover:text-theme-fg transition-colors"
              >
                <Plus size={12} /> Expand All
              </button>
            </div>

            {/* Zoom */}
            <div className="flex rounded-lg border border-theme-border bg-theme-raised p-0.5 gap-0.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}
                className="p-1.5 rounded-md text-theme-muted hover:bg-theme-page hover:text-theme-fg transition-colors"
              >
                <ZoomOut size={14} />
              </button>
              <div className="flex min-w-[46px] items-center justify-center px-1 text-xs font-semibold text-theme-muted">
                {Math.round(zoom * 100)}%
              </div>
              <button
                onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
                className="p-1.5 rounded-md text-theme-muted hover:bg-theme-page hover:text-theme-fg transition-colors"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={reset}>
              <Maximize2 size={13} className="mr-1.5" /> Reset
            </Button>
          </div>
        }
      >
        {/* Canvas */}
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseUp}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          onWheel={onWheel}
          className="relative h-[76vh] w-full overflow-auto rounded-2xl border border-theme-border"
          style={{
            cursor: "grab",
            background: "hsl(var(--bg))",
            backgroundImage:
              "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {loading && !orgData ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-primary border-t-transparent" />
                <p className="text-xs font-semibold text-theme-muted">Loading chart…</p>
              </div>
            </div>
          ) : orgData ? (
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
                padding: "52px 80px 80px",
                minWidth: "max-content",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <TreeNode
                node={orgData}
                expandedIds={expandedIds}
                onToggle={toggleNode}
                isRoot
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="space-y-2 text-center">
                <ShieldCheck size={40} className="mx-auto text-theme-subtle opacity-30" />
                <p className="text-sm font-semibold text-theme-muted">No organizational data found</p>
                <p className="text-xs text-theme-subtle">
                  Create departments and teams to see them here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend + hint */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
          {[
            { Icon: Crown,     label: "HQ Root",      dark: true  },
            { Icon: Building2, label: "Department",   dark: false },
            { Icon: Users,     label: "Team / Sub-Team", dark: false },
          ].map(({ Icon, label, dark }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md",
                dark ? "bg-[hsl(222,47%,11%)] text-white" : "bg-theme-raised text-theme-muted"
              )}>
                <Icon size={10} />
              </div>
              <span className="text-[11px] text-theme-subtle">{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1 text-[11px] text-theme-subtle">
            <ChevronDown size={11} />
            Click node to expand · Drag to pan · Ctrl + scroll to zoom
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
