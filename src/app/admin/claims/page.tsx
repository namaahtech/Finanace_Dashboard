"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import axios from "axios";

interface Claim {
  _id: string;
  amount: number;
  status: string;
  cycle: number;
  queue_position?: number;
  requested_at: string;
  employee?: { name: string; employeeId: string; department: string };
  incentive?: { amount: number; month: number; year: number };
}

export default function AdminClaimsPage() {
  
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("approved");

  async function load() {
    setLoading(true);
    try {
      const url = `/api/claims${statusFilter ? `?status=${statusFilter}` : ""}`;
      const res = await axios.get(url);
      setClaims(res.data.claims ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function processClaim(claimId: string) {
    setProcessing(claimId);
    try {
      await axios.post(
        "/api/claims",
        { action: "process", claimId }
      );
      await load();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
    } finally {
      setProcessing(null);
    }
  }

  async function advanceCycle() {
    if (!confirm("Advance to next claim cycle? Queued users will be moved.")) return;
    try {
      await axios.post("/api/claims", { action: "advance_cycle" });
      alert("Cycle advanced successfully");
      await load();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
    }
  }

  return (
    <DashboardShell title="Liquidity Management" subtitle="Approve, queue, and process employee incentive claims">
      <div className="flex flex-col gap-8">
        {/* Statistics and Cycle Controls */}
        <div className="page-card !mb-0 flex flex-col md:flex-row justify-between items-center gap-6 border-t-8 border-t-purple-600">
          <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {["pending", "approved", "paid", "queued", ""].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  statusFilter === s 
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" 
                    : "bg-[hsl(var(--surface-raised))] text-muted border border-default hover:text-foreground hover:bg-surface"
                }`}
              >
                {s === "" ? "Global Data" : s}
              </button>
            ))}
          </div>
          <button 
             onClick={advanceCycle}
             className="w-full md:w-auto px-8 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
          >
            Trigger New Cycle
          </button>
        </div>

        {/* Claims Directory */}
        <div className="page-card !mb-0">
          <div className="mb-8">
             <h3 className="text-xl font-black text-foreground uppercase tracking-widest">Active Claims Registry</h3>
             <p className="text-xs text-muted font-bold mt-1">Personnel requests awaiting financial clearance</p>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
               {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-[hsl(var(--surface-raised))] rounded-2xl" />)}
            </div>
          ) : claims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[hsl(var(--surface-raised))] rounded-22xl border border-default border-dashed">
               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
               <p className="text-sm font-bold text-muted">No records found for current filter</p>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Grant Valuation</th>
                    <th>Cycle</th>
                    <th>Queue Pos</th>
                    <th>Current State</th>
                    <th>Request Date</th>
                    <th className="text-right pr-4">Execution</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr key={c._id} className="group cursor-default hover:bg-[hsl(var(--surface-raised))] transition-colors">
                      <td className="py-5">
                        <div className="flex flex-col">
                           <span className="font-bold text-foreground group-hover:text-purple-600 transition-colors uppercase tracking-tight">{c.employee?.name}</span>
                           <span className="text-[10px] text-muted font-black uppercase">{c.employee?.employeeId}</span>
                        </div>
                      </td>
                      <td><span className="text-sm font-black text-emerald-600">{formatCurrency(c.amount)}</span></td>
                      <td className="text-xs font-bold text-muted">CYCLE #{c.cycle}</td>
                      <td>
                         {c.queue_position ? (
                            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--surface-raised))] border border-default flex items-center justify-center text-xs font-black text-purple-600 shadow-sm">
                               {c.queue_position}
                            </div>
                         ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <Badge variant={statusBadgeVariant(c.status)}>{c.status}</Badge>
                      </td>
                      <td className="text-xs font-bold text-muted">{formatDate(c.requested_at)}</td>
                      <td className="text-right pr-4">
                        {c.status === "approved" && (
                          <button
                            onClick={() => processClaim(c._id)}
                            disabled={processing === c._id}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                          >
                            {processing === c._id ? "Processing..." : "Authorize Payout"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
