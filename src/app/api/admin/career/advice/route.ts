import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { currentRole, targetRole, skills } = await req.json();

    const endpoint = process.env.LOCAL_AI_ENDPOINT;
    const model = process.env.LOCAL_AI_MODEL;
    const bridgeKey = process.env.AI_BRIDGE_KEY;

    if (!endpoint) {
      return NextResponse.json({ error: "AI Advisory Engine Offline" }, { status: 500 });
    }

    const prompt = `
      System: You are an elite AI Career Strategist (Gemma 4).
      Task: Generate a 3-step professional growth roadmap.
      
      User Context:
      - Current Role: ${currentRole}
      - Target Role: ${targetRole}
      - Current Skills: ${skills}
      
      Output Format (JSON strictly):
      {
        "roadmap": [
          { "step": "Short Term", "action": "Specific action", "skills": "Skills to learn" },
          { "step": "Mid Term", "action": "Specific action", "skills": "Skills to learn" },
          { "step": "Long Term", "action": "Specific action", "skills": "Final milestone" }
        ],
        "mentorTip": "A professional tip for success"
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
    const result = JSON.parse(data.response);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[CAREER ADVICE ERROR]:", error);
    return NextResponse.json({ error: "Advisory Fault: " + error.message }, { status: 500 });
  }
}
