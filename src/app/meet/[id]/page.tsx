"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useToken,
  GridLayout,
  ParticipantTile,
  ConnectionQualityIndicator,
  TrackLoop,
  useParticipants,
  useRemoteParticipant,
  useRemoteParticipants,
  useRoomContext,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { 
  BrainCircuit, 
  Zap, 
  CheckCircle2, 
  Loader2, 
  Shield, 
  PhoneOff,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Signal,
  Wifi,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";

/* ─── AI Interviewer Sidepanel ────────────────────────────────────────────── */
function InterviewerPanel({ 
  application, 
  onComplete,
  suggestQuestion,
  isAiLoading,
  aiSuggestion
}: { 
  application: any;
  onComplete: () => void;
  suggestQuestion: () => void;
  isAiLoading: boolean;
  aiSuggestion: string | null;
}) {
  const analysis = application?.talent_analysis?.[0] || {};
  const questions = analysis?.interview_questions || [];
  const score = analysis?.scoring?.match_score || 0;
  
  const remoteParticipants = useRemoteParticipants();
  const candidate = remoteParticipants.find(p => p.identity !== 'Interviewer');

  const toggleRemoteMic = async () => {
    if (!candidate) return;
    const isMuted = !candidate.isMicrophoneEnabled;
    // LiveKit server handles the actual muting/unmuting via data messages or server API
    // For local dev, we can use track.setMuted if we have permission, but usually 
    // we send a data message to the candidate's client to request a mute.
    const room = useRoomContext();
    const encoder = new TextEncoder();
    room.localParticipant.publishData(
      encoder.encode(JSON.stringify({ action: isMuted ? 'mute' : 'unmute', target: 'mic' })),
      { reliable: true, destinationIdentities: [candidate.identity] }
    );
  };

  const toggleRemoteVideo = async () => {
    if (!candidate) return;
    const isOff = !candidate.isCameraEnabled;
    const room = useRoomContext();
    const encoder = new TextEncoder();
    room.localParticipant.publishData(
      encoder.encode(JSON.stringify({ action: isOff ? 'enable' : 'disable', target: 'video' })),
      { reliable: true, destinationIdentities: [candidate.identity] }
    );
  };

  return (
    <div className="w-96 bg-zinc-950 border-l border-white/5 flex flex-col h-full">
      <div className="p-6 border-b border-white/5 bg-zinc-900/50">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <BrainCircuit size={18} />
          </div>
          <span className="text-xs font-black text-white uppercase tracking-widest">Neural Command</span>
        </div>
        <p className="text-lg font-bold text-white">{application?.applicant_name}</p>
        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">{application?.applied_cluster_id}</p>
        
        {/* Remote Candidate Controls */}
        <div className="mt-6 p-4 bg-zinc-950 border border-white/5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Candidate Live</span>
            </div>
            <ConnectionQualityIndicator participant={candidate} />
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "flex-1 h-9 text-[9px] font-black uppercase tracking-widest gap-2",
                !candidate?.isMicrophoneEnabled ? "border-rose-500/50 text-rose-500" : "border-emerald-500/50 text-emerald-500"
              )}
              onClick={toggleRemoteMic}
            >
              {candidate?.isMicrophoneEnabled ? <Mic size={12} /> : <MicOff size={12} />}
              {candidate?.isMicrophoneEnabled ? "Mute Candidate" : "Unmute Candidate"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "flex-1 h-9 text-[9px] font-black uppercase tracking-widest gap-2",
                !candidate?.isCameraEnabled ? "border-rose-500/50 text-rose-500" : "border-emerald-500/50 text-emerald-500"
              )}
              onClick={toggleRemoteVideo}
            >
              {candidate?.isCameraEnabled ? <Video size={12} /> : <VideoOff size={12} />}
              {candidate?.isCameraEnabled ? "Video ON" : "Video OFF"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        <div className="space-y-4">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
            <Zap size={12} fill="currentColor" /> Strategic Questions
          </p>
          {questions.map((q: any, i: number) => (
            <div key={i} className="p-4 bg-zinc-900 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all">
              <p className="text-xs font-bold text-white mb-2 leading-relaxed">{q.question}</p>
              <p className="text-[9px] text-zinc-500 italic">{q.reason}</p>
            </div>
          ))}
        </div>

        <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Evaluation Score</p>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{score}% Match</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>

      <div className="p-6 bg-zinc-900 border-t border-white/5 space-y-4">
        <button 
          onClick={suggestQuestion}
          disabled={isAiLoading}
          className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
        >
          {isAiLoading ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />}
          AI Follow-up
        </button>

        {aiSuggestion && (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
            <p className="text-xs text-zinc-300 italic">"{aiSuggestion}"</p>
          </div>
        )}
        
        <button 
          onClick={onComplete}
          className="w-full py-3 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all"
        >
          <CheckCircle2 size={16} className="inline mr-2" /> Submit Verdict
        </button>
      </div>
    </div>
  );
}

