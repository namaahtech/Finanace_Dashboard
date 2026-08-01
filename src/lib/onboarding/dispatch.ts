import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ZOHO_API, getZohoToken } from "@/lib/zoho-auth";
import { zohoGet, zohoPost } from "@/lib/zoho-mail";
import { generateAndStorePdfs, downloadPdf } from "./pdf";
import { buildTemplateData } from "./templateData";
import { loadSettings, resolveSchema } from "./server";
import { onboardingEmailHtml, onboardingFinalEmailHtml, engagementWords } from "./email";
import { baseUrlFrom } from "@/lib/base-url";

interface ZohoAttachment { storeName: string; attachmentName: string; attachmentPath: string; }

/** Upload a file to a Zoho mailbox and return the attachment descriptor for the send payload. */
async function uploadZohoAttachment(
  token: string, accountId: string, filename: string, buffer: Buffer
): Promise<ZohoAttachment> {
  const url = `${ZOHO_API.mail}/accounts/${accountId}/messages/attachments?uploadType=multipart`;
  const fd = new FormData();
  fd.append("attach", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), filename);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`Zoho attachment upload failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  const d = Array.isArray(json?.data) ? json.data[0] : json?.data;
  if (!d?.storeName || !d?.attachmentPath) throw new Error("Zoho attachment upload returned no descriptor");
  return { storeName: d.storeName, attachmentName: d.attachmentName || filename, attachmentPath: d.attachmentPath };
}

interface Sender { accountId: string; fromAddress: string; viaAdmin: boolean; displayName?: string | null; }

/** Every address a Zoho account object can be known by, lower-cased. */
function accountAddresses(a: any): string[] {
  const out: string[] = [];
  if (a?.primaryEmailAddress) out.push(String(a.primaryEmailAddress));
  if (a?.mailboxAddress) out.push(String(a.mailboxAddress));
  if (Array.isArray(a?.emailAddress)) for (const e of a.emailAddress) if (e?.mailId) out.push(String(e.mailId));
  if (Array.isArray(a?.sendMailDetails)) for (const s of a.sendMailDetails) if (s?.fromAddress) out.push(String(s.fromAddress));
  return out.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/**
 * Resolve the sending mailbox: the packet creator's professional Zoho mailbox,
 * else the admin mailbox.
 *
 * This used to require BOTH `zoho_account_id` and `zoho_email` to be stored on the
 * employee row. Most users have neither (they're only populated by Zoho
 * provisioning), so in practice every offer letter went out from admin@ even
 * though it was created by an HR user. We now additionally look the creator up in
 * the live Zoho account list by their login address, and by
 * <local-part>@ZOHO_MAIL_DOMAIN — so talent@namaah.io resolves to their real
 * talent@mail.namaah.io mailbox.
 */
async function resolveSender(
  token: string,
  creator: { email?: string | null; zoho_email: string | null; zoho_account_id: string | null } | null
): Promise<Sender> {
  if (creator?.zoho_account_id && creator?.zoho_email) {
    return { accountId: String(creator.zoho_account_id), fromAddress: creator.zoho_email, viaAdmin: false };
  }

  const supabase = getSupabaseAdmin();
  const { data: config } = await supabase.from("zoho_config").select("admin_account_id").maybeSingle();
  const adminAccountId: string | null = config?.admin_account_id ? String(config.admin_account_id) : null;
  let accountId: string | null = null;
  let fromAddress: string | null = null;
  let viaAdmin = true;

  try {
    const accts = await zohoGet(token, "/accounts");
    const list: any[] = accts?.data || [];

    // Try to match the creator to a real mailbox before falling back.
    if (creator) {
      const domain = (process.env.ZOHO_MAIL_DOMAIN || "").trim().toLowerCase();
      const wanted = [
        creator.zoho_email,
        creator.email,
        domain && creator.email ? `${creator.email.split("@")[0]}@${domain}` : null,
      ]
        .filter(Boolean)
        .map((s) => String(s).trim().toLowerCase());

      for (const want of wanted) {
        const hit = list.find((a) => accountAddresses(a).includes(want));
        if (hit) {
          return { accountId: String(hit.accountId), fromAddress: want, viaAdmin: false };
        }
      }
    }

    const target =
      (adminAccountId && list.find((a) => String(a.accountId) === adminAccountId)) ||
      list.find((a) => a.isDefaultAccount || a.isPrimary) ||
      list[0];
    if (target) {
      accountId = String(target.accountId);
      fromAddress = target.primaryEmailAddress || target.mailboxAddress ||
        (Array.isArray(target.emailAddress) ? target.emailAddress[0]?.mailId : null);
    }
  } catch { /* ignore */ }

  if (!accountId || !fromAddress) throw new Error("Could not resolve a Zoho sender mailbox.");
  return { accountId, fromAddress, viaAdmin };
}

/**
 * Generate the 3 onboarding PDFs, store them, and email them to the candidate
 * from the form creator's Zoho mailbox with a unique e-signature magic link.
 * Sets the packet to "sent" on success. Throws on failure (status stays "approved").
 */
export async function dispatchOnboarding(
  packetId: string,
  // `actorId` = the signed-in employee performing the send. Omit it for the
  // candidate-triggered final dispatch, which has no session.
  opts: { final?: boolean; req?: Request; actorId?: string | null } = {}
): Promise<{ ok: true; messageId?: string; from: string }> {
  const final = !!opts.final;
  const supabase = getSupabaseAdmin();

  const { data: packet } = await supabase.from("onboarding_packets").select("*").eq("id", packetId).maybeSingle();
  if (!packet) throw new Error("Onboarding not found");
  if (!packet.candidate_email) throw new Error("Candidate email is missing");
  if (final && !packet.signature) throw new Error("Candidate has not signed yet.");

  const settings = await loadSettings();
  const schema = resolveSchema(settings);
  const signatory = {
    name: settings?.signatory_name ?? "Rahul Bharath",
    designation: settings?.signatory_designation ?? "Founder, Executive Chairman & Managing Director",
    companyName: settings?.company_name ?? "Namaah Private Limited",
    signatureUrl: settings?.signatory_signature_url ?? null,
    sealUrl: settings?.company_seal_url ?? null,
  };

  // Unique magic-link token (kept stable across re-sends).
  const signToken = packet.sign_token || crypto.randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(); // 21 days

  const data = buildTemplateData({
    candidate: packet,
    config: packet.config,
    schema,
    signatory,
    // Final send embeds the candidate's signature; offer send is unsigned.
    signature: final ? packet.signature : null,
    offerDateISO: final ? (packet.sent_at || packet.approved_at || null) : new Date().toISOString(),
  });

  // 1. PDFs are only generated for the FINAL send (the countersigned copies that
  //    get attached). The OFFER send is link-only: the candidate reviews the docs
  //    live on the /sign page (which renders from template data, not stored PDFs),
  //    so we skip Chromium entirely here. That makes the offer send instant and
  //    reliable, and a link-only email lands in the inbox instead of Spam/Promotions.
  let paths: Partial<Record<"offer" | "nda" | "handbook", string>> = {};
  if (final) {
    paths = await generateAndStorePdfs(packet.id, data);
    await supabase
      .from("onboarding_packets")
      .update({
        offer_pdf_url: paths.offer ?? null,
        nda_pdf_url: paths.nda ?? null,
        handbook_pdf_url: paths.handbook ?? null,
      })
      .eq("id", packet.id);
  } else {
    await supabase
      .from("onboarding_packets")
      .update({ sign_token: signToken, token_expires_at: expires })
      .eq("id", packet.id);
  }

  // 2. Resolve Zoho token + sending mailbox (form creator's, else admin).
  const token = await getZohoToken();
  if (!token) throw new Error("Zoho Mail is not connected. Configure it in Mail Config.");

  // Whose mailbox this goes out from. The person PERFORMING the send wins — if an
  // HR user approves and sends, the candidate hears from that HR user. We fall back
  // to the packet's creator, which is what the candidate-triggered final dispatch
  // uses (no session exists at that point).
  const senderEmployeeId = opts.actorId || packet.created_by;
  let creator: { name: string | null; email: string | null; zoho_email: string | null; zoho_account_id: string | null } | null = null;
  if (senderEmployeeId) {
    const { data: emp } = await supabase
      .from("employees")
      .select("name, email, zoho_email, zoho_account_id")
      .eq("id", senderEmployeeId)
      .maybeSingle();
    creator = (emp as any) ?? null;
  }
  const sender = await resolveSender(token, creator);
  sender.displayName = creator?.name ?? null;

  // 3. Attach the signed PDFs — ONLY on the final send. The offer send carries no
  //    attachments (link-only). Download from Storage + upload to Zoho in parallel.
  const files = final
    ? ([
        { name: `Offer Letter - ${packet.candidate_name}.pdf`, path: paths.offer },
        { name: `NDA - ${packet.candidate_name}.pdf`, path: paths.nda },
        { name: `Internship Handbook.pdf`, path: paths.handbook },
      ].filter((f) => f.path) as { name: string; path: string }[])
    : [];

  const descriptors: ZohoAttachment[] = await Promise.all(
    files.map(async (f) => {
      const buf = await downloadPdf(f.path);
      return uploadZohoAttachment(token, sender.accountId, f.name, buf);
    })
  );

  // 4. Compose + send.
  const signUrl = `${baseUrlFrom(opts.req)}/sign/${signToken}`;
  // Engagement type chosen in the builder drives the wording throughout. Anything
  // other than an explicit 'full_time' (including a packet created before the
  // column existed) is treated as an internship.
  const employmentType: "intern" | "full_time" = packet.employment_type === "full_time" ? "full_time" : "intern";
  const words = engagementWords(employmentType);

  let content = final
    ? onboardingFinalEmailHtml({
        candidateName: packet.candidate_name,
        companyName: signatory.companyName,
        senderName: sender.displayName || creator?.name || signatory.name,
        employmentType,
      })
    : onboardingEmailHtml({
        candidateName: packet.candidate_name,
        signUrl,
        companyName: signatory.companyName,
        senderName: sender.displayName || creator?.name || signatory.name,
        role: typeof packet.config?.position === "string" ? packet.config.position : undefined,
        employmentType,
      });
  if (sender.viaAdmin && creator?.name) {
    content =
      `<div style="font-family:sans-serif;font-size:11px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:16px;max-width:600px;">This message was sent by <strong>${creator.name}</strong>${creator.email ? ` (${creator.email})` : ""} via ${signatory.companyName}.</div>` +
      content;
  }

  const payload: Record<string, unknown> = {
    fromAddress: sender.fromAddress,
    toAddress: packet.candidate_email,
    subject: final
      ? `${words.subjectSigned} — ${signatory.companyName}`
      : `${words.subjectOffer} — Action Required to Accept`,
    content,
    mailFormat: "html",
  };
  if (descriptors.length) payload.attachments = descriptors;

  const res = await zohoPost(token, `/accounts/${sender.accountId}/messages`, payload);
  if (res?.status?.code !== 200 && res?.status?.code !== 201) {
    throw new Error(`Zoho send failed: ${JSON.stringify(res?.status ?? res)}`);
  }

  await supabase
    .from("onboarding_packets")
    .update(final ? { status: "completed" } : { status: "sent", sent_at: new Date().toISOString() })
    .eq("id", packet.id);

  return { ok: true, messageId: res?.data?.messageId, from: sender.fromAddress };
}
