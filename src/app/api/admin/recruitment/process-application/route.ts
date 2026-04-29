import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json();

    if (!applicationId) {
      return NextResponse.json({ error: "Missing Application ID" }, { status: 400 });
    }

    // 1. Fetch application details
    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select(`
        *,
        job_clusters (
          cluster_id,
          job_title_variants,
          mandatory_skills,
          gemma_keywords
        )
      `)
      .eq("application_id", applicationId)
      .single();

    if (appErr || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // 2. Prepare JD and Resume text
    const jd = `
      Role: ${app.job_clusters.job_title_variants[0]}
      Skills Required: ${JSON.stringify(app.job_clusters.mandatory_skills)}
      Key Focus: ${app.job_clusters.gemma_keywords.join(", ")}
    `;
    const resume = app.raw_resume_text;

    // 3. Call AI Engine
    const endpoint = process.env.LOCAL_AI_ENDPOINT;
    const model = process.env.LOCAL_AI_MODEL || "gemma4:e4b";
    const bridgeKey = process.env.AI_BRIDGE_KEY;

    if (!endpoint || !bridgeKey) {
       // Silently fail or update status to failed if no AI
       await supabase.from("applications").update({ processing_status: "failed", processing_error: "AI Engine not configured" }).eq("application_id", applicationId);
       return NextResponse.json({ error: "AI Engine not configured" }, { status: 500 });
    }

    const prompt = `
      Perform a deep Talent Analysis for Namaah Tech.
      
      Job Description:
      ${jd}
      
      Candidate Resume:
      ${resume}
      
      Tasks:
      1. Calculate match score (0-100).
      2. Identify matching skills.
      3. Identify missing skills.
      4. Generate 3 specific interview questions based on the gaps.
      5. Provide a summary profile of the candidate.

      Return ONLY a JSON object:
      {
        "scoring": { "match_score": number, "technical_fit": number, "experience_score": number },
        "matching_skills": string[],
        "missing_skills": string[],
        "interview_questions": string[],
        "resume_profile": { "summary": string, "key_strengths": string[] }
      }
    `;

    const aiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bridgeKey}`,
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        format: "json",
      }),
    });

    if (!aiRes.ok) throw new Error("AI Engine request failed");

    const aiData = await aiRes.json();
    const result = JSON.parse(aiData.response);

    // 4. Save analysis results
    const { error: analysisErr } = await supabase
      .from("talent_analysis")
      .insert({
        application_id: applicationId,
        cluster_id: app.applied_cluster_id,
        resume_profile: result.resume_profile,
        scoring: result.scoring,
        gap_analysis: { missing: result.missing_skills },
        recommendations: { matching: result.matching_skills },
        interview_questions: result.interview_questions,
        gemma_raw_response: result
      });

    if (analysisErr) throw analysisErr;

    // 5. Update application status
    await supabase
      .from("applications")
      .update({ 
        processing_status: "completed",
        gemma_analysis_completed_at: new Date().toISOString()
      })
      .eq("application_id", applicationId);

    return NextResponse.json({ success: true, analysis: result });

  } catch (error: any) {
    console.error("Process Application Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
