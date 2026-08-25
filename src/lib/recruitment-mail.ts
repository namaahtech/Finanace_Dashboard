import { getSupabaseAdmin } from "@/lib/supabase";
import { ZOHO_API, getZohoToken } from "@/lib/zoho-auth";
import { zohoGet, zohoPost } from "@/lib/zoho-mail";

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface MailContext {
  token: string;
  accountId: string;
  fromAddress: string;
  companyName: string;
  /** True when the mail is going out from the acting user's own mailbox. */
  sentAsActor?: boolean;
  /** Display name of the acting user, for sign-offs. */
  actorName?: string | null;
}

/** The employee whose mailbox should appear in the From line. */
export interface MailActor {
  name: string;
  email: string;
  zoho_email: string | null;
  zoho_account_id: string | null;
}

/** Document-type → human label, used in emails and the upload page. */
export const DOC_LABELS: Record<string, string> = {
  profile_photo: "Profile Photo (for ID Card)",
  face_photo: "Face Verification Selfie",
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  other: "Supporting Document",
};

/** Company name for display (no Zoho call needed). */
export async function getCompanyName(): Promise<string> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("company_profile").select("company_name").limit(1).maybeSingle();
    return data?.company_name || "Namaah";
  } catch {
    return "Namaah";
  }
}

/** Every address a Zoho account object can be known by, lower-cased. */
function accountAddresses(a: any): string[] {
  const out: string[] = [];
  if (a?.primaryEmailAddress) out.push(String(a.primaryEmailAddress));
  if (a?.mailboxAddress) out.push(String(a.mailboxAddress));
  if (Array.isArray(a?.emailAddress)) {
    for (const e of a.emailAddress) if (e?.mailId) out.push(String(e.mailId));
  }
  if (Array.isArray(a?.sendMailDetails)) {
    for (const s of a.sendMailDetails) if (s?.fromAddress) out.push(String(s.fromAddress));
  }
  return out.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/**
 * Resolve the Zoho mailbox to send from.
 *
 * Pass the ACTING user (see `getMailActor`) and mail goes out from THEIR mailbox
 * — so an offer sent by an HR user arrives from the HR address, not from admin@.
 * Previously this always resolved the admin/default account, so every automated
 * mail appeared to come from admin@ regardless of who performed the action.
 *
 * Resolution order, first match wins:
 *   1. the employee's stored `zoho_account_id`
 *   2. a Zoho account matching their `zoho_email`
 *   3. a Zoho account matching their login `email`
 *   4. a Zoho account matching <local-part>@ZOHO_MAIL_DOMAIN
 *      (covers talent@namaah.io → talent@mail.namaah.io)
 *   5. the configured admin account / Zoho default — the previous behaviour
 *
 * Falling back is deliberate: a user without a provisioned mailbox must still be
 * able to trigger mail rather than hitting an error mid-flow.
 */
export async function getMailContext(actor?: MailActor | null): Promise<MailContext> {
  const token = await getZohoToken();
  if (!token) throw new Error("Zoho Mail is not connected. Connect it in Mail Config first.");

  const supabase = getSupabaseAdmin();
  const { data: config } = await supabase.from("zoho_config").select("admin_account_id").maybeSingle();

  const adminAccountId: string | null = config?.admin_account_id ? String(config.admin_account_id) : null;
  let accountId: string | null = null;
  let fromAddress: string | null = null;
  let sentAsActor = false;

  try {
    const accts = await zohoGet(token, "/accounts");
    const list: any[] = accts?.data || [];

    // ── 1–4: try to send as the acting user ─────────────────────────────────
    let target: any = null;
    if (actor) {
      const domain = (process.env.ZOHO_MAIL_DOMAIN || "").trim().toLowerCase();
      const candidates = [
        actor.zoho_email,
        actor.email,
        domain && actor.email ? `${actor.email.split("@")[0]}@${domain}` : null,
      ]
        .filter(Boolean)
        .map((s) => String(s).trim().toLowerCase());

      if (actor.zoho_account_id) {
        target = list.find((a) => String(a.accountId) === String(actor.zoho_account_id)) || null;
      }
      if (!target) {
        for (const want of candidates) {
          target = list.find((a) => accountAddresses(a).includes(want)) || null;
          if (target) {
            // Prefer the address we matched on, so the From line is the one the
            // recipient expects to see.
            fromAddress = want;
            break;
          }
        }
      }
      if (target) sentAsActor = true;
    }

    // ── 5: fall back to the admin / default company mailbox ─────────────────
    if (!target) {
      fromAddress = null;
      target =
        (adminAccountId && list.find((a) => String(a.accountId) === adminAccountId)) ||
        list.find((a) => a.isDefaultAccount || a.isPrimary) ||
        list[0];
      if (actor) {
        console.warn(
          `[mail] no Zoho mailbox found for ${actor.email || actor.name || "actor"} — sending from the company default instead.`
        );
      }
    }

    if (target) {
      accountId = String(target.accountId);
      fromAddress =
        fromAddress ||
        target.primaryEmailAddress ||
        target.mailboxAddress ||
        (Array.isArray(target.emailAddress) ? target.emailAddress[0]?.mailId : null);
    }
  } catch (e: any) {
    throw new Error(`Could not resolve the Zoho sender mailbox: ${e.message}`);
  }
  if (!accountId || !fromAddress) throw new Error("Could not resolve the company Zoho mailbox.");

  return {
    token,
    accountId,
    fromAddress,
    companyName: await getCompanyName(),
    sentAsActor,
    actorName: actor?.name || null,
  };
}

/**
 * The signed-in employee to send mail as. Resolved from the request session; when
 * there is no session (public candidate routes such as the document upload or the
 * e-sign OTP) pass the employee who OWNS the record instead, so the candidate
 * still hears from the person handling them rather than from admin@.
 */
export async function getMailActor(employeeId?: string | null): Promise<MailActor | null> {
  if (!employeeId) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("employees")
      .select("name, email, zoho_email, zoho_account_id")
      .eq("id", employeeId)
      .maybeSingle();
    if (!data) return null;
    return {
      name: (data as any).name ?? "",
      email: (data as any).email ?? "",
      zoho_email: (data as any).zoho_email ?? null,
      zoho_account_id: (data as any).zoho_account_id ?? null,
    };
  } catch {
    return null;
  }
}