function MeetingContent({ 
  isAdmin, 
  application, 
  suggestQuestion, 
  isAiLoading, 
  aiSuggestion,
  onComplete,
  id
}: { 
  isAdmin: boolean;
  application: any;
  suggestQuestion: () => void;
  isAiLoading: boolean;
  aiSuggestion: string | null;
  onComplete: () => void;
  id: string;
}) {
  const [showPanel, setShowPanel] = useState(isAdmin);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const candidate = remoteParticipants.find(p => p.identity !== 'Interviewer');

  useEffect(() => {
    const handleData = (payload: Uint8Array) => {
      if (isAdmin) return;
      const decoder = new TextDecoder();
      try {
        const data = JSON.parse(decoder.decode(payload));
        if (data.target === 'mic') {
          localParticipant.setMicrophoneEnabled(data.action === 'unmute');
        } else if (data.target === 'video') {
          localParticipant.setCameraEnabled(data.action === 'enable');
        }
      } catch (e) {
        console.error("Failed to parse remote command", e);
      }
    };

    localParticipant?.on('dataReceived', handleData);
    return () => {
      localParticipant?.off('dataReceived', handleData);
    };
  }, [localParticipant, isAdmin]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col relative">
        {/* Custom Header Overlay */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between px-6 pointer-events-none">
          <div className="flex items-center gap-3">
            <Shield className="text-emerald-500" size={20} />
            <div className="flex flex-col">
              <span className="text-white font-bold text-xs">Secure Neural Link</span>
              <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Active Assessments</span>
            </div>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowPanel(!showPanel)}
              className="pointer-events-auto h-10 px-4 bg-zinc-900 border border-white/10 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
            >
              <BrainCircuit size={16} /> Intelligence
            </button>
          )}
        </div>

        <VideoConference />
        <RoomAudioRenderer />
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 384 }}
            exit={{ width: 0 }}
            className="overflow-hidden"
          >
            <InterviewerPanel 
              application={application}
              onComplete={onComplete}
              suggestQuestion={suggestQuestion}
              isAiLoading={isAiLoading}
              aiSuggestion={aiSuggestion}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isAdmin = searchParams.get("role") === "admin";
  
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  useEffect(() => {
    fetchInterviewData();
  }, [id]);

  const fetchInterviewData = async () => {
    try {
      const { data, error } = await supabase
        .from("interviews")
        .select("*, applications(*, talent_analysis(*))")
        .eq("interview_id", id)
        .single();

      if (error || !data) throw new Error("Interview not found");
      
      setApplication(data.applications);
      
      const username = isAdmin ? "Interviewer" : data.applications.applicant_name;
      const resp = await fetch(`/api/livekit/token?room=${id}&username=${username}`);
      const { token } = await resp.json();
      setToken(token);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const suggestQuestion = async () => {
    setIsAiLoading(true);
    try {
      const resp = await fetch('/api/admin/recruitment/process-application', {
        method: 'POST',
        body: JSON.stringify({ 
          mode: 'suggest_question',
          candidate_context: application?.talent_analysis?.[0] || {},
          job_role: application?.applied_cluster_id
        })
      });
      const data = await resp.json();
      setAiSuggestion(data.suggestion);
    } catch (err) {
      setAiSuggestion("Failed to generate suggestion.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-black uppercase tracking-widest text-[10px]">
    <Loader2 className="animate-spin mr-2" size={14} /> Initializing Neural Room...
  </div>;

  if (!token) return <div className="h-screen bg-black flex items-center justify-center text-rose-500 font-black uppercase tracking-widest text-[10px]">Access Denied</div>;

  return (
    <div className="h-screen w-full bg-black flex overflow-hidden lk-custom-theme">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        data-lk-theme="default"
        className="flex-1 flex"
        onDisconnected={() => {
          if (isAdmin) window.location.href = '/admin/interviews';
          else window.location.href = '/';
        }}
      >
        <MeetingContent 
          id={id}
          isAdmin={isAdmin}
          application={application}
          suggestQuestion={suggestQuestion}
          isAiLoading={isAiLoading}
          aiSuggestion={aiSuggestion}
          onComplete={() => window.location.href = '/admin/interviews'}
        />
      </LiveKitRoom>
    </div>
  );
}
