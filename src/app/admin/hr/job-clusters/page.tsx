"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  Network, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Briefcase,
  Layers,
  Cpu,
  BrainCircuit,
  Settings2,
  Trash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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

export default function JobClustersPage() {
  const [clusters, setClusters] = useState<JobCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<JobCluster | null>(null);
  const { showToast } = useToast();

  // Form State
  const [formData, setFormData] = useState({
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
    active: true
  });

  useEffect(() => {
    fetchClusters();
    
    const channel = supabase
      .channel('job-clusters-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_clusters' }, () => {
        fetchClusters();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      console.error("Error fetching clusters:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        job_title_variants: formData.job_title_variants.split(",").map(s => s.trim()),
        gemma_keywords: formData.gemma_keywords.split(",").map(s => s.trim()),
      };

      if (editingCluster) {
        const { error } = await supabase
          .from("job_clusters")
          .update(payload)
          .eq("id", editingCluster.id);
        if (error) throw error;
        showToast("Cluster updated successfully", "success");
      } else {
        const { error } = await supabase
          .from("job_clusters")
          .insert(payload);
        if (error) throw error;
        showToast("Cluster created successfully", "success");
      }
      
      setIsSlideOverOpen(false);
      resetForm();
    } catch (err: any) {
      showToast(err.message || "Failed to save cluster", "error");
    }
  };

  const resetForm = () => {
    setEditingCluster(null);
    setFormData({
      cluster_id: "",
      company: "Namaah Tech",
      job_title_variants: "",
      mandatory_skills: [],
      preferred_skills: [],
      domain_knowledge: [],
      experience_requirements: { years_required: 0, seniority_levels: ["Junior"] },
      education: { required: "Bachelor's", preferred: "Master's" },
      match_weights: { technical_skills: 40, domain_knowledge: 25, experience_years: 20, education: 15 },
      gemma_keywords: "",
      active: true
    });
  };

  const handleEdit = (cluster: JobCluster) => {
    setEditingCluster(cluster);
    setFormData({
      ...cluster,
      job_title_variants: cluster.job_title_variants.join(", "),
      gemma_keywords: cluster.gemma_keywords.join(", ")
    } as any);
    setIsSlideOverOpen(true);
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("job_clusters")
        .update({ active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      showToast(`Cluster ${!currentStatus ? 'activated' : 'deactivated'}`, "success");
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  const filteredClusters = clusters.filter(c => 
    c.cluster_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.job_title_variants.some(v => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DashboardShell
      title="Job Intelligence Clusters"
      subtitle="Define neural alignment matrices and job profile architectures."
      actions={
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setIsSlideOverOpen(true); }}>
          <Plus size={14} className="mr-2" /> Define New Cluster
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="page-card py-3 px-4 flex items-center gap-4 border-theme-border/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={16} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by cluster ID or job title..."
              className="h-10 w-full rounded-xl border border-theme-border bg-theme-page pl-10 pr-4 text-sm font-medium text-theme-fg outline-none focus:border-theme-primary transition-all"
            />
          </div>
        </div>

        {/* Clusters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClusters.map(cluster => (
            <div key={cluster.id} className="page-card group hover:border-theme-primary/50 transition-all p-0 overflow-hidden border-theme-border/50">
               <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                     <div className="h-10 w-10 rounded-xl bg-theme-primary/10 flex items-center justify-center text-theme-primary">
                        <Network size={20} />
                     </div>
                     <button 
                       onClick={() => toggleActive(cluster.id, cluster.active)}
                       className={cn(
                         "h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                         cluster.active ? "bg-emerald-500/10 text-emerald-600" : "bg-theme-raised text-theme-muted"
                       )}
                     >
                        {cluster.active ? "Active" : "Disabled"}
                     </button>
                  </div>

                  <div>
                     <h3 className="text-lg font-black text-theme-fg uppercase tracking-tight truncate">{cluster.job_title_variants[0]}</h3>
                     <p className="text-[10px] font-bold text-theme-primary uppercase tracking-[0.2em]">{cluster.cluster_id}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                     {cluster.gemma_keywords.slice(0, 5).map(k => (
                        <span key={k} className="px-2 py-0.5 rounded-md bg-theme-raised text-[9px] font-bold text-theme-muted uppercase">
                           {k}
                        </span>
                     ))}
                     {cluster.gemma_keywords.length > 5 && (
                        <span className="text-[9px] font-bold text-theme-subtle">+{cluster.gemma_keywords.length - 5}</span>
                     )}
                  </div>
               </div>

               <div className="px-6 py-4 bg-theme-raised/10 border-t border-theme-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-theme-muted">
                     <div className="flex items-center gap-1 text-[10px] font-bold uppercase">
                        <Briefcase size={12} /> {cluster.experience_requirements.years_required}+ yrs
                     </div>
                     <div className="flex items-center gap-1 text-[10px] font-bold uppercase">
                        <Cpu size={12} /> {cluster.mandatory_skills.length} skills
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                       onClick={() => handleEdit(cluster)}
                       className="h-8 w-8 rounded-lg hover:bg-theme-primary/10 hover:text-theme-primary flex items-center justify-center text-theme-muted transition-all"
                     >
                        <Edit2 size={14} />
                     </button>
                  </div>
               </div>
            </div>
          ))}
        </div>

        {/* Slide-over Form */}
        <SlideOver
          isOpen={isSlideOverOpen}
          onClose={() => setIsSlideOverOpen(false)}
          title={editingCluster ? "Modify Intelligence Cluster" : "Define New Intelligence Cluster"}
          subtitle="Configure neural alignment parameters for candidate auditing."
        >
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Cluster ID</label>
                  <input 
                    required
                    value={formData.cluster_id}
                    onChange={(e) => setFormData({ ...formData, cluster_id: e.target.value })}
                    placeholder="e.g. NAMAAH-FRONTEND-REACT"
                    className="h-12 w-full rounded-2xl border border-theme-border bg-theme-page px-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary transition-all"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Company Target</label>
                  <input 
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="h-12 w-full rounded-2xl border border-theme-border bg-theme-page px-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary transition-all"
                  />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Job Title Variants (Comma separated)</label>
               <input 
                 required
                 value={formData.job_title_variants}
                 onChange={(e) => setFormData({ ...formData, job_title_variants: e.target.value })}
                 placeholder="Full Stack Developer, Senior React Engineer, Frontend Lead"
                 className="h-12 w-full rounded-2xl border border-theme-border bg-theme-page px-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary transition-all"
               />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Neural Keywords for Gemma4 (Comma separated)</label>
               <textarea 
                 required
                 value={formData.gemma_keywords}
                 onChange={(e) => setFormData({ ...formData, gemma_keywords: e.target.value })}
                 placeholder="react, typescript, node.js, architecture, ci/cd..."
                 className="h-24 w-full rounded-2xl border border-theme-border bg-theme-page p-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary transition-all resize-none"
               />
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Required Experience (Years)</label>
                  <input 
                    type="number"
                    value={formData.experience_requirements.years_required}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      experience_requirements: { ...formData.experience_requirements, years_required: parseInt(e.target.value) } 
                    })}
                    className="h-12 w-full rounded-2xl border border-theme-border bg-theme-page px-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary transition-all"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Match Weights (Technical %)</label>
                  <input 
                    type="number"
                    value={formData.match_weights.technical_skills}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      match_weights: { ...formData.match_weights, technical_skills: parseInt(e.target.value) } 
                    })}
                    className="h-12 w-full rounded-2xl border border-theme-border bg-theme-page px-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary transition-all"
                  />
               </div>
            </div>

            <div className="pt-4 border-t border-theme-border">
               <Button 
                 type="submit" 
                 variant="primary" 
                 className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em]"
               >
                 {editingCluster ? "Update Intelligence Matrix" : "Publish Intelligence Cluster"}
               </Button>
            </div>
          </form>
        </SlideOver>
      </div>
    </DashboardShell>
  );
}
