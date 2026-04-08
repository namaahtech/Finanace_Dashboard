"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import { getYearRange } from "@/lib/utils";
import {
 calculateBehavioralScore,
 calculateFinalKpiScore,
 calculateKraScore,
 calculateWeightedKpi,
 getKpiRating,
 type BehavioralMetricsInput,
 type KpiEntryInput,
 type KraMetricsInput,
} from "@/lib/kpiMath";
import { 
 Award, 
 ChevronDown, 
 CircleAlert, 
 Gauge, 
 TrendingUp, 
 Building2, 
 Clock3, 
 IndianRupee 
} from "lucide-react";

interface User {
 _id: string;
 name: string;
 employeeId: string;
 department: string;
}

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
 kpi_entries?: KpiEntryInput[];
 kra_metrics?: KraMetricsInput;
 behavioral_metrics?: BehavioralMetricsInput;
 enteredBy?: { name: string };
}

interface FormState {
 month: number;
 year: number;
 kpiEntries: KpiEntryInput[];
 kraMetrics: KraMetricsInput;
 behavioralMetrics: BehavioralMetricsInput;
 remarks: string;
}

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
 value: i + 1,
 label: new Date(2000, i).toLocaleString("en-IN", { month: "long" }),
}));

const ratingOptions = [1, 2, 3, 4, 5];
const attendanceOptions = Array.from({ length: 21 }, (_, i) => i * 5);

function createDefaultForm(month: number, year: number): FormState {
 return {
 month,
 year,
 kpiEntries: [
 { label: "KPI 1", weight: 30, score: 0 },
 { label: "KPI 2", weight: 30, score: 0 },
 { label: "KPI 3 (Optional)", weight: 40, score: 0 },
 ],
 kraMetrics: {
 ownership: 0,
 quality: 0,
 initiative: 0,
 },
 behavioralMetrics: {
 attendance: 0,
 discipline: 0,
 communication: 0,
 },
 remarks: "",
 };
}

function createFormFromScore(score: KpiScore): FormState {
 return {
 month: score.month,
 year: score.year,
 kpiEntries: score.kpi_entries?.length
 ? score.kpi_entries
 : [
 { label: "KPI 1", weight: 30, score: score.kpi_score ?? 0 },
 { label: "KPI 2", weight: 30, score: score.kpi_score ?? 0 },
 { label: "KPI 3 (Optional)", weight: 40, score: score.kpi_score ?? 0 },
 ],
 kraMetrics: score.kra_metrics ?? {
 ownership: Math.round((score.kra_score ?? 0) / 20),
 quality: Math.round((score.kra_score ?? 0) / 20),
 initiative: Math.round((score.kra_score ?? 0) / 20),
 },
 behavioralMetrics: score.behavioral_metrics ?? {
 attendance: score.behavioral_score ?? 0,
 discipline: 0,
 communication: 0,
 },
 remarks: score.remarks ?? "",
 };
}

function ProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
 return (
 <div className="h-4 rounded-full bg-theme-surface/80">
 <div
 className={`h-4 rounded-full ${colorClass}`}
 style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
 />
 </div>
 );
}

