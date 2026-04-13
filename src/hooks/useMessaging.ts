"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/layout/AuthProvider";

export function useMessaging(channelId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: any) => {
          setMessages((current) => [...current, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, fetchMessages]);

  const sendMessage = async (content: string, fileUrl?: string, fileData?: any) => {
    if (!user) return;

    const newMessage = {
      channel_id: channelId,
      sender_id: user.id,
      sender_name: user.name,
      content,
      file_url: fileUrl,
      file_name: fileData?.name,
      file_type: fileData?.type,
      file_size: fileData?.size,
    };

    // Optimistic UI could be handled here or by just waiting for realtime
    const { error } = await supabase.from("messages").insert([newMessage]);
    if (error) console.error("Error sending message:", error);
  };

  return { messages, loading, sendMessage };
}

export function usePresence(orgId: string) {
  const [onlineUsers, setOnlineUsers] = useState<any>({});
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`presence:${orgId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState();
        setOnlineUsers(newState);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }: { key: string; newPresences: any[] }) => {
        console.log("join", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }: { key: string; leftPresences: any[] }) => {
        console.log("leave", key, leftPresences);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: user.id,
            name: user.name,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, user]);

  return { onlineUsers };
}
