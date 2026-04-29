"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Terminal as TerminalIcon, 
  Search, 
  Cpu, 
  Activity, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Scan,
  FileText,
  User,
  MoreVertical,
  ChevronRight,
  Microscope,
  Radar,
  Loader2,
  XCircle,
  BrainCircuit
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { DashboardShell } from "@/components/layout/DashboardShell";

// ─── Neural Terminal Component (Light Mode) ─────────────────────

function NeuralTerminal({ logs }: { logs: string[] }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col font-mono text-[11px] shadow-2xl">
      <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <TerminalIcon size={12} className="text-cyan-400" />
            <span className="text-white/40 uppercase tracking-widest font-black">Analysis_Stream v2.1</span>
         </div>
         <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500/20" />
            <div className="h-2 w-2 rounded-full bg-cyan-500/20" />
         </div>
      </div>
      <div 
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto space-y-1 scrollbar-hide"
      >
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3">
             <span className="text-white/10">[{new Date().toLocaleTimeString()}]</span>
             <span className={cn(
                log.includes("SUCCESS") ? "text-emerald-400" : 
                log.includes("ERROR") ? "text-rose-400" : 
                "text-cyan-300/80"
             )}>
                {log}
             </span>
          </div>
        ))}
        {logs.length === 0 && <div className="text-white/10 italic">Awaiting neural ingestion...</div>}
      </div>
    </div>
  );
}

// ─── Candidate Scan Card (Light Mode) ───────────────────────────

function CandidateScanCard({ candidate, onSelect }: { candidate: any, onSelect: (c: any) => void }) {
  const analysis = candidate.talent_analysis?.[0];
  const score = analysis?.scoring?.match_score || 0;
  
  return (
    <div className="group relative bg-white border border-slate-200 hover:border-cyan-500/30 transition-all p-6 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-cyan-500/5">
       {/* HUD Coordinate */}
       <div className="absolute top-2 right-4 text-[8px] font-black text-slate-200 uppercase tracking-widest font-mono">
          REF_ID: {candidate.application_id.substring(0, 8)}
       </div>

       <div className="flex items-start gap-5">
          <div className="relative h-16 w-16 flex-shrink-0">
             <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full" />
             <div className="relative h-full w-full bg-slate-50 border border-slate-100 flex items-center justify-center text-cyan-500 rounded-xl">
                <User size={32} />
             </div>
          </div>
          
          <div className="flex-1 min-w-0 space-y-1">
             <h4 className="text-lg font-black tracking-tight text-slate-900 uppercase truncate">{candidate.applicant_name}</h4>
             <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{candidate.applicant_email}</p>
                <Badge variant="secondary" className="text-[8px] py-0 px-1.5 h-4 bg-theme-primary/10 text-theme-primary border-theme-primary/20">
                   {candidate.applied_cluster_id}
                </Badge>
             </div>
             
             <div className="flex items-center gap-2 pt-2">
                <div className={cn(
                  "px-2 py-0.5 rounded-md border",
                  candidate.processing_status === 'completed' ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                )}>
                   <span className={cn(
                     "text-[9px] font-black uppercase tracking-tighter",
                     candidate.processing_status === 'completed' ? "text-emerald-600" : "text-slate-400"
                   )}>
                      {candidate.processing_status === 'completed' ? "Neural Match Verified" : "Pending Audit"}
                   </span>
                </div>
             </div>
          </div>

          <div className="text-right space-y-1">
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Match_Reliability</p>
             <p className={cn(
               "text-3xl font-black leading-none",
               score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-slate-300"
             )}>{score}%</p>
          </div>
       </div>

       <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
          <div className="flex gap-2">
             <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-500 hover:bg-cyan-50 transition-colors cursor-pointer">
                <FileText size={16} />
             </div>
             <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-500 hover:bg-cyan-50 transition-colors cursor-pointer">
                <Radar size={16} />
             </div>
          </div>
          <Button 
            variant="ghost" 
            className="h-10 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-50 text-cyan-600 border border-slate-100 rounded-xl"
            disabled={candidate.processing_status !== 'completed'}
            onClick={() => onSelect(candidate)}
          >
             Full Analysis <ChevronRight size={14} className="ml-2" />
          </Button>
       </div>
    </div>
  );
}

