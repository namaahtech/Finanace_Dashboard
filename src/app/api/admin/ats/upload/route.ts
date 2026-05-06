import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Extracts readable text from a PDF buffer using raw stream parsing.
 * Handles text-based PDFs without external libraries.
 * Falls back to empty string for image-only PDFs (scanned).
 */
function extractPdfText(buffer: Buffer): string {
  try {
    const raw = buffer.toString("binary");
    const textChunks: string[] = [];

    // Extract all BT...ET blocks (PDF text objects)
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btEtRegex.exec(raw)) !== null) {
      const block = btMatch[1];
      // Match Tj and TJ operators
      const tjRegex = /\(((?:[^()\\]|\\[\s\S])*)\)\s*(?:Tj|'|")/g;
      const tjArrayRegex = /\[((?:[^[\]]*(?:\([^)]*\))?[^[\]]*)*)\]\s*TJ/g;

      let m;
      while ((m = tjRegex.exec(block)) !== null) {
        const decoded = m[1]
          .replace(/\\n/g, " ")
          .replace(/\\r/g, " ")
          .replace(/\\t/g, " ")
          .replace(/\\([0-7]{3})/g, (_: string, oct: string) =>
            String.fromCharCode(parseInt(oct, 8))
          )
          .replace(/\\(.)/g, "$1");
        textChunks.push(decoded);
      }

      while ((m = tjArrayRegex.exec(block)) !== null) {
        const inner = m[1];
        const parts = inner.match(/\((?:[^()\\]|\\[\s\S])*\)/g) || [];
        for (const part of parts) {
          const decoded = part
            .slice(1, -1)
            .replace(/\\n/g, " ")
            .replace(/\\r/g, " ")
            .replace(/\\([0-7]{3})/g, (_: string, oct: string) =>
              String.fromCharCode(parseInt(oct, 8))
            )
            .replace(/\\(.)/g, "$1");
          textChunks.push(decoded);
        }
      }
    }

    const text = textChunks.join(" ").replace(/\s+/g, " ").trim();
    return text;
  } catch {
    return "";
  }
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
