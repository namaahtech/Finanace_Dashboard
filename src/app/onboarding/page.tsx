"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/ToastLegacy";
import { 
  CheckCircle2, 
  Rocket, 
  ShieldCheck,
  ArrowRight,
  Loader2,
  Clock,
  Briefcase,
  FileCheck,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/ButtonLegacy";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

const TASKS = [
  "Join the Department Slack/Discord",
  "Setup your Profile Avatar",
  "Complete 'Culture & Ethics' Video",
  "Sync your Google Calendar"
];

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user?.id) {
      fetchOnboardingStatus();
      fetchSystemConfig();
      
      const channel = supabase.channel(`config_sync_${user.id}`);
      channel
        .on(
          'postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'system_config' }, 
          (payload) => {
            if (payload.new) setConfig(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, authLoading, router]);

  const fetchSystemConfig = async () => {
    try {
      const { data } = await supabase.from("system_config").select("*").single();
      if (data) setConfig(data);
    } catch (e) {
      console.error(e);
    }
  };


  const fetchOnboardingStatus = async () => {
    try {
      const { data } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (data) {
        if (data.status === "completed") {
          router.push("/dashboard"); 
          return;
        }
        setOnboardingData(data);
        if (data.nda_signed_at) setNdaAccepted(true);
      } else {
        const { data: newData } = await supabase
          .from("user_onboarding")
          .insert({ user_id: user?.id, status: "not_started" })
          .select()
          .single();
        setOnboardingData(newData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: string) => {
    const currentTasks = onboardingData?.completed_steps || [];
    const newTasks = currentTasks.includes(task) 
      ? currentTasks.filter((t: string) => t !== task)
      : [...currentTasks, task];
    
    setOnboardingData({ ...onboardingData, completed_steps: newTasks });
    
    await supabase
      .from("user_onboarding")
      .update({ completed_steps: newTasks, status: "in_progress" })
      .eq("user_id", user?.id);
  };

  const completeOnboarding = async () => {
    if (!ndaAccepted || onboardingData?.completed_steps?.length < TASKS.length) {
      showToast("Please complete all steps and sign the NDA.", "error");
      return;
    }
    
    setSaving(true);
    try {
      const now = new Date().toISOString();
      
      // 1. Update Onboarding Status
      const { error: onboardErr } = await supabase
        .from("user_onboarding")
        .update({ 
          status: "completed", 
          completed_at: now,
          nda_signed_at: now
        })
        .eq("user_id", user?.id);

      if (onboardErr) throw onboardErr;

      // 2. Update Employee Profile
      const { error: empErr } = await supabase
        .from("employees")
        .update({ 
          status: "active",
          updated_at: now 
        })
        .eq("id", user?.id);
      
      if (empErr) console.warn("Could not update employee status, but continuing...", empErr);

      // 3. Audit Log
      await supabase.from("audit_logs").insert({
        actor_id: user?.id,
        action: "CONSULTANT_ONBOARDING_COMPLETED",
        table_name: "employees",
        record_id: user?.id,
        new_values: { 
          status: "onboarded", 
          agreement: "Neural Signed" 
        }
      });

      // 4. Force Redirect
      showToast("Onboarding Complete! Re-synchronizing session...", "success");
      
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/login?onboarded=true";
      }, 1500);

    } catch (e: any) {
      console.error("Onboarding Completion Error:", e);
      showToast(e.message || "Synchronization failed. Please try again.", "error");
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-screen w-full bg-theme-page flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-theme-primary" size={40} />
      <p className="text-theme-muted font-black text-xs uppercase tracking-[0.2em]">Preparing your workspace...</p>
    </div>
  );

  const completedCount = onboardingData?.completed_steps?.length || 0;
  const progressPercent = Math.round((completedCount / TASKS.length) * 100);
  const canSubmit = ndaAccepted && completedCount === TASKS.length;

  return (
    <div className="min-h-screen bg-theme-page text-theme-fg selection:bg-theme-primary/10 relative overflow-y-auto pb-20 font-sans">
      
      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-theme-primary text-theme-surface rounded-2xl flex items-center justify-center shadow-xl shadow-theme-primary/20">
              <Rocket size={24} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] font-black text-theme-primary uppercase tracking-[0.2em] leading-none mb-1.5">Namaah Nexus</p>
              <h2 className="text-xl font-black leading-none tracking-tight">Onboarding Phase</h2>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-theme-surface border border-theme-border px-4 py-2 rounded-xl shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Secure initialization</span>
          </div>
        </div>

        <div className="mb-16">
          <h1 className="text-6xl font-black mb-6 tracking-tighter text-theme-fg leading-[0.9]">Welcome to the <span className="text-theme-primary">Command Center.</span></h1>
          <p className="text-theme-muted text-xl max-w-2xl leading-relaxed font-medium">
            Let's get your professional profile synchronized. Complete the required forms to activate your workspace and begin your journey.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: NDA & Agreements */}
          <div className="lg:col-span-7 space-y-8">
            <section className="page-card shadow-xl shadow-theme-primary/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-xl bg-theme-primary/10 flex items-center justify-center text-theme-primary">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Consultant Agreement</h3>
                  <p className="text-xs text-theme-muted font-bold uppercase tracking-widest mt-0.5">Required compliance document</p>
                </div>
              </div>
              
              <div className="h-80 overflow-y-auto p-8 bg-[#F1F3F6] rounded-2xl border border-theme-border flex flex-col mb-8 custom-scrollbar">
                {config?.consultant_agreement_text ? (
                  <div className="whitespace-pre-wrap text-[13px] text-theme-muted font-medium leading-relaxed">
                    {config.consultant_agreement_text}
                  </div>
                ) : config?.consultant_agreement_url ? (
                  <iframe 
                    src={`${config.consultant_agreement_url}#toolbar=0&navpanes=0`} 
                    className="w-full h-full border-none"
                    title="Consultant Agreement"
                  />
                ) : (
                  <div className="text-[13px] text-theme-muted leading-relaxed font-medium">
                    <p className="mb-6 text-theme-fg font-black underline text-sm tracking-tight">CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT</p>
                    <p className="mb-4">This Agreement is made between Namaah Tech ("Company") and the undersigned Consultant. The Consultant acknowledges that they will have access to trade secrets, client lists, financial data, and proprietary algorithms...</p>
                    <p className="mb-4 font-bold text-theme-fg">1. DEFINITION OF CONFIDENTIAL INFORMATION</p>
                    <p className="mb-4">Any data relating to the business of the Company not generally known to the public, including codebase, financial projections, and strategic roadmaps.</p>
                    <p className="mb-4 font-bold text-theme-fg">2. INTELLECTUAL PROPERTY</p>
                    <p className="mb-4">All work products created during the term of engagement are the sole property of Namaah Tech. This includes all designs, code, and documentation produced.</p>
                    <div className="p-4 bg-white border border-theme-border rounded-xl mt-8">
                      <p className="text-xs font-bold text-theme-fg">CRYPTOGRAPHIC SIGNATURE REQUIRED</p>
                      <p className="text-[11px] mt-1">Unique Identifier: {user?.id?.toUpperCase()}</p>
                    </div>
                  </div>
                )}
              </div>

              <div 
                onClick={() => setNdaAccepted(!ndaAccepted)}
                className={cn(
                  "flex items-center gap-5 p-6 rounded-2xl border-2 transition-all cursor-pointer",
                  ndaAccepted 
                    ? "bg-theme-primary/5 border-theme-primary" 
                    : "bg-theme-surface border-theme-border hover:border-theme-primary/50"
                )}
              >
                <div className={cn(
                  "h-7 w-7 rounded-lg border-2 flex items-center justify-center transition-all",
                  ndaAccepted ? "border-theme-primary bg-theme-primary text-theme-surface" : "border-theme-border"
                )}>
                  {ndaAccepted && <CheckCircle2 size={16} strokeWidth={3} />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-black tracking-tight">I Accept & Sign the Consultant NDA</p>
                  <p className="text-[10px] text-theme-muted font-bold uppercase tracking-widest mt-0.5">Legally binding electronic signature</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Tasks & Progress */}
          <div className="lg:col-span-5 space-y-8">
            <section className="page-card shadow-xl shadow-theme-primary/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-xl bg-theme-primary/10 flex items-center justify-center text-theme-primary">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Initialization Tasklist</h3>
                  <p className="text-xs text-theme-muted font-bold uppercase tracking-widest mt-0.5">Department Prerequisites</p>
                </div>
              </div>

              <div className="space-y-3">
                {TASKS.map((task, i) => {
                  const isDone = onboardingData?.completed_steps?.includes(task);
                  return (
                    <div 
                      key={i} 
                      onClick={() => toggleTask(task)}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                        isDone ? "bg-theme-raised border-theme-primary/30" : "bg-theme-surface border-theme-border hover:bg-theme-raised"
                      )}
                    >
                      <div className={cn(
                        "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        isDone ? "border-theme-primary bg-theme-primary text-theme-surface" : "border-theme-border group-hover:border-theme-primary"
                      )}>
                        {isDone ? <CheckCircle2 size={14} strokeWidth={3} /> : <div className="h-2 w-2 rounded-sm bg-theme-primary scale-0 group-hover:scale-100 transition-all" />}
                      </div>
                      <span className={cn(
                        "text-sm font-bold transition-all",
                        isDone ? "text-theme-fg" : "text-theme-muted group-hover:text-theme-fg"
                      )}>{task}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 pt-8 border-t border-theme-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Initialization Progress</span>
                  <span className="text-sm font-black text-theme-primary">{progressPercent}%</span>
                </div>
                <div className="h-3 w-full bg-theme-raised rounded-full overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    className="h-full bg-theme-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                  />
                </div>
              </div>
            </section>

            {/* Submission Section */}
            <div className="bg-theme-primary rounded-[2.5rem] p-10 text-theme-surface shadow-2xl shadow-theme-primary/30">
               <h4 className="text-xl font-black mb-2 tracking-tight">Ready to activate?</h4>
               <p className="text-sm opacity-80 mb-8 font-medium leading-relaxed">
                 Once the agreement is signed and the checklist is finished, you can finalize your account activation.
               </p>
               <Button 
                 onClick={completeOnboarding}
                 disabled={!canSubmit || saving}
                 className={cn(
                   "w-full py-7 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
                   canSubmit 
                     ? "bg-theme-surface text-theme-fg hover:scale-[1.02] active:scale-[0.98]" 
                     : "bg-theme-surface/20 text-theme-surface/40 border-none cursor-not-allowed shadow-none"
                 )}
               >
                 {saving ? (
                   <>
                     <Loader2 size={18} className="animate-spin" />
                     Synchronizing Profile...
                   </>
                 ) : (
                   <>
                     Activate My Workspace
                     <ArrowRight size={18} />
                   </>
                 )}
               </Button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="py-16 flex flex-col items-center gap-8 border-t border-theme-border mt-16">
          <div className="flex flex-wrap justify-center items-center gap-6 text-[10px] text-theme-muted font-black uppercase tracking-widest">
            <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> TLS 1.3 Encryption</span>
            <span className="h-1 w-1 rounded-full bg-theme-border hidden sm:block" />
            <span>AES-256 GCM Secure Storage</span>
            <span className="h-1 w-1 rounded-full bg-theme-border hidden sm:block" />
            <span>Profile ID: {user?.id?.slice(0, 12).toUpperCase()}</span>
          </div>
          <p className="text-[10px] text-theme-subtle text-center max-w-xl leading-relaxed font-medium">
            Namaah Tech (LMS) Onboarding Module v2.4. All actions are logged for audit purposes. By proceeding, you acknowledge the terms of the engagement and internal governance protocols.
          </p>
        </div>
      </div>
    </div>
  );
}
