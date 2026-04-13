"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Hash, 
  Volume2, 
  Megaphone, 
  Plus, 
  Search, 
  Bell, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Send,
  Users,
  ChevronDown,
  ChevronRight,
  Settings,
  MessageSquare,
  AtSign,
  Download,
  X,
  Mic,
  Video,
  Phone,
  Smile as EmojiIcon,
  Image as ImageIcon,
  FileIcon,
  Circle,
  Clock,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CORPORATE_TEAMS } from "@/constants/teams";
import { useMessaging, usePresence } from "@/hooks/useMessaging";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import Picker from "emoji-picker-react";

// --- Types ---
interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  group_id: string;
  unread_count?: number;
}

interface ChannelGroup {
  id: string;
  name: string;
  channels: Channel[];
  isCollapsed: boolean;
}

// --- Utils ---
const getDayLabel = (date: Date) => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

// --- Components ---

function MessageItem({ message, isFirstInGroup }: { message: Message, isFirstInGroup: boolean }) {
  const isImage = message.file_type?.startsWith('image');
  
  return (
    <div className={cn(
      "group flex px-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors relative py-0.5 min-h-[28px]",
      isFirstInGroup ? "mt-4" : ""
    )}>
      {/* Action Bar */}
      <div className="absolute right-4 -top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-theme-surface border border-theme-border rounded-lg shadow-xl flex items-center p-0.5 z-10">
        <button className="p-1.5 hover:bg-theme-raised rounded text-theme-muted hover:text-theme-fg"><Smile size={14} /></button>
        <button className="p-1.5 hover:bg-theme-raised rounded text-theme-muted hover:text-theme-fg"><MessageSquare size={14} /></button>
        <button className="p-1.5 hover:bg-theme-raised rounded text-theme-muted hover:text-theme-fg"><AtSign size={14} /></button>
        <div className="w-px h-3 bg-theme-border mx-1" />
        <button className="p-1.5 hover:bg-theme-raised rounded text-theme-muted hover:text-theme-fg"><MoreVertical size={14} /></button>
      </div>

      <div className="w-12 flex-shrink-0 flex justify-center">
        {isFirstInGroup ? (
          <div className="w-10 h-10 rounded-xl bg-theme-primary flex items-center justify-center text-white font-black text-sm mt-1 shadow-sm">
            {message.sender_name?.slice(0, 2).toUpperCase() || "?"}
          </div>
        ) : (
          <div className="w-12 opacity-0 group-hover:opacity-100 flex justify-center pr-2">
            <span className="text-[9px] text-theme-muted font-bold mt-1.5">{format(new Date(message.created_at), 'HH:mm')}</span>
          </div>
        )}
      </div>

      <div className={cn("flex-grow min-w-0 flex flex-col", isFirstInGroup ? "ml-3" : "ml-3 pt-0.5")}>
        {isFirstInGroup && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-black text-theme-fg hover:underline cursor-pointer tracking-tight">{message.sender_name}</span>
            <span className="text-[10px] text-theme-muted font-bold tracking-tight">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
          </div>
        )}
        
        {message.content && (
          <p className="text-sm text-theme-fg/90 leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
        )}
        
        {message.file_url && (
          <div className="mt-2 mb-1 max-w-sm rounded-xl border border-theme-border bg-theme-surface overflow-hidden group/file shadow-sm ring-1 ring-black/[0.05]">
            {isImage ? (
              <a href={message.file_url} target="_blank" rel="noreferrer">
                <img src={message.file_url} className="max-h-[300px] w-full object-contain bg-theme-raised hover:opacity-90 transition-opacity" alt="attachment" />
              </a>
            ) : (
              <div className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-theme-primary/10 text-theme-primary flex items-center justify-center shadow-inner">
                  <FileIcon size={20} strokeWidth={2.5} />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-black text-theme-fg truncate uppercase tracking-tight">{message.file_name}</p>
                  <p className="text-[10px] text-theme-muted font-black tracking-widest uppercase">
                    {(message.file_size || 0) / 1024 < 1024 
                      ? `${((message.file_size || 0) / 1024).toFixed(1)} KB` 
                      : `${((message.file_size || 0) / (1024 * 1024)).toFixed(1)} MB`} • {message.file_type?.split('/')[1].toUpperCase()}
                  </p>
                </div>
                <a href={message.file_url} download className="p-2 hover:bg-theme-raised rounded-full text-theme-muted hover:text-theme-fg transition-all">
                  <Download size={16} strokeWidth={2.5} />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagingPage() {
  const { user } = useAuth();
  const [activeChannelId, setActiveChannelId] = useState('ch-1');
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const { messages, loading: messagesLoading, sendMessage } = useMessaging(activeChannelId);
  const { onlineUsers } = usePresence("default-org"); // Hardcoded org for now
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize groups from teams
    const teamChannels: Channel[] = CORPORATE_TEAMS.map(t => ({
      id: `ch-${t.id}`,
      name: t.name.toLowerCase().replace(/\s+/g, '-'),
      type: 'text',
      group_id: 'teams',
      unread_count: 0
    }));

    setGroups([
      { id: 'annc', name: 'Announcements', channels: [{ id: 'annc-general', name: 'global-alerts', type: 'announcement', group_id: 'annc' }], isCollapsed: false },
      { id: 'teams', name: 'Functional Teams', channels: teamChannels, isCollapsed: false },
      { id: 'voice', name: 'Voice Lounges', channels: [{ id: 'v-strat', name: 'Strategy Room', type: 'voice', group_id: 'voice' }, { id: 'v-coffee', name: 'Watercooler', type: 'voice', group_id: 'voice' }], isCollapsed: false },
    ]);
  }, []);

  const toggleGroup = (groupId: string) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g));
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const content = inputText;
    setInputText("");
    await sendMessage(content);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(data.path);

      await sendMessage("", publicUrl, {
        name: file.name,
        type: file.type,
        size: file.size
      });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Ensure Supabase storage bucket 'attachments' exists.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const activeChannel = groups.flatMap(g => g.channels).find(c => c.id === activeChannelId) || { name: 'general', type: 'text' };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[60] flex bg-theme-surface overflow-hidden text-theme-fg font-sans selection:bg-theme-primary/30"
    >
      
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      {/* 1. Left Rail (72px) */}
      <div className="w-[72px] bg-theme-sidebar-bg border-r border-theme-sidebar-border flex flex-col items-center py-4 gap-3 z-30 shadow-2xl">
        <button 
          onClick={() => window.history.back()}
          className="w-12 h-12 rounded-2xl bg-theme-raised flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-surface transition-all duration-300 group relative mb-2"
          title="Back to Dashboard"
        >
          <ChevronRight className="rotate-180" size={20} strokeWidth={3} />
          <div className="absolute left-16 px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-1 group-hover:translate-x-0 z-50 whitespace-nowrap">
            Back to Dashboard
          </div>
        </button>
        <div className="w-12 h-12 rounded-2xl bg-theme-primary flex items-center justify-center text-white font-black text-xl shadow-lg cursor-pointer hover:rounded-xl transition-all duration-300 ring-2 ring-theme-primary/20 ring-offset-2 ring-offset-theme-sidebar-bg">
          N
        </div>
        <div className="w-8 h-[2px] bg-theme-sidebar-border mx-auto my-1 opacity-50" />
        <div className="flex-grow flex flex-col gap-3 overflow-y-auto scrollbar-hide py-2">
          {['Alpha', 'Beta', 'Gamma'].map((id, i) => (
            <div key={id} className="group relative">
              <div className={cn(
                "w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center font-black text-[10px] cursor-pointer shadow-sm uppercase",
                i === 0 ? "bg-theme-primary text-white rounded-2xl" : "bg-theme-sidebar-hover text-theme-muted hover:bg-theme-primary hover:text-white hover:rounded-2xl"
              )}>
                {id.slice(0, 2)}
              </div>
              <div className={cn(
                "absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 bg-theme-fg rounded-r-full transition-all duration-300",
                i === 0 ? "h-8" : "h-2 group-hover:h-5"
              )} />
              {/* Tooltip */}
              <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-1 group-hover:translate-x-0 z-50 whitespace-nowrap shadow-xl">
                {id} Organization
              </div>
            </div>
          ))}
          <button className="w-12 h-12 rounded-full border-2 border-dashed border-theme-sidebar-border flex items-center justify-center text-theme-muted hover:text-theme-fg hover:border-theme-fg transition-all cursor-pointer group">
            <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>
        <div className="w-10 h-10 rounded-xl bg-theme-raised flex items-center justify-center text-theme-muted hover:text-theme-fg transition-all cursor-pointer border border-theme-sidebar-border">
          <Settings size={20} />
        </div>
      </div>

      {/* 2. Channel Sidebar (240px) */}
      <div className="w-[240px] bg-theme-sidebar-bg/95 border-r border-theme-sidebar-border flex flex-col h-full z-20">
        <button className="h-14 border-b border-theme-sidebar-border px-4 flex items-center justify-between group hover:bg-theme-sidebar-hover transition-colors shadow-sm">
          <span className="font-black text-xs uppercase tracking-[0.15em] truncate">Operational Hub</span>
          <ChevronDown size={14} className="text-theme-muted group-hover:text-theme-fg transition-colors" />
        </button>
        
        <ScrollArea className="flex-grow p-3 space-y-6">
          {groups.map((group) => (
            <div key={group.id} className="space-y-0.5">
              <div 
                className="flex items-center justify-between px-1 mb-1.5 group cursor-pointer text-theme-muted hover:text-theme-fg transition-colors"
                onClick={() => toggleGroup(group.id)}
              >
                <div className="flex items-center gap-1">
                  <ChevronDown size={12} strokeWidth={3} className={cn("transition-transform duration-200", group.isCollapsed && "-rotate-90")} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{group.name}</span>
                </div>
                <button className="p-0.5 hover:bg-theme-sidebar-hover rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={14} />
                </button>
              </div>
              
              {!group.isCollapsed && group.channels.map((ch) => (
                <div 
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer group transition-all relative",
                    activeChannelId === ch.id 
                      ? "bg-theme-primary text-white shadow-md shadow-theme-primary/20" 
                      : "text-theme-muted hover:bg-theme-sidebar-hover hover:text-theme-fg"
                  )}
                >
                  {ch.type === 'text' && <Hash size={15} strokeWidth={2.5} className={activeChannelId === ch.id ? "text-white/70" : "text-theme-muted/50"} />}
                  {ch.type === 'voice' && <Volume2 size={15} strokeWidth={2.5} className={activeChannelId === ch.id ? "text-white/70" : "text-theme-muted/50"} />}
                  {ch.type === 'announcement' && <Megaphone size={15} strokeWidth={2.5} className={activeChannelId === ch.id ? "text-white/70" : "text-theme-muted/50"} />}
                  
                  <span className={cn(
                    "text-xs font-bold flex-grow truncate tracking-tight",
                    ch.unread_count && ch.unread_count > 0 && "font-black text-theme-fg"
                  )}>
                    {ch.name}
                  </span>
                  
                  {ch.unread_count && ch.unread_count > 0 && activeChannelId !== ch.id && (
                    <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg ring-2 ring-theme-sidebar-bg">
                      {ch.unread_count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </ScrollArea>

        {/* User Status Strip */}
        <div className="p-2.5 bg-black/5 dark:bg-black/30 flex items-center gap-3 border-t border-theme-sidebar-border">
          <div className="relative group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-theme-primary flex items-center justify-center text-white text-[10px] font-black shadow-lg group-hover:scale-105 transition-transform">
              {user?.name?.slice(0, 2).toUpperCase() || "AD"}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-theme-sidebar-bg shadow-sm" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-[11px] font-black text-theme-fg truncate leading-none mb-1 uppercase tracking-wider">{user?.name || "Super Admin"}</p>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-theme-muted truncate leading-none">System Authorized</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button className="p-2 hover:bg-theme-sidebar-hover rounded-xl text-theme-muted hover:text-theme-fg transition-all"><Mic size={14} /></button>
            <button className="p-2 hover:bg-theme-sidebar-hover rounded-xl text-theme-muted hover:text-theme-fg transition-all"><Settings size={14} /></button>
          </div>
        </div>
      </div>

      {/* 3. Main Chat Area */}
      <div className="flex-grow flex flex-col bg-theme-surface z-10 relative">
        {/* Header */}
        <div className="h-14 border-b border-theme-border px-6 flex items-center justify-between shadow-sm bg-theme-surface/60 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <div className="text-theme-primary drop-shadow-sm">
                {activeChannel.type === 'text' && <Hash size={22} strokeWidth={3} />}
                {activeChannel.type === 'voice' && <Volume2 size={22} strokeWidth={3} />}
                {activeChannel.type === 'announcement' && <Megaphone size={22} strokeWidth={3} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-theme-fg uppercase tracking-[0.2em]">{activeChannel.name}</h1>
                <Badge variant="success" className="text-[8px] h-4">Certified Stream</Badge>
              </div>
              <p className="text-[10px] text-theme-muted font-bold tracking-tight opacity-70">
                End-to-end encrypted organizational sync
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3.5 py-2 bg-theme-raised rounded-xl border border-theme-border ring-1 ring-black/[0.02] focus-within:ring-theme-primary/30 transition-all">
              <Search size={14} className="text-theme-muted" />
              <input type="text" placeholder="Locate Intelligence..." className="bg-transparent border-none outline-none text-[11px] w-36 font-bold text-theme-fg placeholder:text-theme-muted/50" />
            </div>
            <button className="p-2.5 text-theme-muted hover:text-theme-fg hover:bg-theme-raised rounded-xl transition-all"><Bell size={18} /></button>
            <button 
              className={cn("p-2.5 rounded-xl transition-all", showMembers ? "text-theme-primary bg-theme-primary/5" : "text-theme-muted hover:text-theme-fg hover:bg-theme-raised")}
              onClick={() => setShowMembers(!showMembers)}
            >
              <Users size={18} />
            </button>
            <button className="p-2.5 text-theme-muted hover:text-theme-fg hover:bg-theme-raised rounded-xl transition-all"><MoreVertical size={18} /></button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-grow bg-[#fcfcfc] dark:bg-[#0f1115]">
          <div className="flex flex-col py-8">
            {/* Thread Start Card */}
            <div className="px-10 mb-12 mt-4 space-y-4">
              <div className="w-20 h-20 rounded-[2.5rem] bg-theme-primary/10 text-theme-primary flex items-center justify-center mb-6 shadow-inner ring-4 ring-theme-primary/5">
                {activeChannel.type === 'text' && <Hash size={44} strokeWidth={2.5} />}
                {activeChannel.type === 'voice' && <Volume2 size={44} strokeWidth={2.5} />}
                {activeChannel.type === 'announcement' && <Megaphone size={44} strokeWidth={2.5} />}
              </div>
              <h2 className="text-3xl font-black text-theme-fg tracking-tighter">Genesis of #{activeChannel.name}</h2>
              <p className="text-theme-muted max-w-xl text-base leading-relaxed font-bold opacity-80">
                This node marks the origin of the <span className="text-theme-fg">#{activeChannel.name}</span> protocol. 
                All activity within this stream is synchronized across the organizational cluster.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" className="rounded-xl font-black text-[10px] tracking-widest uppercase">
                  <Settings size={12} className="mr-2" /> Protocol Config
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl font-black text-[10px] tracking-widest uppercase border-theme-border">
                  <Users size={12} className="mr-2" /> Invite Cluster
                </Button>
              </div>
              <div className="flex items-center gap-4 pt-8">
                <div className="h-px flex-grow bg-theme-border" />
                <span className="text-[10px] font-black text-theme-muted uppercase tracking-[0.5em]">Today</span>
                <div className="h-px flex-grow bg-theme-border" />
              </div>
            </div>

            {messagesLoading ? (
               <div className="flex items-center justify-center py-20">
                  <Circle size={24} className="text-theme-primary animate-pulse" />
               </div>
            ) : (
              <div className="space-y-0 pb-10">
                {messages.map((m, idx) => {
                  const prev = messages[idx - 1];
                  const isFirstInGroup = !prev || prev.sender_id !== m.sender_id || !isSameDay(new Date(prev.created_at), new Date(m.created_at));
                  
                  // Show date separator if different day
                  const showSeparator = prev && !isSameDay(new Date(prev.created_at), new Date(m.created_at));

                  return (
                    <div key={m.id}>
                      {showSeparator && (
                        <div className="relative flex items-center justify-center my-8 px-4">
                          <div className="absolute inset-0 flex items-center px-4"><div className="w-full h-px bg-theme-border" /></div>
                          <span className="relative px-6 text-[9px] font-black text-theme-muted uppercase tracking-[0.5em] bg-[#fcfcfc] dark:bg-[#0f1115] border border-theme-border rounded-full py-1.5 shadow-sm">
                            {getDayLabel(new Date(m.created_at))}
                          </span>
                        </div>
                      )}
                      <MessageItem message={m} isFirstInGroup={isFirstInGroup} />
                    </div>
                  );
                })}
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Typing Indicator Overlay */}
        <AnimatePresence>
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-[104px] left-6 z-20 flex items-center gap-3 py-1.5 px-3 bg-theme-surface/80 backdrop-blur-md rounded-full border border-theme-border shadow-xl ring-1 ring-black/[0.05]"
            >
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] font-black text-theme-primary uppercase tracking-[0.1em] italic">Analysts are synchronizing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <div className="px-6 pb-6 pt-2 bg-gradient-to-t from-theme-surface to-transparent relative z-20">
          <div className={cn(
            "flex flex-col bg-theme-raised rounded-3xl border border-theme-border shadow-2xl transition-all duration-500 ring-1 ring-black/[0.05]",
            inputText.trim() ? "border-theme-primary/50 shadow-theme-primary/5" : "hover:border-theme-muted"
          )}>
            
            <div className="flex items-end gap-2 p-2.5">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-11 h-11 flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-2xl transition-all shadow-sm hover:shadow-md"
                title="Add Attachment"
              >
                {isUploading ? <Circle size={20} className="animate-spin" /> : <Plus size={24} strokeWidth={3} />}
              </button>
              
              <div className="flex-grow relative px-2 py-0.5">
                <textarea 
                  rows={1}
                  placeholder={`Broadcast to #${activeChannel.name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="w-full bg-transparent border-none outline-none text-[15px] font-bold resize-none py-3 px-1 text-theme-fg placeholder:text-theme-muted/40 scrollbar-hide min-h-[48px]"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 240)}px`;
                  }}
                />
              </div>

              <div className="flex items-center gap-1.5 pr-1.5 pb-1">
                <button className="w-10 h-10 flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-2xl transition-all">
                  <ImageIcon size={20} />
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowEmoji(!showEmoji)}
                    className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-all", showEmoji ? "text-theme-primary bg-theme-surface shadow-inner" : "text-theme-muted hover:text-theme-primary hover:bg-theme-surface")}
                  >
                    <EmojiIcon size={20} />
                  </button>
                  {showEmoji && (
                    <div className="absolute bottom-16 right-0 z-[100] shadow-2xl rounded-3xl overflow-hidden border border-theme-border animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300">
                      <Picker 
                         onEmojiClick={(emoji) => {
                           setInputText(prev => prev + emoji.emoji);
                           setShowEmoji(false);
                         }}
                         theme={getComputedStyle(document.documentElement).getPropertyValue('--theme-mode') === 'dark' ? 'dark' : 'light' as any}
                      />
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className={cn(
                    "w-11 h-11 flex items-center justify-center rounded-2xl transition-all ml-1.5 shadow-xl",
                    inputText.trim() 
                      ? "bg-theme-primary text-white scale-105 active:scale-95 shadow-theme-primary/30" 
                      : "bg-theme-border text-theme-muted opacity-40 cursor-not-allowed"
                  )}
                >
                  <Send size={20} strokeWidth={3} className={cn("transition-transform", inputText.trim() && "rotate-12")} />
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center px-6">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-theme-muted uppercase tracking-[0.25em]">Secure Broadcaster 2.4</span>
              <div className="h-1 w-1 rounded-full bg-theme-muted/30" />
              <span className="text-[9px] font-black text-theme-muted uppercase tracking-[0.25em]">Shift + Return for line-break</span>
            </div>
            <div className="flex gap-4 items-center">
               {isUploading && <span className="text-[9px] font-black text-theme-primary uppercase tracking-[0.2em] animate-pulse">Synchronizing Manifest...</span>}
               <span className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ESA Link Active
               </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Rights Side Member Panel (320px) */}
      <AnimatePresence>
        {showMembers && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-theme-sidebar-bg/40 border-l border-theme-sidebar-border h-full flex flex-col z-20 overflow-hidden backdrop-blur-3xl"
          >
            <div className="h-14 border-b border-theme-sidebar-border px-8 flex items-center">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-theme-muted">Field Intelligence</span>
            </div>
            <ScrollArea className="flex-grow p-8 space-y-10">
              {/* Online Section */}
              <div>
                <h4 className="text-[10px] font-black text-theme-muted uppercase tracking-[0.25em] flex items-center gap-2 mb-6">
                  Online Agents — {Object.keys(onlineUsers).length + 1}
                </h4>
                <div className="space-y-5">
                  {/* Self */}
                  <div className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-[1.2rem] bg-theme-primary flex items-center justify-center text-white font-black text-xs shadow-lg ring-2 ring-theme-primary/20 transition-all">
                        {user?.name?.slice(0, 2).toUpperCase() || "AD"}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-[3px] border-theme-sidebar-bg shadow-sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-theme-fg truncate uppercase tracking-tight">{user?.name || "Super Admin"}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Active Principal</p>
                    </div>
                  </div>

                  {CORPORATE_TEAMS.slice(0, 6).map(m => (
                    <div key={m.id} className="flex items-center gap-4 cursor-pointer group">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-[1.2rem] bg-theme-surface border border-theme-border shadow-md flex items-center justify-center font-black text-xs text-theme-muted group-hover:border-theme-primary group-hover:bg-theme-primary/5 transition-all">
                          {m.lead.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-[3px] border-theme-sidebar-bg shadow-sm" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-black text-theme-fg truncate group-hover:text-theme-primary transition-colors tracking-tight uppercase">{m.lead}</p>
                        <p className="text-[10px] text-theme-muted font-bold truncate mt-0.5">{m.department} · {m.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Offline Section */}
              <div>
                <h4 className="text-[10px] font-black text-theme-muted uppercase tracking-[0.25em] mb-6">Dormant — 54</h4>
                <div className="space-y-5 opacity-40 grayscale group-hover:grayscale-0 hover:opacity-80 transition-all duration-700">
                  {CORPORATE_TEAMS.slice(8, 12).map(m => (
                    <div key={m.id} className="flex items-center gap-4 cursor-pointer">
                      <div className="w-11 h-11 rounded-[1.2rem] bg-theme-raised border border-theme-border flex items-center justify-center font-black text-xs text-theme-muted opacity-60">
                         {m.lead[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-theme-muted truncate tracking-tight uppercase">{m.lead}</p>
                        <p className="text-[10px] text-theme-muted/50 font-bold uppercase tracking-widest mt-1">Inactive</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>

            {/* In-Call Preview (Mock) */}
            <div className="m-6 p-5 rounded-[2rem] bg-theme-primary/5 border border-theme-primary/10 space-y-4 shadow-2xl relative overflow-hidden group/call cursor-pointer ring-1 ring-black/[0.02]">
              <div className="absolute top-0 right-0 p-4">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-theme-primary tracking-[0.2em]">Live Stream</span>
                </div>
                <h5 className="text-sm font-black text-theme-fg uppercase tracking-widest">Team Sync: Sprint 12</h5>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2.5">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-xl border-[3px] border-theme-sidebar-bg bg-theme-primary text-[9px] flex items-center justify-center text-white font-black shadow-lg">
                      {i}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-xl border-[3px] border-theme-sidebar-bg bg-theme-raised text-[9px] flex items-center justify-center text-theme-muted font-black">
                    +8
                  </div>
                </div>
              </div>
              
              <Button size="sm" className="w-full bg-theme-primary h-11 rounded-2xl shadow-xl shadow-theme-primary/30 hover:scale-[1.02] active:scale-95 transition-all text-white font-black uppercase tracking-widest text-[10px]">
                Authorize Feed
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce {
          animation: bounce 1.2s infinite ease-in-out;
        }
      `}</style>
    </motion.div>
  );
}
