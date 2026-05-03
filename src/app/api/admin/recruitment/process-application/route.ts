import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { callAI, parseAIJSON } from "@/lib/ai";

export async function POST(req: NextRequest) {
  let applicationId: string | undefined;
  try {
    ({ applicationId } = await req.json());

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

    const resume = app.raw_resume_text || "";
    if (!resume) {
      await supabase.from("applications")
        .update({ processing_status: "failed", processing_error: "No resume text found" })
        .eq("application_id", applicationId);
      return NextResponse.json({ error: "No resume text to analyse" }, { status: 400 });
    }

    const jd = `Role: ${app.job_clusters.job_title_variants[0]}
Required Skills: ${JSON.stringify(app.job_clusters.mandatory_skills)}
Key Focus: ${app.job_clusters.gemma_keywords.join(", ")}`;

    const prompt = `
You are a talent analyst. Perform a deep analysis for this candidate.

Job Description:
${jd}

Candidate Resume:
${resume}

Return ONLY a JSON object:
{
  "scoring": { "match_score": <0-100>, "technical_fit": <0-100>, "experience_score": <0-100> },
  "matching_skills": <string[]>,
  "missing_skills": <string[]>,
  "interview_questions": [
    { "question": "<question>", "difficulty": "<Easy|Medium|Hard>", "topic": "<topic>" }
  ],
  "resume_profile": {
    "summary": "<2-3 sentence candidate summary>",
    "key_strengths": <string[]>,
    "education_match": "<brief education assessment>"
  },
  "recommendations": { "pros": <string[]>, "cons": <string[]> },
  "gap_analysis": { "cons": <string[]> }
}
`;

    const raw = await callAI(prompt, true);
    const result = parseAIJSON<any>(raw);

    const { error: analysisErr } = await supabase.from("talent_analysis").insert({
      application_id: applicationId,
      cluster_id: app.applied_cluster_id,
      resume_profile: result.resume_profile,
      scoring: result.scoring,
      gap_analysis: result.gap_analysis,
      recommendations: result.recommendations,
      interview_questions: result.interview_questions,
      gemma_raw_response: result,
    });
    if (analysisErr) throw analysisErr;

    await supabase.from("applications").update({
      processing_status: "completed",
      gemma_analysis_completed_at: new Date().toISOString(),
    }).eq("application_id", applicationId);

    return NextResponse.json({ success: true, analysis: result });
  } catch (error: any) {
    console.error("Process application error:", error.message);
    if (applicationId) {
      await supabase.from("applications").update({
        processing_status: "failed",
        processing_error: error.message,
      }).eq("application_id", applicationId).catch(() => {});
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
