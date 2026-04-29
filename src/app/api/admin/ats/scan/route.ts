import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    const endpoint = process.env.LOCAL_AI_ENDPOINT;
    const model = process.env.LOCAL_AI_MODEL || "gemma4:e4b";
    const bridgeKey = process.env.AI_BRIDGE_KEY;

    if (!endpoint || !bridgeKey) {
      console.error("AI Configuration missing");
      return NextResponse.json({ error: "AI Engine not configured" }, { status: 500 });
    }

    const prompt = `
      Perform a Cognitive ATS Audit.
      
      Resume:
      ${resumeText}
      
      Job Description:
      ${jobDescription}
      
      Analyze the alignment between the resume and the job description.
      Return a JSON object with the following structure:
      {
        "score": number (0-100),
        "match": string[] (list of matching keywords/skills),
        "missing": string[] (list of missing critical keywords/skills),
        "tips": string[] (at least 3 actionable tips to improve the resume)
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

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.response);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("ATS Scan API Error:", error);
    return NextResponse.json({ 
      error: "AI Scan Failed", 
      details: error.message,
      score: 0,
      match: [],
      missing: ["Connection failed"],
      tips: ["Check if Mac Mini is online and Ollama is running"]
    }, { status: 500 });
  }
}
