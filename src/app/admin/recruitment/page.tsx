"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  TrendingUp,
  BrainCircuit,
  Plus,
  Mail,
  Phone,
  FileText
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  experience: string;
  status: "PROCEED" | "HOLD" | "REJECTED";
  score: number;
  appliedDate: string;
}

const MOCK_CANDIDATES: Candidate[] = [
  {
    id: "can_1",
    name: "Aravind Kumar",
    email: "aravind.k@example.com",
    phone: "+91 98765 43210",
    role: "Senior React Developer",
    experience: "5 Years",
    status: "PROCEED",
    score: 88,
    appliedDate: "2026-04-25"
  },
  {
    id: "can_2",
    name: "Sanya Malhotra",
    email: "sanya.m@example.com",
    phone: "+91 87654 32109",
    role: "UI/UX Designer",
    experience: "3 Years",
    status: "HOLD",
    score: 72,
    appliedDate: "2026-04-26"
  },
  {
    id: "can_3",
    name: "Rahul Sharma",
    email: "rahul.s@example.com",
    phone: "+91 76543 21098",
    role: "Node.js Backend Engineer",
    experience: "4 Years",
    status: "REJECTED",
    score: 45,
    appliedDate: "2026-04-24"
  }
];

export default function RecruitmentHubPage() {
  const [candidates, setCandidates] = useState<Candidate[]>(MOCK_CANDIDATES);
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useToast();

  const handleStatusChange = (id: string, newStatus: Candidate["status"]) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    showToast(`Candidate status updated to ${newStatus}`, "success");
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardShell
      title="Recruitment Intelligence Hub"
      subtitle="Autonomous talent acquisition and candidate decision matrix."
      actions={
        <Button variant="primary" size="sm">
          <Plus size={14} className="mr-2" /> Post New Job
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Active Openings", value: "12", icon: Briefcase, color: "text-theme-primary", bg: "bg-theme-primary/10" },
            { label: "Total Applicants", value: "148", icon: Users, color: "text-sky-600", bg: "bg-sky-500/10" },
            { label: "Proceeding", value: "34", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Avg. Match Score", value: "76%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-500/10" },
          ].map((stat, i) => (
            <div key={i} className="page-card flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">{stat.label}</p>
                <p className="text-xl font-black text-theme-fg">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="page-card py-3 px-4 flex flex-col md:flex-row items-center gap-4 border-theme-border/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={16} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by candidate name or role..."
              className="h-10 w-full rounded-xl border border-theme-border bg-theme-page pl-10 pr-4 text-sm font-medium text-theme-fg outline-none focus:border-theme-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
             <Button variant="secondary" size="sm" className="flex-1 md:flex-none">
                <Filter size={14} className="mr-2" /> Filters
             </Button>
             <div className="h-8 w-px bg-theme-border mx-1 hidden md:block" />
             <div className="flex items-center gap-1 bg-theme-raised/50 p-1 rounded-lg border border-theme-border">
                <Badge variant="success" className="cursor-pointer hover:opacity-80">Proceed</Badge>
                <Badge variant="warning" className="cursor-pointer hover:opacity-80">Hold</Badge>
                <Badge variant="danger" className="cursor-pointer hover:opacity-80">Rejected</Badge>
             </div>
          </div>
        </div>

        {/* Candidate Matrix */}
        <div className="page-card p-0 overflow-hidden border-theme-border/50">
           <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-raised/5 text-left text-[10px] font-black uppercase tracking-widest text-theme-muted">
                    <th className="px-6 py-4">Candidate Profile</th>
                    <th className="px-6 py-4">Experience</th>
                    <th className="px-6 py-4">Neural Score</th>
                    <th className="px-6 py-4">Decision Matrix</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {filteredCandidates.map(candidate => (
                    <tr key={candidate.id} className="hover:bg-theme-raised/20 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary font-black text-xs border border-theme-primary/20">
                             {candidate.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black text-theme-fg truncate">{candidate.name}</span>
                            <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wide mt-0.5">{candidate.role}</span>
                            <div className="flex items-center gap-3 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                               <div className="flex items-center gap-1 text-[10px] text-theme-muted">
                                  <Mail size={10} /> {candidate.email}
                               </div>
                               <div className="flex items-center gap-1 text-[10px] text-theme-muted">
                                  <Phone size={10} /> {candidate.phone}
                               </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex flex-col">
                            <span className="text-xs font-bold text-theme-fg">{candidate.experience}</span>
                            <span className="text-[10px] text-theme-muted mt-0.5">Applied: {candidate.appliedDate}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-theme-raised rounded-full overflow-hidden">
                               <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-1000",
                                    candidate.score >= 80 ? "bg-emerald-500" : candidate.score >= 60 ? "bg-amber-500" : "bg-rose-500"
                                  )} 
                                  style={{ width: `${candidate.score}%` }} 
                                />
                            </div>
                            <span className={cn(
                              "text-xs font-black",
                              candidate.score >= 80 ? "text-emerald-500" : candidate.score >= 60 ? "text-amber-500" : "text-rose-500"
                            )}>
                               {candidate.score}%
                            </span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleStatusChange(candidate.id, "PROCEED")}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                candidate.status === "PROCEED" 
                                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                  : "bg-theme-raised text-theme-muted hover:bg-emerald-500/10 hover:text-emerald-600"
                              )}
                            >
                               <CheckCircle2 size={12} /> Proceed
                            </button>
                            <button 
                              onClick={() => handleStatusChange(candidate.id, "HOLD")}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                candidate.status === "HOLD" 
                                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                  : "bg-theme-raised text-theme-muted hover:bg-amber-500/10 hover:text-amber-600"
                              )}
                            >
                               <Clock size={12} /> Hold
                            </button>
                            <button 
                              onClick={() => handleStatusChange(candidate.id, "REJECTED")}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                candidate.status === "REJECTED" 
                                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                                  : "bg-theme-raised text-theme-muted hover:bg-rose-500/10 hover:text-rose-600"
                              )}
                            >
                               <XCircle size={12} /> Reject
                            </button>
                         </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="sm" className="h-8 w-8 p-0 rounded-lg">
                               <FileText size={14} />
                            </Button>
                            <Button variant="secondary" size="sm" className="h-8 w-8 p-0 rounded-lg">
                               <MoreVertical size={14} />
                            </Button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                         <div className="flex flex-col items-center">
                            <div className="h-16 w-16 rounded-full bg-theme-raised flex items-center justify-center text-theme-muted mb-4 opacity-50">
                               <Users size={32} />
                            </div>
                            <p className="text-sm font-bold text-theme-muted uppercase tracking-widest">No candidates matching search</p>
                            <p className="text-[11px] text-theme-subtle mt-1">Adjust your filters or neural alignment parameters.</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
           <div className="bg-theme-raised/5 px-6 py-4 border-t border-theme-border flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Showing {filteredCandidates.length} potential hires</span>
              <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-theme-primary animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-theme-primary">Neural Engine Active</span>
              </div>
           </div>
        </div>
      </div>
    </DashboardShell>
  );
}
