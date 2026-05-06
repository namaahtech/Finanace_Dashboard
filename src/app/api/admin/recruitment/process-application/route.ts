import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { callAI, parseAIJSON } from "@/lib/ai";

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
    // Since supabase is declared inside try, we need a local one if it fails early
    const supabase = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const appId = body.applicationId;
    
    if (appId) {
      await supabase.from("applications").update({
        processing_status: "failed",
        processing_error: error.message,
      }).eq("application_id", appId);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
