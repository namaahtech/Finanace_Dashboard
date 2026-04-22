"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
  Users, Loader2, AlertCircle, Pin, PinOff, MoreVertical,
  MessageSquare, Settings, Hand, Smile, Copy, Check,
  Volume2, VolumeX, Maximize2, Minimize2, ChevronLeft, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
}

interface CallRoomProps {
  roomName: string;
  displayName: string;
  onLeave: () => void;
  type?: "video" | "audio" | "screen";
}

// ─── Avatar tile ──────────────────────────────────────────────────────────────
function ParticipantTile({
  participant, isLarge, isPinned, onPin, showVideo, localStream,
}: {
  participant: Participant;
  isLarge?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  showVideo?: boolean;
  localStream?: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const initials = participant.name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-violet-600", "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-indigo-600"];
  const color = colors[participant.name.charCodeAt(0) % colors.length];

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-[#1e1e2e] border transition-all duration-200 flex items-center justify-center group
      ${isPinned ? "border-blue-500/60 shadow-lg shadow-blue-500/20" : "border-white/5 hover:border-white/20"}
      ${participant.isSpeaking ? "ring-2 ring-emerald-400/70" : ""}
    `}>
      {/* Video or Avatar */}
      {showVideo && localStream ? (
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-4 w-full h-full">
          <div className={`${isLarge ? "w-24 h-24 text-3xl" : "w-14 h-14 text-lg"} rounded-full ${color} flex items-center justify-center font-black text-white shadow-xl transition-all duration-300`}>
            {initials}
          </div>
          {isLarge && (
            <p className="text-white/60 text-xs font-medium">{participant.isVideoOff ? "Camera off" : "Connecting..."}</p>
          )}
        </div>
      )}

      {/* Speaking indicator */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/60 pointer-events-none animate-pulse" />
      )}

      {/* Screen share badge */}
      {participant.isScreenSharing && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-blue-500 rounded-lg px-2 py-1">
          <Monitor size={10} className="text-white" />
          <span className="text-[9px] text-white font-black">Sharing</span>
        </div>
      )}

      {/* Hand raised */}
      {participant.isHandRaised && (
        <div className="absolute top-3 right-10 text-xl animate-bounce">✋</div>
      )}

      {/* Name bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-2">
        {participant.isMuted
          ? <MicOff size={11} className="text-rose-400 flex-shrink-0" />
          : <div className={`w-2 h-2 rounded-full flex-shrink-0 ${participant.isSpeaking ? "bg-emerald-400" : "bg-white/30"}`} />
        }
        <span className="text-[11px] font-bold text-white truncate">{participant.name}</span>
      </div>

      {/* Hover actions */}
      {onPin && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onPin}
            className="w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all"
            title={isPinned ? "Unpin" : "Pin"}
          >
            {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────
function CtrlBtn({
  onClick, active, danger, disabled, label, children,
}: {
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 disabled:opacity-40
          ${danger ? "bg-rose-500 hover:bg-rose-400 shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95"
          : active ? "bg-white/20 hover:bg-white/30 ring-2 ring-white/30"
          : "bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95"}
        `}
      >
        {children}
      </button>
      {label && <span className="text-[9px] text-white/40 font-medium">{label}</span>}
    </div>
  );
}

