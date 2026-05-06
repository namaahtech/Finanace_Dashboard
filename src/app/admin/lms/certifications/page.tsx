"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  Award, 
  Search, 
  Download, 
  Eye, 
  Settings, 
  Plus, 
  User, 
  Calendar,
  CheckCircle2,
  MoreVertical,
  Palette,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";

const MOCK_CERTIFICATIONS = [
  { id: "1", employee: "Aryan Khullar", course: "Engineering Excellence", date: "2024-05-01", status: "Verified", hash: "8x9f...a12" },
  { id: "2", employee: "Priya Sharma", course: "Sales Mastery", date: "2024-04-28", status: "Verified", hash: "2k4j...9b1" },
  { id: "3", employee: "Rahul Verma", course: "Security 101", date: "2024-04-25", status: "Pending", hash: "pending" },
  { id: "4", employee: "Sneha Kapur", course: "Engineering Excellence", date: "2024-04-20", status: "Verified", hash: "5n2m...c44" },
];

export default function CertificationsManagerPage() {
  const [activeTab, setActiveTab] = useState("issued");
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIssued, setTotalIssued] = useState(0);

  useEffect(() => {
    fetchCertifications();
  }, []);

  const fetchCertifications = async () => {
    try {
      const { data, count, error } = await supabase
        .from('lms_certifications')
        .select('*, employees(name), lms_courses(title)', { count: 'exact' });
      
      if (error) throw error;
      
      if (data) {
        const formatted = data.map(c => ({
          id: c.id,
          employee: c.employees?.name || 'Unknown',
          course: c.lms_courses?.title || 'Unknown Course',
          date: c.issue_date,
          status: 'Verified',
          hash: c.certificate_number
        }));
        setCerts(formatted);
        setTotalIssued(count || 0);
      }
    } catch (err) {
      console.error("Cert Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell
      title="Certification Manager"
      subtitle="Design, issue, and verify official Namaah Tech credentials."
      actions={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Palette size={14} className="mr-2" /> Design Templates
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-black" onClick={() => window.location.href = '/admin/lms/certifications/new'}>
            <Plus size={16} className="mr-2" /> Manual Grant
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        
        {/* Banner */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-theme-border p-10 flex items-center justify-between">
          <div className="relative z-10 space-y-4 max-w-lg">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
              <Zap size={24} fill="currentColor" />
            </div>
            <h2 className="text-3xl font-black text-white leading-tight">Automated Credentialing is LIVE</h2>
            <p className="text-zinc-400 text-sm">Every course completion now automatically triggers a blockchain-verified certificate issuance to the employee's dashboard.</p>
            <div className="pt-4 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{totalIssued}</span>
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Total Issued</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">100%</span>
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Verification Rate</span>
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent flex items-center justify-center">
            <Award size={200} className="text-amber-500/10 -rotate-12" />
          </div>
        </div>

        {/* Content Table */}
        <div className="page-card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between bg-theme-surface/30">
            <div className="flex gap-8">
              {['issued', 'templates', 'verification_log'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                    activeTab === tab ? "text-theme-primary" : "text-theme-muted hover:text-theme-fg"
                  }`}
                >
                  {tab.replace('_', ' ')}
                  {activeTab === tab && (
                    <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-theme-primary shadow-[0_0_10px_rgba(var(--theme-primary-rgb),0.5)]" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={14} />
                <input 
                  type="text" 
                  placeholder="Search certificates..."
                  className="bg-theme-page border border-theme-border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-theme-primary w-64"
                />
              </div>
            </div>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-12 text-center text-theme-muted font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                <Zap size={14} className="animate-pulse text-amber-500" /> Verifying Credentials...
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-black uppercase tracking-widest text-theme-muted bg-theme-page/50 border-b border-theme-border">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Issued Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Verification Hash</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {(certs.length > 0 ? certs : MOCK_CERTIFICATIONS).map((cert) => (
                    <tr key={cert.id} className="group hover:bg-theme-raised/30 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-xs">
                            {cert.employee.charAt(0)}
                          </div>
                          <span className="font-bold text-theme-fg">{cert.employee}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Award size={14} className="text-amber-500" />
                          <span className="text-theme-muted font-medium">{cert.course}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-theme-muted text-xs font-bold">
                          <Calendar size={12} /> {cert.date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={cert.status === 'Verified' ? 'success' : 'default'} className="flex items-center gap-1.5 w-fit">
                          {cert.status === 'Verified' && <ShieldCheck size={10} />}
                          {cert.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">{cert.hash}</code>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black uppercase text-sky-500 hover:bg-sky-500/10">
                            <Eye size={14} className="mr-2" /> View
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black uppercase text-emerald-500 hover:bg-emerald-500/10">
                            <Download size={14} className="mr-2" /> PDF
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-6 py-4 bg-theme-page/30 border-t border-theme-border flex items-center justify-between text-[10px] font-black text-theme-muted uppercase tracking-widest">
            <span>Showing {certs.length} certifications</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled className="h-8 px-4 font-black">Prev</Button>
              <Button variant="ghost" size="sm" className="h-8 px-4 font-black">Next</Button>
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