interface ZohoAttachmentDescriptor { storeName: string; attachmentName: string; attachmentPath: string; }

async function uploadAttachment(ctx: MailContext, att: MailAttachment): Promise<ZohoAttachmentDescriptor> {
  const url = `${ZOHO_API.mail}/accounts/${ctx.accountId}/messages/attachments?uploadType=multipart`;
  const fd = new FormData();
  fd.append("attach", new Blob([new Uint8Array(att.content)], { type: att.contentType || "application/octet-stream" }), att.filename);
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Zoho-oauthtoken ${ctx.token}` }, body: fd });
  if (!res.ok) throw new Error(`Zoho attachment upload failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  const d = Array.isArray(json?.data) ? json.data[0] : json?.data;
  if (!d?.storeName || !d?.attachmentPath) throw new Error("Zoho attachment upload returned no descriptor");
  return { storeName: d.storeName, attachmentName: d.attachmentName || att.filename, attachmentPath: d.attachmentPath };
}

export async function sendRecruitmentMail(
  ctx: MailContext,
  opts: { to: string; subject: string; html: string; replyTo?: string; attachments?: MailAttachment[] }
): Promise<void> {
  const payload: Record<string, unknown> = {
    fromAddress: ctx.fromAddress,
    toAddress: opts.to,
    subject: opts.subject,
    content: opts.html,
    mailFormat: "html",
  };
  if (opts.attachments?.length) {
    const descriptors: ZohoAttachmentDescriptor[] = [];
    for (const a of opts.attachments) descriptors.push(await uploadAttachment(ctx, a));
    payload.attachments = descriptors;
  }
  // Note: Zoho's send API doesn't carry a Reply-To header; the candidate's
  // address is surfaced in the subject + body instead so HR can reply directly.

  const res = await zohoPost(ctx.token, `/accounts/${ctx.accountId}/messages`, payload);
  if (res?.status?.code !== 200 && res?.status?.code !== 201) {
    throw new Error(`Zoho send failed: ${JSON.stringify(res?.status ?? res)}`);
  }
}

