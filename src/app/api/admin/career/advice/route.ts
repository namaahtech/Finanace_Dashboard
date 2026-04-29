import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { currentRole, targetRole, skills } = await req.json();

    const endpoint = process.env.LOCAL_AI_ENDPOINT;
    const model = process.env.LOCAL_AI_MODEL || "gemma4:e4b";
    const bridgeKey = process.env.AI_BRIDGE_KEY;

    if (!endpoint || !bridgeKey) {
      return NextResponse.json({ error: "AI Engine not configured" }, { status: 500 });
    }

    const prompt = `
      You are a Neural Career Advisor. 
      Analyze the path from ${currentRole} to ${targetRole}.
      Current Skills: ${skills}
      
      Generate a strategic roadmap in JSON format:
      {
        "roadmap": [
          { "step": "Phase 1: title", "action": "detailed action", "skills": "required skill" },
          { "step": "Phase 2: title", "action": "detailed action", "skills": "required skill" },
          { "step": "Phase 3: title", "action": "detailed action", "skills": "required skill" }
        ],
        "mentorTip": "a high-level strategic tip"
      }
    `;

    const response = await fetch(endpoint, {
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

    const data = await response.json();
    const result = JSON.parse(data.response);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Career Advice API Error:", error);
    return NextResponse.json({ 
      roadmap: [
        { step: "Calibration Needed", action: "Unable to reach Gemma 4 engine.", skills: "System Link" }
      ],
      mentorTip: "Verify your Mac Mini connection."
    });
  }
}
