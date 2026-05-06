"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  CheckCircle2, 
  FileText, 
  User, 
  Rocket, 
  ShieldCheck,
  ArrowRight,
  Loader2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Rocket },
  { id: "nda", title: "NDA & Compliance", icon: ShieldCheck },
  { id: "checklist", title: "First Day Tasks", icon: CheckCircle2 },
  { id: "complete", title: "Ready to Launch", icon: ZapIcon }
];

function ZapIcon({ size, className }: { size: number, classNameText?: string, className?: string }) {
  return <Rocket size={size} className={className} />;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchOnboardingStatus();
    }
  }, [user?.id]);

  const fetchOnboardingStatus = async () => {
    try {
      const { data, error } = await supabase
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
      } else {
        // Create initial record
        const { data: newData } = await supabase
          .from("user_onboarding")
          .insert({ 
            user_id: user?.id, 
            status: "not_started" 
          })
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

  const handleNext = async () => {
    if (currentStep === 1) {
      // NDA Step - Sign it
      setSaving(true);
      await supabase
        .from("user_onboarding")
        .update({ 
          nda_signed_at: new Date().toISOString(),
          status: "in_progress"
        })
        .eq("user_id", user?.id);
      setSaving(false);
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      completeOnboarding();
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
      .update({ completed_steps: newTasks })
      .eq("user_id", user?.id);
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      await supabase
        .from("user_onboarding")
        .update({ 
          status: "completed", 
          completed_at: new Date().toISOString() 
        })
        .eq("user_id", user?.id);
      
      router.push("/dashboard");
    } catch (e) {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <p className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Preparing your workspace...</p>
    </div>
  );

  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 py-12 h-screen flex flex-col relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Rocket size={20} className="text-black" fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Namaah Nexus</p>
              <h2 className="text-lg font-bold leading-none">Onboarding Phase</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {STEPS.map((step, idx) => (
              <div 
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  idx === currentStep ? "w-8 bg-emerald-500" : 
                  idx < currentStep ? "w-4 bg-emerald-500/40" : "w-4 bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl"
            >
              <div className="flex flex-col items-center text-center mb-10">
                <div className="h-20 w-20 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center text-emerald-500 mb-6 shadow-2xl">
                  <StepIcon size={40} />
                </div>
                <h1 className="text-4xl font-black mb-4">{STEPS[currentStep].title}</h1>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  {currentStep === 0 && "Welcome to the team! Let's get your workspace set up and secure. This will only take 2 minutes."}
                  {currentStep === 1 && "We take security seriously. Please review and sign the Non-Disclosure Agreement to proceed."}
                  {currentStep === 2 && "Almost there! Complete these initial tasks to gain full access to the dashboard."}
                  {currentStep === 3 && "You're all set! Your credentials are ready and your department workspace is initialized."}
                </p>
              </div>

              {/* Step Specific Content */}
              <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-8 mb-10">
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Account Verified</p>
                        <p className="text-[10px] text-zinc-500 uppercase font-black">Identity check complete</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 opacity-50">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                        <Clock size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Training Modules</p>
                        <p className="text-[10px] text-zinc-500 uppercase font-black">Waiting for NDA</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="h-64 overflow-y-auto p-6 bg-black rounded-2xl border border-white/5 text-xs text-zinc-400 leading-relaxed font-mono">
                      <p className="mb-4 text-white font-bold underline">CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT</p>
                      <p className="mb-4">This Agreement is made between Namaah Tech ("Company") and the undersigned Employee. The Employee acknowledges that in the course of employment, they will have access to trade secrets, client lists, financial data, and proprietary algorithms...</p>
                      <p className="mb-4">1. DEFINITION OF CONFIDENTIAL INFORMATION: Any data relating to the business of the Company not generally known to the public...</p>
                      <p className="mb-4">2. NON-COMPETE: The employee agrees not to engage in any business activity that competes directly with the Company for a period of 12 months...</p>
                      <p>By clicking "Accept & Sign", you legally agree to the terms above.</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <ShieldCheck className="text-emerald-500" size={18} />
                      <p className="text-[11px] text-emerald-500 font-bold">This document is legally binding and e-signed via your unique user hash.</p>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-3">
                    {[
                      "Join the Department Slack/Discord",
                      "Setup your Profile Avatar",
                      "Complete 'Culture & Ethics' Video",
                      "Sync your Google Calendar"
                    ].map((task, i) => {
                      const isDone = onboardingData?.completed_steps?.includes(task);
                      return (
                        <div 
                          key={i} 
                          onClick={() => toggleTask(task)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                            isDone ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/5 hover:bg-white/10"
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isDone ? "border-emerald-500 bg-emerald-500 text-black" : "border-emerald-500/30 group-hover:border-emerald-500"
                          }`}>
                            {isDone ? <CheckCircle2 size={14} strokeWidth={3} /> : <div className="h-2 w-2 rounded-sm bg-emerald-500 scale-0 group-hover:scale-100 transition-all" />}
                          </div>
                          <span className={`text-sm font-medium transition-all ${isDone ? "text-emerald-500" : "text-zinc-300"}`}>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="flex flex-col items-center py-10">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                      <div className="relative h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-2xl">
                        <CheckCircle2 size={48} strokeWidth={3} />
                      </div>
                    </div>
                    <p className="text-xl font-bold mb-2">Systems Online</p>
                    <p className="text-sm text-zinc-500">Redirecting to your command center...</p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <button 
                  onClick={handleNext}
                  disabled={saving}
                  className="group relative px-10 py-5 bg-white text-black font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 flex items-center gap-3 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10">{saving ? "Finalizing..." : currentStep === STEPS.length - 1 ? "Start Working" : "Continue"}</span>
                  {!saving && <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="py-8 flex justify-center border-t border-white/5 mt-12">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest flex items-center gap-4">
            <span>Secure Handshake: TLS 1.3</span>
            <span className="h-1 w-1 rounded-full bg-zinc-800" />
            <span>AES-256 GCM</span>
            <span className="h-1 w-1 rounded-full bg-zinc-800" />
            <span>ID: {user?.id?.slice(0, 8)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