// ── Email layout — clean, professional, transactional (table-based for clients) ──
function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function shell(companyName: string, inner: string): string {
  const year = new Date().getFullYear();
  const co = esc(companyName);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f5f7;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e6e8eb;border-radius:10px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="padding:22px 36px 18px;border-bottom:1px solid #eef0f2;">
          <span style="font-size:17px;font-weight:700;color:#0f172a;letter-spacing:.2px;">${co}</span>
        </td></tr>
        <tr><td style="padding:30px 36px;color:#374151;font-size:15px;line-height:1.7;">${inner}</td></tr>
        <tr><td style="padding:18px 36px 22px;border-top:1px solid #eef0f2;background:#fafbfc;">
          <p style="margin:0;font-size:11px;color:#9aa3af;line-height:1.6;">This is an automated message from ${co}. Please do not share verification codes or personal links with anyone. If you received this email in error, kindly disregard it.</p>
        </td></tr>
      </table>
      <p style="margin:14px 0 0;font-size:11px;color:#b4bac2;">© ${year} ${co}. All rights reserved.</p>
    </td></tr>
  </table>
</body></html>`;
}

function signoff(team: string, companyName: string): string {
  return `<p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:#374151;">Warm regards,<br/><strong style="color:#0f172a;">${esc(team)}</strong><br/><span style="color:#6b7280;">${esc(companyName)}</span></p>`;
}

function button(link: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
    <td style="border-radius:8px;background:#0f172a;">
      <a href="${link}" style="display:inline-block;padding:13px 30px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(label)}</a>
    </td></tr></table>`;
}

/** Accept / reject greeting (manual flow — role-agnostic). */
export function greetingHtml(name: string, accepted: boolean, companyName: string): string {
  const n = esc(name);
  const co = esc(companyName);
  const inner = accepted
    ? `<p style="margin:0 0 16px;">Dear ${n},</p>
       <p style="margin:0 0 16px;">Thank you for taking the time to interview with us. We are delighted to inform you that you have been <strong>selected for an internship</strong> with ${co}.</p>
       <p style="margin:0 0 16px;">Your skills and the conversations we had stood out to our team, and we're genuinely excited about the contribution you'll make. Our HR team will reach out shortly with your onboarding details and the next steps to get you started.</p>
       <p style="margin:0 0 16px;">If you have any questions in the meantime, simply reply to this email — we're glad to help.</p>
       <p style="margin:0;">Once again, congratulations and welcome aboard.</p>
       ${signoff("Talent Acquisition Team", companyName)}`
    : `<p style="margin:0 0 16px;">Dear ${n},</p>
       <p style="margin:0 0 16px;">Thank you for your interest in ${co} and for taking the time to interview with us. We truly appreciate the effort you invested throughout the process.</p>
       <p style="margin:0 0 16px;">After careful consideration, we have decided not to move forward with your application at this time. This was a difficult decision given the strength of applicants, and it is in no way a reflection of your abilities or potential.</p>
       <p style="margin:0 0 16px;">We sincerely encourage you to apply for future opportunities that match your profile, and we wish you great success in the road ahead.</p>
       <p style="margin:0;">Thank you again, and we wish you all the very best.</p>
       ${signoff("Talent Acquisition Team", companyName)}`;
  return shell(companyName, inner);
}

/**
 * Intern → full-time conversion offer. Same house style as every other
 * recruitment mail (shell + signoff), so it reads as one voice.
 */
export function fullTimeConversionHtml(opts: {
  name: string;
  companyName: string;
  designation?: string | null;
  department?: string | null;
  effectiveDate?: string | null;
  annualCtc?: number | null;
  message?: string | null;
}): string {
  const n = esc(opts.name);
  const co = esc(opts.companyName);

  const rows: string[] = [];
  if (opts.designation) rows.push(["Role", esc(opts.designation)] as any);
  if (opts.department) rows.push(["Department", esc(opts.department)] as any);
  if (opts.effectiveDate) rows.push(["Effective from", esc(opts.effectiveDate)] as any);
  if (opts.annualCtc && opts.annualCtc > 0) {
    rows.push(["Annual CTC", `₹${Number(opts.annualCtc).toLocaleString("en-IN")}`] as any);
  }

  const detailTable = rows.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:22px 0;border:1px solid #eef0f2;border-radius:8px;background:#fafbfc;">
        ${(rows as unknown as [string, string][])
          .map(
            ([k, v], i) =>
              `<tr>
                 <td style="padding:11px 16px;font-size:13px;color:#6b7280;${i ? "border-top:1px solid #eef0f2;" : ""}">${k}</td>
                 <td style="padding:11px 16px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;${i ? "border-top:1px solid #eef0f2;" : ""}">${v}</td>
               </tr>`
          )
          .join("")}
       </table>`
    : "";

  const note = opts.message?.trim()
    ? `<p style="margin:0 0 16px;padding:14px 16px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:4px;color:#374151;">${esc(opts.message.trim()).replace(/\n/g, "<br/>")}</p>`
    : "";

  const inner = `<p style="margin:0 0 16px;">Dear ${n},</p>
    <p style="margin:0 0 16px;">Thank you for everything you have contributed during your internship with ${co}. Your work, attitude and consistency have not gone unnoticed.</p>
    <p style="margin:0 0 16px;">We are delighted to offer you a <strong>full-time position</strong> with us.</p>
    ${detailTable}
    ${note}
    <p style="margin:0 0 16px;">Our HR team will follow up shortly with your formal employment documents and joining formalities. If you have any questions in the meantime, simply reply to this email — we're glad to help.</p>
    <p style="margin:0;">Congratulations, and thank you for choosing to grow with us.</p>
    ${signoff("Human Resources", opts.companyName)}`;

  return shell(opts.companyName, inner);
}

