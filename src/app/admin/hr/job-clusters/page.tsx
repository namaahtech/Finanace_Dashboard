"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Network, Plus, Search, Edit2, Briefcase, Cpu, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { SlideOver } from "@/components/ui/SlideOver";

interface JobCluster {
  id: number;
  cluster_id: string;
  company: string;
  job_title_variants: string[];
  mandatory_skills: any[];
  preferred_skills: any[];
  domain_knowledge: any[];
  experience_requirements: any;
  education: any;
  match_weights: any;
  gemma_keywords: string[];
  active: boolean;
  created_at: string;
}

const defaultForm = {
  cluster_id: "",
  company: "Namaah Tech",
  job_title_variants: "",
  mandatory_skills: [] as any[],
  preferred_skills: [] as any[],
  domain_knowledge: [] as any[],
  experience_requirements: { years_required: 0, seniority_levels: ["Junior"] },
  education: { required: "Bachelor's", preferred: "Master's" },
  match_weights: { technical_skills: 40, domain_knowledge: 25, experience_years: 20, education: 15 },
  gemma_keywords: "",
  active: true,
};

/* ─── Cluster Card ────────────────────────────────────────────────────────── */
function ClusterCard({ cluster, onEdit, onToggle }: {
  cluster: JobCluster;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="group bg-theme-card border border-theme-border rounded-xl overflow-hidden hover:border-theme-strong hover:shadow-sm transition-all">
      <div className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="h-9 w-9 rounded-lg bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center flex-shrink-0">
            <Network size={16} className="text-theme-primary" />
          </div>
          <button
            onClick={onToggle}
            className={cn(
              "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
              cluster.active
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-theme-raised text-theme-muted border-theme-border",
            )}
          >
            {cluster.active ? "Active" : "Inactive"}
          </button>
        </div>

        {/* Title + ID */}
        <div>
          <h3 className="font-semibold text-sm text-theme-fg truncate">
            {cluster.job_title_variants[0] || cluster.cluster_id}
          </h3>
          <p className="text-[10px] font-medium text-theme-primary mt-0.5">{cluster.cluster_id}</p>
        </div>

        {/* Keywords */}
        <div className="flex flex-wrap gap-1">
          {cluster.gemma_keywords.slice(0, 5).map((k) => (
            <span key={k} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-theme-raised border border-theme-border text-theme-muted">
              {k}
            </span>
          ))}
          {cluster.gemma_keywords.length > 5 && (
            <span className="text-[9px] text-theme-muted font-medium">+{cluster.gemma_keywords.length - 5}</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-theme-border bg-theme-raised/30 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-theme-muted">
          <span className="flex items-center gap-1">
            <Briefcase size={11} /> {cluster.experience_requirements?.years_required ?? 0}+ yrs
          </span>
          <span className="flex items-center gap-1">
            <Cpu size={11} /> {cluster.mandatory_skills?.length ?? 0} skills
          </span>
        </div>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-primary transition-all"
        >
          <Edit2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── Field helper ────────────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-theme-muted">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-theme-strong transition-colors";

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function JobClustersPage() {
  const [clusters, setClusters] = useState<JobCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<JobCluster | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchClusters();
    const channel = supabase
      .channel("job-clusters-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_clusters" }, fetchClusters)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchClusters() {
    try {
      const { data, error } = await supabase
        .from("job_clusters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setClusters(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setSlideOpen(true);
  }

  function openEdit(cluster: JobCluster) {
    setEditing(cluster);
    setForm({
      ...cluster,
      job_title_variants: cluster.job_title_variants.join(", "),
      gemma_keywords: cluster.gemma_keywords.join(", "),
    } as any);
    setSlideOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        job_title_variants: form.job_title_variants.split(",").map(s => s.trim()).filter(Boolean),
        gemma_keywords: form.gemma_keywords.split(",").map(s => s.trim()).filter(Boolean),
      };

      if (editing) {
        const { error } = await supabase.from("job_clusters").update(payload).eq("id", editing.id);
        if (error) throw error;
        showToast("Cluster updated", "success");
      } else {
        const { error } = await supabase.from("job_clusters").insert(payload);
        if (error) throw error;
        showToast("Cluster created", "success");
      }
      setSlideOpen(false);
    } catch (err: any) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, current: boolean) {
    try {
      const { error } = await supabase.from("job_clusters").update({ active: !current }).eq("id", id);
      if (error) throw error;
      showToast(`Cluster ${!current ? "activated" : "deactivated"}`, "success");
    } catch {
      showToast("Failed to update status", "error");
    }
  }

  const filtered = clusters.filter(c =>
    c.cluster_id.toLowerCase().includes(search.toLowerCase()) ||
    c.job_title_variants.some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardShell
      title="Job Clusters"
      subtitle="Define job profiles and matching criteria for candidate screening"
      actions={
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={13} /> New Cluster
        </button>
      }
    >
      <div className="space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total clusters", value: clusters.length },
            { label: "Active",  value: clusters.filter(c => c.active).length },
            { label: "Inactive", value: clusters.filter(c => !c.active).length },
          ].map((s) => (
            <div key={s.label} className="bg-theme-card border border-theme-border rounded-xl p-4">
              <p className="text-xl font-black text-theme-fg tabular-nums">{s.value}</p>
              <p className="text-[11px] text-theme-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by cluster ID or job title…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-theme-strong transition-colors"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-theme-card border border-theme-border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Network size={32} className="text-theme-muted opacity-30" />
            <p className="text-sm font-semibold text-theme-fg">No clusters found</p>
            <button onClick={openCreate} className="text-xs font-semibold text-theme-primary hover:underline">
              Create your first cluster
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((cluster) => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                onEdit={() => openEdit(cluster)}
                onToggle={() => toggleActive(cluster.id, cluster.active)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slide-over form */}
      <SlideOver
        isOpen={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editing ? "Edit Cluster" : "New Cluster"}
        subtitle={editing ? `Editing ${editing.cluster_id}` : "Define a new job profile for candidate matching"}
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cluster ID">
              <input
                required
                value={form.cluster_id}
                onChange={(e) => setForm({ ...form, cluster_id: e.target.value })}
                placeholder="e.g. NAMAAH-FRONTEND"
                className={inputCls}
              />
            </Field>
            <Field label="Company">
              <input
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Job title variants (comma-separated)">
            <input
              required
              value={form.job_title_variants}
              onChange={(e) => setForm({ ...form, job_title_variants: e.target.value })}
              placeholder="Full Stack Developer, Senior React Engineer"
              className={inputCls}
            />
          </Field>

          <Field label="AI matching keywords (comma-separated)">
            <textarea
              required
              value={form.gemma_keywords}
              onChange={(e) => setForm({ ...form, gemma_keywords: e.target.value })}
              placeholder="react, typescript, node.js, architecture"
              rows={3}
              className={cn(inputCls, "resize-none")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Required experience (years)">
              <input
                type="number"
                min={0}
                value={form.experience_requirements.years_required}
                onChange={(e) => setForm({
                  ...form,
                  experience_requirements: { ...form.experience_requirements, years_required: parseInt(e.target.value) || 0 },
                })}
                className={inputCls}
              />
            </Field>
            <Field label="Technical skills weight (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={form.match_weights.technical_skills}
                onChange={(e) => setForm({
                  ...form,
                  match_weights: { ...form.match_weights, technical_skills: parseInt(e.target.value) || 0 },
                })}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setForm({ ...form, active: !form.active })}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                form.active ? "bg-theme-primary" : "bg-theme-raised border border-theme-border",
              )}
            >
              <span className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                form.active ? "translate-x-4" : "translate-x-1",
              )} />
            </button>
            <span className="text-xs font-medium text-theme-fg">Cluster active</span>
          </div>

          <div className="pt-4 border-t border-theme-border">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-theme-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : editing ? "Update Cluster" : "Create Cluster"}
            </button>
          </div>
        </form>
      </SlideOver>
    </DashboardShell>
  );
}