export default function AdminKpiPage() {
 const { user } = useAuth();
 const today = new Date();
 const [users, setUsers] = useState<User[]>([]);
 const [scores, setScores] = useState<KpiScore[]>([]);
 const [selectedUser, setSelectedUser] = useState("");
 const [loadingUsers, setLoadingUsers] = useState(true);
 const [loadingScores, setLoadingScores] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [form, setForm] = useState<FormState>(createDefaultForm(today.getMonth() + 1, today.getFullYear()));

 const canEdit = user?.role === "super_admin" || user?.role === "lead";

 useEffect(() => {
 setLoadingUsers(true);
 axios
 .get("/api/users?role=employee&limit=100")
 .then((res) => setUsers(res.data.users ?? []))
 .finally(() => setLoadingUsers(false));
 }, []);

 useEffect(() => {
 if (!selectedUser) {
 setScores([]);
 return;
 }

 setLoadingScores(true);
 axios
 .get(`/api/kpi?employeeId=${selectedUser}`)
 .then((res) => setScores(res.data.scores ?? []))
 .finally(() => setLoadingScores(false));
 }, [selectedUser]);

 useEffect(() => {
 if (!selectedUser) return;
 const existingScore = scores.find((score) => score.month === form.month && score.year === form.year);
 if (!existingScore) return;

 const nextForm = createFormFromScore(existingScore);
 const currentState = JSON.stringify(form);
 const nextState = JSON.stringify(nextForm);
 if (currentState !== nextState) {
 setForm(nextForm);
 }
 }, [selectedUser, scores, form]);

 const kpiScore = useMemo(() => calculateWeightedKpi(form.kpiEntries), [form.kpiEntries]);
 const kraScore = useMemo(() => calculateKraScore(form.kraMetrics), [form.kraMetrics]);
 const behavioralScore = useMemo(
 () => calculateBehavioralScore(form.behavioralMetrics),
 [form.behavioralMetrics]
 );
 const finalScore = useMemo(
 () => calculateFinalKpiScore(kpiScore, kraScore, behavioralScore),
 [kpiScore, kraScore, behavioralScore]
 );
 const rating = useMemo(() => getKpiRating(finalScore), [finalScore]);
 const selectedEmployee = users.find((employee) => employee._id === selectedUser);
 const currentRecord = scores.find((score) => score.month === form.month && score.year === form.year);

 function updateKpiEntry(index: number, field: "weight" | "score", value: number) {
 setForm((current) => ({
 ...current,
 kpiEntries: current.kpiEntries.map((entry, entryIndex) =>
 entryIndex === index ? { ...entry, [field]: value } : entry
 ),
 }));
 }

 function updateKraMetric(field: keyof KraMetricsInput, value: number) {
 setForm((current) => ({
 ...current,
 kraMetrics: {
 ...current.kraMetrics,
 [field]: value,
 },
 }));
 }

 function updateBehaviorMetric(field: keyof BehavioralMetricsInput, value: number) {
 setForm((current) => ({
 ...current,
 behavioralMetrics: {
 ...current.behavioralMetrics,
 [field]: value,
 },
 }));
 }

 function resetForPeriod(month: number, year: number) {
 const existingScore = scores.find((score) => score.month === month && score.year === year);
 setForm(existingScore ? createFormFromScore(existingScore) : createDefaultForm(month, year));
 }

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!selectedUser) {
 alert("Select an employee");
 return;
 }
 if (!canEdit) {
 alert("Only admin and lead can edit KPI / KRA entries.");
 return;
 }

 setSubmitting(true);
 try {
 await axios.post("/api/kpi", {
 employee: selectedUser,
 month: form.month,
 year: form.year,
 kpi_entries: form.kpiEntries,
 kra_metrics: form.kraMetrics,
 behavioral_metrics: form.behavioralMetrics,
 remarks: form.remarks,
 });

 const res = await axios.get(`/api/kpi?employeeId=${selectedUser}`);
 setScores(res.data.scores ?? []);
 alert("KPI / KRA score saved");
 } catch (err: unknown) {
 alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
 } finally {
 setSubmitting(false);
 }
 }

 return (
 <DashboardShell 
 title="Performance Engineering" 
 subtitle="Executive assessment interface for individual talent scoring and organizational alignment"
 actions={
 <div className="flex gap-3">
 <button
 onClick={handleSubmit}
 disabled={submitting || !canEdit || !selectedUser}
 className="flex items-center gap-2 rounded-xl bg-theme-primary text-white dark:text-theme-fg px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl disabled:opacity-50"
 >
 {submitting ? "Synchronizing..." : "Authorize Score"}
 </button>
 </div>
 }
 >
 <div className="flex flex-col gap-10">
 {!canEdit && (
 <div className="rounded-2xl border-2 border-amber-500/20 bg-amber-500/5 p-6 flex items-center gap-4 text-amber-600 dark:text-amber-400">
 <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
 <CircleAlert size={20} strokeWidth={3} />
 </div>
 <div>
 <p className="text-xs font-black uppercase tracking-widest mb-1">Observation Mode Active</p>
 <p className="text-sm font-medium opacity-80">Regulatory restrictions prevent modification of performance data for your current authentication level.</p>
 </div>
 </div>
 )}

 {/* Evaluation Identity */}
 <div className="page-card !mb-0 p-8 shadow-xl border border-default border-t-8 border-t-sky-600">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Personnel Identity</label>
 <div className="relative group">
 <select
 value={selectedUser}
 onChange={(e) => {
 setSelectedUser(e.target.value);
 setForm(createDefaultForm(form.month, form.year));
 }}
 className="w-full appearance-none rounded-xl border border-default bg-[hsl(var(--surface-raised))] pl-4 pr-10 py-3 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all cursor-pointer"
 required
 >
 <option value="">Select Personnel...</option>
 {users.map((employee) => (
 <option key={employee._id} value={employee._id}>
 {employee.name} — {employee.employeeId}
 </option>
 ))}
 </select>
 <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none group-hover:text-sky-600 transition-colors">
 <ChevronDown size={18} strokeWidth={3} />
 </div>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Fiscal Cycle</label>
 <div className="grid grid-cols-2 gap-4">
 <div className="relative group">
 <select
 value={form.month}
 onChange={(e) => resetForPeriod(parseInt(e.target.value, 10), form.year)}
 className="w-full appearance-none rounded-xl border border-default bg-[hsl(var(--surface-raised))] px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all cursor-pointer"
 >
 {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
 </select>
 </div>
 <div className="relative group">
 <select
 value={form.year}
 onChange={(e) => resetForPeriod(form.month, parseInt(e.target.value, 10))}
 className="w-full appearance-none rounded-xl border border-default bg-[hsl(var(--surface-raised))] px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all cursor-pointer"
 >
 {getYearRange().map((y) => <option key={y} value={y}>{y}</option>)}
 </select>
 </div>
 </div>
 </div>

 <div className="flex flex-col justify-end">
 {currentRecord ? (
 <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-sky-500/5 border border-sky-500/20 text-sky-600 transition-all animate-in fade-in slide-in-from-right-4">
 <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
 <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">Revising Active Registry Record</span>
 </div>
 ) : (
 <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-default border border-default text-muted opacity-50">
 <div className="w-2.5 h-2.5 rounded-full bg-muted" />
 <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Identity Definition</span>
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
 {/* Scoring Configuration */}
 <div className="xl:col-span-3 space-y-10">
 {/* KPI Section */}
 <div className="page-card !mb-0 p-8 shadow-xl border border-default relative overflow-hidden group">
 <div className="flex justify-between items-center mb-10">
 <div>
 <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em] mb-1">Key Performance Metrics</h3>
 <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Section Weighting: 40%</p>
 </div>
 <div className="w-16 h-16 rounded-full bg-sky-500/10 border-2 border-sky-500/20 flex items-center justify-center">
 <span className="text-xl font-black text-sky-600">{Math.round(kpiScore)}</span>
 </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {form.kpiEntries.map((entry, index) => (
 <div key={index} className="space-y-6 p-6 rounded-2xl bg-[hsl(var(--surface-raised))] border border-default group/item hover:border-sky-500/30 transition-all shadow-sm">
 <div className="flex justify-between items-start">
 <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{entry.label}</span>
 <span className="text-[9px] font-black text-muted uppercase tracking-widest px-1.5 py-0.5 rounded bg-default border border-default">WT: {entry.weight}%</span>
 </div>
 <div className="space-y-4">
 <div className="relative h-2 w-full bg-default rounded-full overflow-hidden">
 <div className="h-full bg-sky-600 shadow-[0_0_10px_rgba(2,132,199,0.3)] transition-all duration-500" style={{ width: `${entry.score}%` }} />
 </div>
 <div className="flex items-center gap-4">
 <input
 type="range"
 min={0}
 max={100}
 value={entry.score}
 onChange={(e) => updateKpiEntry(index, "score", parseInt(e.target.value, 10))}
 className="flex-1 h-3 bg-transparent rounded-lg appearance-none cursor-pointer accent-sky-600"
 disabled={!canEdit}
 />
 <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-background border border-default font-black text-sm text-foreground shadow-inner">
 {entry.score}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* KRA Section */}
 <div className="page-card !mb-0 p-8 shadow-xl border border-default border-t-8 border-t-emerald-500 group">
 <div className="flex justify-between items-center mb-10">
 <div>
 <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em] mb-1">Functional Output Units</h3>
 <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Section Weighting: 40%</p>
 </div>
 <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center">
 <span className="text-xl font-black text-emerald-600">{Math.round(kraScore)}</span>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {[
 { key: "ownership" as const, label: "Ownership / Agency" },
 { key: "quality" as const, label: "Execution Quality" },
 { key: "initiative" as const, label: "Strategic Initiative" },
 ].map((m) => (
 <div key={m.key} className="space-y-4">
 <label className="text-[10px] font-black text-muted uppercase tracking-widest block">{m.label}</label>
 <div className="flex gap-2">
 {[1, 2, 3, 4, 5].map((r) => (
 <button
 key={r}
 onClick={() => updateKraMetric(m.key, r)}
 disabled={!canEdit}
 className={`flex-1 h-12 rounded-xl border-2 font-black transition-all ${
 form.kraMetrics[m.key] === r 
 ? "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-105" 
 : "border-default bg-[hsl(var(--surface-raised))] text-muted hover:border-emerald-500/50 hover:text-foreground"
 }`}
 >
 {r}
 </button>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Behavioral Section */}
 <div className="page-card !mb-0 p-8 shadow-xl border border-default border-t-8 border-t-purple-600">
 <div className="flex justify-between items-center mb-10">
 <div>
 <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em] mb-1">Behavioral Integrity</h3>
 <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Section Weighting: 20%</p>
 </div>
 <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-purple-500/20 flex items-center justify-center">
 <span className="text-xl font-black text-purple-600">{Math.round(behavioralScore)}</span>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
 <div className="space-y-4">
 <label className="text-[10px] font-black text-muted uppercase tracking-widest block">Cycle Attendance Reality</label>
 <div className="grid grid-cols-4 gap-2">
 {[100, 95, 90, 85, 80, 75, 70, 60].map(a => (
 <button
 key={a}
 onClick={() => updateBehaviorMetric("attendance", a)}
 disabled={!canEdit}
 className={`py-2 px-1 rounded-lg border-2 text-[11px] font-black transition-all ${
 form.behavioralMetrics.attendance === a 
 ? "bg-purple-600 border-purple-700 text-white shadow-lg shadow-purple-600/20" 
 : "border-default bg-[hsl(var(--surface-raised))] text-muted hover:border-purple-500/30"
 }`}
 >
 {a}%
 </button>
 ))}
 </div>
 </div>
 
 {[
 { key: "discipline" as const, label: "Operational Discipline" },
 { key: "communication" as const, label: "Stakeholder Comms" },
 ].map((m) => (
 <div key={m.key} className="space-y-4">
 <label className="text-[10px] font-black text-muted uppercase tracking-widest block">{m.label}</label>
 <div className="flex gap-2">
 {[1, 2, 3, 4, 5].map((r) => (
 <button
 key={r}
 onClick={() => updateBehaviorMetric(m.key, r)}
 disabled={!canEdit}
 className={`flex-1 h-12 rounded-xl border-2 font-black transition-all ${
 form.behavioralMetrics[m.key] === r 
 ? "bg-purple-600 border-purple-700 text-white shadow-lg shadow-purple-600/20 scale-105" 
 : "border-default bg-[hsl(var(--surface-raised))] text-muted hover:border-purple-500/50 hover:text-foreground"
 }`}
 >
 {r}
 </button>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="page-card !mb-0 p-8 shadow-xl border border-default">
 <label className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-4 block">Executive Evaluation Narrative</label>
 <textarea
 value={form.remarks}
 onChange={(e) => setForm(c => ({ ...c, remarks: e.target.value }))}
 className="w-full min-h-[140px] rounded-2xl border-2 border-default bg-[hsl(var(--surface-raised))] p-6 text-sm font-medium text-foreground outline-none focus:border-sky-500 transition-all placeholder:italic placeholder:opacity-30"
 placeholder="Document critical highlights, performance bottlenecks, and trajectory improvements..."
 disabled={!canEdit}
 />
 </div>
 </div>

 {/* Real-time Assessment Sidebar */}
 <div className="space-y-8">
 <div className="page-card !mb-0 p-8 shadow-2xl border border-default border-t-8 border-t-slate-900 dark:border-t-slate-100 sticky top-8">
 <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-10">Aggregate Evaluation</h3>
 
 <div className="flex flex-col items-center mb-10">
 <div className="relative group/gauge flex items-center justify-center h-48 w-48">
 <div className="absolute inset-0 bg-sky-500/5 blur-3xl rounded-full" />
 <svg className="h-full w-full -rotate-90">
 <circle cx="96" cy="96" r="84" fill="none" stroke="currentColor" strokeWidth="12" className="text-default" />
 <circle cx="96" cy="96" r="84" fill="none" stroke="url(#result-gradient)" strokeWidth="12" 
 strokeDasharray="528" strokeDashoffset={528 - (528 * finalScore) / 100}
 strokeLinecap="round"
 className="transition-all duration-1000" />
 <defs>
 <linearGradient id="result-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
 <stop offset="0%" stopColor="var(--sky-500)" />
 <stop offset="100%" stopColor="var(--indigo-600)" />
 </linearGradient>
 </defs>
 </svg>
 <div className="absolute flex flex-col items-center">
 <span className="text-5xl font-black text-foreground tracking-tighter">{Math.round(finalScore)}</span>
 <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">{rating.label}</span>
 </div>
 </div>
 </div>

 <div className="space-y-6">
 {[
 { label: "Core KPI Yield", value: Math.round(kpiScore), color: "sky" },
 { label: "KRA Metric", value: Math.round(kraScore), color: "emerald" },
 { label: "Integrity Index", value: Math.round(behavioralScore), color: "purple" },
 ].map(stat => (
 <div key={stat.label} className="space-y-2">
 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
 <span className="text-muted">{stat.label}</span>
 <span className={`text-${stat.color}-600`}>{stat.value}%</span>
 </div>
 <div className="h-1.5 w-full bg-default rounded-full overflow-hidden">
 <div className={`h-full bg-${stat.color}-500 transition-all duration-1000`} style={{ width: `${stat.value}%` }} />
 </div>
 </div>
 ))}
 
 <div className="pt-8 border-t border-default">
 <p className="text-[10px] text-muted font-bold text-center leading-relaxed italic opacity-60">
 Initialing this score will permanently record it in the cycle ledger and affect incentive distribution.
 </p>
 </div>
 </div>
 </div>

 {/* Evaluation Registry History */}
 <div className="page-card !mb-0 p-8 shadow-xl border border-default">
 <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-6">Evaluation Registry History</h3>
 <div className="space-y-4">
 {!selectedUser ? (
 <div className="text-center py-12 px-4 border-2 border-dashed border-default rounded-3xl opacity-30 flex flex-col items-center gap-4">
 <Gauge size={40} strokeWidth={1} />
 <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Identity definition required to retrieve registry logs</p>
 </div>
 ) : loadingScores ? (
 <div className="animate-pulse space-y-4">
 {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[hsl(var(--surface-raised))] rounded-2xl border border-default" />)}
 </div>
 ) : scores.length === 0 ? (
 <div className="text-center py-12 opacity-30 flex flex-col items-center gap-4 border border-default rounded-3xl">
 <CircleAlert size={32} strokeWidth={1} />
 <p className="text-[10px] font-black uppercase tracking-widest">No historical evaluation data found</p>
 </div>
 ) : (
 scores.slice(0, 5).map((score) => (
 <button
 key={score._id}
 onClick={() => setForm(createFormFromScore(score))}
 className="w-full group text-left p-5 rounded-2xl border border-default bg-[hsl(var(--surface-raised))] hover:border-sky-500/50 hover:bg-surface transition-all shadow-sm"
 >
 <div className="flex justify-between items-center mb-3">
 <span className="text-[11px] font-black text-foreground uppercase tracking-widest">
 {new Date(score.year, score.month - 1).toLocaleString("en-IN", { month: "short", year: "numeric" })}
 </span>
 <div className="px-2 py-0.5 rounded-lg bg-sky-600/10 text-sky-600 text-[10px] font-black group-hover:scale-110 transition-transform">
 {score.final_score}%
 </div>
 </div>
 <div className="grid grid-cols-3 gap-2 opacity-60">
 <div className="text-[9px] font-black uppercase tracking-tighter">KPI: {score.kpi_score}</div>
 <div className="text-[9px] font-black uppercase tracking-tighter">KRA: {score.kra_score}</div>
 <div className="text-[9px] font-black uppercase tracking-tighter text-right">BEH: {score.behavioral_score ?? 0}</div>
 </div>
 </button>
 ))
 )}
 </div>
 </div>
 </div>
 </div>

 {selectedEmployee && (
 <div className="flex justify-center border-t border-default pt-8 opacity-40">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 <span className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">
 Synchronized Context: {selectedEmployee.name} // {selectedEmployee.department} // {selectedEmployee.employeeId}
 </span>
 </div>
 </div>
 )}
 </div>
 </DashboardShell>
 );
}