/** Request-documents email with the candidate's unique upload link. */
export function requestDocsHtml(name: string, companyName: string, link: string, docs: string[]): string {
  const list = docs.map((d) => `<li style="margin:6px 0;">${esc(DOC_LABELS[d] || d)}</li>`).join("");
  const inner = `
    <p style="margin:0 0 16px;">Dear ${esc(name)},</p>
    <p style="margin:0 0 16px;">Congratulations once again on joining ${esc(companyName)}. To complete your onboarding, we kindly request you to submit the following documents:</p>
    <ul style="margin:0;padding-left:20px;color:#374151;">${list}</ul>
    <p style="margin:16px 0 0;">Please use your secure personal link below to upload them:</p>
    ${button(link, "Upload My Documents")}
    <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">Kindly ensure each document is clear and legible. Your information is transmitted securely and used solely for onboarding and verification purposes.</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">If the button doesn't work, copy and paste this link into your browser:<br/><span style="color:#1d4ed8;word-break:break-all;">${link}</span></p>
    <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">This link is unique to you — please do not share it with anyone.</p>
    ${signoff("HR Team", companyName)}`;
  return shell(companyName, inner);
}

/** Reminder email — same upload link, optionally with a custom note from HR. */
export function reminderDocsHtml(name: string, companyName: string, link: string, docs: string[], customMessage?: string | null): string {
  const list = docs.map((d) => `<li style="margin:6px 0;">${esc(DOC_LABELS[d] || d)}</li>`).join("");
  const custom = customMessage
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #cbd5e1;color:#374151;white-space:pre-wrap;">${esc(customMessage)}</p>`
    : "";
  const inner = `
    <p style="margin:0 0 16px;">Dear ${esc(name)},</p>
    <p style="margin:0 0 16px;">We hope you're doing well. This is a gentle reminder to complete your onboarding with ${esc(companyName)} — we haven't yet received the following documents:</p>
    <ul style="margin:0;padding-left:20px;color:#374151;">${list}</ul>
    ${custom}
    ${button(link, "Upload My Documents")}
    <p style="margin:0;font-size:13px;color:#6b7280;">Your secure link (unique to you):<br/><span style="color:#1d4ed8;word-break:break-all;">${link}</span></p>
    ${signoff("HR Team", companyName)}`;
  return shell(companyName, inner);
}

