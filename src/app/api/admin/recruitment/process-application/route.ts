import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { callAI, parseAIJSON } from "@/lib/ai";

function extractPdfText(buffer: Buffer): string {
  try {
    const raw = buffer.toString("binary");
    const chunks: string[] = [];
    const btEt = /BT([\s\S]*?)ET/g;
    let b;
    while ((b = btEt.exec(raw)) !== null) {
      const block = b[1];
      const tj = /\(((?:[^()\\]|\\[\s\S])*)\)\s*(?:Tj|'|")/g;
      const tjArr = /\[((?:[^[\]]*(?:\([^)]*\))?[^[\]]*)*)\]\s*TJ/g;
      let m;
      while ((m = tj.exec(block)) !== null) {
        chunks.push(m[1].replace(/\\([0-7]{3})/g, (_: string, o: string) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, "$1").replace(/\\[nrt]/g, " "));
      }
      while ((m = tjArr.exec(block)) !== null) {
        for (const p of (m[1].match(/\((?:[^()\\]|\\[\s\S])*\)/g) || [])) {
          chunks.push(p.slice(1, -1).replace(/\\([0-7]{3})/g, (_: string, o: string) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, "$1"));
        }
      }
    }
    return chunks.join(" ").replace(/\s+/g, " ").trim();
  } catch { return ""; }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { applicationId, mode, candidate_context, job_role } = body;

    if (mode === 'suggest_question') {
      const prompt = `
        You are a senior technical interviewer. 
        Job Role: ${job_role}
        Candidate Context (Previous Analysis): ${JSON.stringify(candidate_context)}
        
        Task: Suggest ONE extremely strategic, tricky follow-up question to ask the candidate right now to reveal their true technical depth.
        Return ONLY the question string.
      `;
      const suggestion = await callAI(prompt, false);
      return NextResponse.json({ suggestion: suggestion.trim() });
    }

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    }

    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select(`*, job_clusters(cluster_id, job_title_variants, mandatory_skills, gemma_keywords)`)
      .eq("application_id", applicationId)
      .single();

    if (appErr || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    let resume = app.raw_resume_text || "";

    // For existing candidates with empty resume text, try to re-extract from stored file
    if (!resume && app.resume_file_path) {
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("resumes")
        .download(app.resume_file_path);
      if (!dlErr && fileData) {
        const buf = Buffer.from(await fileData.arrayBuffer());
        resume = extractPdfText(buf);
        if (resume) {
          await supabase.from("applications").update({ raw_resume_text: resume }).eq("application_id", applicationId);
        }
      }
    }

    if (!resume) {
      await supabase.from("applications")
        .update({ processing_status: "failed", processing_error: "No resume text — PDF may be image-only" })
        .eq("application_id", applicationId);
      return NextResponse.json({ error: "No resume text to analyse — PDF may be image-only or file missing" }, { status: 400 });
    }

    if (!app.job_clusters) {
      await supabase.from("applications")
        .update({ processing_status: "failed", processing_error: "Job cluster not found" })
        .eq("application_id", applicationId);
      return NextResponse.json({ error: "Job cluster not found for this application" }, { status: 400 });
    }

    const jd = `Role: ${app.job_clusters.job_title_variants?.[0] || app.applied_cluster_id}
Required Skills: ${JSON.stringify(app.job_clusters.mandatory_skills || [])}
Key Focus: ${(app.job_clusters.gemma_keywords || []).join(", ")}`;

    const prompt = `
You are a talent analyst. Perform a deep analysis for this candidate.

Job Description:
${jd}

Candidate Resume:
${resume}

Return ONLY a JSON object:
{
  "scoring": { 
    "match_score": <0-100>, 
    "decision": "<Accepted|Rejected|Hold>",
    "breakdown": { "skills": <0-100>, "experience": <0-100>, "projects": <0-100>, "education": <0-100> } 
  },
  "recommendations": { "pros": <string[]>, "matched_skills": <string[]> },
  "gap_analysis": { "cons": <string[]>, "missing_skills": <string[]> },
  "resume_profile": {
    "summary": "<2-3 sentence executive summary>",
    "overview": "<detailed professional profile>",
    "education": "<deep audit of academic background>",
    "projects": "<analysis of key projects and tech stack used>",
    "experience": "<tenure audit and role progression analysis>",
    "achievements": "<quantification of key results and impact>"
  },
  "interview_questions": [
    { "question": "<question>", "reason": "<rationale for asking this specifically>" }
  ]
}
`;

    // Mark as processing so the card shows 75% progress
    await supabase.from("applications").update({ processing_status: "processing" }).eq("application_id", applicationId);

    const raw = await callAI(prompt, true);
    const result = parseAIJSON<any>(raw);

    const { error: analysisErr } = await supabase.from("talent_analysis").upsert({
      application_id: applicationId,
      cluster_id: app.applied_cluster_id,
      resume_profile: result.resume_profile,
      scoring: result.scoring,
      gap_analysis: result.gap_analysis,
      recommendations: result.recommendations,
      interview_questions: result.interview_questions,
      gemma_raw_response: result,
    }, { onConflict: "application_id" });
    if (analysisErr) throw analysisErr;

    await supabase.from("applications").update({
      processing_status: "completed",
      gemma_analysis_completed_at: new Date().toISOString(),
    }).eq("application_id", applicationId);

    return NextResponse.json({ success: true, analysis: result });
  } catch (error: any) {
    console.error("Process application error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
