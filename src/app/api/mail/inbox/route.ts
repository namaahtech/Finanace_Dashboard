import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActiveToken, zohoGet, classifyEmail } from "@/lib/zoho-mail";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = req.nextUrl;
  const folder     = searchParams.get("folder")      || "Inbox";
  const limit      = parseInt(searchParams.get("limit")  || "50");
  const start      = parseInt(searchParams.get("start")  || "0");
  const employeeId = searchParams.get("employee_id");
  const sync       = searchParams.get("sync") === "true";

  // Fetch from cache first
  let query = supabase
    .from("mail_messages")
    .select("*")
    .eq("folder", folder)
    .order("received_at", { ascending: false })
    .range(start, start + limit - 1);

  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data: cached } = await query;

  // If sync requested or cache empty, fetch from Zoho
  if (sync || !cached?.length) {
    const token = await getActiveToken();
    if (token) {
      const { data: config } = await supabase
        .from("zoho_config")
        .select("admin_account_id")
        .maybeSingle();

      if (config?.admin_account_id) {
        try {
          const zohoRes = await zohoGet(token, `/accounts/${config.admin_account_id}/messages/view`, {
            folder,
            limit:  String(limit),
            start:  String(start),
            sortby: "date",
            order:  "desc",
          });

          if (zohoRes?.data?.length) {
            const rows = zohoRes.data.map((m: any) => ({
              zoho_message_id: m.messageId,
              zoho_account_id: config.admin_account_id,
              folder,
              subject:         m.subject || "(no subject)",
              from_address:    m.fromAddress || "",
              from_name:       m.sender      || m.fromAddress || "",
              to_address:      m.toAddress   ? [m.toAddress] : [],
              preview:         m.summary     || "",
              received_at:     m.receivedTime
                ? new Date(parseInt(m.receivedTime)).toISOString()
                : new Date().toISOString(),
              is_read:         m.status === "1",
              has_attachment:  m.hasAttachment === "1",
              thread_key:      m.threadId || null,
              updated_at:      new Date().toISOString(),
            }));

            await supabase
              .from("mail_messages")
              .upsert(rows, { onConflict: "zoho_message_id" });

            // Trigger AI classification for unclassified messages asynchronously
            rows
              .filter((r: any) => !r.ai_category || r.ai_category === "GENERAL")
              .slice(0, 10)
              .forEach(async (row: any) => {
                try {
                  const ai = await classifyEmail(row.subject, row.preview, row.from_name);
                  await supabase
                    .from("mail_messages")
                    .update({
                      ai_category:     ai.category,
                      ai_priority:     ai.priority,
                      ai_sentiment:    ai.sentiment,
                      ai_summary:      ai.summary,
                      ai_processed_at: new Date().toISOString(),
                    })
                    .eq("zoho_message_id", row.zoho_message_id);
                } catch {}
              });

            const { data: fresh } = await supabase
              .from("mail_messages")
              .select("*")
              .eq("folder", folder)
              .order("received_at", { ascending: false })
              .range(start, start + limit - 1);

            return NextResponse.json({ data: fresh || rows, source: "zoho", connected: true });
          }
        } catch (e: any) {
          console.error("Zoho inbox fetch error:", e.message);
        }
      }
    }

    const { data: config } = await supabase
      .from("zoho_config")
      .select("is_connected")
      .maybeSingle();

    if (!config?.is_connected) {
      return NextResponse.json({ data: [], source: "cache", connected: false });
    }
  }

  return NextResponse.json({ data: cached || [], source: "cache", connected: true });
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { messageId, is_read, is_starred } = await req.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (is_read    !== undefined) updates.is_read    = is_read;
  if (is_starred !== undefined) updates.is_starred = is_starred;

  const { error } = await supabase
    .from("mail_messages")
    .update(updates)
    .eq("id", messageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
