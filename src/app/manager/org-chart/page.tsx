"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  ChevronRight,
  Crown,
  Users,
  ShieldCheck,
  Maximize2,
  ZoomIn,
  ZoomOut,
  User as UserIcon,
  Minus,
  Plus,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import axios from "axios";

interface OrgNode {
  id: string;
  name: string;
  role: string;
  employeeId?: string;
  type: "root" | "dept" | "team" | "employee";
  children?: OrgNode[];
}

function collectIds(node: OrgNode): string[] {
  return [node.id, ...(node.children?.flatMap(collectIds) ?? [])];
}

const ROLE_LABEL: Record<string, string> = {
  employee: "Employee",
  hr: "HR",
  lead: "Team Lead",
  manager: "Dept. Manager",
  super_admin: "Super Admin",
  accounts: "Accounts",
  sales: "Sales",
};

const ROLE_BADGE: Record<string, "default" | "info" | "success" | "purple" | "warning" | "danger"> = {
  employee: "default",
  hr: "info",
  lead: "success",
  manager: "purple",
  super_admin: "purple",
  accounts: "warning",
  sales: "danger",
};

// ─── Node Card (Circular Dot Design) ───────────────────────
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
  const Icon =
    node.type === "root"     ? Crown :
    node.type === "dept"     ? Building2 :
    node.type === "team"     ? Users :
                               UserIcon;

  return (
    <div className="relative flex flex-col items-center group">
      {/* The Dot/Circle */}
      <div
        onClick={hasChildren ? onToggle : undefined}
        className={cn(
          "relative z-10 flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 transition-all duration-300",
          hasChildren ? "cursor-pointer" : "cursor-default",
          isRoot
            ? "bg-theme-primary border-theme-primary shadow-xl shadow-theme-primary/20 scale-110"
            : node.type === "employee"
            ? "bg-theme-surface border-theme-border shadow-sm group-hover:border-theme-primary/50 group-hover:shadow-md"
            : isExpanded && hasChildren
            ? "bg-theme-surface border-theme-primary shadow-md"
            : "bg-theme-surface border-theme-border shadow-sm group-hover:border-theme-primary/30"
        )}
      >
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full mb-0.5",
          isRoot ? "bg-white/20 text-white" : "bg-theme-raised text-theme-muted group-hover:text-theme-primary transition-colors"
        )}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        
        {/* Connection handle for children */}
        {hasChildren && (
          <div className={cn(
            "absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-theme-surface z-20 transition-colors",
            isExpanded ? "bg-theme-primary" : "bg-theme-border"
          )}>
            <div className="absolute inset-0 flex items-center justify-center">
               {isExpanded ? <Minus size={6} className="text-white" /> : <Plus size={6} className="text-white" />}
            </div>
          </div>
        )}
      </div>

      {/* Label Area (Float below the dot) */}
      <div className="absolute top-22 flex flex-col items-center text-center whitespace-nowrap">
        <p className={cn(
          "text-[12px] font-black tracking-tight",
          isRoot ? "text-theme-primary" : "text-theme-fg"
        )}>
          {node.name}
        </p>
        <div className="mt-1 flex flex-col items-center gap-0.5">
           {node.employeeId && (
              <span className="text-[9px] font-black uppercase tracking-widest text-theme-muted/60">
                {node.employeeId}
              </span>
           )}
           <Badge variant="purple" className="text-[8px] px-1.5 py-0 h-4 font-black uppercase tracking-widest bg-theme-raised text-theme-muted border-none">
              {node.role || "MEMBER"}
           </Badge>
        </div>
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
export default function ManagerOrgChartPage() {
  const { user } = useAuth();
  const [orgData, setOrgData] = useState<OrgNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(0.8);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const drag = useRef({ x: 0, y: 0, sl: 0, st: 0 });

  async function hydrateChart() {
    if (!user) return;
    try {
      setLoading(true);

      const [teamsRes, empsRes] = await Promise.all([
        axios.get("/api/teams"),
        fetch("/api/employees", { cache: "no-store" }).then((r) => r.json()),
      ]);

      const allTeams = teamsRes.data.teams || [];
      const allEmps = empsRes.employees || [];

      let dept = allTeams.find(
        (t: { type: string; lead_id: string }) => t.type === "department" && t.lead_id === user.id
      );
      if (!dept && user.department) {
        dept = allTeams.find(
          (t: { type: string; name: string }) =>
            t.type === "department" &&
            t.name.toLowerCase() === user.department!.toLowerCase()
        );
      }

      if (dept) {
        const buildTree = (parentId: string): OrgNode[] => {
          const teams = allTeams
            .filter((t: { parent_id: string }) => t.parent_id === parentId)
            .map((t: { id: string; name: string }) => ({
              id: t.id,
              name: t.name,
              role: "lead",
              type: "team" as const,
              children: buildTree(t.id),
            }));

          const members = allEmps
            .filter((e: { team_id: string }) => e.team_id === parentId)
            .map((e: { id: string; name: string; matrix_role?: string; employee_id?: string }) => ({
              id: e.id,
              name: e.name,
              role: e.matrix_role || "Associate",
              employeeId: e.employee_id,
              type: "employee" as const,
            }));

          return [...teams, ...members];
        };

        const root: OrgNode = {
          id: dept.id,
          name: dept.name,
          role: dept.head_designation || "Director",
          type: "root",
          children: buildTree(dept.id),
        };

        setOrgData(root);
        const defaultExpanded = new Set<string>([dept.id]);
        root.children?.forEach((c) => defaultExpanded.add(c.id));
        setExpandedIds(defaultExpanded);
      }
    } catch (err) {
      console.error("OrgChart:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    hydrateChart();
  }, [user]);

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
    if (!orgData) return;
    const defaultExpanded = new Set<string>([orgData.id]);
    orgData.children?.forEach((c) => defaultExpanded.add(c.id));
    setExpandedIds(defaultExpanded);
  }
  function reset() {
    setZoom(0.8);
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
      {/* Org connector styles — same system as admin chart */}
      <style>{`
        .org-children {
          display: flex;
          flex-direction: row;
          position: relative;
          padding-top: 60px;
        }
        .org-children::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 60px;
          background: linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--border-strong)));
          opacity: 0.5;
        }
        .org-child {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 240px;
          padding: 0 20px;
          position: relative;
        }
        .org-child::before,
        .org-child::after {
          content: '';
          position: absolute;
          top: 0;
          height: 2px;
          background: hsl(var(--border-strong));
          width: 50%;
          opacity: 0.5;
        }
        .org-child::before { right: 50%; }
        .org-child::after  { left:  50%; }
        .org-child:first-child::before { display: none; }
        .org-child:last-child::after   { display: none; }
        .org-child:only-child::before,
        .org-child:only-child::after   { display: none; }
        .org-stem {
          width: 2px;
          height: 40px;
          background: hsl(var(--border-strong));
          opacity: 0.5;
          flex-shrink: 0;
          margin-bottom: -10px;
        }
        .org-child:only-child > .org-stem {
          height: 0;
        }
        .top-22 { top: 5.5rem; }
      `}</style>

      <DashboardShell
        title="Department Hierarchy"
        subtitle="Visual map of your department structure, teams, and personnel."
        actions={
          <div className="flex items-center gap-2">
            {/* Collapse / Expand */}
            <div className="flex rounded-lg border border-theme-border bg-theme-raised p-0.5 gap-0.5">
              <button
                onClick={collapseAll}
                title="Collapse to first level"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-theme-muted hover:bg-theme-page hover:text-theme-fg transition-colors"
              >
                <Minus size={12} /> Collapse
              </button>
              <button
                onClick={expandAll}
                title="Expand all nodes"
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
          className="relative h-[74vh] w-full overflow-auto rounded-2xl border border-theme-border"
          style={{
            cursor: "grab",
            background: "hsl(var(--bg))",
            backgroundImage:
              "radial-gradient(circle, hsl(var(--primary) / 0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        >
          {loading && !orgData ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-primary border-t-transparent" />
                <p className="text-xs font-semibold text-theme-muted">Loading hierarchy…</p>
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
                <p className="text-sm font-semibold text-theme-muted">No department hierarchy found</p>
                <p className="text-xs text-theme-subtle">
                  Personnel assignments will appear here once your department is configured.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend + hint */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
          {[
            { Icon: Crown,     label: "Dept. Root",   dark: true  },
            { Icon: Building2, label: "Department",   dark: false },
            { Icon: Users,     label: "Team",         dark: false },
            { Icon: UserIcon,  label: "Employee",     dark: false, accent: true },
          ].map(({ Icon, label, dark, accent }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md",
                dark   ? "bg-[hsl(222,47%,11%)] text-white" :
                accent ? "bg-theme-primary/10 text-theme-primary" :
                         "bg-theme-raised text-theme-muted"
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
