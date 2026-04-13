"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/layout/AuthProvider";
import {
 LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface KpiScore {
 _id: string;
 month: number;
 year: number;
 kpi_score: number;
 kra_score: number;
 behavioral_score?: number;
 final_score: number;
 remarks?: string;
 rating_label?: string;
 incentive_hint?: string;
 enteredBy?: { name: string };
}

export default function PerformancePage() {
 
 const { request } = useApi();
 const [scores, setScores] = useState<KpiScore[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 
 request<{ scores: KpiScore[] }>({ url: "/api/kpi" })
 .then((res) => setScores(res.scores ?? []))
 .catch(console.error)
 .finally(() => setLoading(false));
 }, [request]);

 const chartData = [...scores]
 .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
 .map((s) => ({
 label: new Date(s.year, s.month - 1).toLocaleString("en-IN", { month: "short", year: "2-digit" }),
 KPI: s.kpi_score,
 KRA: s.kra_score,
 Behavioral: s.behavioral_score ?? 0,
 Final: s.final_score,
 }));

 return (
 <DashboardShell title="Performance — KPI / KRA">
 {loading ? (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
 </div>
 ) : scores.length === 0 ? (
 <Card>
 <div className="py-16 text-center text-theme-subtle">
 <p className="text-lg font-medium">No performance data yet</p>
 <p className="text-sm mt-1">Your admin or lead will enter KPI/KRA scores each month.</p>
 </div>
 </Card>
 ) : (
 <>
 {/* Score trend chart */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>Score Trend</CardTitle>
 </CardHeader>
 <ResponsiveContainer width="100%" height={240}>
 <LineChart data={chartData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
 <XAxis dataKey="label" tick={{ fontSize: 11 }} />
 <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
 <Tooltip />
 <Legend wrapperStyle={{ fontSize: 12 }} />
 <Line type="monotone" dataKey="KPI" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
 <Line type="monotone" dataKey="KRA" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
 <Line type="monotone" dataKey="Behavioral" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
 <Line type="monotone" dataKey="Final" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
 </LineChart>
 </ResponsiveContainer>
 </Card>

 {/* Score table */}
 <Card>
 <CardHeader>
 <CardTitle>Monthly Scores</CardTitle>
 </CardHeader>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-theme-border dark:border-theme-border text-left text-xs text-theme-muted">
 <th className="pb-3 pr-4">Period</th>
 <th className="pb-3 pr-4">KPI Score</th>
 <th className="pb-3 pr-4">KRA Score</th>
 <th className="pb-3 pr-4">Behavioral</th>
 <th className="pb-3 pr-4">Final Score <span className="font-normal">(40/40/20)</span></th>
 <th className="pb-3 pr-4">Remarks</th>
 <th className="pb-3">Entered By</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
 {scores.map((s) => (
 <tr key={s._id}>
 <td className="py-3 pr-4 font-medium">
 {new Date(s.year, s.month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
 </td>
 <td className="py-3 pr-4">
 <div className="flex items-center gap-2">
 <div className="h-1.5 w-16 rounded-full bg-theme-raised">
 <div className="h-full rounded-full bg-sky-400" style={{ width: `${s.kpi_score}%` }} />
 </div>
 <span>{s.kpi_score}</span>
 </div>
 </td>
 <td className="py-3 pr-4">
 <div className="flex items-center gap-2">
 <div className="h-1.5 w-16 rounded-full bg-theme-raised">
 <div className="h-full rounded-full bg-emerald-400" style={{ width: `${s.kra_score}%` }} />
 </div>
 <span>{s.kra_score}</span>
 </div>
 </td>
 <td className="py-3 pr-4">
 <div className="flex items-center gap-2">
 <div className="h-1.5 w-16 rounded-full bg-theme-raised">
 <div className="h-full rounded-full bg-amber-400" style={{ width: `${s.behavioral_score ?? 0}%` }} />
 </div>
 <span>{s.behavioral_score ?? 0}</span>
 </div>
 </td>
 <td className="py-3 pr-4 font-bold text-purple-600">{s.final_score}</td>
 <td className="py-3 pr-4 text-theme-muted text-xs">
 {s.remarks ?? s.incentive_hint ?? s.rating_label ?? "—"}
 </td>
 <td className="py-3 text-theme-muted text-xs">{s.enteredBy?.name ?? "—"}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 </>
 )}
 </DashboardShell>
 );
}
