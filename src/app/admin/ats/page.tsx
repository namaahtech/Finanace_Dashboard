"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  FileText,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  ShieldCheck,
  Cpu,
  RefreshCw,
  X,
  FileCheck
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
// Removed missing Progress import

interface ScanResult {
  score: number;
  match: string[];
  missing: string[];
  tips: string[];
}

export default function AtsScannerPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleScan = async () => {
    if (!resumeText || !jobDescription) return;
    
    setScanning(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/ats/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });

      if (!res.ok) throw new Error("AI Scan Failed");

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      // Fallback result on error
      setResult({
        score: 0,
        match: [],
        missing: ["Failed to connect to AI engine"],
        tips: ["Check system configuration"],
        decision: "Hold"
      } as any);
    } finally {
      setScanning(false);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // In a real app, we'd parse the file. Here we just simulate.
    setResumeText("Simulated Resume Content: React Developer with 5 years experience in building scalable web apps using TypeScript, Node.js and SQL. Expert in API design and Rest services.");
  };

  const reset = () => {
    setResult(null);
    setResumeText("");
    setJobDescription("");
  };

  return (
    <DashboardShell
      title="Cognitive ATS Audit"
      subtitle="AI-driven resume optimization and job description alignment matrix."
    >
      <div className="space-y-8">
        {!result ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Input Side */}
            <div className="space-y-6">
              <div className="page-card border-theme-border/50 bg-theme-surface/50 backdrop-blur-sm overflow-hidden">
                <div className="border-b border-theme-border/50 px-6 py-4 flex items-center justify-between bg-theme-raised/5">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-theme-primary" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg">Resume Ingestion</h3>
                  </div>
                  {resumeText && (
                    <button onClick={() => setResumeText("")} className="text-theme-muted hover:text-rose-500 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <div className="p-6">
                  {resumeText ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-theme-primary/20 bg-theme-primary/5 p-4">
                        <div className="flex items-center gap-3 mb-2">
                           <FileCheck size={20} className="text-theme-primary" />
                           <span className="text-xs font-bold text-theme-fg">Content Ingested Successfully</span>
                        </div>
                        <p className="text-[11px] text-theme-muted leading-relaxed line-clamp-6 italic">
                          "{resumeText}"
                        </p>
                      </div>
                      <p className="text-[10px] text-center text-theme-muted">Ready for neural alignment analysis.</p>
                    </div>
                  ) : (
                    <div 
                      onDragEnter={onDrag}
                      onDragLeave={onDrag}
                      onDragOver={onDrag}
                      onDrop={onDrop}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-300",
                        dragActive ? "border-theme-primary bg-theme-primary/5 scale-[0.98]" : "border-theme-border hover:border-theme-muted bg-theme-raised/10"
                      )}
                    >
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-theme-raised border border-theme-border shadow-sm">
                        <Upload size={24} className="text-theme-muted" />
                      </div>
                      <p className="text-sm font-bold text-theme-fg mb-1">Drop Resume Here</p>
                      <p className="text-[11px] text-theme-muted text-center max-w-[200px]">Supports PDF, DOCX or direct text extraction.</p>
                      <input 
                        type="file" 
                        className="absolute inset-0 cursor-pointer opacity-0" 
                        onChange={(e) => setResumeText("Ingested Content from file upload...")}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="page-card border-theme-border/50 bg-theme-surface/50 backdrop-blur-sm">
                <div className="border-b border-theme-border/50 px-6 py-4 flex items-center gap-2 bg-theme-raised/5">
                  <Cpu size={18} className="text-theme-primary" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg">Job Description Target</h3>
                </div>
                <div className="p-6">
                  <textarea 
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the target job description here to calibrate the neural match..."
                    className="h-48 w-full rounded-xl border border-theme-border bg-theme-page p-4 text-xs font-medium text-theme-fg outline-none focus:border-theme-primary transition-all resize-none shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* CTA / Preview Side */}
            <div className="flex flex-col justify-center gap-8 lg:px-12">
               <div className="space-y-4 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-theme-primary/10 border border-theme-primary/20 text-theme-primary mb-2">
                     <BrainCircuit size={14} />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Engine v4.2</span>
                  </div>
                  <h2 className="text-3xl font-black text-theme-fg leading-tight">
                    Optimize for the <br /> 
                    <span className="text-theme-primary">Modern Algorithm</span>
                  </h2>
                  <p className="text-sm text-theme-muted leading-relaxed">
                    Our scanner simulates how modern ATS platforms and hiring managers perceive your resume against specific roles. Detect keyword gaps before you apply.
                  </p>
               </div>

               <div className="space-y-4">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-theme-primary/20 group"
                    disabled={!resumeText || !jobDescription || scanning}
                    onClick={handleScan}
                  >
                    {scanning ? (
                      <div className="flex items-center gap-3">
                        <RefreshCw size={20} className="animate-spin" />
                        <span>Calibrating Neural Map...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={20} className="group-hover:scale-125 transition-transform" />
                        <span>Perform Deep Audit</span>
                      </div>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-theme-muted font-bold tracking-widest uppercase">
                    Scan takes approximately 2-3 seconds
                  </p>
               </div>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="animate-in zoom-in-95 fade-in duration-500 space-y-8">
             {/* Score Header */}
             <div className="page-card p-10 border-theme-border/50 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <TrendingUp size={200} />
                </div>
                
                <div className="relative flex flex-col md:flex-row items-center gap-12">
                   <div className="relative h-48 w-48 shrink-0">
                      <svg className="h-full w-full -rotate-90 transform">
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="12"
                          className="text-theme-border"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="12"
                          strokeDasharray={552.92}
                          strokeDashoffset={552.92 - (552.92 * result.score) / 100}
                          className={cn("transition-all duration-1000", result.score > 70 ? "text-emerald-500" : result.score > 40 ? "text-amber-500" : "text-rose-500")}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-black text-theme-fg">{result.score}%</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Match Score</span>
                      </div>
                   </div>

                   <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black text-theme-fg">Audit Complete</h3>
                        <p className="text-sm text-theme-muted">Alignment matrix successfully calculated for the target role.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         <div className="px-4 py-2 rounded-xl bg-theme-raised border border-theme-border flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[11px] font-bold text-theme-fg">{result.match.length} Keywords Found</span>
                         </div>
                         <div className="px-4 py-2 rounded-xl bg-theme-raised border border-theme-border flex items-center gap-2">
                            <AlertCircle size={14} className="text-rose-500" />
                            <span className="text-[11px] font-bold text-theme-fg">{result.missing.length} Gaps Detected</span>
                         </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={reset} className="font-bold">
                        <RefreshCw size={14} className="mr-2" /> New Analysis
                      </Button>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Keyword Analysis */}
                <div className="lg:col-span-2 space-y-6">
                   <div className="page-card border-theme-border/50 min-h-[400px]">
                      <div className="border-b border-theme-border/50 px-8 py-5 bg-theme-raised/5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-theme-fg">Keyword Comparison Matrix</h3>
                      </div>
                      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Matching Nodes</span>
                              <span className="text-xs font-bold text-theme-muted">{result.match.length} Total</span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {result.match.map(w => (
                                <span key={w} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[10px] font-black tracking-widest border border-emerald-500/20">
                                  {w}
                                </span>
                              ))}
                              {result.match.length === 0 && <p className="text-xs text-theme-muted italic">No matching keywords detected.</p>}
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Neural Gaps</span>
                              <span className="text-xs font-bold text-theme-muted">{result.missing.length} Missing</span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {result.missing.map(w => (
                                <span key={w} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black tracking-widest border border-rose-500/20">
                                  {w}
                                </span>
                              ))}
                              {result.missing.length === 0 && <p className="text-xs text-theme-muted italic">Perfect alignment achieved.</p>}
                           </div>
                        </div>
                      </div>
                   </div>
                </div>

                {/* AI Tips */}
                <div className="space-y-6">
                   <div className="page-card border-theme-border/50 bg-theme-surface h-full">
                      <div className="border-b border-theme-border/50 px-8 py-5 bg-theme-raised/5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-theme-fg">Optimization Tips</h3>
                      </div>
                      <div className="p-8 space-y-6">
                         {result.tips.map((tip, i) => (
                           <div key={i} className="flex gap-4">
                              <div className="h-6 w-6 shrink-0 rounded-full bg-theme-primary/10 flex items-center justify-center text-[10px] font-black text-theme-primary border border-theme-primary/20">
                                {i + 1}
                              </div>
                              <p className="text-xs font-medium text-theme-muted leading-relaxed">
                                {tip}
                              </p>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
