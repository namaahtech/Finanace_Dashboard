"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  Plus, 
  Search, 
  Send, 
  MoreVertical, 
  Hash, 
  User, 
  Circle, 
  Paperclip, 
  Image, 
  Smile,
  Phone,
  Video,
  Info,
  ChevronRight,
  Settings2
} from "lucide-react";
import { useState } from "react";

const CHANNELS = [
  { id: "C1", name: "finance-alpha", type: "public", lastMsg: "Registry processed.", time: "10m" },
  { id: "C2", name: "leadership-synapse", type: "private", lastMsg: "Strategic goals updated.", time: "1h" },
  { id: "C3", name: "operational-yield", type: "public", lastMsg: "Shift summary attached.", time: "2h" },
  { id: "C4", name: "growth-engine", type: "public", lastMsg: "New lead acquired.", time: "4h" },
];

const DIRECT_MESSAGES = [
  { id: "U1", name: "Accounts Lead", status: "online", lastMsg: "Synchronizing...", avatar: "A" },
  { id: "U2", name: "HR Director", status: "away", lastMsg: "Vesting logic check.", avatar: "H" },
  { id: "U3", name: "Sales Head", status: "offline", lastMsg: "Client onboarded.", avatar: "S" },
  { id: "U4", name: "Lead Engineer", status: "online", lastMsg: "PR authorized.", avatar: "L" },
];

const MOCK_MESSAGES = [
  { id: 1, sender: "Accounts Lead", content: "Architecture Intelligence registry is now live in the analytics node.", time: "10:15 AM", self: false },
  { id: 2, sender: "Me", content: "Excellent. Has the operational yield for M4 been projected yet?", time: "10:18 AM", self: true },
  { id: 3, sender: "Accounts Lead", content: "Processing now. Expecting a 12.4% variance alpha. Will synchronize with the CRM pipeline shortly.", time: "10:20 AM", self: false },
  { id: 4, sender: "Me", content: "Copy that. Send the aggregate manifest once complete.", time: "10:22 AM", self: true },
];