// ─── Main CallRoom ─────────────────────────────────────────────────────────────
export function CallRoom({ roomName, displayName, onLeave, type = "video" }: CallRoomProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Local controls
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(type === "audio" || type === "screen");
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Mock participants (will be replaced by Livekit track subscriptions)
  const [participants] = useState<Participant[]>([
    { id: "self", name: displayName, isMuted: false, isVideoOff: false, isSpeaking: false },
  ]);

  const allParticipants: Participant[] = [
    { id: "self", name: displayName, isMuted: muted, isVideoOff: videoOff, isSpeaking: false, isScreenSharing: sharing, isHandRaised: handRaised },
    ...participants.filter(p => p.id !== "self"),
  ];

  const pinnedParticipant = pinnedId ? allParticipants.find(p => p.id === pinnedId) : null;
  const otherParticipants = pinnedParticipant ? allParticipants.filter(p => p.id !== pinnedId) : [];

  // Token fetch
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/livekit?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(displayName)}`);
        const data = await res.json();
        if (data.error || !data.wsUrl || data.wsUrl.includes("undefined")) {
          setError(data.error || "server_pending");
        } else {
          setConnected(true);
        }
      } catch {
        setError("connection_failed");
      }
      setLoading(false);
    }
    init();
  }, [roomName, displayName]);

  // Get local camera/mic
  useEffect(() => {
    if (!connected || type === "audio") return;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => setLocalStream(stream))
      .catch(() => {}); // Permission denied — show avatar fallback
    return () => { localStream?.getTracks().forEach(t => t.stop()); };
  }, [connected, type]);

  // Call timer
  useEffect(() => {
    if (!connected && !error?.includes("pending")) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [connected, error]);

  const formatTime = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleScreenShare = useCallback(async () => {
    if (sharing) {
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setSharing(false);
    } else {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
        setScreenStream(stream);
        setSharing(true);
        stream.getVideoTracks()[0].onended = () => { setSharing(false); setScreenStream(null); };
      } catch {}
    }
  }, [sharing, screenStream]);

  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${roomName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Grid layout logic ──────────────────────────────────────────────────────
  const count = allParticipants.length;
  const gridClass = pinnedParticipant ? "" :
    count === 1 ? "grid-cols-1" :
    count === 2 ? "grid-cols-2" :
    count <= 4  ? "grid-cols-2" :
    count <= 6  ? "grid-cols-3" :
    count <= 9  ? "grid-cols-3" :
                  "grid-cols-4";

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 bg-[#0d0d1a]">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-theme-primary/20 border-t-theme-primary animate-spin" />
      </div>
      <p className="text-white/60 text-sm font-medium">Connecting to room...</p>
      <p className="text-white/30 text-xs font-mono">{roomName}</p>
    </div>
  );

  // ── VM pending state ───────────────────────────────────────────────────────
  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-8 bg-[#0d0d1a] text-white p-8">
      {/* Preview area — shows what it will look like */}
      <div className="w-full max-w-2xl bg-[#1a1a2e] rounded-3xl p-8 border border-white/5">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {["You", "Participant"].map((name, i) => (
            <div key={i} className="aspect-video rounded-xl bg-[#0d0d1a] border border-white/5 flex items-center justify-center">
              <div className={`w-12 h-12 rounded-full ${i === 0 ? "bg-theme-primary" : "bg-violet-600"} flex items-center justify-center font-black text-sm`}>
                {name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          {[Mic, Video, Monitor, Users].map((Icon, i) => (
            <div key={i} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center opacity-40">
              <Icon size={16} />
            </div>
          ))}
          <div className="w-12 h-12 rounded-full bg-rose-500/40 flex items-center justify-center">
            <PhoneOff size={18} className="opacity-40" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-3 max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <AlertCircle size={22} className="text-amber-400" />
        </div>
        <h3 className="text-lg font-black">VM Setup Pending</h3>
        <p className="text-white/50 text-sm leading-relaxed">
          The Livekit server on your Oracle VM isn't configured yet. The UI above is exactly what you'll see once connected.
        </p>
        <div className="p-4 rounded-xl bg-white/3 border border-white/8 text-left space-y-1.5">
          <p className="text-white/30 text-[10px] font-black uppercase tracking-wider mb-2">Add to .env.local after VM setup</p>
          {[
            "NEXT_PUBLIC_LIVEKIT_URL=wss://meet.yourdomain.com",
            "LIVEKIT_API_KEY=namaah_api_key",
            "LIVEKIT_API_SECRET=your_64_char_secret",
          ].map(line => (
            <p key={line} className="text-[11px] font-mono text-emerald-400/70">{line}</p>
          ))}
        </div>
      </div>

      <button onClick={onLeave} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-sm transition-all hover:scale-105 active:scale-95">
        <PhoneOff size={16} /> Leave Room
      </button>
    </div>
  );

  // ── Connected full UI ──────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-[#0d0d1a] text-white overflow-hidden">

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#0d0d1a]/80 backdrop-blur-sm border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-black text-emerald-400">{formatTime(elapsed)}</span>
            </div>
            <span className="text-white/40 text-xs font-mono truncate max-w-[200px]">{roomName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[11px] font-bold transition-all"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-white/50 text-[11px] font-bold">
              <Users size={12} />
              {allParticipants.length}
            </div>
          </div>
        </div>

        {/* ── Video grid ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden p-4 flex gap-4">

          {/* Pinned view */}
          {pinnedParticipant ? (
            <div className="flex flex-col gap-3 flex-1">
              {/* Main pinned tile */}
              <div className="flex-1">
                <ParticipantTile
                  participant={pinnedParticipant}
                  isLarge
                  isPinned
                  onPin={() => setPinnedId(null)}
                  showVideo={pinnedParticipant.id === "self" && !videoOff}
                  localStream={pinnedParticipant.id === "self" ? localStream : null}
                />
              </div>
              {/* Strip of others */}
              {otherParticipants.length > 0 && (
                <div className="flex gap-3 h-28 overflow-x-auto">
                  {otherParticipants.map(p => (
                    <div key={p.id} className="w-44 flex-shrink-0 h-full">
                      <ParticipantTile
                        participant={p}
                        onPin={() => setPinnedId(p.id)}
                        showVideo={p.id === "self" && !videoOff}
                        localStream={p.id === "self" ? localStream : null}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Auto grid */
            <div className={`grid ${gridClass} gap-3 flex-1 auto-rows-fr`}>
              {allParticipants.map(p => (
                <ParticipantTile
                  key={p.id}
                  participant={p}
                  isLarge={count === 1}
                  onPin={() => setPinnedId(p.id)}
                  showVideo={p.id === "self" && !videoOff}
                  localStream={p.id === "self" ? localStream : null}
                />
              ))}
            </div>
          )}

          {/* Participants sidebar */}
          {showParticipants && (
            <div className="w-64 flex-shrink-0 bg-[#1a1a2e] rounded-2xl border border-white/5 flex flex-col">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-black">People ({allParticipants.length})</span>
                <button onClick={() => setShowParticipants(false)} className="text-white/40 hover:text-white">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {allParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-xs font-black flex-shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{p.name}{p.id === "self" ? " (You)" : ""}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.isHandRaised && <span className="text-sm">✋</span>}
                      {p.isMuted
                        ? <MicOff size={12} className="text-rose-400" />
                        : <Mic size={12} className="text-emerald-400" />}
                      {p.isVideoOff
                        ? <VideoOff size={12} className="text-rose-400" />
                        : <Video size={12} className="text-emerald-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat sidebar */}
          {showChat && (
            <div className="w-72 flex-shrink-0 bg-[#1a1a2e] rounded-2xl border border-white/5 flex flex-col">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-black">In-call chat</span>
                <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white">✕</button>
              </div>
              <div className="flex-1 flex items-center justify-center text-white/30">
                <div className="text-center">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Chat messages appear here</p>
                </div>
              </div>
              <div className="p-3 border-t border-white/5">
                <input placeholder="Send a message..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20" />
              </div>
            </div>
          )}
        </div>

        {/* ── Controls bar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 py-4 bg-[#0d0d1a]/90 backdrop-blur-sm border-t border-white/5 flex-shrink-0">
          {/* Left — info */}
          <div className="flex items-center gap-2 w-48">
            <div className="w-9 h-9 rounded-full bg-theme-primary flex items-center justify-center text-xs font-black">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
              <p className="text-[9px] text-white/40">Host</p>
            </div>
          </div>

          {/* Center — main controls */}
          <div className="flex items-center gap-3">
            <CtrlBtn onClick={() => setMuted(m => !m)} active={muted} label={muted ? "Unmute" : "Mute"}>
              {muted ? <MicOff size={20} className="text-rose-400" /> : <Mic size={20} className="text-white" />}
            </CtrlBtn>

            {type === "video" && (
              <CtrlBtn onClick={() => setVideoOff(v => !v)} active={videoOff} label={videoOff ? "Start video" : "Stop video"}>
                {videoOff ? <VideoOff size={20} className="text-rose-400" /> : <Video size={20} className="text-white" />}
              </CtrlBtn>
            )}

            <CtrlBtn onClick={handleScreenShare} active={sharing} label={sharing ? "Stop share" : "Share screen"}>
              {sharing ? <MonitorOff size={20} className="text-blue-400" /> : <Monitor size={20} className="text-white" />}
            </CtrlBtn>

            <CtrlBtn onClick={() => setHandRaised(h => !h)} active={handRaised} label={handRaised ? "Lower hand" : "Raise hand"}>
              <span className={`text-lg leading-none ${handRaised ? "text-yellow-400" : "text-white/80"}`}>✋</span>
            </CtrlBtn>

            <CtrlBtn onClick={() => { setShowChat(c => !c); setShowParticipants(false); }} active={showChat} label="Chat">
              <MessageSquare size={20} className="text-white" />
            </CtrlBtn>

            <CtrlBtn onClick={() => { setShowParticipants(p => !p); setShowChat(false); }} active={showParticipants} label="People">
              <Users size={20} className="text-white" />
            </CtrlBtn>

            {/* End call */}
            <div className="flex flex-col items-center gap-1.5 ml-2">
              <button
                onClick={onLeave}
                className="w-14 h-12 rounded-2xl bg-rose-500 hover:bg-rose-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-rose-500/30"
              >
                <PhoneOff size={22} />
              </button>
              <span className="text-[9px] text-white/40 font-medium">Leave</span>
            </div>
          </div>

          {/* Right — settings */}
          <div className="flex items-center justify-end gap-2 w-48">
            <button className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
              <Settings size={16} />
            </button>
            <button className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
