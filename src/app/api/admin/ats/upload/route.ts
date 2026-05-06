import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { inflateSync } from "zlib";

function extractPdfText(buffer: Buffer): string {
  try {
    const chunks: string[] = [];

    function decode(s: string): string {
      return s
        .replace(/\\([0-7]{3})/g, (_: string, o: string) => String.fromCharCode(parseInt(o, 8)))
        .replace(/\\n|\\r|\\t/g, " ")
        .replace(/\\(.)/g, "$1");
    }

    function parseTextFromRaw(raw: string) {
      const btEt = /BT([\s\S]*?)ET/g;
      let b;
      while ((b = btEt.exec(raw)) !== null) {
        const block = b[1];
        const tjArr = /\[([\s\S]*?)\]\s*TJ/g;
        const tj = /\(((?:[^()\\]|\\[\s\S])*)\)\s*(?:Tj|')/g;
        let m;
        while ((m = tjArr.exec(block)) !== null) {
          const parts = m[1].match(/\(([^)]*)\)/g) || [];
          for (const p of parts) {
            const t = decode(p.slice(1, -1));
            if (t.trim()) chunks.push(t);
          }
        }
        while ((m = tj.exec(block)) !== null) {
          const t = decode(m[1]);
          if (t.trim()) chunks.push(t);
        }
      }
    }

    const raw = buffer.toString("binary");
    parseTextFromRaw(raw);

    const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch;
    while ((streamMatch = streamRe.exec(raw)) !== null) {
      const before = raw.slice(Math.max(0, streamMatch.index - 500), streamMatch.index);
      if (!/FlateDecode/i.test(before)) continue;
      try {
        const decompressed = inflateSync(Buffer.from(streamMatch[1], "binary")).toString("latin1");
        parseTextFromRaw(decompressed);
      } catch { /* skip */ }
    }

    return chunks.join(" ").replace(/\s+/g, " ").trim();
  } catch { return ""; }
}

/**
 * Extracts text from a DOCX buffer by reading the word/document.xml entry.
 * DOCX files are ZIP archives.
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    // Find the PK zip signature and locate word/document.xml
    const str = buffer.toString("binary");
    // Simple approach: grab all XML text between > and < tags
    const xmlMatches = str.match(/word\/document\.xml/);
    if (!xmlMatches) return "";

    // Find document.xml content in the zip (it follows the filename)
    const docXmlIndex = str.indexOf("word/document.xml");
    if (docXmlIndex === -1) return "";

    // Extract a large chunk after the filename and strip XML tags
    const chunk = str.slice(docXmlIndex, docXmlIndex + 500000);
    const textContent = chunk
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    return textContent.substring(0, 50000);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clusterId = formData.get("clusterId") as string | null;
    const appId = formData.get("appId") as string | null;

    if (!file || !clusterId || !appId) {
      return NextResponse.json({ error: "Missing file, clusterId, or appId" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text based on file type
    let rawText = "";
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".pdf")) {
      rawText = extractPdfText(buffer);
    } else if (lowerName.endsWith(".docx")) {
      rawText = await extractDocxText(buffer);
    }

    // Upload file to Supabase storage
    const filePath = `candidates/${appId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (uploadError) throw uploadError;

    // Derive name and email from filename
    const nameMatch = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    const emailBase = nameMatch.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    // Insert application record with extracted text
    const { error: insertError } = await supabase.from("applications").insert({
      application_id: appId,
      applied_cluster_id: clusterId,
      applicant_name: nameMatch,
      applicant_email: `${emailBase}@example.com`,
      resume_file_path: filePath,
      raw_resume_text: rawText,
      processing_status: "pending",
      decision: "pending",
    });
    if (insertError) throw insertError;

    // Call process-application internally
    const baseUrl = req.nextUrl.origin;
    const aiRes = await fetch(`${baseUrl}/api/admin/recruitment/process-application`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: appId }),
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      // Still return partial success — record was inserted, AI failed
      return NextResponse.json(
        { success: false, appId, error: aiData.error || "AI processing failed", rawTextLength: rawText.length },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, appId, analysis: aiData.analysis, rawTextLength: rawText.length });
  } catch (err: any) {
    console.error("ATS upload error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
