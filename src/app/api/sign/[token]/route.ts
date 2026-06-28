import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { loadSettings, resolveSchema } from "@/lib/onboarding/server";
import { buildTemplateData } from "@/lib/onboarding/templateData";
import { generateAndStorePdfs } from "@/lib/onboarding/pdf";

type Ctx = { params: Promise<{ token: string }> };

function isExpired(packet: any): boolean {
  return !!packet.token_expires_at && new Date(packet.token_expires_at).getTime() < Date.now();
}

// GET /api/sign/[token] — fetch the offer for the candidate (marks it "viewed").
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();

  const { data: packet } = await supabase
    .from("onboarding_packets")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle();

  if (!packet) return NextResponse.json({ error: "This signing link is invalid." }, { status: 404 });

  const settings = await loadSettings();
  const schema = resolveSchema(settings);
  const signatory = {
    name: settings?.signatory_name ?? "Rahul Bharath",
    designation: settings?.signatory_designation ?? "Founder, Executive Chairman & Managing Director",
    companyName: settings?.company_name ?? "Namaah Private Limited",
  };

  const alreadySigned = packet.status === "signed" || packet.status === "completed";

  // First open → mark viewed.
  if (packet.status === "sent") {
    await supabase
      .from("onboarding_packets")
      .update({ status: "viewed", viewed_at: new Date().toISOString() })
      .eq("id", packet.id);
  }

  const data = buildTemplateData({
    candidate: packet,
    config: packet.config,
    schema,
    signatory,
    signature: packet.signature ?? null,
    offerDateISO: packet.sent_at || packet.approved_at || null,
  });

  return NextResponse.json({
    companyName: signatory.companyName,
    candidateName: packet.candidate_name,
    candidateEmail: packet.candidate_email,
    status: packet.status,
    alreadySigned,
    expired: isExpired(packet),
    signedAt: packet.signed_at,
    data,
  });
}

// POST /api/sign/[token] — submit the candidate's e-signature.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const { image_base64, typed_name, agreed } = await req.json().catch(() => ({}));

  if (!agreed) return NextResponse.json({ error: "Please confirm the acknowledgement." }, { status: 400 });
  if (!typed_name?.trim()) return NextResponse.json({ error: "Please type your full name." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: packet } = await supabase
    .from("onboarding_packets")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle();

  if (!packet) return NextResponse.json({ error: "Invalid signing link." }, { status: 404 });
  if (packet.status === "signed" || packet.status === "completed") {
    return NextResponse.json({ error: "This offer has already been signed." }, { status: 400 });
  }
  if (isExpired(packet)) return NextResponse.json({ error: "This signing link has expired." }, { status: 410 });

  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "").trim();
  const signature = {
    image_base64: image_base64 || undefined,
    typed_name: typed_name.trim(),
    signed_at: new Date().toISOString(),
    ip: ip || undefined,
    user_agent: req.headers.get("user-agent") || undefined,
  };

  await supabase
    .from("onboarding_packets")
    .update({ signature, status: "signed", signed_at: signature.signed_at })
    .eq("id", packet.id);

  // Regenerate counter-signed Offer + NDA PDFs (best-effort; signing succeeds regardless).
  try {
    const settings = await loadSettings();
    const schema = resolveSchema(settings);
    const signatory = {
      name: settings?.signatory_name ?? "Rahul Bharath",
      designation: settings?.signatory_designation ?? "Founder, Executive Chairman & Managing Director",
      companyName: settings?.company_name ?? "Namaah Private Limited",
    };
    const data = buildTemplateData({
      candidate: packet,
      config: packet.config,
      schema,
      signatory,
      signature,
      offerDateISO: packet.sent_at || packet.approved_at || null,
    });
    const paths = await generateAndStorePdfs(packet.id, data, ["offer", "nda"]);
    await supabase
      .from("onboarding_packets")
      .update({ offer_pdf_url: paths.offer ?? packet.offer_pdf_url, nda_pdf_url: paths.nda ?? packet.nda_pdf_url })
      .eq("id", packet.id);
  } catch (e: any) {
    console.error("[sign] counter-signed PDF regeneration failed:", e.message);
  }

  // Notify the creator + admins.
  const recipients = new Set<string>();
  if (packet.created_by) recipients.add(packet.created_by);
  const { data: admins } = await supabase.from("employees").select("id").eq("role", "admin");
  admins?.forEach((a) => recipients.add(a.id));
  if (recipients.size) {
    await supabase.from("system_notifications").insert(
      [...recipients].map((uid) => ({
        user_id: uid,
        title: `Offer Signed — ${packet.candidate_name}`,
        message: `${packet.candidate_name} has e-signed their internship offer and NDA.`,
        type: "success",
        link: `/admin/onboarding/${packet.id}`,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