export default function MessagingPage() {
  const [activeChat, setActiveChat] = useState("C1");
  const [msg, setMsg] = useState("");

  return (
    <DashboardShell 
      title="Communication Hub" 
      subtitle="Authorized organizational messaging protocol and real-time synchronization node"
    >
      <div className="flex h-[750px] gap-6 bg-background">
         {/* Sidebar Node */}
         <div className="w-80 flex flex-col gap-6">
            <div className="page-card !mb-0 p-0 flex-grow flex flex-col overflow-hidden border border-default shadow-xl">
               {/* Search Registry */}
               <div className="p-6 border-b border-default bg-[hsl(var(--surface-raised))]">
                  <div className="relative group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-sky-600 transition-colors" size={16} />
                     <input 
                       type="text" 
                       placeholder="Locate Liaison..."
                       className="w-full bg-background border border-default rounded-2xl pl-11 pr-4 py-3 text-xs font-black uppercase tracking-widest text-foreground outline-none focus:border-sky-500 transition-all"
                     />
                  </div>
               </div>

               {/* Sections */}
               <div className="flex-grow overflow-y-auto p-4 space-y-8 scrollbar-hide">
                  {/* Channels */}
                  <div>
                     <div className="flex justify-between items-center px-2 mb-4">
                        <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Operational Streams</h4>
                        <Plus size={14} className="text-muted hover:text-sky-600 cursor-pointer" />
                     </div>
                     <div className="space-y-1">
                        {CHANNELS.map(ch => (
                           <div 
                             key={ch.id} 
                             onClick={() => setActiveChat(ch.id)}
                             className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all group ${
                               activeChat === ch.id ? 'bg-sky-500/10 border border-sky-500/20' : 'hover:bg-default/5 border border-transparent'
                             }`}
                           >
                              <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeChat === ch.id ? 'bg-sky-500 text-white' : 'bg-default text-muted'} group-hover:scale-110 transition-transform shadow-sm`}>
                                    <Hash size={16} />
                                 </div>
                                 <div className="overflow-hidden">
                                    <p className={`text-[11px] font-black uppercase tracking-widest leading-none mb-1 ${activeChat === ch.id ? 'text-sky-600' : 'text-foreground'}`}>{ch.name}</p>
                                    <p className="text-[9px] font-bold text-muted truncate max-w-[120px]">{ch.lastMsg}</p>
                                 </div>
                              </div>
                              <span className="text-[8px] font-black text-muted/40 uppercase tracking-widest">{ch.time}</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Direct Messages */}
                  <div>
                     <div className="flex justify-between items-center px-2 mb-4">
                        <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Field Agents</h4>
                        <Plus size={14} className="text-muted hover:text-sky-600 cursor-pointer" />
                     </div>
                     <div className="space-y-1">
                        {DIRECT_MESSAGES.map(user => (
                           <div 
                             key={user.id} 
                             onClick={() => setActiveChat(user.id)}
                             className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all group ${
                               activeChat === user.id ? 'bg-purple-500/10 border border-purple-500/20' : 'hover:bg-default/5 border border-transparent'
                             }`}
                           >
                              <div className="relative">
                                 <div className={`w-8 h-8 rounded-xl bg-card border border-default flex items-center justify-center font-black text-xs group-hover:scale-110 transition-transform ${activeChat === user.id ? 'text-purple-600 border-purple-500/30' : 'text-muted'}`}>
                                    {user.avatar}
                                 </div>
                                 <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                                    user.status === 'online' ? 'bg-emerald-500' : user.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'
                                 }`} />
                              </div>
                              <div className="overflow-hidden">
                                 <p className={`text-[11px] font-black uppercase tracking-widest leading-none mb-1 ${activeChat === user.id ? 'text-purple-600' : 'text-foreground'}`}>{user.name}</p>
                                 <p className="text-[9px] font-bold text-muted truncate max-w-[120px]">{user.lastMsg}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* User Context */}
               <div className="p-4 border-t border-default bg-[hsl(var(--surface-raised))] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-sm">
                        AD
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none mb-1">Super Admin</p>
                        <div className="flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Secured Node</span>
                        </div>
                     </div>
                  </div>
                  <Settings2 size={16} className="text-muted hover:text-foreground cursor-pointer" />
               </div>
            </div>
         </div>

         {/* Chat Node */}
         <div className="flex-grow flex flex-col gap-6">
            <div className="page-card !mb-0 p-0 flex-grow flex flex-col overflow-hidden border border-default shadow-2xl relative">
               {/* Header Registry */}
               <div className="p-6 border-b border-default bg-[hsl(var(--surface-raised))] flex justify-between items-center shadow-sm relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 shadow-inner">
                        <Hash size={24} strokeWidth={2.5} />
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <h3 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">finance-alpha</h3>
                           <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase tracking-widest">Active Stream</div>
                        </div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Strategic financial coordination & yield reports</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <button className="p-3 rounded-2xl bg-card border border-default text-muted hover:text-sky-600 transition-all">
                        <Phone size={18} />
                     </button>
                     <button className="p-3 rounded-2xl bg-card border border-default text-muted hover:text-sky-600 transition-all">
                        <Video size={18} />
                     </button>
                     <button className="p-3 rounded-2xl bg-card border border-default text-muted hover:text-sky-600 transition-all">
                        <Info size={18} />
                     </button>
                  </div>
               </div>

               {/* Communication Thread */}
               <div className="flex-grow overflow-y-auto p-10 space-y-10 bg-background/50 scrollbar-hide">
                  <div className="flex flex-col items-center gap-4 mb-10">
                     <div className="h-px w-full bg-default/30 max-w-[200px]" />
                     <span className="text-[8px] font-black text-muted uppercase tracking-[0.5em]">Auth Synchronized: Today, 09:00 AM</span>
                  </div>

                  {MOCK_MESSAGES.map((m) => (
                     <div key={m.id} className={`flex ${m.self ? 'justify-end' : 'justify-start'} group`}>
                        <div className={`flex gap-4 max-w-[70%] ${m.self ? 'flex-row-reverse' : 'flex-row'}`}>
                           {!m.self && (
                              <div className="w-10 h-10 rounded-2xl bg-card border border-default flex items-center justify-center text-xs font-black text-muted shadow-sm group-hover:border-sky-500/30 transition-all">
                                 {m.sender[0]}
                              </div>
                           )}
                           <div className="space-y-2">
                              {!m.self && <p className="text-[9px] font-black text-muted uppercase tracking-widest ml-1">{m.sender}</p>}
                              <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-lg ${
                                 m.self 
                                 ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-tr-none border border-slate-800 dark:border-slate-200' 
                                 : 'bg-card border border-default text-foreground rounded-tl-none group-hover:border-sky-500/30 transition-all'
                              }`}>
                                 {m.content}
                              </div>
                              <p className={`text-[8px] font-black text-muted uppercase tracking-widest ${m.self ? 'text-right mr-1' : 'ml-1'}`}>{m.time}</p>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>

               {/* Interface Controller */}
               <div className="p-8 border-t border-default bg-[hsl(var(--surface-raised))] relative z-10">
                  <div className="flex items-center gap-4 p-2 rounded-3xl bg-background border border-default shadow-inner group focus-within:border-sky-500/50 transition-all">
                     <div className="flex gap-1 ml-2">
                        <button className="p-3 text-muted hover:text-sky-600 transition-colors"><Plus size={20} /></button>
                        <button className="p-3 text-muted hover:text-sky-600 transition-colors"><Paperclip size={20} /></button>
                     </div>
                     <input 
                       type="text" 
                       placeholder="Inject protocol update..."
                       className="flex-grow bg-transparent outline-none text-sm font-bold text-foreground py-4 px-2"
                       value={msg}
                       onChange={(e) => setMsg(e.target.value)}
                       onKeyPress={(e) => e.key === 'Enter' && setMsg("")}
                     />
                     <div className="flex gap-1 mr-2">
                        <button className="p-3 text-muted hover:text-sky-600 transition-colors"><Smile size={20} /></button>
                        <button 
                           onClick={() => setMsg("")}
                           className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:scale-105 active:scale-95 transition-all shadow-xl"
                        >
                           <Send size={20} strokeWidth={3} />
                        </button>
                     </div>
                  </div>
               </div>
               
               {/* Pulse Indicator */}
               <div className="absolute bottom-0 left-0 h-1 bg-sky-500 group-focus-within:w-full w-0 transition-all duration-1000" />
            </div>
         </div>
      </div>
    </DashboardShell>
  );
}
