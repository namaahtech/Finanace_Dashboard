import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { classifyEmail, generateReplySuggestions, summarizeThread, callGemma } from "@/lib/zoho-mail";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body     = await req.json();
  const { type, messageId, subject, preview, fromName, body: emailBody, messages } = body;

  try {
    if (type === "classify") {
      // Check AI cache first
      if (messageId) {
        const { data: cached } = await supabase
          .from("mail_ai_cache")
          .select("*")
          .eq("zoho_message_id", messageId)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (cached) {
          return NextResponse.json({
            category:         cached.category,
            priority:         cached.priority,
            sentiment:        cached.sentiment,
            summary:          cached.summary,
            replySuggestions: cached.reply_suggestions,
            source:           "cache",
          });
        }
      }

      const ai = await classifyEmail(subject || "", preview || emailBody || "", fromName || "");
      const suggestions = emailBody
        ? await generateReplySuggestions(subject || "", emailBody)
        : [];

      if (messageId) {
        await supabase.from("mail_ai_cache").upsert({
          zoho_message_id:  messageId,
          category:         ai.category,
          priority:         ai.priority,
          sentiment:        ai.sentiment,
          summary:          ai.summary,
          reply_suggestions: suggestions,
          processed_at:     new Date().toISOString(),
          expires_at:       new Date(Date.now() + 3600 * 1000).toISOString(),
        }, { onConflict: "zoho_message_id" });

        await supabase.from("mail_messages").update({
          ai_category:     ai.category,
          ai_priority:     ai.priority,
          ai_sentiment:    ai.sentiment,
          ai_summary:      ai.summary,
          ai_processed_at: new Date().toISOString(),
        }).eq("zoho_message_id", messageId);
      }

      return NextResponse.json({ ...ai, replySuggestions: suggestions, source: "gemma" });
    }

    if (type === "reply_suggest") {
      const suggestions = await generateReplySuggestions(subject || "", emailBody || "");
      return NextResponse.json({ suggestions });
    }

    if (type === "summarize_thread") {
      const summary = await summarizeThread(messages || []);
      return NextResponse.json({ summary });
    }

    if (type === "digest") {
      const list = (messages || [])
        .slice(0, 10)
        .map((m: any) => `• From ${m.from_name}: ${m.subject} — ${m.preview}`)
        .join("\n");

      const prompt = `You are an executive assistant. Summarize these unread priority emails in 3 sentences for a busy executive:\n\n${list}\n\nBrief summary:`;
      const digest = await callGemma(prompt);
      return NextResponse.json({ digest: digest || "No priority emails at the moment." });
    }

    if (type === "improve_tone") {
      const prompt = `Rewrite the following email to sound more professional and concise:\n\n${emailBody}\n\nImproved version:`;
      const improved = await callGemma(prompt);
      return NextResponse.json({ improved });
    }

    if (type === "shorten") {
      const prompt = `Shorten this email to under 3 sentences while keeping the key information:\n\n${emailBody}\n\nShortened version:`;
      const shortened = await callGemma(prompt);
      return NextResponse.json({ shortened });
    }

    if (type === "suggest_subject") {
      const prompt = `Suggest a professional email subject line for this email body:\n\n${emailBody}\n\nSubject:`;
      const suggested = await callGemma(prompt);
      return NextResponse.json({ subject: suggested?.replace(/^Subject:\s*/i, "").trim() });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
