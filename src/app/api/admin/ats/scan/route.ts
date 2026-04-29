import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: "Missing highly critical parameters (Resume, JD)" }, { status: 400 });
    }

    const endpoint = process.env.LOCAL_AI_ENDPOINT;
    const model = process.env.LOCAL_AI_MODEL;
    const bridgeKey = process.env.AI_BRIDGE_KEY;

    if (!endpoint) {
      return NextResponse.json({ error: "AI Engine Offline (No Endpoint)" }, { status: 500 });
    }

    const prompt = `
      System: You are an elite Recruitment Intelligence Engine (Gemma 4).
      Task: Perform a deep cognitive audit and ATS scan of the following resume against the job description.
      
      Resume:
      ${resumeText}
      
      Job Description:
      ${jobDescription}
      
      Output Format (JSON strictly):
      {
        "score": (0-100 integer),
        "match": ["Keyword1", "Keyword2", ...],
        "missing": ["Gap1", "Gap2", ...],
        "tips": ["Advice1", "Advice2", ...],
        "decision": "Proceed" | "Hold" | "Reject"
      }
    `;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bridgeKey}`
      },
      body: JSON.stringify({
        model: model || "gemma4:e4b",
        prompt: prompt,
        stream: false,
        format: "json"
      })
    });

    if (!response.ok) {
      throw new Error(`AI Bridge Fault: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Ollama returns { response: "stringified json" }
    let result;
    try {
      result = JSON.parse(data.response);
    } catch (e) {
      // Fallback if AI didn't return valid JSON
      result = {
        score: 50,
        match: ["Parsing Failed"],
        missing: ["AI Response Error"],
        tips: ["Retry with cleaner text"],
        decision: "Hold"
      };
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[ATS SCAN ERROR]:", error);
    return NextResponse.json({ error: "Cognitive Audit Fault: " + error.message }, { status: 500 });
  }
}
