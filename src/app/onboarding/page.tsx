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
  Calendar,
  X
} from "lucide-react";
import { Button } from "@/components/ui/ButtonLegacy";
import { useAuth, getDashboardForRole, type Role } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";


export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [passSaving, setPassSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [onboardedSuccess, setOnboardedSuccess] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const handlePasswordSubmit = async () => {
    // Strict Zoho password criteria: At least 8 chars, uppercase, lowercase, number, and symbol
    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!newPassword || !PASSWORD_REGEX.test(newPassword)) {
      showToast("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character/symbol.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    if (!consentChecked) {
      showToast("Please accept the onboarding consent.", "error");
      return;
    }

    setPassSaving(true);
    try {
      // 1. Update Supabase Auth password client-side if possible (non-blocking, server-side Admin API takes precedence)
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (err) {
        console.warn("Client password session update warning:", err);
      }

      // 2. Call the server-side endpoint to update the password and sync with Zoho Mail
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, newPassword }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to update password.");
      }

      showToast("Password updated and synchronized successfully!", "success");
      setPasswordUpdated(true);
      setShowPasswordModal(false);
    } catch (e: any) {
      console.error("Failed to update password:", e);
      showToast(e.message || "Failed to update password settings.", "error");
    } finally {
      setPassSaving(false);
    }
  };

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
    if (!user?.id) return;
    try {
      const { data, error: selectErr } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (selectErr) {
        console.error("fetchOnboardingStatus select error:", selectErr.message, selectErr.details, selectErr);
        throw selectErr;
      }

      if (data) {
        if (data.status === "completed") {
          // Route to the user's role-specific landing, not always /dashboard
          router.push(user ? getDashboardForRole(user.role as Role) : "/dashboard");
          return;
        }
        setOnboardingData(data);
        if (data.nda_signed_at) setNdaAccepted(true);
        if (data.status === "in_progress") {
          setPasswordUpdated(true);
        }
      } else {
        if (!user?.id) return;
        const { data: newData, error: insertErr } = await supabase
          .from("user_onboarding")
          .insert({ 
            user_id: user.id, 
            checklist_id: "d0f0d0f0-d0f0-d0f0-d0f0-d0f0d0f0d0f0",
            status: "not_started" 
          })
          .select()
          .maybeSingle();
        if (insertErr) {
          if (insertErr.code === "23505") {
            const { data: refetched, error: refetchErr } = await supabase
              .from("user_onboarding")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle();
            if (!refetchErr && refetched) {
              setOnboardingData(refetched);
              if (refetched.nda_signed_at) setNdaAccepted(true);
              if (refetched.status === "in_progress") {
                setPasswordUpdated(true);
              }
              return;
            }
          }
          console.error("fetchOnboardingStatus insert error:", insertErr.message, insertErr.details, insertErr);
          throw insertErr;
        }
        setOnboardingData(newData);
      }
    } catch (e: any) {
      console.error("fetchOnboardingStatus error:", e?.message || e, e);
    } finally {
      setLoading(false);
    }
  };


  const completeOnboarding = async () => {
    if (!ndaAccepted || !passwordUpdated) {
      showToast("Please sign the NDA and complete the Security Setup.", "error");
      return;
    }
    
    setSaving(true);
    try {
      // Call the server API which performs status updates and sends the confirmation email
      const response = await fetch("/api/auth/onboard-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to finalize onboarding.");
      }

      showToast("Onboarding Complete! Re-synchronizing session...", "success");
      setOnboardedSuccess(true);
      setShowPasswordModal(true); // Open the success screen modal overlay
    } catch (e: any) {
      console.error("Onboarding Completion Error:", e);
      showToast(e.message || "Synchronization failed. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-screen w-full bg-theme-page flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-theme-primary" size={40} />
      <p className="text-theme-muted font-black text-xs uppercase tracking-[0.2em]">Preparing your workspace...</p>
    </div>
  );

  const canSubmit = ndaAccepted && passwordUpdated;

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
                <style>{`
                  .agreement-html h1, .agreement-html h2, .agreement-html h3, .agreement-html h4 {
                    font-weight: 800;
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                  }
                  .agreement-html h1 { font-size: 1.25rem; }
                  .agreement-html h2 { font-size: 1.1rem; }
                  .agreement-html h3 { font-size: 1rem; }
                  .agreement-html p {
                    margin-bottom: 0.75rem;
                  }
                  .agreement-html ul, .agreement-html ol {
                    margin-left: 1.25rem;
                    margin-bottom: 0.75rem;
                    list-style-type: disc;
                  }
                  .agreement-html ol {
                    list-style-type: decimal;
                  }
                  .agreement-html table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1rem 0;
                    font-size: 11px;
                  }
                  .agreement-html th, .agreement-html td {
                    border: 1px solid rgba(0, 0, 0, 0.15);
                    padding: 6px 10px;
                    text-align: left;
                  }
                  .agreement-html th {
                    background-color: rgba(0, 0, 0, 0.05);
                    font-weight: bold;
                  }
                  .agreement-html blockquote {
                    border-left: 3px solid #000;
                    padding-left: 10px;
                    margin-left: 0;
                    font-style: italic;
                  }
                `}</style>
                {config?.consultant_agreement_text ? (
                  <div 
                    className="agreement-html text-[13px] text-theme-muted font-medium leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: config.consultant_agreement_text }}
                  />
                ) : config?.consultant_agreement_url ? (
                  <iframe 
                    src={`${config.consultant_agreement_url}#toolbar=0&navpanes=0`} 
                    className="w-full h-full border-none"
                    title="Consultant Agreement"
                  />
                ) : (
                  <div className="text-[12px] text-theme-muted leading-relaxed font-medium space-y-6">
                    <div className="text-center pb-4 border-b border-theme-border/60">
                      <h4 className="text-[15px] font-black text-theme-fg tracking-tight uppercase">Master Consultant & Non-Disclosure Agreement</h4>
                      <p className="text-[10px] text-theme-primary font-bold uppercase tracking-widest mt-1">Namaah Pvt Ltd · Bangalore, India</p>
                    </div>

                    <p className="italic text-theme-muted">
                      This Master Consultant & Non-Disclosure Agreement (the "Agreement") is entered into and made effective as of the execution date of electronic signature and portal onboarding completion.
                    </p>

                    <div className="space-y-2">
                      <p className="font-bold text-theme-fg uppercase tracking-wider text-[10px]">The Parties:</p>
                      <div className="pl-4 border-l-2 border-theme-primary/30 space-y-1.5 text-theme-subtle">
                        <p>1. <span className="font-bold text-theme-fg">NAMAAH PVT LTD</span>, an AI-Native Creative & Systems Company registered in India, having operations at Bangalore (the <span className="font-bold">"Company"</span>).</p>
                        <p>2. <span className="font-bold text-theme-fg">THE UNDERSIGNED CONSULTANT</span>, whose credentials and identity are validated upon dashboard onboarding initialization (the <span className="font-bold">"Consultant"</span>).</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="font-bold text-theme-fg uppercase tracking-wider text-[10px]">Recitals:</p>
                      <ul className="list-disc pl-5 space-y-1 text-theme-subtle">
                        <li>The Company designs and operates AI-native systems combining software engineering, AI pipelines, and creative production.</li>
                        <li>The Company desires to engage the Consultant to perform professional technical, creative, or engineering consulting services.</li>
                        <li>The Consultant will have access to highly confidential and proprietary information.</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <p className="font-bold text-theme-fg uppercase tracking-wider text-[10px]">1. Scope of Engagement & Services</p>
                      <p>
                        The Consultant agrees to perform consulting services including software development, AI pipeline engineering, creative design, and system architecture. The relationship is strictly that of an <span className="italic">independent contractor</span>, not an employee, agent, or partner.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-bold text-theme-fg uppercase tracking-wider text-[10px]">2. Confidentiality & Non-Disclosure</p>
                      <p>
                        The Consultant shall maintain the absolute secrecy of all <span className="font-bold text-theme-fg">Confidential Information</span>. Confidential Information includes, without limitation: source code, model weights, database schemas, prompt configurations, training datasets, brand experiences, creative assets, and business metrics.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-bold text-theme-fg uppercase tracking-wider text-[10px]">3. Intellectual Property Rights</p>
                      <p>
                        All work products, designs, code, model fine-tunes, and assets generated during the performance of the services (the <span className="font-bold">"Work Product"</span>) shall belong exclusively to <span className="font-bold text-theme-fg">Namaah Pvt Ltd</span>. The Consultant hereby irrevocably assigns all global rights, titles, and interests in the Work Product to the Company.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-bold text-theme-fg uppercase tracking-wider text-[10px]">4. Restrictive Covenants</p>
                      <p>
                        During the engagement and for <span className="font-bold text-theme-fg">twelve (12) months</span> thereafter, the Consultant shall not compete with the AI-native systems business of the Company, nor solicit the Company's employees, consultants, or active clients.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-bold text-theme-fg uppercase tracking-wider text-[10px]">5. Governing Law & Jurisdiction</p>
                      <p>
                        This Agreement is governed by the laws of India. Any legal disputes or claims arising out of this engagement shall be subject to the exclusive jurisdiction of the courts located in <span className="italic font-bold text-theme-fg">Bangalore, Karnataka</span>.
                      </p>
                    </div>

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

          {/* Right Column: Security Setup & Submission */}
          <div className="lg:col-span-5 space-y-8">
            {/* Security Setup Card */}
            <section className="page-card shadow-xl shadow-theme-primary/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-theme-primary/10 flex items-center justify-center text-theme-primary">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Security Setup</h3>
                  <p className="text-xs text-theme-muted font-bold uppercase tracking-widest mt-0.5">Password & Zoho Mail</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-theme-raised rounded-2xl border border-theme-border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-[14px] font-bold border",
                    passwordUpdated 
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" 
                      : "bg-red-500/10 border-red-500 text-red-500"
                  )}>
                    {passwordUpdated ? "✓" : "!"}
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-tight">
                      {passwordUpdated ? "Password Synchronized" : "Password Update Required"}
                    </p>
                    <p className="text-[10px] text-theme-muted font-bold uppercase tracking-widest mt-0.5">
                      {passwordUpdated ? "Zoho official mailbox active" : "Action required to proceed"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider"
                >
                  {passwordUpdated ? "Update" : "Setup"}
                </Button>
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
 
      {/* Change Password & Onboarding Consent Modal Overlay */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px] p-4">
          <div className="w-full max-w-md bg-theme-surface border border-theme-border rounded-3xl p-8 shadow-2xl space-y-6 relative">
            {passwordUpdated && !onboardedSuccess && (
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-6 right-6 text-theme-muted hover:text-theme-fg p-1.5 rounded-full hover:bg-theme-raised transition-all"
                title="Close"
              >
                <X size={18} />
              </button>
            )}
            {onboardedSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-base font-black text-theme-fg">Onboarding Completed!</h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Your professional profile has been activated successfully. 
                </p>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-left text-[11px] font-bold space-y-1.5">
                  <p>⚠️ CRITICAL SECURITY WARNING:</p>
                  <p className="leading-relaxed">
                    From now on, you can ONLY log in using your professional email ID (<span className="font-mono">{user?.zoho_email || user?.email}</span>) with your newly updated password.
                  </p>
                  <p className="leading-relaxed mt-1">
                    Login access using your personal email ID has been permanently blocked.
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/login?onboarded=true";
                  }}
                  className="w-full py-5 rounded-2xl bg-theme-primary text-theme-surface font-bold text-xs hover:scale-[1.01]"
                >
                  Logout & Sign In with Professional Email
                </Button>
              </div>
            ) : passwordUpdated ? (
              <div className="text-center space-y-6 py-4">
                <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-theme-fg">Password Changed</h3>
                  <p className="text-xs text-theme-muted leading-relaxed">
                    Your password has been updated and synchronized with Zoho Mail.
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 py-2.5 rounded-xl border border-emerald-500/20 inline-block px-6">
                    ✓ Password changed successfully
                  </p>
                </div>
                <Button
                  onClick={() => setShowPasswordModal(false)}
                  className="w-full py-5 rounded-2xl bg-theme-primary text-theme-surface font-bold text-xs hover:scale-[1.01]"
                >
                  Proceed to Onboarding Form
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="h-12 w-12 bg-theme-primary/10 text-theme-primary rounded-2xl flex items-center justify-center mx-auto">
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-theme-fg">Change Password & Consent</h2>
                  <p className="text-[10px] text-theme-muted font-black uppercase tracking-widest">
                    First-Time Security Configuration
                  </p>
                </div>

                <div className="p-4 bg-theme-raised border border-theme-border/60 rounded-xl space-y-1 text-xs">
                  <p className="text-theme-fg font-black">Professional Identity Assigned:</p>
                  <p className="font-mono text-theme-primary font-bold">{user?.zoho_email || user?.email}</p>
                  <p className="text-theme-muted mt-2 leading-relaxed">
                    As a standard security protocol for professional work privacy, you must update your password for your Namaah official email account and portal access.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-theme-muted">New Security Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full h-10 px-3.5 rounded-xl border border-theme-border bg-theme-surface text-xs text-theme-fg outline-none focus:border-theme-primary transition-all font-semibold"
                    />
                    
                    {/* Zoho Security Requirements Checklist */}
                    <div className="pt-2 pb-1 space-y-1.5 bg-theme-raised/40 p-2.5 rounded-xl border border-theme-border/40">
                      <p className="text-[9px] font-black text-theme-muted uppercase tracking-wider">Password Requirements:</p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          { label: "Minimum 8 characters", met: newPassword.length >= 8 },
                          { label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(newPassword) },
                          { label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(newPassword) },
                          { label: "At least one number (0-9)", met: /\d/.test(newPassword) },
                          { label: "At least one special symbol (e.g. @, #, $, %)", met: /[^A-Za-z0-9]/.test(newPassword) }
                        ].map((req, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[10px] font-bold transition-all">
                            <div className={cn(
                              "h-3.5 w-3.5 rounded-full flex items-center justify-center border transition-all text-[8px]",
                              req.met 
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 font-extrabold" 
                                : "bg-theme-surface border-theme-border text-theme-muted"
                            )}>
                              {req.met ? "✓" : "○"}
                            </div>
                            <span className={cn(
                              "transition-colors",
                              req.met ? "text-emerald-600 dark:text-emerald-400" : "text-theme-muted"
                            )}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                   <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-theme-muted">Confirm Security Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={cn(
                        "w-full h-10 px-3.5 rounded-xl border bg-theme-surface text-xs text-theme-fg outline-none transition-all font-semibold",
                        confirmPassword && newPassword !== confirmPassword 
                          ? "border-red-500 focus:border-red-500" 
                          : "border-theme-border focus:border-theme-primary"
                      )}
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1 animate-pulse">
                        <span>⚠️</span> Passwords do not match
                      </p>
                    )}
                  </div>

                  <div 
                    onClick={() => setConsentChecked(!consentChecked)}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                      consentChecked ? "bg-theme-primary/5 border-theme-primary" : "bg-theme-surface border-theme-border hover:border-theme-primary/50"
                    )}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5",
                      consentChecked ? "border-theme-primary bg-theme-primary text-theme-surface" : "border-theme-border"
                    )}>
                      {consentChecked && <CheckCircle2 size={12} strokeWidth={3} />}
                    </div>
                    <div className="text-left leading-normal">
                      <p className="text-[11px] font-bold text-theme-fg">I Consent to Portal Work Ethics</p>
                      <p className="text-[9px] text-theme-muted mt-0.5 leading-relaxed">
                        I agree to activate my professional Namaah account and authorize switching my identity to my corporate address.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handlePasswordSubmit}
                  disabled={!consentChecked || !newPassword || newPassword !== confirmPassword || passSaving}
                  className="w-full py-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] bg-theme-primary text-theme-surface hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {passSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-1.5" />
                      Updating Password...
                    </>
                  ) : (
                    "UPDATE"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