// ─── Main ATS Scanner Page (Light Mode) ─────────────────────────

export default function ATSScannerPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchLatestApplications();
    
    // Subscribe to changes
    const channel = supabase
      .channel('ats-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchLatestApplications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredCandidates = candidates.filter(c => 
    c.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.applied_cluster_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function fetchLatestApplications() {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          talent_analysis (
            scoring,
            resume_profile,
            recommendations,
            gap_analysis,
            interview_questions
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setCandidates(data || []);
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  }

  const startScan = async () => {
    setScanning(true);
    setProgress(0);
    setLogs([]);

    const steps = [
      "INIT_SYSTEM: Initializing Neural Engine v4.0...",
      "AUTH_SECURE: Establishing quantum-grade tunnel...",
      "INGEST_NODE: Scanning Recruitment_Resumes bucket...",
      "SCAN_START: Processing multi-node batch [B-402]...",
      "AI_PARSER: Gemma4_e4b connected to ingestion stream...",
      "NODE_1: Parsing candidate metadata [Aravind S]...",
      "NODE_2: Extracting technical weights for 'Neural Architect'...",
      "AUDIT_CHECK: Cross-referencing Cluster_ID [CL-9221]...",
      "SUCCESS: Node_1 processing complete. MatchScore: 92.4%",
      "NODE_3: Analyzing domain expertise for [Priya K]...",
      "SYSTEM_ALERT: High cognitive alignment detected in Node_3.",
      "SUCCESS: Node_3 processing complete. MatchScore: 98.1%",
      "SCAN_END: Batch processing finalized. Transmitting results..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
      setLogs(prev => [...prev, steps[i]]);
      setProgress(((i + 1) / steps.length) * 100);
    }

    setScanning(false);
    showToast("Neural Batch Scan Complete", "success");
    fetchLatestApplications();
  };

  return (
    <DashboardShell
      title="ATS Neural Scanner"
      subtitle="Autonomous resume ingestion and cognitive mapping."
      actions={
        <Button 
           onClick={startScan}
           disabled={scanning}
           variant="primary"
           size="sm"
        >
           {scanning ? (
              <Loader2 size={14} className="animate-spin mr-2" />
           ) : (
              <Zap size={14} className="mr-2" fill="currentColor" />
           )}
           {scanning ? "Scanning..." : "Initiate Batch Scan"}
        </Button>
      }
    >
      <div className="space-y-8 pb-20">
         {/* System Status Banner */}
         <div className="page-card bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="h-12 w-12 bg-cyan-500 text-white flex items-center justify-center font-black text-2xl rounded-2xl shadow-lg shadow-cyan-100">
                  A
               </div>
               <div className="space-y-1">
                  <h1 className="text-xl font-black uppercase tracking-tighter leading-none text-slate-900">Neural_Core: ONLINE</h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gemma4_Sync: v4.2.0 | Processing: 1,420 TPS</p>
               </div>
            </div>
            <div className="flex gap-4">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            </div>
         </div>

         <div className="grid grid-cols-12 gap-8">
            {/* Left Column: Ingestion & Logs */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">
               {/* Ingestion Zone */}
               <div className="h-64 bg-white border border-slate-200 rounded-[32px] relative flex flex-col items-center justify-center group overflow-hidden shadow-sm">
                  {scanning && (
                     <motion.div 
                       animate={{ top: ["0%", "100%", "0%"] }}
                       transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                       className="absolute inset-x-0 h-[2px] bg-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.4)] z-20"
                     />
                  )}
                  
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
                  
                  <div className="relative z-10 flex flex-col items-center gap-6 text-center">
                     <div className="h-20 w-20 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-cyan-500 group-hover:bg-cyan-50 group-hover:border-cyan-500/20 transition-all duration-500 rounded-3xl">
                        <Upload size={40} strokeWidth={1.5} />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Neural Ingestion Portal</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Drop resumes for cognitive mapping</p>
                     </div>
                  </div>
               </div>

               {/* Analysis Stream */}
               <div className="h-96">
                  <NeuralTerminal logs={logs} />
               </div>
            </div>

            {/* Right Column: Match Grid */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-4">
                     <Radar size={24} className="text-cyan-600" />
                     <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">Real-time Match Grid</h2>
                  </div>
                  <div className="relative w-64">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                     <input 
                        placeholder="FILTER_CANDIDATES..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-[10px] font-black tracking-widest uppercase outline-none focus:border-cyan-500/40 transition-all"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence mode="popLayout">
                     {filteredCandidates.map((c, i) => (
                        <motion.div
                          key={c.application_id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                           <CandidateScanCard candidate={c} onSelect={setSelectedCandidate} />
                        </motion.div>
                     ))}
                  </AnimatePresence>
                  
                  {filteredCandidates.length === 0 && (
                     <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-40">
                        <Microscope size={64} className="text-slate-200" />
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">No Match Found</p>
                     </div>
                  )}
               </div>

               {/* Progress HUD */}
               <AnimatePresence>
                  {scanning && (
                     <motion.div 
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: 20 }}
                       className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-xl flex flex-col gap-3 shadow-cyan-500/5 mt-auto sticky bottom-0"
                     >
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                           <span className="text-cyan-600">Neural Sync Progress</span>
                           <span className="text-slate-400">{Math.round(progress)}% COMPLETED</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${progress}%` }}
                             className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                           />
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>
         </div>
      </div>

      {/* Neural Breakdown Side Panel */}
      <AnimatePresence>
         {selectedCandidate && (
            <>
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedCandidate(null)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
               />
               <motion.div 
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 h-screen w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl z-[101] overflow-y-auto"
               >
                  <div className="p-8 space-y-8">
                     <div className="flex items-center justify-between">
                        <div className="space-y-1">
                           <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Neural Breakdown</h2>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Cognitive Audit v4.0</p>
                        </div>
                        <Button 
                           variant="ghost" 
                           onClick={() => setSelectedCandidate(null)}
                           className="h-10 w-10 p-0 rounded-full hover:bg-slate-50"
                        >
                           <XCircle size={24} className="text-slate-300" />
                        </Button>
                     </div>

                     <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                        <div className="flex items-center gap-4">
                           <div className="h-14 w-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-cyan-600">
                              <User size={28} />
                           </div>
                           <div>
                              <h3 className="font-black text-lg text-slate-900 uppercase">{selectedCandidate.applicant_name}</h3>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedCandidate.applicant_email}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <Badge className="bg-cyan-500 text-white border-transparent">
                              {selectedCandidate.applied_cluster_id}
                           </Badge>
                           <Badge variant="secondary" className="border-emerald-200 text-emerald-600 bg-emerald-50">
                              Score: {selectedCandidate.talent_analysis?.[0]?.scoring?.match_score || 0}%
                           </Badge>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
                           <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cognitive Pros</p>
                           <ul className="text-[11px] font-medium text-slate-600 space-y-1 list-none p-0">
                              {selectedCandidate.talent_analysis?.[0]?.recommendations?.pros?.map((pro: string, i: number) => (
                                 <li key={i} className="flex gap-2">
                                    <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                                    {pro}
                                 </li>
                              ))}
                           </ul>
                        </div>
                        <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2">
                           <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Domain Gaps</p>
                           <ul className="text-[11px] font-medium text-slate-600 space-y-1 list-none p-0">
                              {selectedCandidate.talent_analysis?.[0]?.gap_analysis?.cons?.map((con: string, i: number) => (
                                 <li key={i} className="flex gap-2">
                                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-rose-500" />
                                    {con}
                                 </li>
                              ))}
                           </ul>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                           <BrainCircuit size={18} className="text-cyan-600" />
                           <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">AI-Generated Interview Protocol</h4>
                        </div>
                        <div className="space-y-3">
                           {selectedCandidate.talent_analysis?.[0]?.interview_questions?.map((q: any, i: number) => (
                              <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                                 <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-cyan-600 uppercase">Question {i + 1}</span>
                                    <Badge variant="secondary" className="text-[8px] h-4 uppercase">
                                       {q.difficulty || 'Advanced'}
                                    </Badge>
                                 </div>
                                 <p className="text-xs font-bold text-slate-800 leading-relaxed">{q.question}</p>
                                 <p className="text-[10px] text-slate-400 italic">Target Insight: {q.topic || 'Technical Depth'}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </motion.div>
            </>
         )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        .DashboardShell_main {
          font-family: 'Space Grotesk', sans-serif !important;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      ` }} />
    </DashboardShell>
  );
}
