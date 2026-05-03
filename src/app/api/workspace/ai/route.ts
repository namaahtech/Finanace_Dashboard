import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { action, content, customPrompt, context } = await req.json();

    const AI_ENDPOINT = process.env.LOCAL_AI_ENDPOINT;
    const AI_MODEL = process.env.LOCAL_AI_MODEL || "tinyllama:latest";
    const AI_KEY = process.env.AI_BRIDGE_KEY;

    if (!AI_ENDPOINT) {
      return NextResponse.json({ error: "AI endpoint not configured in .env.local" }, { status: 500 });
    }

    let prompt = "";

    switch (action) {
      // ── Document actions ────────────────────────────────────────
      case "summarize":
        prompt = `Summarize the following text concisely, keeping all key points:\n\n${content}`;
        break;
      case "improve":
        prompt = `Improve the grammar, flow, and professional tone of this text:\n\n${content}`;
        break;
      case "rewrite":
        prompt = `Rewrite this text in a fresh, engaging way while keeping the same meaning:\n\n${content}`;
        break;
      case "brainstorm":
        prompt = `Based on the following content, brainstorm 5 creative next steps or ideas:\n\n${content}`;
        break;
      case "shorten":
        prompt = `Make this text significantly shorter and more concise:\n\n${content}`;
        break;
      case "expand":
        prompt = `Expand and elaborate on this text with more detail and examples:\n\n${content}`;
        break;
      case "formal":
        prompt = `Rewrite this in a formal, professional tone:\n\n${content}`;
        break;
      case "casual":
        prompt = `Rewrite this in a casual, friendly tone:\n\n${content}`;
        break;
      case "plagiarism":
        prompt = `Analyze this text for originality. Identify any parts that seem generic or derivative and suggest how to make them more original:\n\n${content}`;
        break;

      // ── Spreadsheet actions ─────────────────────────────────────
      case "formula_explain":
        prompt = `Explain what this spreadsheet formula does in simple English. Break down each part:\n\n${content}`;
        break;
      case "formula_suggest":
        prompt = `I have this spreadsheet data:\n${context || ""}\n\nSuggest the best formula for this task: ${content}\n\nProvide the exact formula and explain it briefly.`;
        break;
      case "analyze_data":
        prompt = `Analyze this spreadsheet data and provide:\n1. Key insights and patterns\n2. Anomalies or outliers\n3. Actionable recommendations\n\nData:\n${content}`;
        break;
      case "predict_values":
        prompt = `Based on this data series, predict the next 5 values and explain the pattern:\n\n${content}`;
        break;
      case "clean_data":
        prompt = `Review this data and suggest:\n1. What needs to be cleaned or standardized\n2. Missing values that should be filled\n3. Formatting improvements\n\nData:\n${content}`;
        break;
      case "natural_query":
        prompt = `I have a spreadsheet. Answer this question about the data:\n\nQuestion: ${customPrompt}\n\nData:\n${content}`;
        break;
      case "generate_data":
        prompt = `Generate realistic sample data for: ${content}\n\nFormat as a table with headers. Provide 10 rows of data. Make it realistic and varied.`;
        break;
      case "chart_suggest":
        prompt = `Based on this data, suggest the best chart type and explain why:\n\n${content}`;
        break;

      // ── Custom ──────────────────────────────────────────────────
      case "custom":
        prompt = customPrompt ? `${customPrompt}\n\nContext:\n${content}` : content;
        break;

      default:
        prompt = customPrompt || content;
    }

    const response = await axios.post(
      AI_ENDPOINT,
      {
        model: AI_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 1024 },
      },
      {
        headers: {
          Authorization: `Bearer ${AI_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const raw = response.data?.response || response.data?.result || response.data;
    const result = typeof raw === "string" ? raw : (raw?.response ?? JSON.stringify(raw));

    return NextResponse.json({ result });
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message || "AI engine unavailable";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