/** One-time verification code for the e-sign identity gate. */
export function otpEmailHtml(code: string, companyName: string): string {
  const inner = `
    <p style="margin:0 0 14px;">Hello,</p>
    <p style="margin:0 0 4px;">Please use the verification code below to confirm your identity and sign your documents. For your security, this code expires in <strong>1 minute</strong>.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
      <td style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:16px 28px;">
        <span style="font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:12px;color:#0f172a;">${esc(code)}</span>
      </td></tr></table>
    <p style="margin:0;font-size:13px;color:#6b7280;">If you didn't request this code, you can safely ignore this email — no action is needed.</p>
    ${signoff("Onboarding Team", companyName)}`;
  return shell(companyName, inner);
}

/**
 * Offer-revoked notice — sent to a candidate whose offer was mailed but who did
 * not join, when HR/admin revokes it within the window. Professional, no-blame.
 */
export function offerRevokedHtml(name: string, companyName: string, reason?: string | null): string {
  const n = esc(name);
  const co = esc(companyName);
  const note = reason?.trim()
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #cbd5e1;color:#374151;white-space:pre-wrap;">${esc(reason.trim())}</p>`
    : "";
  const inner = `
    <p style="margin:0 0 16px;">Dear ${n},</p>
    <p style="margin:0 0 16px;">We are writing regarding the offer previously extended to you by ${co}. As we did not receive confirmation of your joining, the offer and the associated onboarding have now been <strong>withdrawn</strong>, and your onboarding record has been closed.</p>
    ${note}
    <p style="margin:0 0 16px;">If this was unexpected or you believe it to be in error, please reply to this email at the earliest and our team will be glad to assist.</p>
    <p style="margin:0;">We thank you for your time and wish you the very best in your future endeavours.</p>
    ${signoff("Human Resources", companyName)}`;
  return shell(companyName, inner);
}

/**
 * Employee-removed notice — sent when a joined employee is permanently removed
 * (archived) from the system. Company mailbox access is disabled.
 */
export function employeeRemovedHtml(name: string, companyName: string, reason?: string | null): string {
  const n = esc(name);
  const co = esc(companyName);
  const note = reason?.trim()
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #cbd5e1;color:#374151;white-space:pre-wrap;">${esc(reason.trim())}</p>`
    : "";
  const inner = `
    <p style="margin:0 0 16px;">Dear ${n},</p>
    <p style="margin:0 0 16px;">This is to formally confirm that your association with ${co} has been concluded, and your access to company systems — including your company mailbox — has been deactivated with immediate effect.</p>
    ${note}
    <p style="margin:0 0 16px;">Please ensure you have retained any personal information from your company accounts, as access can no longer be provided. Should you have any pending queries regarding dues or documents, kindly reply to this email.</p>
    <p style="margin:0;">We thank you for your time with us and wish you well ahead.</p>
    ${signoff("Human Resources", companyName)}`;
  return shell(companyName, inner);
}

/** Email sent back to HR with the candidate's submitted documents attached. */
export function hrReturnHtml(opts: {
  name: string; email: string; phone?: string | null; message?: string | null; docs: string[]; companyName: string;
}): string {
  const list = opts.docs.map((d) => `<li style="margin:6px 0;">${esc(DOC_LABELS[d] || d)}</li>`).join("");
  const msg = opts.message
    ? `<p style="margin:16px 0 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #cbd5e1;color:#374151;white-space:pre-wrap;"><span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#9aa3af;margin-bottom:4px;">Message from candidate</span>${esc(opts.message)}</p>`
    : "";
  const inner = `
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;"><strong>Documents received</strong></p>
    <p style="margin:0 0 16px;"><strong>${esc(opts.name)}</strong> has submitted their onboarding documents, attached to this email.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;margin:0 0 16px;">
      <tr><td style="padding:3px 14px 3px 0;color:#6b7280;">Email</td><td>${esc(opts.email)}</td></tr>
      ${opts.phone ? `<tr><td style="padding:3px 14px 3px 0;color:#6b7280;">Phone</td><td>${esc(opts.phone)}</td></tr>` : ""}
    </table>
    <p style="margin:0 0 6px;font-weight:600;color:#0f172a;">Attached documents</p>
    <ul style="margin:0;padding-left:20px;color:#374151;">${list}</ul>
    ${msg}
    <p style="margin:18px 0 0;font-size:13px;color:#6b7280;">To reach the candidate, reply to ${esc(opts.email)}. The files are also available in the File Share module.</p>`;
  return shell(opts.companyName, inner);
}
