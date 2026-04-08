"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import axios from "axios";

interface Reimbursement {
 _id: string;
 title: string;
 category: string;
 amount: number;
 description: string;
 status: string;
 reject_reason?: string;
 createdAt: string;
 paid_at?: string;
}

const categories = ["travel", "food", "accommodation", "equipment", "medical", "training", "other"];

export default function ReimbursementsPage() {
 
 const [items, setItems] = useState<Reimbursement[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [form, setForm] = useState({ title: "", category: "travel", amount: "", description: "" });

 async function load() {
 try {
 const res = await axios.get("/api/reimbursements");
 setItems(res.data.reimbursements ?? []);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => { load(); }, []);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setSubmitting(true);
 try {
 await axios.post(
 "/api/reimbursements",
 { ...form, amount: parseFloat(form.amount) }
 );
 setShowForm(false);
 setForm({ title: "", category: "travel", amount: "", description: "" });
 await load();
 } catch (err: unknown) {
 alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
 } finally {
 setSubmitting(false);
 }
 }

 return (
 <DashboardShell title="Reimbursements">
 <div className="mb-4 flex justify-end">
 <Button onClick={() => setShowForm(!showForm)}>
 {showForm ? "Cancel" : "+ New Request"}
 </Button>
 </div>

 {showForm && (
 <Card className="mb-6">
 <CardHeader><CardTitle>New Reimbursement Request</CardTitle></CardHeader>
 <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <div>
 <label className="mb-1 block text-xs font-medium text-theme-fg dark:text-theme-subtle">Title</label>
 <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-theme-fg dark:text-theme-subtle">Category</label>
 <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
 {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
 </select>
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-theme-fg dark:text-theme-subtle">Amount (₹)</label>
 <input type="number" min="1" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-theme-fg dark:text-theme-subtle">Description</label>
 <input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
 </div>
 <div className="sm:col-span-2 flex justify-end">
 <Button type="submit" loading={submitting}>Submit Request</Button>
 </div>
 </form>
 </Card>
 )}

 <Card>
 <CardHeader><CardTitle>My Requests</CardTitle></CardHeader>
 {loading ? (
 <div className="py-12 text-center text-sm text-theme-subtle">Loading...</div>
 ) : items.length === 0 ? (
 <div className="py-12 text-center text-sm text-theme-subtle">No reimbursement requests yet.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-theme-border dark:border-theme-border text-left text-xs text-theme-muted">
 <th className="pb-3 pr-4">Title</th>
 <th className="pb-3 pr-4">Category</th>
 <th className="pb-3 pr-4">Amount</th>
 <th className="pb-3 pr-4">Status</th>
 <th className="pb-3">Submitted</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
 {items.map((item) => (
 <tr key={item._id}>
 <td className="py-3 pr-4 font-medium">{item.title}</td>
 <td className="py-3 pr-4 capitalize text-theme-muted">{item.category}</td>
 <td className="py-3 pr-4">{formatCurrency(item.amount)}</td>
 <td className="py-3 pr-4">
 <div>
 <Badge variant={statusBadgeVariant(item.status)}>
 {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
 </Badge>
 {item.reject_reason && (
 <p className="mt-1 text-xs text-red-500">{item.reject_reason}</p>
 )}
 </div>
 </td>
 <td className="py-3 text-theme-muted">{formatDate(item.createdAt)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </Card>

 <style jsx>{`
 .input-field {
 width: 100%;
 border-radius: 0.5rem;
 border: 1px solid #e5e7eb;
 background: white;
 padding: 0.5rem 0.75rem;
 font-size: 0.875rem;
 color: #111827;
 }
 :global(.dark) .input-field {
 border-color: #374151;
 background: #1f2937;
 color: #f9fafb;
 }
 .input-field:focus {
 outline: none;
 border-color: #0ea5e9;
 box-shadow: 0 0 0 3px rgb(14 165 233 / 0.2);
 }
 `}</style>
 </DashboardShell>
 );
}
